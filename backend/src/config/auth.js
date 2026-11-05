import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import { getDatabase, inTransaction } from './database.js';
import { HttpError } from '../validation.js';
import { createMailer } from './mailer.js';
import { consumeSendBudget } from '../security.js';

// In-memory pending signups were replaced by the pending_signups table: process
// memory is lost on restart and is not shared between instances.

const CODE_TTL_MS = 15 * 60 * 1000;
// A 6-digit code with unlimited guesses is brute-forceable, so a code is burned
// after this many failures and the user has to request a new one.
const MAX_CODE_ATTEMPTS = 5;

// Compared against when no account matches, so that a failed sign-in costs the
// same time whether or not the address exists (user-enumeration side channel).
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('enumeration-defence-placeholder', 10);

/** Cryptographically strong 6-digit code (Math.random is not a CSPRNG). */
const newCode = () => String(crypto.randomInt(100000, 1000000));

/** Constant-time comparison for user-supplied codes. */
function codeMatches(expected, supplied) {
  if (typeof expected !== 'string' || typeof supplied !== 'string') return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function authProvider(_env = process.env, customDb, customMailer) {
  const getDb = () => (typeof customDb === 'function' ? customDb() : (customDb || getDatabase()));
  const mailer = customMailer || createMailer(_env);

  // Recovery codes are stored as an HMAC, never in plaintext. RATE_LIMIT_SECRET
  // is already required by the rate limiter on every route that reaches here.
  const codeKey = _env.RECOVERY_CODE_SECRET || _env.RATE_LIMIT_SECRET;
  const hashCode = (code) => {
    if (!codeKey || codeKey.length < 32) throw new HttpError(503, 'The service is not configured yet.');
    return crypto.createHmac('sha256', codeKey).update(code).digest('hex');
  };

  /**
   * Record a wrong code. Once the limit is reached the code is destroyed, so an
   * attacker has to start a new recovery round — and trigger a new email — for
   * every handful of guesses.
   */
  const registerFailedCode = async (db, user) => {
    const attempts = Number(user.recovery_attempts || 0) + 1;
    if (attempts >= MAX_CODE_ATTEMPTS) {
      await db.query(
        'UPDATE user_accounts SET recovery_code = NULL, recovery_expires_at = NULL, recovery_attempts = 0 WHERE id = ?',
        [user.id]
      );
      return 'Too many incorrect codes. Please request a new one.';
    }
    await db.query('UPDATE user_accounts SET recovery_attempts = ? WHERE id = ?', [attempts, user.id]);
    return 'Invalid or expired code.';
  };

  const normalizePhone = (raw) => {
    if (!raw) return '';
    const digits = raw.replace(/\D/g, '');
    if (digits.startsWith('92') && digits.length === 12) return '0' + digits.slice(2);
    if (digits.startsWith('0') && digits.length === 11) return digits;
    return digits;
  };

  const dailyMailBudget = Number(_env.EMAIL_DAILY_LIMIT) || 200;

  /**
   * Send only while the shared daily budget allows it. If the accounting itself
   * fails we still send (fail open) — the per-address and per-IP limits on the
   * routes remain in force, and a database hiccup must not block signups.
   */
  const send = async (to, kind, code) => {
    try {
      const allowed = await consumeSendBudget(getDb(), _env, 'email-send', dailyMailBudget, 86400);
      if (!allowed) {
        console.error(`Daily verification-email budget (${dailyMailBudget}) reached; not sending to ${to}.`);
        return false;
      }
    } catch (error) {
      console.error('Mail budget check failed, sending anyway:', error?.message || error);
    }
    if (kind === 'account-exists') await mailer.sendAccountExists(to);
    else await mailer.sendOtp(to, code);
    return true;
  };

  return {
    async signup(input) {
      const { email, password, fullName, university, phone } = input;
      const normalizedPhone = normalizePhone(phone);

      const db = getDb();

      // Always pay the password-hashing cost before looking the address up, so
      // response time cannot be used to discover which accounts exist.
      const passwordHash = await bcrypt.hash(password, 10);

      const notifyExisting = () => {
        void send(email, 'account-exists').catch(err => console.error('Signup notice error:', err.message));
      };

      // Check existing verified account — no signal is returned to the caller
      const existing = await db.query('SELECT id FROM user_accounts WHERE email = ?', [email]);
      if (existing.rows.length > 0) {
        notifyExisting();
        return { created: false };
      }

      // Check duplicate phone
      if (normalizedPhone) {
        const phoneExists = await db.query(
          "SELECT id FROM user_profiles WHERE phone = ? AND phone != ''",
          [normalizedPhone]
        );
        if (phoneExists.rows.length > 0) {
          notifyExisting();
          return { created: false };
        }
      }

      const code = newCode();
      const expiresAt = new Date(Date.now() + CODE_TTL_MS);
      // Upsert: signing up again for the same address replaces the previous
      // attempt (and its code) rather than stacking rows.
      await db.query(
        `INSERT INTO pending_signups
           (email, password_hash, full_name, university, phone, code_hash, attempts, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?)
         ON DUPLICATE KEY UPDATE
           password_hash = VALUES(password_hash),
           full_name     = VALUES(full_name),
           university    = VALUES(university),
           phone         = VALUES(phone),
           code_hash     = VALUES(code_hash),
           attempts      = 0,
           expires_at    = VALUES(expires_at)`,
        [email, passwordHash, fullName, university || '', normalizedPhone, hashCode(code), expiresAt]
      );

      // Send OTP in the background so the user does not wait on SMTP latency.
      void send(email, 'otp', code).catch(err => console.error('OTP email error:', err.message));
      return { created: true };
    },

    async verify(input) {
      const { email, token } = input;
      const db = getDb();

      const pending = await db.query(
        `SELECT password_hash, full_name, university, phone, code_hash, attempts
         FROM pending_signups WHERE email = ? AND expires_at > NOW()`,
        [email]
      );
      if (!pending.rows.length) {
        // Opportunistic cleanup for this address only.
        await db.query('DELETE FROM pending_signups WHERE email = ? AND expires_at <= NOW()', [email]);
        throw new HttpError(400, 'Invalid or expired verification code.');
      }

      const row = pending.rows[0];
      if (!codeMatches(row.code_hash, hashCode(token))) {
        const attempts = Number(row.attempts || 0) + 1;
        if (attempts >= MAX_CODE_ATTEMPTS) {
          await db.query('DELETE FROM pending_signups WHERE email = ?', [email]);
          throw new HttpError(400, 'Too many incorrect codes. Please sign up again for a new one.');
        }
        await db.query('UPDATE pending_signups SET attempts = ? WHERE email = ?', [attempts, email]);
        throw new HttpError(400, 'Invalid or expired verification code.');
      }

      const id = crypto.randomUUID();

      // Consume the code and create both rows in one unit of work: a half-written
      // signup produces an account that can never sign in.
      await inTransaction(db, async (tx) => {
        await tx.query('DELETE FROM pending_signups WHERE email = ?', [email]);
        await tx.query(
          `INSERT INTO user_accounts (id, email, password_hash) VALUES (?, ?, ?)`,
          [id, email, row.password_hash]
        );
        await tx.query(
          `INSERT INTO user_profiles (id, full_name, role, university, phone, terms_accepted_at)
           VALUES (?, ?, 'USER', ?, ?, ?)`,
          [id, row.full_name, row.university || '', row.phone, new Date()]
        );
      });

      return { id, email };
    },

    async resend(email) {
      const db = getDb();
      const code = newCode();
      const expiresAt = new Date(Date.now() + CODE_TTL_MS);
      // Only an unexpired pending signup can be resent; nothing else to do.
      const updated = await db.query(
        'UPDATE pending_signups SET code_hash = ?, attempts = 0, expires_at = ? WHERE email = ? AND expires_at > NOW()',
        [hashCode(code), expiresAt, email]
      );
      if (!updated.rowCount) return;
      void send(email, 'otp', code).catch(err => console.error('OTP resend error:', err.message));
    },

    async login(input) {
      const { email, password } = input;
      const db = getDb();
      const res = await db.query(
        'SELECT id, email, password_hash FROM user_accounts WHERE email = ?',
        [email]
      );
      if (res.rows.length === 0) {
        // Same work as the matching path, so timing cannot reveal the address.
        await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
        throw new HttpError(401, 'Incorrect email or password.');
      }
      const user = res.rows[0];
      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) throw new HttpError(401, 'Incorrect email or password.');
      return { id: user.id, email: user.email };
    },

    async recover(email) {
      const db = getDb();
      const res = await db.query('SELECT id FROM user_accounts WHERE email = ?', [email]);
      // Deliberately silent: never reveal whether an address has an account.
      if (res.rows.length === 0) return;
      const code = newCode();
      const expires = new Date(Date.now() + CODE_TTL_MS);
      await db.query(
        'UPDATE user_accounts SET recovery_code = ?, recovery_expires_at = ?, recovery_attempts = 0 WHERE email = ?',
        [hashCode(code), expires, email]
      );
      void send(email, 'otp', code).catch(err => console.error('Recovery email error:', err.message));
    },

    async verifyResetToken({ email, token }) {
      const db = getDb();
      const res = await db.query(
        'SELECT id, recovery_code, recovery_expires_at, recovery_attempts FROM user_accounts WHERE email = ?',
        [email]
      );
      if (res.rows.length === 0) throw new HttpError(400, 'Invalid or expired code.');
      const user = res.rows[0];
      if (!user.recovery_code || !codeMatches(user.recovery_code, hashCode(token)))
        throw new HttpError(400, await registerFailedCode(db, user));
      if (user.recovery_expires_at && new Date(user.recovery_expires_at) < new Date())
        throw new HttpError(400, 'The code has expired. Please request a new one.');
    },

    async reset(input) {
      const { email, token, password } = input;
      const db = getDb();
      const res = await db.query(
        'SELECT id, email, recovery_code, recovery_expires_at, recovery_attempts FROM user_accounts WHERE email = ?',
        [email]
      );
      if (res.rows.length === 0) throw new HttpError(400, 'The recovery code is invalid or expired.');
      const user = res.rows[0];
      if (!user.recovery_code || !codeMatches(user.recovery_code, hashCode(token)))
        throw new HttpError(400, await registerFailedCode(db, user));
      if (user.recovery_expires_at && new Date(user.recovery_expires_at) < new Date())
        throw new HttpError(400, 'The recovery code is invalid or expired.');
      const passwordHash = await bcrypt.hash(password, 10);
      await db.query(
        'UPDATE user_accounts SET password_hash = ?, recovery_code = NULL, recovery_expires_at = NULL, recovery_attempts = 0 WHERE id = ?',
        [passwordHash, user.id]
      );
      return { id: user.id, email: user.email };
    },
  };
}

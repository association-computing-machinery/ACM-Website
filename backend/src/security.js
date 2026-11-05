import { createHash, createHmac, randomBytes } from 'node:crypto';
import { HttpError } from './validation.js';

export const hash = value => createHash('sha256').update(value).digest('hex');
const secure = env => env.NODE_ENV === 'production' || Boolean(env.VERCEL);
const cookieName = env => secure(env) ? '__Host-acm_session' : 'acm_session';
const cookieOptions = env => ({ httpOnly: true, secure: secure(env), sameSite: 'lax', path: '/', maxAge: 30 * 86400000 });

export function sessionToken(request, env) {
  const value = (request.headers.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith(`${cookieName(env)}=`))?.split('=')[1];
  return value && /^[a-f0-9]{64}$/.test(value) ? value : null;
}

export function clearSession(response, env) {
  response.clearCookie(cookieName(env), { ...cookieOptions(env), maxAge: undefined });
}

export function originGuard(env) {
  return (request, _response, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return next();
    const origins = [env.APP_ORIGIN, env.VERCEL_URL && `https://${env.VERCEL_URL}`].filter(Boolean);

    if (env.APP_ORIGIN) {
      try {
        const url = new URL(env.APP_ORIGIN);
        if (['localhost', '127.0.0.1', '::1'].includes(url.hostname)) {
          const altHost = url.hostname === 'localhost' ? '127.0.0.1' : url.hostname === '127.0.0.1' ? 'localhost' : 'localhost';
          origins.push(`${url.protocol}//${altHost}${url.port ? ':' + url.port : ''}`);
        }
      } catch {
        // ignore invalid URL
      }
    }

    const reqOrigin = request.get('origin');
    if (reqOrigin) {
      try {
        const url = new URL(reqOrigin);
        const host = url.hostname.toLowerCase();
        const isLocalDevHost = ['localhost', '127.0.0.1', '::1'].includes(host) || host.startsWith('127.0.0.');
        if (!isLocalDevHost && !origins.includes(reqOrigin)) {
          throw new HttpError(403, 'Request origin is not allowed.');
        }
      } catch (error) {
        if (error instanceof HttpError) throw error;
      }
    }

    if (!origins.length && !reqOrigin) throw new HttpError(503, 'The service is not configured yet.');
    const isPhotoUpload = request.method === 'POST' &&
      ['/api/profile/photo', '/api/itu-fest/form-photo'].includes(request.originalUrl.split('?')[0]) &&
      request.is(['image/jpeg', 'image/png', 'image/webp']);
    if (!request.is('application/json') && !isPhotoUpload) {
      throw new HttpError(415, 'Use application/json.');
    }
    next();
  };
}

export async function createSession(db, user, request, response, env) {
  if (!user?.id) throw new HttpError(401, 'Verify your email before signing in.');
  const profileRes = await db.query(
    `SELECT id, full_name AS fullName, role FROM user_profiles WHERE id = ?`,
    [user.id]
  );
  if (profileRes.rows.length === 0) {
    throw new HttpError(401, 'User profile not found.');
  }

  const userRes = await db.query('SELECT password_hash FROM user_accounts WHERE id = ?', [user.id]);
  const passwordHash = userRes.rows[0]?.password_hash || '';

  const token = randomBytes(32).toString('hex');
  const tokenHash = hash(token);
  const expiresAt = new Date(Date.now() + 30 * 86400000);

  await db.query(
    `INSERT INTO user_auth_sessions (token_hash, user_id, credential_version, expires_at)
     VALUES (?, ?, ?, ?)`,
    [tokenHash, user.id, hash(passwordHash), expiresAt]
  );

  const previous = sessionToken(request, env);
  if (previous) {
    await db.query('DELETE FROM user_auth_sessions WHERE token_hash = ?', [hash(previous)]);
  }

  response.cookie(cookieName(env), token, cookieOptions(env));
  return { ...profileRes.rows[0], email: user.email };
}

export function requireSession(database, env) {
  return async (request, response, next) => {
    const token = sessionToken(request, env);
    if (!token) throw new HttpError(401, 'Please sign in.');
    const db = typeof database === 'function' ? database() : database;
    const { rows } = await db.query(
      `SELECT p.id, p.full_name AS fullName, p.role, u.email, u.password_hash, s.credential_version AS credential_version
       FROM user_auth_sessions s
       JOIN user_profiles p ON p.id = s.user_id
       JOIN user_accounts u ON u.id = p.id
       WHERE s.token_hash = ? AND s.expires_at > NOW()`,
      [hash(token)]
    );

    if (!rows.length || rows[0].credential_version !== hash(rows[0].password_hash || '')) {
      clearSession(response, env);
      throw new HttpError(401, 'Your session has expired. Please sign in.');
    }

    request.user = { id: rows[0].id, fullName: rows[0].fullName, role: rows[0].role, email: rows[0].email };
    next();
  };
}

export const requireRole = (...roles) => (request, _response, next) => {
  if (!roles.includes(request.user?.role)) throw new HttpError(403, 'You do not have permission to perform this action.');
  next();
};

/**
 * Expired-counter housekeeping, throttled per database handle: it used to run
 * two DELETEs on every rate-limited request, which is pure overhead under load.
 */
const lastCleanup = new WeakMap();
const CLEANUP_INTERVAL_MS = 60_000;

async function cleanupExpired(db) {
  const now = Date.now();
  if (now - (lastCleanup.get(db) ?? 0) < CLEANUP_INTERVAL_MS) return;
  lastCleanup.set(db, now);
  await db.query('DELETE FROM security_rate_limits WHERE expires_at < NOW()');
  await db.query('DELETE FROM user_auth_sessions WHERE expires_at < NOW()');
}

/** Increment a counter in security_rate_limits and return its new value. */
async function bumpCounter(db, env, category, identity, seconds) {
  const key = createHmac('sha256', env.RATE_LIMIT_SECRET).update(`${category}:${identity}`).digest('hex');
  const expiresAt = new Date(Date.now() + seconds * 1000);
  const existing = await db.query('SELECT count, expires_at FROM security_rate_limits WHERE `key` = ?', [key]);

  if (existing.rows.length === 0) {
    await db.query('INSERT INTO security_rate_limits (`key`, count, expires_at) VALUES (?, 1, ?)', [key, expiresAt]);
    return 1;
  }

  const row = existing.rows[0];
  if (new Date(row.expires_at) <= new Date()) {
    await db.query('UPDATE security_rate_limits SET count = 1, expires_at = ? WHERE `key` = ?', [expiresAt, key]);
    return 1;
  }

  await db.query('UPDATE security_rate_limits SET count = count + 1 WHERE `key` = ?', [key]);
  return row.count + 1;
}

export function rateLimit(database, env, category, limit, seconds = 900) {
  return async (request, response, next) => {
    if (!env.RATE_LIMIT_SECRET || env.RATE_LIMIT_SECRET.length < 32) throw new HttpError(503, 'The service is not configured yet.');
    const ip = env.VERCEL ? request.get('x-forwarded-for')?.split(',')[0].trim() : request.socket.remoteAddress;
    const identities = [`ip:${ip || 'unknown'}`];
    if (typeof request.body?.email === 'string') identities.push(`email:${request.body.email.trim().toLowerCase().slice(0, 254)}`);
    const db = typeof database === 'function' ? database() : database;

    await cleanupExpired(db);

    for (const identity of identities) {
      const currentCount = await bumpCounter(db, env, category, identity, seconds);
      const threshold = identity.startsWith('ip:') && identities.length > 1 ? limit * 10 : limit;
      if (currentCount > threshold) {
        response.set('Retry-After', String(seconds));
        throw new HttpError(429, 'Too many attempts. Please try again later.');
      }
    }
    next();
  };
}

/**
 * A shared budget for outbound mail, keyed on the category alone. The per-address
 * and per-IP windows above still let one attacker spray many different
 * recipients, which is how a sending domain ends up blacklisted.
 *
 * Returns false once the budget for the window is spent.
 */
export async function consumeSendBudget(database, env, category = 'email-send', limit = 200, seconds = 86400) {
  if (!env.RATE_LIMIT_SECRET || env.RATE_LIMIT_SECRET.length < 32) throw new HttpError(503, 'The service is not configured yet.');
  const db = typeof database === 'function' ? database() : database;
  return (await bumpCounter(db, env, category, 'global', seconds)) <= limit;
}

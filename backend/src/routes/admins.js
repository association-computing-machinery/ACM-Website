import { Router } from 'express';
import { requireSession, requireRole, rateLimit } from '../security.js';
import { text, uuid, HttpError } from '../validation.js';
import { inTransaction } from '../config/database.js';

const FILTERABLE_ROLES = ['USER', 'MEMBER', 'ADMIN', 'SUPER_ADMIN'];
const USER_PAGE_SIZE = 200;

export function adminRoutes({ database, env }) {
  const router = Router();
  router.use(requireSession(database, env), requireRole('ADMIN', 'SUPER_ADMIN'));

  router.get('/users', async (req, res) => {
    const search = text(req.query.search ?? '', 'Search', 160);
    const pattern = `%${search.replace(/[\\%_]/g, '\\$&')}%`;
    // `role=ADMIN,SUPER_ADMIN` etc. lets a caller ask for every admin rather
    // than only whatever fits in the newest page of accounts.
    const requestedRoles = (typeof req.query.role === 'string' ? req.query.role : '')
      .split(',').map(value => value.trim().toUpperCase()).filter(value => FILTERABLE_ROLES.includes(value));
    const db = typeof database === 'function' ? database() : database;

    // The column collation is utf8mb4_unicode_ci, so LIKE is already
    // case-insensitive; wrapping both sides in LOWER() only prevented the
    // indexes on full_name / email from being used.
    const filters = ['(p.full_name LIKE ? OR u.email LIKE ?)'];
    const filterParams = [pattern, pattern];
    if (requestedRoles.length) {
      filters.push(`p.role IN (${requestedRoles.map(() => '?').join(', ')})`);
      filterParams.push(...requestedRoles);
    }
    const where = filters.join(' AND ');

    const { rows } = await db.query(
            `SELECT p.id, p.full_name AS fullName, p.role, p.university, p.phone,
              u.email, u.created_at AS joinedAt,
              COALESCE(
          NULLIF(p.profile_photo, ''),
          (SELECT member_photo FROM core_team
           WHERE member_email = u.email AND member_photo != '' LIMIT 1),
          (SELECT member_photo FROM sub_team_members
           WHERE member_email = u.email AND member_photo != '' LIMIT 1),
                (SELECT member_photo FROM other_members
                 WHERE member_email = u.email AND member_photo != '' LIMIT 1),
          (SELECT photo_url FROM chapter_team_members
           WHERE user_id = p.id AND photo_url != '' LIMIT 1),
          ''
              ) AS photoUrl
       FROM user_profiles p
       JOIN user_accounts u ON u.id = p.id
       WHERE ${where}
       ORDER BY u.created_at DESC LIMIT ${USER_PAGE_SIZE}`,
      filterParams
    );

    // Totals for the whole filtered set, so the UI never presents a truncated
    // page as the population.
    const { rows: countRows } = await db.query(
      `SELECT COUNT(*) AS total,
              SUM(p.role = 'ADMIN' OR p.role = 'SUPER_ADMIN') AS admins,
              SUM(p.role = 'MEMBER') AS members
       FROM user_profiles p
       JOIN user_accounts u ON u.id = p.id
       WHERE ${where}`,
      filterParams
    );
    const counts = countRows[0] ?? {};
    res.json({
      users: rows,
      total: Number(counts.total ?? rows.length),
      admins: Number(counts.admins ?? 0),
      members: Number(counts.members ?? 0),
      limit: USER_PAGE_SIZE,
    });
  });

  router.patch('/users/:id', rateLimit(database, env, 'role-write', 30), async (req, res) => {
    const id = uuid(req.params.id);
    const db = typeof database === 'function' ? database() : database;
    const check = await db.query('SELECT role FROM user_profiles WHERE id = ?', [id]);
    if (!check.rows.length) throw new HttpError(404, 'User not found.');
    // Granting and revoking Admin access is already Super-Admin-only; editing a
    // Super Admin's own profile (including renaming the permanent account) must
    // not be available to a plain ADMIN.
    if (check.rows[0].role === 'SUPER_ADMIN' && id !== req.user.id) {
      throw new HttpError(403, 'Only a Super Admin can change a Super Admin profile.');
    }

    const { fullName, phone } = req.body;
    const updates = [];
    const vals = [];

    if (fullName !== undefined) { updates.push('full_name = ?'); vals.push(text(fullName, 'Full name', 160, 1)); }
    if (phone !== undefined)    { updates.push('phone = ?');     vals.push(text(phone ?? '', 'Phone', 40)); }
    if (!updates.length) throw new HttpError(400, 'No fields to update.');

    await db.query(`UPDATE user_profiles SET ${updates.join(', ')} WHERE id = ?`, [...vals, id]);
    res.json({ message: 'User updated.' });
  });

  router.delete('/users/:id', rateLimit(database, env, 'role-write', 20), async (req, res) => {
    const id = uuid(req.params.id);
    if (id === req.user.id) throw new HttpError(403, 'You cannot delete your own account.');
    const db = typeof database === 'function' ? database() : database;
    const check = await db.query('SELECT role FROM user_profiles WHERE id = ?', [id]);
    if (!check.rows.length) throw new HttpError(404, 'User not found.');
    if (['ADMIN', 'SUPER_ADMIN'].includes(check.rows[0].role)) {
      throw new HttpError(403, 'Cannot delete an admin account. Remove admin access first.');
    }
    await db.query('DELETE FROM user_accounts WHERE id = ?', [id]);
    res.json({ message: 'User deleted.' });
  });

  router.patch('/users/:id/role', rateLimit(database, env, 'role-write', 30), async (req, res) => {
    const id = uuid(req.params.id);
    const { role, expectedRole } = req.body;
    const allowed = ['USER', 'MEMBER', 'ADMIN'];
    if (!allowed.includes(role) || !allowed.includes(expectedRole)) {
      throw new HttpError(400, 'Invalid role. Only USER, MEMBER, and ADMIN can be changed here.');
    }
    if (id === req.user.id) {
      throw new HttpError(403, 'You cannot change your own access.');
    }

    const db = typeof database === 'function' ? database() : database;

    const actorCheck = await db.query('SELECT role FROM user_profiles WHERE id = ?', [req.user.id]);
    if (!actorCheck.rows.length || !['ADMIN', 'SUPER_ADMIN'].includes(actorCheck.rows[0].role)) {
      throw new HttpError(403, 'You do not have permission.');
    }

    // Only SUPER_ADMIN can grant/revoke ADMIN role
    if ((role === 'ADMIN' || expectedRole === 'ADMIN') && actorCheck.rows[0].role !== 'SUPER_ADMIN') {
      throw new HttpError(403, 'Only a Super Admin can grant or revoke Admin access.');
    }

    // When revoking admin, determine correct downgrade role:
    // MEMBER if the person is in core_team or chapter_team_members, else USER
    let finalRole = role;
    if (expectedRole === 'ADMIN' && role !== 'ADMIN') {
      // Check if the user's email matches a core team slot
      const emailRes = await db.query('SELECT email FROM user_accounts WHERE id = ?', [id]);
      const email = emailRes.rows[0]?.email;

      const inCoreTeam = email
        ? await db.query('SELECT position_key FROM core_team WHERE LOWER(member_email) = LOWER(?)', [email])
        : { rows: [] };

      const inTeamMembers = await db.query(
        'SELECT id FROM chapter_team_members WHERE user_id = ? AND archived_at IS NULL AND published_at IS NOT NULL',
        [id]
      );

      // Also check sub_team_members (media team, dev team, etc.)
      const inSubTeam = email
        ? await db.query('SELECT id FROM sub_team_members WHERE LOWER(member_email) = LOWER(?)', [email])
        : { rows: [] };

      // Also check other_members
      const inOtherMembers = email
        ? await db.query('SELECT id FROM other_members WHERE LOWER(member_email) = LOWER(?)', [email])
        : { rows: [] };

      if (inCoreTeam.rows.length > 0 || inTeamMembers.rows.length > 0 || inSubTeam.rows.length > 0 || inOtherMembers.rows.length > 0) {
        finalRole = 'MEMBER';
      } else {
        finalRole = 'USER';
      }
    }

    // Compare the stored role under a row lock rather than trusting
    // affectedRows: MySQL reports 0 affected rows when the value is merely
    // unchanged, which turned an idempotent request into a bogus 409 and
    // silently skipped the audit row.
    const changed = await inTransaction(db, async (tx) => {
      const current = await tx.query('SELECT role FROM user_profiles WHERE id = ? FOR UPDATE', [id]);
      if (!current.rows.length) throw new HttpError(404, 'User not found.');
      if (current.rows[0].role !== expectedRole) {
        throw new HttpError(409, 'Role changed or this account cannot be updated. Refresh the list.');
      }
      if (current.rows[0].role === finalRole) return false;

      await tx.query('UPDATE user_profiles SET role = ? WHERE id = ?', [finalRole, id]);
      await tx.query(
        'INSERT INTO audit_role_changes (actor_id, subject_id, old_role, new_role) VALUES (?, ?, ?, ?)',
        [req.user.id, id, expectedRole, finalRole]
      );
      return true;
    });

    res.json({ user: { id, role: finalRole }, changed });
  });

  return router;
}

import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { requireSession, requireRole, rateLimit } from '../security.js';
import { text, uuid, safeUrl, HttpError } from '../validation.js';

export function projectRoutes({ database, env }) {
  const router = Router();
  const getDb = () => (typeof database === 'function' ? database() : database);
  const auth = requireSession(database, env);
  const admin = requireRole('ADMIN', 'SUPER_ADMIN');
  const limit = (n) => rateLimit(database, env, 'project-write', n);

  // The projects / project_contributors tables are created once by the schema
  // bootstrap in config/database.js — no DDL on the request path, and in
  // particular none on the public GET below.

  // GET search users (exclude SUPER_ADMIN) — must be before /:id routes
  router.get('/search/users', auth, admin, async (req, res) => {
    const db = getDb();
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (!q) return res.json({ users: [] });
    const pattern = `%${q.replace(/[\\%_]/g, '\\$&')}%`;
    const { rows } = await db.query(
      `SELECT p.id, p.full_name, p.role, u.email,
              COALESCE(
                NULLIF(p.profile_photo, ''),
                (SELECT member_photo FROM core_team WHERE member_email = u.email AND member_photo != '' LIMIT 1),
                (SELECT member_photo FROM sub_team_members WHERE member_email = u.email AND member_photo != '' LIMIT 1),
                (SELECT member_photo FROM other_members WHERE member_email = u.email AND member_photo != '' LIMIT 1),
                (SELECT photo_url FROM chapter_team_members WHERE user_id = p.id AND photo_url != '' LIMIT 1),
                ''
              ) AS photoUrl
       FROM user_profiles p
       JOIN user_accounts u ON u.id = p.id
       WHERE p.role != 'SUPER_ADMIN'
         AND (LOWER(p.full_name) LIKE LOWER(?) OR LOWER(u.email) LIKE LOWER(?))
       ORDER BY p.full_name ASC
       LIMIT 20`,
      [pattern, pattern]
    );
    return res.json({ users: rows });
  });

  // GET all projects (public)
  router.get('/', async (_req, res) => {
    const db = getDb();
    const { rows } = await db.query(
      'SELECT id, name, github_url, image_url, display_order FROM projects ORDER BY display_order ASC, created_at ASC'
    );
    res.json({ projects: rows });
  });

  // GET projects assigned to the signed-in user
  router.get('/mine', auth, async (req, res) => {
    const { rows } = await getDb().query(
      `SELECT p.id, p.name, p.github_url, p.image_url, p.display_order
       FROM project_contributors pc
       JOIN projects p ON p.id = pc.project_id
       WHERE pc.user_id = ?
       ORDER BY p.display_order ASC, p.created_at ASC`,
      [req.user.id]
    );
    res.json({ projects: rows });
  });

  // POST create project
  router.post('/', auth, admin, limit(100), async (req, res) => {
    const db = getDb();
    const name = text(req.body.name, 'Project name', 255, 1);
    const githubUrl = safeUrl(req.body.githubUrl, 'GitHub URL', 2048, { required: true });
    const imageUrl = safeUrl(req.body.imageUrl, 'Image URL', 2048, { allowRelative: true });
    const id = randomUUID();
    const { rows: last } = await db.query('SELECT MAX(display_order) AS mx FROM projects');
    const order = (last[0]?.mx ?? 0) + 1;
    await db.query(
      'INSERT INTO projects (id, name, github_url, image_url, display_order) VALUES (?, ?, ?, ?, ?)',
      [id, name, githubUrl, imageUrl, order]
    );
    res.status(201).json({ id, name, github_url: githubUrl, image_url: imageUrl, display_order: order });
  });

  // PATCH update project
  router.patch('/:id', auth, admin, limit(100), async (req, res) => {
    const db = getDb();
    const id = uuid(req.params.id);
    const { name, githubUrl, imageUrl } = req.body;
    const sets = [];
    const vals = [];
    if (name      !== undefined) { sets.push('name = ?');       vals.push(text(name, 'Project name', 255, 1)); }
    if (githubUrl !== undefined) { sets.push('github_url = ?'); vals.push(safeUrl(githubUrl, 'GitHub URL', 2048, { required: true })); }
    if (imageUrl  !== undefined) { sets.push('image_url = ?');  vals.push(safeUrl(imageUrl, 'Image URL', 2048, { allowRelative: true })); }
    if (!sets.length) throw new HttpError(400, 'Nothing to update.');
    await db.query(`UPDATE projects SET ${sets.join(', ')} WHERE id = ?`, [...vals, id]);
    const { rows } = await db.query('SELECT id, name, github_url, image_url, display_order FROM projects WHERE id = ?', [id]);
    if (!rows.length) throw new HttpError(404, 'Project not found.');
    res.json(rows[0]);
  });

  // DELETE project
  router.delete('/:id', auth, admin, limit(100), async (req, res) => {
    const db = getDb();
    const id = uuid(req.params.id);
    await db.query('DELETE FROM projects WHERE id = ?', [id]);
    res.json({ message: 'Project deleted.' });
  });

  // ── Contributors ──────────────────────────────────────────────────────────

  // GET contributors for a project
  router.get('/:id/contributors', auth, admin, async (req, res) => {
    const db = getDb();
    const id = uuid(req.params.id);
    const { rows } = await db.query(
      `SELECT pc.id, pc.user_id, p.full_name, p.role, u.email,
              COALESCE(
                NULLIF(p.profile_photo, ''),
                (SELECT member_photo FROM core_team WHERE member_email = u.email AND member_photo != '' LIMIT 1),
                (SELECT member_photo FROM sub_team_members WHERE member_email = u.email AND member_photo != '' LIMIT 1),
                (SELECT member_photo FROM other_members WHERE member_email = u.email AND member_photo != '' LIMIT 1),
                (SELECT photo_url FROM chapter_team_members WHERE user_id = p.id AND photo_url != '' LIMIT 1),
                ''
              ) AS photoUrl
       FROM project_contributors pc
       JOIN user_profiles p ON p.id = pc.user_id
       JOIN user_accounts u ON u.id = pc.user_id
       WHERE pc.project_id = ?
       ORDER BY pc.added_at ASC`,
      [id]
    );
    res.json({ contributors: rows });
  });

  // POST add contributor
  router.post('/:id/contributors', auth, admin, limit(200), async (req, res) => {
    const db = getDb();
    const projectId = uuid(req.params.id);
    const userId = uuid(req.body.userId);
    const projectCheck = await db.query('SELECT id FROM projects WHERE id = ?', [projectId]);
    if (!projectCheck.rows.length) throw new HttpError(404, 'Project not found.');
    // Block SUPER_ADMIN
    const userCheck = await db.query('SELECT role FROM user_profiles WHERE id = ?', [userId]);
    if (!userCheck.rows.length) throw new HttpError(404, 'User not found.');
    if (userCheck.rows[0].role === 'SUPER_ADMIN') throw new HttpError(403, 'Cannot add Super Admin as contributor.');
    const id = randomUUID();
    try {
      await db.query(
        'INSERT INTO project_contributors (id, project_id, user_id) VALUES (?, ?, ?)',
        [id, projectId, userId]
      );
    } catch (error) {
      // Only a real duplicate is a 409 — anything else must surface as itself.
      if (error?.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'Already a contributor.');
      throw error;
    }
    const { rows } = await db.query(
      `SELECT pc.id, pc.user_id, p.full_name, p.role, u.email,
              COALESCE(
                NULLIF(p.profile_photo, ''),
                (SELECT member_photo FROM core_team WHERE member_email = u.email AND member_photo != '' LIMIT 1),
                (SELECT member_photo FROM sub_team_members WHERE member_email = u.email AND member_photo != '' LIMIT 1),
                (SELECT member_photo FROM other_members WHERE member_email = u.email AND member_photo != '' LIMIT 1),
                (SELECT photo_url FROM chapter_team_members WHERE user_id = p.id AND photo_url != '' LIMIT 1),
                ''
              ) AS photoUrl
       FROM project_contributors pc
       JOIN user_profiles p ON p.id = pc.user_id
       JOIN user_accounts u ON u.id = pc.user_id
       WHERE pc.id = ?`,
      [id]
    );
    res.status(201).json(rows[0]);
  });

  // DELETE contributor
  router.delete('/:id/contributors/:userId', auth, admin, limit(200), async (req, res) => {
    const db = getDb();
    const projectId = uuid(req.params.id);
    const userId = uuid(req.params.userId);
    await db.query('DELETE FROM project_contributors WHERE project_id = ? AND user_id = ?', [projectId, userId]);
    res.json({ message: 'Contributor removed.' });
  });

  return router;
}

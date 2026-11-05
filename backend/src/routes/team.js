import { Router } from 'express';
import crypto from 'node:crypto';
import { teamInput, uuid, integer, boolean, HttpError } from '../validation.js';
import { requireSession, requireRole, rateLimit } from '../security.js';

const publicFields = `id, name, role, group_name AS \`group\`, hierarchy_order AS hierarchyOrder,
  display_order AS displayOrder, is_lead AS isLead, photo_url AS photoUrl, bio, department, tenure,
  CASE WHEN archived_at IS NOT NULL THEN 1 ELSE 0 END AS archived`;
const adminFields = `${publicFields}, CASE WHEN published_at IS NOT NULL THEN 1 ELSE 0 END AS published, version`;
const ordering = 'ORDER BY hierarchy_order, display_order, name, id';

export function publicTeamRoutes(database) {
  const router = Router();
  router.get('/', async (req, res) => {
    const leads = req.query.leads === 'true';
    const db = typeof database === 'function' ? database() : database;
    const { rows } = await db.query(`SELECT ${publicFields} FROM chapter_team_members
      WHERE published_at IS NOT NULL AND archived_at IS NULL ${leads ? 'AND is_lead = 1' : ''}
      ${ordering} ${leads ? 'LIMIT 5' : ''}`);
    res.json({ members: rows.map(r => ({ ...r, isLead: Boolean(r.isLead), archived: Boolean(r.archived) })) });
  });
  router.get('/:id', async (req, res) => {
    const db = typeof database === 'function' ? database() : database;
    const { rows } = await db.query(`SELECT ${publicFields} FROM chapter_team_members WHERE id = ? AND published_at IS NOT NULL`, [uuid(req.params.id)]);
    if (!rows.length) throw new HttpError(404, 'This profile is not available.');
    res.json({ member: { ...rows[0], isLead: Boolean(rows[0].isLead), archived: Boolean(rows[0].archived) } });
  });
  return router;
}

export function adminTeamRoutes({ database, env }) {
  const router = Router();
  router.use(requireSession(database, env), requireRole('ADMIN', 'SUPER_ADMIN'));
  router.get('/', async (_req, res) => {
    const db = typeof database === 'function' ? database() : database;
    const { rows } = await db.query(`SELECT ${adminFields} FROM chapter_team_members ${ordering}`);
    res.json({ members: rows.map(r => ({ ...r, isLead: Boolean(r.isLead), archived: Boolean(r.archived), published: Boolean(r.published) })) });
  });
  router.use(rateLimit(database, env, 'team-write', 100));
  router.post('/', async (req, res) => {
    const db = typeof database === 'function' ? database() : database;
    const m = teamInput(req.body);
    const id = crypto.randomUUID();
    const publishedAt = m.published ? new Date() : null;

    await db.query(`INSERT INTO chapter_team_members
      (id, name, role, group_name, hierarchy_order, display_order, is_lead, photo_url, bio, department, tenure, published_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, m.name, m.role, m.group, m.hierarchyOrder, m.displayOrder, m.isLead ? 1 : 0, m.photoUrl || null, m.bio, m.department, m.tenure, publishedAt]);

    const { rows } = await db.query(`SELECT ${adminFields} FROM chapter_team_members WHERE id = ?`, [id]);
    res.status(201).json({ member: { ...rows[0], isLead: Boolean(rows[0].isLead), archived: Boolean(rows[0].archived), published: Boolean(rows[0].published) } });
  });
  router.put('/:id', async (req, res) => {
    const db = typeof database === 'function' ? database() : database;
    const id = uuid(req.params.id);
    const version = integer(req.body.version, 'Version', 2147483646, 1);
    const m = teamInput(req.body);

    const check = await db.query('SELECT published_at FROM chapter_team_members WHERE id = ? AND version = ?', [id, version]);
    if (!check.rows.length) throw new HttpError(409, 'This member changed since you opened the form. Reload the list before editing again.');

    const currentPublished = check.rows[0].published_at;
    const publishedAt = m.published ? (currentPublished || new Date()) : null;

    // The SELECT above and this UPDATE are separate statements, so another
    // writer can bump the version in between. `version = version + 1` always
    // changes the row, so a zero row count means the WHERE no longer matched —
    // without this check the save silently did nothing and still answered 200
    // with the other writer's data.
    const updated = await db.query(`UPDATE chapter_team_members SET name=?, role=?, group_name=?,
      hierarchy_order=?, display_order=?, is_lead=?, photo_url=?, bio=?, department=?, tenure=?,
      published_at=?, version=version+1
      WHERE id=? AND version=?`,
    [m.name, m.role, m.group, m.hierarchyOrder, m.displayOrder, m.isLead ? 1 : 0, m.photoUrl || null, m.bio, m.department, m.tenure, publishedAt, id, version]);
    if (updated.rowCount === 0) {
      throw new HttpError(409, 'This member changed since you opened the form. Reload the list before editing again.');
    }

    const { rows } = await db.query(`SELECT ${adminFields} FROM chapter_team_members WHERE id = ?`, [id]);
    res.json({ member: { ...rows[0], isLead: Boolean(rows[0].isLead), archived: Boolean(rows[0].archived), published: Boolean(rows[0].published) } });
  });
  router.patch('/:id/archive', async (req, res) => {
    const db = typeof database === 'function' ? database() : database;
    const id = uuid(req.params.id);
    const version = integer(req.body.version, 'Version', 2147483646, 1);
    const archived = boolean(req.body.archived, 'Archive status');

    const check = await db.query('SELECT version FROM chapter_team_members WHERE id = ? AND version = ?', [id, version]);
    if (!check.rows.length) throw new HttpError(409, 'This member changed. Reload the list before trying again.');

    const archivedAt = archived ? new Date() : null;
    const archivedResult = await db.query(`UPDATE chapter_team_members SET archived_at = ?, version = version + 1 WHERE id = ? AND version = ?`, [archivedAt, id, version]);
    if (archivedResult.rowCount === 0) {
      throw new HttpError(409, 'This member changed. Reload the list before trying again.');
    }

    const { rows } = await db.query(`SELECT ${adminFields} FROM chapter_team_members WHERE id = ?`, [id]);
    res.json({ member: { ...rows[0], isLead: Boolean(rows[0].isLead), archived: Boolean(rows[0].archived), published: Boolean(rows[0].published) } });
  });
  return router;
}

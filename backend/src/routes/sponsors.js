import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { requireSession, requireRole, rateLimit } from '../security.js';
import { text, uuid, safeUrl } from '../validation.js';

export function sponsorRoutes({ database, env }) {
  const router = Router();
  const getDb = () => (typeof database === 'function' ? database() : database);
  const auth = requireSession(database, env);
  const admin = requireRole('ADMIN', 'SUPER_ADMIN');
  const limit = rateLimit(database, env, 'sponsor-write', 60);

  router.get('/', async (_req, res) => {
    const { rows } = await getDb().query(
      'SELECT id, name, image_url AS imageUrl, display_order AS displayOrder FROM sponsors ORDER BY display_order ASC, created_at ASC, id ASC'
    );
    res.json({ sponsors: rows });
  });

  router.post('/', auth, admin, limit, async (req, res) => {
    const name = text(req.body.name, 'Sponsor name', 255, 1);
    const imageUrl = safeUrl(req.body.imageUrl, 'Sponsor image URL', 2048, { required: true });
    const id = randomUUID();
    const { rows: latest } = await getDb().query('SELECT MAX(display_order) AS maxOrder FROM sponsors');
    const displayOrder = (latest[0]?.maxOrder ?? 0) + 1;
    await getDb().query(
      'INSERT INTO sponsors (id, name, image_url, display_order) VALUES (?, ?, ?, ?)',
      [id, name, imageUrl, displayOrder]
    );
    res.status(201).json({ id, name, imageUrl, displayOrder });
  });

  router.delete('/:id', auth, admin, limit, async (req, res) => {
    const id = uuid(req.params.id);
    const { rowCount } = await getDb().query('DELETE FROM sponsors WHERE id = ?', [id]);
    if (!rowCount) return res.status(404).json({ error: 'Sponsor not found.' });
    res.json({ message: 'Sponsor deleted.' });
  });

  return router;
}

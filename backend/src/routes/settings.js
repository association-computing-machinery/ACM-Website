import { Router } from 'express';
import { requireSession, requireRole } from '../security.js';
import { text, safeUrl, HttpError } from '../validation.js';

const NAME     = 'Association for Computing Machinery';
const LOCATION = '4 KM, Main Barki Road, Lahore, Punjab, Pakistan';
const LOGO     = 'https://ik.imagekit.io/acmitu/Others/ACM_logo_t6VesqNX4.png';

export function settingsRoutes({ database, env }) {
  const router = Router();
  const getDb = () => (typeof database === 'function' ? database() : database);

  // Public GET — read site settings
  router.get('/', async (_req, res) => {
    const db = getDb();
    const { rows } = await db.query(
      'SELECT society_name, location, logo_url FROM chapter_settings WHERE id = 1'
    );
    if (!rows.length) {
      return res.json({ societyName: NAME, location: LOCATION, logoUrl: LOGO });
    }
    const r = rows[0];
    return res.json({ societyName: r.society_name, location: r.location, logoUrl: r.logo_url });
  });

  // Protected PATCH — update site settings
  router.patch('/', requireSession(database, env), requireRole('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
    const db = getDb();
    const { societyName, location, logoUrl } = req.body;

    const sets = [];
    const vals = [];

    if (societyName !== undefined) { sets.push('society_name = ?'); vals.push(text(societyName, 'Society name', 255, 1)); }
    if (location !== undefined)    { sets.push('location = ?');     vals.push(text(location, 'Location', 255, 1)); }
    if (logoUrl !== undefined) {
      sets.push('logo_url = ?'); vals.push(safeUrl(logoUrl, 'Logo URL', 2048, { allowRelative: true }));
    }
    if (!sets.length) throw new HttpError(400, 'No fields to update.');

    await db.query(
      `INSERT INTO chapter_settings (id, society_name, location, logo_url)
       VALUES (1, ?, ?, ?)
       ON DUPLICATE KEY UPDATE ${sets.join(', ')}`,
      [NAME, LOCATION, LOGO, ...vals]
    );

    const { rows } = await db.query('SELECT society_name, location, logo_url FROM chapter_settings WHERE id = 1');
    const r = rows[0];
    return res.json({ societyName: r.society_name, location: r.location, logoUrl: r.logo_url });
  });

  return router;
}

import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { inTransaction } from '../config/database.js';
import { requireSession, rateLimit } from '../security.js';
import { HttpError } from '../validation.js';
import { uploadFile } from '../config/imagekit.js';

export function profileRoutes({ database, env }) {
  const router = Router();
  const getDb = () => (typeof database === 'function' ? database() : database);
  const auth = requireSession(database, env);

  router.get('/me', auth, async (req, res) => {
    const db = getDb();
    const [{ rows: profileRows }, { rows: coreTeam }, { rows: subTeams }, { rows: chapterTeam }, { rows: otherMembers }] = await Promise.all([
      db.query(
        `SELECT p.full_name AS fullName, p.role, u.email, p.phone,
                COALESCE(
                  NULLIF(p.profile_photo, ''),
                  (SELECT member_photo FROM core_team WHERE member_email = u.email AND member_photo != '' LIMIT 1),
                  (SELECT member_photo FROM sub_team_members WHERE member_email = u.email AND member_photo != '' LIMIT 1),
                  (SELECT member_photo FROM other_members WHERE member_email = u.email AND member_photo != '' LIMIT 1),
                  (SELECT photo_url FROM chapter_team_members WHERE user_id = p.id AND photo_url != '' LIMIT 1),
                  ''
                ) AS photoUrl,
                GREATEST(0, 2 - (
                  SELECT COUNT(*) FROM profile_photo_changes
                  WHERE user_id = p.id AND changed_at > DATE_SUB(NOW(), INTERVAL 14 DAY)
                )) AS photoChangesRemaining
         FROM user_profiles p
         JOIN user_accounts u ON u.id = p.id
         WHERE p.id = ?`,
        [req.user.id]
      ),
      db.query(
        `SELECT position_label AS position
         FROM core_team
         WHERE LOWER(TRIM(member_email)) = (
           SELECT LOWER(TRIM(email)) FROM user_accounts WHERE id = ?
         ) AND member_name != ''
         ORDER BY position_order`,
        [req.user.id]
      ),
      db.query(
        `SELECT st.name AS team, stm.position
         FROM sub_team_members stm
         JOIN sub_teams st ON st.id = stm.team_id
         JOIN user_accounts ua ON LOWER(TRIM(ua.email)) = LOWER(TRIM(stm.member_email))
         WHERE ua.id = ?
         ORDER BY st.display_order, st.name, stm.created_at DESC`,
        [req.user.id]
      ),
      db.query(
        `SELECT group_name AS team, role AS position
         FROM chapter_team_members
         WHERE user_id = ? AND archived_at IS NULL AND published_at IS NOT NULL
         ORDER BY hierarchy_order, display_order`,
        [req.user.id]
      ),
      db.query(
        `SELECT member_position AS position
         FROM other_members
         WHERE LOWER(TRIM(member_email)) = (
           SELECT LOWER(TRIM(email)) FROM user_accounts WHERE id = ?
         )
         ORDER BY added_at DESC
         LIMIT 1`,
        [req.user.id]
      ),
    ]);

    if (!profileRows.length) throw new HttpError(404, 'Profile not found.');
    const memberships = [
      ...coreTeam.map(row => ({ team: 'Core Team', position: row.position })),
      ...subTeams.map(row => ({
        team: row.team,
        position: formatTeamPosition(row.position),
      })),
      ...chapterTeam,
    ];
    if (otherMembers.length) {
      memberships.push({
        team: 'Other Members',
        position: '',
      });
    }

    res.json({
      profile: {
        ...profileRows[0],
        memberships: profileRows[0].role === 'USER' ? [] : memberships,
      },
    });
  });

  router.post(
    '/photo',
    auth,
    rateLimit(database, env, 'profile-photo-upload', 10),
    async (req, res) => {
      const contentType = req.get('content-type')?.split(';', 1)[0].trim().toLowerCase();
      const imageTypes = {
        'image/jpeg': { extension: 'jpg', matches: buffer => buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff },
        'image/png': { extension: 'png', matches: buffer => buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) },
        'image/webp': { extension: 'webp', matches: buffer => buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP' },
      };
      const imageType = imageTypes[contentType];
      if (!imageType || !Buffer.isBuffer(req.body) || req.body.length === 0 || !imageType.matches(req.body)) {
        throw new HttpError(400, 'Upload a valid JPEG, PNG, or WebP image.');
      }

      const db = getDb();
      const changeId = ['ADMIN', 'SUPER_ADMIN'].includes(req.user.role) ? null : randomUUID();
      if (changeId) {
        await inTransaction(db, async tx => {
          const { rows: profiles } = await tx.query(
            'SELECT id FROM user_profiles WHERE id = ? FOR UPDATE',
            [req.user.id]
          );
          if (!profiles.length) throw new HttpError(404, 'Profile not found.');

          await tx.query(
            `DELETE FROM profile_photo_changes
             WHERE user_id = ? AND changed_at <= DATE_SUB(NOW(), INTERVAL 14 DAY)`,
            [req.user.id]
          );
          const { rows } = await tx.query(
            'SELECT COUNT(*) AS changeCount FROM profile_photo_changes WHERE user_id = ?',
            [req.user.id]
          );
          if (Number(rows[0]?.changeCount || 0) >= 2) {
            throw new HttpError(429, 'You can change your profile photo only 2 times in 14 days. Please try again later.');
          }
          await tx.query(
            'INSERT INTO profile_photo_changes (id, user_id) VALUES (?, ?)',
            [changeId, req.user.id]
          );
        });
      }

      let photoSaved = false;
      try {
        const photoUrl = await uploadFile(
          req.body,
          `${req.user.id}.${imageType.extension}`,
          '/Members/ProfilePhotos',
          env
        );
        await db.query('UPDATE user_profiles SET profile_photo = ? WHERE id = ?', [photoUrl, req.user.id]);
        photoSaved = true;
        res.json({ photoUrl });
      } catch (error) {
        if (changeId && !photoSaved) {
          try {
            await db.query('DELETE FROM profile_photo_changes WHERE id = ? AND user_id = ?', [changeId, req.user.id]);
          } catch (cleanupError) {
            console.error('Could not release profile photo change reservation:', cleanupError?.message || cleanupError);
          }
        }
        throw error;
      }
    }
  );

  return router;
}

function formatTeamPosition(value) {
  switch (String(value ?? '').trim().toUpperCase().replace(/-/g, '_').replace(/\s+/g, '_')) {
    case 'TEAM_DIRECTOR':
    case 'DIRECTOR': return 'Team Director';
    case 'TEAM_LEAD':
    case 'LEAD': return 'Team Head';
    case 'TEAM_CO_LEAD':
    case 'CO_LEAD':
    case 'COLEAD': return 'Team Co-Head';
    default: return 'Member';
  }
}

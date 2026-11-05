import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { requireSession, requireRole } from '../security.js';
import { text, safeUrl, HttpError } from '../validation.js';
import { inTransaction } from '../config/database.js';

const POSITIONS = [
  { key: 'chair',         label: 'Chair',               order: 1 },
  { key: 'vice_chair',    label: 'Vice Chair',          order: 2 },
  { key: 'vice_chair_f',  label: 'Vice Chair (Female)', order: 3 },
  { key: 'event_head',    label: 'Event Head',          order: 4 },
  { key: 'gen_secretary', label: 'General Secretary',   order: 5 },
  { key: 'treasurer',     label: 'Treasurer',           order: 6 },
];

const MAX_BIO_WORDS = 70;

function wordCount(str) {
  return str.trim().split(/\s+/).filter(Boolean).length;
}

export function coreTeamRoutes({ database, env }) {
  const router = Router();
  const getDb = () => (typeof database === 'function' ? database() : database);

  // Check if an email already has an account (used by sub-teams dialog)
  router.get('/check-email', requireSession(database, env), requireRole('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
    const emailParam = req.query.email;
    if (!emailParam || typeof emailParam !== 'string') throw new HttpError(400, 'Email required.');
    const db = getDb();
    const { rows } = await db.query(
      `SELECT u.id, p.phone FROM user_accounts u JOIN user_profiles p ON p.id = u.id WHERE u.email = ?`,
      [emailParam.toLowerCase().trim()]
    );
    if (rows.length > 0) {
      res.json({ exists: true, phone: rows[0].phone || '' });
    } else {
      res.json({ exists: false, phone: '' });
    }
  });

  // Search existing users to assign to a core team position
  // Optional: ?exclude_core=1 to hide users already in core_team or who are SUPER_ADMIN
  router.get('/search-users', requireSession(database, env), requireRole('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
    const q = text(req.query.query ?? '', 'Search', 160);
    if (!q.trim()) return res.json({ users: [] });

    const excludeCore = req.query.exclude_core === '1';

    const db = getDb();
    const pattern = `%${q.replace(/[\\%_]/g, '\\$&')}%`;

    // Build exclusion set if needed
    let excludedEmails = new Set();
    if (excludeCore) {
      const coreRes = await db.query(
        `SELECT member_email FROM core_team WHERE member_email != ''`
      );
      coreRes.rows.forEach(r => excludedEmails.add(r.member_email.toLowerCase()));
    }

    // Scalar subqueries, not LEFT JOINs: a person on two sub-teams (or holding a
    // position recorded twice) used to come back as duplicate rows, which gave
    // the picker duplicate React keys and repeated list entries. The column
    // collation is case-insensitive, so LOWER() is unnecessary and only stops
    // the member_email indexes being used.
    const { rows } = await db.query(
      `SELECT p.id, p.full_name AS fullName, u.email, p.phone, p.role,
              p.profile_photo AS profilePhoto,
              (SELECT stm.member_photo FROM sub_team_members stm
                WHERE stm.member_email = u.email AND stm.member_photo != '' LIMIT 1) AS teamPhoto,
              (SELECT stm.member_bio FROM sub_team_members stm
                WHERE stm.member_email = u.email AND stm.member_bio != '' LIMIT 1) AS teamBio,
              (SELECT st.name FROM sub_team_members stm JOIN sub_teams st ON st.id = stm.team_id
                WHERE stm.member_email = u.email LIMIT 1) AS teamName,
              (SELECT ct.member_photo FROM core_team ct
                WHERE ct.member_email = u.email AND ct.member_name != '' LIMIT 1) AS corePhoto,
              (SELECT ct.member_bio FROM core_team ct
                WHERE ct.member_email = u.email AND ct.member_name != '' LIMIT 1) AS coreBio,
              (SELECT ct.position_label FROM core_team ct
                WHERE ct.member_email = u.email AND ct.member_name != '' LIMIT 1) AS corePosition
       FROM user_profiles p
       JOIN user_accounts u ON u.id = p.id
       WHERE p.full_name LIKE ? OR u.email LIKE ? OR p.phone LIKE ?
       ORDER BY p.full_name ASC
       LIMIT 30`,
      [pattern, pattern, pattern]
    );

    // Belt as well as braces: never hand the picker two entries for one account.
    const seenIds = new Set();
    const users = rows
      .filter(r => {
        if (r.role === 'SUPER_ADMIN') return false;
        if (excludeCore && excludedEmails.has((r.email || '').toLowerCase())) return false;
        if (seenIds.has(r.id)) return false;
        seenIds.add(r.id);
        return true;
      })
      .slice(0, 20)
      .map(r => ({
        id: r.id,
        fullName: r.fullName || '',
        email: r.email,
        phone: r.phone || '',
        teamPhoto: r.profilePhoto || r.corePhoto || r.teamPhoto || '',
        teamName: r.teamName || '',
        bio: r.coreBio || r.teamBio || '',
        corePosition: r.corePosition || '',
      }));

    res.json({ users });
  });

  // GET other members (displaced from core positions)
  router.get('/other-members', requireSession(database, env), requireRole('ADMIN', 'SUPER_ADMIN'), async (_req, res) => {
    const db = getDb();
    const { rows } = await db.query(
      `SELECT om.id, om.member_name, om.member_email, om.member_phone, om.member_position, om.member_bio,
              COALESCE(NULLIF(p.profile_photo, ''), om.member_photo) AS member_photo, om.added_at
       FROM other_members om
       LEFT JOIN user_accounts u ON LOWER(TRIM(u.email)) = LOWER(TRIM(om.member_email))
       LEFT JOIN user_profiles p ON p.id = u.id
       WHERE (
         om.member_email = ''
         OR NOT EXISTS (
           SELECT 1 FROM other_members newer
           WHERE LOWER(TRIM(newer.member_email)) = LOWER(TRIM(om.member_email))
             AND (
               newer.added_at > om.added_at
               OR (newer.added_at = om.added_at AND newer.id > om.id)
             )
         )
       )
       AND NOT EXISTS (
         SELECT 1 FROM sub_team_members stm
         WHERE om.member_email != ''
           AND LOWER(TRIM(stm.member_email)) = LOWER(TRIM(om.member_email))
       )
       AND NOT EXISTS (
         SELECT 1 FROM core_team ct
         WHERE om.member_email != ''
           AND ct.member_name != ''
           AND LOWER(TRIM(ct.member_email)) = LOWER(TRIM(om.member_email))
       )
       ORDER BY om.added_at DESC`
    );
    res.json({ members: rows });
  });

  // PATCH — edit a former core-team member's profile
  router.patch('/other-members/:id', requireSession(database, env), requireRole('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
    const db = getDb();
    const { id } = req.params;
    const { memberName, memberEmail, memberPhone, memberPhoto } = req.body;
    const email = text(memberEmail ?? '', 'Email', 255);
    const photo = safeUrl(memberPhoto, 'Photo URL', 2048, { allowRelative: true });
    await inTransaction(db, async (tx) => {
      const current = await tx.query('SELECT id FROM other_members WHERE id = ? FOR UPDATE', [id]);
      if (!current.rows.length) throw new HttpError(404, 'Other member not found.');
      await tx.query(
        `UPDATE other_members
         SET member_name = ?, member_email = ?, member_phone = ?, member_bio = '', member_photo = ?
         WHERE id = ?`,
        [
          text(memberName ?? '', 'Name', 160),
          email,
          text(memberPhone ?? '', 'Phone', 50),
          photo,
          id,
        ]
      );
      if (email) {
        await tx.query(
          `UPDATE user_profiles p
           JOIN user_accounts u ON u.id = p.id
           SET p.profile_photo = ?
           WHERE LOWER(TRIM(u.email)) = LOWER(TRIM(?))`,
          [photo, email]
        );
      }
    });

    const { rows } = await db.query(
      'SELECT id, member_name, member_email, member_phone, member_position, member_bio, member_photo, added_at FROM other_members WHERE id = ?',
      [id]
    );
    if (!rows.length) throw new HttpError(404, 'Other member not found.');
    res.json(rows[0]);
  });

  // DELETE other member — also downgrades their role to USER
  router.delete('/other-members/:id', requireSession(database, env), requireRole('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
    const db = getDb();
    const id = req.params.id;

    // Get the member's email so we can find and downgrade their account
    const omRes = await db.query(
      'SELECT member_email FROM other_members WHERE id = ?',
      [id]
    );
    if (omRes.rows.length > 0 && omRes.rows[0].member_email) {
      await db.query(
        `UPDATE user_profiles SET role = 'USER'
         WHERE id = (SELECT id FROM user_accounts WHERE email = ?)
         AND role = 'MEMBER'`,
        [omRes.rows[0].member_email.toLowerCase().trim()]
      );
    }

    await db.query('DELETE FROM other_members WHERE id = ?', [id]);
    res.json({ message: 'Removed.' });
  });

  // Public GET — all 6 core positions
  router.get('/', async (_req, res) => {
    const db = getDb();
    const { rows } = await db.query(
      `SELECT ct.position_key, ct.position_label, ct.position_order, ct.member_name,
              ct.member_email, ct.member_phone, ct.member_bio,
              COALESCE(NULLIF(p.profile_photo, ''), ct.member_photo) AS member_photo
       FROM core_team ct
       LEFT JOIN user_accounts u ON LOWER(TRIM(u.email)) = LOWER(TRIM(ct.member_email))
       LEFT JOIN user_profiles p ON p.id = u.id
       ORDER BY ct.position_order`
    );
    const map = Object.fromEntries(rows.map(r => [r.position_key, r]));
    res.json({
      members: POSITIONS.map(p => ({
        positionKey:   p.key,
        positionLabel: map[p.key]?.position_label || p.label,
        positionOrder: p.order,
        memberName:    map[p.key]?.member_name  || '',
        memberEmail:   map[p.key]?.member_email || '',
        memberPhone:   map[p.key]?.member_phone || '',
        memberBio:     map[p.key]?.member_bio   || '',
        memberPhoto:   map[p.key]?.member_photo || '',
      })),
    });
  });

  // PATCH — assign from other_members directly (no user account lookup needed)
  router.patch('/:key/from-other-member', requireSession(database, env), requireRole('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
    const { key } = req.params;
    const pos = POSITIONS.find(p => p.key === key);
    if (!pos) throw new HttpError(404, 'Position not found.');

    const db = getDb();
    const { othMemberId, memberBio, memberPhoto } = req.body;

    if (!othMemberId || typeof othMemberId !== 'string') {
      throw new HttpError(400, 'othMemberId is required.');
    }

    // Fetch the other member's data
    const omRes = await db.query(
      'SELECT member_name, member_email, member_phone, member_photo FROM other_members WHERE id = ?',
      [othMemberId]
    );
    if (!omRes.rows.length) throw new HttpError(404, 'Other member not found.');
    const om = omRes.rows[0];

    const rawBio = memberBio ?? '';
    if (wordCount(rawBio) > MAX_BIO_WORDS) {
      throw new HttpError(400, `About section cannot exceed ${MAX_BIO_WORDS} words.`);
    }
    const bioVal   = text(rawBio, 'About', 2000);
    const photoVal = safeUrl(memberPhoto ?? om.member_photo, 'Photo URL', 2048, { allowRelative: true });

    await inTransaction(db, async (tx) => {
      // The same person must not end up holding two positions. The
      // assign-existing-user path moves them off their old slot; this path has
      // no account to move, so refuse rather than create a duplicate.
      if (om.member_email) {
        const clash = await tx.query(
          `SELECT position_key FROM core_team
           WHERE member_email = ? AND position_key != ? AND member_name != ''`,
          [om.member_email, key]
        );
        if (clash.rows.length > 0) {
          const existing = POSITIONS.find(p => p.key === clash.rows[0].position_key);
          throw new HttpError(409, `That person already holds the ${existing?.label ?? clash.rows[0].position_key} position. Remove them from it first.`);
        }
      }

      // Save displaced current person to other_members before overwriting
      const displaced = await tx.query(
        `SELECT member_name, member_email, member_phone, member_bio, member_photo
         FROM core_team WHERE position_key = ? AND member_name != ''`,
        [key]
      );
      if (displaced.rows.length > 0) {
        const d = displaced.rows[0];
        await tx.query(
          `INSERT INTO other_members (id, member_name, member_email, member_phone, member_position, member_bio, member_photo)
           VALUES (?, ?, ?, ?, ?, '', ?)`,
          [randomUUID(), d.member_name, d.member_email, d.member_phone, pos.label, d.member_photo]
        );
      }

      // Write the other member into the core_team position
      await tx.query(
        `INSERT INTO core_team (position_key, position_label, position_order,
           member_name, member_email, member_phone, member_bio, member_photo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           member_name  = VALUES(member_name),
           member_email = VALUES(member_email),
           member_phone = VALUES(member_phone),
           member_bio   = VALUES(member_bio),
           member_photo = VALUES(member_photo)`,
        [key, pos.label, pos.order,
         text(om.member_name ?? '', 'Name', 160),
         text(om.member_email ?? '', 'Email', 255),
         text(om.member_phone ?? '', 'Phone', 50),
         bioVal, photoVal]
      );
      if (om.member_email) {
        await tx.query(
         `UPDATE user_profiles p
          JOIN user_accounts u ON u.id = p.id
          SET p.profile_photo = ?
          WHERE LOWER(TRIM(u.email)) = LOWER(TRIM(?))`,
         [photoVal, om.member_email]
        );
      }

      // Remove from other_members
      await tx.query('DELETE FROM other_members WHERE id = ?', [othMemberId]);
      if (om.member_email) {
        await tx.query(
          'DELETE FROM other_members WHERE LOWER(TRIM(member_email)) = ?',
          [om.member_email.trim().toLowerCase()]
        );
      }
    });

    const { rows } = await db.query('SELECT * FROM core_team WHERE position_key = ?', [key]);
    const r = rows[0];
    res.json({
      positionKey:   r.position_key,
      positionLabel: r.position_label,
      positionOrder: r.position_order,
      memberName:    r.member_name,
      memberEmail:   r.member_email,
      memberPhone:   r.member_phone,
      memberBio:     r.member_bio,
      memberPhoto:   r.member_photo,
    });
  });

  // PATCH — update only bio + photo for the existing person (no person change)
  router.patch('/:key/bio-photo', requireSession(database, env), requireRole('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
    const { key } = req.params;
    const pos = POSITIONS.find(p => p.key === key);
    if (!pos) throw new HttpError(404, 'Position not found.');

    const db = getDb();
    const { memberBio, memberPhoto } = req.body;

    const rawBio = memberBio ?? '';
    if (wordCount(rawBio) > MAX_BIO_WORDS) {
      throw new HttpError(400, `About section cannot exceed ${MAX_BIO_WORDS} words.`);
    }
    const bioVal   = text(rawBio, 'About', 2000);
    const photoVal = safeUrl(memberPhoto, 'Photo URL', 2048, { allowRelative: true });

    await inTransaction(db, async (tx) => {
      const existing = await tx.query(
        `SELECT position_key, member_email FROM core_team WHERE position_key = ? AND member_name != '' FOR UPDATE`,
        [key]
      );
      if (!existing.rows.length) {
        throw new HttpError(400, 'No person assigned yet. Use "Change Person" first.');
      }
      await tx.query(
        'UPDATE core_team SET member_bio = ?, member_photo = ? WHERE position_key = ?',
        [bioVal, photoVal, key]
      );
      if (existing.rows[0].member_email) {
        await tx.query(
          `UPDATE user_profiles p
           JOIN user_accounts u ON u.id = p.id
           SET p.profile_photo = ?
           WHERE LOWER(TRIM(u.email)) = LOWER(TRIM(?))`,
          [photoVal, existing.rows[0].member_email]
        );
      }
    });

    const { rows } = await db.query('SELECT * FROM core_team WHERE position_key = ?', [key]);
    const r = rows[0];
    res.json({
      positionKey:   r.position_key,
      positionLabel: r.position_label,
      positionOrder: r.position_order,
      memberName:    r.member_name,
      memberEmail:   r.member_email,
      memberPhone:   r.member_phone,
      memberBio:     r.member_bio,
      memberPhoto:   r.member_photo,
    });
  });

  // DELETE — clear the assigned person while keeping the position available
  router.delete('/:key', requireSession(database, env), requireRole('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
    const { key } = req.params;
    const pos = POSITIONS.find(p => p.key === key);
    if (!pos) throw new HttpError(404, 'Position not found.');

    const db = getDb();
    // Archive the holder and clear the slot atomically.
    await inTransaction(db, async (tx) => {
      const existing = await tx.query(
        `SELECT member_name, member_email, member_phone, member_bio, member_photo
         FROM core_team WHERE position_key = ? AND member_name != ''`,
        [key]
      );

      if (existing.rows.length > 0) {
        const member = existing.rows[0];
        await tx.query(
          `INSERT INTO other_members (id, member_name, member_email, member_phone, member_position, member_bio, member_photo)
           VALUES (?, ?, ?, ?, ?, '', ?)`,
          [randomUUID(), member.member_name, member.member_email, member.member_phone, pos.label, member.member_photo]
        );
      }

      await tx.query(
        `UPDATE core_team
         SET member_name = '', member_email = '', member_phone = '', member_bio = '', member_photo = ''
         WHERE position_key = ?`,
        [key]
      );
    });

    res.json({
      positionKey: key,
      positionLabel: pos.label,
      positionOrder: pos.order,
      memberName: '',
      memberEmail: '',
      memberPhone: '',
      memberBio: '',
      memberPhoto: '',
    });
  });

  // PATCH — assign an existing user to a position (replaces current person)
  router.patch('/:key', requireSession(database, env), requireRole('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
    const { key } = req.params;
    const pos = POSITIONS.find(p => p.key === key);
    if (!pos) throw new HttpError(404, 'Position not found.');

    const db = getDb();
    const { userId, memberBio, memberPhoto } = req.body;

    if (!userId || typeof userId !== 'string') {
      throw new HttpError(400, 'You must select a person for this position.');
    }

    const rawBio = memberBio ?? '';
    if (wordCount(rawBio) > MAX_BIO_WORDS) {
      throw new HttpError(400, `About section cannot exceed ${MAX_BIO_WORDS} words.`);
    }
    let bioVal = text(rawBio, 'About', 2000);

    // One transaction: archive the displaced holder, consume the sub-team row,
    // write the new slot and clear the old one. A failure halfway through must
    // not lose the previous holder.
    await inTransaction(db, async (tx) => {
      // Save the displaced person to other_members before overwriting
      const displaced = await tx.query(
        `SELECT member_name, member_email, member_phone, member_bio, member_photo
         FROM core_team WHERE position_key = ? AND member_name != ''`,
        [key]
      );
      if (displaced.rows.length > 0) {
        const d = displaced.rows[0];
        await tx.query(
          `INSERT INTO other_members (id, member_name, member_email, member_phone, member_position, member_bio, member_photo)
           VALUES (?, ?, ?, ?, ?, '', ?)`,
          [randomUUID(), d.member_name, d.member_email, d.member_phone, pos.label, d.member_photo]
        );
      }

      // Look up the new person's account/profile data
      const userRes = await tx.query(
        `SELECT p.id, p.full_name AS fullName, p.phone, u.email, p.role
         FROM user_profiles p JOIN user_accounts u ON u.id = p.id
         WHERE p.id = ?`,
        [userId]
      );
      if (!userRes.rows.length) throw new HttpError(404, 'Selected user not found.');
      const user = userRes.rows[0];

      // If the selected user already leads another core position, move their
      // existing profile content to the new position and clear the old slot.
      const previousCore = await tx.query(
        `SELECT position_key, member_bio, member_photo
         FROM core_team
         WHERE member_email = ? AND position_key != ? AND member_name != ''`,
        [user.email, key]
      );
      if (previousCore.rows.length > 0) {
        bioVal = text(previousCore.rows[0].member_bio ?? '', 'About', 2000);
      }

      // If the new person is on a sub-team, remove them from it. An explicit
      // upload wins over the stored photo — the stored one is only a fallback,
      // otherwise the admin's upload silently disappears on save.
      const teamRes = await tx.query(
        `SELECT stm.id, stm.member_photo FROM sub_team_members stm
         JOIN user_accounts ua ON ua.email = stm.member_email
         WHERE ua.id = ?`,
        [userId]
      );

      let finalPhoto = safeUrl(memberPhoto, 'Photo URL', 2048, { allowRelative: true });
      if (previousCore.rows.length > 0) {
        finalPhoto = finalPhoto || previousCore.rows[0].member_photo || '';
      }
      if (teamRes.rows.length > 0) {
        finalPhoto = finalPhoto || teamRes.rows[0].member_photo || '';
        await tx.query(
          'DELETE FROM sub_team_members WHERE LOWER(TRIM(member_email)) = ?',
          [user.email.trim().toLowerCase()]
        );
      }

      const memberName  = text(user.fullName ?? '', 'Name', 160);
      const memberEmail = text(user.email ?? '', 'Email', 255);
      const memberPhone = text(user.phone ?? '', 'Phone', 50);

      await tx.query(
        `INSERT INTO core_team (position_key, position_label, position_order,
           member_name, member_email, member_phone, member_bio, member_photo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           member_name  = VALUES(member_name),
           member_email = VALUES(member_email),
           member_phone = VALUES(member_phone),
           member_bio   = VALUES(member_bio),
           member_photo = VALUES(member_photo)`,
        [key, pos.label, pos.order, memberName, memberEmail, memberPhone, bioVal, finalPhoto]
      );
      await tx.query('UPDATE user_profiles SET profile_photo = ? WHERE id = ?', [finalPhoto, userId]);

      await tx.query(
        'DELETE FROM other_members WHERE LOWER(TRIM(member_email)) = ?',
        [memberEmail.trim().toLowerCase()]
      );

      for (const previous of previousCore.rows) {
        await tx.query(
          `UPDATE core_team
           SET member_name = '', member_email = '', member_phone = '', member_bio = '', member_photo = ''
           WHERE position_key = ?`,
          [previous.position_key]
        );
      }

      // Core team leadership implies at least MEMBER status
      if (user.role === 'USER') {
        await tx.query('UPDATE user_profiles SET role = ? WHERE id = ?', ['MEMBER', userId]);
      }
    });

    const { rows } = await db.query('SELECT * FROM core_team WHERE position_key = ?', [key]);
    const r = rows[0];
    res.json({
      positionKey:   r.position_key,
      positionLabel: r.position_label,
      positionOrder: r.position_order,
      memberName:    r.member_name,
      memberEmail:   r.member_email,
      memberPhone:   r.member_phone,
      memberBio:     r.member_bio,
      memberPhoto:   r.member_photo,
    });
  });

  return router;
}

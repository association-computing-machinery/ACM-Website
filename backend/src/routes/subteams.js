import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { requireSession, requireRole, rateLimit } from '../security.js';
import { text, uuid, safeUrl, HttpError } from '../validation.js';
import { inTransaction } from '../config/database.js';

const TEAM_POSITION_VALUES = new Set(['MEMBER', 'TEAM_DIRECTOR', 'TEAM_LEAD', 'TEAM_CO_LEAD']);

function normalizeTeamPosition(value) {
  const raw = String(value ?? 'MEMBER').trim().toUpperCase().replace(/-/g, '_').replace(/\s+/g, '_');
  const mapped = raw === 'DIRECTOR' ? 'TEAM_DIRECTOR'
    : raw === 'LEAD' ? 'TEAM_LEAD'
    : raw === 'CO_LEAD' || raw === 'COLEAD' ? 'TEAM_CO_LEAD'
    : raw;
  return TEAM_POSITION_VALUES.has(mapped) ? mapped : 'MEMBER';
}

function formatTeamPosition(value) {
  switch (normalizeTeamPosition(value)) {
    case 'TEAM_DIRECTOR': return 'Team Director';
    case 'TEAM_LEAD': return 'Team Head';
    case 'TEAM_CO_LEAD': return 'Team Co-Head';
    default: return 'Member';
  }
}

export function subTeamRoutes({ database, env }) {
  const router = Router();
  const getDb = () => (typeof database === 'function' ? database() : database);
  const auth = requireSession(database, env);
  const admin = requireRole('ADMIN', 'SUPER_ADMIN');
  const limit = (n) => rateLimit(database, env, 'team-write', n);

  // GET all teams with their members
  router.get('/', async (_req, res) => {
    const db = getDb();
    const { rows: teams } = await db.query(
      "SELECT id, name, COALESCE(responsibilities, '') AS responsibilities, display_order FROM sub_teams ORDER BY created_at ASC"
    );
    const { rows: members } = await db.query(
      `SELECT stm.id, stm.team_id, stm.member_name, stm.member_email, stm.member_phone,
              stm.member_bio,
              COALESCE(NULLIF(up.profile_photo, ''), stm.member_photo) AS member_photo,
              stm.position
       FROM sub_team_members stm
       LEFT JOIN user_accounts ua ON LOWER(TRIM(ua.email)) = LOWER(TRIM(stm.member_email))
       LEFT JOIN user_profiles up ON up.id = ua.id
       ORDER BY stm.created_at DESC, stm.id DESC`
    );
    const map = {};
    const assignedEmails = new Set();
    teams.forEach(t => { map[t.id] = { ...t, members: [] }; });
    members.forEach(m => {
      const email = m.member_email.trim().toLowerCase();
      if (email && assignedEmails.has(email)) return;
      if (email) assignedEmails.add(email);
      const position = normalizeTeamPosition(m.position);
      if (map[m.team_id]) map[m.team_id].members.push({ ...m, position });
    });
    res.json({ teams: teams.map(t => map[t.id]) });
  });

  router.get('/members/:id', async (req, res) => {
    const db = getDb();
    const id = uuid(req.params.id);
    const { rows } = await db.query(
      `SELECT stm.id, stm.team_id, st.name AS team_name, stm.member_name, stm.member_email,
              stm.member_phone, stm.member_bio,
              COALESCE(NULLIF(up.profile_photo, ''), stm.member_photo) AS member_photo,
              stm.position
       FROM sub_team_members stm
       JOIN sub_teams st ON st.id = stm.team_id
       LEFT JOIN user_accounts ua ON LOWER(TRIM(ua.email)) = LOWER(TRIM(stm.member_email))
       LEFT JOIN user_profiles up ON up.id = ua.id
       WHERE stm.id = ?`,
      [id]
    );
    if (!rows.length) throw new HttpError(404, 'This member profile is not available.');
    res.json({ member: { ...rows[0], position: normalizeTeamPosition(rows[0].position) } });
  });

  // POST create team
  router.post('/teams', auth, admin, limit(50), async (req, res) => {
    const db = getDb();
    const name = text(req.body.name, 'Team name', 120, 1);
    const id = randomUUID();
    const { rows: last } = await db.query('SELECT MAX(display_order) AS mx FROM sub_teams');
    const order = (last[0]?.mx ?? 0) + 1;
    await db.query('INSERT INTO sub_teams (id, name, display_order) VALUES (?, ?, ?)', [id, name, order]);
    res.status(201).json({ id, name, responsibilities: '', display_order: order, members: [] });
  });

  // PATCH team name and responsibilities.
  router.patch('/teams/:id', auth, admin, limit(50), async (req, res) => {
    const db = getDb();
    const id = uuid(req.params.id);
    const name = text(req.body.name, 'Team name', 120, 1);
    const responsibilities = text(req.body.responsibilities ?? '', 'Team responsibilities', 3000);
    const wordCount = responsibilities.split(/\s+/).filter(Boolean).length;
    if (wordCount > 50) throw new HttpError(400, 'Team responsibilities must be 50 words or fewer.');

    const { rows } = await db.query('SELECT id FROM sub_teams WHERE id = ?', [id]);
    if (!rows.length) throw new HttpError(404, 'Team not found.');
    await db.query(
      'UPDATE sub_teams SET name = ?, responsibilities = ? WHERE id = ?',
      [name, responsibilities || null, id]
    );
    res.json({ id, name, responsibilities, message: 'Team updated.' });
  });

  // DELETE team — moves all members to other_members first
  router.delete('/teams/:id', auth, admin, limit(50), async (req, res) => {
    const db = getDb();
    const id = uuid(req.params.id);

    // Archive every member and delete the team in one unit of work.
    await inTransaction(db, async (tx) => {
      const { rows: members } = await tx.query(
        'SELECT member_name, member_email, member_phone, position, member_photo FROM sub_team_members WHERE team_id = ?',
        [id]
      );
      for (const m of members) {
        if (m.member_name || m.member_email) {
          await tx.query(
            `INSERT INTO other_members (id, member_name, member_email, member_phone, member_position, member_bio, member_photo)
             VALUES (?, ?, ?, ?, ?, '', ?)`,
            [randomUUID(), m.member_name || '', m.member_email || '', m.member_phone || '', formatTeamPosition(m.position), m.member_photo || '']
          );
        }
      }

      await tx.query('DELETE FROM sub_teams WHERE id = ?', [id]);
    });
    res.json({ message: 'Team deleted.' });
  });

  // POST add member to team
  router.post('/teams/:teamId/members', auth, admin, limit(100), async (req, res) => {
    const db = getDb();
    const teamId = uuid(req.params.teamId);
    const team = await db.query('SELECT id FROM sub_teams WHERE id = ?', [teamId]);
    if (!team.rows.length) throw new HttpError(404, 'Team not found.');

    const { memberName, memberEmail, memberPhone, memberPhoto, password, othMemberId, position } = req.body;
    const memberPosition = normalizeTeamPosition(position);

    // Validate before anything is written: unchecked values reached MySQL
    // directly here and surfaced as an opaque 503 on over-long input.
    const memberNameVal  = text(memberName ?? '', 'Name', 160);
    const memberEmailVal = text(memberEmail ?? '', 'Email', 255);
    const memberPhoneVal = text(memberPhone ?? '', 'Phone', 50);
    const memberBioVal   = '';
    const memberPhotoVal = safeUrl(memberPhoto, 'Photo', 2048, { allowRelative: true });

    // Account creation/move, the roster row and the other_members cleanup are
    // one unit of work: a failure must not leave an account without a roster
    // row (or a roster row that says a password was set when it was not).
    const id = randomUUID();
    await inTransaction(db, async (tx) => {
      // Reassigning between teams should move the person, not create another
      // roster row or archive the previous assignment.
      if (memberEmailVal) {
        const previousAssignments = await tx.query(
          'SELECT id FROM sub_team_members WHERE LOWER(TRIM(member_email)) = ?',
          [memberEmailVal.toLowerCase()]
        );

        for (const previous of previousAssignments.rows) {
          await tx.query('DELETE FROM sub_team_members WHERE id = ?', [previous.id]);
        }
      }

      // Account logic
      if (memberEmailVal) {
        const emailVal = memberEmailVal.toLowerCase();
        const existing = await tx.query(
          'SELECT u.id, p.role FROM user_accounts u JOIN user_profiles p ON p.id = u.id WHERE u.email = ?',
          [emailVal]
        );
        if (existing.rows.length > 0) {
          const { id: uid, role } = existing.rows[0];
          if (role === 'USER') await tx.query('UPDATE user_profiles SET role = ? WHERE id = ?', ['MEMBER', uid]);
          if (memberNameVal) await tx.query('UPDATE user_profiles SET full_name = ? WHERE id = ?', [memberNameVal, uid]);
        } else {
          if (!password || password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
            throw new HttpError(400, 'A password (8+ chars, letters & numbers) is required to create an account.');
          }
          const newId = randomUUID();
          const hash  = await bcrypt.hash(password, 10);
          await tx.query('INSERT INTO user_accounts (id, email, password_hash) VALUES (?, ?, ?)', [newId, emailVal, hash]);
          await tx.query(
            `INSERT INTO user_profiles (id, full_name, role, university, phone, terms_accepted_at) VALUES (?, ?, 'MEMBER', 'Information Technology University (ITU)', ?, ?)`,
            [newId, text(memberNameVal, 'Name', 160, 1), memberPhoneVal.replace(/\s+/g, ''), new Date()]
          );
        }
      }

      await tx.query(
        'INSERT INTO sub_team_members (id, team_id, member_name, member_email, member_phone, member_bio, member_photo, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, teamId, memberNameVal, memberEmailVal, memberPhoneVal, memberBioVal, memberPhotoVal, memberPosition]
      );
      if (memberEmailVal) {
        await tx.query(
          `UPDATE user_profiles p
           JOIN user_accounts u ON u.id = p.id
           SET p.profile_photo = ?
           WHERE LOWER(TRIM(u.email)) = LOWER(TRIM(?))`,
          [memberPhotoVal, memberEmailVal]
        );
      }
      // If selected from other_members, remove from there
      if (othMemberId && typeof othMemberId === 'string') {
        await tx.query('DELETE FROM other_members WHERE id = ?', [othMemberId]);
      }
      if (memberEmailVal) {
        await tx.query(
          'DELETE FROM other_members WHERE LOWER(TRIM(member_email)) = ?',
          [memberEmailVal.toLowerCase()]
        );
      }
    });
    res.status(201).json({ id, team_id: teamId, member_name: memberNameVal, member_email: memberEmailVal, member_phone: memberPhoneVal, member_bio: memberBioVal, member_photo: memberPhotoVal, position: memberPosition, display_order: 0 });
  });

  // PATCH update member
  router.patch('/members/:id', auth, admin, limit(100), async (req, res) => {
    const db = getDb();
    const id = uuid(req.params.id);
    const { memberName, memberEmail, memberPhone, memberPhoto, password, position, othMemberId } = req.body;

    const sets = [];
    const vals = [];
    if (memberName  !== undefined) { sets.push('member_name = ?');  vals.push(text(memberName ?? '', 'Name', 160)); }
    if (memberEmail !== undefined) { sets.push('member_email = ?'); vals.push(text(memberEmail ?? '', 'Email', 255)); }
    if (memberPhone !== undefined) { sets.push('member_phone = ?'); vals.push(text(memberPhone ?? '', 'Phone', 50)); }
    sets.push("member_bio = ''");
    if (memberPhoto !== undefined) { sets.push('member_photo = ?'); vals.push(safeUrl(memberPhoto, 'Photo', 2048, { allowRelative: true })); }
    if (position !== undefined) { const nextPosition = normalizeTeamPosition(position); sets.push('position = ?'); vals.push(nextPosition); }
    if (!sets.length) throw new HttpError(400, 'Nothing to update.');

    // The account side-effect and the roster update belong together.
    await inTransaction(db, async (tx) => {
      // Swapping in a different person on an existing row used to overwrite the
      // outgoing member with no trace and leave the incoming other_members row
      // in place, so the same person existed in both tables.
      if (othMemberId && typeof othMemberId === 'string') {
        const previous = await tx.query(
          'SELECT member_name, member_email, member_phone, position, member_photo FROM sub_team_members WHERE id = ?',
          [id]
        );
        if (previous.rows.length > 0) {
          const p = previous.rows[0];
          if (p.member_name || p.member_email) {
            await tx.query(
              `INSERT INTO other_members (id, member_name, member_email, member_phone, member_position, member_bio, member_photo)
               VALUES (?, ?, ?, ?, ?, '', ?)`,
              [randomUUID(), p.member_name || '', p.member_email || '', p.member_phone || '', formatTeamPosition(p.position), p.member_photo || '']
            );
          }
        }
        await tx.query('DELETE FROM other_members WHERE id = ?', [othMemberId]);
      }
      if (memberEmail && typeof memberEmail === 'string' && memberEmail.trim()) {
        await tx.query(
          'DELETE FROM other_members WHERE LOWER(TRIM(member_email)) = ?',
          [memberEmail.trim().toLowerCase()]
        );
      }

      // Account logic same as add
      if (memberEmail && typeof memberEmail === 'string' && memberEmail.trim()) {
        const emailVal = memberEmail.trim().toLowerCase();
        const existing = await tx.query(
          'SELECT u.id, p.role FROM user_accounts u JOIN user_profiles p ON p.id = u.id WHERE u.email = ?',
          [emailVal]
        );
        if (existing.rows.length > 0) {
          const { id: uid, role } = existing.rows[0];
          if (role === 'USER') await tx.query('UPDATE user_profiles SET role = ? WHERE id = ?', ['MEMBER', uid]);
          if (memberName) await tx.query('UPDATE user_profiles SET full_name = ? WHERE id = ?', [memberName, uid]);
        } else if (password) {
          if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
            throw new HttpError(400, 'Password must be 8+ chars with letters and numbers.');
          }
          const newId = randomUUID();
          const hash  = await bcrypt.hash(password, 10);
          await tx.query('INSERT INTO user_accounts (id, email, password_hash) VALUES (?, ?, ?)', [newId, emailVal, hash]);
          await tx.query(
            `INSERT INTO user_profiles (id, full_name, role, university, phone, terms_accepted_at) VALUES (?, ?, 'MEMBER', 'Information Technology University (ITU)', ?, ?)`,
            [newId, text(memberName ?? '', 'Name', 160, 1), (memberPhone ?? '').replace(/\s+/g, ''), new Date()]
          );
        }
      }

      await tx.query(`UPDATE sub_team_members SET ${sets.join(', ')} WHERE id = ?`, [...vals, id]);
      if (memberPhoto !== undefined) {
        const updatedMember = await tx.query('SELECT member_email FROM sub_team_members WHERE id = ?', [id]);
        const photoEmail = updatedMember.rows[0]?.member_email;
        if (photoEmail) {
          await tx.query(
            `UPDATE user_profiles p
             JOIN user_accounts u ON u.id = p.id
             SET p.profile_photo = ?
             WHERE LOWER(TRIM(u.email)) = LOWER(TRIM(?))`,
            [safeUrl(memberPhoto, 'Photo', 2048, { allowRelative: true }), photoEmail]
          );
        }
      }
    });

    const { rows } = await db.query('SELECT * FROM sub_team_members WHERE id = ?', [id]);
    res.json({ ...rows[0], position: normalizeTeamPosition(rows[0]?.position) });
  });

  router.patch('/members/:id/position', auth, admin, limit(100), async (req, res) => {
    const db = getDb();
    const id = uuid(req.params.id);
    const nextPosition = normalizeTeamPosition(req.body?.position);
    await db.query('UPDATE sub_team_members SET position = ? WHERE id = ?', [nextPosition, id]);
    const { rows } = await db.query('SELECT * FROM sub_team_members WHERE id = ?', [id]);
    if (!rows.length) throw new HttpError(404, 'Member not found.');
    res.json({ ...rows[0], position: normalizeTeamPosition(rows[0].position) });
  });

  // DELETE member — moves to other_members first
  router.delete('/members/:id', auth, admin, limit(100), async (req, res) => {
    const db = getDb();
    const id = uuid(req.params.id);

    // Archive then remove, atomically — otherwise the member disappears
    // without ever reaching other_members.
    await inTransaction(db, async (tx) => {
      const { rows } = await tx.query(
        'SELECT member_name, member_email, member_phone, position, member_photo FROM sub_team_members WHERE id = ?',
        [id]
      );
      if (rows.length > 0) {
        const m = rows[0];
        if (m.member_name || m.member_email) {
          await tx.query(
            `INSERT INTO other_members (id, member_name, member_email, member_phone, member_position, member_bio, member_photo)
             VALUES (?, ?, ?, ?, ?, '', ?)`,
            [randomUUID(), m.member_name || '', m.member_email || '', m.member_phone || '', formatTeamPosition(m.position), m.member_photo || '']
          );
        }
      }

      await tx.query('DELETE FROM sub_team_members WHERE id = ?', [id]);
    });
    res.json({ message: 'Member removed.' });
  });

  return router;
}

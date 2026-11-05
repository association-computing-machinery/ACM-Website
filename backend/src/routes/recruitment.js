import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { inTransaction } from '../config/database.js';
import { requireSession, requireRole, rateLimit } from '../security.js';
import { HttpError, text, uuid } from '../validation.js';

const CAMPUS_EMAIL_SUFFIX = '@itu.edu.pk';
const COMMITMENTS = new Set(['1-5 hours/week', '6-10 hours/week', '10-15 hours/week']);

function localDateTime(value, label) {
  if (typeof value !== 'string'
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?$/.test(value)) {
    throw new HttpError(400, `${label} is invalid.`);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new HttpError(400, `${label} is invalid.`);
  if (!/(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    const [date, time] = value.split('T');
    const [year, month, day] = date.split('-').map(Number);
    const [hour, minute] = time.split(':').map(Number);
    if (parsed.getFullYear() !== year || parsed.getMonth() + 1 !== month || parsed.getDate() !== day
      || parsed.getHours() !== hour || parsed.getMinutes() !== minute) {
      throw new HttpError(400, `${label} is invalid.`);
    }
  }
  return parsed.toISOString().slice(0, 19).replace('T', ' ');
}

function wordCount(value) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

export function recruitmentRoutes({ database, env }) {
  const router = Router();
  const getDb = () => (typeof database === 'function' ? database() : database);
  const auth = requireSession(database, env);
  const admin = requireRole('ADMIN', 'SUPER_ADMIN');

  router.get('/status', async (_req, res) => {
    const db = getDb();
    const [{ rows: periods }, { rows: teams }] = await Promise.all([
      db.query(
        `SELECT DATE_FORMAT(start_at, '%Y-%m-%dT%H:%i:%sZ') AS startAt,
                DATE_FORMAT(end_at, '%Y-%m-%dT%H:%i:%sZ') AS endAt,
                (start_at IS NOT NULL AND end_at IS NOT NULL
                  AND UTC_TIMESTAMP() BETWEEN start_at AND end_at) AS isOpen
         FROM recruitment_periods WHERE id = 1`
      ),
      db.query(
        `SELECT id, name, COALESCE(responsibilities, '') AS responsibilities
         FROM sub_teams ORDER BY display_order, created_at`
      ),
    ]);
    const period = periods[0] || { startAt: null, endAt: null, isOpen: 0 };
    res.json({
      startAt: period.startAt,
      endAt: period.endAt,
      isOpen: Boolean(period.isOpen),
      teams,
    });
  });

  router.patch('/period', auth, admin, async (req, res) => {
    const startInput = req.body.startAt;
    const endInput = req.body.endAt;
    if ((startInput == null || startInput === '') && (endInput == null || endInput === '')) {
      await getDb().query(
        'UPDATE recruitment_periods SET start_at = NULL, end_at = NULL, updated_by = ? WHERE id = 1',
        [req.user.id]
      );
      return res.json({ startAt: null, endAt: null, isOpen: false });
    }

    const startAt = localDateTime(startInput, 'Recruitment start');
    const endAt = localDateTime(endInput, 'Recruitment end');
    if (new Date(startInput) >= new Date(endInput)) {
      throw new HttpError(400, 'Recruitment end must be after its start.');
    }
    const db = getDb();
    await inTransaction(db, async tx => {
      const { rows } = await tx.query(
        'SELECT start_at, period_key FROM recruitment_periods WHERE id = 1 FOR UPDATE'
      );
      if (!rows.length) throw new HttpError(503, 'Recruitment settings are unavailable.');
      const periodKey = rows[0].start_at == null ? randomUUID() : rows[0].period_key || randomUUID();
      await tx.query(
        'UPDATE recruitment_periods SET period_key = ?, start_at = ?, end_at = ?, updated_by = ? WHERE id = 1',
        [periodKey, startAt, endAt, req.user.id]
      );
    });
    const startDate = new Date(startInput);
    const endDate = new Date(endInput);
    const isOpen = new Date() >= startDate && new Date() <= endDate;
    res.json({
      startAt: startDate.toISOString().replace(/\.\d{3}Z$/, 'Z'),
      endAt: endDate.toISOString().replace(/\.\d{3}Z$/, 'Z'),
      isOpen,
    });
  });

  router.post(
    '/applications',
    auth,
    rateLimit(database, env, 'recruitment-application', 5, 3600),
    async (req, res) => {
      if (!req.user.email.toLowerCase().endsWith(CAMPUS_EMAIL_SUFFIX)) {
        throw new HttpError(403, 'Recruitment applications are only available to ITU email addresses.');
      }

      const db = getDb();
      const { rows: periods } = await db.query(
        `SELECT start_at, end_at, period_key,
                (start_at IS NOT NULL AND end_at IS NOT NULL
                  AND UTC_TIMESTAMP() BETWEEN start_at AND end_at) AS isOpen
         FROM recruitment_periods WHERE id = 1`
      );
      if (!periods[0]?.isOpen) throw new HttpError(403, 'Recruitment applications are currently closed.');
      if (!periods[0].period_key) throw new HttpError(503, 'Recruitment period is not configured correctly.');

      const teamId = uuid(req.body.teamId);
      const reason = text(req.body.reason, 'Why this team', 500, 1);
      if (wordCount(reason) > 20) throw new HttpError(400, 'Why this team must be 20 words or fewer.');
      if (!COMMITMENTS.has(req.body.commitment)) throw new HttpError(400, 'Choose a valid weekly time commitment.');
      if (req.body.agreements?.commitTime !== true
        || req.body.agreements?.attendEvents !== true
        || req.body.agreements?.professionalConduct !== true) {
        throw new HttpError(400, 'Accept all agreements before submitting your application.');
      }

      const { rows: teams } = await db.query('SELECT id, name FROM sub_teams WHERE id = ?', [teamId]);
      if (!teams.length) throw new HttpError(400, 'Choose an available team.');

      const id = randomUUID();
      await inTransaction(db, async tx => {
        const { rows: currentPeriods } = await tx.query(
          `SELECT period_key,
                  (start_at IS NOT NULL AND end_at IS NOT NULL
                    AND UTC_TIMESTAMP() BETWEEN start_at AND end_at) AS isOpen
           FROM recruitment_periods WHERE id = 1 FOR UPDATE`
        );
        if (!currentPeriods[0]?.isOpen || currentPeriods[0].period_key !== periods[0].period_key) {
          throw new HttpError(403, 'Recruitment applications are currently closed.');
        }
        const { rows: existingApplications } = await tx.query(
          'SELECT id FROM recruitment_applications WHERE user_id = ? AND period_key = ? LIMIT 1',
          [req.user.id, currentPeriods[0].period_key]
        );
        if (existingApplications.length) {
          throw new HttpError(409, 'You have already applied for this recruitment period.');
        }
        await tx.query(
          `INSERT INTO recruitment_applications
            (id, user_id, team_id, period_key, team_name, reason, commitment, agreed_commit_time, agreed_attend_events, agreed_professional_conduct)
           VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, 1)`,
          [id, req.user.id, teamId, currentPeriods[0].period_key, teams[0].name, reason, req.body.commitment]
        );
      });
      res.status(201).json({ id, message: 'Your application has been submitted.' });
    }
  );

  router.get('/applications/mine', auth, async (req, res) => {
    const db = getDb();
    const { rows: periods } = await db.query('SELECT period_key FROM recruitment_periods WHERE id = 1');
    const periodKey = periods[0]?.period_key;
    if (!periodKey) return res.json({ hasApplied: false });
    const { rows } = await db.query(
      'SELECT 1 FROM recruitment_applications WHERE user_id = ? AND period_key = ? LIMIT 1',
      [req.user.id, periodKey]
    );
    res.json({ hasApplied: rows.length > 0 });
  });

  router.get('/applications', auth, admin, async (_req, res) => {
    const { rows } = await getDb().query(
      `SELECT a.id, a.team_name AS teamName, a.reason, a.commitment,
              a.agreed_commit_time AS agreedCommitTime,
              a.agreed_attend_events AS agreedAttendEvents,
              a.agreed_professional_conduct AS agreedProfessionalConduct,
              a.created_at AS createdAt, p.full_name AS applicantName, u.email AS applicantEmail
       FROM recruitment_applications a
       JOIN user_profiles p ON p.id = a.user_id
       JOIN user_accounts u ON u.id = a.user_id
       ORDER BY a.created_at DESC
       LIMIT 500`
    );
    res.json({ applications: rows });
  });

  router.delete('/applications', auth, admin, async (_req, res) => {
    const result = await getDb().query('DELETE FROM recruitment_applications');
    res.json({ deleted: result.rowCount });
  });

  router.delete('/applications/:id', auth, admin, async (req, res) => {
    const id = uuid(req.params.id);
    const result = await getDb().query('DELETE FROM recruitment_applications WHERE id = ?', [id]);
    if (!result.rowCount) throw new HttpError(404, 'Recruitment application not found.');
    res.json({ message: 'Recruitment application deleted.' });
  });

  return router;
}

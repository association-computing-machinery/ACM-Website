import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { requireSession, requireRole, rateLimit } from '../security.js';
import { email as validateEmail, HttpError, safeUrl, text, uuid } from '../validation.js';
import { inTransaction } from '../config/database.js';
import { uploadFile } from '../config/imagekit.js';

const QUESTION_TYPES = new Set([
  'short_answer', 'long_answer', 'email', 'multiple_choice', 'checkboxes', 'dropdown', 'photo',
]);

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateForm(value) {
  if (!isRecord(value) || !Array.isArray(value.sections) || value.sections.length < 1 || value.sections.length > 30) {
    throw new HttpError(400, 'A form must contain between 1 and 30 sections.');
  }
  const form = {
    title: text(value.title, 'Form title', 160, 1),
    description: text(value.description ?? '', 'Form description', 2000),
    sections: [],
  };
  const sectionIds = new Set();
  const allIds = new Set();
  for (const rawSection of value.sections) {
    if (isRecord(rawSection) && typeof rawSection.id === 'string') allIds.add(rawSection.id);
  }
  let questionCount = 0;
  for (const rawSection of value.sections) {
    if (!isRecord(rawSection) || typeof rawSection.id !== 'string'
      || !/^[\w-]{1,80}$/.test(rawSection.id) || sectionIds.has(rawSection.id)
      || !Array.isArray(rawSection.questions) || rawSection.questions.length > 50) {
      throw new HttpError(400, 'A form section is invalid.');
    }
    sectionIds.add(rawSection.id);
    allIds.add(rawSection.id);
    const section = {
      id: rawSection.id,
      title: text(rawSection.title, 'Section title', 160, 1),
      description: text(rawSection.description ?? '', 'Section description', 2000),
      questions: [],
    };
    for (const rawQuestion of rawSection.questions) {
      questionCount += 1;
      if (!isRecord(rawQuestion) || typeof rawQuestion.id !== 'string'
        || !/^[\w-]{1,80}$/.test(rawQuestion.id) || !QUESTION_TYPES.has(rawQuestion.type)
        || typeof rawQuestion.required !== 'boolean' || !Array.isArray(rawQuestion.options)
        || allIds.has(rawQuestion.id)) {
        throw new HttpError(400, 'A form question is invalid.');
      }
      allIds.add(rawQuestion.id);
      const needsOptions = ['multiple_choice', 'checkboxes', 'dropdown'].includes(rawQuestion.type);
      if ((needsOptions && (rawQuestion.options.length < 2 || rawQuestion.options.length > 30))
        || (!needsOptions && rawQuestion.options.length !== 0)) {
        throw new HttpError(400, 'Question choices are invalid.');
      }
      const optionIds = new Set();
      const options = rawQuestion.options.map(option => {
        if (!isRecord(option) || typeof option.id !== 'string' || !/^[\w-]{1,80}$/.test(option.id)
          || allIds.has(option.id) || optionIds.has(option.id)) {
          throw new HttpError(400, 'A question choice is invalid.');
        }
        allIds.add(option.id);
        optionIds.add(option.id);
        const nextSectionId = option.nextSectionId ?? null;
        if (nextSectionId !== null && typeof nextSectionId !== 'string') {
          throw new HttpError(400, 'A choice destination is invalid.');
        }
        return {
          id: option.id,
          label: text(option.label, 'Choice label', 200, 1),
          nextSectionId,
        };
      });
      section.questions.push({
        id: rawQuestion.id,
        title: text(rawQuestion.title, 'Question title', 300, 1),
        description: text(rawQuestion.description ?? '', 'Question description', 1000),
        type: rawQuestion.type,
        required: rawQuestion.required,
        options,
      });
    }
    form.sections.push(section);
  }
  if (questionCount > 100) throw new HttpError(400, 'A form can contain no more than 100 questions.');
  for (const section of form.sections) {
    for (const question of section.questions) {
      for (const option of question.options) {
        if (option.nextSectionId && !sectionIds.has(option.nextSectionId)) {
          throw new HttpError(400, 'A choice must route to an existing section.');
        }
      }
    }
  }
  if (Buffer.byteLength(JSON.stringify(form), 'utf8') > 200 * 1024) {
    throw new HttpError(400, 'This form is too large to save.');
  }
  return form;
}

function parseForm(value) {
  try {
    return validateForm(typeof value === 'string' ? JSON.parse(value) : value);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(503, 'This module form is invalid. Ask an administrator to repair it.');
  }
}

function validateAnswers(form, value) {
  if (!isRecord(value)) throw new HttpError(400, 'Application answers are invalid.');
  const answers = {};
  const visited = new Set();
  let sectionId = form.sections[0].id;
  while (sectionId) {
    if (visited.has(sectionId)) throw new HttpError(400, 'The form routing contains a loop.');
    visited.add(sectionId);
    const section = form.sections.find(item => item.id === sectionId);
    if (!section) throw new HttpError(400, 'The form routes to an unavailable section.');
    for (const question of section.questions) {
      const answer = value[question.id];
      if (answer === undefined || answer === '') {
        if (question.required) throw new HttpError(400, `Answer required: ${question.title}`);
        continue;
      }
      if (question.type === 'short_answer' || question.type === 'long_answer') {
        const limit = question.type === 'short_answer' ? 500 : 10000;
        answers[question.id] = text(answer, question.title, limit, question.required ? 1 : 0);
      } else if (question.type === 'email') {
        answers[question.id] = validateEmail(answer);
      } else if (question.type === 'photo') {
        answers[question.id] = safeUrl(answer, question.title, 2048, { required: question.required });
      } else {
        const selections = Array.isArray(answer) ? answer : [answer];
        const validIds = new Set(question.options.map(option => option.id));
        if ((question.type === 'checkboxes' && !Array.isArray(answer))
          || (question.type !== 'checkboxes' && (Array.isArray(answer) || selections.length !== 1))
          || (question.required && selections.length === 0)
          || selections.some(item => typeof item !== 'string' || !validIds.has(item))
          || (question.type === 'checkboxes' && selections.length > question.options.length)) {
          throw new HttpError(400, `Choose valid answers for: ${question.title}`);
        }
        if (question.type === 'checkboxes' && new Set(selections).size !== selections.length) {
          throw new HttpError(400, `Choose each answer only once for: ${question.title}`);
        }
        answers[question.id] = question.type === 'checkboxes' ? selections : selections[0];
      }
    }

    let destination = null;
    for (const question of section.questions) {
      const answer = answers[question.id];
      if (answer === undefined) continue;
      const selections = Array.isArray(answer) ? answer : [answer];
      const route = question.options.find(option => option.nextSectionId && selections.includes(option.id));
      if (route) {
        destination = route.nextSectionId;
        break;
      }
    }
    if (destination && visited.has(destination)) throw new HttpError(400, 'The form routing contains a loop.');
    if (destination) {
      sectionId = destination;
    } else {
      sectionId = form.sections[form.sections.indexOf(section) + 1]?.id ?? null;
    }
  }
  const visibleQuestionIds = new Set(
    form.sections.filter(section => visited.has(section.id)).flatMap(section => section.questions.map(question => question.id))
  );
  if (Object.keys(value).some(id => !visibleQuestionIds.has(id))) {
    throw new HttpError(400, 'Answers include questions outside the selected form path.');
  }
  if (Buffer.byteLength(JSON.stringify(answers), 'utf8') > 12000) {
    throw new HttpError(400, 'Your answers are too long to submit.');
  }
  return { answers, visibleQuestionIds };
}

async function getAppliedModuleEmails(db, moduleId, periodKey, fallbackForm) {
  const { rows: applications } = await db.query(
    'SELECT answers, form_snapshot FROM itu_fest_applications WHERE module_id = ? AND period_key = ?',
    [moduleId, periodKey]
  );
  const appliedEmails = new Set();
  for (const application of applications) {
    let answers = application.answers;
    if (typeof answers === 'string') {
      try {
        answers = JSON.parse(answers);
      } catch {
        throw new HttpError(503, 'An existing module response could not be read.');
      }
    }
    const form = parseForm(application.form_snapshot ?? fallbackForm);
    for (const question of form.sections.flatMap(section => section.questions)) {
      if (question.type !== 'email') continue;
      const value = answers?.[question.id];
      const emails = Array.isArray(value) ? value : [value];
      for (const emailValue of emails) {
        if (typeof emailValue === 'string' && emailValue.trim()) {
          appliedEmails.add(emailValue.trim().toLowerCase());
        }
      }
    }
  }
  return appliedEmails;
}

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

export function ituFestRoutes({ database, env }) {
  const router = Router();
  const getDb = () => (typeof database === 'function' ? database() : database);
  const auth = requireSession(database, env);
  const admin = requireRole('ADMIN', 'SUPER_ADMIN');
  const limit = rateLimit(database, env, 'itu-fest-module-write', 100);
  const applicationLimit = rateLimit(database, env, 'itu-fest-application', 5, 3600);
  const emailCheckLimit = rateLimit(database, env, 'itu-fest-email-check', 30, 60);

  router.get('/period', async (_req, res) => {
    const { rows } = await getDb().query(
      `SELECT DATE_FORMAT(start_at, '%Y-%m-%dT%H:%i:%sZ') AS startAt,
              DATE_FORMAT(end_at, '%Y-%m-%dT%H:%i:%sZ') AS endAt,
              (start_at IS NOT NULL AND end_at IS NOT NULL
                AND UTC_TIMESTAMP() BETWEEN start_at AND end_at) AS isOpen
       FROM itu_fest_application_periods WHERE id = 1`
    );
    const period = rows[0] || { startAt: null, endAt: null, isOpen: 0 };
    res.json({ startAt: period.startAt, endAt: period.endAt, isOpen: Boolean(period.isOpen) });
  });

  router.patch('/period', auth, admin, limit, async (req, res) => {
    const startInput = req.body.startAt;
    const endInput = req.body.endAt;
    const db = getDb();
    if ((startInput == null || startInput === '') && (endInput == null || endInput === '')) {
      await db.query(
        'UPDATE itu_fest_application_periods SET period_key = NULL, start_at = NULL, end_at = NULL, updated_by = ? WHERE id = 1',
        [req.user.id]
      );
      return res.json({ startAt: null, endAt: null, isOpen: false });
    }
    if (startInput == null || startInput === '' || endInput == null || endInput === '') {
      throw new HttpError(400, 'Enter both a start and end date, or leave both empty to close applications.');
    }
    const startAt = localDateTime(startInput, 'Application start');
    const endAt = localDateTime(endInput, 'Application end');
    if (new Date(startInput) >= new Date(endInput)) {
      throw new HttpError(400, 'Application end must be after its start.');
    }
    await inTransaction(db, async tx => {
      const { rows } = await tx.query(
        'SELECT start_at, period_key FROM itu_fest_application_periods WHERE id = 1 FOR UPDATE'
      );
      if (!rows.length) throw new HttpError(503, 'ITU Fest application dates are unavailable.');
      const periodKey = rows[0].start_at == null ? randomUUID() : rows[0].period_key || randomUUID();
      await tx.query(
        'UPDATE itu_fest_application_periods SET period_key = ?, start_at = ?, end_at = ?, updated_by = ? WHERE id = 1',
        [periodKey, startAt, endAt, req.user.id]
      );
    });
    const isOpen = new Date() >= new Date(startInput) && new Date() <= new Date(endInput);
    res.json({
      startAt: new Date(startInput).toISOString(),
      endAt: new Date(endInput).toISOString(),
      isOpen,
    });
  });

  router.get('/modules', async (_req, res) => {
    const { rows } = await getDb().query(
      'SELECT id, name, image_url, display_order FROM itu_fest_modules WHERE is_enabled = 1 ORDER BY display_order ASC, created_at ASC, id ASC'
    );
    res.json({ modules: rows });
  });

  router.get('/modules/manage', auth, admin, async (_req, res) => {
    const { rows } = await getDb().query(
      'SELECT id, name, image_url, display_order, is_enabled AS isEnabled FROM itu_fest_modules ORDER BY display_order ASC, created_at ASC, id ASC'
    );
    res.json({ modules: rows });
  });

  router.post('/email-check', auth, emailCheckLimit, async (req, res) => {
    if (!req.user.email.toLowerCase().endsWith('@itu.edu.pk')) {
      throw new HttpError(403, 'Email checks are only available to ITU accounts.');
    }
    const address = validateEmail(req.body.email);
    const moduleId = uuid(req.body.moduleId);
    const db = getDb();
    const { rows } = await db.query(
      'SELECT 1 FROM user_accounts WHERE email = ? LIMIT 1',
      [address]
    );
    const { rows: modules } = await db.query(
      'SELECT is_enabled AS isEnabled FROM itu_fest_modules WHERE id = ?',
      [moduleId]
    );
    if (!modules.length || !modules[0].isEnabled) {
      throw new HttpError(403, 'This competition module is not currently accepting applications.');
    }
    const { rows: forms } = await db.query(
      'SELECT form_json FROM itu_fest_module_forms WHERE module_id = ?',
      [moduleId]
    );
    if (!forms.length) throw new HttpError(409, 'This competition form is not ready yet.');
    const form = parseForm(forms[0].form_json);
    const { rows: periods } = await db.query(
      'SELECT period_key FROM itu_fest_application_periods WHERE id = 1'
    );
    const periodKey = periods[0]?.period_key;
    const appliedEmails = periodKey
      ? await getAppliedModuleEmails(db, moduleId, periodKey, form)
      : new Set();
    res.json({
      exists: rows.length > 0,
      alreadyApplied: appliedEmails.has(address),
    });
  });

  router.get('/modules/:id/form', auth, async (req, res) => {
    const moduleId = uuid(req.params.id);
    const db = getDb();
    const [{ rows: modules }, { rows: forms }] = await Promise.all([
      db.query('SELECT id, name, is_enabled AS isEnabled FROM itu_fest_modules WHERE id = ?', [moduleId]),
      db.query('SELECT form_json FROM itu_fest_module_forms WHERE module_id = ?', [moduleId]),
    ]);
    if (!modules.length) throw new HttpError(404, 'Module not found.');
    if (!modules[0].isEnabled && !['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      throw new HttpError(403, 'This competition module is not currently accepting applications.');
    }
    res.json({
      module: modules[0],
      form: forms.length ? parseForm(forms[0].form_json) : null,
    });
  });

  router.put('/modules/:id/form', auth, admin, limit, async (req, res) => {
    const moduleId = uuid(req.params.id);
    const form = validateForm(req.body.form);
    const db = getDb();
    const { rows } = await db.query('SELECT id FROM itu_fest_modules WHERE id = ?', [moduleId]);
    if (!rows.length) throw new HttpError(404, 'Module not found.');
    await db.query(
      `INSERT INTO itu_fest_module_forms (module_id, form_json, updated_by)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE form_json = VALUES(form_json), updated_by = VALUES(updated_by)`,
      [moduleId, JSON.stringify(form), req.user.id]
    );
    res.json({ form });
  });

  router.get('/modules/:id/applications', auth, admin, async (req, res) => {
    const moduleId = uuid(req.params.id);
    const db = getDb();
    const { rows: modules } = await db.query(
      'SELECT id, name FROM itu_fest_modules WHERE id = ?',
      [moduleId]
    );
    if (!modules.length) throw new HttpError(404, 'Module not found.');
    const { rows: applicants } = await db.query(
      `SELECT a.id, a.module_name AS moduleName, a.answers, a.form_snapshot AS formSnapshot, a.created_at AS appliedAt,
              p.full_name AS applicantName, u.email AS applicantEmail
       FROM itu_fest_applications a
       JOIN user_profiles p ON p.id = a.user_id
       JOIN user_accounts u ON u.id = a.user_id
       WHERE a.module_id = ?
       ORDER BY a.created_at DESC
       LIMIT 1000`,
      [moduleId]
    );
    const { rows: forms } = await db.query(
      'SELECT form_json FROM itu_fest_module_forms WHERE module_id = ?',
      [moduleId]
    );
    res.json({
      module: modules[0],
      form: forms.length ? parseForm(forms[0].form_json) : null,
      applicants: applicants.map(applicant => ({
        ...applicant,
        answers: typeof applicant.answers === 'string'
          ? JSON.parse(applicant.answers)
          : applicant.answers || {},
        formSnapshot: applicant.formSnapshot
          ? parseForm(applicant.formSnapshot)
          : null,
      })),
    });
  });

  router.delete('/applications/:applicationId', auth, admin, limit, async (req, res) => {
    const applicationId = uuid(req.params.applicationId);
    const { rowCount } = await getDb().query(
      'DELETE FROM itu_fest_applications WHERE id = ?',
      [applicationId]
    );
    if (!rowCount) throw new HttpError(404, 'ITU Fest application not found.');
    res.json({ message: 'ITU Fest application deleted.' });
  });

  router.get('/applications/mine', auth, async (req, res) => {
    const { rows: periods } = await getDb().query('SELECT period_key FROM itu_fest_application_periods WHERE id = 1');
    const periodKey = periods[0]?.period_key;
    if (!periodKey) return res.json({ hasApplied: false });
    const { rows } = await getDb().query(
      'SELECT 1 FROM itu_fest_applications WHERE user_id = ? AND period_key = ? LIMIT 1',
      [req.user.id, periodKey]
    );
    res.json({ hasApplied: rows.length > 0 });
  });

  router.post('/applications', auth, applicationLimit, async (req, res) => {
    if (!req.user.email.toLowerCase().endsWith('@itu.edu.pk')) {
      throw new HttpError(403, 'ITU Fest applications are only available to ITU email addresses.');
    }
    const moduleId = uuid(req.body.moduleId);
    const db = getDb();
    const { rows: periodRows } = await db.query(
      `SELECT period_key,
              (start_at IS NOT NULL AND end_at IS NOT NULL
                AND UTC_TIMESTAMP() BETWEEN start_at AND end_at) AS isOpen
       FROM itu_fest_application_periods WHERE id = 1`
    );
    if (!periodRows[0]?.isOpen || !periodRows[0].period_key) {
      throw new HttpError(403, 'ITU Fest applications are currently closed.');
    }
    const { rows: modules } = await db.query(
      'SELECT id, name, is_enabled AS isEnabled FROM itu_fest_modules WHERE id = ?',
      [moduleId]
    );
    if (!modules.length) throw new HttpError(400, 'Choose an available competition module.');
    if (!modules[0].isEnabled) {
      throw new HttpError(403, 'This competition module is not currently accepting applications.');
    }
    const { rows: forms } = await db.query(
      'SELECT form_json FROM itu_fest_module_forms WHERE module_id = ?',
      [moduleId]
    );
    if (!forms.length) throw new HttpError(409, 'This competition form is not ready yet.');
    const form = parseForm(forms[0].form_json);
    const { answers: validatedAnswers, visibleQuestionIds } = validateAnswers(form, req.body.answers);
    const answers = { ...validatedAnswers };
    const emailQuestions = form.sections
      .flatMap(section => section.questions)
      .filter(question => question.type === 'email');
    const lockedAccountEmailQuestion = emailQuestions.length > 1 ? emailQuestions[0] : null;
    if (lockedAccountEmailQuestion && visibleQuestionIds.has(lockedAccountEmailQuestion.id)) {
      const accountEmail = validateEmail(req.user.email);
      const submittedAccountEmail = answers[lockedAccountEmailQuestion.id];
      if (submittedAccountEmail !== undefined && submittedAccountEmail !== accountEmail) {
        throw new HttpError(400, 'The first email answer must match your signed-in ACM account.');
      }
      answers[lockedAccountEmailQuestion.id] = accountEmail;
    }
    const submittedEmails = form.sections
      .flatMap(section => section.questions)
      .filter(question => question.type === 'email' && answers[question.id])
      .map(question => answers[question.id]);
    if (submittedEmails.length) {
      const placeholders = submittedEmails.map(() => '?').join(', ');
      const { rows: registeredEmails } = await db.query(
        `SELECT email FROM user_accounts WHERE email IN (${placeholders})`,
        submittedEmails
      );
      const registered = new Set(registeredEmails.map(row => row.email.toLowerCase()));
      for (const address of submittedEmails) {
        if (!registered.has(address)) {
          throw new HttpError(400, 'Enter an email address that has an account on this ACM website.');
        }
      }
    }

    const id = randomUUID();
    await inTransaction(db, async tx => {
      const { rows: periods } = await tx.query(
        `SELECT period_key,
                (start_at IS NOT NULL AND end_at IS NOT NULL
                  AND UTC_TIMESTAMP() BETWEEN start_at AND end_at) AS isOpen
         FROM itu_fest_application_periods WHERE id = 1 FOR UPDATE`
      );
      const periodKey = periodRows[0].period_key;
      if (!periods[0]?.isOpen || periods[0].period_key !== periodKey) {
        throw new HttpError(403, 'ITU Fest applications are currently closed.');
      }
      const { rows: existing } = await tx.query(
        'SELECT id FROM itu_fest_applications WHERE user_id = ? AND module_id = ? AND period_key = ? LIMIT 1',
        [req.user.id, modules[0].id, periodKey]
      );
      if (existing.length) {
        throw new HttpError(409, 'You or a teammate have already applied to this module.');
      }
      await tx.query('SELECT id FROM itu_fest_modules WHERE id = ? FOR UPDATE', [modules[0].id]);
      const previousModuleEmails = await getAppliedModuleEmails(tx, modules[0].id, periodKey, form);
      if (submittedEmails.some(address => previousModuleEmails.has(address))) {
        throw new HttpError(409, 'One or more team members have already applied to this module.');
      }
      await tx.query(
        `INSERT INTO itu_fest_applications
          (id, user_id, module_id, period_key, module_name, answers, form_snapshot)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, req.user.id, modules[0].id, periodKey, modules[0].name, JSON.stringify(answers), JSON.stringify(form)]
      );
    });
    res.status(201).json({ id, message: 'Your ITU Fest application has been submitted.' });
  });

  router.post(
    '/form-photo',
    auth,
    rateLimit(database, env, 'itu-fest-form-photo', 10),
    async (req, res) => {
      if (!req.user.email.toLowerCase().endsWith('@itu.edu.pk')) {
        throw new HttpError(403, 'ITU Fest photo attachments are only available to ITU email addresses.');
      }
      const contentType = req.get('content-type')?.split(';', 1)[0].trim().toLowerCase();
      const imageTypes = {
        'image/jpeg': {
          extension: 'jpg',
          matches: buffer => buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
        },
        'image/png': {
          extension: 'png',
          matches: buffer => buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
        },
        'image/webp': {
          extension: 'webp',
          matches: buffer => buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP',
        },
      };
      const imageType = imageTypes[contentType];
      if (!imageType || !Buffer.isBuffer(req.body) || req.body.length === 0 || !imageType.matches(req.body)) {
        throw new HttpError(400, 'Upload a valid JPEG, PNG, or WebP photo.');
      }
      const photoUrl = await uploadFile(
        req.body,
        `${randomUUID()}.${imageType.extension}`,
        '/Events/FormResponses',
        env
      );
      res.json({ photoUrl });
    }
  );

  router.post('/modules', auth, admin, limit, async (req, res) => {
    const db = getDb();
    const name = text(req.body.name, 'Module name', 120, 1);
    const imageUrl = safeUrl(req.body.imageUrl, 'Module image URL', 2048);
    const id = randomUUID();
    const { rows: last } = await db.query('SELECT MAX(display_order) AS mx FROM itu_fest_modules');
    const displayOrder = (last[0]?.mx ?? 0) + 1;
    await db.query(
      'INSERT INTO itu_fest_modules (id, name, image_url, display_order) VALUES (?, ?, ?, ?)',
      [id, name, imageUrl, displayOrder]
    );
    res.status(201).json({ id, name, image_url: imageUrl, display_order: displayOrder, isEnabled: true });
  });

  router.patch('/modules/:id', auth, admin, limit, async (req, res) => {
    const db = getDb();
    const id = uuid(req.params.id);
    const name = text(req.body.name, 'Module name', 120, 1);
    const imageUrl = safeUrl(req.body.imageUrl, 'Module image URL', 2048);
    const { rows } = await db.query('SELECT id FROM itu_fest_modules WHERE id = ?', [id]);
    if (!rows.length) throw new HttpError(404, 'Module not found.');
    await db.query('UPDATE itu_fest_modules SET name = ?, image_url = ? WHERE id = ?', [name, imageUrl, id]);
    const { rows: updated } = await db.query(
      'SELECT id, name, image_url, display_order, is_enabled AS isEnabled FROM itu_fest_modules WHERE id = ?',
      [id]
    );
    res.json(updated[0]);
  });

  router.patch('/modules/:id/availability', auth, admin, limit, async (req, res) => {
    const id = uuid(req.params.id);
    if (typeof req.body.isEnabled !== 'boolean') {
      throw new HttpError(400, 'Module availability must be enabled or disabled.');
    }
    const { rowCount } = await getDb().query(
      'UPDATE itu_fest_modules SET is_enabled = ? WHERE id = ?',
      [req.body.isEnabled ? 1 : 0, id]
    );
    if (!rowCount) throw new HttpError(404, 'Module not found.');
    res.json({ id, isEnabled: req.body.isEnabled });
  });

  router.delete('/modules/:id', auth, admin, limit, async (req, res) => {
    const { rowCount } = await getDb().query(
      'DELETE FROM itu_fest_modules WHERE id = ?',
      [uuid(req.params.id)]
    );
    if (!rowCount) throw new HttpError(404, 'Module not found.');
    res.json({ message: 'Module deleted.' });
  });

  return router;
}

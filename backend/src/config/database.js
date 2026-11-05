import mysql from 'mysql2/promise';

export function databaseOptions(env = process.env) {
  if (!env.DATABASE_URL && !env.MYSQL_HOST && !env.MYSQL_DATABASE) {
    throw new Error('DATABASE_URL is not configured');
  }

  let connectionConfig;

  if (env.DATABASE_URL) {
    try {
      const url = new URL(env.DATABASE_URL);
      if (!['mysql:', 'mysql2:'].includes(url.protocol) || !url.hostname) {
        throw new Error('DATABASE_URL must be a MySQL connection URL');
      }
      if ([...url.searchParams.keys()].some(key => key.toLowerCase().includes('ssl'))) {
        throw new Error('Configure database TLS using MYSQL_SSL');
      }
      const sslMode = env.MYSQL_SSL || 'verify-full';
      const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
      if (sslMode === 'disable' && (!local || env.NODE_ENV === 'production' || env.VERCEL)) {
        throw new Error('Database TLS may only be disabled for local development');
      }
      connectionConfig = {
        uri: env.DATABASE_URL,
        ssl: sslMode === 'disable' ? false : { rejectUnauthorized: true },
      };
    } catch (err) {
      if (err.message.includes('TLS') || err.message.includes('MySQL')) throw err;
      throw new Error('DATABASE_URL is invalid', { cause: err });
    }
  } else {
    const host = env.MYSQL_HOST || '127.0.0.1';
    const port = Number(env.MYSQL_PORT) || 3306;
    const user = env.MYSQL_USER || 'root';
    const password = env.MYSQL_PASSWORD || '';
    const database = env.MYSQL_DATABASE || 'acm_itu_db';
    const sslMode = env.MYSQL_SSL || 'verify-full';

    const local = ['localhost', '127.0.0.1', '[::1]'].includes(host);
    if (sslMode === 'disable' && (!local || env.NODE_ENV === 'production' || env.VERCEL)) {
      throw new Error('Database TLS may only be disabled for local development');
    }

    connectionConfig = {
      host,
      port,
      user,
      password,
      database,
      ssl: sslMode === 'disable' ? false : { rejectUnauthorized: true },
    };
  }

  return {
    ...connectionConfig,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  };
}

let pool;
let wrappedDb;
let schemaReady;

/** Normalise a mysql2 result into the { rows, rowCount } shape the app uses. */
function toResult(rows) {
  return Array.isArray(rows)
    ? { rows, rowCount: rows.length }
    : { rows: [], rowCount: rows.affectedRows || 0 };
}

function runQuery(executor, sql, params) {
  // Statement text is passed through untouched. The previous `$n` → `?` and
  // `app.`/`auth.` prefix rewrites corrupted any literal containing them.
  return executor.query(sql, params).then(([rows]) => toResult(rows));
}

async function columnExists(table, column) {
  const [rows] = await pool.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ? LIMIT 1`,
    [table, column]
  );
  return rows.length > 0;
}

/** CREATE INDEX has no IF NOT EXISTS on MySQL, so check first. */
async function ensureIndex(table, indexName, columns) {
  try {
    const [rows] = await pool.query(
      `SELECT 1 FROM information_schema.statistics
       WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ? LIMIT 1`,
      [table, indexName]
    );
    if (!rows.length) await pool.query(`CREATE INDEX ${indexName} ON ${table} (${columns})`);
  } catch (error) {
    console.warn(`Could not ensure index ${indexName} on ${table}:`, error?.message || error);
  }
}

/**
 * One-time bootstrap for databases provisioned before the current schema.sql.
 * It runs once per process, when the pool is created — never on a request, so a
 * database user without DDL rights is not a hard failure for every endpoint.
 */
async function ensureSchema() {
  if (!pool) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sub_teams (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      display_order INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  if (!(await columnExists('sub_teams', 'display_order'))) {
    await pool.query('ALTER TABLE sub_teams ADD COLUMN display_order INT NOT NULL DEFAULT 0 AFTER name');
  }
  if (!(await columnExists('sub_teams', 'responsibilities'))) {
    await pool.query('ALTER TABLE sub_teams ADD COLUMN responsibilities TEXT DEFAULT NULL AFTER name');
  }
  if (!(await columnExists('sub_teams', 'updated_at'))) {
    await pool.query('ALTER TABLE sub_teams ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at');
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sub_team_members (
      id VARCHAR(36) PRIMARY KEY,
      team_id VARCHAR(36) NOT NULL,
      member_name VARCHAR(160) NOT NULL DEFAULT '',
      member_email VARCHAR(255) NOT NULL DEFAULT '',
      member_phone VARCHAR(50) NOT NULL DEFAULT '',
      member_bio TEXT NOT NULL DEFAULT '',
      member_photo VARCHAR(2048) NOT NULL DEFAULT '',
      position VARCHAR(32) NOT NULL DEFAULT 'MEMBER',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_sub_team_members_team
        FOREIGN KEY (team_id) REFERENCES sub_teams(id) ON DELETE CASCADE,
      INDEX idx_sub_team_members_team (team_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS recruitment_periods (
      id TINYINT PRIMARY KEY,
      period_key VARCHAR(36) DEFAULT NULL,
      start_at DATETIME DEFAULT NULL,
      end_at DATETIME DEFAULT NULL,
      updated_by VARCHAR(36) DEFAULT NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_recruitment_period_updated_by
        FOREIGN KEY (updated_by) REFERENCES user_profiles(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  await pool.query('INSERT IGNORE INTO recruitment_periods (id) VALUES (1)');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS recruitment_applications (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      team_id VARCHAR(36) DEFAULT NULL,
      period_key VARCHAR(36) DEFAULT NULL,
      team_name VARCHAR(120) NOT NULL,
      reason VARCHAR(500) NOT NULL,
      commitment VARCHAR(32) NOT NULL,
      agreed_commit_time TINYINT(1) NOT NULL,
      agreed_attend_events TINYINT(1) NOT NULL,
      agreed_professional_conduct TINYINT(1) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_recruitment_application_user
        FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE,
      CONSTRAINT fk_recruitment_application_team
        FOREIGN KEY (team_id) REFERENCES sub_teams(id) ON DELETE SET NULL,
      INDEX idx_recruitment_applications_created (created_at),
      INDEX idx_recruitment_applications_team (team_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  if (!(await columnExists('recruitment_periods', 'period_key'))) {
    await pool.query('ALTER TABLE recruitment_periods ADD COLUMN period_key VARCHAR(36) DEFAULT NULL AFTER id');
  }
  if (!(await columnExists('recruitment_applications', 'period_key'))) {
    await pool.query('ALTER TABLE recruitment_applications ADD COLUMN period_key VARCHAR(36) DEFAULT NULL AFTER team_id');
  }
  await ensureIndex('recruitment_applications', 'idx_recruitment_applications_user', 'user_id');
  const [legacyRecruitmentCycleIndex] = await pool.query(
    `SELECT 1 FROM information_schema.statistics
     WHERE table_schema = DATABASE() AND table_name = 'recruitment_applications'
       AND index_name = 'uq_recruitment_application_cycle' LIMIT 1`
  );
  if (legacyRecruitmentCycleIndex.length) {
    await pool.query('ALTER TABLE recruitment_applications DROP INDEX uq_recruitment_application_cycle');
  }
  await pool.query(
    `UPDATE recruitment_periods SET period_key = UUID()
     WHERE id = 1 AND period_key IS NULL
       AND EXISTS (SELECT 1 FROM recruitment_applications)`
  );
  await pool.query(
    `UPDATE recruitment_applications
     SET period_key = (SELECT period_key FROM recruitment_periods WHERE id = 1)
     WHERE period_key IS NULL
       AND EXISTS (SELECT 1 FROM recruitment_periods WHERE id = 1 AND period_key IS NOT NULL)`
  );
  if (!(await columnExists('sub_team_members', 'position'))) {
    await pool.query("ALTER TABLE sub_team_members ADD COLUMN position VARCHAR(32) NOT NULL DEFAULT 'MEMBER' AFTER member_photo");
  }

  // Signups awaiting verification used to live in process memory.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pending_signups (
      email VARCHAR(255) PRIMARY KEY,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(160) NOT NULL,
      university VARCHAR(255) NOT NULL DEFAULT '',
      phone VARCHAR(50) NOT NULL DEFAULT '',
      code_hash VARCHAR(64) NOT NULL,
      attempts INT NOT NULL DEFAULT 0,
      expires_at DATETIME NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_pending_signups_expiry (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Brute-force protection for password-reset codes.
  if (!(await columnExists('user_accounts', 'recovery_attempts'))) {
    await pool.query('ALTER TABLE user_accounts ADD COLUMN recovery_attempts INT NOT NULL DEFAULT 0 AFTER recovery_expires_at');
  }
  if (!(await columnExists('user_profiles', 'profile_photo'))) {
    await pool.query("ALTER TABLE user_profiles ADD COLUMN profile_photo VARCHAR(2048) NOT NULL DEFAULT '' AFTER phone");
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS profile_photo_changes (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE,
      INDEX idx_profile_photo_changes_user_time (user_id, changed_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      github_url VARCHAR(2048) NOT NULL,
      image_url VARCHAR(2048) NOT NULL DEFAULT '',
      display_order INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sponsors (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      image_url VARCHAR(2048) NOT NULL,
      display_order INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS itu_fest_modules (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      image_url VARCHAR(2048) NOT NULL DEFAULT '',
      is_enabled TINYINT(1) NOT NULL DEFAULT 1,
      display_order INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_itu_fest_modules_order (display_order, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  if (!(await columnExists('itu_fest_modules', 'image_url'))) {
    await pool.query("ALTER TABLE itu_fest_modules ADD COLUMN image_url VARCHAR(2048) NOT NULL DEFAULT '' AFTER name");
  }
  if (!(await columnExists('itu_fest_modules', 'is_enabled'))) {
    await pool.query('ALTER TABLE itu_fest_modules ADD COLUMN is_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER image_url');
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS itu_fest_application_periods (
      id TINYINT PRIMARY KEY,
      period_key VARCHAR(36) DEFAULT NULL,
      start_at DATETIME DEFAULT NULL,
      end_at DATETIME DEFAULT NULL,
      updated_by VARCHAR(36) DEFAULT NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_itu_fest_period_updated_by
        FOREIGN KEY (updated_by) REFERENCES user_profiles(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  await pool.query('INSERT IGNORE INTO itu_fest_application_periods (id) VALUES (1)');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS itu_fest_applications (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      module_id VARCHAR(36) DEFAULT NULL,
      period_key VARCHAR(36) NOT NULL,
      module_name VARCHAR(120) NOT NULL,
      answers JSON DEFAULT NULL,
      form_snapshot JSON DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_itu_fest_application_user
        FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE,
      CONSTRAINT fk_itu_fest_application_module
        FOREIGN KEY (module_id) REFERENCES itu_fest_modules(id) ON DELETE SET NULL,
      UNIQUE KEY uq_itu_fest_user_module_cycle (user_id, module_id, period_key),
      INDEX idx_itu_fest_applications_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  const [legacyFestApplicationIndex] = await pool.query(
    `SELECT 1 FROM information_schema.statistics
     WHERE table_schema = DATABASE() AND table_name = 'itu_fest_applications'
       AND index_name = 'uq_itu_fest_application_cycle' LIMIT 1`
  );
  if (legacyFestApplicationIndex.length) {
    await pool.query('ALTER TABLE itu_fest_applications DROP INDEX uq_itu_fest_application_cycle');
  }
  const [festModuleApplicationIndex] = await pool.query(
    `SELECT 1 FROM information_schema.statistics
     WHERE table_schema = DATABASE() AND table_name = 'itu_fest_applications'
       AND index_name = 'uq_itu_fest_user_module_cycle' LIMIT 1`
  );
  if (!festModuleApplicationIndex.length) {
    await pool.query(
      'ALTER TABLE itu_fest_applications ADD UNIQUE KEY uq_itu_fest_user_module_cycle (user_id, module_id, period_key)'
    );
  }
  await ensureIndex(
    'itu_fest_applications',
    'idx_itu_fest_applications_module_period',
    'module_id, period_key'
  );
  if (!(await columnExists('itu_fest_applications', 'answers'))) {
    await pool.query('ALTER TABLE itu_fest_applications ADD COLUMN answers JSON DEFAULT NULL AFTER module_name');
  }
  if (!(await columnExists('itu_fest_applications', 'form_snapshot'))) {
    await pool.query('ALTER TABLE itu_fest_applications ADD COLUMN form_snapshot JSON DEFAULT NULL AFTER answers');
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS itu_fest_module_forms (
      module_id VARCHAR(36) PRIMARY KEY,
      form_json JSON NOT NULL,
      updated_by VARCHAR(36) DEFAULT NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_itu_fest_form_module
        FOREIGN KEY (module_id) REFERENCES itu_fest_modules(id) ON DELETE CASCADE,
      CONSTRAINT fk_itu_fest_form_updated_by
        FOREIGN KEY (updated_by) REFERENCES user_profiles(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS project_contributors (
      id VARCHAR(36) PRIMARY KEY,
      project_id VARCHAR(36) NOT NULL,
      user_id VARCHAR(36) NOT NULL,
      added_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_proj_user (project_id, user_id),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  const superAdminId = '00000000-0000-4000-8000-000000000001';
  const superAdminEmail = 'association.computingmachinery@itu.edu.pk';
  const [superAdminEmailConflict] = await pool.query(
    'SELECT id FROM user_accounts WHERE email = ? AND id != ? LIMIT 1',
    [superAdminEmail, superAdminId]
  );
  if (superAdminEmailConflict.length) {
    throw new Error('Cannot update the permanent super admin email because the new email is already in use.');
  }
  await pool.query('UPDATE user_accounts SET email = ? WHERE id = ?', [superAdminEmail, superAdminId]);

  // member_email is the join key against user_accounts in the admin queries and
  // the collation is already case-insensitive, so these are plain column indexes.
  await ensureIndex('core_team', 'idx_core_team_email', 'member_email');
  await ensureIndex('sub_team_members', 'idx_sub_team_members_email', 'member_email');
  await ensureIndex('other_members', 'idx_other_members_email', 'member_email');

  if (!(await columnExists('other_members', 'member_position'))) {
    await pool.query("ALTER TABLE other_members ADD COLUMN member_position VARCHAR(100) NOT NULL DEFAULT '' AFTER member_phone");
  }

  const [capsuleMigration] = await pool.query(
    'SELECT version FROM database_migrations WHERE version = ?',
    ['002_member_capsules']
  );
  if (!capsuleMigration.length) {
    await pool.query("UPDATE other_members SET member_bio = ''");
    await pool.query("UPDATE sub_team_members SET member_bio = ''");
    await pool.query(
      'INSERT INTO database_migrations (version) VALUES (?)',
      ['002_member_capsules']
    );
  }

  await pool.query(`
    INSERT INTO core_team (position_key, position_label, position_order) VALUES
      ('chair', 'Chair', 1),
      ('vice_chair', 'Vice Chair', 2),
      ('vice_chair_f', 'Vice Chair (Female)', 3),
      ('event_head', 'Event Head', 4),
      ('gen_secretary', 'General Secretary', 5),
      ('treasurer', 'Treasurer', 6)
    ON DUPLICATE KEY UPDATE
      position_label = VALUES(position_label),
      position_order = VALUES(position_order)
  `);
}

export function getDatabase() {
  if (!pool) {
    // Pass the whole config object, never the bare URI string: mysql2 merges
    // an `uri` option into the connection options (connection_config.js), so
    // `ssl` and the pool limits survive. `createPool(options.uri)` parses only
    // the URL query parameters and would silently drop TLS entirely.
    pool = mysql.createPool(databaseOptions());

    // Kicked off once, at pool creation. Requests only await the result.
    schemaReady = ensureSchema().catch((error) => {
      console.error('Database schema bootstrap failed:', error?.message || error);
    });

    wrappedDb = {
      async query(sql, params = []) {
        await schemaReady;
        return runQuery(pool, sql, params);
      },
      /** Run `fn` against a dedicated connection inside one transaction. */
      async transaction(fn) {
        await schemaReady;
        const connection = await pool.getConnection();
        try {
          await connection.beginTransaction();
          const result = await fn({ query: (sql, params = []) => runQuery(connection, sql, params) });
          await connection.commit();
          return result;
        } catch (error) {
          try { await connection.rollback(); } catch { /* connection is already unusable */ }
          throw error;
        } finally {
          connection.release();
        }
      },
      async end() {
        if (pool) {
          await pool.end();
          pool = undefined;
          wrappedDb = undefined;
          schemaReady = undefined;
        }
      },
    };
  }
  return wrappedDb;
}

/**
 * Run `fn` inside a single transaction when the handle supports it, and fall
 * back to the plain handle otherwise (injected/fake databases in tests).
 */
export function inTransaction(db, fn) {
  return typeof db?.transaction === 'function' ? db.transaction(fn) : fn(db);
}

const REQUIRED_TABLES = [
  'database_migrations', 'user_accounts', 'user_profiles', 'profile_photo_changes', 'pending_signups', 'chapter_team_members',
  'user_auth_sessions', 'security_rate_limits', 'audit_role_changes', 'chapter_settings',
  'recruitment_periods', 'recruitment_applications',
  'core_team', 'other_members', 'sub_teams', 'sub_team_members', 'projects', 'project_contributors',
  'itu_fest_modules', 'itu_fest_application_periods', 'itu_fest_applications', 'itu_fest_module_forms',
];

export async function checkDatabase() {
  const db = getDatabase();
  const migration = await db.query(
    'SELECT version FROM database_migrations WHERE version = ?',
    ['001_mysql_schema']
  );
  if (migration.rowCount !== 1) {
    throw new Error('Database migration is not applied');
  }

  // The migration row says nothing about the tables this code actually reads,
  // so verify them: readiness must fail when the schema is incomplete.
  const placeholders = REQUIRED_TABLES.map(() => '?').join(', ');
  const { rows } = await db.query(
    `SELECT table_name AS name FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name IN (${placeholders})`,
    REQUIRED_TABLES
  );
  const present = new Set(rows.map((row) => String(row.name).toLowerCase()));
  const missing = REQUIRED_TABLES.filter((table) => !present.has(table));
  if (missing.length) {
    throw new Error(`Database schema is incomplete — missing: ${missing.join(', ')}`);
  }
}

export async function closeDatabase() {
  if (wrappedDb) {
    await wrappedDb.end();
  }
}

-- ACM ITU Website MySQL Database Schema (XAMPP / MySQL Compatible)

CREATE DATABASE IF NOT EXISTS acm_itu_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE acm_itu_db;

CREATE TABLE IF NOT EXISTS database_migrations (
  version VARCHAR(255) PRIMARY KEY,
  applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_accounts (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  recovery_code VARCHAR(64) DEFAULT NULL,
  recovery_expires_at DATETIME DEFAULT NULL,
  recovery_attempts INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Signups awaiting email verification. Persisted (not in-process memory) so a
-- restart or a second instance can still verify a code that was just emailed.
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

CREATE TABLE IF NOT EXISTS user_profiles (
  id VARCHAR(36) PRIMARY KEY,
  full_name VARCHAR(160) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'USER',
  university VARCHAR(255) NOT NULL DEFAULT '',
  phone VARCHAR(50) NOT NULL DEFAULT '',
  profile_photo VARCHAR(2048) NOT NULL DEFAULT '',
  terms_accepted_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (id) REFERENCES user_accounts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS profile_photo_changes (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE,
  INDEX idx_profile_photo_changes_user_time (user_id, changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chapter_team_members (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) DEFAULT NULL,
  name VARCHAR(160) NOT NULL,
  role VARCHAR(120) NOT NULL,
  group_name VARCHAR(120) NOT NULL,
  hierarchy_order INT NOT NULL DEFAULT 0,
  display_order INT NOT NULL DEFAULT 0,
  is_lead TINYINT(1) NOT NULL DEFAULT 0,
  photo_url VARCHAR(2048) DEFAULT NULL,
  bio TEXT DEFAULT NULL,
  department VARCHAR(160) DEFAULT NULL,
  tenure VARCHAR(80) DEFAULT NULL,
  published_at DATETIME DEFAULT NULL,
  archived_at DATETIME DEFAULT NULL,
  version INT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE SET NULL,
  INDEX idx_chapter_team_public (hierarchy_order, display_order, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_auth_sessions (
  token_hash VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  credential_version VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE,
  INDEX idx_auth_sessions_user (user_id),
  INDEX idx_auth_sessions_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS security_rate_limits (
  `key` VARCHAR(255) PRIMARY KEY,
  count INT NOT NULL,
  expires_at DATETIME NOT NULL,
  INDEX idx_rate_limits_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_role_changes (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  actor_id VARCHAR(36) DEFAULT NULL,
  subject_id VARCHAR(36) DEFAULT NULL,
  old_role VARCHAR(50) NOT NULL,
  new_role VARCHAR(50) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (actor_id) REFERENCES user_profiles(id) ON DELETE SET NULL,
  FOREIGN KEY (subject_id) REFERENCES user_profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Single source of the default logo: keep in sync with the LOGO constant in
-- backend/src/routes/settings.js (this file previously had two more values).
CREATE TABLE IF NOT EXISTS chapter_settings (
  id INT PRIMARY KEY DEFAULT 1,
  society_name VARCHAR(255) NOT NULL DEFAULT 'Association for Computing Machinery',
  location VARCHAR(255) NOT NULL DEFAULT 'Information Technology University, Lahore',
  logo_url VARCHAR(2048) NOT NULL DEFAULT 'https://ik.imagekit.io/acmitu/Others/ACM_logo_t6VesqNX4.png',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO chapter_settings (id, society_name, location, logo_url)
VALUES (1, 'Association for Computing Machinery', 'Information Technology University, Lahore', 'https://ik.imagekit.io/acmitu/Others/ACM_logo_t6VesqNX4.png');

INSERT IGNORE INTO database_migrations (version) VALUES ('001_mysql_schema');

CREATE TABLE IF NOT EXISTS core_team (
  position_key VARCHAR(50) PRIMARY KEY,
  position_label VARCHAR(100) NOT NULL,
  position_order INT NOT NULL,
  member_name VARCHAR(160) NOT NULL DEFAULT '',
  member_email VARCHAR(255) NOT NULL DEFAULT '',
  member_phone VARCHAR(50) NOT NULL DEFAULT '',
  member_bio TEXT NOT NULL DEFAULT '',
  member_photo VARCHAR(2048) NOT NULL DEFAULT '',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_core_team_email (member_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO core_team (position_key, position_label, position_order) VALUES
  ('chair',          'Chair',               1),
  ('vice_chair',     'Vice Chair',          2),
  ('vice_chair_f',   'Vice Chair (Female)', 3),
  ('event_head',     'Event Head',          4),
  ('gen_secretary',  'General Secretary',   5),
  ('treasurer',      'Treasurer',           6)
ON DUPLICATE KEY UPDATE
  position_label = VALUES(position_label),
  position_order = VALUES(position_order);

-- Other Members table (archived former core-team and sub-team members)
CREATE TABLE IF NOT EXISTS other_members (
  id VARCHAR(36) PRIMARY KEY,
  member_name VARCHAR(160) NOT NULL DEFAULT '',
  member_email VARCHAR(255) NOT NULL DEFAULT '',
  member_phone VARCHAR(50) NOT NULL DEFAULT '',
  member_position VARCHAR(100) NOT NULL DEFAULT '',
  member_bio TEXT NOT NULL DEFAULT '',
  member_photo VARCHAR(2048) NOT NULL DEFAULT '',
  added_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_other_members_email (member_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sub_teams (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  responsibilities TEXT DEFAULT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  INDEX idx_sub_team_members_team (team_id),
  INDEX idx_sub_team_members_email (member_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

INSERT IGNORE INTO recruitment_periods (id) VALUES (1);

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

-- NOTE: the previous version of this file used
--   ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...
-- which is MariaDB-only syntax and aborts the script on MySQL 8 (silently
-- skipping every object below it). The columns are in the CREATE TABLE above,
-- so the statement is gone. config/database.js still back-fills old databases.

UPDATE user_accounts
SET email = 'association.computingmachinery@itu.edu.pk'
WHERE id = '00000000-0000-4000-8000-000000000001';

INSERT IGNORE INTO user_accounts (id, email, password_hash)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'association.computingmachinery@itu.edu.pk',
  '$2b$10$Iyrtyo9NgB.UJStJZ55D7uUvQ0yJ91z3qeHWeZw.fO1u0Y3D7H/P6'
);

INSERT IGNORE INTO user_profiles (id, full_name, role, university, phone)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'Super Admin',
  'SUPER_ADMIN',
  'Information Technology University',
  ''
);

-- Triggers for Permanent Protection
-- MySQL has no CREATE TRIGGER IF NOT EXISTS (that is MariaDB syntax), so the
-- portable idempotent form is DROP IF EXISTS followed by CREATE.
DELIMITER //

DROP TRIGGER IF EXISTS prevent_permanent_admin_delete//
CREATE TRIGGER prevent_permanent_admin_delete
BEFORE DELETE ON user_accounts
FOR EACH ROW
BEGIN
  IF OLD.id = '00000000-0000-4000-8000-000000000001' THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Permanent super admin account cannot be deleted.';
  END IF;
END//

DROP TRIGGER IF EXISTS prevent_permanent_admin_profile_delete//
CREATE TRIGGER prevent_permanent_admin_profile_delete
BEFORE DELETE ON user_profiles
FOR EACH ROW
BEGIN
  IF OLD.id = '00000000-0000-4000-8000-000000000001' THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Permanent super admin profile cannot be deleted.';
  END IF;
END//

DROP TRIGGER IF EXISTS prevent_permanent_admin_demote//
CREATE TRIGGER prevent_permanent_admin_demote
BEFORE UPDATE ON user_profiles
FOR EACH ROW
BEGIN
  IF OLD.id = '00000000-0000-4000-8000-000000000001' AND NEW.role != 'SUPER_ADMIN' THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Permanent super admin role cannot be modified.';
  END IF;
END//

DELIMITER ;

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  github_url VARCHAR(2048) NOT NULL,
  image_url VARCHAR(2048) NOT NULL DEFAULT '',
  display_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sponsors (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  image_url VARCHAR(2048) NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

INSERT IGNORE INTO itu_fest_application_periods (id) VALUES (1);

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
  INDEX idx_itu_fest_applications_module_period (module_id, period_key),
  INDEX idx_itu_fest_applications_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

-- Project contributors (previously created only at runtime by the API).
CREATE TABLE IF NOT EXISTS project_contributors (
  id VARCHAR(36) PRIMARY KEY,
  project_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  added_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_proj_user (project_id, user_id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

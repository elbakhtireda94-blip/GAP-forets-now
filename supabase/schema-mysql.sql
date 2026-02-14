-- =============================================
-- ANEF Field Connect — GAP Forêts
-- Database schema for MySQL 8.0+
-- Converted from PostgreSQL/Supabase schema
-- =============================================
-- Note: MySQL has no Row Level Security (RLS).
-- Enforce permissions in your application layer.
-- For triggers that set created_by/validated_by, set session variable: SET @current_user_id = 'uuid';
-- =============================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS anef_field_connect CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE anef_field_connect;

-- =============================================
-- USERS (replaces Supabase auth.users for FK reference)
-- =============================================
CREATE TABLE users (
  id CHAR(36) NOT NULL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
);

-- =============================================
-- TABLES (reference first, then dependent)
-- =============================================

-- regions
CREATE TABLE regions (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255) DEFAULT NULL,
  code VARCHAR(50) DEFAULT NULL UNIQUE,
  area_km2 DECIMAL(12,2) DEFAULT NULL,
  population INT DEFAULT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
);

-- dranef
CREATE TABLE dranef (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  region_id VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) DEFAULT NULL UNIQUE,
  address TEXT,
  phone VARCHAR(50) DEFAULT NULL,
  email VARCHAR(255) DEFAULT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_dranef_region FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE CASCADE
);

-- dpanef
CREATE TABLE dpanef (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  dranef_id VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) DEFAULT NULL UNIQUE,
  address TEXT,
  phone VARCHAR(50) DEFAULT NULL,
  email VARCHAR(255) DEFAULT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_dpanef_dranef FOREIGN KEY (dranef_id) REFERENCES dranef(id) ON DELETE CASCADE
);

-- communes
CREATE TABLE communes (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  dpanef_id VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255) DEFAULT NULL,
  code VARCHAR(50) DEFAULT NULL,
  area_km2 DECIMAL(12,2) DEFAULT NULL,
  population INT DEFAULT NULL,
  latitude DOUBLE DEFAULT NULL,
  longitude DOUBLE DEFAULT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_communes_dpanef FOREIGN KEY (dpanef_id) REFERENCES dpanef(id) ON DELETE CASCADE
);

-- profiles
CREATE TABLE profiles (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role_label VARCHAR(100) DEFAULT NULL,
  phone VARCHAR(50) DEFAULT NULL,
  avatar_url TEXT,
  dranef_id VARCHAR(50) DEFAULT NULL,
  dpanef_id VARCHAR(50) DEFAULT NULL,
  commune_ids JSON DEFAULT NULL COMMENT 'Array of commune ids as JSON',
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- user_roles
CREATE TABLE user_roles (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  role ENUM('ADMIN','NATIONAL','REGIONAL','PROVINCIAL','LOCAL') NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  created_by CHAR(36) DEFAULT NULL,
  UNIQUE KEY uq_user_role (user_id, role),
  CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_roles_created_by FOREIGN KEY (created_by) REFERENCES users(id)
);

-- cahier_journal_entries
CREATE TABLE cahier_journal_entries (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  entry_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category ENUM('reunion','animation','mediation','diagnostic','suivi_chantier','sensibilisation','autre','animation_territoriale','suivi_pdfcp','organisation_usagers','partenariats','activite_admin') DEFAULT NULL,
  location_text TEXT,
  latitude DOUBLE DEFAULT NULL,
  longitude DOUBLE DEFAULT NULL,
  pdfcp_id VARCHAR(50) DEFAULT NULL,
  dranef_id VARCHAR(50) NOT NULL,
  dpanef_id VARCHAR(50) NOT NULL,
  commune_id VARCHAR(50) DEFAULT NULL,
  adp_user_id VARCHAR(50) NOT NULL,
  user_id CHAR(36) DEFAULT NULL,
  attachments JSON DEFAULT NULL,
  statut_validation VARCHAR(50) DEFAULT 'Brouillon',
  participants_count INT DEFAULT NULL,
  organisations_concernees JSON DEFAULT NULL,
  temps_passe_min INT DEFAULT NULL,
  priorite VARCHAR(50) DEFAULT 'Moyenne',
  resultats_obtenus TEXT,
  decisions_prises TEXT,
  prochaines_etapes TEXT,
  contraintes_rencontrees TEXT,
  besoin_appui_hierarchique TINYINT(1) DEFAULT 0,
  justification_appui TEXT,
  perimetre_label VARCHAR(255) DEFAULT NULL,
  site_label VARCHAR(255) DEFAULT NULL,
  validated_by CHAR(36) DEFAULT NULL,
  validated_at DATETIME(6) DEFAULT NULL,
  status ENUM('draft','submitted','validated','archived') DEFAULT 'draft',
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  CONSTRAINT chk_statut_validation CHECK (statut_validation IN ('Brouillon','Validé ADP','Transmis hiérarchie')),
  CONSTRAINT chk_priorite CHECK (priorite IN ('Faible','Moyenne','Élevée')),
  CONSTRAINT fk_cahier_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_cahier_validated_by FOREIGN KEY (validated_by) REFERENCES users(id)
);

-- adp_agents
CREATE TABLE adp_agents (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) DEFAULT NULL,
  matricule VARCHAR(50) NOT NULL UNIQUE,
  cine VARCHAR(50) DEFAULT NULL,
  full_name VARCHAR(255) NOT NULL,
  sex CHAR(1) DEFAULT NULL,
  date_of_birth DATE DEFAULT NULL,
  photo_url TEXT,
  recruitment_date DATE DEFAULT NULL,
  grade VARCHAR(100) DEFAULT NULL,
  scale VARCHAR(50) DEFAULT NULL,
  corps VARCHAR(50) DEFAULT NULL,
  dranef_id VARCHAR(50) NOT NULL,
  dpanef_id VARCHAR(50) NOT NULL,
  commune_ids JSON DEFAULT NULL,
  phone VARCHAR(50) DEFAULT NULL,
  email VARCHAR(255) DEFAULT NULL,
  status ENUM('draft','submitted','validated','archived') DEFAULT 'draft',
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  created_by CHAR(36) DEFAULT NULL,
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  updated_by CHAR(36) DEFAULT NULL,
  CONSTRAINT chk_adp_sex CHECK (sex IN ('M','F')),
  CONSTRAINT chk_adp_corps CHECK (corps IN ('Forestier','Support')),
  CONSTRAINT fk_adp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_adp_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT fk_adp_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- pdfcp_programs
CREATE TABLE pdfcp_programs (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  code VARCHAR(100) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_year INT NOT NULL,
  end_year INT NOT NULL,
  dranef_id VARCHAR(50) NOT NULL,
  dpanef_id VARCHAR(50) NOT NULL,
  commune_id VARCHAR(50) DEFAULT NULL,
  total_budget_dh DECIMAL(15,2) DEFAULT 0,
  validation_status VARCHAR(50) DEFAULT 'BROUILLON',
  locked TINYINT(1) DEFAULT 0,
  validated_adp_by CHAR(36) DEFAULT NULL,
  validated_adp_at DATETIME(6) DEFAULT NULL,
  validated_dpanef_by CHAR(36) DEFAULT NULL,
  validated_dpanef_at DATETIME(6) DEFAULT NULL,
  visa_dranef_by CHAR(36) DEFAULT NULL,
  visa_dranef_at DATETIME(6) DEFAULT NULL,
  validation_note TEXT,
  annulation_motif TEXT,
  annulation_par VARCHAR(255) DEFAULT NULL,
  annulation_date DATETIME(6) DEFAULT NULL,
  unlock_motif TEXT,
  unlock_by VARCHAR(255) DEFAULT NULL,
  unlock_at DATETIME(6) DEFAULT NULL,
  status ENUM('draft','submitted','validated','archived') DEFAULT 'draft',
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  created_by CHAR(36) DEFAULT NULL,
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  updated_by CHAR(36) DEFAULT NULL,
  CONSTRAINT chk_pdfcp_years CHECK (start_year >= 2020 AND start_year <= 2050 AND end_year >= 2020 AND end_year <= 2050 AND end_year >= start_year),
  CONSTRAINT chk_pdfcp_validation_status CHECK (validation_status IN ('BROUILLON','CONCERTE_ADP','VALIDE_DPANEF','VALIDE_CENTRAL','VERROUILLE')),
  CONSTRAINT fk_pdfcp_validated_adp FOREIGN KEY (validated_adp_by) REFERENCES users(id),
  CONSTRAINT fk_pdfcp_validated_dpanef FOREIGN KEY (validated_dpanef_by) REFERENCES users(id),
  CONSTRAINT fk_pdfcp_visa_dranef FOREIGN KEY (visa_dranef_by) REFERENCES users(id),
  CONSTRAINT fk_pdfcp_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT fk_pdfcp_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- pdfcp_actions
CREATE TABLE pdfcp_actions (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  pdfcp_id CHAR(36) NOT NULL,
  commune_id VARCHAR(50) DEFAULT NULL,
  perimetre_id VARCHAR(50) DEFAULT NULL,
  site_id VARCHAR(50) DEFAULT NULL,
  action_key VARCHAR(255) NOT NULL,
  action_label VARCHAR(255) DEFAULT NULL,
  year INT NOT NULL,
  etat VARCHAR(20) DEFAULT 'CONCERTE',
  unite VARCHAR(50) NOT NULL,
  physique DECIMAL(12,2) DEFAULT 0,
  financier DECIMAL(15,2) DEFAULT 0,
  geometry_type VARCHAR(50) DEFAULT NULL,
  coordinates JSON DEFAULT NULL,
  source_plan_line_id CHAR(36) DEFAULT NULL,
  source_cp_line_id CHAR(36) DEFAULT NULL,
  justification_ecart TEXT,
  preuves JSON DEFAULT NULL,
  notes TEXT,
  date_realisation DATE DEFAULT NULL,
  statut_execution VARCHAR(50) DEFAULT 'planifie',
  locked TINYINT(1) DEFAULT 0,
  status ENUM('draft','submitted','validated','archived') DEFAULT 'draft',
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  created_by CHAR(36) DEFAULT NULL,
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  updated_by CHAR(36) DEFAULT NULL,
  CONSTRAINT chk_pdfcp_actions_year CHECK (year >= 2020 AND year <= 2050),
  CONSTRAINT chk_pdfcp_actions_etat CHECK (etat IN ('CONCERTE','CP','EXECUTE')),
  CONSTRAINT chk_pdfcp_actions_geom CHECK (geometry_type IS NULL OR geometry_type IN ('Point','LineString','Polygon')),
  CONSTRAINT fk_pdfcp_actions_program FOREIGN KEY (pdfcp_id) REFERENCES pdfcp_programs(id) ON DELETE CASCADE,
  CONSTRAINT fk_pdfcp_actions_source_plan FOREIGN KEY (source_plan_line_id) REFERENCES pdfcp_actions(id) ON DELETE SET NULL,
  CONSTRAINT fk_pdfcp_actions_source_cp FOREIGN KEY (source_cp_line_id) REFERENCES pdfcp_actions(id) ON DELETE SET NULL,
  CONSTRAINT fk_pdfcp_actions_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT fk_pdfcp_actions_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- field_activities
CREATE TABLE field_activities (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  adp_user_id CHAR(36) NOT NULL,
  dranef_id VARCHAR(50) NOT NULL,
  dpanef_id VARCHAR(50) NOT NULL,
  commune_id VARCHAR(50) DEFAULT NULL,
  activity_type ENUM('sensibilisation','formation','reunion','visite_terrain','distribution','suivi_projet','mediation') NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  activity_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  occasion VARCHAR(255) DEFAULT NULL,
  object TEXT,
  beneficiaries_count INT DEFAULT NULL,
  participants_count INT DEFAULT NULL,
  location_text TEXT,
  latitude DOUBLE DEFAULT NULL,
  longitude DOUBLE DEFAULT NULL,
  attachments JSON DEFAULT NULL,
  pdfcp_id CHAR(36) DEFAULT NULL,
  validated_by CHAR(36) DEFAULT NULL,
  validated_at DATETIME(6) DEFAULT NULL,
  status ENUM('draft','submitted','validated','archived') DEFAULT 'draft',
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  created_by CHAR(36) DEFAULT NULL,
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  updated_by CHAR(36) DEFAULT NULL,
  CONSTRAINT fk_field_activities_adp FOREIGN KEY (adp_user_id) REFERENCES users(id),
  CONSTRAINT fk_field_activities_pdfcp FOREIGN KEY (pdfcp_id) REFERENCES pdfcp_programs(id) ON DELETE SET NULL,
  CONSTRAINT fk_field_activities_validated_by FOREIGN KEY (validated_by) REFERENCES users(id),
  CONSTRAINT fk_field_activities_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT fk_field_activities_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- conflicts
CREATE TABLE conflicts (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  adp_user_id CHAR(36) NOT NULL,
  dranef_id VARCHAR(50) NOT NULL,
  dpanef_id VARCHAR(50) NOT NULL,
  commune_id VARCHAR(50) DEFAULT NULL,
  conflict_type ENUM('conflit','opposition') NOT NULL,
  nature VARCHAR(255) NOT NULL,
  severity ENUM('faible','moyenne','elevee','critique') DEFAULT 'moyenne',
  conflict_status ENUM('ouvert','en_cours','resolu','escalade') DEFAULT 'ouvert',
  title VARCHAR(255) NOT NULL,
  description TEXT,
  parties_involved JSON DEFAULT NULL,
  reported_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  resolution_date DATE DEFAULT NULL,
  superficie_opposee_ha DECIMAL(10,2) DEFAULT NULL,
  superficie_levee_ha DECIMAL(10,2) DEFAULT NULL,
  location_text TEXT,
  latitude DOUBLE DEFAULT NULL,
  longitude DOUBLE DEFAULT NULL,
  attachments JSON DEFAULT NULL,
  pdfcp_id CHAR(36) DEFAULT NULL,
  validated_by CHAR(36) DEFAULT NULL,
  validated_at DATETIME(6) DEFAULT NULL,
  status ENUM('draft','submitted','validated','archived') DEFAULT 'draft',
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  created_by CHAR(36) DEFAULT NULL,
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  updated_by CHAR(36) DEFAULT NULL,
  CONSTRAINT fk_conflicts_adp FOREIGN KEY (adp_user_id) REFERENCES users(id),
  CONSTRAINT fk_conflicts_pdfcp FOREIGN KEY (pdfcp_id) REFERENCES pdfcp_programs(id) ON DELETE SET NULL,
  CONSTRAINT fk_conflicts_validated_by FOREIGN KEY (validated_by) REFERENCES users(id),
  CONSTRAINT fk_conflicts_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT fk_conflicts_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- organizations
CREATE TABLE organizations (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL,
  organization_type ENUM('ODF','cooperative','association','AGS') NOT NULL,
  registration_number VARCHAR(100) DEFAULT NULL,
  dranef_id VARCHAR(50) NOT NULL,
  dpanef_id VARCHAR(50) NOT NULL,
  commune_id VARCHAR(50) DEFAULT NULL,
  creation_date DATE DEFAULT NULL,
  activity_domains JSON DEFAULT NULL,
  members_count INT DEFAULT NULL,
  president_name VARCHAR(255) DEFAULT NULL,
  contact_phone VARCHAR(50) DEFAULT NULL,
  organization_status ENUM('active','inactive','en_creation','dissoute') DEFAULT 'active',
  adp_user_id CHAR(36) DEFAULT NULL,
  validated_by CHAR(36) DEFAULT NULL,
  validated_at DATETIME(6) DEFAULT NULL,
  status ENUM('draft','submitted','validated','archived') DEFAULT 'draft',
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  created_by CHAR(36) DEFAULT NULL,
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  updated_by CHAR(36) DEFAULT NULL,
  CONSTRAINT fk_organizations_adp FOREIGN KEY (adp_user_id) REFERENCES users(id),
  CONSTRAINT fk_organizations_validated_by FOREIGN KEY (validated_by) REFERENCES users(id),
  CONSTRAINT fk_organizations_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT fk_organizations_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- sync_queue
CREATE TABLE sync_queue (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  operation ENUM('INSERT','UPDATE','DELETE') NOT NULL,
  record_id CHAR(36) DEFAULT NULL,
  payload JSON NOT NULL,
  sync_status VARCHAR(20) DEFAULT 'pending',
  error_message TEXT,
  retry_count INT DEFAULT 0,
  queued_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  synced_at DATETIME(6) DEFAULT NULL,
  client_id VARCHAR(255) DEFAULT NULL,
  offline_id VARCHAR(255) DEFAULT NULL UNIQUE,
  CONSTRAINT chk_sync_status CHECK (sync_status IN ('pending','synced','error','conflict')),
  CONSTRAINT fk_sync_queue_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- pdfcp_attachments
CREATE TABLE pdfcp_attachments (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  pdfcp_id CHAR(36) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR(50) DEFAULT NULL,
  file_size_bytes INT DEFAULT NULL,
  description TEXT,
  category VARCHAR(50) DEFAULT 'general',
  uploaded_by CHAR(36) DEFAULT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_pdfcp_attachments_pdfcp FOREIGN KEY (pdfcp_id) REFERENCES pdfcp_programs(id) ON DELETE CASCADE,
  CONSTRAINT fk_pdfcp_attachments_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- pdfcp_validation_history
CREATE TABLE pdfcp_validation_history (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  pdfcp_id CHAR(36) NOT NULL,
  action VARCHAR(100) NOT NULL,
  from_status VARCHAR(50) DEFAULT NULL,
  to_status VARCHAR(50) DEFAULT NULL,
  note TEXT,
  performed_by CHAR(36) DEFAULT NULL,
  performed_by_name VARCHAR(255) DEFAULT NULL,
  performed_by_role VARCHAR(50) DEFAULT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_pdfcp_history_pdfcp FOREIGN KEY (pdfcp_id) REFERENCES pdfcp_programs(id) ON DELETE CASCADE,
  CONSTRAINT fk_pdfcp_history_performed_by FOREIGN KEY (performed_by) REFERENCES users(id)
);

-- notifications
CREATE TABLE notifications (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  recipient_user_id CHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  notification_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'info',
  pdfcp_id VARCHAR(50) DEFAULT NULL,
  year INT DEFAULT NULL,
  composante VARCHAR(255) DEFAULT NULL,
  localisation VARCHAR(255) DEFAULT NULL,
  cancellation_reason TEXT,
  cancelled_by_name VARCHAR(255) DEFAULT NULL,
  cancelled_by_role VARCHAR(50) DEFAULT NULL,
  cancelled_at DATETIME(6) DEFAULT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT chk_notification_type CHECK (notification_type IN ('cancellation_concerte','cancellation_cp','cancellation_execute','validation','info')),
  CONSTRAINT chk_severity CHECK (severity IN ('info','warning','critical')),
  CONSTRAINT fk_notifications_recipient FOREIGN KEY (recipient_user_id) REFERENCES users(id)
);

-- access_codes
CREATE TABLE access_codes (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  label VARCHAR(255) NOT NULL,
  code_hash VARCHAR(255) NOT NULL,
  scope VARCHAR(100) NOT NULL,
  dranef_id VARCHAR(50) DEFAULT NULL,
  dpanef_id VARCHAR(50) DEFAULT NULL,
  max_uses INT NOT NULL DEFAULT 1,
  uses INT NOT NULL DEFAULT 0,
  expires_at DATETIME(6) DEFAULT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  created_by CHAR(36) DEFAULT NULL,
  CONSTRAINT fk_access_codes_created_by FOREIGN KEY (created_by) REFERENCES users(id)
);

-- pdfcp_actions_geo
CREATE TABLE pdfcp_actions_geo (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  pdfcp_id CHAR(36) NOT NULL,
  planned_action_id CHAR(36) NOT NULL,
  action_type VARCHAR(100) NOT NULL,
  titre VARCHAR(255) NOT NULL,
  description TEXT,
  surface_realisee_ha DECIMAL(12,2) DEFAULT NULL,
  longueur_realisee_km DECIMAL(12,2) DEFAULT NULL,
  coords_text_lambert TEXT NOT NULL,
  lambert_zone VARCHAR(50) NOT NULL,
  geom_type VARCHAR(50) NOT NULL,
  geometry JSON DEFAULT NULL,
  centroid_lat DOUBLE NOT NULL,
  centroid_lng DOUBLE NOT NULL,
  date_realisation DATE DEFAULT NULL,
  statut VARCHAR(50) DEFAULT 'planifie',
  observations TEXT,
  preuves JSON DEFAULT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  created_by CHAR(36) DEFAULT NULL,
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  updated_by CHAR(36) DEFAULT NULL,
  CONSTRAINT fk_pdfcp_geo_pdfcp FOREIGN KEY (pdfcp_id) REFERENCES pdfcp_programs(id) ON DELETE CASCADE,
  CONSTRAINT fk_pdfcp_geo_planned FOREIGN KEY (planned_action_id) REFERENCES pdfcp_actions(id) ON DELETE CASCADE,
  CONSTRAINT fk_pdfcp_geo_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT fk_pdfcp_geo_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- =============================================
-- TRIGGERS (updated_at handled by ON UPDATE; optional triggers below)
-- =============================================
-- MySQL: use session variable SET @current_user_id = 'uuid'; for created_by/validated_by in app or triggers

DELIMITER //

-- PDFCP annulation: set annulation_par, annulation_date when reverting to BROUILLON
CREATE TRIGGER trg_pdfcp_annulation
BEFORE UPDATE ON pdfcp_programs
FOR EACH ROW
BEGIN
  IF NEW.annulation_motif IS NOT NULL AND NEW.annulation_motif <> '' AND NEW.validation_status = 'BROUILLON' AND OLD.validation_status <> 'BROUILLON' THEN
    SET NEW.annulation_par = COALESCE(@current_user_id, 'system');
    SET NEW.annulation_date = CURRENT_TIMESTAMP(6);
  END IF;
END//

-- PDFCP unlock: set unlock_by, unlock_at when moving from VERROUILLE to VALIDE_CENTRAL
CREATE TRIGGER trg_pdfcp_unlock
BEFORE UPDATE ON pdfcp_programs
FOR EACH ROW
BEGIN
  IF NEW.unlock_motif IS NOT NULL AND NEW.unlock_motif <> '' AND OLD.validation_status = 'VERROUILLE' AND NEW.validation_status = 'VALIDE_CENTRAL' THEN
    SET NEW.unlock_by = COALESCE(@current_user_id, 'system');
    SET NEW.unlock_at = CURRENT_TIMESTAMP(6);
    SET NEW.locked = 0;
  END IF;
END//

-- Set created_by from session variable on INSERT (optional)
CREATE TRIGGER set_created_by_field_activities
BEFORE INSERT ON field_activities
FOR EACH ROW
BEGIN
  IF NEW.created_by IS NULL AND @current_user_id IS NOT NULL THEN
    SET NEW.created_by = @current_user_id;
  END IF;
END//

CREATE TRIGGER set_created_by_conflicts
BEFORE INSERT ON conflicts
FOR EACH ROW
BEGIN
  IF NEW.created_by IS NULL AND @current_user_id IS NOT NULL THEN
    SET NEW.created_by = @current_user_id;
  END IF;
END//

CREATE TRIGGER set_created_by_organizations
BEFORE INSERT ON organizations
FOR EACH ROW
BEGIN
  IF NEW.created_by IS NULL AND @current_user_id IS NOT NULL THEN
    SET NEW.created_by = @current_user_id;
  END IF;
END//

CREATE TRIGGER set_created_by_pdfcp_programs
BEFORE INSERT ON pdfcp_programs
FOR EACH ROW
BEGIN
  IF NEW.created_by IS NULL AND @current_user_id IS NOT NULL THEN
    SET NEW.created_by = @current_user_id;
  END IF;
END//

CREATE TRIGGER set_created_by_pdfcp_actions
BEFORE INSERT ON pdfcp_actions
FOR EACH ROW
BEGIN
  IF NEW.created_by IS NULL AND @current_user_id IS NOT NULL THEN
    SET NEW.created_by = @current_user_id;
  END IF;
END//

CREATE TRIGGER set_created_by_pdfcp_actions_geo
BEFORE INSERT ON pdfcp_actions_geo
FOR EACH ROW
BEGIN
  IF NEW.created_by IS NULL AND @current_user_id IS NOT NULL THEN
    SET NEW.created_by = @current_user_id;
  END IF;
END//

DELIMITER ;

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_dranef_id ON profiles(dranef_id);
CREATE INDEX idx_profiles_dpanef_id ON profiles(dpanef_id);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role);

CREATE INDEX idx_cahier_journal_adp_user ON cahier_journal_entries(adp_user_id);
CREATE INDEX idx_cahier_journal_entry_date ON cahier_journal_entries(entry_date);
CREATE INDEX idx_cahier_journal_dranef ON cahier_journal_entries(dranef_id);
CREATE INDEX idx_cahier_journal_dpanef ON cahier_journal_entries(dpanef_id);
CREATE INDEX idx_journal_entries_date ON cahier_journal_entries(entry_date);
CREATE INDEX idx_journal_entries_category ON cahier_journal_entries(category);
CREATE INDEX idx_journal_entries_statut ON cahier_journal_entries(statut_validation);
CREATE INDEX idx_journal_entries_priorite ON cahier_journal_entries(priorite);

CREATE INDEX idx_adp_agents_dranef ON adp_agents(dranef_id);
CREATE INDEX idx_adp_agents_dpanef ON adp_agents(dpanef_id);
CREATE INDEX idx_adp_agents_status ON adp_agents(status);

CREATE INDEX idx_pdfcp_programs_dranef ON pdfcp_programs(dranef_id);
CREATE INDEX idx_pdfcp_programs_dpanef ON pdfcp_programs(dpanef_id);
CREATE INDEX idx_pdfcp_programs_status ON pdfcp_programs(status);

CREATE INDEX idx_pdfcp_actions_pdfcp ON pdfcp_actions(pdfcp_id);
CREATE INDEX idx_pdfcp_actions_status ON pdfcp_actions(status);
CREATE INDEX idx_pdfcp_actions_etat ON pdfcp_actions(etat);
CREATE INDEX idx_pdfcp_actions_source_plan ON pdfcp_actions(source_plan_line_id);
CREATE INDEX idx_pdfcp_actions_source_cp ON pdfcp_actions(source_cp_line_id);
CREATE INDEX idx_pdfcp_actions_pdfcp_year_etat ON pdfcp_actions(pdfcp_id, year, etat);

CREATE INDEX idx_field_activities_adp ON field_activities(adp_user_id);
CREATE INDEX idx_field_activities_date ON field_activities(activity_date);
CREATE INDEX idx_field_activities_status ON field_activities(status);

CREATE INDEX idx_conflicts_adp ON conflicts(adp_user_id);
CREATE INDEX idx_conflicts_status ON conflicts(conflict_status);
CREATE INDEX idx_conflicts_reported_date ON conflicts(reported_date);

CREATE INDEX idx_organizations_type ON organizations(organization_type);
CREATE INDEX idx_organizations_status ON organizations(status);

CREATE INDEX idx_sync_queue_user ON sync_queue(user_id);
CREATE INDEX idx_sync_queue_status ON sync_queue(sync_status);

CREATE INDEX idx_dranef_region_id ON dranef(region_id);
CREATE INDEX idx_dpanef_dranef_id ON dpanef(dranef_id);
CREATE INDEX idx_communes_dpanef_id ON communes(dpanef_id);

CREATE INDEX idx_pdfcp_attachments_pdfcp_id ON pdfcp_attachments(pdfcp_id);
CREATE INDEX idx_pdfcp_validation_history_pdfcp_id ON pdfcp_validation_history(pdfcp_id);
CREATE INDEX idx_pdfcp_validation_history_created_at ON pdfcp_validation_history(created_at);

CREATE INDEX idx_notifications_recipient ON notifications(recipient_user_id, is_read, created_at);
CREATE INDEX idx_notifications_pdfcp ON notifications(pdfcp_id);

CREATE INDEX idx_pdfcp_actions_geo_planned ON pdfcp_actions_geo(planned_action_id);
CREATE INDEX idx_pdfcp_actions_geo_pdfcp ON pdfcp_actions_geo(pdfcp_id);

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================
-- STORED FUNCTIONS (optional – for app use; no auth.uid() in MySQL)
-- =============================================
-- has_role(user_id, role): implement in application or create function that reads user_roles.
-- get_user_scope(user_id): implement in application.
-- get_user_commune_ids(user_id): implement in application (read profiles.commune_ids JSON).

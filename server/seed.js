/**
 * Seed DEMO environment for ANEF Field Connect (MySQL).
 * Run after schema-mysql.sql and schema-mysql-auth.sql.
 * Usage: node seed.js
 * Default password for all users: Password1
 * 
 * This script is idempotent: running it multiple times won't duplicate data.
 */

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import mysql from 'mysql2/promise';
import { ensureDatabaseExists, testConnection, getPool } from './db.js';

const PASSWORD = 'Password1';
const passwordHash = bcrypt.hashSync(PASSWORD, 10);

async function run() {
  // Ensure database exists BEFORE starting seed
  console.log('🔍 Checking MySQL database...');
  const dbExists = await ensureDatabaseExists();
  if (!dbExists) {
    console.error('\n❌ Cannot proceed without database. Please fix MySQL connection.');
    process.exit(1);
  }
  console.log('');

  // Test MySQL connection AFTER database is ensured
  console.log('🔍 Testing MySQL connection...');
  const connected = await testConnection();
  if (!connected) {
    console.error('\n❌ Cannot proceed without MySQL connection. Please fix MySQL connection.');
    process.exit(1);
  }
  console.log('');

  const pool = getPool();
  const conn = await pool.getConnection();

  try {
    console.log('🌱 Starting DEMO environment seed...\n');

    // =============================================
    // 0️⃣ CREATE MINIMAL TABLES IF NOT EXISTS (pour que le login fonctionne sans schema-mysql.sql)
    // =============================================
    console.log('📋 Step 0: Creating minimal tables if not exist...');
    const dbName = process.env.MYSQL_DATABASE || 'anef_field_connect';

    await conn.query(`
      CREATE TABLE IF NOT EXISTS regions (
        id VARCHAR(50) NOT NULL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) DEFAULT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS dranef (
        id VARCHAR(50) NOT NULL PRIMARY KEY,
        region_id VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) DEFAULT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS dpanef (
        id VARCHAR(50) NOT NULL PRIMARY KEY,
        dranef_id VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) DEFAULT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS communes (
        id VARCHAR(50) NOT NULL PRIMARY KEY,
        dpanef_id VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id CHAR(36) NOT NULL PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) DEFAULT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id VARCHAR(50) NOT NULL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT DEFAULT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id CHAR(36) NOT NULL PRIMARY KEY,
        user_id CHAR(36) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        role_label VARCHAR(100) DEFAULT NULL,
        dranef_id VARCHAR(50) DEFAULT NULL,
        dpanef_id VARCHAR(50) DEFAULT NULL,
        commune_ids JSON DEFAULT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        id CHAR(36) NOT NULL PRIMARY KEY,
        user_id CHAR(36) NOT NULL,
        role ENUM('ADMIN','NATIONAL','REGIONAL','PROVINCIAL','LOCAL') NOT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        UNIQUE KEY uq_user_role (user_id, role)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Tables PDFCP (pour création de programmes depuis l'app)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS pdfcp_programs (
        id CHAR(36) NOT NULL PRIMARY KEY,
        code VARCHAR(100) NOT NULL,
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
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        created_by CHAR(36) DEFAULT NULL,
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        updated_by CHAR(36) DEFAULT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS pdfcp_actions (
        id CHAR(36) NOT NULL PRIMARY KEY,
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
        statut_execution VARCHAR(50) DEFAULT NULL,
        locked TINYINT(1) DEFAULT 0,
        status VARCHAR(20) DEFAULT 'draft',
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        created_by CHAR(36) DEFAULT NULL,
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        updated_by CHAR(36) DEFAULT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS pdfcp_attachments (
        id CHAR(36) NOT NULL PRIMARY KEY,
        pdfcp_id CHAR(36) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_url TEXT NOT NULL,
        file_type VARCHAR(50) DEFAULT NULL,
        file_size_bytes INT DEFAULT NULL,
        description TEXT,
        category VARCHAR(50) DEFAULT 'general',
        uploaded_by CHAR(36) DEFAULT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS pdfcp_validation_history (
        id CHAR(36) NOT NULL PRIMARY KEY,
        pdfcp_id CHAR(36) NOT NULL,
        action VARCHAR(100) NOT NULL,
        from_status VARCHAR(50) DEFAULT NULL,
        to_status VARCHAR(50) DEFAULT NULL,
        note TEXT,
        performed_by CHAR(36) DEFAULT NULL,
        performed_by_name VARCHAR(255) DEFAULT NULL,
        performed_by_role VARCHAR(50) DEFAULT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Add password_hash to users if table existed without it
    try {
      const [cols] = await conn.query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'password_hash'
      `, [dbName]);
      if (cols.length === 0) {
        await conn.query(`ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) DEFAULT NULL AFTER email`);
        console.log('   ✓ Added password_hash to users');
      }
    } catch (e) {
      // ignore
    }
    console.log('   ✓ Minimal tables ready\n');

    // =============================================
    // 1️⃣ ROLES + REFERENCE DATA
    // =============================================
    console.log('📋 Step 1: Roles and reference data...');
    await conn.query(`
      INSERT IGNORE INTO roles (id, name, description) VALUES
        ('ROLE-ADMIN', 'ADMIN', 'Administrateur système'),
        ('ROLE-DRANEF', 'DRANEF', 'Direction Régionale des Eaux et Forêts'),
        ('ROLE-DPANEF', 'DPANEF', 'Direction Provinciale des Eaux et Forêts'),
        ('ROLE-ADP', 'ADP', 'Agent de Développement Participatif')
    `);

    // =============================================
    // 2️⃣ SEED REFERENCE DATA (Regions, DRANEF, DPANEF, Communes)
    // =============================================
    console.log('🗺️  Step 2: Seeding reference data...');

    await conn.query(`
      INSERT INTO regions (id, name, code) VALUES
        ('REG-01', 'Tanger-Tétouan-Al Hoceïma', 'TTA'),
        ('REG-02', 'Oriental', 'ORI'),
        ('REG-03', 'Fès-Meknès', 'FM'),
        ('REG-04', 'Rabat-Salé-Kénitra', 'RSK'),
        ('REG-05', 'Béni Mellal-Khénifra', 'BMK'),
        ('REG-06', 'Casablanca-Settat', 'CS'),
        ('REG-07', 'Marrakech-Safi', 'MS'),
        ('REG-08', 'Drâa-Tafilalet', 'DT'),
        ('REG-09', 'Souss-Massa', 'SM'),
        ('REG-10', 'Guelmim-Oued Noun', 'GON'),
        ('REG-11', 'Laâyoune-Sakia El Hamra', 'LSH'),
        ('REG-12', 'Dakhla-Oued Ed Dahab', 'DOD')
      ON DUPLICATE KEY UPDATE name = VALUES(name)
    `);

    await conn.query(`
      INSERT INTO dranef (id, name, code, region_id) VALUES
        ('DRANEF-RSK', 'DRANEF Rabat-Salé-Kénitra', 'RSK', 'REG-04'),
        ('DRANEF-FM', 'DRANEF Fès-Meknès', 'FM', 'REG-03'),
        ('DRANEF-BMK', 'DRANEF Béni Mellal-Khénifra', 'BMK', 'REG-05'),
        ('DRANEF-TTA', 'DRANEF Tanger-Tétouan-Al Hoceïma', 'TTA', 'REG-01'),
        ('DRANEF-SM', 'DRANEF Souss-Massa', 'SM', 'REG-09')
      ON DUPLICATE KEY UPDATE name = VALUES(name)
    `);

    await conn.query(`
      INSERT INTO dpanef (id, name, code, dranef_id) VALUES
        ('DPANEF-KEN', 'DPANEF Kénitra', 'KEN', 'DRANEF-RSK'),
        ('DPANEF-SAL', 'DPANEF Salé', 'SAL', 'DRANEF-RSK'),
        ('DPANEF-RABAT', 'DPANEF Rabat', 'RABAT', 'DRANEF-RSK'),
        ('DPANEF-KHE', 'DPANEF Khénifra', 'KHE', 'DRANEF-BMK'),
        ('DPANEF-BM', 'DPANEF Béni Mellal', 'BM', 'DRANEF-BMK'),
        ('DPANEF-IFR', 'DPANEF Ifrane', 'IFR', 'DRANEF-FM'),
        ('DPANEF-CHF', 'DPANEF Chefchaouen', 'CHF', 'DRANEF-TTA')
      ON DUPLICATE KEY UPDATE name = VALUES(name)
    `);

    await conn.query(`
      INSERT INTO communes (id, name, dpanef_id) VALUES
        ('COM-KNTR-01', 'Sidi Taibi', 'DPANEF-KEN'),
        ('COM-KNTR-02', 'Sidi Allal Tazi', 'DPANEF-KEN'),
        ('COM-RABAT-01', 'Temara', 'DPANEF-RABAT'),
        ('COM-RABAT-02', 'Kasba', 'DPANEF-RABAT'),
        ('COM-KHE-01', 'Aguelmous', 'DPANEF-KHE'),
        ('COM-KHE-02', 'El Kbab', 'DPANEF-KHE'),
        ('COM-BM-01', 'Béni Mellal', 'DPANEF-BM'),
        ('COM-IFR-01', 'Ifrane', 'DPANEF-IFR'),
        ('COM-CHF-01', 'Chefchaouen', 'DPANEF-CHF')
      ON DUPLICATE KEY UPDATE name = VALUES(name)
    `);
    console.log('   ✓ Reference data seeded\n');

    // =============================================
    // 3️⃣ CREATE DEMO USERS (id, email, password_hash pour que le login fonctionne)
    // =============================================
    console.log('👤 Step 3: Creating DEMO users...\n');

    const demoUsers = [
      // ADMIN
      {
        email: 'admin@anef.ma',
        full_name: 'Admin ANEF',
        role: 'ADMIN',
        role_id: 'ROLE-ADMIN',
        region_id: null,
        dranef_id: null,
        dpanef_id: null,
        commune_id: null,
        role_label: 'ADMIN',
        scope_level: 'ADMIN',
        dranef_id_profile: null,
        dpanef_id_profile: null,
        commune_ids: []
      },
      // DRANEF
      {
        email: 'dranef.rsk@anef.ma',
        full_name: 'Responsable DRANEF Rabat-Salé-Kénitra',
        role: 'REGIONAL',
        role_id: 'ROLE-DRANEF',
        region_id: 'REG-04',
        dranef_id: 'DRANEF-RSK',
        dpanef_id: null,
        commune_id: null,
        role_label: 'DRANEF',
        scope_level: 'REGIONAL',
        dranef_id_profile: 'DRANEF-RSK',
        dpanef_id_profile: null,
        commune_ids: []
      },
      {
        email: 'dranef.bmk@anef.ma',
        full_name: 'Responsable DRANEF Béni Mellal-Khénifra',
        role: 'REGIONAL',
        role_id: 'ROLE-DRANEF',
        region_id: 'REG-05',
        dranef_id: 'DRANEF-BMK',
        dpanef_id: null,
        commune_id: null,
        role_label: 'DRANEF',
        scope_level: 'REGIONAL',
        dranef_id_profile: 'DRANEF-BMK',
        dpanef_id_profile: null,
        commune_ids: []
      },
      // DPANEF
      {
        email: 'dpanef.rabat@anef.ma',
        full_name: 'Responsable DPANEF Rabat',
        role: 'PROVINCIAL',
        role_id: 'ROLE-DPANEF',
        region_id: 'REG-04',
        dranef_id: 'DRANEF-RSK',
        dpanef_id: 'DPANEF-RABAT',
        commune_id: null,
        role_label: 'DPANEF',
        scope_level: 'PROVINCIAL',
        dranef_id_profile: 'DRANEF-RSK',
        dpanef_id_profile: 'DPANEF-RABAT',
        commune_ids: []
      },
      {
        email: 'dpanef.bm@anef.ma',
        full_name: 'Responsable DPANEF Béni Mellal',
        role: 'PROVINCIAL',
        role_id: 'ROLE-DPANEF',
        region_id: 'REG-05',
        dranef_id: 'DRANEF-BMK',
        dpanef_id: 'DPANEF-BM',
        commune_id: null,
        role_label: 'DPANEF',
        scope_level: 'PROVINCIAL',
        dranef_id_profile: 'DRANEF-BMK',
        dpanef_id_profile: 'DPANEF-BM',
        commune_ids: []
      },
      // ADP
      {
        email: 'adp.temara@anef.ma',
        full_name: 'ADP Temara',
        role: 'LOCAL',
        role_id: 'ROLE-ADP',
        region_id: 'REG-04',
        dranef_id: 'DRANEF-RSK',
        dpanef_id: 'DPANEF-RABAT',
        commune_id: 'COM-RABAT-01',
        role_label: 'ADP',
        scope_level: 'LOCAL',
        dranef_id_profile: 'DRANEF-RSK',
        dpanef_id_profile: 'DPANEF-RABAT',
        commune_ids: ['COM-RABAT-01']
      },
      {
        email: 'adp.kasba@anef.ma',
        full_name: 'ADP Kasba',
        role: 'LOCAL',
        role_id: 'ROLE-ADP',
        region_id: 'REG-04',
        dranef_id: 'DRANEF-RSK',
        dpanef_id: 'DPANEF-RABAT',
        commune_id: 'COM-RABAT-02',
        role_label: 'ADP',
        scope_level: 'LOCAL',
        dranef_id_profile: 'DRANEF-RSK',
        dpanef_id_profile: 'DPANEF-RABAT',
        commune_ids: ['COM-RABAT-02']
      },
      // DPANEF Kénitra (pour bouton démo DPANEF, cohérent avec adp.demo)
      {
        email: 'dpanef.ken@anef.ma',
        full_name: 'DPANEF Démo Kénitra',
        role: 'PROVINCIAL',
        role_id: 'ROLE-DPANEF',
        region_id: 'REG-04',
        dranef_id: 'DRANEF-RSK',
        dpanef_id: 'DPANEF-KEN',
        commune_id: null,
        role_label: 'DPANEF',
        scope_level: 'PROVINCIAL',
        dranef_id_profile: 'DRANEF-RSK',
        dpanef_id_profile: 'DPANEF-KEN',
        commune_ids: []
      },
      // Comptes démo production (accès rapide tous rôles) — mot de passe: Password1
      {
        email: 'demo@anef.ma',
        full_name: 'Démo Admin',
        role: 'ADMIN',
        role_id: 'ROLE-ADMIN',
        region_id: null,
        dranef_id: null,
        dpanef_id: null,
        commune_id: null,
        role_label: 'ADMIN',
        scope_level: 'ADMIN',
        dranef_id_profile: null,
        dpanef_id_profile: null,
        commune_ids: []
      },
      {
        email: 'demo.dg@anef.ma',
        full_name: 'Démo DG',
        role: 'NATIONAL',
        role_id: 'ROLE-DRANEF',
        region_id: null,
        dranef_id: null,
        dpanef_id: null,
        commune_id: null,
        role_label: 'DG',
        scope_level: 'NATIONAL',
        dranef_id_profile: null,
        dpanef_id_profile: null,
        commune_ids: []
      },
      {
        email: 'adp.demo@anef.ma',
        full_name: 'ADP Démo Terrain',
        role: 'LOCAL',
        role_id: 'ROLE-ADP',
        region_id: 'REG-04',
        dranef_id: 'DRANEF-RSK',
        dpanef_id: 'DPANEF-KEN',
        commune_id: 'COM-KNTR-01',
        role_label: 'ADP',
        scope_level: 'LOCAL',
        dranef_id_profile: 'DRANEF-RSK',
        dpanef_id_profile: 'DPANEF-KEN',
        commune_ids: ['COM-KNTR-01']
      }
    ];

    for (const u of demoUsers) {
      // Check if user exists
      const [existingUsers] = await conn.query('SELECT id FROM users WHERE email = ?', [u.email]);
      let userId;
      let isNew = false;

      if (existingUsers.length > 0) {
        // User exists - update password (obligatoire pour que le login fonctionne)
        userId = existingUsers[0].id;
        await conn.query(`UPDATE users SET password_hash = ? WHERE id = ?`, [passwordHash, userId]);
      } else {
        // Create new user (colonnes minimales pour compatibilité)
        userId = crypto.randomUUID();
        await conn.query(`
          INSERT INTO users (id, email, password_hash, created_at)
          VALUES (?, ?, ?, NOW())
        `, [userId, u.email, passwordHash]);
        isNew = true;
      }

      // Create or update profile
      const [existingProfiles] = await conn.query('SELECT id FROM profiles WHERE user_id = ?', [userId]);
      if (existingProfiles.length === 0) {
        const profileId = crypto.randomUUID();
        await conn.query(`
          INSERT INTO profiles (id, user_id, email, full_name, role_label, dranef_id, dpanef_id, commune_ids)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          profileId,
          userId,
          u.email,
          u.full_name,
          u.role_label,
          u.dranef_id_profile,
          u.dpanef_id_profile,
          JSON.stringify(u.commune_ids)
        ]);
      } else {
        // Update existing profile
        await conn.query(`
          UPDATE profiles 
          SET full_name = ?, 
              role_label = ?,
              dranef_id = ?,
              dpanef_id = ?,
              commune_ids = ?
          WHERE user_id = ?
        `, [
          u.full_name,
          u.role_label,
          u.dranef_id_profile,
          u.dpanef_id_profile,
          JSON.stringify(u.commune_ids),
          userId
        ]);
      }

      // Create or update user_roles (for compatibility with existing system)
      await conn.query(`
        INSERT INTO user_roles (id, user_id, role, created_at)
        VALUES (?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE role = VALUES(role)
      `, [crypto.randomUUID(), userId, u.scope_level]);

      // Log creation
      const status = isNew ? 'created' : 'updated';
      console.log(`   ✓ ${u.role_label} ${status}: ${u.email}`);
    }

    console.log('\n✅ DEMO environment seeded successfully!\n');
    console.log('📝 CONNEXION — Mot de passe pour TOUS les comptes: ' + PASSWORD);
    console.log('   (respecter la majuscule: P dans Password1)\n');
    console.log('   ADMIN:     demo@anef.ma  |  admin@anef.ma');
    console.log('   DG:        demo.dg@anef.ma');
    console.log('   DRANEF:    dranef.rsk@anef.ma  |  dranef.bmk@anef.ma');
    console.log('   DPANEF:    dpanef.ken@anef.ma  |  dpanef.rabat@anef.ma  |  dpanef.bm@anef.ma');
    console.log('   ADP:       adp.demo@anef.ma  |  adp.temara@anef.ma  |  adp.kasba@anef.ma\n');
    console.log('➜ Voir docs/COMPTES_DEMO_PRODUCTION_EXPERIMENTALE.md pour la liste complète.\n');
    console.log('➜ Redémarre le backend (npm run dev) puis connecte-toi.\n');

  } catch (err) {
    console.error('❌ Seed error:', err.message);
    console.error(err.stack);
    
    if (err.code === 'ECONNREFUSED') {
      console.error('\n💡 MySQL is not running.');
      console.error('   Démarre MySQL dans XAMPP (panneau de contrôle XAMPP → Start MySQL)');
      console.error('   Ou via ligne de commande: net start MySQL80');
    } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n💡 MySQL access denied.');
      console.error('   Vérifie MYSQL_USER et MYSQL_PASSWORD dans server/.env');
      console.error('   XAMPP par défaut: user=root, password=(vide)');
    } else if (err.code === 'ER_BAD_DB_ERROR') {
      console.error('\n💡 Database does not exist.');
      console.error('   This should not happen - ensureDatabaseExists() should have created it.');
      console.error(`   Create manually: CREATE DATABASE ${process.env.MYSQL_DATABASE || 'anef_field_connect'};`);
    } else if (err.message?.includes('password_hash')) {
      console.error('\n💡 Tip: Run schema-mysql-auth.sql first to add password_hash to users table.');
    } else if (err.message?.includes('doesn\'t exist') || err.message?.includes('Unknown column')) {
      console.error('\n💡 Tip: Run schema-mysql.sql first to create the database schema.');
    }
    
    process.exit(1);
  } finally {
    conn.release();
    const pool = getPool();
    await pool.end();
  }
}

run();

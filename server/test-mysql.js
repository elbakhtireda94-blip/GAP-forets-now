/**
 * Script de test de connexion MySQL
 * Usage: node test-mysql.js
 */

import 'dotenv/config';
import { ensureDatabaseExists, testConnection, query } from './db.js';

async function testMySQL() {
  console.log('🔍 Test de connexion MySQL...\n');
  console.log('Configuration:');
  console.log(`   Host: ${process.env.MYSQL_HOST || '127.0.0.1'}`);
  console.log(`   Port: ${process.env.MYSQL_PORT || 3306}`);
  console.log(`   User: ${process.env.MYSQL_USER || 'root'}`);
  console.log(`   Database: ${process.env.MYSQL_DATABASE || 'anef_field_connect'}`);
  console.log(`   Password: ${process.env.MYSQL_PASSWORD ? '***' : '(vide)'}\n`);

  // Step 1: Ensure database exists
  console.log('📋 Étape 1: Vérification/Création de la base de données...');
  const dbExists = await ensureDatabaseExists();
  if (!dbExists) {
    console.error('\n❌ Impossible de continuer sans base de données.');
    process.exit(1);
  }
  console.log('');

  // Step 2: Test connection
  console.log('📋 Étape 2: Test de connexion...');
  const connected = await testConnection();
  if (!connected) {
    console.error('\n❌ Connexion échouée.');
    process.exit(1);
  }
  console.log('');

  // Step 3: Test query
  console.log('📋 Étape 3: Test de requête SQL...');
  try {
    const rows = await query('SELECT 1 as test, NOW() as timestamp, DATABASE() as current_db, VERSION() as mysql_version');
    console.log('✅ Requête réussie:');
    console.log(`   Test: ${rows[0].test}`);
    console.log(`   Timestamp: ${rows[0].timestamp}`);
    console.log(`   Base de données: ${rows[0].current_db}`);
    console.log(`   Version MySQL: ${rows[0].mysql_version}`);
  } catch (err) {
    console.error('❌ Erreur lors de la requête:', err.message);
    process.exit(1);
  }
  console.log('');

  // Step 4: List tables
  console.log('📋 Étape 4: Liste des tables...');
  try {
    const tables = await query('SHOW TABLES');
    const tableNames = tables.map(t => Object.values(t)[0]);
    console.log(`✅ ${tableNames.length} table(s) trouvée(s):`);
    tableNames.forEach(name => console.log(`   - ${name}`));
  } catch (err) {
    console.error('❌ Erreur lors de la liste des tables:', err.message);
    process.exit(1);
  }
  console.log('');

  // Step 5: Test users table
  console.log('📋 Étape 5: Test table users...');
  try {
    const userCount = await query('SELECT COUNT(*) as count FROM users');
    console.log(`✅ Table users: ${userCount[0].count} utilisateur(s)`);
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') {
      console.log('⚠️  Table users n\'existe pas encore. Exécutez: node seed.js');
    } else {
      console.error('❌ Erreur:', err.message);
    }
  }
  console.log('');

  console.log('✅ Tous les tests sont passés avec succès!\n');
  process.exit(0);
}

testMySQL().catch(err => {
  console.error('❌ Erreur fatale:', err);
  process.exit(1);
});

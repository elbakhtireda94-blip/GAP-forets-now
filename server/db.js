import mysql from 'mysql2/promise';

const DB_CONFIG = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'anef_field_connect',
};

/** @type {mysql.Pool | null} */
let pool = null;

/**
 * Ensure the MySQL database exists, create it if it doesn't
 * Compatible with XAMPP (user=root, password empty)
 */
export async function ensureDatabaseExists() {
  const dbName = DB_CONFIG.database;
  
  try {
    // Connect to MySQL WITHOUT specifying a database
    const tempConnection = await mysql.createConnection({
      host: DB_CONFIG.host,
      port: DB_CONFIG.port,
      user: DB_CONFIG.user,
      password: DB_CONFIG.password,
    });

    // Check if database exists
    const [databases] = await tempConnection.query(
      'SHOW DATABASES LIKE ?',
      [dbName]
    );

    if (databases.length === 0) {
      // Database doesn't exist, create it
      console.log(`📦 Database '${dbName}' does not exist. Creating...`);
      await tempConnection.query(
        `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );
      console.log(`✅ Database '${dbName}' created successfully`);
    } else {
      console.log(`✅ Database '${dbName}' already exists`);
    }

    await tempConnection.end();
    return true;
  } catch (err) {
    console.error('❌ Failed to ensure database exists');
    console.error(`   Host: ${DB_CONFIG.host}:${DB_CONFIG.port}`);
    console.error(`   User: ${DB_CONFIG.user}`);
    console.error(`   Error: ${err.message}`);

    if (err.code === 'ECONNREFUSED') {
      console.error('\n💡 MySQL is not running.');
      console.error('   Démarre MySQL dans XAMPP (panneau de contrôle XAMPP → Start MySQL)');
      console.error('   Ou via ligne de commande: net start MySQL80');
    } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n💡 MySQL access denied.');
      console.error('   Vérifie MYSQL_USER et MYSQL_PASSWORD dans server/.env');
      console.error('   XAMPP par défaut: user=root, password=(vide)');
    }

    return false;
  }
}

/**
 * Initialize MySQL connection pool
 * Call this AFTER ensureDatabaseExists()
 * @returns {mysql.Pool}
 */
function initializePool() {
  if (!pool) {
    pool = mysql.createPool({
      ...DB_CONFIG,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      timezone: '+00:00',
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    });
    // Log connection details (without password)
    console.log('📦 MySQL Pool initialized');
    console.log(`   Host: ${DB_CONFIG.host}:${DB_CONFIG.port}`);
    console.log(`   User: ${DB_CONFIG.user}`);
    console.log(`   Database: ${DB_CONFIG.database}`);
  }
  return pool;
}

/**
 * Test MySQL connection
 * Call this AFTER ensureDatabaseExists() and initializePool()
 */
export async function testConnection() {
  try {
    if (!pool) {
      initializePool();
    }
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    console.log('✅ MySQL connecté');
    console.log(`   Host: ${DB_CONFIG.host}:${DB_CONFIG.port}`);
    console.log(`   Database: ${DB_CONFIG.database}`);
    return true;
  } catch (err) {
    console.error('❌ MySQL connection test failed');
    console.error(`   Error: ${err.message}`);

    if (err.code === 'ECONNREFUSED') {
      console.error('\n💡 MySQL is not running.');
      console.error('   Démarre MySQL dans XAMPP (panneau de contrôle XAMPP → Start MySQL)');
    } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n💡 MySQL access denied.');
      console.error('   Vérifie MYSQL_USER et MYSQL_PASSWORD dans server/.env');
    }

    return false;
  }
}

/**
 * Get MySQL connection pool
 * Automatically initializes if not already done
 * @returns {mysql.Pool}
 */
export function getPool() {
  if (!pool) {
    initializePool();
  }
  return pool;
}

/**
 * Execute a SQL query
 * @param {string} sql - SQL query string
 * @param {any[]} [params] - Query parameters
 * @returns {Promise<any[]>}
 */
export async function query(sql, params = []) {
  const p = getPool();
  const [rows] = await p.execute(sql, params);
  return rows;
}

/**
 * Execute a SQL query and return first row or null
 * @param {string} sql - SQL query string
 * @param {any[]} [params] - Query parameters
 * @returns {Promise<any | null>}
 */
export async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] ?? null;
}

import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import os from 'os';
import { authMiddleware, requireAuth } from './auth.js';
import authRoutes from './auth.js';
import cahierJournal from './routes/cahierJournal.js';
import regions from './routes/regions.js';
import pdfcp from './routes/pdfcp.js';
import ai from './routes/ai.js';
import { ensureDatabaseExists, testConnection, query } from './db.js';

// ——— Global error handlers (anti-crash: log and exit so process doesn’t run in undefined state) ———
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[unhandledRejection]', reason, promise);
  process.exit(1);
});

const app = express();
const isDev = process.env.NODE_ENV !== 'production';
// In dev, force PORT=3002 (no fallback). In production, use PORT env or default 3001
const PORT = isDev ? (Number(process.env.PORT) || 3002) : (Number(process.env.PORT) || 3001);
const CORS_ORIGIN = process.env.CORS_ORIGIN || (isDev ? 'http://localhost:8084' : 'http://localhost:8080');

// CORS dev: explicit origins for front (Vite peut utiliser 8080-8087 si ports occupés)
const allowedOrigins = [
  CORS_ORIGIN,
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://localhost:8081',
  'http://127.0.0.1:8081',
  'http://localhost:8082',
  'http://127.0.0.1:8082',
  'http://localhost:8083',
  'http://127.0.0.1:8083',
  'http://localhost:8084',
  'http://127.0.0.1:8084',
  'http://localhost:8085',
  'http://127.0.0.1:8085',
  'http://localhost:8086',
  'http://127.0.0.1:8086',
  'http://localhost:8087',
  'http://127.0.0.1:8087',
  'http://localhost:8088',
  'http://127.0.0.1:8088',
  'http://localhost:8089',
  'http://127.0.0.1:8089',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  // Network access (IP-based)
  'http://10.7.2.42:8080',
  'http://10.7.2.42:8081',
  'http://10.7.2.42:8082',
  'http://10.7.2.42:8083',
  'http://10.7.2.42:8084',
  'http://10.7.2.42:8085',
  'http://10.7.2.42:8086',
  'http://10.7.2.42:8087',
  'http://10.7.2.42:8088',
  'http://10.7.2.42:8089',
  'http://10.7.2.42:5173',
  // Réseau local (ex. GAP Forêts)
  'http://192.168.11.104:8080',
  'http://192.168.11.104:8081',
  'http://192.168.11.104:8082',
  'http://192.168.11.104:8084',
  'http://192.168.11.104:5173',
];
const corsOptions = {
  origin: isDev
    ? true
    : (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        return callback(null, false);
      },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));
app.use(express.json());

// ——— Public routes (no auth): /health first — never blocked by DB or auth ———
app.get('/health', (_req, res) => {
  res.json({ ok: true });
});
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, db: 'mysql' });
});

// Debug endpoint to test MySQL connection
app.get('/api/debug/db', async (_req, res) => {
  try {
    const rows = await query('SELECT 1 as test, NOW() as timestamp, DATABASE() as current_db');
    res.json({ 
      ok: true, 
      db: 'mysql',
      connection: 'active',
      timestamp: rows[0].timestamp,
      database: rows[0].current_db
    });
  } catch (err) {
    res.status(500).json({ 
      ok: false, 
      error: err.message,
      code: err.code 
    });
  }
});

// Debug: vérifier que les comptes démo existent en base + profils (pour diagnostic connexion)
app.get('/api/debug/demo-users', async (_req, res) => {
  try {
    const rows = await query(
      'SELECT id, email, (password_hash IS NOT NULL AND password_hash != "") AS has_password FROM users WHERE email IN (?, ?)',
      ['demo@anef.ma', 'adp.demo@anef.ma']
    );
    const demo = rows.find(r => r.email === 'demo@anef.ma');
    const adpDemo = rows.find(r => r.email === 'adp.demo@anef.ma');
    const demoProfile = demo ? await query('SELECT id FROM profiles WHERE user_id = ?', [demo.id]).then(r => r[0]) : null;
    const adpProfile = adpDemo ? await query('SELECT id FROM profiles WHERE user_id = ?', [adpDemo.id]).then(r => r[0]) : null;
    res.json({
      database: process.env.MYSQL_DATABASE || 'anef_field_connect',
      demo: demo ? { exists: true, hasPassword: Boolean(demo.has_password), hasProfile: !!demoProfile } : { exists: false, hasPassword: false, hasProfile: false },
      adp_demo: adpDemo ? { exists: true, hasPassword: Boolean(adpDemo.has_password), hasProfile: !!adpProfile } : { exists: false, hasPassword: false, hasProfile: false },
      hint: 'Si hasProfile false, exécuter: cd server && node seed.js. Mot de passe: Password1 (P majuscule).',
    });
  } catch (err) {
    res.status(500).json({ error: err.message, code: err.code });
  }
});

app.use(authMiddleware);

app.use('/api/auth', authRoutes);
app.use('/api/ai', ai);
app.use('/ai', ai);

// Protected routes (require authentication)
app.use(requireAuth);
app.use('/api/cahier-journal-entries', cahierJournal);
app.use('/api/regions', regions);
app.use('/api/pdfcp', pdfcp);

// 404 handler - always return JSON (never HTML)
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found', 
    code: 'NOT_FOUND',
    path: req.path,
    method: req.method,
    hint: `The endpoint ${req.method} ${req.path} does not exist. Check the API documentation.`
  });
});

// Global error handler - always return JSON (never HTML)
app.use((err, req, res, next) => {
  console.error('[Global Error Handler]', { 
    path: req.path, 
    method: req.method, 
    error: err.message,
    stack: isDev ? err.stack : undefined
  });
  res.status(err.status || 500).json({ 
    error: err.message || 'Internal server error',
    code: err.code || 'INTERNAL_ERROR',
    path: req.path,
    method: req.method
  });
});

// Start server: in dev, use PORT exactly (no fallback). In production, try fallback ports.
function tryListen(port) {
  return new Promise((resolve, reject) => {
    // Bind on 0.0.0.0 to allow network access (not just localhost)
    const server = app.listen(port, '0.0.0.0', () => {
      const localUrl = `http://localhost:${port}`;
      // Try to detect network IP
      const interfaces = os.networkInterfaces();
      const networkIPs = [];
      for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name] || []) {
          if (iface.family === 'IPv4' && !iface.internal) {
            networkIPs.push(iface.address);
          }
        }
      }
      const primaryIP = networkIPs[0] || '0.0.0.0';
      console.log(`API listening on ${localUrl} (localhost)`);
      console.log(`API listening on 0.0.0.0:${port} (network accessible)`);
      if (networkIPs.length > 0) {
        console.log(`API accessible from network: http://${primaryIP}:${port}`);
        networkIPs.forEach(ip => {
          if (ip !== primaryIP) console.log(`   Also available: http://${ip}:${port}`);
        });
        // Hint for .env configuration
        if (primaryIP === '10.7.2.42') {
          console.log(`\n💡 Frontend .env: VITE_MYSQL_API_URL=http://10.7.2.42:${port}`);
        }
      } else {
        console.log(`API accessible from network: http://0.0.0.0:${port} (use your machine IP)`);
      }
      resolve(server);
    });
    server.on('error', (err) => reject(err));
  });
}

async function start() {
  // Log MySQL configuration (without password)
  console.log('🔍 MySQL Configuration:');
  console.log(`   Host: ${process.env.MYSQL_HOST || '127.0.0.1'}:${process.env.MYSQL_PORT || 3306}`);
  console.log(`   User: ${process.env.MYSQL_USER || 'root'}`);
  console.log(`   Database: ${process.env.MYSQL_DATABASE || 'anef_field_connect'}`);
  console.log('');

  // Ensure database exists BEFORE testing connection
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

  if (isDev) {
    // In dev: try PORT then 3004, 3005, 3006 si occupé
    const fallbacks = [3004, 3005, 3006].filter((f) => f !== PORT);
    const portsToTry = [PORT, ...fallbacks];
    let listened = false;
    for (const p of portsToTry) {
      try {
        await tryListen(p);
        listened = true;
        if (p !== PORT) {
          console.warn(`\n⚠️ Port ${PORT} was in use. API is running on http://localhost:${p}`);
          console.warn(`   Update root .env: VITE_MYSQL_API_URL=http://localhost:${p}\n`);
        }
        break;
      } catch (err) {
        if (err.code === 'EADDRINUSE' && p !== portsToTry[portsToTry.length - 1]) {
          console.warn(`Port ${p} in use, trying next...`);
        } else {
          console.error(`❌ Port ${p} in use. Free a port or set PORT=3005 (or 3006) in server/.env`);
          process.exit(1);
        }
      }
    }
    if (!listened) process.exit(1);
  } else {
    // In production: try PORT, then 3002, 3003 on EADDRINUSE
    const portsToTry = [PORT, 3002, 3003].filter((p, i, a) => a.indexOf(p) === i);
    for (const p of portsToTry) {
      try {
        await tryListen(p);
        return;
      } catch (err) {
        if (err.code === 'EADDRINUSE') {
          console.warn(`Port ${p} in use, trying next...`);
        } else {
          console.error('Server failed to start:', err);
          process.exit(1);
        }
      }
    }
    console.error('Ports 3001, 3002, 3003 in use. Set PORT in .env (e.g. PORT=3010).');
    process.exit(1);
  }
}

start().catch((err) => {
  console.error('Start error:', err);
  process.exit(1);
});

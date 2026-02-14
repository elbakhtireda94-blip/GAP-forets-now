import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, queryOne } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const router = express.Router();

// Login: POST /api/auth/login { email, password }
// Toujours renvoyer du JSON (jamais HTML/redirect) pour éviter "Unexpected token <"
router.post('/login', async (req, res) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const { email, password } = body;
    const normalizedEmail = email != null ? String(email).trim().toLowerCase() : '';
    console.log('[AUTH] Login attempt:', { email: normalizedEmail || 'missing', hasPassword: !!password });

    if (!normalizedEmail || password == null || String(password).trim() === '') {
      console.log('[AUTH] Missing email or password');
      return res.status(400).json({ ok: false, code: 'MISSING_CREDENTIALS', message: 'Email and password required', error: 'Email and password required' });
    }

    const user = await queryOne(
      'SELECT id, email, password_hash FROM users WHERE email = ?',
      [normalizedEmail]
    );

    if (!user) {
      console.log('[AUTH] User not found:', normalizedEmail);
      return res.status(401).json({ ok: false, code: 'INVALID_CREDENTIALS', message: 'Invalid email or password', error: 'Invalid email or password' });
    }
    console.log('[AUTH] User found:', { id: user.id, email: user.email });

    if (!user.password_hash) {
      console.log('[AUTH] User has no password_hash (run: cd server && npm run seed)');
      return res.status(401).json({ ok: false, code: 'INVALID_CREDENTIALS', message: 'Invalid email or password', error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      console.log('[AUTH] Password mismatch for:', normalizedEmail);
      return res.status(401).json({ ok: false, code: 'INVALID_CREDENTIALS', message: 'Invalid email or password', error: 'Invalid email or password' });
    }

    console.log('[AUTH] ✅ Login successful for:', normalizedEmail);

    const token = jwt.sign(
      { sub: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    return res.json({
      ok: true,
      access_token: token,
      token_type: 'bearer',
      expires_in: 7 * 24 * 60 * 60,
      user: { id: user.id, email: user.email },
    });
  } catch (err) {
    console.error('[AUTH] Login error:', err.message);
    return res.status(500).json({ ok: false, code: 'SERVER_ERROR', message: 'Server error', error: 'Server error' });
  }
});

// Get current user profile (same shape as Supabase get_user_profile RPC)
// GET /api/auth/me  (Authorization: Bearer <token>)
router.get('/me', async (req, res) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const profile = await queryOne(
      `SELECT p.id, p.user_id, p.email, p.full_name, p.role_label, p.dranef_id, p.dpanef_id, p.commune_ids
       FROM profiles p WHERE p.user_id = ?`,
      [userId]
    );
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const roles = await query(
      'SELECT role FROM user_roles WHERE user_id = ? ORDER BY CASE role WHEN "ADMIN" THEN 1 WHEN "NATIONAL" THEN 2 WHEN "REGIONAL" THEN 3 WHEN "PROVINCIAL" THEN 4 WHEN "LOCAL" THEN 5 END LIMIT 1',
      [userId]
    );
    const scope_level = roles[0]?.role || 'LOCAL';
    const commune_ids = profile.commune_ids ? (typeof profile.commune_ids === 'string' ? JSON.parse(profile.commune_ids) : profile.commune_ids) : [];

    return res.json([{
      id: profile.id,
      user_id: profile.user_id,
      email: profile.email,
      full_name: profile.full_name,
      role_label: profile.role_label,
      scope_level,
      dranef_id: profile.dranef_id,
      dpanef_id: profile.dpanef_id,
      commune_ids,
    }]);
  } catch (err) {
    console.error('Me error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// JWT middleware: attach req.auth = { userId }
export function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  const isDev = process.env.NODE_ENV !== 'production';
  
  // DEV bypass: if no Authorization header in dev, create a dev user
  if (isDev && (!header || !header.startsWith('Bearer '))) {
    req.auth = { userId: 'dev-user', role: 'ADMIN' };
    console.log('[Auth] DEV mode: no token, using dev-user');
    return next();
  }
  
  if (!header || !header.startsWith('Bearer ')) {
    return next();
  }
  
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.auth = { userId: payload.sub };
  } catch (_) {
    // invalid or expired - in dev, still allow with dev-user
    if (isDev) {
      req.auth = { userId: 'dev-user', role: 'ADMIN' };
      console.log('[Auth] DEV mode: invalid token, using dev-user');
    }
  }
  next();
}

// Require auth (use after authMiddleware)
export function requireAuth(req, res, next) {
  const hasAuthHeader = !!req.headers.authorization;
  const hasUserId = !!req.auth?.userId;
  
  console.log('[AUTH] requireAuth check:', {
    hasAuthHeader,
    hasUserId,
    method: req.method,
    path: req.path,
    userId: req.auth?.userId || 'none',
  });
  
  if (!hasUserId) {
    console.log('[Auth] ❌ Unauthorized: no userId in req.auth');
    console.log('[Auth] Request headers:', {
      authorization: req.headers.authorization ? 'Bearer ***' : 'missing',
      origin: req.headers.origin,
      method: req.method,
      path: req.path,
    });
    return res.status(401).json({ error: 'Unauthorized' });
  }
  console.log(`[Auth] ✓ Authorized: userId=${req.auth.userId}`);
  next();
}

export default router;

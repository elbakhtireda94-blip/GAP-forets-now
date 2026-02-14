import crypto from 'crypto';
import express from 'express';
import { query, queryOne } from '../db.js';
import { authMiddleware, requireAuth } from '../auth.js';

const router = express.Router({ mergeParams: true });
router.use(authMiddleware);
router.use(requireAuth);

// Helper to normalize MySQL row (convert TINYINT(1) to boolean, parse JSON)
function normalizeRow(row) {
  if (!row) return row;
  const normalized = { ...row };
  // Convert locked (TINYINT(1)) to boolean
  if ('locked' in normalized) normalized.locked = Boolean(normalized.locked);
  // Parse JSON fields if they're strings
  if (normalized.coordinates && typeof normalized.coordinates === 'string') {
    try {
      normalized.coordinates = JSON.parse(normalized.coordinates);
    } catch (_) {
      normalized.coordinates = null;
    }
  }
  if (normalized.preuves && typeof normalized.preuves === 'string') {
    try {
      normalized.preuves = JSON.parse(normalized.preuves);
    } catch (_) {
      normalized.preuves = [];
    }
  }
  // Ensure preuves is always an array
  if (!normalized.preuves || !Array.isArray(normalized.preuves)) {
    normalized.preuves = [];
  }
  return normalized;
}

router.get('/programs', async (req, res) => {
  try {
    const userId = req.auth?.userId || 'anonymous';
    console.log(`[PDFCP GET /programs] User ID: ${userId}`);
    
    const rows = await query('SELECT * FROM pdfcp_programs ORDER BY created_at DESC');
    const count = (rows || []).length;
    console.log(`[PDFCP GET /programs] Success: Found ${count} PDFCP(s)`);
    res.json((rows || []).map(normalizeRow));
  } catch (err) {
    console.error('[PDFCP GET /programs] Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/programs/:id', async (req, res) => {
  try {
    const userId = req.auth?.userId || 'anonymous';
    const pdfcpId = req.params.id;
    console.log(`[PDFCP GET /programs/:id] User ID: ${userId}, PDFCP ID: ${pdfcpId}`);
    
    const row = await queryOne('SELECT * FROM pdfcp_programs WHERE id = ?', [pdfcpId]);
    if (!row) {
      console.log(`[PDFCP GET /programs/:id] Not found: ${pdfcpId}`);
      return res.status(404).json({ error: 'Not found' });
    }
    console.log(`[PDFCP GET /programs/:id] Success: Found PDFCP ${pdfcpId}`);
    res.json(normalizeRow(row));
  } catch (err) {
    console.error('[PDFCP GET /programs/:id] Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/programs', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const body = req.body || {};
    const payloadSize = JSON.stringify(body).length;
    
    // Logging: route appelée + taille payload + id user
    console.log(`[PDFCP POST /programs] User ID: ${userId}, Payload size: ${payloadSize} bytes`);
    console.log(`[PDFCP POST /programs] Payload keys: ${Object.keys(body).join(', ')}`);
    
    if (!userId) {
      console.error('[PDFCP POST /programs] Unauthorized: no user ID');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const id = crypto.randomUUID();
    await query(
      `INSERT INTO pdfcp_programs (id, code, title, description, start_year, end_year, dranef_id, dpanef_id, commune_id, total_budget_dh, validation_status, locked, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        body.code,
        body.title,
        body.description ?? null,
        body.start_year,
        body.end_year,
        body.dranef_id,
        body.dpanef_id,
        body.commune_id ?? null,
        body.total_budget_dh ?? 0,
        body.validation_status || 'BROUILLON',
        body.locked ? 1 : 0,
        userId,
        userId,
      ]
    );
    const row = await queryOne('SELECT * FROM pdfcp_programs WHERE id = ?', [id]);
    console.log(`[PDFCP POST /programs] Success: Created PDFCP ${id}`);
    res.status(201).json(normalizeRow(row));
  } catch (err) {
    console.error('[PDFCP POST /programs] Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/programs/:id', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { id } = req.params;
    const body = req.body || {};
    const allowed = ['validation_status', 'locked', 'unlock_motif', 'annulation_motif', 'updated_by', 'title', 'description', 'total_budget_dh', 'commune_id'];
    const updates = [];
    const values = [];
    for (const key of allowed) {
      if (body[key] !== undefined) {
        if (key === 'locked') {
          updates.push('locked = ?');
          values.push(body[key] ? 1 : 0);
        } else {
          updates.push(`${key} = ?`);
          values.push(key === 'updated_by' ? userId : body[key]);
        }
      }
    }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    values.push(id);
    await query(`UPDATE pdfcp_programs SET ${updates.join(', ')} WHERE id = ?`, values);
    const row = await queryOne('SELECT * FROM pdfcp_programs WHERE id = ?', [id]);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(normalizeRow(row));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/programs/:id/actions', async (req, res) => {
  try {
    const pdfcpId = req.params.id;
    const userId = req.auth?.userId || 'anonymous';
    
    // Validate pdfcpId format (UUID)
    if (!pdfcpId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pdfcpId)) {
      console.warn('[GET actions] Invalid pdfcpId format:', { pdfcpId, userId });
      return res.status(400).json({ 
        error: 'Invalid PDFCP ID format', 
        code: 'INVALID_PDFCP_ID',
        pdfcpId 
      });
    }
    
    const rows = await query('SELECT * FROM pdfcp_actions WHERE pdfcp_id = ? ORDER BY year ASC', [pdfcpId]);
    const normalizedRows = (rows || []).map(normalizeRow);
    const count = normalizedRows.length;
    const concerteCount = normalizedRows.filter(r => r.etat === 'CONCERTE').length;
    
    console.log('[GET actions]', { pdfcpId, userId, totalCount: count, concerteCount });
    
    res.json(normalizedRows);
  } catch (err) {
    console.error('[GET actions] Error:', { pdfcpId: req.params.id, userId: req.auth?.userId, error: err.message });
    // Always return JSON, never HTML
    res.status(500).json({ 
      error: 'Server error while fetching actions',
      code: 'SERVER_ERROR',
      message: err.message 
    });
  }
});

/**
 * Calcule le comparatif Plan concerté / CP / Exécuté pour un PDFCP.
 * Groupe par action_key/action_label et agrège les surfaces (physique) par état.
 */
function computeComparatif(actions) {
  // Grouper par action_key (ou action_label si disponible)
  const byAction = new Map();
  
  for (const action of actions) {
    const key = action.action_label || action.action_key;
    if (!byAction.has(key)) {
      byAction.set(key, {
        id: action.id, // Prendre le premier id rencontré
        label: key,
        plan_surface: 0,
        cp_surface: 0,
        exec_surface: 0,
        unite: action.unite || 'ha',
      });
    }
    const group = byAction.get(key);
    
    // Agréger par état
    if (action.etat === 'CONCERTE') {
      group.plan_surface += Number(action.physique) || 0;
    } else if (action.etat === 'CP') {
      group.cp_surface += Number(action.physique) || 0;
    } else if (action.etat === 'EXECUTE') {
      group.exec_surface += Number(action.physique) || 0;
    }
  }
  
  // Calculer taux et statut pour chaque action
  const comparatifActions = Array.from(byAction.values()).map((action) => {
    const plan = action.plan_surface || 0;
    const cp = action.cp_surface || 0;
    const exec = action.exec_surface || 0;
    
    // Taux exécuté vs plan
    const taux_exec_vs_plan = plan > 0 ? Math.round((exec / plan) * 100) : exec > 0 ? 100 : 0;
    
    // Taux exécuté vs CP
    const taux_exec_vs_cp = cp > 0 ? Math.round((exec / cp) * 100) : exec > 0 ? 100 : 0;
    
    // Statut automatique
    let statut = 'non_demarre'; // gris
    if (exec > 0) {
      if (exec >= plan * 0.95 && exec <= plan * 1.05) {
        statut = 'realise'; // vert
      } else if (exec < plan * 0.95) {
        statut = 'derive'; // rouge (sous-exécution)
      } else {
        statut = 'en_cours'; // jaune (sur-exécution acceptable)
      }
    } else if (plan > 0 || cp > 0) {
      statut = 'en_cours'; // jaune (planifié mais pas encore exécuté)
    }
    
    return {
      id: action.id,
      label: action.label,
      plan_surface: Math.round(plan * 100) / 100,
      cp_surface: Math.round(cp * 100) / 100,
      exec_surface: Math.round(exec * 100) / 100,
      taux_exec_vs_plan,
      taux_exec_vs_cp,
      statut,
      unite: action.unite,
    };
  });
  
  // Totaux globaux
  const totals = comparatifActions.reduce(
    (acc, a) => ({
      plan_total: acc.plan_total + a.plan_surface,
      cp_total: acc.cp_total + a.cp_surface,
      exec_total: acc.exec_total + a.exec_surface,
    }),
    { plan_total: 0, cp_total: 0, exec_total: 0 }
  );
  
  const taux_global = totals.plan_total > 0
    ? Math.round((totals.exec_total / totals.plan_total) * 100)
    : totals.exec_total > 0 ? 100 : 0;
  
  return {
    actions: comparatifActions,
    totals: {
      plan_total: Math.round(totals.plan_total * 100) / 100,
      cp_total: Math.round(totals.cp_total * 100) / 100,
      exec_total: Math.round(totals.exec_total * 100) / 100,
      taux_global,
    },
  };
}

/**
 * GET /api/pdfcp/programs/:id/comparatif
 * Retourne le comparatif Plan concerté / CP / Exécuté avec taux et statuts.
 */
router.get('/programs/:id/comparatif', async (req, res) => {
  try {
    const pdfcpId = req.params.id;
    const rows = await query(
      'SELECT * FROM pdfcp_actions WHERE pdfcp_id = ? ORDER BY action_key, year ASC',
      [pdfcpId]
    );
    const actions = (rows || []).map(normalizeRow);
    const comparatif = computeComparatif(actions);
    res.json(comparatif);
  } catch (err) {
    console.error('[pdfcp comparatif] error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/programs/:id/attachments', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM pdfcp_attachments WHERE pdfcp_id = ? ORDER BY created_at DESC', [req.params.id]);
    res.json((rows || []).map(normalizeRow));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/programs/:id/history', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM pdfcp_validation_history WHERE pdfcp_id = ? ORDER BY created_at DESC', [req.params.id]);
    res.json((rows || []).map(normalizeRow));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/programs/:id/history', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const pdfcpId = req.params.id;
    const body = req.body || {};
    const id = crypto.randomUUID();
    await query(
      `INSERT INTO pdfcp_validation_history (id, pdfcp_id, action, from_status, to_status, note, performed_by, performed_by_name, performed_by_role)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, pdfcpId, body.action, body.from_status ?? null, body.to_status ?? null, body.note ?? null, userId, body.performed_by_name ?? null, body.performed_by_role ?? null]
    );
    const row = await queryOne('SELECT * FROM pdfcp_validation_history WHERE id = ?', [id]);
    res.status(201).json(normalizeRow(row));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Actions CRUD
router.post('/programs/:id/actions', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const pdfcpId = req.params.id;
    const body = req.body || {};
    const id = crypto.randomUUID();
    await query(
      `INSERT INTO pdfcp_actions (id, pdfcp_id, commune_id, perimetre_id, site_id, action_key, action_label, year, etat, unite, physique, financier, geometry_type, coordinates, status, created_by, updated_by, source_plan_line_id, source_cp_line_id, justification_ecart, date_realisation, statut_execution, preuves, notes, locked)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        pdfcpId,
        body.commune_id ?? null,
        body.perimetre_id ?? null,
        body.site_id ?? null,
        body.action_key,
        body.action_label ?? null,
        body.year,
        body.etat || 'CONCERTE',
        body.unite,
        body.physique ?? 0,
        body.financier ?? 0,
        body.geometry_type ?? null,
        body.coordinates ? JSON.stringify(body.coordinates) : null,
        body.status || 'draft',
        userId,
        userId,
        body.source_plan_line_id ?? null,
        body.source_cp_line_id ?? null,
        body.justification_ecart ?? null,
        body.date_realisation ?? null,
        body.statut_execution ?? null,
        body.preuves ? JSON.stringify(body.preuves) : '[]',
        body.notes ?? null,
        body.locked ? 1 : 0,
      ]
    );
    const row = await queryOne('SELECT * FROM pdfcp_actions WHERE id = ?', [id]);
    res.status(201).json(normalizeRow(row));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/programs/:pdfcpId/actions/:actionId', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { actionId } = req.params;
    const body = req.body || {};
    const allowed = ['commune_id', 'perimetre_id', 'site_id', 'action_key', 'action_label', 'year', 'etat', 'unite', 'physique', 'financier', 'geometry_type', 'coordinates', 'status', 'updated_by', 'locked', 'source_plan_line_id', 'source_cp_line_id', 'justification_ecart', 'date_realisation', 'statut_execution', 'preuves', 'notes'];
    const updates = [];
    const values = [];
    for (const key of allowed) {
      if (body[key] !== undefined) {
        if (key === 'coordinates' || key === 'preuves') {
          updates.push(`${key} = ?`);
          values.push(body[key] ? JSON.stringify(body[key]) : null);
        } else if (key === 'locked') {
          updates.push('locked = ?');
          values.push(body[key] ? 1 : 0);
        } else if (key === 'updated_by') {
          updates.push('updated_by = ?');
          values.push(userId);
        } else {
          updates.push(`${key} = ?`);
          values.push(body[key]);
        }
      }
    }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    updates.push('updated_at = NOW()');
    values.push(actionId);
    await query(`UPDATE pdfcp_actions SET ${updates.join(', ')} WHERE id = ?`, values);
    const row = await queryOne('SELECT * FROM pdfcp_actions WHERE id = ?', [actionId]);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(normalizeRow(row));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/programs/:pdfcpId/actions/:actionId', async (req, res) => {
  try {
    const { actionId } = req.params;
    await query('DELETE FROM pdfcp_actions WHERE id = ?', [actionId]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Attachments CRUD
router.post('/programs/:id/attachments', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const pdfcpId = req.params.id;
    const body = req.body || {};
    const id = crypto.randomUUID();
    await query(
      `INSERT INTO pdfcp_attachments (id, pdfcp_id, file_name, file_url, file_type, file_size_bytes, description, category, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        pdfcpId,
        body.file_name,
        body.file_url,
        body.file_type ?? null,
        body.file_size_bytes ?? null,
        body.description ?? null,
        body.category || 'general',
        userId,
      ]
    );
    const row = await queryOne('SELECT * FROM pdfcp_attachments WHERE id = ?', [id]);
    res.status(201).json(normalizeRow(row));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/programs/:pdfcpId/attachments/:attachmentId', async (req, res) => {
  try {
    const { attachmentId } = req.params;
    await query('DELETE FROM pdfcp_attachments WHERE id = ?', [attachmentId]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

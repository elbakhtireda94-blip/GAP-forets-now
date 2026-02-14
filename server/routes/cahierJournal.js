import crypto from 'crypto';
import express from 'express';
import { query, queryOne } from '../db.js';
import { authMiddleware, requireAuth } from '../auth.js';

const router = express.Router({ mergeParams: true });
router.use(authMiddleware);
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { adp_user_id, dpanef_id, dranef_id } = req.query;
    let sql = 'SELECT * FROM cahier_journal_entries WHERE 1=1';
    const params = [];
    if (adp_user_id) {
      sql += ' AND adp_user_id = ?';
      params.push(adp_user_id);
    }
    if (dpanef_id) {
      sql += ' AND dpanef_id = ?';
      params.push(dpanef_id);
    }
    if (dranef_id) {
      sql += ' AND dranef_id = ?';
      params.push(dranef_id);
    }
    sql += ' ORDER BY entry_date DESC';
    const rows = await query(sql, params);
    res.json(rows || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const body = req.body || {};
    const id = crypto.randomUUID();
    await query(
      `INSERT INTO cahier_journal_entries (
        id, entry_date, title, description, category, location_text, latitude, longitude,
        pdfcp_id, dranef_id, dpanef_id, commune_id, adp_user_id, user_id,
        attachments, statut_validation, participants_count, organisations_concernees,
        temps_passe_min, priorite, resultats_obtenus, decisions_prises, prochaines_etapes,
        contraintes_rencontrees, besoin_appui_hierarchique, justification_appui,
        perimetre_label, site_label
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        body.entry_date || new Date().toISOString().slice(0, 10),
        body.title,
        body.description,
        body.category ?? null,
        body.location_text ?? null,
        body.latitude ?? null,
        body.longitude ?? null,
        body.pdfcp_id ?? null,
        body.dranef_id,
        body.dpanef_id,
        body.commune_id ?? null,
        body.adp_user_id,
        userId,
        JSON.stringify(body.attachments || []),
        body.statut_validation || 'Brouillon',
        body.participants_count ?? null,
        body.organisations_concernees ? JSON.stringify(body.organisations_concernees) : null,
        body.temps_passe_min ?? null,
        body.priorite || 'Moyenne',
        body.resultats_obtenus ?? null,
        body.decisions_prises ?? null,
        body.prochaines_etapes ?? null,
        body.contraintes_rencontrees ?? null,
        body.besoin_appui_hierarchique ? 1 : 0,
        body.justification_appui ?? null,
        body.perimetre_label ?? null,
        body.site_label ?? null,
      ]
    );
    const row = await queryOne('SELECT * FROM cahier_journal_entries WHERE id = ?', [id]);
    res.status(201).json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { id } = req.params;
    const body = req.body || {};
    const allowed = ['title', 'description', 'category', 'location_text', 'latitude', 'longitude', 'entry_date', 'attachments', 'statut_validation', 'participants_count', 'organisations_concernees', 'temps_passe_min', 'priorite', 'resultats_obtenus', 'decisions_prises', 'prochaines_etapes', 'contraintes_rencontrees', 'besoin_appui_hierarchique', 'justification_appui', 'perimetre_label', 'site_label', 'pdfcp_id', 'commune_id'];
    const updates = [];
    const values = [];
    for (const key of allowed) {
      if (body[key] !== undefined) {
        if (key === 'attachments') {
          updates.push('attachments = ?');
          values.push(JSON.stringify(body[key]));
        } else if (key === 'organisations_concernees') {
          updates.push('organisations_concernees = ?');
          values.push(Array.isArray(body[key]) ? JSON.stringify(body[key]) : body[key]);
        } else if (key === 'besoin_appui_hierarchique') {
          updates.push('besoin_appui_hierarchique = ?');
          values.push(body[key] ? 1 : 0);
        } else {
          updates.push(`${key} = ?`);
          values.push(body[key]);
        }
      }
    }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    values.push(id, userId, userId);
    const sql = `UPDATE cahier_journal_entries SET ${updates.join(', ')} WHERE id = ? AND (user_id = ? OR adp_user_id = ?)`;
    await query(sql, values);
    const row = await queryOne('SELECT * FROM cahier_journal_entries WHERE id = ?', [id]);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { id } = req.params;
    await query('DELETE FROM cahier_journal_entries WHERE id = ? AND (user_id = ? OR adp_user_id = ?)', [id, userId, userId]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

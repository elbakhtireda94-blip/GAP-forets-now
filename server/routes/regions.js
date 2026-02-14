import express from 'express';
import { query } from '../db.js';
import { authMiddleware, requireAuth } from '../auth.js';

const router = express.Router({ mergeParams: true });
router.use(authMiddleware);
router.use(requireAuth);

router.get('/', async (_req, res) => {
  try {
    const regions = await query('SELECT * FROM regions ORDER BY id');
    const dranefList = await query('SELECT * FROM dranef ORDER BY id');
    const dpanefList = await query('SELECT * FROM dpanef ORDER BY id');
    const communesList = await query('SELECT * FROM communes ORDER BY id');

    const dpanefById = Object.fromEntries((dpanefList || []).map((d) => [d.id, { ...d, communes: [] }]));
    (communesList || []).forEach((c) => {
      const d = dpanefById[c.dpanef_id];
      if (d) d.communes.push({ id: c.id, name: c.name });
    });
    const dranefById = Object.fromEntries((dranefList || []).map((d) => [d.id, { ...d, dpanef: [] }]));
    Object.values(dpanefById).forEach((d) => {
      const parent = dranefById[d.dranef_id];
      if (parent) parent.dpanef.push(d);
    });
    const result = (regions || []).map((r) => ({
      ...r,
      dranef: (dranefById[r.id] && dranefById[r.id].dpanef) ? [dranefById[r.id]] : [],
    }));
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

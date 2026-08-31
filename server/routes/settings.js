import express from 'express';
import db from '../db/database.js';
import { DEFAULT_RATES_2026 } from '../services/payrollEngine.js';
import { authenticateToken } from './auth.js';

const router = express.Router();
router.use(authenticateToken);

// GET /api/settings
router.get('/', async (req, res) => {
  try {
    const settings = await db.query('SELECT * FROM system_settings');
    const settingsMap = {};
    for (const s of settings) {
      try {
        settingsMap[s.key] = JSON.parse(s.value);
      } catch (e) {
        settingsMap[s.key] = s.value;
      }
    }

    // Default rates for 2026 if not set
    if (!settingsMap.rates_2026) {
      settingsMap.rates_2026 = DEFAULT_RATES_2026;
    }

    res.json({ success: true, settings: settingsMap });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/settings
router.post('/', async (req, res) => {
  try {
    const { key, value, description } = req.body;
    if (!key || value === undefined) {
      return res.status(400).json({ success: false, message: '키와 값은 필수입니다.' });
    }

    const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);

    await db.run(
      `INSERT INTO system_settings (key, value, description, updated_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        description = excluded.description,
        updated_at = CURRENT_TIMESTAMP`,
      [key, valueStr, description || '']
    );

    res.json({ success: true, message: '설정이 저장되었습니다.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

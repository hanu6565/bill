import express from 'express';
import db from '../db/database.js';
import { authenticateToken } from './auth.js';

const router = express.Router();
router.use(authenticateToken);

// GET /api/stores
router.get('/', async (req, res) => {
  try {
    const stores = await db.query(`
      SELECT s.*, 
             (SELECT COUNT(*) FROM employees WHERE store_id = s.id) as employee_count
      FROM stores s 
      ORDER BY s.id ASC
    `);
    res.json({ success: true, stores });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/stores/:id
router.get('/:id', async (req, res) => {
  try {
    const store = await db.get('SELECT * FROM stores WHERE id = ?', [req.params.id]);
    if (!store) return res.status(404).json({ success: false, message: '매장을 찾을 수 없습니다.' });
    res.json({ success: true, store });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/stores
router.post('/', async (req, res) => {
  try {
    const { name, business_number, ceo_name, address, phone, accident_rate, default_wage_type } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: '매장명은 필수 입력 항목입니다.' });
    }

    const result = await db.run(
      `INSERT INTO stores (name, business_number, ceo_name, address, phone, accident_rate, default_wage_type)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, business_number || '', ceo_name || '', address || '', phone || '', accident_rate || 0.9, default_wage_type || 'MONTHLY']
    );

    const newStore = await db.get('SELECT * FROM stores WHERE id = ?', [result.lastID]);
    res.json({ success: true, store: newStore });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/stores/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, business_number, ceo_name, address, phone, accident_rate, default_wage_type } = req.body;
    await db.run(
      `UPDATE stores 
       SET name = ?, business_number = ?, ceo_name = ?, address = ?, phone = ?, accident_rate = ?, default_wage_type = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [name, business_number, ceo_name, address, phone, accident_rate, default_wage_type, req.params.id]
    );

    const updated = await db.get('SELECT * FROM stores WHERE id = ?', [req.params.id]);
    res.json({ success: true, store: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/stores/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM stores WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: '매장이 삭제되었습니다.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

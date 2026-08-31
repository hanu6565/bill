import express from 'express';
import db from '../db/database.js';
import { authenticateToken } from './auth.js';

const router = express.Router();
router.use(authenticateToken);

// GET /api/dashboard/summary?year_month=2026-09
router.get('/summary', async (req, res) => {
  try {
    const yearMonth = req.query.year_month || new Date().toISOString().substring(0, 7);

    // 1. Overall counts
    const storesCountRow = await db.get('SELECT COUNT(*) as count FROM stores');
    const employeesCountRow = await db.get('SELECT COUNT(*) as count FROM employees WHERE resign_date IS NULL');
    
    // 2. Current month labor cost totals
    const currentMonthTotals = await db.get(
      `SELECT SUM(total_gross_pay) as total_gross, 
              SUM(total_deductions) as total_deductions, 
              SUM(total_net_pay) as total_net,
              COUNT(id) as processed_stores
       FROM payroll_runs 
       WHERE year_month = ?`,
      [yearMonth]
    );

    // 3. Store-by-store breakdown for this month
    const stores = await db.query('SELECT * FROM stores ORDER BY id ASC');
    const storeSummaries = [];

    for (const store of stores) {
      const empCount = await db.get('SELECT COUNT(*) as count FROM employees WHERE store_id = ? AND resign_date IS NULL', [store.id]);
      const run = await db.get('SELECT * FROM payroll_runs WHERE store_id = ? AND year_month = ?', [store.id, yearMonth]);
      
      storeSummaries.push({
        id: store.id,
        name: store.name,
        business_number: store.business_number,
        ceo_name: store.ceo_name,
        default_wage_type: store.default_wage_type,
        accident_rate: store.accident_rate,
        employee_count: empCount ? empCount.count : 0,
        payroll_status: run ? run.status : 'NOT_STARTED',
        total_gross_pay: run ? run.total_gross_pay : 0,
        total_deductions: run ? run.total_deductions : 0,
        total_net_pay: run ? run.total_net_pay : 0,
        confirmed_at: run ? run.confirmed_at : null
      });
    }

    // 4. Monthly Trend (last 6 months)
    const [yStr, mStr] = yearMonth.split('-');
    let currentY = parseInt(yStr, 10);
    let currentM = parseInt(mStr, 10);
    const monthsList = [];

    for (let i = 5; i >= 0; i--) {
      let y = currentY;
      let m = currentM - i;
      while (m <= 0) {
        m += 12;
        y -= 1;
      }
      monthsList.push(`${y}-${String(m).padStart(2, '0')}`);
    }

    const monthlyTrends = [];
    for (const ym of monthsList) {
      const row = await db.get(
        'SELECT SUM(total_gross_pay) as gross, SUM(total_net_pay) as net FROM payroll_runs WHERE year_month = ?',
        [ym]
      );
      monthlyTrends.push({
        year_month: ym,
        total_gross: row && row.gross ? row.gross : 0,
        total_net: row && row.net ? row.net : 0
      });
    }

    res.json({
      success: true,
      year_month: yearMonth,
      overview: {
        total_stores: storesCountRow ? storesCountRow.count : 0,
        total_active_employees: employeesCountRow ? employeesCountRow.count : 0,
        total_gross_pay: currentMonthTotals ? (currentMonthTotals.total_gross || 0) : 0,
        total_deductions: currentMonthTotals ? (currentMonthTotals.total_deductions || 0) : 0,
        total_net_pay: currentMonthTotals ? (currentMonthTotals.total_net || 0) : 0,
        processed_stores: currentMonthTotals ? (currentMonthTotals.processed_stores || 0) : 0
      },
      store_summaries: storeSummaries,
      monthly_trends: monthlyTrends
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

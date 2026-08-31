import express from 'express';
import db from '../db/database.js';
import { calculateEmployeePayroll, DEFAULT_RATES_2026 } from '../services/payrollEngine.js';
import { validatePayrollRun } from '../services/validationService.js';
import { generateWageLedgerExcel, generatePayslipExcel } from '../services/exportService.js';
import { authenticateToken } from './auth.js';

const router = express.Router();
router.use(authenticateToken);

// POST /api/payroll/calculate
router.post('/calculate', async (req, res) => {
  try {
    const { store_id, year_month, force_recalculate } = req.body;
    if (!store_id || !year_month) {
      return res.status(400).json({ success: false, message: '매장ID와 귀속연월(YYYY-MM)은 필수입니다.' });
    }

    // Check existing run
    const existingRun = await db.get(
      'SELECT * FROM payroll_runs WHERE store_id = ? AND year_month = ?',
      [store_id, year_month]
    );

    if (existingRun && existingRun.status === 'CONFIRMED' && !force_recalculate) {
      return res.status(409).json({
        success: false,
        isConfirmed: true,
        message: '해당 월 급여는 이미 [확정]되었습니다. 재계산하려면 먼저 재오픈 절차를 진행해주세요.'
      });
    }

    // Fetch store and active employees
    const store = await db.get('SELECT * FROM stores WHERE id = ?', [store_id]);
    if (!store) return res.status(404).json({ success: false, message: '매장을 찾을 수 없습니다.' });

    const employees = await db.query(
      `SELECT * FROM employees 
       WHERE store_id = ? AND (resign_date IS NULL OR resign_date >= ?) AND hire_date <= ?`,
      [store_id, `${year_month}-01`, `${year_month}-31`]
    );

    if (employees.length === 0) {
      return res.status(400).json({ success: false, message: '해당 월에 재직 중인 직원이 없습니다.' });
    }

    // Upsert payroll_run
    let runId;
    if (existingRun) {
      runId = existingRun.id;
      await db.run(
        `UPDATE payroll_runs 
         SET status = 'INSPECTING', updated_at = CURRENT_TIMESTAMP, snapshot_rates = ?
         WHERE id = ?`,
        [JSON.stringify(DEFAULT_RATES_2026), runId]
      );
    } else {
      const result = await db.run(
        `INSERT INTO payroll_runs (store_id, year_month, status, snapshot_rates)
         VALUES (?, ?, 'INSPECTING', ?)`,
        [store_id, year_month, JSON.stringify(DEFAULT_RATES_2026)]
      );
      runId = result.lastID;
    }

    let totalGrossSum = 0;
    let totalDeductSum = 0;
    let totalNetSum = 0;

    // Calculate for each employee
    for (const emp of employees) {
      const attendance = await db.query(
        'SELECT * FROM attendance WHERE employee_id = ? AND work_date LIKE ?',
        [emp.id, `${year_month}-%`]
      );

      const payroll = calculateEmployeePayroll(emp, attendance, year_month, DEFAULT_RATES_2026, {});

      totalGrossSum += payroll.totalGrossPay;
      totalDeductSum += payroll.totalDeductions;
      totalNetSum += payroll.netPay;

      await db.run(
        `INSERT INTO payroll_details (
          payroll_run_id, employee_id, store_id, year_month, inspected,
          basic_pay, overtime_allowance, night_allowance, holiday_allowance, public_holiday_allowance,
          annual_leave_allowance, weekly_holiday_allowance, attendance_bonus, substitute_allowance,
          car_allowance, bonus, special_allowance, total_gross_pay,
          taxable_income, non_taxable_income,
          national_pension, health_insurance, longterm_care, employment_insurance,
          income_tax, local_income_tax, attendance_deduction, probation_deduction, unreported_diff_deduction,
          total_deductions, net_pay, biz_account_pay, personal_account_pay, calculation_breakdown
        ) VALUES (
          ?, ?, ?, ?, 0,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?
        )
        ON CONFLICT(payroll_run_id, employee_id) DO UPDATE SET
          basic_pay = excluded.basic_pay,
          overtime_allowance = excluded.overtime_allowance,
          night_allowance = excluded.night_allowance,
          holiday_allowance = excluded.holiday_allowance,
          public_holiday_allowance = excluded.public_holiday_allowance,
          annual_leave_allowance = excluded.annual_leave_allowance,
          weekly_holiday_allowance = excluded.weekly_holiday_allowance,
          attendance_bonus = excluded.attendance_bonus,
          substitute_allowance = excluded.substitute_allowance,
          car_allowance = excluded.car_allowance,
          bonus = excluded.bonus,
          special_allowance = excluded.special_allowance,
          total_gross_pay = excluded.total_gross_pay,
          taxable_income = excluded.taxable_income,
          non_taxable_income = excluded.non_taxable_income,
          national_pension = excluded.national_pension,
          health_insurance = excluded.health_insurance,
          longterm_care = excluded.longterm_care,
          employment_insurance = excluded.employment_insurance,
          income_tax = excluded.income_tax,
          local_income_tax = excluded.local_income_tax,
          attendance_deduction = excluded.attendance_deduction,
          probation_deduction = excluded.probation_deduction,
          unreported_diff_deduction = excluded.unreported_diff_deduction,
          total_deductions = excluded.total_deductions,
          net_pay = excluded.net_pay,
          biz_account_pay = excluded.biz_account_pay,
          personal_account_pay = excluded.personal_account_pay,
          calculation_breakdown = excluded.calculation_breakdown,
          updated_at = CURRENT_TIMESTAMP`,
        [
          runId, emp.id, store_id, year_month,
          payroll.basicPay, payroll.overtimeAllowance, payroll.nightAllowance, payroll.holidayAllowance, payroll.publicHolidayAllowance,
          payroll.annualLeaveAllowance, payroll.weeklyHolidayAllowance, payroll.attendanceBonus, payroll.substituteAllowance,
          payroll.carAllowance, payroll.bonus, payroll.specialAllowance, payroll.totalGrossPay,
          payroll.taxableIncome, payroll.nonTaxableIncome,
          payroll.nationalPension, payroll.healthInsurance, payroll.longtermCare, payroll.employmentInsurance,
          payroll.incomeTax, payroll.localIncomeTax, payroll.attendanceDeduction, payroll.probationDeduction, payroll.unreportedDiffDeduction,
          payroll.totalDeductions, payroll.netPay, payroll.bizAccountPay, payroll.personalAccountPay, JSON.stringify(payroll.calculationBreakdown)
        ]
      );
    }

    // Update payroll_run totals
    await db.run(
      `UPDATE payroll_runs 
       SET total_gross_pay = ?, total_deductions = ?, total_net_pay = ?
       WHERE id = ?`,
      [totalGrossSum, totalDeductSum, totalNetSum, runId]
    );

    // Run 6-Rule Validation & Comparison
    const validatedDetails = await validatePayrollRun(runId, store_id, year_month, DEFAULT_RATES_2026);

    const updatedRun = await db.get('SELECT * FROM payroll_runs WHERE id = ?', [runId]);
    res.json({
      success: true,
      run: updatedRun,
      details: validatedDetails,
      message: `${employees.length}명의 급여 계산 및 검수가 완료되었습니다.`
    });
  } catch (err) {
    console.error('Payroll calculation error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/payroll/run?store_id=1&year_month=2026-09
router.get('/run', async (req, res) => {
  try {
    const { store_id, year_month } = req.query;
    if (!store_id || !year_month) {
      return res.status(400).json({ success: false, message: '매장ID와 귀속연월이 필요합니다.' });
    }

    const run = await db.get(
      'SELECT * FROM payroll_runs WHERE store_id = ? AND year_month = ?',
      [store_id, year_month]
    );

    if (!run) {
      return res.json({ success: true, run: null, details: [] });
    }

    // Auto-sync missing active employees into unconfirmed payroll runs
    if (run.status !== 'CONFIRMED') {
      const activeEmployees = await db.query(
        `SELECT * FROM employees 
         WHERE store_id = ? AND (resign_date IS NULL OR resign_date >= ?) AND hire_date <= ?`,
        [store_id, `${year_month}-01`, `${year_month}-31`]
      );
      for (const emp of activeEmployees) {
        const existingDetail = await db.get(
          'SELECT id FROM payroll_details WHERE payroll_run_id = ? AND employee_id = ?',
          [run.id, emp.id]
        );
        if (!existingDetail) {
          const attendance = await db.query(
            'SELECT * FROM attendance WHERE employee_id = ? AND work_date LIKE ?',
            [emp.id, `${year_month}-%`]
          );
          const payroll = calculateEmployeePayroll(emp, attendance, year_month, DEFAULT_RATES_2026, {});
          await db.run(
            `INSERT INTO payroll_details (
              payroll_run_id, employee_id, store_id, year_month, inspected,
              basic_pay, overtime_allowance, night_allowance, holiday_allowance, public_holiday_allowance,
              annual_leave_allowance, weekly_holiday_allowance, attendance_bonus, substitute_allowance,
              car_allowance, bonus, special_allowance, total_gross_pay,
              taxable_income, non_taxable_income,
              national_pension, health_insurance, longterm_care, employment_insurance,
              income_tax, local_income_tax, attendance_deduction, probation_deduction, unreported_diff_deduction,
              total_deductions, net_pay, biz_account_pay, personal_account_pay, calculation_breakdown
            ) VALUES (
              ?, ?, ?, ?, 0,
              ?, ?, ?, ?, ?,
              ?, ?, ?, ?,
              ?, ?, ?, ?,
              ?, ?,
              ?, ?, ?, ?,
              ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?
            )`,
            [
              run.id, emp.id, store_id, year_month,
              payroll.basicPay, payroll.overtimeAllowance, payroll.nightAllowance, payroll.holidayAllowance, payroll.publicHolidayAllowance,
              payroll.annualLeaveAllowance, payroll.weeklyHolidayAllowance, payroll.attendanceBonus, payroll.substituteAllowance,
              payroll.carAllowance, payroll.bonus, payroll.specialAllowance, payroll.totalGrossPay,
              payroll.taxableIncome, payroll.nonTaxableIncome,
              payroll.nationalPension, payroll.healthInsurance, payroll.longtermCare, payroll.employmentInsurance,
              payroll.incomeTax, payroll.localIncomeTax, payroll.attendanceDeduction, payroll.probationDeduction, payroll.unreportedDiffDeduction,
              payroll.totalDeductions, payroll.netPay, payroll.bizAccountPay, payroll.personalAccountPay, JSON.stringify(payroll.calculationBreakdown)
            ]
          );
        }
      }
    }

    const details = await db.query(
      `SELECT pd.*, e.name as employee_name, e.rrn_masked, e.position, e.hire_date, 
              e.employment_type, e.wage_type, e.contract_salary, e.hourly_wage, e.is_dual_reporting, e.payslip_display_mode
       FROM payroll_details pd
       JOIN employees e ON pd.employee_id = e.id
       WHERE pd.payroll_run_id = ?
       ORDER BY pd.id ASC`,
      [run.id]
    );

    // Parse JSON fields
    const parsedDetails = details.map(d => ({
      ...d,
      inspection_warnings: typeof d.inspection_warnings === 'string' ? JSON.parse(d.inspection_warnings || '[]') : d.inspection_warnings,
      comparison_data: typeof d.comparison_data === 'string' ? JSON.parse(d.comparison_data || '{}') : d.comparison_data,
      calculation_breakdown: typeof d.calculation_breakdown === 'string' ? JSON.parse(d.calculation_breakdown || '{}') : d.calculation_breakdown,
    }));

    res.json({ success: true, run, details: parsedDetails });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/payroll/check-employee (Inspection individual / batch check)
router.post('/check-employee', async (req, res) => {
  try {
    const { detail_id, inspected } = req.body;
    if (!detail_id) {
      return res.status(400).json({ success: false, message: 'detail_id가 필요합니다.' });
    }

    await db.run('UPDATE payroll_details SET inspected = ? WHERE id = ?', [inspected ? 1 : 0, detail_id]);
    res.json({ success: true, message: '검수 상태가 업데이트되었습니다.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/payroll/check-all (Batch check all employees)
router.post('/check-all', async (req, res) => {
  try {
    const { run_id, inspected } = req.body;
    if (!run_id) {
      return res.status(400).json({ success: false, message: 'run_id가 필요합니다.' });
    }

    await db.run('UPDATE payroll_details SET inspected = ? WHERE payroll_run_id = ?', [inspected ? 1 : 0, run_id]);
    res.json({ success: true, message: '전체 검수 상태가 업데이트되었습니다.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/payroll/confirm (Lock payroll run)
router.post('/confirm', async (req, res) => {
  try {
    const { run_id } = req.body;
    if (!run_id) return res.status(400).json({ success: false, message: 'run_id가 필요합니다.' });

    // Verify all employees are inspected
    const uninspected = await db.get(
      'SELECT COUNT(*) as count FROM payroll_details WHERE payroll_run_id = ? AND inspected = 0',
      [run_id]
    );

    if (uninspected && uninspected.count > 0) {
      return res.status(400).json({
        success: false,
        message: `아직 검수 확인되지 않은 직원이 ${uninspected.count}명 있습니다. 모든 직원을 검수 완료해야 확정할 수 있습니다.`
      });
    }

    await db.run(
      `UPDATE payroll_runs 
       SET status = 'CONFIRMED', confirmed_at = CURRENT_TIMESTAMP, confirmed_by = ?
       WHERE id = ?`,
      [req.user ? req.user.username : '대표(관리자)', run_id]
    );

    // Audit Log
    await db.run(
      `INSERT INTO audit_logs (action, entity_type, entity_id, details)
       VALUES (?, ?, ?, ?)`,
      ['CONFIRM_PAYROLL', 'payroll_runs', run_id, '급여 계산 최종 확정 완료']
    );

    const updated = await db.get('SELECT * FROM payroll_runs WHERE id = ?', [run_id]);
    res.json({ success: true, run: updated, message: '급여가 최종 [확정]되었습니다. 이제 급여명세서와 임금대장을 발급할 수 있습니다.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/payroll/reopen (Re-open locked payroll)
router.post('/reopen', async (req, res) => {
  try {
    const { run_id, reason } = req.body;
    if (!run_id || !reason) {
      return res.status(400).json({ success: false, message: '재오픈 사유를 반드시 입력해주세요.' });
    }

    await db.run(
      `UPDATE payroll_runs 
       SET status = 'REOPENED', reopened_at = CURRENT_TIMESTAMP, reopened_reason = ?
       WHERE id = ?`,
      [reason, run_id]
    );

    // Audit Log
    await db.run(
      `INSERT INTO audit_logs (action, entity_type, entity_id, details)
       VALUES (?, ?, ?, ?)`,
      ['REOPEN_PAYROLL', 'payroll_runs', run_id, `급여 확정 재오픈 - 사유: ${reason}`]
    );

    const updated = await db.get('SELECT * FROM payroll_runs WHERE id = ?', [run_id]);
    res.json({ success: true, run: updated, message: '급여가 재오픈되었습니다. 근태 또는 수당 수정 후 다시 검수 및 확정을 진행할 수 있습니다.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/payroll/export/wage-ledger-excel
router.get('/export/wage-ledger-excel', async (req, res) => {
  try {
    const { store_id, year_month } = req.query;
    if (!year_month) {
      return res.status(400).json({ success: false, message: '귀속연월이 필요합니다.' });
    }

    let storesList = [];
    if (store_id && store_id !== 'ALL') {
      const store = await db.get('SELECT * FROM stores WHERE id = ?', [store_id]);
      if (store) storesList.push(store);
    } else {
      storesList = await db.query('SELECT * FROM stores ORDER BY id ASC');
    }

    if (storesList.length === 0) {
      return res.status(404).json({ success: false, message: '출력할 매장이 없습니다.' });
    }

    const workbook = await generateWageLedgerExcel(storesList, year_month);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="wage_ledger_${year_month}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Wage Ledger Excel export error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/payroll/export/payslip-excel/:detailId
router.get('/export/payslip-excel/:detailId', async (req, res) => {
  try {
    const workbook = await generatePayslipExcel(req.params.detailId);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="payslip_${req.params.detailId}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Payslip Excel export error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/payroll/history?store_id=1
router.get('/history', async (req, res) => {
  try {
    const { store_id } = req.query;
    let sql = `
      SELECT pr.*, s.name as store_name,
             (SELECT COUNT(*) FROM payroll_details WHERE payroll_run_id = pr.id) as employee_count
      FROM payroll_runs pr
      JOIN stores s ON pr.store_id = s.id
    `;
    const params = [];
    if (store_id && store_id !== 'ALL') {
      sql += ' WHERE pr.store_id = ?';
      params.push(store_id);
    }
    sql += ' ORDER BY pr.year_month DESC, pr.id DESC';

    const runs = await db.query(sql, params);
    res.json({ success: true, runs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

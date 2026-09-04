import express from 'express';
import db from '../db/database.js';
import { encryptText, decryptText, maskRRN } from '../utils/crypto.js';
import { checkProbationEligibility, calculateEmployeePayroll, DEFAULT_RATES_2026 } from '../services/payrollEngine.js';
import { authenticateToken } from './auth.js';
import { pushToSupabase } from '../db/supabaseBridge.js';

const router = express.Router();
router.use(authenticateToken);

// GET /api/employees?store_id=1
router.get('/', async (req, res) => {
  try {
    const { store_id } = req.query;
    let sql = `
      SELECT e.*, s.name as store_name
      FROM employees e
      LEFT JOIN stores s ON e.store_id = s.id
    `;
    const params = [];
    if (store_id) {
      sql += ' WHERE e.store_id = ?';
      params.push(store_id);
    }
    sql += ' ORDER BY e.id ASC';

    const employees = await db.query(sql, params);
    res.json({ success: true, employees });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/employees/:id
router.get('/:id', async (req, res) => {
  try {
    const employee = await db.get(
      `SELECT e.*, s.name as store_name 
       FROM employees e 
       LEFT JOIN stores s ON e.store_id = s.id 
       WHERE e.id = ?`,
      [req.params.id]
    );
    if (!employee) return res.status(404).json({ success: false, message: '직원을 찾을 수 없습니다.' });
    res.json({ success: true, employee });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/employees/:id/unmask-rrn (Admin unmask RRN)
router.post('/:id/unmask-rrn', async (req, res) => {
  try {
    const employee = await db.get('SELECT rrn_encrypted FROM employees WHERE id = ?', [req.params.id]);
    if (!employee) return res.status(404).json({ success: false, message: '직원을 찾을 수 없습니다.' });

    const plainRRN = decryptText(employee.rrn_encrypted);
    res.json({ success: true, rrn: plainRRN });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/employees
router.post('/', async (req, res) => {
  try {
    const {
      store_id, name, rrn, hire_date, resign_date, position, dependents_count,
      is_foreigner, visa_type, employment_type, wage_type, contract_salary, hourly_wage,
      fixed_work_hours, bank_name, account_number, has_car, notes,
      is_dual_reporting, reported_salary, withholding_rate, payslip_display_mode,
      contract_duration_type, is_simple_labor, probation_applicable, probation_start_date, probation_end_date, probation_rate,
      non_taxable_meal, non_taxable_car, non_taxable_overtime, tax_exempt_income_tax, tax_exempt_social_ins,
      ins_national_pension, ins_health, ins_longterm_care, ins_employment, ins_work_accident,
      deduct_income_tax, deduct_local_tax, fixed_national_pension,
      ordinary_wage_items
    } = req.body;

    let targetStoreId = Number(store_id) || 1;
    const storeExists = await db.get('SELECT id FROM stores WHERE id = ?', [targetStoreId]);
    if (!storeExists) {
      const anyStore = await db.get('SELECT id FROM stores LIMIT 1');
      if (anyStore) {
        targetStoreId = anyStore.id;
      } else {
        await db.run("INSERT OR IGNORE INTO stores (id, name, biz_number) VALUES (1, '기본매장', '000-00-00000')");
        targetStoreId = 1;
      }
    }

    if (!name || !hire_date) {
      return res.status(400).json({ success: false, message: '직원 성명과 입사일은 필수 항목입니다.' });
    }

    // Minimum wage check for hourly
    const minWage = DEFAULT_RATES_2026.minimumWage;
    if (wage_type === 'HOURLY' && hourly_wage < minWage) {
      return res.status(400).json({ 
        success: false, 
        message: `시급은 ${DEFAULT_RATES_2026.year}년 최저시급(${minWage.toLocaleString()}원) 이상이어야 합니다.` 
      });
    }

    // Probation legal check
    const isProbationLegal = checkProbationEligibility(contract_duration_type || 'ONE_YEAR_OR_MORE', is_simple_labor);
    const finalProbationApplicable = (probation_applicable && isProbationLegal) ? 1 : 0;

    const rrnEncrypted = rrn ? encryptText(rrn) : '';
    const rrnMasked = rrn ? maskRRN(rrn) : '';

    const result = await db.run(
      `INSERT INTO employees (
        store_id, name, rrn_encrypted, rrn_masked, hire_date, resign_date, position, dependents_count,
        is_foreigner, visa_type, employment_type, wage_type, contract_salary, hourly_wage,
        fixed_work_hours, bank_name, account_number, has_car, notes,
        is_dual_reporting, reported_salary, withholding_rate, payslip_display_mode,
        contract_duration_type, is_simple_labor, probation_applicable, probation_start_date, probation_end_date, probation_rate,
        non_taxable_meal, non_taxable_car, non_taxable_overtime, tax_exempt_income_tax, tax_exempt_social_ins,
        ins_national_pension, ins_health, ins_longterm_care, ins_employment, ins_work_accident,
        deduct_income_tax, deduct_local_tax, fixed_national_pension,
        ordinary_wage_items
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?
      )`,
      [
        targetStoreId, name.trim(), rrnEncrypted, rrnMasked, hire_date, resign_date || null, position || '직원', dependents_count || 1,
        is_foreigner ? 1 : 0, visa_type || null, employment_type || 'REGULAR', wage_type || 'MONTHLY', contract_salary || 0, hourly_wage || minWage,
        fixed_work_hours || '10:00~22:00', bank_name || '', account_number || '', has_car ? 1 : 0, notes || '',
        is_dual_reporting ? 1 : 0, reported_salary || 0, withholding_rate || 10.0, payslip_display_mode || 'SPLIT_PAY',
        contract_duration_type || 'ONE_YEAR_OR_MORE', is_simple_labor ? 1 : 0, finalProbationApplicable, probation_start_date || hire_date, probation_end_date || null, probation_rate || 90.0,
        non_taxable_meal ? 1 : 0, non_taxable_car ? 1 : 0, non_taxable_overtime ? 1 : 0, tax_exempt_income_tax ? 1 : 0, tax_exempt_social_ins ? 1 : 0,
        ins_national_pension !== undefined ? (ins_national_pension ? 1 : 0) : 1,
        ins_health !== undefined ? (ins_health ? 1 : 0) : 1,
        ins_longterm_care !== undefined ? (ins_longterm_care ? 1 : 0) : 1,
        ins_employment !== undefined ? (ins_employment ? 1 : 0) : 1,
        ins_work_accident !== undefined ? (ins_work_accident ? 1 : 0) : 1,
        deduct_income_tax !== undefined ? (deduct_income_tax ? 1 : 0) : 1,
        deduct_local_tax !== undefined ? (deduct_local_tax ? 1 : 0) : 1,
        fixed_national_pension ? parseInt(fixed_national_pension, 10) : 0,
        ordinary_wage_items ? JSON.stringify(ordinary_wage_items) : '["basic_pay"]'
      ]
    );

    const newEmp = await db.get('SELECT * FROM employees WHERE id = ?', [result.lastID]);

    // Auto-sync unconfirmed payroll runs for this store
    try {
      const unconfirmedRuns = await db.query(
        "SELECT * FROM payroll_runs WHERE store_id = ? AND status != 'CONFIRMED'",
        [store_id]
      );
      for (const run of unconfirmedRuns) {
        const attendance = await db.query(
          'SELECT * FROM attendance WHERE employee_id = ? AND work_date LIKE ?',
          [newEmp.id, `${run.year_month}-%`]
        );
        const payroll = calculateEmployeePayroll(newEmp, attendance, run.year_month, DEFAULT_RATES_2026, {});
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
          ON CONFLICT(payroll_run_id, employee_id) DO NOTHING`,
          [
            run.id, newEmp.id, store_id, run.year_month,
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
    } catch (syncErr) {
      console.error('Error auto-syncing payroll run on create:', syncErr);
    }

    await pushToSupabase('employees', newEmp);
    res.json({ success: true, employee: newEmp });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/employees/:id
router.put('/:id', async (req, res) => {
  try {
    const {
      store_id, name, rrn, hire_date, resign_date, position, dependents_count,
      is_foreigner, visa_type, employment_type, wage_type, contract_salary, hourly_wage,
      fixed_work_hours, bank_name, account_number, has_car, notes,
      is_dual_reporting, reported_salary, withholding_rate, payslip_display_mode,
      contract_duration_type, is_simple_labor, probation_applicable, probation_start_date, probation_end_date, probation_rate,
      non_taxable_meal, non_taxable_car, non_taxable_overtime, tax_exempt_income_tax, tax_exempt_social_ins,
      ins_national_pension, ins_health, ins_longterm_care, ins_employment, ins_work_accident,
      deduct_income_tax, deduct_local_tax, fixed_national_pension,
      ordinary_wage_items
    } = req.body;

    const existing = await db.get('SELECT * FROM employees WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ success: false, message: '직원을 찾을 수 없습니다.' });

    // Minimum wage check for hourly
    const minWage = DEFAULT_RATES_2026.minimumWage;
    if (wage_type === 'HOURLY' && hourly_wage < minWage) {
      return res.status(400).json({ 
        success: false, 
        message: `시급은 ${DEFAULT_RATES_2026.year}년 최저시급(${minWage.toLocaleString()}원) 이상이어야 합니다.` 
      });
    }

    // Probation legal check
    const isProbationLegal = checkProbationEligibility(contract_duration_type || 'ONE_YEAR_OR_MORE', is_simple_labor);
    const finalProbationApplicable = (probation_applicable && isProbationLegal) ? 1 : 0;

    let rrnEncrypted = existing.rrn_encrypted;
    let rrnMasked = existing.rrn_masked;
    if (rrn && !rrn.includes('*')) {
      rrnEncrypted = encryptText(rrn);
      rrnMasked = maskRRN(rrn);
    }

    let targetStoreId = store_id !== undefined ? (Number(store_id) || existing.store_id || 1) : (existing.store_id || 1);
    const storeExists = await db.get('SELECT id FROM stores WHERE id = ?', [targetStoreId]);
    if (!storeExists) {
      const anyStore = await db.get('SELECT id FROM stores LIMIT 1');
      targetStoreId = anyStore ? anyStore.id : 1;
    }
    const targetName = name || existing.name;
    const targetHireDate = hire_date || existing.hire_date;
    const targetResignDate = resign_date !== undefined ? resign_date : existing.resign_date;
    const targetPosition = position || existing.position;
    const targetDependents = dependents_count !== undefined ? dependents_count : existing.dependents_count;
    const targetIsForeigner = is_foreigner !== undefined ? (is_foreigner ? 1 : 0) : existing.is_foreigner;
    const targetVisaType = visa_type !== undefined ? visa_type : existing.visa_type;
    const targetEmploymentType = employment_type || existing.employment_type;
    const targetWageType = wage_type || existing.wage_type;
    const targetContractSalary = contract_salary !== undefined ? contract_salary : existing.contract_salary;
    const targetHourlyWage = hourly_wage !== undefined ? hourly_wage : existing.hourly_wage;
    const targetFixedWorkHours = fixed_work_hours !== undefined ? fixed_work_hours : existing.fixed_work_hours;
    const targetBankName = bank_name !== undefined ? bank_name : existing.bank_name;
    const targetAccountNumber = account_number !== undefined ? account_number : existing.account_number;
    const targetHasCar = has_car !== undefined ? (has_car ? 1 : 0) : existing.has_car;
    const targetNotes = notes !== undefined ? notes : existing.notes;
    const targetIsDual = is_dual_reporting !== undefined ? (is_dual_reporting ? 1 : 0) : existing.is_dual_reporting;
    const targetReportedSalary = reported_salary !== undefined ? reported_salary : existing.reported_salary;
    const targetWithholdingRate = withholding_rate !== undefined ? withholding_rate : existing.withholding_rate;
    const targetDisplayMode = payslip_display_mode !== undefined ? payslip_display_mode : existing.payslip_display_mode;
    const targetInsNP = ins_national_pension !== undefined ? (ins_national_pension ? 1 : 0) : (existing.ins_national_pension !== undefined ? existing.ins_national_pension : 1);
    const targetInsHI = ins_health !== undefined ? (ins_health ? 1 : 0) : (existing.ins_health !== undefined ? existing.ins_health : 1);
    const targetInsLTC = ins_longterm_care !== undefined ? (ins_longterm_care ? 1 : 0) : (existing.ins_longterm_care !== undefined ? existing.ins_longterm_care : 1);
    const targetInsEI = ins_employment !== undefined ? (ins_employment ? 1 : 0) : (existing.ins_employment !== undefined ? existing.ins_employment : 1);
    const targetInsWA = ins_work_accident !== undefined ? (ins_work_accident ? 1 : 0) : (existing.ins_work_accident !== undefined ? existing.ins_work_accident : 1);
    const targetDeductIT = deduct_income_tax !== undefined ? (deduct_income_tax ? 1 : 0) : (existing.deduct_income_tax !== undefined ? existing.deduct_income_tax : 1);
    const targetDeductLT = deduct_local_tax !== undefined ? (deduct_local_tax ? 1 : 0) : (existing.deduct_local_tax !== undefined ? existing.deduct_local_tax : 1);
    const targetFixedNP = fixed_national_pension !== undefined ? (parseInt(fixed_national_pension, 10) || 0) : (existing.fixed_national_pension || 0);

    await db.run(
      `UPDATE employees SET
        store_id = ?, name = ?, rrn_encrypted = ?, rrn_masked = ?, hire_date = ?, resign_date = ?, position = ?, dependents_count = ?,
        is_foreigner = ?, visa_type = ?, employment_type = ?, wage_type = ?, contract_salary = ?, hourly_wage = ?,
        fixed_work_hours = ?, bank_name = ?, account_number = ?, has_car = ?, notes = ?,
        is_dual_reporting = ?, reported_salary = ?, withholding_rate = ?, payslip_display_mode = ?,
        contract_duration_type = ?, is_simple_labor = ?, probation_applicable = ?, probation_start_date = ?, probation_end_date = ?, probation_rate = ?,
        non_taxable_meal = ?, non_taxable_car = ?, non_taxable_overtime = ?, tax_exempt_income_tax = ?, tax_exempt_social_ins = ?,
        ins_national_pension = ?, ins_health = ?, ins_longterm_care = ?, ins_employment = ?, ins_work_accident = ?,
        deduct_income_tax = ?, deduct_local_tax = ?, fixed_national_pension = ?,
        ordinary_wage_items = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        targetStoreId, targetName, rrnEncrypted, rrnMasked, targetHireDate, targetResignDate || null, targetPosition, targetDependents || 1,
        targetIsForeigner, targetVisaType || null, targetEmploymentType, targetWageType, targetContractSalary || 0, targetHourlyWage || minWage,
        targetFixedWorkHours, targetBankName, targetAccountNumber, targetHasCar, targetNotes || '',
        targetIsDual, targetReportedSalary || 0, targetWithholdingRate || 10.0, targetDisplayMode || 'SPLIT_PAY',
        contract_duration_type || existing.contract_duration_type || 'ONE_YEAR_OR_MORE', is_simple_labor !== undefined ? (is_simple_labor ? 1 : 0) : existing.is_simple_labor, finalProbationApplicable, probation_start_date || existing.probation_start_date, probation_end_date || existing.probation_end_date, probation_rate || existing.probation_rate,
        non_taxable_meal !== undefined ? (non_taxable_meal ? 1 : 0) : existing.non_taxable_meal, non_taxable_car !== undefined ? (non_taxable_car ? 1 : 0) : existing.non_taxable_car, non_taxable_overtime !== undefined ? (non_taxable_overtime ? 1 : 0) : existing.non_taxable_overtime, tax_exempt_income_tax !== undefined ? (tax_exempt_income_tax ? 1 : 0) : existing.tax_exempt_income_tax, tax_exempt_social_ins !== undefined ? (tax_exempt_social_ins ? 1 : 0) : existing.tax_exempt_social_ins,
        targetInsNP, targetInsHI, targetInsLTC, targetInsEI, targetInsWA,
        targetDeductIT, targetDeductLT, targetFixedNP,
        ordinary_wage_items ? JSON.stringify(ordinary_wage_items) : (existing.ordinary_wage_items || '["basic_pay"]'),
        req.params.id
      ]
    );

    const updated = await db.get('SELECT * FROM employees WHERE id = ?', [req.params.id]);

    // Automatically synchronize unconfirmed payroll runs for this store
    try {
      const unconfirmedRuns = await db.query(
        "SELECT * FROM payroll_runs WHERE store_id = ? AND status != 'CONFIRMED'",
        [targetStoreId]
      );
      for (const run of unconfirmedRuns) {
        const attendance = await db.query(
          'SELECT * FROM attendance WHERE employee_id = ? AND work_date LIKE ?',
          [updated.id, `${run.year_month}-%`]
        );
        const payroll = calculateEmployeePayroll(updated, attendance, run.year_month, DEFAULT_RATES_2026, {});
        
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
            calculation_breakdown = excluded.calculation_breakdown`,
          [
            run.id, updated.id, store_id, run.year_month,
            payroll.basicPay, payroll.overtimeAllowance, payroll.nightAllowance, payroll.holidayAllowance, payroll.publicHolidayAllowance,
            payroll.annualLeaveAllowance, payroll.weeklyHolidayAllowance, payroll.attendanceBonus, payroll.substituteAllowance,
            payroll.carAllowance, payroll.bonus, payroll.specialAllowance, payroll.totalGrossPay,
            payroll.taxableIncome, payroll.nonTaxableIncome,
            payroll.nationalPension, payroll.healthInsurance, payroll.longtermCare, payroll.employmentInsurance,
            payroll.incomeTax, payroll.localIncomeTax, payroll.attendanceDeduction, payroll.probationDeduction, payroll.unreportedDiffDeduction,
            payroll.totalDeductions, payroll.netPay, payroll.bizAccountPay, payroll.personalAccountPay,
            JSON.stringify(payroll.calculationBreakdown)
          ]
        );
      }
    } catch (syncErr) {
      console.error('Error auto-syncing payroll run:', syncErr);
    }

    await pushToSupabase('employees', updated);
    res.json({ success: true, employee: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/employees/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM employees WHERE id = ?', [req.params.id]);
    await pushToSupabase('employees', { id: req.params.id }, 'delete');
    res.json({ success: true, message: '직원 정보가 삭제되었습니다.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

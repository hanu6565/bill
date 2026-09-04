import test from 'node:test';
import assert from 'node:assert/strict';
import db from '../db/database.js';
import { initHolidays } from '../services/holidayService.js';
import { 
  calculateEmployeePayroll, 
  calculateProratedBasicPay, 
  calculateIncomeTax, 
  calculateOrdinaryHourlyWage,
  DEFAULT_RATES_2026 
} from '../services/payrollEngine.js';
import { calculateDayHours } from '../routes/attendance.js';
import { generateWageLedgerExcel, generatePayslipExcel } from '../services/exportService.js';

test('INIT: Setup SQLite Database & Statutory Public Holidays', async () => {
  await db.initDatabase();
  await initHolidays();
  assert.ok(true);
});

test('SIMULATION SUITE 1: 2026 4-Major Insurance & Income Tax Statutory Formulas', async () => {
  // 1. National Pension, Health, Long-Term Care, Employment Insurances on Gross / Reported Base
  const empReported = {
    id: 1, store_id: 1, wage_type: 'MONTHLY', contract_salary: 3000000,
    reported_salary: 3000000, hire_date: '2025-01-01', dependents_count: 1, is_dual_reporting: 0
  };
  const pReported = calculateEmployeePayroll(empReported, [], '2026-09', DEFAULT_RATES_2026);
  assert.equal(pReported.nationalPension, 135000);   // 3,000,000 * 0.045 = 135,000
  assert.equal(pReported.healthInsurance, 106350);   // 3,000,000 * 0.03545 = 106,350
  assert.equal(pReported.longtermCare, 13770);       // 106,350 * 0.1295 = 13,772 -> 13,770 (10원 절사)
  assert.equal(pReported.employmentInsurance, 27000); // 3,000,000 * 0.009 = 27,000

  // 2. National Pension Fixed Decision Amount (결정고지금액 우선 적용)
  const empFixedNP = {
    id: 2, store_id: 1, wage_type: 'MONTHLY', contract_salary: 4000000,
    fixed_national_pension: 152000, hire_date: '2025-01-01', dependents_count: 1, is_dual_reporting: 0
  };
  const pFixed = calculateEmployeePayroll(empFixedNP, [], '2026-09', DEFAULT_RATES_2026);
  assert.equal(pFixed.nationalPension, 152000); // Fixed amount applied instead of 4,000,000 * 0.045

  // 3. Age Exemptions: >= 60 for Pension, >= 65 for Employment Insurance
  const empAge62 = {
    id: 3, store_id: 1, wage_type: 'MONTHLY', contract_salary: 3000000,
    rrn_masked: '630510-1******', hire_date: '2025-01-01', dependents_count: 1, is_dual_reporting: 0
  };
  const pAge62 = calculateEmployeePayroll(empAge62, [], '2026-09', DEFAULT_RATES_2026);
  assert.equal(pAge62.nationalPension, 0); // 만 63세 국민연금 면제
  assert.ok(pAge62.employmentInsurance > 0); // 만 63세 고용보험 부과

  const empAge66 = {
    id: 4, store_id: 1, wage_type: 'MONTHLY', contract_salary: 3000000,
    rrn_masked: '590215-1******', hire_date: '2025-01-01', dependents_count: 1, is_dual_reporting: 0
  };
  const pAge66 = calculateEmployeePayroll(empAge66, [], '2026-09', DEFAULT_RATES_2026);
  assert.equal(pAge66.nationalPension, 0); // 만 67세 국민연금 면제
  assert.equal(pAge66.employmentInsurance, 0); // 만 67세 고용보험(실업급여) 면제
});

test('SIMULATION SUITE 2: Half-Day Leave & Attendance Decomposition', async () => {
  // 1. Half-day leave with 5h actual work
  const day5h = await calculateDayHours('2026-09-02', '10:00', '16:00', 60, 0, 0, 0, 1);
  assert.equal(day5h.net_work_hours, 5.0);
  assert.equal(day5h.regular_hours, 5.0);
  assert.equal(day5h.overtime_hours, 0.0);
  assert.equal(day5h.day_type, 'HALF_ANNUAL_LEAVE');

  // 2. Half-day leave with 9h actual work (8h regular + 1h overtime)
  const day9h = await calculateDayHours('2026-09-03', '10:00', '20:00', 60, 0, 0, 0, 1);
  assert.equal(day9h.net_work_hours, 9.0);
  assert.equal(day9h.regular_hours, 8.0);
  assert.equal(day9h.overtime_hours, 1.0);
  assert.equal(day9h.day_type, 'HALF_ANNUAL_LEAVE');

  // 3. Overnight shift crossing midnight (20:00 to 04:00 with 60m break -> 7h net, 5h night)
  const nightShift = await calculateDayHours('2026-09-04', '20:00', '04:00', 60, 0, 0, 0, 0);
  assert.equal(nightShift.net_work_hours, 7.0);
  assert.ok(nightShift.night_hours >= 5.0);
});

test('SIMULATION SUITE 3: Comprehensive Dual-Reporting & Split Payment Accounting', async () => {
  // Store Manager: Total 4,200,000 KRW, Reported 2,500,000 KRW, Withholding Rate 10%
  const manager = {
    id: 10,
    store_id: 1,
    name: '홍길동',
    wage_type: 'MONTHLY',
    contract_salary: 4200000,
    hire_date: '2024-03-01',
    dependents_count: 1,
    is_dual_reporting: 1,
    reported_salary: 2500000,
    withholding_rate: 10.0,
    payslip_display_mode: 'SPLIT_PAY'
  };

  const payroll = calculateEmployeePayroll(manager, [], '2026-09', DEFAULT_RATES_2026);

  // Invariant 1: Total Gross Pay
  assert.equal(payroll.totalGrossPay, 4200000);

  // Invariant 2: Unreported Difference & 10% Withholding
  const diff = 4200000 - 2500000; // 1,700,000
  const expectedWithholding = Math.floor((diff * 0.10) / 10) * 10; // 170,000
  assert.equal(payroll.unreportedDiffDeduction, expectedWithholding);

  // Invariant 3: Personal Account Pay = diff - withholding
  assert.equal(payroll.personalAccountPay, diff - expectedWithholding); // 1,530,000

  // Invariant 4: Net Pay = Gross Pay - Total Deductions
  assert.equal(payroll.netPay, payroll.totalGrossPay - payroll.totalDeductions);

  // Invariant 5: Net Pay = Biz Account Pay + Personal Account Pay
  assert.equal(payroll.netPay, payroll.bizAccountPay + payroll.personalAccountPay);
});

test('SIMULATION SUITE 4: Hourly Wage Part-Timer Weekly Holiday & Overtime', async () => {
  const partTimer = {
    id: 20,
    store_id: 1,
    name: '알바생',
    wage_type: 'HOURLY',
    hourly_wage: 10500,
    hire_date: '2026-09-01',
    dependents_count: 1,
    is_dual_reporting: 0
  };

  // Week 1: 5 days * 5 hours = 25 hours (>= 15 hours -> Weekly Holiday Pay eligible)
  const attendance = [
    { work_date: '2026-09-01', net_work_hours: 5, regular_hours: 5, overtime_hours: 0, night_hours: 0 },
    { work_date: '2026-09-02', net_work_hours: 5, regular_hours: 5, overtime_hours: 0, night_hours: 0 },
    { work_date: '2026-09-03', net_work_hours: 5, regular_hours: 5, overtime_hours: 0, night_hours: 0 },
    { work_date: '2026-09-04', net_work_hours: 5, regular_hours: 5, overtime_hours: 0, night_hours: 0 },
    { work_date: '2026-09-05', net_work_hours: 5, regular_hours: 5, overtime_hours: 0, night_hours: 0 },
  ];

  const payroll = calculateEmployeePayroll(partTimer, attendance, '2026-09', DEFAULT_RATES_2026);
  
  // Basic Pay: 25h * 10,500 = 262,500
  assert.equal(payroll.basicPay, 262500);

  // Weekly Holiday Pay: (25 / 40) * 8h = 5.0h * 10,500 = 52,500
  assert.equal(payroll.weeklyHolidayAllowance, 52500);

  // Total Gross Pay: 262,500 + 52,500 = 315,000
  assert.equal(payroll.totalGrossPay, 315000);
});

test('SIMULATION SUITE 5: Full Store Lifecycle & Payroll Lock Workflow', async () => {
  // 1. Create a simulated store
  const storeRes = await db.run(
    "INSERT INTO stores (name, biz_number, ceo_name) VALUES ('시뮬레이션매장', '123-45-67890', '테스트대표')"
  );
  const storeId = storeRes.lastID;
  assert.ok(storeId > 0);

  // 2. Register multiple employees
  const empRes1 = await db.run(
    `INSERT INTO employees (
      store_id, name, hire_date, position, wage_type, contract_salary, is_dual_reporting, reported_salary, withholding_rate
    ) VALUES (?, '김점장', '2026-01-01', '점장', 'MONTHLY', 4000000, 1, 2500000, 10.0)`,
    [storeId]
  );
  const empId1 = empRes1.lastID;

  const empRes2 = await db.run(
    `INSERT INTO employees (
      store_id, name, hire_date, position, wage_type, contract_salary, fixed_national_pension
    ) VALUES (?, '이과장', '2026-01-01', '과장', 'MONTHLY', 3500000, 140000)`,
    [storeId]
  );
  const empId2 = empRes2.lastID;

  // 3. Add attendance records (including half-day leave)
  await db.run(
    `INSERT INTO attendance (
      employee_id, store_id, work_date, clock_in, clock_out, break_minutes, net_work_hours, regular_hours, is_half_annual_leave
    ) VALUES (?, ?, '2026-09-01', '10:00', '16:00', 60, 5.0, 5.0, 1)`,
    [empId1, storeId]
  );

  // 4. Create payroll run
  const runRes = await db.run(
    "INSERT INTO payroll_runs (store_id, year_month, status) VALUES (?, '2026-09', 'INSPECTING')",
    [storeId]
  );
  const runId = runRes.lastID;

  const emp1 = await db.get('SELECT * FROM employees WHERE id = ?', [empId1]);
  const emp2 = await db.get('SELECT * FROM employees WHERE id = ?', [empId2]);
  
  const att1 = await db.query('SELECT * FROM attendance WHERE employee_id = ?', [empId1]);
  const p1 = calculateEmployeePayroll(emp1, att1, '2026-09', DEFAULT_RATES_2026);
  const p2 = calculateEmployeePayroll(emp2, [], '2026-09', DEFAULT_RATES_2026);

  const pdRes1 = await db.run(
    `INSERT INTO payroll_details (
      payroll_run_id, employee_id, store_id, year_month, inspected,
      basic_pay, total_gross_pay, total_deductions, net_pay, biz_account_pay, personal_account_pay, calculation_breakdown
    ) VALUES (?, ?, ?, '2026-09', 1, ?, ?, ?, ?, ?, ?, ?)`,
    [runId, empId1, storeId, p1.basicPay, p1.totalGrossPay, p1.totalDeductions, p1.netPay, p1.bizAccountPay, p1.personalAccountPay, JSON.stringify(p1.calculationBreakdown)]
  );

  await db.run(
    `INSERT INTO payroll_details (
      payroll_run_id, employee_id, store_id, year_month, inspected,
      basic_pay, total_gross_pay, total_deductions, net_pay, biz_account_pay, personal_account_pay, calculation_breakdown
    ) VALUES (?, ?, ?, '2026-09', 1, ?, ?, ?, ?, ?, ?, ?)`,
    [runId, empId2, storeId, p2.basicPay, p2.totalGrossPay, p2.totalDeductions, p2.netPay, p2.bizAccountPay, p2.personalAccountPay, JSON.stringify(p2.calculationBreakdown)]
  );

  // 5. Confirm Payroll Lock
  await db.run(
    "UPDATE payroll_runs SET status = 'CONFIRMED', confirmed_at = CURRENT_TIMESTAMP WHERE id = ?",
    [runId]
  );
  const confirmedRun = await db.get('SELECT * FROM payroll_runs WHERE id = ?', [runId]);
  assert.equal(confirmedRun.status, 'CONFIRMED');

  // 6. Test Excel Export Generation
  const storeObj = await db.get('SELECT * FROM stores WHERE id = ?', [storeId]);
  const workbook = await generateWageLedgerExcel([storeObj], '2026-09');
  assert.ok(workbook);

  const payslipWb = await generatePayslipExcel(pdRes1.lastID);
  assert.ok(payslipWb);

  // 7. Test Reopen
  await db.run(
    "UPDATE payroll_runs SET status = 'REOPENED', reopened_at = CURRENT_TIMESTAMP, reopened_reason = '근태 수정' WHERE id = ?",
    [runId]
  );
  const reopenedRun = await db.get('SELECT * FROM payroll_runs WHERE id = ?', [runId]);
  assert.equal(reopenedRun.status, 'REOPENED');
});

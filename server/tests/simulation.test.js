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

  // Zero-attendance Hourly worker test (근태 미입력 시급제: 0원)
  const zeroAttHourly = {
    id: 11, store_id: 1, name: 'VU DUC HUY', wage_type: 'HOURLY', hourly_wage: 10320,
    hire_date: '2026-08-01', dependents_count: 0, is_foreigner: 1, visa_type: 'E-9',
    ins_national_pension: 1, fixed_national_pension: 50010, ins_health: 1, ins_longterm_care: 1, ins_employment: 0, ins_work_accident: 1
  };
  const zeroPayroll = calculateEmployeePayroll(zeroAttHourly, [], '2026-08', DEFAULT_RATES_2026);
  assert.equal(zeroPayroll.basicPay, 0);
  assert.equal(zeroPayroll.totalGrossPay, 0);
  assert.equal(zeroPayroll.nationalPension, 0);
  assert.equal(zeroPayroll.healthInsurance, 0);
  assert.equal(zeroPayroll.totalDeductions, 0);
  assert.equal(zeroPayroll.netPay, 0);
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

test('SIMULATION SUITE 6: Foreign Worker Visa 4-Major Insurance Rules (E-9, D-2, F-5)', async () => {
  // 1. E-9 Foreign Worker (VU DUC HUY case): fixed national pension 50,010, health/accident ON, employment OFF (임의가입 미적용)
  const empE9 = {
    id: 7, store_id: 1, name: 'VU DUC HUY', is_foreigner: 1, visa_type: 'E-9',
    wage_type: 'MONTHLY', contract_salary: 1080000, hire_date: '2026-07-01', dependents_count: 0,
    ins_national_pension: 1, fixed_national_pension: 50010,
    ins_health: 1, ins_longterm_care: 1, ins_employment: 0, ins_work_accident: 1,
    deduct_income_tax: 1, deduct_local_tax: 1
  };
  const pE9 = calculateEmployeePayroll(empE9, [], '2026-09', DEFAULT_RATES_2026);
  assert.equal(pE9.nationalPension, 50010);
  assert.equal(pE9.healthInsurance, 38280); // 1,080,000 * 0.03545 = 38,286 -> 38,280
  assert.equal(pE9.longtermCare, 4950);     // 38,280 * 0.1295 = 4,957 -> 4,950
  assert.equal(pE9.employmentInsurance, 0); // E-9 임의가입 (미가입) -> 0원
  assert.equal(pE9.incomeTax, 1320); // 1,080,000원 간이세액표 1,320원
  assert.equal(pE9.localIncomeTax, 130); // 1,320원의 10% (10원 절사) = 130원

  // 2. D-2 Student Worker: National Pension OFF, Employment OFF, Health ON, Accident ON
  const empD2 = {
    id: 8, store_id: 1, name: 'NGUYEN VAN A', is_foreigner: 1, visa_type: 'D-2',
    wage_type: 'HOURLY', hourly_wage: 10320, hire_date: '2026-09-01', dependents_count: 1,
    ins_national_pension: 0, ins_health: 1, ins_longterm_care: 1, ins_employment: 0, ins_work_accident: 1
  };
  const attD2 = [
    { work_date: '2026-09-01', net_work_hours: 4.0, regular_hours: 4.0, overtime_hours: 0, night_hours: 0, holiday_hours: 0, pub_holiday_hours: 0, is_absent: 0, is_unpaid_leave: 0, is_annual_leave: 0 }
  ];
  const pD2 = calculateEmployeePayroll(empD2, attD2, '2026-09', DEFAULT_RATES_2026);
  assert.equal(pD2.nationalPension, 0);
  assert.equal(pD2.employmentInsurance, 0);
  assert.ok(pD2.healthInsurance > 0);

  // 3. F-5 Permanent Resident: All 4 major insurances ON (동일 적용)
  const empF5 = {
    id: 9, store_id: 1, name: 'ZHAO WEI', is_foreigner: 1, visa_type: 'F-5',
    wage_type: 'MONTHLY', contract_salary: 2500000, reported_salary: 2500000, hire_date: '2026-01-01', dependents_count: 1,
    ins_national_pension: 1, ins_health: 1, ins_longterm_care: 1, ins_employment: 1, ins_work_accident: 1
  };
  const pF5 = calculateEmployeePayroll(empF5, [], '2026-09', DEFAULT_RATES_2026);
  assert.equal(pF5.nationalPension, 112500); // 2,500,000 * 0.045
  assert.equal(pF5.healthInsurance, 88620);  // 2,500,000 * 0.03545 = 88,625 -> 88,620
  assert.equal(pF5.employmentInsurance, 22500); // 2,500,000 * 0.009
});

test('SIMULATION SUITE 7: 정용주 2026년 8월 수습사원 급여명세서 (월 26일 초과 27일 근무 -> 9h 특근수당 125,388원 & 총지급액 3,178,966원)', async () => {
  const empJung = {
    id: 12,
    store_id: 1,
    name: '정용주',
    position: '수습 사원',
    wage_type: 'MONTHLY',
    contract_salary: 0,
    probation_applicable: 1,
    hire_date: '2026-07-02',
    dependents_count: 1,
    is_dual_reporting: 0,
    standard_working_days: 26,
    daily_work_hours: 9.0,
    fixed_national_pension: 147250,
    ins_national_pension: 1,
    ins_health: 1,
    ins_longterm_care: 1,
    ins_employment: 1,
    ins_work_accident: 1,
    deduct_income_tax: 0,
    deduct_local_tax: 0
  };

  // 8월 총 27일 근무 (기준 26일 대비 1일 초과 -> 특근 9시간 * 9,288 * 1.5 = 125,388원)
  // 공휴일 대체 18시간 (83,592원)
  const attendanceJung = [];
  for (let i = 1; i <= 27; i++) {
    const dayStr = String(i).padStart(2, '0');
    const isHoliday = (i === 15 || i === 16);
    attendanceJung.push({
      work_date: `2026-08-${dayStr}`,
      net_work_hours: 9.0,
      regular_hours: 8.0,
      overtime_hours: 1.0,
      night_hours: 0,
      is_holiday: isHoliday ? 1 : 0,
      public_holiday_hours: isHoliday ? 9.0 : 0
    });
  }

  const rates = {
    ...DEFAULT_RATES_2026,
    healthInsurance: 0.03545
  };

  const payroll = calculateEmployeePayroll(empJung, attendanceJung, '2026-08', rates, {
    // 4대보험 고지 기준 세팅
  });

  // 1. 기본급: 209h * 9,288 = 1,941,192원
  assert.equal(payroll.basicPay, 1941192);

  // 2. 특근수당: 27일 근무 (26일 초과 1일 * 9h * 9,288 * 1.5) = 125,388원
  assert.equal(payroll.specialAllowance, 125388);

  // 3. 연장근로수당 ① (22h * 9,288 * 1.5) & ② (39.11h * 9,288 * 1.5)
  assert.equal(payroll.overtimeAllowance1, 302680);
  assert.equal(payroll.overtimeAllowance2, 544840);

  // 4. 연차수당 (74,300원) & 만근수당 (106,974원)
  assert.equal(payroll.annualLeaveAllowance, 74300);
  assert.equal(payroll.attendanceBonus, 106974);

  // 5. 대체근로수당 (18h * 9,288 * 0.5 = 83,592원)
  assert.equal(payroll.substituteAllowance, 83592);

  // 6. 지급합계: 3,178,966원
  assert.equal(payroll.totalGrossPay, 3178966);
});

test('SIMULATION SUITE 8: VU DUC HUY 2026년 8월 급여명세서 (D-2 비자 한도 신고급여 1,098,730원 기준 4대보험 44,060원 공제 -> 실지급액 3,008,080원)', async () => {
  const empHuy = {
    id: 13,
    store_id: 1,
    name: 'VU DUC HUY',
    position: '사원',
    wage_type: 'MONTHLY',
    contract_salary: 3052140,
    hire_date: '2026-01-20',
    is_foreigner: 1,
    visa_type: 'D-2',
    is_dual_reporting: 1,
    reported_salary: 1098730,
    withholding_rate: 0, // 세무신고분 외 차액 공제 없음
    ins_national_pension: 0, // D-2 국민연금 면제
    ins_health: 1,           // D-2 건강보험 가입
    ins_longterm_care: 1,    // D-2 장기요양 가입
    ins_employment: 0,       // D-2 고용보험 면제
    ins_work_accident: 1,    // 산재보험 사업주 전액부담
    deduct_income_tax: 0,    // 109.8만원 면세점 근처 소득세 0원
    deduct_local_tax: 0
  };

  const payroll = calculateEmployeePayroll(empHuy, [], '2026-08', DEFAULT_RATES_2026, {
    overtime_allowance_1: 797220,
    overtime_allowance_2: 0,
    substitute_allowance: 98040,
    annual_leave_allowance: 0,
    attendance_bonus: 0,
    special_allowance: 0
  });

  // 1. 지급합계: 기본급 2,156,880 + 연장 797,220 + 대체 98,040 = 3,052,140원
  assert.equal(payroll.totalGrossPay, 3052140);

  // 2. 건강보험: 신고기준(1,098,730원) * 0.03545 = 38,950원
  assert.equal(payroll.healthInsurance, 38950);

  // 3. 장기요양보험: 38,950 * 0.1295 = 5,044 -> 5,040 ~ 5,110원
  assert.ok(payroll.longtermCare >= 5040 && payroll.longtermCare <= 5110);

  // 4. 총 공제액: 건강 + 요양 = 43,990 ~ 44,060원
  assert.ok(payroll.totalDeductions >= 43990 && payroll.totalDeductions <= 44100);

  // 5. 실지급액: 약 3,008,080원
  assert.ok(payroll.netPay >= 3008000 && payroll.netPay <= 3008200);
});

test('SIMULATION SUITE 9: 김성향 2026년 8월 급여 산출식 (연장 1,024,646원 + 대체 101,061원 + 미신고차액공제 160,590원 -> 실지급액 3,386,589원)', async () => {
  const empKim = {
    id: 14,
    store_id: 1,
    name: '김성향',
    position: '직원',
    wage_type: 'MONTHLY',
    contract_salary: 3560697,
    hourly_wage: 11229,
    hire_date: '2025-11-01',
    dependents_count: 2,
    is_dual_reporting: 1,
    reported_salary: 2156880,
    withholding_rate: 10.0,
    payslip_display_mode: 'SINGLE_DEDUCTION',
    fixed_national_pension: 90250,
    ins_national_pension: 1,
    ins_health: 1,
    ins_longterm_care: 1,
    ins_employment: 1,
    ins_work_accident: 1,
    deduct_income_tax: 1,
    deduct_local_tax: 1
  };

  // 8월 근태: 공휴일 대체 18시간
  const attendanceKim = [
    { work_date: '2026-08-15', net_work_hours: 9.0, is_holiday: 1, public_holiday_hours: 9.0 },
    { work_date: '2026-08-16', net_work_hours: 9.0, is_holiday: 1, public_holiday_hours: 9.0 }
  ];

  const payroll = calculateEmployeePayroll(empKim, attendanceKim, '2026-08', DEFAULT_RATES_2026, {});

  // 1. 지급항목 검증
  assert.equal(payroll.basicPay, 2429880);
  assert.equal(payroll.overtimeAllowance, 1024646); // 365,945 + 658,701
  assert.equal(payroll.attendanceBonus, 55640);
  assert.equal(payroll.substituteAllowance, 101061); // 18h * 11,229 * 0.5 = 101,061

  // 2. 공제항목 검증
  assert.equal(payroll.nationalPension, 90250);
  assert.equal(payroll.healthInsurance, 76460); // 2,156,880 * 0.03545 = 76,461 -> 76,460
  assert.equal(payroll.longtermCare, 9900);     // 76,460 * 0.1295 = 9,901 -> 9,900
  assert.equal(payroll.employmentInsurance, 19410); // 2,156,880 * 0.009 = 19,411 -> 19,410
  assert.equal(payroll.incomeTax, 17840); // 2인 기준 간이세액
  assert.equal(payroll.localIncomeTax, 1780);

  // 3. 산출식 텍스트 검증
  assert.ok(payroll.calculationBreakdown.overtimeExplanation.includes('연장①'));
  assert.ok(payroll.calculationBreakdown.overtimeExplanation.includes('연장②'));
  assert.ok(payroll.calculationBreakdown.substituteExplanation.includes('18시간'));
  assert.ok(payroll.calculationBreakdown.attendanceBonusExplanation.includes('만근수당'));
});




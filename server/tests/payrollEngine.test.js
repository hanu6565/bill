import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checkProbationEligibility,
  calculateProratedBasicPay,
  calculateOrdinaryHourlyWage,
  calculateIncomeTax,
  calculateDailyWorkerTax,
  calculateEmployeePayroll,
  DEFAULT_RATES_2026
} from '../services/payrollEngine.js';

test('1. Probation Legality Validation (수습감액 법적 적법성 판정)', () => {
  // Case A: 1년 미만 계약 -> 감액 불가
  assert.equal(checkProbationEligibility('LESS_THAN_ONE_YEAR', 0), false);
  
  // Case B: 단순노무직 -> 감액 불가
  assert.equal(checkProbationEligibility('ONE_YEAR_OR_MORE', 1), false);
  
  // Case C: 1년 미만이면서 단순노무직 -> 감액 불가
  assert.equal(checkProbationEligibility('LESS_THAN_ONE_YEAR', 1), false);

  // Case D: 1년 이상 일반직 -> 감액 가능
  assert.equal(checkProbationEligibility('ONE_YEAR_OR_MORE', 0), true);
});

test('2. Calendar Day Segment Proration (역일수 기준 구간분할 일할계산)', () => {
  // 2026-09: 총 30일, 책정급여 3,000,000원
  // 중간 입사: 9월 11일 입사 (20일 근무)
  const empMidHire = {
    contract_salary: 3000000,
    hire_date: '2026-09-11',
    resign_date: null,
    probation_applicable: 0
  };
  const resMidHire = calculateProratedBasicPay(empMidHire, '2026-09');
  assert.equal(resMidHire.activeDays, 20);
  assert.equal(resMidHire.basicPay, 2000000); // 3,000,000 * 20 / 30 = 2,000,000

  // 중간 수습 종료: 9월 1일~15일(15일, 90%), 9월 16일~30일(15일, 100%)
  const empProbationSplit = {
    contract_salary: 3000000,
    hire_date: '2026-06-16',
    resign_date: null,
    contract_duration_type: 'ONE_YEAR_OR_MORE',
    is_simple_labor: 0,
    probation_applicable: 1,
    probation_start_date: '2026-06-16',
    probation_end_date: '2026-09-15',
    probation_rate: 90.0
  };
  const resProbSplit = calculateProratedBasicPay(empProbationSplit, '2026-09');
  assert.equal(resProbSplit.segments.length, 2);
  // Seg 1: 3,000,000 * (15/30) * 0.9 = 1,350,000
  // Seg 2: 3,000,000 * (15/30) * 1.0 = 1,500,000
  // Total: 2,850,000
  assert.equal(resProbSplit.basicPay, 2850000);
  assert.equal(resProbSplit.probationDeduction, 150000);
});

test('3. Ordinary Wage Calculation (통상시급 산정)', () => {
  const empMonthly = {
    wage_type: 'MONTHLY',
    contract_salary: 3135000 // 3,135,000 / 209 = 15,000
  };
  const ordHourly = calculateOrdinaryHourlyWage(empMonthly, DEFAULT_RATES_2026);
  assert.equal(ordHourly, 15000);

  // 시급제 최저시급 하한선 보장
  const empHourlyBelowMin = {
    wage_type: 'HOURLY',
    hourly_wage: 9000
  };
  const ordHourlyMin = calculateOrdinaryHourlyWage(empHourlyBelowMin, DEFAULT_RATES_2026);
  assert.equal(ordHourlyMin, 10320); // 2026 최저시급 10,320 자동 보정
});

test('4. Overtime, Night, Weekend & Public Holiday Allowances (주말 일반/연장 & 공휴일 0.5배 가산)', () => {
  const emp = {
    id: 101,
    store_id: 1,
    wage_type: 'HOURLY',
    hourly_wage: 10000,
    hire_date: '2025-01-01',
    dependents_count: 1,
    is_dual_reporting: 0
  };

  const attendance = [
    // Regular Day: 10h total (8h regular, 2h overtime, 2h night)
    {
      work_date: '2026-09-02',
      net_work_hours: 10,
      regular_hours: 8,
      overtime_hours: 2,
      night_hours: 2,
      public_holiday_hours_under8: 0,
      public_holiday_hours_over8: 0
    },
    // Weekend: 10h total (8h regular, 2h overtime, no 1.5x weekend holiday pay)
    {
      work_date: '2026-09-05',
      net_work_hours: 10,
      regular_hours: 8,
      overtime_hours: 2,
      night_hours: 0,
      public_holiday_hours_under8: 0,
      public_holiday_hours_over8: 0
    },
    // Public Holiday: 10h total (8h regular, 2h overtime + 10h @ 0.5x statutory public holiday bonus)
    {
      work_date: '2026-09-25',
      net_work_hours: 10,
      regular_hours: 8,
      overtime_hours: 2,
      night_hours: 0,
      public_holiday_hours_under8: 8,
      public_holiday_hours_over8: 2
    }
  ];

  const payroll = calculateEmployeePayroll(emp, attendance, '2026-09', { ...DEFAULT_RATES_2026, minimumWage: 10000 });
  
  // Overtime: (2 + 2 + 2) = 6h * 10,000 * 1.5 = 90,000
  assert.equal(payroll.overtimeAllowance, 90000);
  
  // Night: 10,000 * 0.5 * 2 = 10,000
  assert.equal(payroll.nightAllowance, 10000);

  // Weekend Holiday: 0 (주말은 1.5배 별도 가산하지 않음)
  assert.equal(payroll.holidayAllowance, 0);

  // Public Holiday: 10,000 * 0.5 * 10 = 50,000 (시급의 0.5배 가산수당)
  assert.equal(payroll.publicHolidayAllowance, 50000);
});

test('5. Dual-Reporting Structure (이중신고구조 정밀 계산 검증)', () => {
  // 점장 계약급여: 3,800,000원, 신고기준액: 2,500,000원, 원천공제율: 10%
  const empDual = {
    id: 102,
    store_id: 1,
    wage_type: 'MONTHLY',
    contract_salary: 3800000,
    hire_date: '2024-01-01',
    dependents_count: 1,
    is_dual_reporting: 1,
    reported_salary: 2500000,
    withholding_rate: 10.0,
    payslip_display_mode: 'SPLIT_PAY'
  };

  const payroll = calculateEmployeePayroll(empDual, [], '2026-09', DEFAULT_RATES_2026);

  // Gross pay = 3,800,000
  assert.equal(payroll.totalGrossPay, 3800000);

  // Unreported diff = 3,800,000 - 2,500,000 = 1,300,000
  // Withholding deduction (10%) = 130,000
  assert.equal(payroll.unreportedDiffDeduction, 130000);

  // Personal account payout = 1,300,000 * (1 - 0.10) = 1,170,000
  assert.equal(payroll.personalAccountPay, 1170000);

  // National Pension on 2,500,000 = 2,500,000 * 0.045 = 112,500
  assert.equal(payroll.nationalPension, 112500);

  // Health Ins on 2,500,000 = 2,500,000 * 0.03545 = 88,620 (10원 절사)
  assert.equal(payroll.healthInsurance, 88620);

  // Employment Ins on 2,500,000 = 2,500,000 * 0.009 = 22,500
  assert.equal(payroll.employmentInsurance, 22500);

  // Total deductions must equal sum of 4-insurances + taxes + unreportedDiffDeduction
  const expectedTotalDeductions = payroll.nationalPension + payroll.healthInsurance + payroll.longtermCare +
                                  payroll.employmentInsurance + payroll.incomeTax + payroll.localIncomeTax +
                                  payroll.unreportedDiffDeduction;
  assert.equal(payroll.totalDeductions, expectedTotalDeductions);

  // Net Pay = Total Gross Pay - Total Deductions
  assert.equal(payroll.netPay, payroll.totalGrossPay - payroll.totalDeductions);

  // Net Pay must equal Biz Account Pay + Personal Account Pay
  assert.equal(payroll.netPay, payroll.bizAccountPay + payroll.personalAccountPay);
});

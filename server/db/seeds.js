import bcrypt from 'bcryptjs';
import db from './database.js';
import { encryptText, maskRRN } from '../utils/crypto.js';
import { initHolidays } from '../services/holidayService.js';
import { calculateDayHours } from '../routes/attendance.js';
import { calculateEmployeePayroll, DEFAULT_RATES_2026 } from '../services/payrollEngine.js';

export async function runSeeds() {
  console.log('🌱 Starting database seeding...');
  await db.initDatabase();
  await initHolidays();

  // 1. Admin User
  const adminPassword = await bcrypt.hash('admin1234!', 10);
  await db.run(
    `INSERT OR REPLACE INTO users (id, username, password_hash, email, role)
     VALUES (1, 'admin', ?, 'ceo@restaurantgroup.kr', 'ADMIN')`,
    [adminPassword]
  );
  console.log('👤 Admin user created: admin / admin1234!');

  // 2. Stores (3 stores)
  const stores = [
    { id: 1, name: '한양화로 강남본점', business_number: '123-45-67890', ceo_name: '홍길동', address: '서울시 강남구 테헤란로 123', phone: '02-555-0101', accident_rate: 0.9, default_wage_type: 'MONTHLY' },
    { id: 2, name: '을지로포차 역삼점', business_number: '234-56-78901', ceo_name: '홍길동', address: '서울시 강남구 역삼로 456', phone: '02-555-0202', accident_rate: 0.9, default_wage_type: 'HOURLY' },
    { id: 3, name: '미소야 홍대직영점', business_number: '345-67-89012', ceo_name: '홍길동', address: '서울시 마포구 홍익로 789', phone: '02-333-0303', accident_rate: 0.9, default_wage_type: 'MONTHLY' },
  ];

  for (const s of stores) {
    await db.run(
      `INSERT OR REPLACE INTO stores (id, name, business_number, ceo_name, address, phone, accident_rate, default_wage_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [s.id, s.name, s.business_number, s.ceo_name, s.address, s.phone, s.accident_rate, s.default_wage_type]
    );
  }
  console.log('🏬 3 Stores seeded.');

  // 3. Employees (12 realistic employees)
  const rawEmployees = [
    // Store 1: 한양화로 강남본점
    {
      id: 1, store_id: 1, name: '김철수', rrn: '850312-1082341', hire_date: '2023-03-01', position: '총괄점장',
      dependents_count: 3, is_foreigner: 0, visa_type: null, employment_type: 'REGULAR', wage_type: 'MONTHLY',
      contract_salary: 3800000, hourly_wage: 18182, fixed_work_hours: '10:00~22:00', bank_name: '신한은행', account_number: '110-123-456789',
      has_car: 1, notes: '이중신고 구조 적용 점장',
      is_dual_reporting: 1, reported_salary: 2500000, withholding_rate: 10.0, payslip_display_mode: 'SPLIT_PAY',
      contract_duration_type: 'ONE_YEAR_OR_MORE', is_simple_labor: 0, probation_applicable: 0,
      non_taxable_meal: 0, non_taxable_car: 1, non_taxable_overtime: 0
    },
    {
      id: 2, store_id: 1, name: '이영희', rrn: '920721-2093842', hire_date: '2024-05-10', position: '수석조리장',
      dependents_count: 1, is_foreigner: 0, visa_type: null, employment_type: 'REGULAR', wage_type: 'MONTHLY',
      contract_salary: 3200000, hourly_wage: 15311, fixed_work_hours: '09:00~21:00', bank_name: '국민은행', account_number: '456-78-901234',
      has_car: 0, notes: '조리 총괄',
      is_dual_reporting: 0, reported_salary: 0, withholding_rate: 10.0, payslip_display_mode: 'SINGLE_DEDUCTION',
      contract_duration_type: 'ONE_YEAR_OR_MORE', is_simple_labor: 0, probation_applicable: 0,
      non_taxable_meal: 0, non_taxable_car: 0, non_taxable_overtime: 0
    },
    {
      id: 3, store_id: 1, name: '응우옌 탄', rrn: '981105-5192837', hire_date: '2025-01-15', position: '주방보조',
      dependents_count: 1, is_foreigner: 1, visa_type: 'E-9', employment_type: 'REGULAR', wage_type: 'MONTHLY',
      contract_salary: 2400000, hourly_wage: 11483, fixed_work_hours: '10:00~22:00', bank_name: '우리은행', account_number: '1002-345-678901',
      has_car: 0, notes: '외국인 근로자 (E-9 비자)',
      is_dual_reporting: 0, reported_salary: 0, withholding_rate: 10.0, payslip_display_mode: 'SINGLE_DEDUCTION',
      contract_duration_type: 'ONE_YEAR_OR_MORE', is_simple_labor: 0, probation_applicable: 0,
      non_taxable_meal: 0, non_taxable_car: 0, non_taxable_overtime: 1
    },
    {
      id: 4, store_id: 1, name: '박민우', rrn: '010415-3849102', hire_date: '2026-08-01', position: '홀서빙 (수습)',
      dependents_count: 1, is_foreigner: 0, visa_type: null, employment_type: 'REGULAR', wage_type: 'MONTHLY',
      contract_salary: 2300000, hourly_wage: 11005, fixed_work_hours: '11:00~23:00', bank_name: '하나은행', account_number: '234-910234-56789',
      has_car: 0, notes: '수습 3개월 적용 (90%)',
      is_dual_reporting: 0, reported_salary: 0, withholding_rate: 10.0, payslip_display_mode: 'SINGLE_DEDUCTION',
      contract_duration_type: 'ONE_YEAR_OR_MORE', is_simple_labor: 0, probation_applicable: 1, probation_start_date: '2026-08-01', probation_end_date: '2026-10-31', probation_rate: 90.0,
      non_taxable_meal: 0, non_taxable_car: 0, non_taxable_overtime: 0
    },

    // Store 2: 을지로포차 역삼점 (시급제 중심)
    {
      id: 5, store_id: 2, name: '최지훈', rrn: '940819-1192834', hire_date: '2024-02-01', position: '매니저',
      dependents_count: 1, is_foreigner: 0, visa_type: null, employment_type: 'REGULAR', wage_type: 'MONTHLY',
      contract_salary: 3100000, hourly_wage: 14833, fixed_work_hours: '16:00~03:00', bank_name: '카카오뱅크', account_number: '3333-01-9283741',
      has_car: 1, notes: '시급제 매장 내 월급제 매니저',
      is_dual_reporting: 0, reported_salary: 0, withholding_rate: 10.0, payslip_display_mode: 'SINGLE_DEDUCTION',
      contract_duration_type: 'ONE_YEAR_OR_MORE', is_simple_labor: 0, probation_applicable: 0,
      non_taxable_meal: 0, non_taxable_car: 1, non_taxable_overtime: 0
    },
    {
      id: 6, store_id: 2, name: '정수진', rrn: '990325-2948172', hire_date: '2025-06-01', position: '홀 파트타임',
      dependents_count: 1, is_foreigner: 0, visa_type: null, employment_type: 'REGULAR', wage_type: 'HOURLY',
      contract_salary: 0, hourly_wage: 11000, fixed_work_hours: '18:00~02:00', bank_name: '토스뱅크', account_number: '1000-0192-8374',
      has_car: 0, notes: '야간 시급제 파트타임',
      is_dual_reporting: 0, reported_salary: 0, withholding_rate: 10.0, payslip_display_mode: 'SINGLE_DEDUCTION',
      contract_duration_type: 'ONE_YEAR_OR_MORE', is_simple_labor: 0, probation_applicable: 0,
      non_taxable_meal: 0, non_taxable_car: 0, non_taxable_overtime: 0
    },
    {
      id: 7, store_id: 2, name: '강동원', rrn: '020618-3192847', hire_date: '2026-01-01', position: '주방 파트타임',
      dependents_count: 1, is_foreigner: 0, visa_type: null, employment_type: 'REGULAR', wage_type: 'HOURLY',
      contract_salary: 0, hourly_wage: 10500, fixed_work_hours: '17:00~01:00', bank_name: '신한은행', account_number: '110-384-910293',
      has_car: 0, notes: '2026 최저시급(10,320원) 이상 준수',
      is_dual_reporting: 0, reported_salary: 0, withholding_rate: 10.0, payslip_display_mode: 'SINGLE_DEDUCTION',
      contract_duration_type: 'ONE_YEAR_OR_MORE', is_simple_labor: 0, probation_applicable: 0,
      non_taxable_meal: 0, non_taxable_car: 0, non_taxable_overtime: 0
    },
    {
      id: 8, store_id: 2, name: '윤재호', rrn: '960911-1928374', hire_date: '2026-08-15', position: '주말 일용직',
      dependents_count: 1, is_foreigner: 0, visa_type: null, employment_type: 'DAILY', wage_type: 'HOURLY',
      contract_salary: 0, hourly_wage: 12000, fixed_work_hours: '18:00~02:00', bank_name: '국민은행', account_number: '294-819-283741',
      has_car: 0, notes: '주말 일용근로자 (일용소득세 적용)',
      is_dual_reporting: 0, reported_salary: 0, withholding_rate: 10.0, payslip_display_mode: 'SINGLE_DEDUCTION',
      contract_duration_type: 'LESS_THAN_ONE_YEAR', is_simple_labor: 1, probation_applicable: 0,
      non_taxable_meal: 0, non_taxable_car: 0, non_taxable_overtime: 0
    },

    // Store 3: 미소야 홍대직영점
    {
      id: 9, store_id: 3, name: '한소희', rrn: '951204-2091823', hire_date: '2023-11-01', position: '점장',
      dependents_count: 2, is_foreigner: 0, visa_type: null, employment_type: 'REGULAR', wage_type: 'MONTHLY',
      contract_salary: 3500000, hourly_wage: 16746, fixed_work_hours: '10:00~21:00', bank_name: '하나은행', account_number: '384-910293-84710',
      has_car: 1, notes: '홍대점 총괄',
      is_dual_reporting: 0, reported_salary: 0, withholding_rate: 10.0, payslip_display_mode: 'SINGLE_DEDUCTION',
      contract_duration_type: 'ONE_YEAR_OR_MORE', is_simple_labor: 0, probation_applicable: 0,
      non_taxable_meal: 0, non_taxable_car: 1, non_taxable_overtime: 0
    },
    {
      id: 10, store_id: 3, name: '오세훈', rrn: '970514-1029384', hire_date: '2025-03-01', position: '조리담당',
      dependents_count: 1, is_foreigner: 0, visa_type: null, employment_type: 'REGULAR', wage_type: 'MONTHLY',
      contract_salary: 2700000, hourly_wage: 12919, fixed_work_hours: '09:00~20:00', bank_name: '우리은행', account_number: '1002-910-293847',
      has_car: 0, notes: '조리 전담',
      is_dual_reporting: 0, reported_salary: 0, withholding_rate: 10.0, payslip_display_mode: 'SINGLE_DEDUCTION',
      contract_duration_type: 'ONE_YEAR_OR_MORE', is_simple_labor: 0, probation_applicable: 0,
      non_taxable_meal: 0, non_taxable_car: 0, non_taxable_overtime: 0
    },
    {
      id: 11, store_id: 3, name: '장예원', rrn: '030822-4192837', hire_date: '2026-07-01', position: '단기 서빙 (단순노무)',
      dependents_count: 1, is_foreigner: 0, visa_type: null, employment_type: 'REGULAR', wage_type: 'HOURLY',
      contract_salary: 0, hourly_wage: 10400, fixed_work_hours: '11:00~19:00', bank_name: '카카오뱅크', account_number: '3333-09-1827364',
      has_car: 0, notes: '단순노무직 (수습감액 불가 대상)',
      is_dual_reporting: 0, reported_salary: 0, withholding_rate: 10.0, payslip_display_mode: 'SINGLE_DEDUCTION',
      contract_duration_type: 'LESS_THAN_ONE_YEAR', is_simple_labor: 1, probation_applicable: 0,
      non_taxable_meal: 0, non_taxable_car: 0, non_taxable_overtime: 0
    },
    {
      id: 12, store_id: 3, name: '송하늘', rrn: '980130-2938471', hire_date: '2024-09-01', position: '홀서비스',
      dependents_count: 1, is_foreigner: 0, visa_type: null, employment_type: 'REGULAR', wage_type: 'MONTHLY',
      contract_salary: 2500000, hourly_wage: 11962, fixed_work_hours: '10:00~21:00', bank_name: '신한은행', account_number: '110-492-019283',
      has_car: 0, notes: '홀 서비스',
      is_dual_reporting: 0, reported_salary: 0, withholding_rate: 10.0, payslip_display_mode: 'SINGLE_DEDUCTION',
      contract_duration_type: 'ONE_YEAR_OR_MORE', is_simple_labor: 0, probation_applicable: 0,
      non_taxable_meal: 0, non_taxable_car: 0, non_taxable_overtime: 0
    }
  ];

  for (const emp of rawEmployees) {
    const rrnEnc = encryptText(emp.rrn);
    const rrnMsk = maskRRN(emp.rrn);

    await db.run(
      `INSERT OR REPLACE INTO employees (
        id, store_id, name, rrn_encrypted, rrn_masked, hire_date, resign_date, position, dependents_count,
        is_foreigner, visa_type, employment_type, wage_type, contract_salary, hourly_wage,
        fixed_work_hours, bank_name, account_number, has_car, notes,
        is_dual_reporting, reported_salary, withholding_rate, payslip_display_mode,
        contract_duration_type, is_simple_labor, probation_applicable, probation_start_date, probation_end_date, probation_rate,
        non_taxable_meal, non_taxable_car, non_taxable_overtime, tax_exempt_income_tax, tax_exempt_social_ins,
        ordinary_wage_items
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        emp.id, emp.store_id, emp.name, rrnEnc, rrnMsk, emp.hire_date, null, emp.position, emp.dependents_count,
        emp.is_foreigner, emp.visa_type, emp.employment_type, emp.wage_type, emp.contract_salary, emp.hourly_wage,
        emp.fixed_work_hours, emp.bank_name, emp.account_number, emp.has_car, emp.notes,
        emp.is_dual_reporting, emp.reported_salary, emp.withholding_rate, emp.payslip_display_mode,
        emp.contract_duration_type, emp.is_simple_labor, emp.probation_applicable, emp.probation_start_date || null, emp.probation_end_date || null, emp.probation_rate || 90.0,
        emp.non_taxable_meal, emp.non_taxable_car, emp.non_taxable_overtime, 1, 1,
        '["basic_pay"]'
      ]
    );
  }
  console.log('👥 12 Employees seeded.');

  // 4. Seed Attendance for 2026-08 (Past Month) and 2026-09 (Current Month)
  console.log('📅 Seeding attendance for 2026-08 and 2026-09...');
  
  const months = ['2026-08', '2026-09'];
  for (const ym of months) {
    const [yStr, mStr] = ym.split('-');
    const year = parseInt(yStr, 10);
    const month = parseInt(mStr, 10);
    const daysInMonth = new Date(year, month, 0).getDate();

    for (const emp of rawEmployees) {
      const [fIn, fOut] = emp.fixed_work_hours.split('~');

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const d = new Date(dateStr);
        const dayOfWeek = d.getDay(); // 0: Sun, 6: Sat

        // Weekly schedule:
        // Regular employees rest 2 days a week (e.g. Mon+Tue or Tue+Wed)
        // Daily employees work on Fri/Sat/Sun
        let isWorking = true;
        let clockIn = fIn;
        let clockOut = fOut;
        let breakMin = 60;
        let isAbsent = 0;
        let isAnnual = 0;

        if (emp.employment_type === 'DAILY') {
          // Daily workers work on Sat & Sun
          isWorking = (dayOfWeek === 0 || dayOfWeek === 6);
        } else if (emp.wage_type === 'HOURLY') {
          // Hourly workers work Wed, Thu, Fri, Sat, Sun (5 days, 8h each = 40h)
          isWorking = ![1, 2].includes(dayOfWeek); // Off on Mon & Tue
        } else {
          // Monthly workers: Off on Sun & Mon
          isWorking = ![0, 1].includes(dayOfWeek);
          // Let 1 random day be an annual leave in August
          if (ym === '2026-08' && day === 14 && emp.id === 1) {
            isAnnual = 1;
            isWorking = false;
          }
        }

        if (!isWorking && !isAnnual) {
          clockIn = null;
          clockOut = null;
          breakMin = 0;
        }

        const hours = await calculateDayHours(dateStr, clockIn, clockOut, breakMin, isAbsent, 0, isAnnual);

        await db.run(
          `INSERT OR REPLACE INTO attendance (
            employee_id, store_id, work_date, clock_in, clock_out, break_minutes,
            net_work_hours, day_type, regular_hours, overtime_hours, night_hours,
            holiday_hours_under8, holiday_hours_over8, public_holiday_hours_under8, public_holiday_hours_over8,
            is_absent, is_unpaid_leave, is_annual_leave, memo
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            emp.id, emp.store_id, dateStr, clockIn, clockOut, breakMin,
            hours.net_work_hours, hours.day_type, hours.regular_hours, hours.overtime_hours, hours.night_hours,
            hours.holiday_hours_under8, hours.holiday_hours_over8, hours.public_holiday_hours_under8, hours.public_holiday_hours_over8,
            isAbsent, 0, isAnnual, ''
          ]
        );
      }
    }
  }

  // 5. Seed Pre-calculated Payroll Run for 2026-08 (Past Confirmed Run)
  console.log('💰 Generating pre-calculated 2026-08 payroll runs for all stores...');
  for (const s of stores) {
    const storeEmployees = rawEmployees.filter(e => e.store_id === s.id);
    let grossSum = 0;
    let deductSum = 0;
    let netSum = 0;

    const runRes = await db.run(
      `INSERT OR REPLACE INTO payroll_runs (store_id, year_month, status, confirmed_at, confirmed_by, snapshot_rates)
       VALUES (?, '2026-08', 'CONFIRMED', '2026-08-31 18:00:00', '대표(관리자)', ?)`,
      [s.id, JSON.stringify(DEFAULT_RATES_2026)]
    );
    const runId = runRes.lastID;

    for (const emp of storeEmployees) {
      const atts = await db.query('SELECT * FROM attendance WHERE employee_id = ? AND work_date LIKE ?', [emp.id, '2026-08-%']);
      const payroll = calculateEmployeePayroll(emp, atts, '2026-08', DEFAULT_RATES_2026, {
        car_allowance: emp.has_car ? 200000 : 0
      });

      grossSum += payroll.totalGrossPay;
      deductSum += payroll.totalDeductions;
      netSum += payroll.netPay;

      await db.run(
        `INSERT OR REPLACE INTO payroll_details (
          payroll_run_id, employee_id, store_id, year_month, inspected,
          basic_pay, overtime_allowance, night_allowance, holiday_allowance, public_holiday_allowance,
          annual_leave_allowance, weekly_holiday_allowance, attendance_bonus, substitute_allowance,
          car_allowance, bonus, special_allowance, total_gross_pay,
          taxable_income, non_taxable_income,
          national_pension, health_insurance, longterm_care, employment_insurance,
          income_tax, local_income_tax, attendance_deduction, probation_deduction, unreported_diff_deduction,
          total_deductions, net_pay, biz_account_pay, personal_account_pay, calculation_breakdown
        ) VALUES (?, ?, ?, '2026-08', 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          runId, emp.id, s.id,
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

    await db.run(
      `UPDATE payroll_runs SET total_gross_pay = ?, total_deductions = ?, total_net_pay = ? WHERE id = ?`,
      [grossSum, deductSum, netSum, runId]
    );
  }

  console.log('✅ Seeding completed successfully.');
}

// If executed directly
if (process.argv[1] && process.argv[1].includes('seeds.js')) {
  runSeeds().then(() => {
    process.exit(0);
  }).catch(err => {
    console.error('Seeding error:', err);
    process.exit(1);
  });
}

export default runSeeds;

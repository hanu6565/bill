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

  // 2. Stores
  const stores = [
    { id: 1, name: '신영웅청국장해물뚝배기성서모다아울렛점', biz_number: '123-45-67890', ceo_name: '김한우', address: '대구광역시 달서구 성서공단로', phone: '053-585-0000', default_wage_type: 'MONTHLY' },
    { id: 2, name: '신영웅청국장 2호점 (역삼직영점)', biz_number: '234-56-78901', ceo_name: '김한우', address: '서울시 강남구 역삼로 456', phone: '02-555-0202', default_wage_type: 'HOURLY' },
  ];

  for (const s of stores) {
    await db.run(
      `INSERT OR REPLACE INTO stores (id, name, business_number, biz_number, ceo_name, address, phone, default_wage_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [s.id, s.name, s.biz_number, s.biz_number, s.ceo_name, s.address, s.phone, s.default_wage_type]
    );
  }
  console.log('🏬 Stores seeded.');

  // 3. Employees (Representative Store Real Employees from User's Excel)
  const rawEmployees = [
    {
      id: 1, store_id: 1, name: '김성향', rrn: '711011-2896813', hire_date: '2025-11-01', position: '팀장',
      dependents_count: 2, is_foreigner: 0, visa_type: null, employment_type: 'REGULAR', wage_type: 'MONTHLY',
      contract_salary: 3600000, hourly_wage: 11229, fixed_work_hours: '10:00~22:00', bank_name: '대구은행', account_number: '508-12-345678',
      has_car: 1, is_dual_reporting: 1, reported_salary: 2156880, probation_applicable: 0, probation_rate: 90.0,
      non_taxable_meal: 0, non_taxable_car: 1, non_taxable_overtime: 0, fixed_national_pension: 90250
    },
    {
      id: 2, store_id: 1, name: '김성훈', rrn: '770315-1823045', hire_date: '2025-12-24', position: '과장',
      dependents_count: 4, is_foreigner: 0, visa_type: null, employment_type: 'REGULAR', wage_type: 'MONTHLY',
      contract_salary: 3600000, hourly_wage: 11229, fixed_work_hours: '10:00~22:00', bank_name: '국민은행', account_number: '456-78-901234',
      has_car: 1, is_dual_reporting: 0, reported_salary: 3850530, probation_applicable: 0, probation_rate: 90.0,
      non_taxable_meal: 0, non_taxable_car: 1, non_taxable_overtime: 0, fixed_national_pension: 147250
    },
    {
      id: 3, store_id: 1, name: '김혜숙', rrn: '660824-2525110', hire_date: '2025-11-01', position: '사원',
      dependents_count: 1, is_foreigner: 0, visa_type: null, employment_type: 'REGULAR', wage_type: 'MONTHLY',
      contract_salary: 3260000, hourly_wage: 10320, fixed_work_hours: '10:00~22:00', bank_name: '우리은행', account_number: '1002-345-678901',
      has_car: 0, is_dual_reporting: 1, reported_salary: 2156880, probation_applicable: 0, probation_rate: 90.0,
      non_taxable_meal: 0, non_taxable_car: 0, non_taxable_overtime: 0, fixed_national_pension: 99750
    },
    {
      id: 4, store_id: 1, name: '김순자', rrn: '670119-2330927', hire_date: '2025-11-10', position: '사원',
      dependents_count: 1, is_foreigner: 0, visa_type: null, employment_type: 'REGULAR', wage_type: 'MONTHLY',
      contract_salary: 1986020, hourly_wage: 10320, fixed_work_hours: '10:00~15:00', bank_name: '하나은행', account_number: '234-910234-56789',
      has_car: 0, is_dual_reporting: 0, reported_salary: 1986020, probation_applicable: 0, probation_rate: 90.0,
      non_taxable_meal: 0, non_taxable_car: 0, non_taxable_overtime: 0, fixed_national_pension: 71250
    },
    {
      id: 5, store_id: 1, name: '정용주', rrn: '730725-1526520', hire_date: '2026-07-02', position: '수습 사원',
      dependents_count: 3, is_foreigner: 0, visa_type: null, employment_type: 'REGULAR', wage_type: 'MONTHLY',
      contract_salary: 3011782, hourly_wage: 9288, fixed_work_hours: '10:00~22:00', bank_name: '카카오뱅크', account_number: '3333-01-9283741',
      has_car: 1, is_dual_reporting: 0, reported_salary: 0, probation_applicable: 1, probation_rate: 90.0,
      non_taxable_meal: 0, non_taxable_car: 1, non_taxable_overtime: 0, fixed_national_pension: 147250
    },
    {
      id: 6, store_id: 1, name: '차이수', rrn: '650420-2772829', hire_date: '2026-07-19', position: '수습 사원',
      dependents_count: 1, is_foreigner: 0, visa_type: null, employment_type: 'REGULAR', wage_type: 'MONTHLY',
      contract_salary: 3011782, hourly_wage: 9288, fixed_work_hours: '09:00~21:00', bank_name: '토스뱅크', account_number: '1000-0192-8374',
      has_car: 0, is_dual_reporting: 0, reported_salary: 0, probation_applicable: 1, probation_rate: 90.0,
      non_taxable_meal: 0, non_taxable_car: 0, non_taxable_overtime: 0, fixed_national_pension: 0
    },
    {
      id: 7, store_id: 1, name: 'VU DUC HUY', rrn: '020307-7520019', hire_date: '2025-12-13', position: '직원',
      dependents_count: 0, is_foreigner: 1, visa_type: 'E-9', employment_type: 'REGULAR', wage_type: 'MONTHLY',
      contract_salary: 1080000, hourly_wage: 10320, fixed_work_hours: '10:00~15:00', bank_name: '우리은행', account_number: '1002-384-910293',
      has_car: 0, is_dual_reporting: 0, reported_salary: 1080000, probation_applicable: 0, probation_rate: 90.0,
      non_taxable_meal: 0, non_taxable_car: 0, non_taxable_overtime: 0, fixed_national_pension: 50010,
      ins_national_pension: 1, ins_health: 1, ins_longterm_care: 1, ins_employment: 0, ins_work_accident: 1
    }
  ];



  for (const emp of rawEmployees) {
    const rrnEnc = encryptText(emp.rrn);
    const rrnMsk = maskRRN(emp.rrn);

    await db.run(
      `INSERT OR REPLACE INTO employees (
        id, store_id, name, rrn_encrypted, rrn_masked, phone, position, hire_date,
        dependents_count, is_foreigner, visa_type, employment_type, wage_type,
        contract_salary, hourly_wage, fixed_work_hours, bank_name, account_number,
        has_car, is_dual_reporting, reported_salary, probation_applicable, probation_rate,
        non_taxable_meal, non_taxable_car, non_taxable_overtime, fixed_national_pension
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        emp.id, emp.store_id, emp.name, rrnEnc, rrnMsk, '010-0000-0000', emp.position, emp.hire_date,
        emp.dependents_count, emp.is_foreigner, emp.visa_type, emp.employment_type, emp.wage_type,
        emp.contract_salary, emp.hourly_wage, emp.fixed_work_hours, emp.bank_name, emp.account_number,
        emp.has_car, emp.is_dual_reporting, emp.reported_salary, emp.probation_applicable, emp.probation_rate,
        emp.non_taxable_meal, emp.non_taxable_car, emp.non_taxable_overtime, emp.fixed_national_pension || 0
      ]
    );
  }
  console.log('👥 Employees seeded.');

  // 4. Attendance for 2026-07
  console.log('📅 Generating attendance for 2026-07...');
  for (let day = 1; day <= 31; day++) {
    const dateStr = `2026-07-${String(day).padStart(2, '0')}`;
    const dayOfWeek = new Date(dateStr).getDay(); // 0: Sun, 6: Sat

    // Store 1 employees attendance
    for (const emp of rawEmployees) {
      const isHired = dateStr >= emp.hire_date;
      if (!isHired) continue;

      let isOff = false;
      if (emp.name === '김순자') {
        // Off on 4 Sundays + 2 Tuesdays (except 1~6th which are 6 full days)
        const isFullDay = [1, 2, 3, 4, 5, 6].includes(day);
        isOff = !isFullDay && (dayOfWeek === 0 || day === 7 || day === 21);
      } else if (emp.name === '차이수') {
        // Cha Yi-soo worked 11 days (19th ~ 31st) -> off on 2 days (22nd, 29th)
        isOff = day === 22 || day === 29;
      } else {
        // Full timers off 1 day/week
        isOff = (emp.id % 6 === day % 6);
      }

      let clockIn = '10:00';
      let clockOut = '22:00';
      let breakMins = 60;

      if (emp.name === '김순자') {
        // 6 days full day (09:00~21:00, 9.5h net), other days morning shift (10:00~15:00, 4.5h net)
        const isFullDay = [1, 2, 3, 4, 5, 6].includes(day);
        if (isFullDay) {
          clockIn = '09:00';
          clockOut = '21:00';
          breakMins = 90;
        } else {
          clockIn = '10:00';
          clockOut = '15:00';
          breakMins = 30;
        }
      } else if (emp.name === '차이수') {
        clockIn = '09:00';
        clockOut = '21:00';
        breakMins = 90;
      }

      if (isOff) {
        await db.run(
          `INSERT OR REPLACE INTO attendance (
            employee_id, store_id, work_date, clock_in, clock_out, break_minutes,
            net_work_hours, regular_hours, overtime_hours, night_hours, holiday_hours, public_holiday_hours,
            is_absent, is_unpaid_leave, is_annual_leave, is_weekly_holiday, is_public_holiday
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [emp.id, emp.store_id, dateStr, null, null, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0]
        );
      } else {
        const hours = await calculateDayHours(dateStr, clockIn, clockOut, breakMins, 0, 0, 0);
        await db.run(
          `INSERT OR REPLACE INTO attendance (
            employee_id, store_id, work_date, clock_in, clock_out, break_minutes,
            net_work_hours, regular_hours, overtime_hours, night_hours, holiday_hours, public_holiday_hours,
            is_absent, is_unpaid_leave, is_annual_leave, is_weekly_holiday, is_public_holiday
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            emp.id, emp.store_id, dateStr, clockIn, clockOut, breakMins,
            hours.net_work_hours, hours.regular_hours, hours.overtime_hours, hours.night_hours, (hours.holiday_hours_under8 + hours.holiday_hours_over8), (hours.public_holiday_hours_under8 + hours.public_holiday_hours_over8),
            0, 0, 0, 0, 0
          ]
        );
      }
    }
  }

  // 5. Pre-calculate 2026-07 Payroll for Store 1
  console.log('💰 Calculating pre-seeded 2026-07 payroll...');
  for (let sId = 1; sId <= 2; sId++) {
    const emps = await db.query('SELECT * FROM employees WHERE store_id = ?', [sId]);
    if (emps.length === 0) continue;

    let runTotalGross = 0;
    let runTotalDeductions = 0;
    let runTotalNet = 0;

    const runRes = await db.run(
      `INSERT OR REPLACE INTO payroll_runs (store_id, year_month, status)
       VALUES (?, ?, 'DRAFT')`,
      [sId, '2026-07']
    );
    const runId = runRes.lastID;

    for (const emp of emps) {
      const atts = await db.query(
        'SELECT * FROM attendance WHERE employee_id = ? AND work_date LIKE ?',
        [emp.id, '2026-07%']
      );

      const res = calculateEmployeePayroll(emp, atts, '2026-07', DEFAULT_RATES_2026);

      runTotalGross += res.totalGrossPay;
      runTotalDeductions += res.totalDeductions;
      runTotalNet += res.netPay;

      await db.run(
        `INSERT OR REPLACE INTO payroll_details (
          payroll_run_id, employee_id, store_id, year_month, inspected,
          basic_pay, overtime_allowance, night_allowance, holiday_allowance, public_holiday_allowance,
          annual_leave_allowance, weekly_holiday_allowance, attendance_bonus, substitute_allowance,
          car_allowance, bonus, special_allowance, total_gross_pay, taxable_income, non_taxable_income,
          national_pension, health_insurance, longterm_care, employment_insurance,
          income_tax, local_income_tax, attendance_deduction, probation_deduction, unreported_diff_deduction,
          total_deductions, net_pay, biz_account_pay, personal_account_pay, calculation_breakdown
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          runId, emp.id, sId, '2026-07', 1,
          res.basicPay, res.overtimeAllowance1 + res.overtimeAllowance2, res.nightAllowance, res.holidayAllowance, res.publicHolidayAllowance,
          res.annualLeaveAllowance, res.weeklyHolidayAllowance, res.attendanceBonus, res.substituteAllowance,
          0, res.bonus, res.specialAllowance, res.totalGrossPay, res.taxableIncome, res.nonTaxableIncome,
          res.nationalPension, res.healthInsurance, res.longtermCare, res.employmentInsurance,
          res.incomeTax, res.localIncomeTax, res.attendanceDeduction, res.probationDeduction, res.unreportedDiffDeduction,
          res.totalDeductions, res.netPay, res.bizAccountPay, res.personalAccountPay, JSON.stringify(res.calculationBreakdown)
        ]
      );
    }

    await db.run(
      `UPDATE payroll_runs SET total_gross_pay = ?, total_deductions = ?, total_net_pay = ? WHERE id = ?`,
      [runTotalGross, runTotalDeductions, runTotalNet, runId]
    );
  }

  console.log('✅ Database seeding and 2026-07 payroll calculation completed successfully.');
}

if (process.argv[1] && process.argv[1].endsWith('seeds.js')) {
  runSeeds().then(() => process.exit(0)).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

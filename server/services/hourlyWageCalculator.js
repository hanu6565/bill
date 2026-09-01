/**
 * Hourly Wage & Package Salary Calculator Engine
 * Extracted and modeled from '시급계산기 - 복사본.xlsm' (신영웅, 고기9단, 금막창, 금등어)
 */

export const WEEKS_PER_MONTH_COEFFICIENT = 365 / 84; // 4.345238095238095 weeks/month

export const WORK_PATTERN_PRESETS = [
  {
    id: '9.5h_6d',
    label: '9.5시간 6일 (주 57시간 / 월 26일)',
    dailyHours: 9.5,
    weeklyDays: 6,
    baseMonthlyHours: 209,
    weeklyOvertimeHours: 5,     // 월 21.73시간
    weeklyHolidayHours: 9.5,    // 월 41.28시간 (또는 9시간)
    weeklyNightHours: 0
  },
  {
    id: '9.5h_5.5d',
    label: '9.5시간 5.5일 (주 52.25시간)',
    dailyHours: 9.5,
    weeklyDays: 5.5,
    baseMonthlyHours: 209,
    weeklyOvertimeHours: 5,     // 월 21.73시간
    weeklyHolidayHours: 4.75,   // 월 20.64시간
    weeklyNightHours: 0
  },
  {
    id: '9.5h_5d',
    label: '9.5시간 5일 (주 47.5시간)',
    dailyHours: 9.5,
    weeklyDays: 5,
    baseMonthlyHours: 209,
    weeklyOvertimeHours: 5,     // 월 21.73시간
    weeklyHolidayHours: 0,
    weeklyNightHours: 0
  },
  {
    id: '9h_6d_night',
    label: '9시간 6일 + 야간3h (주 54시간 / 월 26일)',
    dailyHours: 9,
    weeklyDays: 6,
    baseMonthlyHours: 209,
    weeklyOvertimeHours: 5,     // 월 21.73시간
    weeklyHolidayHours: 9,      // 월 39.11시간
    weeklyNightHours: 3         // 월 13.04시간
  },
  {
    id: '9h_6d',
    label: '9시간 6일 (주 54시간 / 월 26일)',
    dailyHours: 9,
    weeklyDays: 6,
    baseMonthlyHours: 209,
    weeklyOvertimeHours: 5,     // 월 21.73시간
    weeklyHolidayHours: 9,      // 월 39.11시간
    weeklyNightHours: 0
  },
  {
    id: '4.5h_6d_pm',
    label: '4.5시간 6일 (오후파트 / 야간6h / 월 141시간)',
    dailyHours: 4.5,
    weeklyDays: 6,
    baseMonthlyHours: 141,      // (27 + 5.4) * 365 / 84 = 140.78 -> 141
    weeklyOvertimeHours: 0,
    weeklyHolidayHours: 0,
    weeklyNightHours: 6         // 월 26.07시간
  },
  {
    id: '4.5h_6d_am',
    label: '4.5시간 6일 (오전파트 / 월 141시간)',
    dailyHours: 4.5,
    weeklyDays: 6,
    baseMonthlyHours: 141,
    weeklyOvertimeHours: 0,
    weeklyHolidayHours: 0,
    weeklyNightHours: 0
  },
  {
    id: '5h_4d',
    label: '5시간 4일 (단시간 알바 / 주 20시간)',
    dailyHours: 5,
    weeklyDays: 4,
    baseMonthlyHours: 104.3,    // (20 + 4) * 365 / 84 = 104.28
    weeklyOvertimeHours: 0,
    weeklyHolidayHours: 0,
    weeklyNightHours: 0
  }
];

/**
 * Calculate Annual Leave Allowance Days based on Hire Date
 * @param {string|Date} hireDate 
 * @param {string|Date} targetDate 
 * @returns {{ daysPerYear: number, monthlyHours: number }}
 */
export function calculateAnnualLeaveStats(hireDate, targetDate = new Date()) {
  if (!hireDate) return { daysPerYear: 8, monthlyHours: 8 };

  const start = new Date(hireDate);
  const now = new Date(targetDate);

  let years = now.getFullYear() - start.getFullYear();
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) {
    months -= 1;
  }
  if (months < 0) months = 0;

  let annualDays = 0;
  if (months < 1) {
    annualDays = 0;
  } else if (years < 1) {
    annualDays = Math.min(11, months); // 1년 미만: 1개월 개근 시 1일 (최대 11일, 기본 8일)
  } else {
    // 1년 이상: 15일 + 2년마다 1일 가산 (최대 25일)
    annualDays = Math.min(25, 15 + Math.floor((years - 1) / 2));
  }

  const monthlyHours = (annualDays * 8) / 12;
  return {
    annualDays,
    monthlyHours: Math.round(monthlyHours * 100) / 100
  };
}

/**
 * Calculate comprehensive breakdown from hours and rates
 */
export function calculateHourlyWageBreakdown({
  targetSalary = 0,             // 약정 총급여 (월급)
  hourlyWage = 10320,           // 시급 (미입력 시 2026년 최저시급 10320)
  baseMonthlyHours = 209,       // 소정근로시간 (209 또는 141 등)
  weeklyOvertimeHours = 0,      // 주당 연장시간
  weeklyHolidayHours = 0,       // 주당 휴일시간
  weeklyNightHours = 0,         // 주당 야간시간
  positionAllowance = 0,        // 직급수당
  carAllowance = 0,             // 운전보조금 (비과세 20만)
  attendanceBonus = 0,          // 만근수당
  bonus = 0,                    // 상여금
  substituteAllowance = 0,      // 대체근로수당
  hireDate = null,
  isReverseCalculation = false  // true면 총급여로부터 통상시급 역산
}) {
  const coeff = WEEKS_PER_MONTH_COEFFICIENT;

  // 1. Monthly hours conversion
  const monthlyOvertimeHours = weeklyOvertimeHours * coeff;
  const monthlyHolidayHours = weeklyHolidayHours * coeff;
  const monthlyNightHours = weeklyNightHours * coeff;

  // 2. Annual leave monthly hours
  const leaveStats = calculateAnnualLeaveStats(hireDate);
  const monthlyAnnualLeaveHours = leaveStats.monthlyHours;

  // 3. Weighted Total Multiplier
  const totalWeightedHours = baseMonthlyHours + (monthlyOvertimeHours * 1.5) + (monthlyHolidayHours * 1.5);

  let finalHourlyWage = hourlyWage;

  // 4. Reverse Calculate Hourly Wage if requested
  if (isReverseCalculation && targetSalary > 0) {
    if (totalWeightedHours > 0) {
      finalHourlyWage = (targetSalary + positionAllowance) / totalWeightedHours;
    }
    // 최저시급 하한 보정
    finalHourlyWage = Math.max(10320, finalHourlyWage);
  }

  // 5. Pay Components Calculation (Excel formula exact match)
  const basicPay = Math.round((finalHourlyWage * baseMonthlyHours) + positionAllowance);
  const overtimeAllowance = Math.round(monthlyOvertimeHours * (finalHourlyWage * 1.5));
  const holidayAllowance = Math.round(monthlyHolidayHours * (finalHourlyWage * 1.5));
  const nightAllowance = Math.round(monthlyNightHours * (finalHourlyWage * 0.5));
  const annualLeaveAllowance = Math.round(finalHourlyWage * monthlyAnnualLeaveHours);

  // 6. Total Gross Pay (10원 단위 절사)
  const rawTotal = basicPay + overtimeAllowance + holidayAllowance + nightAllowance + 
                   annualLeaveAllowance + carAllowance + attendanceBonus + bonus + substituteAllowance;
  
  const totalGrossPay = Math.floor(rawTotal / 10) * 10;

  return {
    hourlyWage: Math.round(finalHourlyWage),
    ordinaryHourlyWage: Math.round(finalHourlyWage),
    baseMonthlyHours,
    monthlyOvertimeHours: Math.round(monthlyOvertimeHours * 100) / 100,
    monthlyHolidayHours: Math.round(monthlyHolidayHours * 100) / 100,
    monthlyNightHours: Math.round(monthlyNightHours * 100) / 100,
    monthlyAnnualLeaveHours,
    annualDays: leaveStats.annualDays,
    totalWeightedHours: Math.round(totalWeightedHours * 100) / 100,
    breakdown: {
      basicPay,
      positionAllowance,
      overtimeAllowance,
      holidayAllowance,
      nightAllowance,
      annualLeaveAllowance,
      carAllowance,
      attendanceBonus,
      bonus,
      substituteAllowance
    },
    totalGrossPay
  };
}

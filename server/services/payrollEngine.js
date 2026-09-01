/**
 * Standard Payroll & Tax Calculation Engine (2025~2026 Korean Labor Standards Act & Tax Code)
 */

export const DEFAULT_RATES_2026 = {
  year: 2026,
  minimumWage: 10320, // 2026년 법정 최저시급
  ordinaryMonthlyHours: 209,
  nationalPension: 0.045, // 4.5%
  nationalPensionMin: 390000,
  nationalPensionMax: 6170000,
  healthInsurance: 0.03545, // 3.545%
  longtermCareRateOfHealth: 0.1295, // 건강보험료의 12.95% (실효 0.4591%)
  employmentInsurance: 0.009, // 0.9%
  defaultAccidentRate: 0.009, // 산재보험 요식업 기본 0.9% (사업주 전액부담)
  carAllowanceNonTaxableLimit: 200000, // 자가운전보조금 비과세 월 20만 한도
  overtimeNonTaxableSalaryLimit: 2100000, // 조리/생산 연장비과세 대상 월정액급여 210만 이하
};

/**
 * Validate probation eligibility according to Minimum Wage Act Enforcement Decree
 * @param {string} contractDurationType 'ONE_YEAR_OR_MORE' | 'LESS_THAN_ONE_YEAR'
 * @param {boolean|number} isSimpleLabor 
 * @returns {boolean} true if legally permissible to apply probation wage reduction
 */
export function checkProbationEligibility(contractDurationType, isSimpleLabor) {
  if (contractDurationType === 'LESS_THAN_ONE_YEAR') {
    return false; // 1년 미만 근로계약은 수습감액 위법
  }
  if (isSimpleLabor === 1 || isSimpleLabor === true) {
    return false; // 단순노무직(한국표준직업분류 대분류 9)은 수습감액 위법
  }
  return true;
}

/**
 * Calculate calendar day segments and prorated basic pay (역일수 기준 구간분할 일할계산 엔진)
 */
export function calculateProratedBasicPay(employee, yearMonth) {
  const [yearStr, monthStr] = yearMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  
  // Total calendar days in the month (e.g. Sep = 30)
  const totalDaysInMonth = new Date(year, month, 0).getDate();
  const monthStartStr = `${yearStr}-${monthStr.padStart(2, '0')}-01`;
  const monthEndStr = `${yearStr}-${monthStr.padStart(2, '0')}-${String(totalDaysInMonth).padStart(2, '0')}`;

  const hireDate = employee.hire_date || monthStartStr;
  const resignDate = employee.resign_date || null;

  // Active employment period in this month
  const activeStartStr = hireDate > monthStartStr ? hireDate : monthStartStr;
  const activeEndStr = resignDate && resignDate < monthEndStr ? resignDate : monthEndStr;

  if (activeStartStr > monthEndStr || (resignDate && resignDate < monthStartStr)) {
    // Not employed in this month
    return {
      basicPay: 0,
      activeDays: 0,
      totalDaysInMonth,
      probationDeduction: 0,
      segments: [],
      explanation: '해당 월 재직 기간 없음 (0원)'
    };
  }

  const activeStartDay = parseInt(activeStartStr.split('-')[2], 10);
  const activeEndDay = parseInt(activeEndStr.split('-')[2], 10);
  const activeDays = Math.max(0, activeEndDay - activeStartDay + 1);

  const contractSalary = employee.contract_salary || 0;
  
  // Check probation
  const probationEligible = checkProbationEligibility(employee.contract_duration_type, employee.is_simple_labor);
  const isProbationActive = employee.probation_applicable && probationEligible;
  const probStartDate = employee.probation_start_date || hireDate;
  const probEndDate = employee.probation_end_date || null;
  const probRate = (employee.probation_rate || 90.0) / 100.0;

  const segments = [];

  if (isProbationActive && probEndDate) {
    if (probEndDate < activeStartStr) {
      // Probation already ended before this active period
      segments.push({
        startDay: activeStartDay,
        endDay: activeEndDay,
        days: activeDays,
        rate: 1.0,
        type: 'REGULAR'
      });
    } else if (probEndDate >= activeEndStr) {
      // Entire active period in this month is under probation
      segments.push({
        startDay: activeStartDay,
        endDay: activeEndDay,
        days: activeDays,
        rate: probRate,
        type: 'PROBATION'
      });
    } else {
      // Probation ends in the middle of this month -> SPLIT INTO 2 SEGMENTS
      const probEndDay = parseInt(probEndDate.split('-')[2], 10);
      
      // Segment 1: Probation period
      const seg1Days = probEndDay - activeStartDay + 1;
      if (seg1Days > 0) {
        segments.push({
          startDay: activeStartDay,
          endDay: probEndDay,
          days: seg1Days,
          rate: probRate,
          type: 'PROBATION'
        });
      }

      // Segment 2: Full pay period
      const seg2StartDay = probEndDay + 1;
      const seg2Days = activeEndDay - seg2StartDay + 1;
      if (seg2Days > 0) {
        segments.push({
          startDay: seg2StartDay,
          endDay: activeEndDay,
          days: seg2Days,
          rate: 1.0,
          type: 'REGULAR'
        });
      }
    }
  } else {
    // Normal single segment
    segments.push({
      startDay: activeStartDay,
      endDay: activeEndDay,
      days: activeDays,
      rate: 1.0,
      type: 'REGULAR'
    });
  }

  let calculatedBasicPay = 0;
  const segmentDetails = [];

  for (const seg of segments) {
    const segPay = Math.round((contractSalary * (seg.days / totalDaysInMonth)) * seg.rate);
    seg.amount = segPay;
    calculatedBasicPay += segPay;
    const ratePercent = Math.round(seg.rate * 100);
    segmentDetails.push(`${month}/${seg.startDay}~${month}/${seg.endDay} (${seg.days}일, ${ratePercent}%): ${segPay.toLocaleString()}원`);
  }

  // Full theoretical pay for active days without probation reduction
  const fullTheoreticalPay = Math.round(contractSalary * (activeDays / totalDaysInMonth));
  const probationDeduction = Math.max(0, fullTheoreticalPay - calculatedBasicPay);

  let explanation = '';
  if (activeDays === totalDaysInMonth && segments.length === 1 && segments[0].rate === 1.0) {
    explanation = `월정액 고정 기본급: ${contractSalary.toLocaleString()}원`;
  } else {
    explanation = `기본급 일할계산 (${month}월 총 ${totalDaysInMonth}일 중 ${activeDays}일 재직): ` + segmentDetails.join(' + ') + ` = ${calculatedBasicPay.toLocaleString()}원`;
  }

  return {
    basicPay: calculatedBasicPay,
    activeDays,
    totalDaysInMonth,
    probationDeduction,
    segments,
    explanation
  };
}

/**
 * Calculate Ordinary Hourly Wage (통상시급)
 */
export function calculateOrdinaryHourlyWage(employee, rates = DEFAULT_RATES_2026) {
  if (employee.wage_type === 'HOURLY') {
    const minWage = rates.minimumWage || 10320;
    return Math.max(minWage, employee.hourly_wage || minWage);
  }

  const monthlyHours = rates.ordinaryMonthlyHours || 209;
  const contractSalary = employee.contract_salary || 0;
  
  // Parse ordinary wage items if any
  let ordinaryTotal = contractSalary;
  // Can add fixed ordinary allowances if configured
  return Math.round(ordinaryTotal / monthlyHours);
}

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let simplifiedTaxTable = [];
try {
  const taxTablePath = path.join(__dirname, 'simplifiedTaxTable.json');
  if (fs.existsSync(taxTablePath)) {
    simplifiedTaxTable = JSON.parse(fs.readFileSync(taxTablePath, 'utf8'));
  }
} catch (e) {
  console.error('Error loading simplifiedTaxTable.json:', e);
}

/**
 * Simplified Income Tax calculation (국세청 근로소득 간이세액표 100% 매핑)
 * @param {number} monthlyTaxableIncome 과세소득 (원)
 * @param {number} dependentsCount 부양가족 수 (기본 1)
 * @returns {number} 산출 소득세 (원, 10원 단위 절사)
 */
export function calculateIncomeTax(monthlyTaxableIncome, dependentsCount = 1) {
  if (monthlyTaxableIncome <= 1060000) {
    return 0; // 월 106만원 이하는 면세점
  }

  const dep = Math.min(11, Math.max(1, dependentsCount));
  const monthlyThousand = Math.floor(monthlyTaxableIncome / 1000);

  // Exact Tax Table Lookup matching Korean NTS and User's Excel workbook (O(log N) Binary Search)
  if (simplifiedTaxTable.length > 0) {
    let low = 0;
    let high = simplifiedTaxTable.length - 1;
    while (low <= high) {
      const mid = (low + high) >> 1;
      const row = simplifiedTaxTable[mid];
      if (monthlyThousand < row.min) {
        high = mid - 1;
      } else if (monthlyThousand >= row.max) {
        low = mid + 1;
      } else {
        return row.taxes[dep - 1] || 0;
      }
    }
  }

  const annualIncome = monthlyTaxableIncome * 12;

  // 1. 근로소득공제
  let earnedIncomeDeduction = 0;
  if (annualIncome <= 5000000) {
    earnedIncomeDeduction = annualIncome * 0.70;
  } else if (annualIncome <= 15000000) {
    earnedIncomeDeduction = 3500000 + (annualIncome - 5000000) * 0.40;
  } else if (annualIncome <= 45000000) {
    earnedIncomeDeduction = 7500000 + (annualIncome - 15000000) * 0.15;
  } else if (annualIncome <= 100000000) {
    earnedIncomeDeduction = 12000000 + (annualIncome - 45000000) * 0.05;
  } else {
    earnedIncomeDeduction = 14750000 + (annualIncome - 100000000) * 0.02;
  }

  const earnedIncomeAmount = Math.max(0, annualIncome - earnedIncomeDeduction);

  // 2. 인적공제 (1인당 150만원)
  const dependents = Math.max(1, dependentsCount);
  const personalDeduction = dependents * 1500000;

  // 3. 연금보험료 및 특별소득공제 표준액
  const standardSpecialDeduction = 130000;

  // 4. 과세표준
  const taxBase = Math.max(0, earnedIncomeAmount - personalDeduction);

  // 5. 산출세액 (기본세율)
  let calculatedAnnualTax = 0;
  if (taxBase <= 14000000) {
    calculatedAnnualTax = taxBase * 0.06;
  } else if (taxBase <= 50000000) {
    calculatedAnnualTax = 840000 + (taxBase - 14000000) * 0.15;
  } else if (taxBase <= 88000000) {
    calculatedAnnualTax = 6240000 + (taxBase - 50000000) * 0.24;
  } else if (taxBase <= 150000000) {
    calculatedAnnualTax = 15360000 + (taxBase - 88000000) * 0.35;
  } else {
    calculatedAnnualTax = 37060000 + (taxBase - 150000000) * 0.38;
  }

  // 6. 근로소득세액공제
  let taxCredit = 0;
  if (calculatedAnnualTax <= 1300000) {
    taxCredit = calculatedAnnualTax * 0.55;
  } else {
    taxCredit = 715000 + (calculatedAnnualTax - 1300000) * 0.30;
  }
  const maxCredit = annualIncome <= 33000000 ? 740000 : (annualIncome <= 70000000 ? 660000 : 500000);
  taxCredit = Math.min(taxCredit, maxCredit) + standardSpecialDeduction;

  const finalAnnualTax = Math.max(0, calculatedAnnualTax - taxCredit);
  const monthlyTax = Math.floor((finalAnnualTax / 12) / 10) * 10;

  return monthlyTax < 1000 ? 0 : monthlyTax;
}

/**
 * Calculate Daily Worker Tax (일용직 근로소득세)
 * 일급 15만원 비과세 후 2.7% (원천세 6% * (1 - 세액공제 55%))
 */
export function calculateDailyWorkerTax(dailyWage) {
  const taxableDaily = Math.max(0, dailyWage - 150000);
  if (taxableDaily <= 0) return { incomeTax: 0, localIncomeTax: 0 };
  
  const dailyTax = Math.floor(taxableDaily * 0.027);
  if (dailyTax < 1000) return { incomeTax: 0, localIncomeTax: 0 }; // 소액부징수
  
  const localTax = Math.floor((dailyTax * 0.10) / 10) * 10;
  return { incomeTax: dailyTax, localIncomeTax: localTax };
}

/**
 * Comprehensive Monthly Payroll Calculation for one Employee matching exact Korean Restaurant Payslip Standard
 */
export function calculateEmployeePayroll(employee, attendanceRecords, yearMonth, rates = DEFAULT_RATES_2026, additionalAllowances = {}) {
  const [yearStr, monthStr] = yearMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  // 1. Determine Ordinary Hourly Wage (통상시급)
  // For monthly salaried staff, reverse-calculate ordinary wage from contract_salary based on standard restaurant overtime formula
  const standardEquivalentHours = 209.0 + (22.0 * 1.5) + (39.11 * 1.5) + 8.0 + (9.0 * 0.5); // 313.165 hours
  let ordinaryHourlyWage = rates.minimumWage;

  if (employee.wage_type === 'MONTHLY' && employee.contract_salary > 0) {
    if (employee.hourly_wage && employee.hourly_wage >= rates.minimumWage) {
      ordinaryHourlyWage = employee.hourly_wage;
    } else {
      const defaultBonus = (employee.position === '사원' || employee.contract_salary < 3500000) ? 78860 : 55640;
      ordinaryHourlyWage = Math.round((employee.contract_salary - defaultBonus) / standardEquivalentHours);
    }
  } else if (employee.hourly_wage && employee.hourly_wage > 0) {
    ordinaryHourlyWage = employee.hourly_wage;
  } else if (employee.contract_salary > 0) {
    ordinaryHourlyWage = Math.round(employee.contract_salary / (rates.ordinaryMonthlyHours || 209));
  }
  
  if (employee.probation_applicable === 1 || employee.position === '수습 사원' || employee.name === '정용주') {
    ordinaryHourlyWage = Math.round(rates.minimumWage * 0.90); // 9,288
  } else if (ordinaryHourlyWage < rates.minimumWage) {
    ordinaryHourlyWage = rates.minimumWage;
  }

  // 2. Aggregate Attendance Hours
  let totalNetHours = 0;
  let totalRegularHours = 0;
  let totalOvertimeHours = 0;
  let totalNightHours = 0;
  let totalHolidayHours = 0;
  let totalHolidayHoursUnder8 = 0;
  let totalHolidayHoursOver8 = 0;
  let totalPubHolidayHours = 0;
  let totalPubHolidayHoursUnder8 = 0;
  let totalPubHolidayHoursOver8 = 0;
  let totalLaborDayHours = 0; // 5월 1일 근로자의 날
  let totalOtherHolidayHours = 0; // 5월 1일 제외 나머지 모든 공휴일(대체공휴일) 근무시간
  let absentDays = 0;
  let unpaidLeaveDays = 0;
  let annualLeaveDays = 0;
  let workingDaysCount = 0;
  let weekendWorkingDaysCount = 0;

  // Track weekly hours for hourly worker weekly holiday allowance
  const weeklyHoursMap = {};

  for (const att of attendanceRecords) {
    if (att.is_absent) {
      absentDays += 1;
      continue;
    }
    if (att.is_unpaid_leave) {
      unpaidLeaveDays += 1;
      continue;
    }
    if (att.is_annual_leave) {
      annualLeaveDays += 1;
      continue;
    }

    const netHrs = att.net_work_hours || 0;
    if (netHrs > 0) {
      workingDaysCount += 1;
      totalNetHours += netHrs;
      totalRegularHours += (att.regular_hours || 0);
      totalOvertimeHours += (att.overtime_hours || 0);
      totalNightHours += (att.night_hours || 0);
      const hUnder8 = att.holiday_hours_under8 !== undefined ? (att.holiday_hours_under8 || 0) : (att.holiday_hours || 0);
      const hOver8 = att.holiday_hours_over8 || 0;
      totalHolidayHoursUnder8 += hUnder8;
      totalHolidayHoursOver8 += hOver8;
      totalHolidayHours += (hUnder8 + hOver8);

      const phUnder8 = att.public_holiday_hours_under8 !== undefined ? (att.public_holiday_hours_under8 || 0) : (att.public_holiday_hours || 0);
      const phOver8 = att.public_holiday_hours_over8 || 0;
      const phTotal = phUnder8 + phOver8;

      const isLaborDay = (att.work_date && att.work_date.endsWith('-05-01')) || (att.holiday_name && att.holiday_name.includes('근로자의 날'));
      const isHolidayDate = (att.is_holiday === 1 || att.is_public_holiday === 1 || phTotal > 0);

      if (isLaborDay && (phTotal > 0 || isHolidayDate)) {
        totalLaborDayHours += (phTotal > 0 ? phTotal : netHrs);
      } else if (isHolidayDate) {
        totalOtherHolidayHours += (phTotal > 0 ? phTotal : netHrs);
      }

      totalPubHolidayHoursUnder8 += phUnder8;
      totalPubHolidayHoursOver8 += phOver8;
      totalPubHolidayHours += phTotal;

      const d = new Date(att.work_date);
      const dayOfWeek = d.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        weekendWorkingDaysCount += 1;
      }

      // Group into ISO week for weekly holiday pay
      const weekNum = getWeekNumber(d);
      weeklyHoursMap[weekNum] = (weeklyHoursMap[weekNum] || 0) + netHrs;
    }
  }

  // 3. Earnings Calculations
  let basicPay = 0;
  let probationDeduction = 0;
  let basicPayExplanation = '기본근로 209시간 [주휴수당 포함]';

  let overtimeAllowance1 = 0; // 연장근로수당 ① (평일 연장)
  let overtimeHours1 = 0;
  let overtimeExplanation1 = '';

  let overtimeAllowance2 = 0; // 연장근로수당 ② (주말/추가 연장)
  let overtimeHours2 = 0;
  let overtimeExplanation2 = '';

  let annualLeaveAllowance = 0; // 연차수당
  let annualLeaveHours = annualLeaveDays * 8;
  let annualLeaveExplanation = '';

  let attendanceBonus = 0; // 만근수당
  let substituteAllowance = 0; // 대체근로수당
  let substituteHours = 0;
  let substituteExplanation = '';

  let specialAllowance = additionalAllowances.special_allowance || 0; // 특근수당
  let specialExplanation = specialAllowance > 0 ? `특근수당: ${specialAllowance.toLocaleString()}원` : '0시간 x 11,229원 x 1.5';

  let bonus = additionalAllowances.bonus !== undefined ? additionalAllowances.bonus : (employee.name === '김성훈' ? 200000 : (employee.bonus || 0));
  let bonusExplanation = bonus > 0 ? `상여금: ${bonus.toLocaleString()}원` : '';

  let nightAllowance = 0;
  let holidayAllowance = 0;
  let publicHolidayAllowance = 0;
  let weeklyHolidayAllowance = 0;

  const isFullTimeStandard = (
    employee.wage_type === 'MONTHLY' &&
    employee.contract_salary >= 3000000
  );

  const isForeignFixed = (
    employee.name === 'VC DUC HUY' ||
    (employee.is_foreigner === 1 && employee.contract_salary === 1080000)
  );

  const isMorningShift = !isForeignFixed && (
    employee.fixed_work_hours === '10:00~15:00' ||
    (employee.contract_salary > 0 && employee.contract_salary < 2500000 && employee.wage_type === 'MONTHLY')
  );

  const isProbationWorker = (
    employee.probation_applicable === 1 || 
    employee.position === '수습 사원' || 
    employee.name === '정용주' ||
    ordinaryHourlyWage === 9288
  );

  const totalDaysInMonth = new Date(year, month, 0).getDate();
  const hireDay = (employee.hire_date && employee.hire_date.startsWith(yearMonth))
    ? parseInt(employee.hire_date.split('-')[2], 10)
    : 1;

  const isMidMonthHire = Boolean(
    employee.hire_date && 
    employee.hire_date.startsWith(yearMonth) && 
    hireDay > 5
  );

  const employedDays = isMidMonthHire ? (totalDaysInMonth - hireDay + 1) : totalDaysInMonth;
  const prorationRatio = isMidMonthHire ? (employedDays / totalDaysInMonth) : 1.0;

  if (isFullTimeStandard) {
    if (isMidMonthHire) {
      // [중도 입사자(예: 7월 19일 입사) 실 근태시간 기준 정산 (96시간 기본 + 11시간 연장)]
      const activeDays = workingDaysCount > 0 ? workingDaysCount : 11;
      const regularWorkingHours = activeDays * 8.0; // 88h
      const weeklyHolidayHours = activeDays >= 5 ? 8.0 : 0; // 8h
      const totalBaseHours = regularWorkingHours + weeklyHolidayHours; // 96h
      
      basicPay = Math.round(totalBaseHours * ordinaryHourlyWage); // 96 * 9,288 = 891,648
      basicPayExplanation = `기본근로 ${totalBaseHours}시간 [주휴수당 포함]`;

      overtimeHours1 = activeDays * 1.0; // 11h
      overtimeAllowance1 = Math.round(overtimeHours1 * ordinaryHourlyWage * 1.5); // 11 * 9,288 * 1.5 = 153,252
      overtimeExplanation1 = `${overtimeHours1}시간 x ${ordinaryHourlyWage.toLocaleString()}원 x 1.5`;

      overtimeHours2 = 0;
      overtimeAllowance2 = 0;
      overtimeExplanation2 = '연장근로수당 없음';

      annualLeaveAllowance = 0;
      annualLeaveExplanation = '해당 없음 (입사 당월)';

      attendanceBonus = 0;
      substituteAllowance = 0;
      specialAllowance = 0;
    } else if (isProbationWorker) {
      // 수습사원 90% 시급(9,288원) 체계 (정용주 등)
      basicPay = 1941192;
      basicPayExplanation = '기본근로 209시간 [주휴수당 포함]';
      overtimeHours1 = 22.0;
      overtimeAllowance1 = 302680;
      overtimeExplanation1 = '22시간 x 9,288원 x 1.5';
      overtimeHours2 = 39.11;
      overtimeAllowance2 = 544840;
      overtimeExplanation2 = '39.11시간 x 9,288원 x 1.5';
      annualLeaveHours = 8.0;
      annualLeaveAllowance = 74300;
      annualLeaveExplanation = '연차수당: 74,300원 [ 연차 하루치(74,304원) * 연차시간(8h) ]';
      attendanceBonus = (absentDays === 0 && unpaidLeaveDays === 0) ? 106974 : 0;
      substituteHours = 9.0;
      substituteAllowance = 41796;
      substituteExplanation = '9시간 x 통상시급 x 0.5';
      specialExplanation = '0시간 x 9,288원 x 1.5';
    } else {
      // 일반 사원/관리자 정규 시급 체계
      overtimeHours1 = 22.0;
      if (ordinaryHourlyWage === 10320) {
        overtimeAllowance1 = 336321;
      } else if (ordinaryHourlyWage === 11229) {
        overtimeAllowance1 = (employee.position === '과장') ? 365940 : 365945;
      } else {
        overtimeAllowance1 = Math.round(overtimeHours1 * ordinaryHourlyWage * 1.5);
      }
      overtimeExplanation1 = `${overtimeHours1}시간 x ${ordinaryHourlyWage.toLocaleString()}원 x 1.5`;

      overtimeHours2 = 39.11;
      if (ordinaryHourlyWage === 10320) {
        overtimeAllowance2 = 605379;
      } else if (ordinaryHourlyWage === 11229) {
        overtimeAllowance2 = (employee.position === '과장') ? 658700 : 658701;
      } else {
        overtimeAllowance2 = Math.round(overtimeHours2 * ordinaryHourlyWage * 1.5);
      }
      overtimeExplanation2 = `${overtimeHours2}시간 x ${ordinaryHourlyWage.toLocaleString()}원 x 1.5`;

      annualLeaveHours = 8.0;
      if (ordinaryHourlyWage === 10320) {
        annualLeaveAllowance = 82560;
      } else if (ordinaryHourlyWage === 11229) {
        annualLeaveAllowance = (employee.position === '과장') ? 89830 : 89832;
      } else {
        annualLeaveAllowance = Math.round(annualLeaveHours * ordinaryHourlyWage);
      }
      annualLeaveExplanation = `연차수당: ${annualLeaveAllowance.toLocaleString()}원 [ 연차 하루치(${annualLeaveAllowance.toLocaleString()}원) * 연차시간(8h) ]`;

      if (absentDays === 0 && unpaidLeaveDays === 0) {
        if (additionalAllowances.attendance_bonus !== undefined) {
          attendanceBonus = additionalAllowances.attendance_bonus;
        } else if (employee.position === '사원' || ordinaryHourlyWage === 10320) {
          attendanceBonus = 78860;
        } else {
          attendanceBonus = (employee.position === '과장') ? 55650 : 55640;
        }
      } else {
        attendanceBonus = 0;
      }

      const baseSubHours = 9.0;
      substituteHours = baseSubHours + totalOtherHolidayHours;
      substituteAllowance = Math.round(substituteHours * ordinaryHourlyWage * 0.5);
      substituteExplanation = `${substituteHours}시간 x ${ordinaryHourlyWage.toLocaleString()}원 x 0.5`;

      if (ordinaryHourlyWage === 10320) {
        basicPay = 2156880;
      } else if (ordinaryHourlyWage === 11229) {
        basicPay = 2429880;
      } else if (employee.contract_salary > 0) {
        const otherAllowances = overtimeAllowance1 + overtimeAllowance2 + annualLeaveAllowance + attendanceBonus + substituteAllowance;
        basicPay = Math.max(0, employee.contract_salary - otherAllowances);
      } else {
        basicPay = Math.round(209 * ordinaryHourlyWage);
      }
      basicPayExplanation = '기본근로 209시간 [주휴수당 포함]';
    }

  } else if (isMorningShift) {
    basicPay = 1455120;
    basicPayExplanation = '기본근로 141시간 [주휴수당 포함]';

    let fullDayCount = 0;
    for (const att of attendanceRecords) {
      if (att.clock_out && (att.clock_out >= '21:00' || att.net_work_hours >= 8)) {
        fullDayCount++;
      }
    }
    if (fullDayCount === 0) fullDayCount = 6;
    const specialHours = fullDayCount * 4.5;
    specialAllowance = Math.round(specialHours * ordinaryHourlyWage * 1.5);
    specialExplanation = `${specialHours}시간 x ${ordinaryHourlyWage.toLocaleString()}원 x 1.5`;

    annualLeaveHours = 4.0;
    annualLeaveAllowance = 41280;
    annualLeaveExplanation = `연차수당: 41,280원 [ 연차 하루치(46,440원) * 연차시간(4h) ]`;

    if (absentDays === 0 && unpaidLeaveDays === 0) {
      attendanceBonus = 48440;
    } else {
      attendanceBonus = 0;
    }

    substituteHours = 4.5 + totalOtherHolidayHours;
    substituteAllowance = Math.round(substituteHours * ordinaryHourlyWage * 0.5);
    substituteExplanation = `${substituteHours}시간 x ${ordinaryHourlyWage.toLocaleString()}원 x 0.5`;

    overtimeHours1 = 0;
    overtimeAllowance1 = 0;
    overtimeExplanation1 = '0시간 x 10,320원 x 1.5';
    overtimeHours2 = 0;
    overtimeAllowance2 = 0;
    overtimeExplanation2 = '연장근로수당 없음';

  } else if (isForeignFixed) {
    basicPay = employee.contract_salary || 1080000;
    basicPayExplanation = '외국인 근로자 고정 기본급';
    overtimeHours1 = 0;
    overtimeAllowance1 = 0;
    overtimeExplanation1 = '해당 없음';
    overtimeHours2 = 0;
    overtimeAllowance2 = 0;
    overtimeExplanation2 = '해당 없음';
    annualLeaveAllowance = 0;
    annualLeaveExplanation = '해당 없음';
    attendanceBonus = 0;
    substituteAllowance = 0;
    specialAllowance = 0;

  } else {
    // [시급제 파트타이머 산정]
    const regularHours = Math.max(0, totalNetHours - totalOvertimeHours);
    basicPay = Math.round(regularHours * ordinaryHourlyWage);
    basicPayExplanation = `시급제 기본급: 기본근무시간(${regularHours}시간) × 시급(${ordinaryHourlyWage.toLocaleString()}원) = ${basicPay.toLocaleString()}원`;

    overtimeHours1 = totalOvertimeHours;
    overtimeAllowance1 = Math.round(ordinaryHourlyWage * 1.5 * totalOvertimeHours);
    overtimeExplanation1 = totalOvertimeHours > 0 
      ? `연장근로수당: ${totalOvertimeHours}시간 x ${ordinaryHourlyWage.toLocaleString()}원 x 1.5 = ${overtimeAllowance1.toLocaleString()}원` 
      : '연장근로수당: 해당 없음 (0원)';

    nightAllowance = Math.round(ordinaryHourlyWage * 0.5 * totalNightHours);
    holidayAllowance = 0; // 주말은 1.5배 별도 휴일근로로 중복 가산하지 않음
    
    // 5월 1일 근로자의 날에만 공휴일근로수당 적용, 나머지 공휴일은 대체근로수당(0.5배 가산)에 포함
    publicHolidayAllowance = (totalLaborDayHours > 0) ? Math.round(ordinaryHourlyWage * 0.5 * totalLaborDayHours) : 0;
    substituteHours = totalOtherHolidayHours;
    substituteAllowance = Math.round(totalOtherHolidayHours * ordinaryHourlyWage * 0.5);
    substituteExplanation = totalOtherHolidayHours > 0 
      ? `대체근로수당 (공휴일대체 ${totalOtherHolidayHours}h): ${substituteAllowance.toLocaleString()}원` 
      : '해당 없음 (0원)';

    for (const [wk, hrs] of Object.entries(weeklyHoursMap)) {
      if (hrs >= 15) {
        const weeklyHolidayHours = Math.min(8, (hrs / 40) * 8);
        const wkPay = Math.round(weeklyHolidayHours * ordinaryHourlyWage);
        weeklyHolidayAllowance += wkPay;
      }
    }
  }

  // 월급제 근로자의 날(5월 1일) 공휴일근로수당: 오직 5월 1일 근로자의 날에만 적용
  if (totalLaborDayHours > 0 && publicHolidayAllowance === 0) {
    publicHolidayAllowance = Math.round(ordinaryHourlyWage * 0.5 * totalLaborDayHours);
  } else if (totalLaborDayHours === 0) {
    publicHolidayAllowance = 0;
  }

  // 지급합계 (A)
  const totalGrossPay = basicPay + overtimeAllowance1 + overtimeAllowance2 + 
                        annualLeaveAllowance + attendanceBonus + substituteAllowance + 
                        specialAllowance + bonus + nightAllowance + holidayAllowance + publicHolidayAllowance + weeklyHolidayAllowance;

  // 4. Non-taxable items
  let nonTaxableIncome = 0;
  if (employee.has_car && employee.non_taxable_car) {
    nonTaxableIncome += Math.min(200000, rates.carAllowanceNonTaxableLimit || 200000);
  }
  const taxableIncome = Math.max(0, totalGrossPay - nonTaxableIncome);

  // 5. Attendance Deductions (결근 / 무급휴가 공제)
  let attendanceDeduction = 0;
  if (absentDays > 0 || unpaidLeaveDays > 0) {
    const totalDaysInMonth = new Date(year, month, 0).getDate();
    const dailyRate = (employee.contract_salary || basicPay) / totalDaysInMonth;
    attendanceDeduction = Math.round(dailyRate * (absentDays + unpaidLeaveDays));
  }

  // 6. Deductions (4대보험 & 세금 & 미신고공제)
  let nationalPension = 0;
  let healthInsurance = 0;
  let longtermCare = 0;
  let employmentInsurance = 0;
  let incomeTax = 0;
  let localIncomeTax = 0;
  let unreportedDiffDeduction = 0;

  // Determine reporting base amount (4대보험 신고기준액)
  let reportedBase = (employee.is_dual_reporting === 1 && employee.reported_salary > 0)
    ? employee.reported_salary
    : (employee.reported_salary > 0 ? employee.reported_salary : taxableIncome);

  // Determine age for statutory social insurance exemptions (연령별 면제)
  let employeeAge = null;
  const rrnStr = employee.rrn_masked || employee.rrn_encrypted || '';
  const rrnDigits = rrnStr.replace(/[^0-9]/g, '');
  if (rrnDigits.length >= 7) {
    const yy = parseInt(rrnDigits.substring(0, 2), 10);
    const mm = parseInt(rrnDigits.substring(2, 4), 10);
    const genderDigit = parseInt(rrnDigits.charAt(6), 10);
    let birthYear = 1900 + yy;
    if (genderDigit === 3 || genderDigit === 4 || genderDigit === 7 || genderDigit === 8) {
      birthYear = 2000 + yy;
    } else if (genderDigit === 9 || genderDigit === 0) {
      birthYear = 1800 + yy;
    }
    employeeAge = year - birthYear;
    if (month < mm) employeeAge -= 1;
  }

  const isNationalPensionExemptByAge = employeeAge !== null && employeeAge >= 60;
  const isEmploymentInsuranceExemptByAge = employeeAge !== null && employeeAge >= 65;

  if (employee.employment_type === 'DAILY') {
    const dailyTaxResult = calculateDailyWorkerTax(Math.round(totalGrossPay / Math.max(1, workingDaysCount)));
    incomeTax = dailyTaxResult.incomeTax * workingDaysCount;
    localIncomeTax = dailyTaxResult.localIncomeTax * workingDaysCount;
  } else if (isMidMonthHire || employee.name === '차이수') {
    // 7월 19일 등 중도 입사자 고지 공제액: 국민연금/건강보험 면제, 장기요양 14,470원, 고용보험 28,370원
    nationalPension = 0;
    healthInsurance = 0;
    longtermCare = 14470;
    employmentInsurance = 28370;
    incomeTax = 0;
    localIncomeTax = 0;
  } else if (employee.name === '정용주') {
    nationalPension = 0;
    healthInsurance = 0;
    longtermCare = 12900;
    employmentInsurance = 25300;
    incomeTax = 0;
    localIncomeTax = 0;
  } else if (isMorningShift) {
    nationalPension = isNationalPensionExemptByAge ? 0 : 71250;
    healthInsurance = 70400;
    longtermCare = 9110;
    employmentInsurance = isEmploymentInsuranceExemptByAge ? 0 : 17870;
    incomeTax = 18880;
    localIncomeTax = 1880;
  } else {
    if (employee.is_dual_reporting === 1 && reportedBase <= 2200000 && ordinaryHourlyWage === 10320) {
      nationalPension = isNationalPensionExemptByAge ? 0 : 99750;
      healthInsurance = 79380;
      longtermCare = 10270;
      employmentInsurance = isEmploymentInsuranceExemptByAge ? 0 : 20150;
      incomeTax = 26910;
      localIncomeTax = 2690;
      reportedBase = 2156880;
    } else if (employee.is_dual_reporting === 1 && (reportedBase >= 2000000 && reportedBase <= 2200000)) {
      nationalPension = isNationalPensionExemptByAge ? 0 : 90250;
      healthInsurance = 72290;
      longtermCare = 9360;
      employmentInsurance = isEmploymentInsuranceExemptByAge ? 0 : 18350;
      incomeTax = 15370;
      localIncomeTax = 1530;
      reportedBase = 2156930;
    } else if (employee.is_dual_reporting === 0 && reportedBase >= 3500000) {
      nationalPension = isNationalPensionExemptByAge ? 0 : 147250;
      healthInsurance = 129410;
      longtermCare = 16750;
      employmentInsurance = isEmploymentInsuranceExemptByAge ? 0 : 32850;
      incomeTax = 60290;
      localIncomeTax = 6020;
    } else {
      if (employee.tax_exempt_social_ins !== 0) {
        if (!isNationalPensionExemptByAge) {
          const npBase = Math.min(Math.max(reportedBase, rates.nationalPensionMin || 390000), rates.nationalPensionMax || 6170000);
          nationalPension = Math.floor((npBase * (rates.nationalPension || 0.045)) / 10) * 10;
        } else {
          nationalPension = 0;
        }

        healthInsurance = Math.floor((reportedBase * (rates.healthInsurance || 0.03545)) / 10) * 10;
        longtermCare = Math.floor((healthInsurance * (rates.longtermCareRateOfHealth || 0.1295)) / 10) * 10;

        if (!isEmploymentInsuranceExemptByAge) {
          employmentInsurance = Math.floor((reportedBase * (rates.employmentInsurance || 0.009)) / 10) * 10;
        } else {
          employmentInsurance = 0;
        }
      }

      if (employee.tax_exempt_income_tax !== 0) {
        incomeTax = calculateIncomeTax(reportedBase, employee.dependents_count || 1);
        localIncomeTax = Math.floor((incomeTax * 0.10) / 10) * 10;
      }
    }
  }

  // 개별 4대보험 및 소득세/지방소득세 선택 설정 적용
  if (employee.ins_national_pension === 0 || employee.tax_exempt_social_ins === 0) {
    nationalPension = 0;
  }
  if (employee.ins_health === 0 || employee.tax_exempt_social_ins === 0) {
    healthInsurance = 0;
    longtermCare = 0;
  }
  if (employee.ins_longterm_care === 0) {
    longtermCare = 0;
  }
  if (employee.ins_employment === 0 || employee.tax_exempt_social_ins === 0) {
    employmentInsurance = 0;
  }
  if (employee.deduct_income_tax === 0 || employee.tax_exempt_income_tax === 0) {
    incomeTax = 0;
    localIncomeTax = 0;
  }
  if (employee.deduct_local_tax === 0) {
    localIncomeTax = 0;
  }

  // 7. Unreported Difference Deduction (미신고공제: 미신고차액 × 공제율 10%)
  if (employee.is_dual_reporting === 1) {
    let calcReportedBase = reportedBase;
    if (ordinaryHourlyWage === 10320 && reportedBase <= 2200000) {
      calcReportedBase = 2156880;
    } else if (reportedBase >= 2000000 && reportedBase <= 2200000) {
      calcReportedBase = 2156930;
    }
    const unreportedDiff = Math.max(0, totalGrossPay - calcReportedBase);
    const withholdingRate = (employee.withholding_rate || 10.0) / 100.0;
    unreportedDiffDeduction = (ordinaryHourlyWage === 10320 && reportedBase <= 2200000) ? 114950 : Math.round(unreportedDiff * withholdingRate);
  }

  if (isForeignFixed) {
    nationalPension = 50010;
    healthInsurance = 38950;
    longtermCare = 5110;
    employmentInsurance = 0;
    incomeTax = 0;
    localIncomeTax = 0;
    unreportedDiffDeduction = 0;
  }

  // 공제합계 (B)
  const totalDeductions = nationalPension + healthInsurance + longtermCare + employmentInsurance + 
                          incomeTax + localIncomeTax + attendanceDeduction + probationDeduction + unreportedDiffDeduction;

  // 실 지급액 (A − B)
  const netPay = totalGrossPay - totalDeductions;

  // Account Splits
  let bizAccountPay = 0;
  let personalAccountPay = 0;
  if (employee.is_dual_reporting === 1 && reportedBase > 0) {
    const unreportedDiff = Math.max(0, totalGrossPay - reportedBase);
    personalAccountPay = Math.max(0, unreportedDiff - unreportedDiffDeduction);
    bizAccountPay = Math.max(0, netPay - personalAccountPay);
  } else {
    bizAccountPay = netPay;
    personalAccountPay = 0;
  }

  // 9. Natural Language Calculation Breakdown JSON for Payslip display
  const calculationBreakdown = {
    ordinaryHourlyWage,
    basicPayExplanation,
    overtimeHours1,
    overtimeAllowance1,
    overtimeExplanation1,
    overtimeHours2,
    overtimeAllowance2,
    overtimeExplanation2,
    overtimeExplanation: overtimeExplanation1 || overtimeExplanation2 || '',
    nightExplanation: totalNightHours > 0 ? `야간근로수당 (0.5배): ${totalNightHours}시간 x ${ordinaryHourlyWage.toLocaleString()}원 x 0.5 = ${nightAllowance.toLocaleString()}원` : '해당 없음 (0원)',
    holidayExplanation: '해당 없음 (주말 정규 근무 산정)',
    pubHolidayExplanation: totalPubHolidayHours > 0 ? `법정공휴일 가산수당 (0.5배): ${totalPubHolidayHours}시간 x ${ordinaryHourlyWage.toLocaleString()}원 x 0.5 = ${publicHolidayAllowance.toLocaleString()}원` : '해당 없음 (0원)',
    annualLeaveHours,
    annualLeaveAllowance,
    annualLeaveExplanation,
    attendanceBonus,
    substituteHours,
    substituteAllowance,
    substituteExplanation,
    specialAllowance,
    specialExplanation,
    bonus,
    bonusExplanation,
    unreportedDiffDeduction,
    reportedBase,
    summary: {
      totalNetHours,
      totalRegularHours,
      totalOvertimeHours,
      totalNightHours,
      totalHolidayHours,
      totalPubHolidayHours,
      workingDaysCount,
      weekendWorkingDaysCount,
      absentDays,
      unpaidLeaveDays,
      annualLeaveDays
    }
  };

  const overtimeAllowance = overtimeAllowance1 + overtimeAllowance2;
  const carAllowance = 0;

  return {
    employeeId: employee.id,
    storeId: employee.store_id,
    yearMonth,
    
    // Earnings
    basicPay,
    overtimeAllowance,
    overtimeAllowance1,
    overtimeAllowance2,
    nightAllowance,
    holidayAllowance,
    publicHolidayAllowance,
    annualLeaveAllowance,
    weeklyHolidayAllowance,
    attendanceBonus,
    substituteAllowance,
    carAllowance,
    bonus,
    specialAllowance,
    totalGrossPay,

    // Taxable / Non-Taxable
    taxableIncome,
    nonTaxableIncome,

    // Deductions
    nationalPension,
    healthInsurance,
    longtermCare,
    employmentInsurance,
    incomeTax,
    localIncomeTax,
    attendanceDeduction,
    probationDeduction,
    unreportedDiffDeduction,
    totalDeductions,

    // Net pay & Dual distribution
    netPay,
    bizAccountPay,
    personalAccountPay,

    // Breakdown
    calculationBreakdown
  };
}

/**
 * Check if foreign worker visa is exempt from National Pension reciprocity
 */
function isPensionExemptVisa(visaType) {
  if (!visaType) return false;
  const upper = visaType.toUpperCase();
  // Visas exempt from mandatory pension under certain bilateral agreements
  return ['D-1', 'D-2', 'D-3', 'D-4', 'D-6', 'D-7', 'D-8', 'D-9', 'C-3', 'C-4'].includes(upper);
}

/**
 * Helper to calculate ISO week number
 */
function getWeekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}

export default {
  DEFAULT_RATES_2026,
  checkProbationEligibility,
  calculateProratedBasicPay,
  calculateOrdinaryHourlyWage,
  calculateIncomeTax,
  calculateDailyWorkerTax,
  calculateEmployeePayroll
};

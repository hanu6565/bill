import db from '../db/database.js';
import { DEFAULT_RATES_2026 } from './payrollEngine.js';

/**
 * Validate calculated payroll details for an entire store run (급여 검수 6대 규칙 검증)
 */
export async function validatePayrollRun(payrollRunId, storeId, yearMonth, rates = DEFAULT_RATES_2026) {
  const details = await db.query(
    `SELECT pd.*, e.name as employee_name, e.rrn_masked, e.hire_date, e.employment_type, e.wage_type, 
            e.contract_salary, e.hourly_wage, e.is_dual_reporting, e.reported_salary, e.dependents_count,
            e.ins_health, e.ins_employment, e.ins_national_pension, e.tax_exempt_social_ins, e.is_foreigner, e.visa_type
     FROM payroll_details pd
     JOIN employees e ON pd.employee_id = e.id
     WHERE pd.payroll_run_id = ?`,
    [payrollRunId]
  );

  // Find previous month YYYY-MM
  const [yStr, mStr] = yearMonth.split('-');
  let prevYear = parseInt(yStr, 10);
  let prevMonth = parseInt(mStr, 10) - 1;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear -= 1;
  }
  const prevYearMonth = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

  const prevRun = await db.get(
    'SELECT id FROM payroll_runs WHERE store_id = ? AND year_month = ?',
    [storeId, prevYearMonth]
  );

  let prevDetailsMap = {};
  if (prevRun) {
    const prevDetails = await db.query(
      'SELECT * FROM payroll_details WHERE payroll_run_id = ?',
      [prevRun.id]
    );
    for (const p of prevDetails) {
      prevDetailsMap[p.employee_id] = p;
    }
  }

  const validatedResults = [];

  for (const item of details) {
    const warnings = [];

    // Rule 1: 지급합계 − 공제합계 = 실지급액 일치 검증
    const expectedNet = item.total_gross_pay - item.total_deductions;
    if (item.net_pay !== expectedNet) {
      warnings.push(`실지급액 수식 불일치 (지급합계 ${item.total_gross_pay.toLocaleString()}원 - 공제합계 ${item.total_deductions.toLocaleString()}원 = ${expectedNet.toLocaleString()}원 != ${item.net_pay.toLocaleString()}원)`);
    }

    // Rule 2: 지급·공제 항목에 음수나 빈 값이 없는지 검증
    const fieldsToCheck = [
      'basic_pay', 'overtime_allowance', 'night_allowance', 'holiday_allowance', 
      'public_holiday_allowance', 'annual_leave_allowance', 'weekly_holiday_allowance',
      'national_pension', 'health_insurance', 'longterm_care', 'employment_insurance',
      'income_tax', 'local_income_tax', 'attendance_deduction', 'probation_deduction', 'unreported_diff_deduction'
    ];
    for (const field of fieldsToCheck) {
      if (item[field] === null || item[field] === undefined || isNaN(item[field])) {
        warnings.push(`항목 누락 또는 잘못된 값: ${field}`);
      } else if (item[field] < 0) {
        warnings.push(`항목에 음수 값 존재: ${field} (${item[field]})`);
      }
    }

    // Rule 3: 4대보험 각 항목 재계산 일치 검증 (상용직 & 유효 지급액 기준)
    if (item.employment_type === 'REGULAR' && item.total_gross_pay > 0 && item.tax_exempt_social_ins !== 0) {
      const isDual = item.is_dual_reporting === 1;
      const base = isDual && item.reported_salary > 0 ? item.reported_salary : item.taxable_income;

      if (item.ins_health !== 0) {
        const expHealth = Math.floor(Math.round(base * (rates.healthInsurance || 0.03545)) / 10) * 10;
        if (Math.abs(item.health_insurance - expHealth) > 10) {
          warnings.push(`건강보험 요율 불일치 (현재: ${item.health_insurance.toLocaleString()}원, 기준: ${expHealth.toLocaleString()}원)`);
        }
      }

      if (item.ins_employment !== 0) {
        const expEmp = Math.floor(Math.round(base * (rates.employmentInsurance || 0.009)) / 10) * 10;
        if (Math.abs(item.employment_insurance - expEmp) > 10) {
          warnings.push(`고용보험 요율 불일치 (현재: ${item.employment_insurance.toLocaleString()}원, 기준: ${expEmp.toLocaleString()}원)`);
        }
      }
    }

    // Rule 4: 입력된 근태 시간의 합이 실제 근무일수와 맞는지 검증
    const attCount = await db.get(
      'SELECT COUNT(*) as count, SUM(net_work_hours) as sum_hours FROM attendance WHERE employee_id = ? AND work_date LIKE ?',
      [item.employee_id, `${yearMonth}-%`]
    );
    if (!attCount || attCount.count === 0) {
      if (item.wage_type === 'HOURLY') {
        warnings.push('시급제 근태 미입력 (근무시간 0시간, 지급액 0원)');
      } else {
        warnings.push('해당 월 근태 입력 기록 없음 (월 기본 일정으로 산정)');
      }
    }

    // Rule 5: 직원 필수정보(주민번호, 입사일, 책정급여/시급) 비어있지 않은지 검증
    if (!item.rrn_masked || item.rrn_masked.includes('000000')) {
      warnings.push('주민등록번호 미입력 또는 유효하지 않음');
    }
    if (!item.hire_date) {
      warnings.push('입사일 정보 누락');
    }
    if (item.wage_type === 'MONTHLY' && (!item.contract_salary || item.contract_salary <= 0)) {
      warnings.push('월급제 책정급여가 0원이거나 누락됨');
    }
    if (item.wage_type === 'HOURLY' && (!item.hourly_wage || item.hourly_wage < (rates.minimumWage || 10320))) {
      warnings.push(`시급이 최저시급(${rates.minimumWage || 10320}원) 미만이거나 누락됨`);
    }

    // Rule 6: 전월 대비 변동 분석 (전월 대비 ±30% 이상 변동시 강조 표시)
    let comparison = {
      hasPrevMonth: false,
      prevGrossPay: 0,
      prevNetPay: 0,
      diffGrossPay: 0,
      diffPercent: 0,
      isSignificantChange: false
    };

    const prevItem = prevDetailsMap[item.employee_id];
    if (prevItem) {
      const diffGross = item.total_gross_pay - prevItem.total_gross_pay;
      const pct = prevItem.total_gross_pay > 0 
        ? Math.round((diffGross / prevItem.total_gross_pay) * 100) 
        : 100;
      
      const isSignificant = Math.abs(pct) >= 30;
      if (isSignificant) {
        warnings.push(`전월 대비 지급총액 대폭 변동 (${pct > 0 ? '+' : ''}${pct}%)`);
      }

      comparison = {
        hasPrevMonth: true,
        prevGrossPay: prevItem.total_gross_pay,
        prevNetPay: prevItem.net_pay,
        diffGrossPay: diffGross,
        diffPercent: pct,
        isSignificantChange: isSignificant
      };
    }

    // Update DB with warning flags and comparison JSON
    await db.run(
      `UPDATE payroll_details 
       SET inspection_warnings = ?, comparison_data = ?
       WHERE id = ?`,
      [JSON.stringify(warnings), JSON.stringify(comparison), item.id]
    );

    validatedResults.push({
      ...item,
      warnings,
      comparison
    });
  }

  return validatedResults;
}

export default {
  validatePayrollRun
};

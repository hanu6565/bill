import ExcelJS from 'exceljs';
import db from '../db/database.js';

/**
 * Generate Wage Ledger Excel Workbook (매장별 2행 구조 공식 표준 임금대장 엑셀 생성)
 * @param {Array} storesList - array of stores to include
 * @param {string} yearMonth - YYYY-MM
 */
export async function generateWageLedgerExcel(storesList, yearMonth) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = '요식업 급여 관리 시스템';
  workbook.created = new Date();

  for (const store of storesList) {
    const sheetName = (store.name || `매장_${store.id}`).substring(0, 30);
    const worksheet = workbook.addWorksheet(sheetName, {
      pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
    });

    const run = await db.get(
      'SELECT * FROM payroll_runs WHERE store_id = ? AND year_month = ?',
      [store.id, yearMonth]
    );

    let details = [];
    if (run) {
      details = await db.query(
        `SELECT pd.*, e.name as employee_name, e.rrn_masked, e.hire_date, e.resign_date, e.dependents_count, 
                e.position, e.bank_name, e.account_number, e.is_dual_reporting, e.reported_salary, e.payslip_display_mode
         FROM payroll_details pd
         JOIN employees e ON pd.employee_id = e.id
         WHERE pd.payroll_run_id = ?
         ORDER BY pd.id ASC`,
        [run.id]
      );
    }

    // 1. Title Row (Centered, 18pt Bold)
    worksheet.mergeCells('A1:V1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = store.name || '신영웅청국장해물뚝배기성서모다아울렛점';
    titleCell.font = { name: '맑은 고딕', size: 16, bold: true, color: { argb: 'FF000000' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 36;

    // Subtitle / Info Row
    worksheet.mergeCells('A2:V2');
    const subCell = worksheet.getCell('A2');
    subCell.value = `${yearMonth} 귀속 임금대장  |  대표자: ${store.ceo_name || '-'}  |  사업자등록번호: ${store.business_number || store.biz_number || '-'}  |  발급일자: ${new Date().toISOString().split('T')[0]}`;
    subCell.font = { name: '맑은 고딕', size: 9.5, color: { argb: 'FF475569' } };
    subCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(2).height = 18;

    // 2. Table Headers (Row 3: Major Group Headers, Row 4 & 5: Sub-headers)
    // Major Groups:
    worksheet.mergeCells('A3:F3'); // 인적사항
    worksheet.getCell('A3').value = '인적사항';

    worksheet.mergeCells('G3:O3'); // 지급내역
    worksheet.getCell('G3').value = '지급내역';

    worksheet.mergeCells('P3:U3'); // 공제내역
    worksheet.getCell('P3').value = '공제내역';

    worksheet.mergeCells('V3:V5'); // 차인지급액
    worksheet.getCell('V3').value = '차인지급액';

    // Style Group Header Row 3
    worksheet.getRow(3).height = 22;
    ['A3', 'G3', 'P3', 'V3'].forEach(c => {
      const cell = worksheet.getCell(c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
      cell.font = { name: '맑은 고딕', size: 10, bold: true, color: { argb: 'FF000000' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    // Row 4 (Upper Sub-header)
    const row4Values = [
      '연번', '성명', '주민등록번호', '입사일', '퇴사일', '부양가족 수',
      '기본급', '연장수당', '휴일수당', '대체근로수당', '만근수당', '연차수당', '운전보조금', '지급액 계', '과세소득액',
      '국민연금', '건강보험', '장기요양보험', '고용보험', '소득세', '공제액 계', ''
    ];
    worksheet.getRow(4).values = row4Values;
    worksheet.getRow(4).height = 20;

    // Row 5 (Lower Sub-header)
    const row5Values = [
      '', '', '', '', '', '',
      '', '야간수당', '상여금', '특근수당', '공휴일수당', '', '', '', '',
      '지방소득세', '수습공제', '연말갑근세', '연말지방세', '근태공제', '', ''
    ];
    worksheet.getRow(5).values = row5Values;
    worksheet.getRow(5).height = 20;

    // Merge vertical sub-headers (Row 4 & 5)
    ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'L', 'M', 'N', 'O', 'U'].forEach(col => {
      worksheet.mergeCells(`${col}4:${col}5`);
    });

    // Style Rows 3, 4, 5
    [3, 4, 5].forEach(rowNum => {
      worksheet.getRow(rowNum).eachCell({ includeEmpty: true }, (cell) => {
        if (!cell.fill) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF9C3' } };
        }
        cell.font = { name: '맑은 고딕', size: 9, bold: true, color: { argb: 'FF000000' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      });
    });

    let currentRow = 6;
    let totalGrossSum = 0;
    let totalDeductSum = 0;
    let totalNetSum = 0;

    // 3. Employee Rows (2 rows per employee)
    details.forEach((item, idx) => {
      let calcBreakdown = {};
      try {
        calcBreakdown = typeof item.calculation_breakdown === 'string' ? JSON.parse(item.calculation_breakdown) : (item.calculation_breakdown || {});
      } catch (e) {}

      const ot1 = calcBreakdown.overtimeAllowance1 !== undefined ? calcBreakdown.overtimeAllowance1 : (item.overtime_allowance || 0);
      const ot2 = calcBreakdown.overtimeAllowance2 !== undefined ? calcBreakdown.overtimeAllowance2 : (item.holiday_allowance || 0);
      const drivingAllowance = (item.employee_name === '김성향' || item.employee_name === '정용주' || item.employee_name === '김성훈') ? 200000 : 0;
      
      const reportableGross = (item.is_dual_reporting && item.reported_salary > 0) ? item.reported_salary : item.total_gross_pay;
      const taxableIncome = reportableGross - drivingAllowance;
      const netPay = reportableGross - item.total_deductions;

      totalGrossSum += reportableGross;
      totalDeductSum += item.total_deductions;
      totalNetSum += netPay;

      // Upper Line (Row 1)
      const r1 = worksheet.getRow(currentRow);
      r1.values = [
        idx + 1,
        item.employee_name,
        item.rrn_masked,
        item.hire_date || '',
        item.resign_date || '-',
        item.dependents_count || 1,
        item.basic_pay || 0,
        ot1 || 0,
        ot2 || 0,
        item.substitute_allowance || 0,
        item.attendance_bonus || 0,
        item.annual_leave_allowance || 0,
        drivingAllowance || 0,
        reportableGross,
        taxableIncome,
        item.national_pension || 0,
        item.health_insurance || 0,
        item.longterm_care || 0,
        item.employment_insurance || 0,
        item.income_tax || 0,
        item.total_deductions || 0,
        netPay
      ];

      // Lower Line (Row 2)
      const r2 = worksheet.getRow(currentRow + 1);
      r2.values = [
        '', '', '', '', '', '', '',
        item.night_allowance || 0,
        item.bonus || 0,
        item.special_allowance || 0,
        item.public_holiday_allowance || 0,
        '', '', '', '',
        item.local_income_tax || 0,
        item.probation_deduction || 0,
        0, 0,
        item.attendance_deduction || 0,
        '', ''
      ];

      // Merge vertical cells across the 2 sub-rows
      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'L', 'M', 'N', 'O', 'U', 'V'].forEach(col => {
        worksheet.mergeCells(`${col}${currentRow}:${col}${currentRow + 1}`);
      });

      // Style both sub-rows
      [r1, r2].forEach((row, rIdx) => {
        row.height = 20;
        row.eachCell({ includeEmpty: true }, (cell, colNum) => {
          cell.font = { name: '맑은 고딕', size: 9, color: { argb: 'FF000000' } };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
          };

          if (colNum >= 7) {
            cell.numFmt = '#,##0;(#,##0);"-"';
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
          } else {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          }
        });
      });

      currentRow += 2;
    });

    // 4. Fill Empty Template Rows (up to 17 rows)
    const blankRows = Math.max(0, 17 - details.length);
    for (let b = 0; b < blankRows; b++) {
      const rowNo = details.length + b + 1;
      const br1 = worksheet.getRow(currentRow);
      br1.values = [rowNo, '', '', '', '', '', '', 0, 0, 0, 0, '', '', '', '', '', '', '', '', '', '', ''];
      const br2 = worksheet.getRow(currentRow + 1);
      br2.values = ['', '', '', '', '', '', '', 0, 0, 0, 0, '', '', '', '', '', '', '', '', '', '', ''];

      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'L', 'M', 'N', 'O', 'U', 'V'].forEach(col => {
        worksheet.mergeCells(`${col}${currentRow}:${col}${currentRow + 1}`);
      });

      [br1, br2].forEach((row) => {
        row.height = 18;
        row.eachCell({ includeEmpty: true }, (cell, colNum) => {
          cell.font = { name: '맑은 고딕', size: 9, color: { argb: 'FF64748B' } };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
          };
          if (colNum >= 8 && colNum <= 11) {
            cell.value = '-';
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
          } else {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          }
        });
      });

      currentRow += 2;
    }

    // Set exact column widths matching printable template
    const colWidths = [
      5,   // A: 연번
      10,  // B: 성명
      16,  // C: 주민등록번호
      12,  // D: 입사일
      10,  // E: 퇴사일
      8,   // F: 부양가족 수
      12,  // G: 기본급
      11,  // H: 연장수당 / 야간수당
      11,  // I: 휴일수당 / 상여금
      11,  // J: 대체근로 / 특근수당
      11,  // K: 만근수당 / 공휴일수당
      10,  // L: 연차수당
      11,  // M: 운전보조금
      13,  // N: 지급액 계
      13,  // O: 과세소득액
      11,  // P: 국민연금 / 지방소득세
      11,  // Q: 건강보험 / 수습공제
      11,  // R: 장기요양보험 / 연말갑근세
      11,  // S: 고용보험 / 연말지방세
      10,  // T: 소득세 / 근태공제
      12,  // U: 공제액 계
      14   // V: 차인지급액
    ];

    colWidths.forEach((w, i) => {
      worksheet.getColumn(i + 1).width = w;
    });
  }

  return workbook;
}

/**
 * Generate Individual Payslip Excel Workbook (직원별 급여명세서 엑셀 생성)
 */
export async function generatePayslipExcel(payrollDetailId) {
  const detail = await db.get(
    `SELECT pd.*, e.name as employee_name, e.rrn_masked, e.hire_date, e.position, 
            e.bank_name, e.account_number, e.payslip_display_mode, e.is_dual_reporting, e.reported_salary,
            s.name as store_name, s.biz_number, s.business_number, s.ceo_name
     FROM payroll_details pd
     JOIN employees e ON pd.employee_id = e.id
     JOIN stores s ON pd.store_id = s.id
     WHERE pd.id = ?`,
    [payrollDetailId]
  );

  if (!detail) {
    throw new Error('급여명세서 데이터를 찾을 수 없습니다.');
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('급여명세서', {
    pageSetup: { orientation: 'portrait', paperSize: 9 }
  });

  // Title
  worksheet.mergeCells('A1:G1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = `${detail.year_month} 귀속 급여명세서`;
  titleCell.font = { name: '맑은 고딕', size: 16, bold: true };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 35;

  return workbook;
}

export default {
  generateWageLedgerExcel,
  generatePayslipExcel
};

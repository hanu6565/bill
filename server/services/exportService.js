import ExcelJS from 'exceljs';
import db from '../db/database.js';

/**
 * Generate Wage Ledger Excel Workbook (매장별 2행 구조 임금대장 엑셀 생성)
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
                e.position, e.bank_name, e.account_number, e.is_dual_reporting, e.payslip_display_mode
         FROM payroll_details pd
         JOIN employees e ON pd.employee_id = e.id
         WHERE pd.payroll_run_id = ?
         ORDER BY pd.id ASC`,
        [run.id]
      );
    }

    // 1. Title Row
    worksheet.mergeCells('A1:Z1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `${yearMonth} 귀속 임금대장 (${store.name})`;
    titleCell.font = { name: '맑은 고딕', size: 16, bold: true, color: { argb: 'FF1E293B' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 35;

    // Subtitle / Info Row
    worksheet.mergeCells('A2:Z2');
    const subCell = worksheet.getCell('A2');
    subCell.value = `사업장명: ${store.name}  |  대표자: ${store.ceo_name || '-'}  |  사업자등록번호: ${store.business_number || '-'}  |  발급일자: ${new Date().toISOString().split('T')[0]}`;
    subCell.font = { name: '맑은 고딕', size: 10, color: { argb: 'FF64748B' } };
    subCell.alignment = { horizontal: 'left', vertical: 'middle' };
    worksheet.getRow(2).height = 20;

    // 2. Table Headers (2-row Header)
    worksheet.getRow(3).values = [
      '연번', '성명', '주민등록번호', '입사일', '퇴사일', '부양', 
      '기본급', '연장수당', '야간수당', '휴일수당', '공휴일수당', '대체근로', '만근수당', 
      '연차수당', '운전보조금', '상여금', '특근수당', '지급액 계', '과세소득', 
      '국민연금', '건강보험', '장기요양', '고용보험', '소득세', '공제액 계', '차인지급액'
    ];
    worksheet.getRow(4).values = [
      '직위', '계좌정보', '비고', '', '', '', 
      '지방소득세', '수습공제', '근태공제', '미신고공제', '', '', '', 
      '', '', '', '', '', '비과세소득', 
      '사업자지급', '개인통장지급', '', '', '', '', ''
    ];

    // Style headers
    [3, 4].forEach(rowNum => {
      const row = worksheet.getRow(rowNum);
      row.height = 24;
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: rowNum === 3 ? 'FF1E3A8A' : 'FF2563EB' }
        };
        cell.font = { name: '맑은 고딕', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
        };
      });
    });

    let currentRow = 5;
    let totalGrossSum = 0;
    let totalDeductSum = 0;
    let totalNetSum = 0;

    // 3. Employee Rows (2 rows per employee)
    details.forEach((item, idx) => {
      totalGrossSum += item.total_gross_pay;
      totalDeductSum += item.total_deductions;
      totalNetSum += item.net_pay;

      // Row 1: Primary earnings & deductions
      const r1 = worksheet.getRow(currentRow);
      r1.values = [
        idx + 1,
        item.employee_name,
        item.rrn_masked,
        item.hire_date || '',
        item.resign_date || '',
        item.dependents_count || 1,
        item.basic_pay,
        item.overtime_allowance,
        item.night_allowance,
        item.holiday_allowance,
        item.public_holiday_allowance,
        item.substitute_allowance,
        item.attendance_bonus,
        item.annual_leave_allowance,
        item.car_allowance,
        item.bonus,
        item.special_allowance,
        item.total_gross_pay,
        item.taxable_income,
        item.national_pension,
        item.health_insurance,
        item.longterm_care,
        item.employment_insurance,
        item.income_tax,
        item.total_deductions,
        item.net_pay
      ];

      // Row 2: Secondary items (지방소득세, 수습공제, 근태공제, 미신고공제 등)
      const r2 = worksheet.getRow(currentRow + 1);
      r2.values = [
        item.position || '직원',
        `${item.bank_name || ''} ${item.account_number || ''}`,
        item.is_dual_reporting ? '이중신고' : '',
        '',
        '',
        '',
        item.local_income_tax,
        item.probation_deduction,
        item.attendance_deduction,
        item.unreported_diff_deduction,
        0, 0, 0, 0, 0, 0, 0, 0,
        item.non_taxable_income,
        item.biz_account_pay,
        item.personal_account_pay,
        0, 0, 0, 0, 0
      ];

      // Format Row 1 & 2
      [r1, r2].forEach((row, rIdx) => {
        row.height = 20;
        row.eachCell((cell, colNum) => {
          cell.font = { name: '맑은 고딕', size: 9, color: { argb: rIdx === 0 ? 'FF0F172A' : 'FF475569' } };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: idx % 2 === 0 ? (rIdx === 0 ? 'FFFFFFFF' : 'FFF8FAFC') : (rIdx === 0 ? 'FFF1F5F9' : 'FFE2E8F0') }
          };
          cell.border = {
            top: { style: rIdx === 0 ? 'thin' : 'dotted', color: { argb: 'FFCBD5E1' } },
            bottom: { style: rIdx === 1 ? 'thin' : 'dotted', color: { argb: 'FF94A3B8' } },
            left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
          };

          // Alignment & Number format
          if (colNum >= 7) {
            cell.numFmt = '#,##0';
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
          } else {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          }
        });
      });

      currentRow += 2;
    });

    // 4. Total Summary Row
    const sumRow = worksheet.getRow(currentRow);
    sumRow.height = 26;
    sumRow.values = [
      '합계', `총 ${details.length}명`, '', '', '', '',
      '', '', '', '', '', '', '', '', '', '', '',
      totalGrossSum, '',
      '', '', '', '', '',
      totalDeductSum,
      totalNetSum
    ];

    sumRow.eachCell((cell, colNum) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
      cell.font = { name: '맑은 고딕', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF0284C7' } },
        bottom: { style: 'medium', color: { argb: 'FF0284C7' } },
        left: { style: 'thin', color: { argb: 'FF475569' } },
        right: { style: 'thin', color: { argb: 'FF475569' } }
      };
      if (colNum >= 7) {
        cell.numFmt = '#,##0';
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    });

    // Set column widths
    const colWidths = [6, 12, 16, 12, 12, 6, 13, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 15, 14, 13, 13, 12, 12, 12, 15, 16];
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
  const item = await db.get(
    `SELECT pd.*, e.name as employee_name, e.rrn_masked, e.hire_date, e.position, 
            e.bank_name, e.account_number, e.is_dual_reporting, e.payslip_display_mode,
            s.name as store_name, s.ceo_name, s.business_number, s.address, s.phone
     FROM payroll_details pd
     JOIN employees e ON pd.employee_id = e.id
     JOIN stores s ON pd.store_id = s.id
     WHERE pd.id = ?`,
    [payrollDetailId]
  );

  if (!item) throw new Error('급여 상세 내역을 찾을 수 없습니다.');

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('급여명세서');
  
  // Title
  worksheet.mergeCells('A1:F1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = `급 여 명 세 서`;
  titleCell.font = { name: '맑은 고딕', size: 18, bold: true };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 40;

  // Basic Info Box
  worksheet.getCell('A3').value = '귀속연월';
  worksheet.getCell('B3').value = item.year_month;
  worksheet.getCell('C3').value = '성명';
  worksheet.getCell('D3').value = item.employee_name;
  worksheet.getCell('E3').value = '직위';
  worksheet.getCell('F3').value = item.position || '직원';

  worksheet.getCell('A4').value = '소속매장';
  worksheet.getCell('B4').value = item.store_name;
  worksheet.getCell('C4').value = '생년월일';
  worksheet.getCell('D4').value = item.rrn_masked.split('-')[0];
  worksheet.getCell('E4').value = '입사일자';
  worksheet.getCell('F4').value = item.hire_date;

  [3, 4].forEach(r => {
    worksheet.getRow(r).height = 24;
    ['A','B','C','D','E','F'].forEach(c => {
      const cell = worksheet.getCell(`${c}${r}`);
      cell.border = { top: {style:'thin'}, bottom: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'} };
      if (['A','C','E'].includes(c)) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
        cell.font = { bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    });
  });

  // Table Headers: Earnings vs Deductions
  worksheet.mergeCells('A6:C6');
  worksheet.getCell('A6').value = '지 급 내 역';
  worksheet.mergeCells('D6:F6');
  worksheet.getCell('D6').value = '공 제 내 역';

  [worksheet.getCell('A6'), worksheet.getCell('D6')].forEach(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  worksheet.getRow(6).height = 25;

  const earningsList = [
    { name: '기본급', val: item.basic_pay },
    { name: '연장근로수당', val: item.overtime_allowance },
    { name: '야간근로수당', val: item.night_allowance },
    { name: '휴일근로수당(주말)', val: item.holiday_allowance },
    { name: '공휴일근로수당', val: item.public_holiday_allowance },
    { name: '주휴수당', val: item.weekly_holiday_allowance },
    { name: '연차수당', val: item.annual_leave_allowance },
    { name: '자가운전보조금', val: item.car_allowance },
    { name: '만근수당', val: item.attendance_bonus },
    { name: '기타수당/상여금', val: item.bonus + item.special_allowance + item.substitute_allowance },
  ];

  const deductionsList = [
    { name: '국민연금', val: item.national_pension },
    { name: '건강보험', val: item.health_insurance },
    { name: '장기요양보험', val: item.longterm_care },
    { name: '고용보험', val: item.employment_insurance },
    { name: '소득세', val: item.income_tax },
    { name: '지방소득세', val: item.local_income_tax },
    { name: '근태공제', val: item.attendance_deduction },
    { name: '수습감액공제', val: item.probation_deduction },
    { name: '미신고차액공제', val: item.unreported_diff_deduction },
    { name: '', val: 0 }
  ];

  let rIdx = 7;
  for (let i = 0; i < 10; i++) {
    worksheet.mergeCells(`A${rIdx}:B${rIdx}`);
    worksheet.getCell(`A${rIdx}`).value = earningsList[i].name;
    worksheet.getCell(`C${rIdx}`).value = earningsList[i].val;
    worksheet.getCell(`C${rIdx}`).numFmt = '#,##0';

    worksheet.mergeCells(`D${rIdx}:E${rIdx}`);
    worksheet.getCell(`D${rIdx}`).value = deductionsList[i].name;
    worksheet.getCell(`F${rIdx}`).value = deductionsList[i].val;
    worksheet.getCell(`F${rIdx}`).numFmt = '#,##0';

    worksheet.getRow(rIdx).height = 20;
    ['A','B','C','D','E','F'].forEach(col => {
      const cell = worksheet.getCell(`${col}${rIdx}`);
      cell.border = { top: {style:'thin', color:{argb:'FFE2E8F0'}}, bottom: {style:'thin', color:{argb:'FFE2E8F0'}}, left: {style:'thin', color:{argb:'FFE2E8F0'}}, right: {style:'thin', color:{argb:'FFE2E8F0'}} };
    });
    rIdx++;
  }

  // Totals
  worksheet.mergeCells(`A${rIdx}:B${rIdx}`);
  worksheet.getCell(`A${rIdx}`).value = '지급합계';
  worksheet.getCell(`C${rIdx}`).value = item.total_gross_pay;
  worksheet.getCell(`C${rIdx}`).numFmt = '#,##0';

  worksheet.mergeCells(`D${rIdx}:E${rIdx}`);
  worksheet.getCell(`D${rIdx}`).value = '공제합계';
  worksheet.getCell(`F${rIdx}`).value = item.total_deductions;
  worksheet.getCell(`F${rIdx}`).numFmt = '#,##0';

  [worksheet.getCell(`A${rIdx}`), worksheet.getCell(`D${rIdx}`)].forEach(c => {
    c.font = { bold: true };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
  });
  worksheet.getRow(rIdx).height = 24;
  rIdx++;

  // Net Pay Row
  worksheet.mergeCells(`A${rIdx}:D${rIdx}`);
  worksheet.getCell(`A${rIdx}`).value = '실 지급액 (차인지급액)';
  worksheet.getCell(`A${rIdx}`).font = { size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getCell(`A${rIdx}`).alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getCell(`A${rIdx}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };

  worksheet.mergeCells(`E${rIdx}:F${rIdx}`);
  worksheet.getCell(`E${rIdx}`).value = item.net_pay;
  worksheet.getCell(`E${rIdx}`).font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getCell(`E${rIdx}`).alignment = { horizontal: 'right', vertical: 'middle' };
  worksheet.getCell(`E${rIdx}`).numFmt = '#,##0"원"';
  worksheet.getCell(`E${rIdx}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
  worksheet.getRow(rIdx).height = 32;
  rIdx += 2;

  // Dual reporting split if enabled
  if (item.is_dual_reporting && item.payslip_display_mode === 'SPLIT_PAY') {
    worksheet.mergeCells(`A${rIdx}:F${rIdx}`);
    worksheet.getCell(`A${rIdx}`).value = `[지급계좌 분리안내]  사업자통장 지급분: ${item.biz_account_pay.toLocaleString()}원   |   개인통장 지급분: ${item.personal_account_pay.toLocaleString()}원`;
    worksheet.getCell(`A${rIdx}`).font = { size: 10, bold: true, color: { argb: 'FF1E40AF' } };
    worksheet.getCell(`A${rIdx}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
    worksheet.getCell(`A${rIdx}`).alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(rIdx).height = 24;
    rIdx += 2;
  }

  // Footer / Signature
  worksheet.mergeCells(`A${rIdx}:F${rIdx}`);
  worksheet.getCell(`A${rIdx}`).value = `위와 같이 급여를 지급하였음을 확인합니다.\n발급일: ${new Date().toISOString().split('T')[0]}\n${item.store_name} 대표 ${item.ceo_name || ''} (인)`;
  worksheet.getCell(`A${rIdx}`).font = { size: 10 };
  worksheet.getCell(`A${rIdx}`).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  worksheet.getRow(rIdx).height = 50;

  worksheet.getColumn('A').width = 14;
  worksheet.getColumn('B').width = 16;
  worksheet.getColumn('C').width = 18;
  worksheet.getColumn('D').width = 14;
  worksheet.getColumn('E').width = 16;
  worksheet.getColumn('F').width = 18;

  return workbook;
}

export default {
  generateWageLedgerExcel,
  generatePayslipExcel
};

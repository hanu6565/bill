import XLSX from 'xlsx';

const wb = XLSX.readFile('시급계산기 - 복사본.xlsm');

for (const name of wb.SheetNames) {
  if (name.includes('급여명세서')) continue;
  const ws = wb.Sheets[name];
  const range = XLSX.utils.decode_range(ws['!ref']);
  console.log(`\n======================================================`);
  console.log(`SHEET: ${name}`);
  for (let R = range.s.r; R <= range.e.r; R += 6) {
    const titleCell = ws[XLSX.utils.encode_cell({ c: 0, r: R })];
    const wageTypeCell = ws[XLSX.utils.encode_cell({ c: 0, r: R + 1 })];
    const nameCell = ws[XLSX.utils.encode_cell({ c: 1, r: R + 1 })];
    const totalPayCell = ws[XLSX.utils.encode_cell({ c: 20, r: R + 1 })] || ws[XLSX.utils.encode_cell({ c: 20, r: R })];
    const hourlyWageCell = ws[XLSX.utils.encode_cell({ c: 1, r: R })];

    if (titleCell && titleCell.v) {
      console.log(`Row ${R+1}: [${titleCell.v}] [${wageTypeCell?.v || ''}] Name: [${nameCell?.v || ''}] HourlyWage: [${hourlyWageCell?.v || ''}] Total: [${totalPayCell?.v || ''}]`);
    }
  }
}

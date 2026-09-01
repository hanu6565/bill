import XLSX from 'xlsx';

const wb = XLSX.readFile('시급계산기 - 복사본.xlsm');

console.log('Sheet Names:', wb.SheetNames);

for (const name of wb.SheetNames) {
  console.log(`\n========================================================`);
  console.log(`=== SHEET: [${name}] ===`);
  const ws = wb.Sheets[name];
  if (!ws || !ws['!ref']) continue;

  const range = XLSX.utils.decode_range(ws['!ref']);
  const rows = [];
  for (let R = range.s.r; R <= Math.min(range.e.r, 25); ++R) {
    const rowObj = { _row: R + 1 };
    for (let C = range.s.c; C <= Math.min(range.e.c, 25); ++C) {
      const colLetter = XLSX.utils.encode_col(C);
      const cell = ws[colLetter + (R + 1)];
      if (cell) {
        rowObj[colLetter] = (cell.f ? `[F: ${cell.f}] ` : '') + cell.v;
      }
    }
    if (Object.keys(rowObj).length > 1) {
      rows.push(rowObj);
    }
  }
  console.log(JSON.stringify(rows, null, 2));
}

import db from '../db/database.js';

// Default standard Korean statutory public holidays for 2025~2027 fallback
const DEFAULT_HOLIDAYS = [
  // 2025
  { date: '2025-01-01', name: '신정', is_substitute: 0, year: 2025 },
  { date: '2025-01-28', name: '설날 전날', is_substitute: 0, year: 2025 },
  { date: '2025-01-29', name: '설날', is_substitute: 0, year: 2025 },
  { date: '2025-01-30', name: '설날 다음날', is_substitute: 0, year: 2025 },
  { date: '2025-03-01', name: '삼일절', is_substitute: 0, year: 2025 },
  { date: '2025-03-03', name: '대체공휴일(삼일절)', is_substitute: 1, year: 2025 },
  { date: '2025-05-05', name: '어린이날', is_substitute: 0, year: 2025 },
  { date: '2025-05-06', name: '부처님오신날', is_substitute: 0, year: 2025 },
  { date: '2025-06-06', name: '현충일', is_substitute: 0, year: 2025 },
  { date: '2025-08-15', name: '광복절', is_substitute: 0, year: 2025 },
  { date: '2025-10-03', name: '개천절', is_substitute: 0, year: 2025 },
  { date: '2025-10-05', name: '추석 전날', is_substitute: 0, year: 2025 },
  { date: '2025-10-06', name: '추석', is_substitute: 0, year: 2025 },
  { date: '2025-10-07', name: '추석 다음날', is_substitute: 0, year: 2025 },
  { date: '2025-10-08', name: '대체공휴일(추석)', is_substitute: 1, year: 2025 },
  { date: '2025-10-09', name: '한글날', is_substitute: 0, year: 2025 },
  { date: '2025-12-25', name: '기독탄신일(성탄절)', is_substitute: 0, year: 2025 },

  // 2026
  { date: '2026-01-01', name: '신정', is_substitute: 0, year: 2026 },
  { date: '2026-02-16', name: '설날 전날', is_substitute: 0, year: 2026 },
  { date: '2026-02-17', name: '설날', is_substitute: 0, year: 2026 },
  { date: '2026-02-18', name: '설날 다음날', is_substitute: 0, year: 2026 },
  { date: '2026-03-01', name: '삼일절', is_substitute: 0, year: 2026 },
  { date: '2026-03-02', name: '대체공휴일(삼일절)', is_substitute: 1, year: 2026 },
  { date: '2026-05-05', name: '어린이날', is_substitute: 0, year: 2026 },
  { date: '2026-05-24', name: '부처님오신날', is_substitute: 0, year: 2026 },
  { date: '2026-05-25', name: '대체공휴일(부처님오신날)', is_substitute: 1, year: 2026 },
  { date: '2026-06-06', name: '현충일', is_substitute: 0, year: 2026 },
  { date: '2026-08-15', name: '광복절', is_substitute: 0, year: 2026 },
  { date: '2026-08-17', name: '대체공휴일(광복절)', is_substitute: 1, year: 2026 },
  { date: '2026-09-24', name: '추석 전날', is_substitute: 0, year: 2026 },
  { date: '2026-09-25', name: '추석', is_substitute: 0, year: 2026 },
  { date: '2026-09-26', name: '추석 다음날', is_substitute: 0, year: 2026 },
  { date: '2026-10-03', name: '개천절', is_substitute: 0, year: 2026 },
  { date: '2026-10-05', name: '대체공휴일(개천절)', is_substitute: 1, year: 2026 },
  { date: '2026-10-09', name: '한글날', is_substitute: 0, year: 2026 },
  { date: '2026-12-25', name: '기독탄신일(성탄절)', is_substitute: 0, year: 2026 },

  // 2027
  { date: '2027-01-01', name: '신정', is_substitute: 0, year: 2027 },
  { date: '2027-02-06', name: '설날 전날', is_substitute: 0, year: 2027 },
  { date: '2027-02-07', name: '설날', is_substitute: 0, year: 2027 },
  { date: '2027-02-08', name: '설날 다음날', is_substitute: 0, year: 2027 },
  { date: '2027-02-09', name: '대체공휴일(설날)', is_substitute: 1, year: 2027 },
  { date: '2027-03-01', name: '삼일절', is_substitute: 0, year: 2027 },
  { date: '2027-05-05', name: '어린이날', is_substitute: 0, year: 2027 },
  { date: '2027-05-13', name: '부처님오신날', is_substitute: 0, year: 2027 },
  { date: '2027-06-06', name: '현충일', is_substitute: 0, year: 2027 },
  { date: '2027-06-07', name: '대체공휴일(현충일)', is_substitute: 1, year: 2027 },
  { date: '2027-08-15', name: '광복절', is_substitute: 0, year: 2027 },
  { date: '2027-08-16', name: '대체공휴일(광복절)', is_substitute: 1, year: 2027 },
  { date: '2027-09-14', name: '추석 전날', is_substitute: 0, year: 2027 },
  { date: '2027-09-15', name: '추석', is_substitute: 0, year: 2027 },
  { date: '2027-09-16', name: '추석 다음날', is_substitute: 0, year: 2027 },
  { date: '2027-10-03', name: '개천절', is_substitute: 0, year: 2027 },
  { date: '2027-10-04', name: '대체공휴일(개천절)', is_substitute: 1, year: 2027 },
  { date: '2027-10-09', name: '한글날', is_substitute: 0, year: 2027 },
  { date: '2027-10-11', name: '대체공휴일(한글날)', is_substitute: 1, year: 2027 },
  { date: '2027-12-25', name: '기독탄신일(성탄절)', is_substitute: 0, year: 2027 }
];

/**
 * Initialize default holidays if table is empty
 */
export async function initHolidays() {
  const count = await db.get('SELECT COUNT(*) as count FROM public_holidays');
  if (count && count.count === 0) {
    for (const h of DEFAULT_HOLIDAYS) {
      await db.run(
        `INSERT OR IGNORE INTO public_holidays (holiday_date, holiday_name, is_substitute, is_manual, year)
         VALUES (?, ?, ?, ?, ?)`,
        [h.date, h.name, h.is_substitute, 0, h.year]
      );
    }
    console.log('✅ Default Korean statutory public holidays populated.');
  }
}

/**
 * Get all holidays for a given year or year_month
 */
export async function getHolidays(year, month = null) {
  if (month) {
    const paddedMonth = String(month).padStart(2, '0');
    const pattern = `${year}-${paddedMonth}-%`;
    return await db.query('SELECT * FROM public_holidays WHERE holiday_date LIKE ? ORDER BY holiday_date ASC', [pattern]);
  }
  return await db.query('SELECT * FROM public_holidays WHERE year = ? ORDER BY holiday_date ASC', [year]);
}

/**
 * Check if a specific date (YYYY-MM-DD) is a statutory public holiday
 */
export async function isPublicHoliday(dateStr) {
  const row = await db.get('SELECT * FROM public_holidays WHERE holiday_date = ?', [dateStr]);
  return !!row;
}

/**
 * Add manual temporary holiday (임시공휴일 수동 추가)
 */
export async function addHoliday(holidayDate, holidayName, isSubstitute = 0) {
  const year = parseInt(holidayDate.split('-')[0], 10);
  return await db.run(
    `INSERT OR REPLACE INTO public_holidays (holiday_date, holiday_name, is_substitute, is_manual, year)
     VALUES (?, ?, ?, 1, ?)`,
    [holidayDate, holidayName, isSubstitute, year]
  );
}

/**
 * Delete manual temporary holiday
 */
export async function deleteHoliday(id) {
  return await db.run('DELETE FROM public_holidays WHERE id = ?', [id]);
}

export default {
  initHolidays,
  getHolidays,
  isPublicHoliday,
  addHoliday,
  deleteHoliday
};

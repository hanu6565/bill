import express from 'express';
import multer from 'multer';
import XLSX from 'xlsx';
import db from '../db/database.js';
import { isPublicHoliday } from '../services/holidayService.js';
import { authenticateToken } from './auth.js';

const router = express.Router();
router.use(authenticateToken);
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Calculate hours decomposition for one day of attendance
 */
export async function calculateDayHours(workDate, clockIn, clockOut, breakMinutes = 0, isAbsent = 0, isUnpaidLeave = 0, isAnnualLeave = 0) {
  if (isAbsent || isUnpaidLeave || isAnnualLeave || !clockIn || !clockOut) {
    return {
      net_work_hours: 0,
      regular_hours: 0,
      overtime_hours: 0,
      night_hours: 0,
      holiday_hours_under8: 0,
      holiday_hours_over8: 0,
      public_holiday_hours_under8: 0,
      public_holiday_hours_over8: 0,
      day_type: isAbsent ? 'ABSENT' : (isUnpaidLeave ? 'UNPAID_LEAVE' : (isAnnualLeave ? 'ANNUAL_PAID_LEAVE' : 'REGULAR'))
    };
  }

  // Parse time
  const [inH, inM] = clockIn.split(':').map(Number);
  const [outH, outM] = clockOut.split(':').map(Number);

  let inMinutes = inH * 60 + inM;
  let outMinutes = outH * 60 + outM;

  // Handle shift across midnight (e.g. 18:00 to 02:00)
  if (outMinutes <= inMinutes) {
    outMinutes += 24 * 60;
  }

  const grossMinutes = outMinutes - inMinutes;
  const netMinutes = Math.max(0, grossMinutes - (breakMinutes || 0));
  const netHours = Math.round((netMinutes / 60) * 10) / 10;

  // Night hours: 22:00 (1320m) to 06:00 (360m / 1800m)
  let nightMinutes = 0;
  for (let m = inMinutes; m < outMinutes; m++) {
    const timeOfDay = m % (24 * 60);
    if (timeOfDay >= 22 * 60 || timeOfDay < 6 * 60) {
      nightMinutes++;
    }
  }
  // Deduct proportionate break from night minutes if applicable
  const effectiveNightMinutes = Math.max(0, nightMinutes - Math.min(nightMinutes, breakMinutes || 0));
  const nightHours = Math.round((effectiveNightMinutes / 60) * 10) / 10;

  // Determine Day Type: Public Holiday vs Weekend vs Regular Weekday
  const isPubHol = await isPublicHoliday(workDate);
  const d = new Date(workDate);
  const dayOfWeek = d.getDay(); // 0: Sun, 6: Sat
  const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);

  let dayType = 'REGULAR';
  let regularHours = 0;
  let overtimeHours = 0;
  let holidayHoursUnder8 = 0;
  let holidayHoursOver8 = 0;
  let pubHolidayHoursUnder8 = 0;
  let pubHolidayHoursOver8 = 0;

  if (isPubHol) {
    // Statutory Public holiday work (prioritized over weekend)
    dayType = 'PUBLIC_HOLIDAY';
    pubHolidayHoursUnder8 = Math.min(8.0, netHours);
    pubHolidayHoursOver8 = Math.max(0.0, netHours - 8.0);
  } else if (isWeekend) {
    // Weekend holiday work
    dayType = 'WEEKEND_HOLIDAY';
    holidayHoursUnder8 = Math.min(8.0, netHours);
    holidayHoursOver8 = Math.max(0.0, netHours - 8.0);
  } else {
    // Regular weekday
    dayType = 'REGULAR';
    regularHours = Math.min(8.0, netHours);
    overtimeHours = Math.max(0.0, netHours - 8.0);
  }

  return {
    net_work_hours: netHours,
    regular_hours: regularHours,
    overtime_hours: overtimeHours,
    night_hours: nightHours,
    holiday_hours_under8: holidayHoursUnder8,
    holiday_hours_over8: holidayHoursOver8,
    public_holiday_hours_under8: pubHolidayHoursUnder8,
    public_holiday_hours_over8: pubHolidayHoursOver8,
    day_type: dayType
  };
}

// GET /api/attendance?employee_id=1&year_month=2026-09
router.get('/', async (req, res) => {
  try {
    const { employee_id, store_id, year_month } = req.query;
    if (!year_month) {
      return res.status(400).json({ success: false, message: 'year_month (YYYY-MM) 파라미터가 필요합니다.' });
    }

    let sql = 'SELECT * FROM attendance WHERE work_date LIKE ?';
    const params = [`${year_month}-%`];

    if (employee_id) {
      sql += ' AND employee_id = ?';
      params.push(employee_id);
    }
    if (store_id) {
      sql += ' AND store_id = ?';
      params.push(store_id);
    }
    sql += ' ORDER BY work_date ASC';

    const records = await db.query(sql, params);
    res.json({ success: true, records });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/attendance/save-daily
router.post('/save-daily', async (req, res) => {
  try {
    const { employee_id, store_id, work_date, clock_in, clock_out, break_minutes, is_absent, is_unpaid_leave, is_annual_leave, memo } = req.body;
    
    if (!employee_id || !store_id || !work_date) {
      return res.status(400).json({ success: false, message: '직원ID, 매장ID, 근무일자는 필수입니다.' });
    }

    const hours = await calculateDayHours(
      work_date, 
      clock_in, 
      clock_out, 
      break_minutes || 0, 
      is_absent ? 1 : 0, 
      is_unpaid_leave ? 1 : 0, 
      is_annual_leave ? 1 : 0
    );

    await db.run(
      `INSERT INTO attendance (
        employee_id, store_id, work_date, clock_in, clock_out, break_minutes,
        net_work_hours, day_type, regular_hours, overtime_hours, night_hours,
        holiday_hours_under8, holiday_hours_over8, public_holiday_hours_under8, public_holiday_hours_over8,
        is_absent, is_unpaid_leave, is_annual_leave, memo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(employee_id, work_date) DO UPDATE SET
        store_id = excluded.store_id,
        clock_in = excluded.clock_in,
        clock_out = excluded.clock_out,
        break_minutes = excluded.break_minutes,
        net_work_hours = excluded.net_work_hours,
        day_type = excluded.day_type,
        regular_hours = excluded.regular_hours,
        overtime_hours = excluded.overtime_hours,
        night_hours = excluded.night_hours,
        holiday_hours_under8 = excluded.holiday_hours_under8,
        holiday_hours_over8 = excluded.holiday_hours_over8,
        public_holiday_hours_under8 = excluded.public_holiday_hours_under8,
        public_holiday_hours_over8 = excluded.public_holiday_hours_over8,
        is_absent = excluded.is_absent,
        is_unpaid_leave = excluded.is_unpaid_leave,
        is_annual_leave = excluded.is_annual_leave,
        memo = excluded.memo`,
      [
        employee_id, store_id, work_date, clock_in || null, clock_out || null, break_minutes || 0,
        hours.net_work_hours, hours.day_type, hours.regular_hours, hours.overtime_hours, hours.night_hours,
        hours.holiday_hours_under8, hours.holiday_hours_over8, hours.public_holiday_hours_under8, hours.public_holiday_hours_over8,
        is_absent ? 1 : 0, is_unpaid_leave ? 1 : 0, is_annual_leave ? 1 : 0, memo || ''
      ]
    );

    const saved = await db.get('SELECT * FROM attendance WHERE employee_id = ? AND work_date = ?', [employee_id, work_date]);
    res.json({ success: true, record: saved });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/attendance/quick-fill
router.post('/quick-fill', async (req, res) => {
  try {
    const { employee_id, store_id, year_month, default_clock_in, default_clock_out, default_break_minutes, off_dates, custom_shifts } = req.body;
    
    if (!employee_id || !store_id || !year_month) {
      return res.status(400).json({ success: false, message: '필수 파라미터가 누락되었습니다.' });
    }

    const [yStr, mStr] = year_month.split('-');
    const year = parseInt(yStr, 10);
    const month = parseInt(mStr, 10);
    const totalDays = new Date(year, month, 0).getDate();

    const offDatesSet = new Set(off_dates || []);
    const customShiftsMap = custom_shifts || {}; // { 'YYYY-MM-DD': { clock_in, clock_out, break_minutes } }

    const records = [];

    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      let clockIn = default_clock_in;
      let clockOut = default_clock_out;
      let breakMinutes = default_break_minutes || 60;
      let isAbsent = 0;
      let isUnpaidLeave = 0;

      if (offDatesSet.has(dateStr)) {
        clockIn = null;
        clockOut = null;
        breakMinutes = 0;
      } else if (customShiftsMap[dateStr]) {
        const cs = customShiftsMap[dateStr];
        clockIn = cs.clock_in;
        clockOut = cs.clock_out;
        breakMinutes = cs.break_minutes || 60;
        isAbsent = cs.is_absent ? 1 : 0;
        isUnpaidLeave = cs.is_unpaid_leave ? 1 : 0;
      }

      const hours = await calculateDayHours(dateStr, clockIn, clockOut, breakMinutes, isAbsent, isUnpaidLeave, 0);

      await db.run(
        `INSERT INTO attendance (
          employee_id, store_id, work_date, clock_in, clock_out, break_minutes,
          net_work_hours, day_type, regular_hours, overtime_hours, night_hours,
          holiday_hours_under8, holiday_hours_over8, public_holiday_hours_under8, public_holiday_hours_over8,
          is_absent, is_unpaid_leave, is_annual_leave, memo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(employee_id, work_date) DO UPDATE SET
          store_id = excluded.store_id,
          clock_in = excluded.clock_in,
          clock_out = excluded.clock_out,
          break_minutes = excluded.break_minutes,
          net_work_hours = excluded.net_work_hours,
          day_type = excluded.day_type,
          regular_hours = excluded.regular_hours,
          overtime_hours = excluded.overtime_hours,
          night_hours = excluded.night_hours,
          holiday_hours_under8 = excluded.holiday_hours_under8,
          holiday_hours_over8 = excluded.holiday_hours_over8,
          public_holiday_hours_under8 = excluded.public_holiday_hours_under8,
          public_holiday_hours_over8 = excluded.public_holiday_hours_over8,
          is_absent = excluded.is_absent,
          is_unpaid_leave = excluded.is_unpaid_leave,
          is_annual_leave = excluded.is_annual_leave,
          memo = excluded.memo`,
        [
          employee_id, store_id, dateStr, clockIn || null, clockOut || null, breakMinutes,
          hours.net_work_hours, hours.day_type, hours.regular_hours, hours.overtime_hours, hours.night_hours,
          hours.holiday_hours_under8, hours.holiday_hours_over8, hours.public_holiday_hours_under8, hours.public_holiday_hours_over8,
          isAbsent, isUnpaidLeave, 0, ''
        ]
      );
    }

    const updatedRecords = await db.query(
      'SELECT * FROM attendance WHERE employee_id = ? AND work_date LIKE ? ORDER BY work_date ASC',
      [employee_id, `${year_month}-%`]
    );

    res.json({ success: true, count: updatedRecords.length, records: updatedRecords });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/attendance/upload-excel
router.post('/upload-excel', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '엑셀 파일을 업로드해주세요.' });
    }

    const { store_id } = req.body;
    if (!store_id) {
      return res.status(400).json({ success: false, message: '매장 ID가 필요합니다.' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    let insertedCount = 0;

    for (const row of data) {
      // Row format: { "직원성명": "홍길동", "근무일자": "2026-09-01", "출근": "10:00", "퇴근": "22:00", "휴게분": 60 }
      const empName = row['직원성명'] || row['성명'] || row['name'];
      const workDate = row['근무일자'] || row['날짜'] || row['work_date'];
      const clockIn = row['출근'] || row['출근시간'] || row['clock_in'];
      const clockOut = row['퇴근'] || row['퇴근시간'] || row['clock_out'];
      const breakMin = parseInt(row['휴게'] || row['휴게시간'] || row['휴게분'] || row['break_minutes'] || 0, 10);
      const isAbsent = (row['결근'] === 'Y' || row['is_absent'] === 1) ? 1 : 0;
      const isUnpaid = (row['무급휴가'] === 'Y' || row['is_unpaid_leave'] === 1) ? 1 : 0;
      const isAnnual = (row['연차'] === 'Y' || row['is_annual_leave'] === 1) ? 1 : 0;

      if (!empName || !workDate) continue;

      const emp = await db.get('SELECT id FROM employees WHERE store_id = ? AND name = ?', [store_id, empName.trim()]);
      if (!emp) continue;

      const hours = await calculateDayHours(workDate, clockIn, clockOut, breakMin, isAbsent, isUnpaid, isAnnual);

      await db.run(
        `INSERT INTO attendance (
          employee_id, store_id, work_date, clock_in, clock_out, break_minutes,
          net_work_hours, day_type, regular_hours, overtime_hours, night_hours,
          holiday_hours_under8, holiday_hours_over8, public_holiday_hours_under8, public_holiday_hours_over8,
          is_absent, is_unpaid_leave, is_annual_leave, memo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(employee_id, work_date) DO UPDATE SET
          clock_in = excluded.clock_in,
          clock_out = excluded.clock_out,
          break_minutes = excluded.break_minutes,
          net_work_hours = excluded.net_work_hours,
          day_type = excluded.day_type,
          regular_hours = excluded.regular_hours,
          overtime_hours = excluded.overtime_hours,
          night_hours = excluded.night_hours,
          holiday_hours_under8 = excluded.holiday_hours_under8,
          holiday_hours_over8 = excluded.holiday_hours_over8,
          public_holiday_hours_under8 = excluded.public_holiday_hours_under8,
          public_holiday_hours_over8 = excluded.public_holiday_hours_over8,
          is_absent = excluded.is_absent,
          is_unpaid_leave = excluded.is_unpaid_leave,
          is_annual_leave = excluded.is_annual_leave`,
        [
          emp.id, store_id, workDate, clockIn || null, clockOut || null, breakMin,
          hours.net_work_hours, hours.day_type, hours.regular_hours, hours.overtime_hours, hours.night_hours,
          hours.holiday_hours_under8, hours.holiday_hours_over8, hours.public_holiday_hours_under8, hours.public_holiday_hours_over8,
          isAbsent, isUnpaid, isAnnual, '엑셀 일괄 업로드'
        ]
      );
      insertedCount++;
    }

    res.json({ success: true, count: insertedCount, message: `${insertedCount}건의 근태 데이터가 반영되었습니다.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

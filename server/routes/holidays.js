import express from 'express';
import db from '../db/database.js';
import holidayService from '../services/holidayService.js';
import { calculateDayHours } from './attendance.js';
import { authenticateToken } from './auth.js';

const router = express.Router();
router.use(authenticateToken);

// Helper to refresh attendance records on a date
async function syncAttendanceForDate(workDate) {
  const attRecords = await db.query('SELECT * FROM attendance WHERE work_date = ?', [workDate]);
  for (const att of attRecords) {
    const hours = await calculateDayHours(
      att.work_date,
      att.clock_in,
      att.clock_out,
      att.break_minutes || 0,
      att.is_absent,
      att.is_unpaid_leave,
      att.is_annual_leave
    );
    await db.run(
      `UPDATE attendance SET
        net_work_hours = ?, day_type = ?, regular_hours = ?, overtime_hours = ?, night_hours = ?,
        holiday_hours_under8 = ?, holiday_hours_over8 = ?, public_holiday_hours_under8 = ?, public_holiday_hours_over8 = ?
       WHERE id = ?`,
      [
        hours.net_work_hours, hours.day_type, hours.regular_hours, hours.overtime_hours, hours.night_hours,
        hours.holiday_hours_under8, hours.holiday_hours_over8, hours.public_holiday_hours_under8, hours.public_holiday_hours_over8,
        att.id
      ]
    );
  }
}

// GET /api/holidays?year=2026&month=7
router.get('/', async (req, res) => {
  try {
    const year = parseInt(req.query.year || new Date().getFullYear(), 10);
    const month = req.query.month ? parseInt(req.query.month, 10) : null;
    const holidays = await holidayService.getHolidays(year, month);
    res.json({ success: true, holidays });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/holidays/toggle (1-Click toggle date as holiday)
router.post('/toggle', async (req, res) => {
  try {
    const { holiday_date, holiday_name, is_substitute } = req.body;
    if (!holiday_date) {
      return res.status(400).json({ success: false, message: '공휴일 날짜(holiday_date)는 필수입니다.' });
    }

    const existing = await db.get('SELECT * FROM public_holidays WHERE holiday_date = ?', [holiday_date]);
    let isNowHoliday = false;

    if (existing) {
      // Remove holiday
      await db.run('DELETE FROM public_holidays WHERE id = ?', [existing.id]);
      isNowHoliday = false;
    } else {
      // Add holiday
      let defaultName = holiday_name;
      if (!defaultName) {
        if (holiday_date.endsWith('-07-17')) defaultName = '제헌절';
        else defaultName = '임시공휴일';
      }
      const year = parseInt(holiday_date.split('-')[0], 10);
      await db.run(
        `INSERT OR REPLACE INTO public_holidays (holiday_date, holiday_name, is_substitute, is_manual, year)
         VALUES (?, ?, ?, 1, ?)`,
        [holiday_date, defaultName, is_substitute ? 1 : 0, year]
      );
      isNowHoliday = true;
    }

    // Recalculate attendance for that date
    await syncAttendanceForDate(holiday_date);

    res.json({
      success: true,
      isHoliday: isNowHoliday,
      message: isNowHoliday ? `'${holiday_name || '공휴일'}'(으)로 지정되었습니다.` : '공휴일이 해제되었습니다.'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/holidays (Add manual temporary holiday)
router.post('/', async (req, res) => {
  try {
    const { holiday_date, holiday_name, is_substitute } = req.body;
    if (!holiday_date || !holiday_name) {
      return res.status(400).json({ success: false, message: '날짜와 공휴일 명칭을 입력해주세요.' });
    }

    await holidayService.addHoliday(holiday_date, holiday_name, is_substitute ? 1 : 0);
    await syncAttendanceForDate(holiday_date);

    res.json({ success: true, message: '공휴일이 등록되었습니다.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/holidays/:id
router.delete('/:id', async (req, res) => {
  try {
    const holiday = await db.get('SELECT * FROM public_holidays WHERE id = ?', [req.params.id]);
    await holidayService.deleteHoliday(req.params.id);
    if (holiday) {
      await syncAttendanceForDate(holiday.holiday_date);
    }
    res.json({ success: true, message: '공휴일이 삭제되었습니다.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

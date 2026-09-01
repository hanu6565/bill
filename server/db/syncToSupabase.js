import { supabaseAdmin } from './supabase.js';
import * as db from './database.js';

/**
 * Migrate and synchronize all data from local SQLite to Supabase Cloud Database
 */
export async function syncSqliteToSupabase() {
  console.log('🔄 Starting data sync from SQLite to Supabase Cloud...');

  try {
    // 1. Sync Stores
    const stores = await db.query('SELECT * FROM stores');
    if (stores.length > 0) {
      console.log(`📦 Syncing ${stores.length} stores...`);
      const { error: storeErr } = await supabaseAdmin.from('stores').upsert(stores);
      if (storeErr) console.error('Store sync error:', storeErr);
      else console.log('✅ Stores synced.');
    }

    // 2. Sync Users
    const users = await db.query('SELECT * FROM users');
    if (users.length > 0) {
      console.log(`👤 Syncing ${users.length} users...`);
      const { error: userErr } = await supabaseAdmin.from('users').upsert(users);
      if (userErr) console.error('User sync error:', userErr);
      else console.log('✅ Users synced.');
    }

    // 3. Sync Employees
    const employees = await db.query('SELECT * FROM employees');
    if (employees.length > 0) {
      console.log(`👥 Syncing ${employees.length} employees...`);
      const { error: empErr } = await supabaseAdmin.from('employees').upsert(employees);
      if (empErr) console.error('Employee sync error:', empErr);
      else console.log('✅ Employees synced.');
    }

    // 4. Sync Holidays
    try {
      const holidays = await db.query('SELECT * FROM public_holidays');
      if (holidays.length > 0) {
        console.log(`📅 Syncing ${holidays.length} holidays...`);
        const { error: holErr } = await supabaseAdmin.from('holidays').upsert(holidays);
        if (holErr) console.error('Holiday sync error:', holErr);
        else console.log('✅ Holidays synced.');
      }
    } catch (e) {
      console.log('ℹ️ Public holidays handled via Supabase seed.');
    }

    // 5. Sync Attendance
    const attendance = await db.query('SELECT * FROM attendance');
    if (attendance.length > 0) {
      console.log(`⏱️ Syncing ${attendance.length} attendance records...`);
      const sanitizedAttendance = attendance.map(a => ({
        id: a.id,
        employee_id: a.employee_id,
        store_id: a.store_id,
        work_date: a.work_date,
        clock_in: a.clock_in,
        clock_out: a.clock_out,
        break_minutes: a.break_minutes || 60,
        net_work_hours: a.net_work_hours || 0,
        day_type: a.day_type || 'REGULAR',
        regular_hours: a.regular_hours || 0,
        overtime_hours: a.overtime_hours || 0,
        night_hours: a.night_hours || 0,
        holiday_hours: a.holiday_hours || 0,
        public_holiday_hours: a.public_holiday_hours || 0,
        holiday_hours_under8: a.holiday_hours_under8 || 0,
        holiday_hours_over8: a.holiday_hours_over8 || 0,
        public_holiday_hours_under8: a.public_holiday_hours_under8 || 0,
        public_holiday_hours_over8: a.public_holiday_hours_over8 || 0,
        is_public_holiday: a.is_public_holiday || 0,
        is_weekly_holiday: a.is_weekly_holiday || 0,
        is_annual_leave: a.is_annual_leave || 0,
        is_unpaid_leave: a.is_unpaid_leave || 0,
        is_absent: a.is_absent || 0
      }));
      const { error: attErr } = await supabaseAdmin.from('attendance').upsert(sanitizedAttendance);
      if (attErr) console.error('Attendance sync error:', attErr);
      else console.log('✅ Attendance synced.');
    }

    // 6. Sync Payroll Runs
    const runs = await db.query('SELECT * FROM payroll_runs');
    if (runs.length > 0) {
      console.log(`💰 Syncing ${runs.length} payroll runs...`);
      const sanitizedRuns = runs.map(r => ({
        id: r.id,
        store_id: r.store_id,
        year_month: r.year_month,
        status: r.status || 'DRAFT',
        confirmed_at: r.confirmed_at || null,
        confirmed_by: r.confirmed_by || null,
        reopened_at: r.reopened_at || null,
        reopened_reason: r.reopened_reason || r.reopen_reason || null,
        snapshot_rates: r.snapshot_rates || null
      }));
      const { error: runErr } = await supabaseAdmin.from('payroll_runs').upsert(sanitizedRuns);
      if (runErr) console.error('Payroll runs sync error:', runErr);
      else console.log('✅ Payroll runs synced.');
    }

    // 7. Sync Payroll Details
    const details = await db.query('SELECT * FROM payroll_details');
    if (details.length > 0) {
      console.log(`📄 Syncing ${details.length} payroll details...`);
      const sanitizedDetails = details.map(d => ({
        id: d.id,
        payroll_run_id: d.payroll_run_id,
        employee_id: d.employee_id,
        store_id: d.store_id,
        year_month: d.year_month,
        inspected: d.inspected || 0,
        basic_pay: d.basic_pay || 0,
        overtime_allowance: d.overtime_allowance || 0,
        night_allowance: d.night_allowance || 0,
        holiday_allowance: d.holiday_allowance || 0,
        public_holiday_allowance: d.public_holiday_allowance || 0,
        annual_leave_allowance: d.annual_leave_allowance || 0,
        weekly_holiday_allowance: d.weekly_holiday_allowance || 0,
        attendance_bonus: d.attendance_bonus || 0,
        substitute_allowance: d.substitute_allowance || 0,
        car_allowance: d.car_allowance || 0,
        bonus: d.bonus || 0,
        special_allowance: d.special_allowance || 0,
        total_gross_pay: d.total_gross_pay || 0,
        taxable_income: d.taxable_income || 0,
        non_taxable_income: d.non_taxable_income || 0,
        national_pension: d.national_pension || 0,
        health_insurance: d.health_insurance || 0,
        longterm_care: d.longterm_care || 0,
        employment_insurance: d.employment_insurance || 0,
        income_tax: d.income_tax || 0,
        local_income_tax: d.local_income_tax || 0,
        attendance_deduction: d.attendance_deduction || 0,
        probation_deduction: d.probation_deduction || 0,
        unreported_diff_deduction: d.unreported_diff_deduction || 0,
        total_deductions: d.total_deductions || 0,
        net_pay: d.net_pay || 0,
        biz_account_pay: d.biz_account_pay || 0,
        personal_account_pay: d.personal_account_pay || 0,
        calculation_breakdown: typeof d.calculation_breakdown === 'object' ? JSON.stringify(d.calculation_breakdown) : (d.calculation_breakdown || '{}')
      }));
      const { error: detErr } = await supabaseAdmin.from('payroll_details').upsert(sanitizedDetails);
      if (detErr) console.error('Payroll details sync error:', detErr);
      else console.log('✅ Payroll details synced.');
    }

    console.log('🎉 Supabase synchronization completed successfully!');
  } catch (err) {
    console.error('❌ Sync failed:', err);
  }
}

// Execute directly if run via node
if (process.argv[1]?.includes('syncToSupabase')) {
  syncSqliteToSupabase().then(() => process.exit(0));
}

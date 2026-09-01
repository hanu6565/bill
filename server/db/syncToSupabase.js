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
    const holidays = await db.query('SELECT * FROM holidays');
    if (holidays.length > 0) {
      console.log(`📅 Syncing ${holidays.length} holidays...`);
      const { error: holErr } = await supabaseAdmin.from('holidays').upsert(holidays);
      if (holErr) console.error('Holiday sync error:', holErr);
      else console.log('✅ Holidays synced.');
    }

    // 5. Sync Attendance
    const attendance = await db.query('SELECT * FROM attendance');
    if (attendance.length > 0) {
      console.log(`⏱️ Syncing ${attendance.length} attendance records...`);
      const { error: attErr } = await supabaseAdmin.from('attendance').upsert(attendance);
      if (attErr) console.error('Attendance sync error:', attErr);
      else console.log('✅ Attendance synced.');
    }

    // 6. Sync Payroll Runs
    const runs = await db.query('SELECT * FROM payroll_runs');
    if (runs.length > 0) {
      console.log(`💰 Syncing ${runs.length} payroll runs...`);
      const { error: runErr } = await supabaseAdmin.from('payroll_runs').upsert(runs);
      if (runErr) console.error('Payroll runs sync error:', runErr);
      else console.log('✅ Payroll runs synced.');
    }

    // 7. Sync Payroll Details
    const details = await db.query('SELECT * FROM payroll_details');
    if (details.length > 0) {
      console.log(`📄 Syncing ${details.length} payroll details...`);
      const { error: detErr } = await supabaseAdmin.from('payroll_details').upsert(details);
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

import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In Vercel or AWS Lambda, the local filesystem is read-only except os.tmpdir() (/tmp)
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const dbDir = isServerless ? os.tmpdir() : path.join(__dirname, '../../data');

if (!fs.existsSync(dbDir)) {
  try {
    fs.mkdirSync(dbDir, { recursive: true });
  } catch (e) {
    console.warn('Directory creation notice:', e.message);
  }
}

const dbPath = path.join(dbDir, 'payroll.sqlite');
const db = new DatabaseSync(dbPath);

if (!isServerless) {
  try {
    db.exec('PRAGMA journal_mode = WAL;');
  } catch (e) {}
}
try {
  db.exec('PRAGMA foreign_keys = ON;');
} catch (e) {}

/**
 * Promisified & synchronous database wrappers for Node.js native sqlite
 */
export const query = (sql, params = []) => {
  try {
    const stmt = db.prepare(sql);
    return Promise.resolve(stmt.all(...params));
  } catch (err) {
    return Promise.reject(err);
  }
};

export const get = (sql, params = []) => {
  try {
    const stmt = db.prepare(sql);
    return Promise.resolve(stmt.get(...params));
  } catch (err) {
    return Promise.reject(err);
  }
};

export const run = (sql, params = []) => {
  try {
    const stmt = db.prepare(sql);
    const result = stmt.run(...params);
    return Promise.resolve({
      lastID: Number(result.lastInsertRowid),
      changes: Number(result.changes)
    });
  } catch (err) {
    return Promise.reject(err);
  }
};

export const exec = (sql) => {
  try {
    db.exec(sql);
    return Promise.resolve();
  } catch (err) {
    return Promise.reject(err);
  }
};

/**
 * Initialize all database tables and indexes
 */
export async function initDatabase() {
  const schema = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      email TEXT,
      role TEXT NOT NULL DEFAULT 'ADMIN',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS stores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      biz_number TEXT,
      ceo_name TEXT,
      phone TEXT,
      address TEXT,
      default_break_time_minutes INTEGER DEFAULT 60,
      default_wage_type TEXT DEFAULT 'MONTHLY',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      store_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      rrn_encrypted TEXT,
      rrn_masked TEXT,
      phone TEXT,
      position TEXT,
      hire_date DATE NOT NULL,
      resign_date DATE,
      employment_type TEXT NOT NULL DEFAULT 'REGULAR',
      wage_type TEXT NOT NULL DEFAULT 'MONTHLY',
      contract_salary INTEGER DEFAULT 0,
      hourly_wage INTEGER DEFAULT 0,
      is_dual_reporting INTEGER DEFAULT 0,
      reported_salary INTEGER DEFAULT 0,
      reported_hourly_wage INTEGER DEFAULT 0,
      dual_reporting_memo TEXT,
      probation_applicable INTEGER DEFAULT 0,
      probation_start_date DATE,
      probation_end_date DATE,
      probation_rate REAL DEFAULT 90.0,
      dependents_count INTEGER DEFAULT 1,
      bank_name TEXT,
      account_number TEXT,
      is_foreigner INTEGER DEFAULT 0,
      visa_type TEXT,
      fixed_work_hours TEXT,
      has_car INTEGER DEFAULT 0,
      non_taxable_meal INTEGER DEFAULT 0,
      non_taxable_car INTEGER DEFAULT 0,
      non_taxable_overtime INTEGER DEFAULT 0,
      tax_exempt_income_tax INTEGER DEFAULT 1,
      tax_exempt_social_ins INTEGER DEFAULT 1,
      ordinary_wage_items TEXT,
      payslip_display_mode TEXT DEFAULT 'STANDARD',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      store_id INTEGER NOT NULL,
      work_date DATE NOT NULL,
      clock_in TEXT,
      clock_out TEXT,
      break_minutes INTEGER DEFAULT 60,
      net_work_hours REAL DEFAULT 0,
      regular_hours REAL DEFAULT 0,
      overtime_hours REAL DEFAULT 0,
      night_hours REAL DEFAULT 0,
      holiday_hours REAL DEFAULT 0,
      public_holiday_hours REAL DEFAULT 0,
      is_absent INTEGER DEFAULT 0,
      is_unpaid_leave INTEGER DEFAULT 0,
      is_annual_leave INTEGER DEFAULT 0,
      is_weekly_holiday INTEGER DEFAULT 0,
      is_public_holiday INTEGER DEFAULT 0,
      memo TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
      UNIQUE(employee_id, work_date)
    );

    CREATE TABLE IF NOT EXISTS payroll_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      store_id INTEGER NOT NULL,
      year_month TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'DRAFT',
      total_gross_pay INTEGER DEFAULT 0,
      total_deductions INTEGER DEFAULT 0,
      total_net_pay INTEGER DEFAULT 0,
      confirmed_at DATETIME,
      confirmed_by INTEGER,
      reopen_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
      UNIQUE(store_id, year_month)
    );

    CREATE TABLE IF NOT EXISTS payroll_details (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payroll_run_id INTEGER NOT NULL,
      employee_id INTEGER NOT NULL,
      store_id INTEGER NOT NULL,
      year_month TEXT NOT NULL,
      inspected INTEGER DEFAULT 0,
      inspection_warnings TEXT,
      comparison_data TEXT,
      basic_pay INTEGER DEFAULT 0,
      overtime_allowance INTEGER DEFAULT 0,
      night_allowance INTEGER DEFAULT 0,
      holiday_allowance INTEGER DEFAULT 0,
      public_holiday_allowance INTEGER DEFAULT 0,
      annual_leave_allowance INTEGER DEFAULT 0,
      weekly_holiday_allowance INTEGER DEFAULT 0,
      attendance_bonus INTEGER DEFAULT 0,
      substitute_allowance INTEGER DEFAULT 0,
      car_allowance INTEGER DEFAULT 0,
      bonus INTEGER DEFAULT 0,
      special_allowance INTEGER DEFAULT 0,
      total_gross_pay INTEGER DEFAULT 0,
      taxable_income INTEGER DEFAULT 0,
      non_taxable_income INTEGER DEFAULT 0,
      national_pension INTEGER DEFAULT 0,
      health_insurance INTEGER DEFAULT 0,
      longterm_care INTEGER DEFAULT 0,
      employment_insurance INTEGER DEFAULT 0,
      income_tax INTEGER DEFAULT 0,
      local_income_tax INTEGER DEFAULT 0,
      attendance_deduction INTEGER DEFAULT 0,
      probation_deduction INTEGER DEFAULT 0,
      unreported_diff_deduction INTEGER DEFAULT 0,
      total_deductions INTEGER DEFAULT 0,
      net_pay INTEGER DEFAULT 0,
      biz_account_pay INTEGER DEFAULT 0,
      personal_account_pay INTEGER DEFAULT 0,
      calculation_breakdown TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (payroll_run_id) REFERENCES payroll_runs(id) ON DELETE CASCADE,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      UNIQUE(payroll_run_id, employee_id)
    );

    CREATE TABLE IF NOT EXISTS statutory_holidays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      holiday_date DATE NOT NULL UNIQUE,
      name TEXT NOT NULL,
      is_recurring INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      description TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_emp_store ON employees(store_id);
    CREATE INDEX IF NOT EXISTS idx_att_date ON attendance(work_date);
    CREATE INDEX IF NOT EXISTS idx_att_emp_date ON attendance(employee_id, work_date);
    CREATE INDEX IF NOT EXISTS idx_payroll_detail_run ON payroll_details(payroll_run_id);
  `;

  await exec(schema);
  console.log('✅ SQLite Database schema initialized successfully via native node:sqlite.');
}

export default {
  query,
  get,
  run,
  exec,
  initDatabase
};

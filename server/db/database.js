import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'payroll.sqlite');
const db = new DatabaseSync(dbPath);

// Enable WAL mode & foreign keys for high performance and integrity
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

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
      role TEXT DEFAULT 'ADMIN',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS stores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      business_number TEXT,
      ceo_name TEXT,
      address TEXT,
      phone TEXT,
      accident_rate REAL DEFAULT 0.9,
      default_wage_type TEXT DEFAULT 'MONTHLY',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      store_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      rrn_encrypted TEXT NOT NULL,
      rrn_masked TEXT NOT NULL,
      hire_date TEXT NOT NULL,
      resign_date TEXT,
      position TEXT DEFAULT '직원',
      dependents_count INTEGER DEFAULT 1,
      is_foreigner INTEGER DEFAULT 0,
      visa_type TEXT,
      employment_type TEXT DEFAULT 'REGULAR',
      wage_type TEXT DEFAULT 'MONTHLY',
      contract_salary INTEGER DEFAULT 0,
      hourly_wage INTEGER DEFAULT 10320,
      fixed_work_hours TEXT DEFAULT '10:00~22:00',
      bank_name TEXT,
      account_number TEXT,
      has_car INTEGER DEFAULT 0,
      notes TEXT,
      
      is_dual_reporting INTEGER DEFAULT 0,
      reported_salary INTEGER DEFAULT 0,
      withholding_rate REAL DEFAULT 10.0,
      payslip_display_mode TEXT DEFAULT 'SPLIT_PAY',

      contract_duration_type TEXT DEFAULT 'ONE_YEAR_OR_MORE',
      is_simple_labor INTEGER DEFAULT 0,
      probation_applicable INTEGER DEFAULT 0,
      probation_start_date TEXT,
      probation_end_date TEXT,
      probation_rate REAL DEFAULT 90.0,

      non_taxable_meal INTEGER DEFAULT 0,
      non_taxable_car INTEGER DEFAULT 0,
      non_taxable_overtime INTEGER DEFAULT 0,
      tax_exempt_income_tax INTEGER DEFAULT 1,
      tax_exempt_social_ins INTEGER DEFAULT 1,

      ordinary_wage_items TEXT DEFAULT '["basic_pay"]',

      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      store_id INTEGER NOT NULL,
      work_date TEXT NOT NULL,
      clock_in TEXT,
      clock_out TEXT,
      break_minutes INTEGER DEFAULT 0,
      net_work_hours REAL DEFAULT 0,
      day_type TEXT DEFAULT 'REGULAR',
      regular_hours REAL DEFAULT 0,
      overtime_hours REAL DEFAULT 0,
      night_hours REAL DEFAULT 0,
      holiday_hours_under8 REAL DEFAULT 0,
      holiday_hours_over8 REAL DEFAULT 0,
      public_holiday_hours_under8 REAL DEFAULT 0,
      public_holiday_hours_over8 REAL DEFAULT 0,
      is_absent INTEGER DEFAULT 0,
      is_unpaid_leave INTEGER DEFAULT 0,
      is_annual_leave INTEGER DEFAULT 0,
      memo TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(employee_id, work_date),
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS public_holidays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      holiday_date TEXT UNIQUE NOT NULL,
      holiday_name TEXT NOT NULL,
      is_substitute INTEGER DEFAULT 0,
      is_manual INTEGER DEFAULT 0,
      year INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payroll_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      store_id INTEGER NOT NULL,
      year_month TEXT NOT NULL,
      status TEXT DEFAULT 'CALCULATED',
      total_gross_pay INTEGER DEFAULT 0,
      total_deductions INTEGER DEFAULT 0,
      total_net_pay INTEGER DEFAULT 0,
      confirmed_at DATETIME,
      confirmed_by TEXT,
      reopened_at DATETIME,
      reopened_reason TEXT,
      snapshot_rates TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(store_id, year_month),
      FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payroll_details (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payroll_run_id INTEGER NOT NULL,
      employee_id INTEGER NOT NULL,
      store_id INTEGER NOT NULL,
      year_month TEXT NOT NULL,
      inspected INTEGER DEFAULT 0,
      inspection_warnings TEXT DEFAULT '[]',
      comparison_data TEXT DEFAULT '{}',
      
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

      calculation_breakdown TEXT DEFAULT '{}',

      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(payroll_run_id, employee_id),
      FOREIGN KEY (payroll_run_id) REFERENCES payroll_runs(id) ON DELETE CASCADE,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      description TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
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

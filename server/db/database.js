import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dbInstance = null;

export function getDb() {
  if (!dbInstance) {
    try {
      const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
      const dbDir = isServerless ? os.tmpdir() : path.join(__dirname, '../../data');
      if (!fs.existsSync(dbDir)) {
        try { fs.mkdirSync(dbDir, { recursive: true }); } catch (e) {}
      }
      const dbPath = path.join(dbDir, 'payroll.sqlite');
      dbInstance = new DatabaseSync(dbPath);
      if (!isServerless) {
        try { dbInstance.exec('PRAGMA journal_mode = WAL;'); } catch (e) {}
      }
      try { dbInstance.exec('PRAGMA foreign_keys = ON;'); } catch (e) {}
    } catch (err) {
      console.warn('Notice: using in-memory SQLite fallback:', err.message);
      dbInstance = new DatabaseSync(':memory:');
    }
  }
  return dbInstance;
}

const sanitizeParams = (params = []) => params.map(p => p === undefined ? null : p);

/**
 * Promisified & synchronous database wrappers for Node.js native sqlite
 */
export const query = (sql, params = []) => {
  try {
    const db = getDb();
    const stmt = db.prepare(sql);
    return Promise.resolve(stmt.all(...sanitizeParams(params)));
  } catch (err) {
    return Promise.reject(err);
  }
};

export const get = (sql, params = []) => {
  try {
    const db = getDb();
    const stmt = db.prepare(sql);
    return Promise.resolve(stmt.get(...sanitizeParams(params)));
  } catch (err) {
    return Promise.reject(err);
  }
};

export const run = (sql, params = []) => {
  try {
    const db = getDb();
    const stmt = db.prepare(sql);
    const result = stmt.run(...sanitizeParams(params));
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
    const db = getDb();
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
  const statements = [
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      email TEXT,
      role TEXT NOT NULL DEFAULT 'ADMIN',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS stores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      business_number TEXT,
      biz_number TEXT,
      ceo_name TEXT,
      phone TEXT,
      address TEXT,
      accident_rate REAL DEFAULT 0.9,
      default_break_time_minutes INTEGER DEFAULT 60,
      default_wage_type TEXT DEFAULT 'MONTHLY',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS employees (
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
      withholding_rate REAL DEFAULT 10.0,
      contract_duration_type TEXT DEFAULT 'ONE_YEAR_OR_MORE',
      is_simple_labor INTEGER DEFAULT 0,
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
      notes TEXT,
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
    )`,
    `CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      store_id INTEGER NOT NULL,
      work_date DATE NOT NULL,
      clock_in TEXT,
      clock_out TEXT,
      break_minutes INTEGER DEFAULT 60,
      net_work_hours REAL DEFAULT 0,
      day_type TEXT,
      regular_hours REAL DEFAULT 0,
      overtime_hours REAL DEFAULT 0,
      night_hours REAL DEFAULT 0,
      holiday_hours REAL DEFAULT 0,
      public_holiday_hours REAL DEFAULT 0,
      holiday_hours_under8 REAL DEFAULT 0,
      holiday_hours_over8 REAL DEFAULT 0,
      public_holiday_hours_under8 REAL DEFAULT 0,
      public_holiday_hours_over8 REAL DEFAULT 0,
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
    )`,
    `CREATE TABLE IF NOT EXISTS payroll_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      store_id INTEGER NOT NULL,
      year_month TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'DRAFT',
      snapshot_rates TEXT,
      total_gross_pay INTEGER DEFAULT 0,
      total_deductions INTEGER DEFAULT 0,
      total_net_pay INTEGER DEFAULT 0,
      confirmed_at DATETIME,
      confirmed_by TEXT,
      reopen_reason TEXT,
      reopened_at DATETIME,
      reopened_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
      UNIQUE(store_id, year_month)
    )`,
    `CREATE TABLE IF NOT EXISTS payroll_details (
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
    )`,
    `CREATE TABLE IF NOT EXISTS public_holidays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      holiday_date DATE NOT NULL UNIQUE,
      holiday_name TEXT NOT NULL,
      is_substitute INTEGER DEFAULT 0,
      is_manual INTEGER DEFAULT 0,
      year INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS statutory_holidays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      holiday_date DATE NOT NULL UNIQUE,
      name TEXT NOT NULL,
      is_recurring INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS system_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      description TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER,
      details TEXT,
      performed_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS idx_emp_store ON employees(store_id)`,
    `CREATE INDEX IF NOT EXISTS idx_att_date ON attendance(work_date)`,
    `CREATE INDEX IF NOT EXISTS idx_att_emp_date ON attendance(employee_id, work_date)`,
    `CREATE INDEX IF NOT EXISTS idx_payroll_detail_run ON payroll_details(payroll_run_id)`
  ];

  for (const sql of statements) {
    await exec(sql);
  }

  // Auto migrate missing columns in existing SQLite tables
  try {
    const storeCols = await query("PRAGMA table_info(stores)");
    const sNames = storeCols.map(c => c.name);
    if (!sNames.includes('biz_number')) await exec("ALTER TABLE stores ADD COLUMN biz_number TEXT;");
    if (!sNames.includes('business_number')) await exec("ALTER TABLE stores ADD COLUMN business_number TEXT;");
    if (!sNames.includes('accident_rate')) await exec("ALTER TABLE stores ADD COLUMN accident_rate REAL DEFAULT 0.9;");

    const empCols = await query("PRAGMA table_info(employees)");
    const eNames = empCols.map(c => c.name);
    if (!eNames.includes('phone')) await exec("ALTER TABLE employees ADD COLUMN phone TEXT;");
    if (!eNames.includes('position')) await exec("ALTER TABLE employees ADD COLUMN position TEXT;");
    if (!eNames.includes('bank_name')) await exec("ALTER TABLE employees ADD COLUMN bank_name TEXT;");
    if (!eNames.includes('account_number')) await exec("ALTER TABLE employees ADD COLUMN account_number TEXT;");
    if (!eNames.includes('fixed_work_hours')) await exec("ALTER TABLE employees ADD COLUMN fixed_work_hours TEXT;");
    if (!eNames.includes('has_car')) await exec("ALTER TABLE employees ADD COLUMN has_car INTEGER DEFAULT 0;");
    if (!eNames.includes('notes')) await exec("ALTER TABLE employees ADD COLUMN notes TEXT;");
    if (!eNames.includes('is_dual_reporting')) await exec("ALTER TABLE employees ADD COLUMN is_dual_reporting INTEGER DEFAULT 0;");
    if (!eNames.includes('reported_salary')) await exec("ALTER TABLE employees ADD COLUMN reported_salary INTEGER DEFAULT 0;");
    if (!eNames.includes('reported_hourly_wage')) await exec("ALTER TABLE employees ADD COLUMN reported_hourly_wage INTEGER DEFAULT 0;");
    if (!eNames.includes('dual_reporting_memo')) await exec("ALTER TABLE employees ADD COLUMN dual_reporting_memo TEXT;");
    if (!eNames.includes('withholding_rate')) await exec("ALTER TABLE employees ADD COLUMN withholding_rate REAL DEFAULT 10.0;");
    if (!eNames.includes('contract_duration_type')) await exec("ALTER TABLE employees ADD COLUMN contract_duration_type TEXT DEFAULT 'ONE_YEAR_OR_MORE';");
    if (!eNames.includes('is_simple_labor')) await exec("ALTER TABLE employees ADD COLUMN is_simple_labor INTEGER DEFAULT 0;");
    if (!eNames.includes('probation_applicable')) await exec("ALTER TABLE employees ADD COLUMN probation_applicable INTEGER DEFAULT 0;");
    if (!eNames.includes('probation_start_date')) await exec("ALTER TABLE employees ADD COLUMN probation_start_date DATE;");
    if (!eNames.includes('probation_end_date')) await exec("ALTER TABLE employees ADD COLUMN probation_end_date DATE;");
    if (!eNames.includes('probation_rate')) await exec("ALTER TABLE employees ADD COLUMN probation_rate REAL DEFAULT 90.0;");
    if (!eNames.includes('non_taxable_meal')) await exec("ALTER TABLE employees ADD COLUMN non_taxable_meal INTEGER DEFAULT 0;");
    if (!eNames.includes('non_taxable_car')) await exec("ALTER TABLE employees ADD COLUMN non_taxable_car INTEGER DEFAULT 0;");
    if (!eNames.includes('non_taxable_overtime')) await exec("ALTER TABLE employees ADD COLUMN non_taxable_overtime INTEGER DEFAULT 0;");
    if (!eNames.includes('tax_exempt_income_tax')) await exec("ALTER TABLE employees ADD COLUMN tax_exempt_income_tax INTEGER DEFAULT 1;");
    if (!eNames.includes('tax_exempt_social_ins')) await exec("ALTER TABLE employees ADD COLUMN tax_exempt_social_ins INTEGER DEFAULT 1;");
    if (!eNames.includes('ordinary_wage_items')) await exec("ALTER TABLE employees ADD COLUMN ordinary_wage_items TEXT;");
    if (!eNames.includes('payslip_display_mode')) await exec("ALTER TABLE employees ADD COLUMN payslip_display_mode TEXT DEFAULT 'STANDARD';");

    const attCols = await query("PRAGMA table_info(attendance)");
    const aNames = attCols.map(c => c.name);
    if (!aNames.includes('day_type')) await exec("ALTER TABLE attendance ADD COLUMN day_type TEXT;");
    if (!aNames.includes('holiday_hours')) await exec("ALTER TABLE attendance ADD COLUMN holiday_hours REAL DEFAULT 0;");
    if (!aNames.includes('public_holiday_hours')) await exec("ALTER TABLE attendance ADD COLUMN public_holiday_hours REAL DEFAULT 0;");
    if (!aNames.includes('holiday_hours_under8')) await exec("ALTER TABLE attendance ADD COLUMN holiday_hours_under8 REAL DEFAULT 0;");
    if (!aNames.includes('holiday_hours_over8')) await exec("ALTER TABLE attendance ADD COLUMN holiday_hours_over8 REAL DEFAULT 0;");
    if (!aNames.includes('public_holiday_hours_under8')) await exec("ALTER TABLE attendance ADD COLUMN public_holiday_hours_under8 REAL DEFAULT 0;");
    if (!aNames.includes('public_holiday_hours_over8')) await exec("ALTER TABLE attendance ADD COLUMN public_holiday_hours_over8 REAL DEFAULT 0;");
    if (!aNames.includes('is_public_holiday')) await exec("ALTER TABLE attendance ADD COLUMN is_public_holiday INTEGER DEFAULT 0;");
    if (!aNames.includes('is_weekly_holiday')) await exec("ALTER TABLE attendance ADD COLUMN is_weekly_holiday INTEGER DEFAULT 0;");
    if (!aNames.includes('is_annual_leave')) await exec("ALTER TABLE attendance ADD COLUMN is_annual_leave INTEGER DEFAULT 0;");
    if (!aNames.includes('is_unpaid_leave')) await exec("ALTER TABLE attendance ADD COLUMN is_unpaid_leave INTEGER DEFAULT 0;");
    if (!aNames.includes('is_absent')) await exec("ALTER TABLE attendance ADD COLUMN is_absent INTEGER DEFAULT 0;");

    const pdCols = await query("PRAGMA table_info(payroll_details)");
    const pNames = pdCols.map(c => c.name);
    if (!pNames.includes('public_holiday_allowance')) await exec("ALTER TABLE payroll_details ADD COLUMN public_holiday_allowance INTEGER DEFAULT 0;");
    if (!pNames.includes('unreported_diff_deduction')) await exec("ALTER TABLE payroll_details ADD COLUMN unreported_diff_deduction INTEGER DEFAULT 0;");
    if (!pNames.includes('probation_deduction')) await exec("ALTER TABLE payroll_details ADD COLUMN probation_deduction INTEGER DEFAULT 0;");
    if (!pNames.includes('biz_account_pay')) await exec("ALTER TABLE payroll_details ADD COLUMN biz_account_pay INTEGER DEFAULT 0;");
    if (!pNames.includes('personal_account_pay')) await exec("ALTER TABLE payroll_details ADD COLUMN personal_account_pay INTEGER DEFAULT 0;");
    if (!pNames.includes('comparison_data')) await exec("ALTER TABLE payroll_details ADD COLUMN comparison_data TEXT;");

    const runCols = await query("PRAGMA table_info(payroll_runs)");
    const rNames = runCols.map(c => c.name);
    if (!rNames.includes('snapshot_rates')) await exec("ALTER TABLE payroll_runs ADD COLUMN snapshot_rates TEXT;");
    if (!rNames.includes('reopened_at')) await exec("ALTER TABLE payroll_runs ADD COLUMN reopened_at DATETIME;");
    if (!rNames.includes('reopened_reason')) await exec("ALTER TABLE payroll_runs ADD COLUMN reopened_reason TEXT;");
  } catch (e) {
    console.error('Migration error:', e);
  }

  console.log('✅ SQLite Database schema initialized successfully.');
}

export default {
  query,
  get,
  run,
  exec,
  initDatabase,
  getDb
};

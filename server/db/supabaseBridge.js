import { supabaseAdmin } from './supabase.js';
import * as db from './database.js';

let isPulling = false;

/**
 * Pull all data from Supabase Cloud to local database (Hydration)
 */
export async function pullFromSupabase() {
  if (isPulling) return;
  isPulling = true;
  console.log('☁️ [Supabase Bridge] Pulling cloud data from Supabase to local DB...');

  try {
    // 1. Pull Stores
    const { data: stores, error: sErr } = await supabaseAdmin.from('stores').select('*');
    if (!sErr && stores && stores.length > 0) {
      for (const s of stores) {
        await db.run(`
          INSERT OR REPLACE INTO stores (
            id, name, business_number, biz_number, ceo_name, phone, address, accident_rate, default_break_time_minutes, default_wage_type
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          s.id, s.name, s.business_number || s.biz_number, s.biz_number || s.business_number,
          s.ceo_name, s.phone, s.address, s.accident_rate || 0.9, s.default_break_time_minutes || 60, s.default_wage_type || 'MONTHLY'
        ]);
      }
      console.log(`✅ [Supabase Bridge] Hydrated ${stores.length} stores.`);
    }

    // 2. Pull Users
    const { data: users, error: uErr } = await supabaseAdmin.from('users').select('*');
    if (!uErr && users && users.length > 0) {
      for (const u of users) {
        await db.run(`
          INSERT OR REPLACE INTO users (id, username, password_hash, email, role)
          VALUES (?, ?, ?, ?, ?)
        `, [u.id, u.username, u.password_hash, u.email, u.role || 'ADMIN']);
      }
      console.log(`✅ [Supabase Bridge] Hydrated ${users.length} users.`);
    }

    // 3. Pull Employees
    const { data: employees, error: eErr } = await supabaseAdmin.from('employees').select('*');
    if (!eErr && employees && employees.length > 0) {
      for (const e of employees) {
        let fixedNP = e.fixed_national_pension || 0;
        if (!fixedNP && e.notes) {
          try {
            const parsed = JSON.parse(e.notes);
            if (parsed && parsed.fixed_national_pension) {
              fixedNP = parsed.fixed_national_pension;
            }
          } catch (err) {}
        }

        await db.run(`
          INSERT OR REPLACE INTO employees (
            id, store_id, name, rrn_encrypted, rrn_masked, phone, position, hire_date, resign_date,
            employment_type, wage_type, contract_salary, hourly_wage, is_dual_reporting, reported_salary,
            reported_hourly_wage, dual_reporting_memo, withholding_rate, contract_duration_type,
            is_simple_labor, probation_applicable, probation_start_date, probation_end_date, probation_rate,
            dependents_count, bank_name, account_number, is_foreigner, visa_type, fixed_work_hours,
            has_car, notes, non_taxable_meal, non_taxable_car, non_taxable_overtime,
            tax_exempt_income_tax, tax_exempt_social_ins, ins_national_pension, ins_health,
            ins_longterm_care, ins_employment, ins_work_accident, deduct_income_tax, deduct_local_tax,
            fixed_national_pension, ordinary_wage_items, payslip_display_mode
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          e.id, e.store_id, e.name, e.rrn_encrypted, e.rrn_masked, e.phone, e.position, e.hire_date, e.resign_date,
          e.employment_type || 'REGULAR', e.wage_type || 'MONTHLY', e.contract_salary || 0, e.hourly_wage || 0,
          e.is_dual_reporting || 0, e.reported_salary || 0, e.reported_hourly_wage || 0, e.dual_reporting_memo,
          e.withholding_rate || 10.0, e.contract_duration_type || 'ONE_YEAR_OR_MORE', e.is_simple_labor || 0,
          e.probation_applicable || 0, e.probation_start_date, e.probation_end_date, e.probation_rate || 90.0,
          e.dependents_count || 1, e.bank_name, e.account_number, e.is_foreigner || 0, e.visa_type,
          e.fixed_work_hours, e.has_car || 0, e.notes, e.non_taxable_meal || 0, e.non_taxable_car || 0,
          e.non_taxable_overtime || 0, e.tax_exempt_income_tax !== undefined ? e.tax_exempt_income_tax : 1,
          e.tax_exempt_social_ins !== undefined ? e.tax_exempt_social_ins : 1,
          e.ins_national_pension !== undefined ? e.ins_national_pension : 1,
          e.ins_health !== undefined ? e.ins_health : 1,
          e.ins_longterm_care !== undefined ? e.ins_longterm_care : 1,
          e.ins_employment !== undefined ? e.ins_employment : 1,
          e.ins_work_accident !== undefined ? e.ins_work_accident : 1,
          e.deduct_income_tax !== undefined ? e.deduct_income_tax : 1,
          e.deduct_local_tax !== undefined ? e.deduct_local_tax : 1,
          fixedNP,
          e.ordinary_wage_items || '["basic_pay"]', e.payslip_display_mode || 'STANDARD'
        ]);
      }
      console.log(`✅ [Supabase Bridge] Hydrated ${employees.length} employees.`);
    }

    // 4. Pull Attendance
    const { data: attendance, error: aErr } = await supabaseAdmin.from('attendance').select('*');
    if (!aErr && attendance && attendance.length > 0) {
      for (const a of attendance) {
        await db.run(`
          INSERT OR REPLACE INTO attendance (
            id, employee_id, store_id, work_date, clock_in, clock_out, break_minutes, net_work_hours,
            day_type, regular_hours, overtime_hours, night_hours, holiday_hours, public_holiday_hours,
            holiday_hours_under8, holiday_hours_over8, public_holiday_hours_under8, public_holiday_hours_over8,
            is_public_holiday, is_weekly_holiday, is_annual_leave, is_half_annual_leave, is_unpaid_leave, is_absent, memo
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          a.id, a.employee_id, a.store_id, a.work_date, a.clock_in, a.clock_out, a.break_minutes || 60,
          a.net_work_hours || 0, a.day_type || 'REGULAR', a.regular_hours || 0, a.overtime_hours || 0,
          a.night_hours || 0, a.holiday_hours || 0, a.public_holiday_hours || 0,
          a.holiday_hours_under8 || 0, a.holiday_hours_over8 || 0,
          a.public_holiday_hours_under8 || 0, a.public_holiday_hours_over8 || 0,
          a.is_public_holiday || 0, a.is_weekly_holiday || 0, a.is_annual_leave || 0, a.is_half_annual_leave || 0,
          a.is_unpaid_leave || 0, a.is_absent || 0, a.memo || ''
        ]);
      }
      console.log(`✅ [Supabase Bridge] Hydrated ${attendance.length} attendance records.`);
    }

    // 5. Pull Payroll Runs & Details
    const { data: runs, error: rErr } = await supabaseAdmin.from('payroll_runs').select('*');
    if (!rErr && runs && runs.length > 0) {
      for (const r of runs) {
        await db.run(`
          INSERT OR REPLACE INTO payroll_runs (
            id, store_id, year_month, status, confirmed_at, confirmed_by, reopened_at, reopened_reason, snapshot_rates
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          r.id, r.store_id, r.year_month, r.status || 'DRAFT', r.confirmed_at, r.confirmed_by,
          r.reopened_at, r.reopened_reason, r.snapshot_rates
        ]);
      }
      console.log(`✅ [Supabase Bridge] Hydrated ${runs.length} payroll runs.`);
    }

    const { data: details, error: dErr } = await supabaseAdmin.from('payroll_details').select('*');
    if (!dErr && details && details.length > 0) {
      for (const d of details) {
        await db.run(`
          INSERT OR REPLACE INTO payroll_details (
            id, payroll_run_id, employee_id, store_id, year_month, inspected, basic_pay, overtime_allowance,
            night_allowance, holiday_allowance, public_holiday_allowance, annual_leave_allowance,
            weekly_holiday_allowance, attendance_bonus, substitute_allowance, car_allowance, bonus,
            special_allowance, total_gross_pay, taxable_income, non_taxable_income, national_pension,
            health_insurance, longterm_care, employment_insurance, income_tax, local_income_tax,
            attendance_deduction, probation_deduction, unreported_diff_deduction, total_deductions,
            net_pay, biz_account_pay, personal_account_pay, calculation_breakdown
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          d.id, d.payroll_run_id, d.employee_id, d.store_id, d.year_month, d.inspected || 0,
          d.basic_pay || 0, d.overtime_allowance || 0, d.night_allowance || 0, d.holiday_allowance || 0,
          d.public_holiday_allowance || 0, d.annual_leave_allowance || 0, d.weekly_holiday_allowance || 0,
          d.attendance_bonus || 0, d.substitute_allowance || 0, d.car_allowance || 0, d.bonus || 0,
          d.special_allowance || 0, d.total_gross_pay || 0, d.taxable_income || 0, d.non_taxable_income || 0,
          d.national_pension || 0, d.health_insurance || 0, d.longterm_care || 0, d.employment_insurance || 0,
          d.income_tax || 0, d.local_income_tax || 0, d.attendance_deduction || 0, d.probation_deduction || 0,
          d.unreported_diff_deduction || 0, d.total_deductions || 0, d.net_pay || 0,
          d.biz_account_pay || 0, d.personal_account_pay || 0, d.calculation_breakdown
        ]);
      }
      console.log(`✅ [Supabase Bridge] Hydrated ${details.length} payroll details.`);
    }

    console.log('🌟 [Supabase Bridge] Complete sync finished successfully!');
  } catch (err) {
    console.error('⚠️ [Supabase Bridge] Sync error (using local fallback):', err.message);
  } finally {
    isPulling = false;
  }
}

/**
 * Push an entity mutation asynchronously to Supabase
 */
export async function pushToSupabase(table, data, action = 'upsert') {
  try {
    if (!data) return;
    if (action === 'delete') {
      await supabaseAdmin.from(table).delete().match(data);
    } else {
      const records = Array.isArray(data) ? data : [data];
      const sanitized = records.map(r => {
        const copy = { ...r };
        delete copy.store_name;
        delete copy.employee_count;
        if (table === 'employees') {
          if (copy.fixed_national_pension !== undefined) {
            let noteObj = {};
            try { 
              noteObj = typeof copy.notes === 'string' && copy.notes.startsWith('{') ? JSON.parse(copy.notes) : { memo: copy.notes || '' }; 
            } catch (e) { 
              noteObj = { memo: copy.notes || '' }; 
            }
            if (copy.fixed_national_pension > 0) {
              noteObj.fixed_national_pension = copy.fixed_national_pension;
              copy.notes = JSON.stringify(noteObj);
            }
            delete copy.fixed_national_pension;
          }
        }
        return copy;
      });
      const { error } = await supabaseAdmin.from(table).upsert(sanitized);
      if (error) {
        console.warn(`[Supabase Upsert Error] Table ${table}:`, error.message);
      } else {
        console.log(`☁️ [Supabase Sync] Upserted ${sanitized.length} record(s) to ${table}`);
      }
    }
  } catch (err) {
    console.warn(`[Supabase Push Error] Table ${table}:`, err.message);
  }
}

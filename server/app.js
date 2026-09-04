import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import db from './db/database.js';
import { initHolidays } from './services/holidayService.js';
import { runSeeds } from './db/seeds.js';
import { pullFromSupabase } from './db/supabaseBridge.js';
import { syncSqliteToSupabase } from './db/syncToSupabase.js';

import authRoutes from './routes/auth.js';
import storeRoutes from './routes/stores.js';
import employeeRoutes from './routes/employees.js';
import attendanceRoutes from './routes/attendance.js';
import payrollRoutes from './routes/payroll.js';
import holidayRoutes from './routes/holidays.js';
import settingsRoutes from './routes/settings.js';
import dashboardRoutes from './routes/dashboard.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());

// Automatic DB Schema & Seed Initialization for local and serverless environments
let dbInitialized = false;
let initPromise = null;

async function ensureDatabaseReady() {
  if (dbInitialized) return;
  if (!initPromise) {
    initPromise = (async () => {
      try {
        await db.initDatabase();
        await initHolidays();
        
        // Hydrate latest data from Supabase Cloud
        await pullFromSupabase();

        const storesCount = await db.get('SELECT COUNT(*) as count FROM stores');
        if (!storesCount || storesCount.count === 0) {
          console.log('🔄 Initializing database with default seeds...');
          await runSeeds();
        }

        const vu = await db.get("SELECT id FROM employees WHERE name LIKE '%DUC HUY%' OR name LIKE '%VU DUC%' OR id = 7");
        if (!vu) {
          console.log('🔄 Ensuring standard foreign employee VU DUC HUY is present...');
          const { encryptText, maskRRN } = await import('./utils/crypto.js');
          const { pushToSupabase } = await import('./db/supabaseBridge.js');
          const rrnEnc = encryptText('020307-7520019');
          const rrnMsk = maskRRN('020307-7520019');
          await db.run(
            `INSERT OR REPLACE INTO employees (
              id, store_id, name, rrn_encrypted, rrn_masked, phone, position, hire_date,
              dependents_count, is_foreigner, visa_type, employment_type, wage_type,
              contract_salary, hourly_wage, fixed_work_hours, bank_name, account_number,
              has_car, is_dual_reporting, reported_salary, probation_applicable, probation_rate,
              non_taxable_meal, non_taxable_car, non_taxable_overtime, fixed_national_pension,
              ins_national_pension, ins_health, ins_longterm_care, ins_employment, ins_work_accident
            ) VALUES (
              7, 1, 'VU DUC HUY', ?, ?, '010-0000-0000', '직원', '2025-12-13',
              0, 1, 'E-9', 'REGULAR', 'MONTHLY',
              1080000, 10320, '10:00~15:00', '우리은행', '1002-384-910293',
              0, 0, 1080000, 0, 90.0,
              0, 0, 0, 50010,
              1, 1, 1, 0, 1
            )`,
            [rrnEnc, rrnMsk]
          );
          const newVu = await db.get('SELECT * FROM employees WHERE id = 7');
          await pushToSupabase('employees', newVu);
        }
        dbInitialized = true;
      } catch (err) {
        console.error('Database initialization error:', err);
        throw err;
      }
    })();
  }
  return initPromise;
}

app.use(async (req, res, next) => {
  try {
    await ensureDatabaseReady();

    // Trigger asynchronous sync to Supabase on mutations
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
      res.on('finish', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          syncSqliteToSupabase().catch(err => console.warn('Background Supabase sync notice:', err.message));
        }
      });
    }

    next();
  } catch (err) {
    console.error('Request middleware database error:', err);
    res.status(500).json({ 
      success: false, 
      message: '데이터베이스 초기화 중 오류: ' + (err.message || String(err)) 
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Serve frontend in production build
const clientDist = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

export default app;

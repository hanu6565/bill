import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import db from './db/database.js';
import { initHolidays } from './services/holidayService.js';
import { runSeeds } from './db/seeds.js';

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
        const usersCount = await db.get('SELECT COUNT(*) as count FROM users');
        if (!usersCount || usersCount.count === 0) {
          console.log('🔄 Initializing database with seeds...');
          await runSeeds();
        }
        dbInitialized = true;
      } catch (err) {
        console.error('Failed to initialize database:', err);
        throw err;
      }
    })();
  }
  return initPromise;
}

app.use(async (req, res, next) => {
  try {
    await ensureDatabaseReady();
    next();
  } catch (err) {
    res.status(500).json({ success: false, message: '데이터베이스 초기화 중 오류가 발생했습니다.' });
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

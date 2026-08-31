import app from './app.js';
import db from './db/database.js';
import { initHolidays } from './services/holidayService.js';
import { runSeeds } from './db/seeds.js';

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await db.initDatabase();
    await initHolidays();

    const usersCount = await db.get('SELECT COUNT(*) as count FROM users');
    if (!usersCount || usersCount.count === 0) {
      console.log('🔄 First run detected: executing initial database seeds...');
      await runSeeds();
    }

    app.listen(PORT, () => {
      console.log(`🚀 Payroll Server is running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
  }
}

startServer();

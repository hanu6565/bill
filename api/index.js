import app from '../server/app.js';
import db from '../server/db/database.js';
import { initHolidays } from '../server/services/holidayService.js';
import { runSeeds } from '../server/db/seeds.js';

let initialized = false;

async function ensureDbInitialized() {
  if (!initialized) {
    try {
      await db.initDatabase();
      await initHolidays();
      const usersCount = await db.get('SELECT COUNT(*) as count FROM users');
      if (!usersCount || usersCount.count === 0) {
        await runSeeds();
      }
      initialized = true;
    } catch (e) {
      console.error('Database init in serverless handler:', e);
    }
  }
}

export default async function handler(req, res) {
  await ensureDbInitialized();
  return app(req, res);
}

const fs   = require('fs');
const path = require('path');
const cron = require('node-cron');

// ── backup.js lives in  backend/utils/
// ── DB lives in         backend/data/
const DB_PATH   = path.join(__dirname, '..', 'data', 'restaurant.db');
const BACKUP_DIR = path.join(__dirname, '..', 'data', 'backups');

function runBackup() {
  if (!fs.existsSync(DB_PATH)) {
    console.warn('[Backup] DB file not found, skipping.');
    return;
  }
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const stamp = new Date().toISOString().slice(0, 10);          // YYYY-MM-DD
  const dest  = path.join(BACKUP_DIR, `restaurant_${stamp}.db`);
  fs.copyFileSync(DB_PATH, dest);
  console.log(`[Backup] Created: ${dest}`);

  // Keep only the last 30 daily backups
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith('.db'))
    .sort();

  if (files.length > 30) {
    files.slice(0, files.length - 30).forEach(f => {
      fs.unlinkSync(path.join(BACKUP_DIR, f));
      console.log(`[Backup] Removed old backup: ${f}`);
    });
  }
}

function startBackupSchedule() {
  cron.schedule('0 2 * * *', runBackup);
  console.log('[Backup] Scheduled daily at 2:00 AM');
}

module.exports = { startBackupSchedule, runBackup };
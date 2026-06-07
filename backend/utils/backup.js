const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

const DB_PATH = path.join(__dirname, 'data', 'restaurant.db');
const BACKUP_DIR = path.join(__dirname, 'data', 'backups');

function runBackup() {
  if (!fs.existsSync(DB_PATH)) return;
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const now = new Date();
  const stamp = now.toISOString().slice(0, 10);
  const dest = path.join(BACKUP_DIR, `restaurant_${stamp}.db`);

  fs.copyFileSync(DB_PATH, dest);
  console.log(`[Backup] Created: ${dest}`);

  // Keep only last 30 backups
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith('.db'))
    .sort();

  if (files.length > 30) {
    const toDelete = files.slice(0, files.length - 30);
    toDelete.forEach(f => {
      fs.unlinkSync(path.join(BACKUP_DIR, f));
      console.log(`[Backup] Removed old backup: ${f}`);
    });
  }
}

// Run at 2 AM every day
function startBackupSchedule() {
  cron.schedule('0 2 * * *', runBackup);
  console.log('[Backup] Scheduled daily at 2:00 AM');
}

module.exports = { startBackupSchedule, runBackup };
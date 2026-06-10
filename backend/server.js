const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Security ─────────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3001',
    'http://127.0.0.1:5173'
  ]
}));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Rate-limit login only
app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Please wait 15 minutes.' }
}));

// ─── Init DB ──────────────────────────────────────────────────────────────────
require('./db');

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/items', require('./routes/items'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/history', require('./routes/history'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/billcalcs', require('./routes/billcalcs'));

// ─── Serve frontend in production ─────────────────────────────────────────────
const frontendBuild = path.join(__dirname, '..', 'frontend', 'dist');

if (fs.existsSync(frontendBuild)) {
  app.use(express.static(frontendBuild));

  app.use((req, res) => {
    res.sendFile(path.join(frontendBuild, 'index.html'));
  });
}

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.post('/api/shutdown', (req, res) => {
  res.json({ success: true });

  setTimeout(() => {
    process.exit(0);
  }, 500);
});

// ─── Daily backup schedule ────────────────────────────────────────────────────
const { startBackupSchedule } = require('./utils/backup');
startBackupSchedule();

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🍽️  Restaurant Billing Server → http://localhost:${PORT}\n`);

  const url = `http://localhost:${PORT}`;

  if (process.platform === 'win32') {
    exec(`start ${url}`);
  } else if (process.platform === 'darwin') {
    exec(`open ${url}`);
  } else {
    exec(`xdg-open ${url}`);
  }
});
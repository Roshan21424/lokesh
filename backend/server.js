const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3001', 'http://127.0.0.1:5173'] }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Rate limit on login only
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Please wait 15 minutes.' }
});
app.use('/api/auth/login', loginLimiter);

// Init DB (runs schema + seed)
require('./db');

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/items', require('./routes/items'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/history', require('./routes/history'));
app.use('/api/settings', require('./routes/auth'));

// Serve frontend build in production
const frontendBuild = path.join(__dirname, '..', 'frontend', 'dist');
const fs = require('fs');
if (fs.existsSync(frontendBuild)) {
  app.use(express.static(frontendBuild));
  app.get('*', (req, res) => res.sendFile(path.join(frontendBuild, 'index.html')));
}

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Start backup schedule
const { startBackupSchedule } = require('./utils/backup');
startBackupSchedule();

app.listen(PORT, () => {
  console.log(`\n🍽️  Restaurant Billing Server running on http://localhost:${PORT}`);
  console.log(`   API ready. Frontend: http://localhost:5173 (dev) or http://localhost:${PORT} (prod)\n`);
});
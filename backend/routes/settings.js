const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

const ALLOWED_KEYS = ['restaurant_name', 'address', 'gstin', 'phone', 'receipt_footer'];

// GET /api/settings — return all as object
router.get('/', auth, (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const out = {};
  rows.forEach(r => (out[r.key] = r.value));
  res.json(out);
});

// PATCH /api/settings — bulk update (admin only)
router.patch('/', auth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  const upsert = db.prepare('INSERT OR REPLACE INTO settings(key, value) VALUES(?, ?)');
  const tx = db.transaction(() => {
    for (const key of ALLOWED_KEYS) {
      if (req.body[key] !== undefined) {
        upsert.run(key, String(req.body[key]));
      }
    }
  });
  tx();

  const rows = db.prepare('SELECT key, value FROM settings').all();
  const out = {};
  rows.forEach(r => (out[r.key] = r.value));
  res.json(out);
});

module.exports = router;
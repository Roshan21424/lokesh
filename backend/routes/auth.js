const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const auth = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'restaurant_secret_key_change_in_production';

// Login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const user = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username.trim());
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET);
  res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
});

// Get current user
router.get('/me', auth, (req, res) => {
  const user = db.prepare('SELECT id, username, role FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

// Get all staff (admin only)
router.get('/staff', auth, (req, res) => {
  const staff = db.prepare('SELECT id, username, role, is_active, created_at FROM users ORDER BY role, username').all();
  res.json(staff);
});

// Create staff
router.post('/staff', auth, (req, res) => {
  const { username, password, role = 'staff' } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  if (!['admin', 'staff'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  if (password.length < 4) return res.status(400).json({ error: 'Password must be at least 4 characters' });

  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim());
  if (exists) return res.status(409).json({ error: 'Username already exists' });

  const hash = bcrypt.hashSync(password, 12);
  const result = db.prepare('INSERT INTO users(username, password, role) VALUES(?,?,?)').run(username.trim(), hash, role);
  res.json({ id: result.lastInsertRowid, username: username.trim(), role });
});

// Update staff password
router.patch('/staff/:id/password', auth, (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 4) return res.status(400).json({ error: 'Password must be at least 4 characters' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const hash = bcrypt.hashSync(password, 12);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, req.params.id);
  res.json({ success: true });
});

// Toggle staff active (cannot deactivate last admin)
router.patch('/staff/:id/toggle', auth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (user.role === 'admin') {
    const adminCount = db.prepare('SELECT COUNT(*) as cnt FROM users WHERE role = ? AND is_active = 1').get('admin');
    if (adminCount.cnt <= 1 && user.is_active === 1) {
      return res.status(400).json({ error: 'Cannot deactivate the last admin account' });
    }
  }

  db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(user.is_active ? 0 : 1, req.params.id);
  res.json({ success: true, is_active: user.is_active ? 0 : 1 });
});

module.exports = router;
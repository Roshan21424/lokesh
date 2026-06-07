const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET /api/billcalcs?all=true
router.get('/', auth, (req, res) => {
  const all = req.query.all === 'true';
  const rows = all
    ? db.prepare('SELECT * FROM bill_calculations ORDER BY sort_order, name').all()
    : db.prepare('SELECT * FROM bill_calculations WHERE is_active = 1 ORDER BY sort_order, name').all();
  res.json(rows);
});

// POST /api/billcalcs (admin only)
router.post('/', auth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { name, type, value, is_deduction = 0, sort_order = 0 } = req.body;

  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
  if (!['percentage', 'flat'].includes(type)) return res.status(400).json({ error: 'Type must be percentage or flat' });
  if (value === undefined || value === null || isNaN(value)) return res.status(400).json({ error: 'Valid numeric value required' });

  const dup = db.prepare('SELECT id FROM bill_calculations WHERE name = ?').get(name.trim());
  if (dup) return res.status(409).json({ error: 'Name already exists' });

  const result = db.prepare(
    'INSERT INTO bill_calculations(name, type, value, is_deduction, sort_order) VALUES(?,?,?,?,?)'
  ).run(name.trim(), type, Number(value), is_deduction ? 1 : 0, Number(sort_order));

  res.json(db.prepare('SELECT * FROM bill_calculations WHERE id = ?').get(result.lastInsertRowid));
});

// PATCH /api/billcalcs/:id (admin only)
router.patch('/:id', auth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const row = db.prepare('SELECT * FROM bill_calculations WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });

  const { name, type, value, is_deduction, is_active, sort_order } = req.body;

  if (name && name.trim() !== row.name) {
    const dup = db.prepare('SELECT id FROM bill_calculations WHERE name = ? AND id != ?').get(name.trim(), req.params.id);
    if (dup) return res.status(409).json({ error: 'Name already exists' });
  }

  db.prepare(`UPDATE bill_calculations SET
    name        = COALESCE(?, name),
    type        = COALESCE(?, type),
    value       = COALESCE(?, value),
    is_deduction = COALESCE(?, is_deduction),
    is_active   = COALESCE(?, is_active),
    sort_order  = COALESCE(?, sort_order)
  WHERE id = ?`).run(
    name ? name.trim() : null,
    type  || null,
    value !== undefined ? Number(value) : null,
    is_deduction !== undefined ? (is_deduction ? 1 : 0) : null,
    is_active    !== undefined ? (is_active    ? 1 : 0) : null,
    sort_order   !== undefined ? Number(sort_order)     : null,
    req.params.id
  );

  res.json(db.prepare('SELECT * FROM bill_calculations WHERE id = ?').get(req.params.id));
});

// DELETE /api/billcalcs/:id (admin only)
router.delete('/:id', auth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const row = db.prepare('SELECT id FROM bill_calculations WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM bill_calculations WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
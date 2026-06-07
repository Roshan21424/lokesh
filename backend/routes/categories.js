const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// Get all active categories
router.get('/', auth, (req, res) => {
  const all = req.query.all === 'true';
  const categories = all
    ? db.prepare('SELECT * FROM categories ORDER BY sort_order, name').all()
    : db.prepare('SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order, name').all();
  res.json(categories);
});

// Create category
router.post('/', auth, (req, res) => {
  const { name, sort_order = 0 } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Category name is required' });

  const exists = db.prepare('SELECT id FROM categories WHERE name = ?').get(name.trim());
  if (exists) return res.status(409).json({ error: 'Category name already exists' });

  const result = db.prepare('INSERT INTO categories(name, sort_order) VALUES(?,?)').run(name.trim(), sort_order);
  res.json({ id: result.lastInsertRowid, name: name.trim(), sort_order, is_active: 1 });
});

// Update category
router.patch('/:id', auth, (req, res) => {
  const { name, sort_order, is_active } = req.body;
  const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!cat) return res.status(404).json({ error: 'Category not found' });

  if (name && name.trim() !== cat.name) {
    const exists = db.prepare('SELECT id FROM categories WHERE name = ? AND id != ?').get(name.trim(), req.params.id);
    if (exists) return res.status(409).json({ error: 'Category name already exists' });
  }

  db.prepare(`
    UPDATE categories SET
      name = COALESCE(?, name),
      sort_order = COALESCE(?, sort_order),
      is_active = COALESCE(?, is_active)
    WHERE id = ?
  `).run(name ? name.trim() : null, sort_order ?? null, is_active ?? null, req.params.id);

  res.json(db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id));
});

module.exports = router;
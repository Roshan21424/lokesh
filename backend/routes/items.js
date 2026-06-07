const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// Get items (optionally by category)
router.get('/', auth, (req, res) => {
  const { category_id, all } = req.query;
  let query = `
    SELECT i.*, c.name as category_name
    FROM menu_items i
    JOIN categories c ON c.id = i.category_id
  `;
  const params = [];
  const conditions = [];

  if (all !== 'true') conditions.push('i.is_active = 1');
  if (category_id) { conditions.push('i.category_id = ?'); params.push(category_id); }

  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY i.sort_order, i.name';

  res.json(db.prepare(query).all(...params));
});

// Create item
router.post('/', auth, (req, res) => {
  const { category_id, name, price, tax_rate = 0, sort_order = 0 } = req.body;

  if (!category_id) return res.status(400).json({ error: 'Category is required' });
  if (!name || !name.trim()) return res.status(400).json({ error: 'Item name is required' });
  if (price === undefined || price === null || price < 0) return res.status(400).json({ error: 'Valid price is required' });
  if (tax_rate < 0 || tax_rate > 100) return res.status(400).json({ error: 'Tax rate must be 0-100' });

  const cat = db.prepare('SELECT id FROM categories WHERE id = ? AND is_active = 1').get(category_id);
  if (!cat) return res.status(400).json({ error: 'Category not found or inactive' });

  const exists = db.prepare('SELECT id FROM menu_items WHERE category_id = ? AND name = ? AND is_active = 1').get(category_id, name.trim());
  if (exists) return res.status(409).json({ error: 'Item already exists in this category' });

  const result = db.prepare(
    'INSERT INTO menu_items(category_id, name, price, tax_rate, sort_order) VALUES(?,?,?,?,?)'
  ).run(category_id, name.trim(), price, tax_rate, sort_order);

  res.json(db.prepare('SELECT i.*, c.name as category_name FROM menu_items i JOIN categories c ON c.id = i.category_id WHERE i.id = ?').get(result.lastInsertRowid));
});

// Update item — retire + replace if it has history
router.patch('/:id', auth, (req, res) => {
  const item = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  const { name, price, tax_rate, is_available, is_active, sort_order, category_id } = req.body;

  const hasBills = db.prepare('SELECT id FROM order_items WHERE menu_item_id = ? LIMIT 1').get(req.params.id);

  // If name or price changed AND item has billing history — retire and create new
  const nameChanged = name && name.trim() !== item.name;
  const priceChanged = price !== undefined && price !== item.price;

  if ((nameChanged || priceChanged) && hasBills) {
    const tx = db.transaction(() => {
      // Retire old
      db.prepare('UPDATE menu_items SET is_active = 0 WHERE id = ?').run(req.params.id);
      // Create new
      const result = db.prepare(
        'INSERT INTO menu_items(category_id, name, price, tax_rate, is_available, sort_order) VALUES(?,?,?,?,?,?)'
      ).run(
        category_id || item.category_id,
        name ? name.trim() : item.name,
        price ?? item.price,
        tax_rate ?? item.tax_rate,
        is_available ?? item.is_available,
        sort_order ?? item.sort_order
      );
      // Link old to new
      db.prepare('UPDATE menu_items SET replaced_by_id = ? WHERE id = ?').run(result.lastInsertRowid, req.params.id);
      return result.lastInsertRowid;
    });
    const newId = tx();
    return res.json({ retired: true, new_id: newId, item: db.prepare('SELECT * FROM menu_items WHERE id = ?').get(newId) });
  }

  // Safe to update directly
  db.prepare(`
    UPDATE menu_items SET
      name = COALESCE(?, name),
      price = COALESCE(?, price),
      tax_rate = COALESCE(?, tax_rate),
      is_available = COALESCE(?, is_available),
      is_active = COALESCE(?, is_active),
      sort_order = COALESCE(?, sort_order),
      category_id = COALESCE(?, category_id)
    WHERE id = ?
  `).run(
    name ? name.trim() : null,
    price ?? null,
    tax_rate ?? null,
    is_available ?? null,
    is_active ?? null,
    sort_order ?? null,
    category_id ?? null,
    req.params.id
  );

  res.json(db.prepare('SELECT i.*, c.name as category_name FROM menu_items i JOIN categories c ON c.id=i.category_id WHERE i.id=?').get(req.params.id));
});

module.exports = router;
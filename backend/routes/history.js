const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// Get bills with filters
router.get('/', auth, (req, res) => {
  const { from, to, today, staff, payment_mode, order_type, search } = req.query;

  let query = `
    SELECT
      b.id, b.bill_number, b.subtotal, b.calculations_json, b.grand_total,
      b.payment_mode, b.billed_by_name, b.created_at,
      o.order_type, o.table_label, o.customer_name, o.notes,
      (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as item_count
    FROM bills b
    JOIN orders o ON o.id = b.order_id
    WHERE 1=1
  `;
  const params = [];

  if (today === 'true') {
    query += ` AND date(b.created_at) = date('now','localtime')`;
  } else {
    if (from) { query += ` AND date(b.created_at) >= date(?)`; params.push(from); }
    if (to)   { query += ` AND date(b.created_at) <= date(?)`; params.push(to); }
  }
  if (staff)        { query += ` AND b.billed_by_name = ?`; params.push(staff); }
  if (payment_mode) { query += ` AND b.payment_mode = ?`; params.push(payment_mode); }
  if (order_type)   { query += ` AND o.order_type = ?`; params.push(order_type); }
  if (search)       { query += ` AND (b.bill_number LIKE ? OR o.customer_name LIKE ? OR o.table_label LIKE ?)`; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }

  query += ` ORDER BY b.created_at DESC`;

  const bills = db.prepare(query).all(...params);

  // Summary
  const totalSales = bills.reduce((s, b) => s + b.grand_total, 0);
  const totalSubtotal = bills.reduce((s, b) => s + b.subtotal, 0);

  res.json({
    bills,
    summary: {
      count: bills.length,
      total_sales: parseFloat(totalSales.toFixed(2)),
      total_subtotal: parseFloat(totalSubtotal.toFixed(2)),
      total_tax: parseFloat((totalSales - totalSubtotal).toFixed(2)),
      avg_bill: bills.length ? parseFloat((totalSales / bills.length).toFixed(2)) : 0
    }
  });
});

// Get single bill detail with items
router.get('/:id', auth, (req, res) => {
  const bill = db.prepare(`
    SELECT b.*, o.order_type, o.table_label, o.customer_name, o.notes, o.created_at as order_time
    FROM bills b JOIN orders o ON o.id = b.order_id
    WHERE b.id = ?
  `).get(req.params.id);
  if (!bill) return res.status(404).json({ error: 'Bill not found' });

  const items = db.prepare('SELECT * FROM order_items WHERE order_id = (SELECT order_id FROM bills WHERE id = ?)').all(req.params.id);
  res.json({ ...bill, items, calculations: JSON.parse(bill.calculations_json || '[]') });
});

// Get filter options (staff list, etc.)
router.get('/meta/options', auth, (req, res) => {
  const staff = db.prepare('SELECT DISTINCT billed_by_name as name FROM bills ORDER BY billed_by_name').all();
  res.json({ staff: staff.map(s => s.name) });
});

module.exports = router;
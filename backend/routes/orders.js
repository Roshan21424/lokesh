const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getNextBillNumber() {
  const row = db.prepare('SELECT seq FROM bill_sequence WHERE id = 1').get();
  const next = row.seq + 1;
  db.prepare('UPDATE bill_sequence SET seq = ? WHERE id = 1').run(next);
  return next;
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// GET /api/orders — list open orders with item count + running total
router.get('/', auth, (req, res) => {
  const orders = db.prepare(`
    SELECT
      o.*,
      u.username            AS staff_name,
      COUNT(oi.id)          AS item_count,
      COALESCE(SUM(oi.line_total), 0) AS total_amount
    FROM orders o
    JOIN users u ON u.id = o.user_id
    LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE o.status = 'open'
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `).all();
  res.json(orders);
});

// POST /api/orders — create a new open order
router.post('/', auth, (req, res) => {
  const { order_type = 'dine-in', table_label, customer_name, notes } = req.body;

  const billNo = getNextBillNumber();
  const result = db.prepare(
    'INSERT INTO orders(bill_number, user_id, order_type, table_label, customer_name, notes) VALUES(?,?,?,?,?,?)'
  ).run(billNo, req.user.id, order_type, table_label || null, customer_name || null, notes || null);

  res.json({ id: result.lastInsertRowid, bill_number: billNo });
});

// GET /api/orders/:id — full order with items
router.get('/:id', auth, (req, res) => {
  const order = db.prepare(`
    SELECT o.*, u.username AS staff_name
    FROM orders o
    JOIN users u ON u.id = o.user_id
    WHERE o.id = ?
  `).get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(req.params.id);
  res.json({ ...order, items });
});

// PATCH /api/orders/:id — update open order meta (table, notes, etc.)
router.patch('/:id', auth, (req, res) => {
  const order = db.prepare("SELECT * FROM orders WHERE id = ? AND status = 'open'").get(req.params.id);
  if (!order) return res.status(400).json({ error: 'Order not found or not open' });

  const { order_type, table_label, customer_name, notes } = req.body;
  db.prepare(`UPDATE orders SET
    order_type    = COALESCE(?, order_type),
    table_label   = COALESCE(?, table_label),
    customer_name = COALESCE(?, customer_name),
    notes         = COALESCE(?, notes)
  WHERE id = ?`).run(
    order_type    || null,
    table_label   !== undefined ? (table_label   || null) : null,
    customer_name !== undefined ? (customer_name || null) : null,
    notes         !== undefined ? (notes         || null) : null,
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id));
});

// PATCH /api/orders/:id/cancel
router.patch('/:id/cancel', auth, (req, res) => {
  const order = db.prepare("SELECT * FROM orders WHERE id = ? AND status = 'open'").get(req.params.id);
  if (!order) return res.status(400).json({ error: 'Order not found or not open' });

  db.prepare("UPDATE orders SET status = 'cancelled' WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// POST /api/orders/:id/items — add or update item qty
router.post('/:id/items', auth, (req, res) => {
  const { menu_item_id, qty } = req.body;
  if (!menu_item_id) return res.status(400).json({ error: 'menu_item_id required' });
  if (!qty || qty < 1) return res.status(400).json({ error: 'Quantity must be at least 1' });

  const order = db.prepare("SELECT * FROM orders WHERE id = ? AND status = 'open'").get(req.params.id);
  if (!order) return res.status(400).json({ error: 'Order not found or already billed' });

  const item = db.prepare(`
    SELECT i.*, c.name AS category_name
    FROM menu_items i
    JOIN categories c ON c.id = i.category_id
    WHERE i.id = ? AND i.is_active = 1
  `).get(menu_item_id);
  if (!item) return res.status(404).json({ error: 'Menu item not found' });

  const tax_amt   = item.price * (item.tax_rate / 100);
  const line_total = parseFloat(((item.price + tax_amt) * qty).toFixed(2));

  const existing = db.prepare('SELECT id FROM order_items WHERE order_id = ? AND menu_item_id = ?').get(req.params.id, menu_item_id);
  if (existing) {
    db.prepare('UPDATE order_items SET qty = ?, line_total = ? WHERE id = ?').run(qty, line_total, existing.id);
  } else {
    db.prepare(`
      INSERT INTO order_items(order_id, menu_item_id, item_name_snapshot, category_name_snapshot,
                              qty, unit_price_snapshot, tax_rate_snapshot, line_total)
      VALUES(?,?,?,?,?,?,?,?)
    `).run(req.params.id, menu_item_id, item.name, item.category_name, qty, item.price, item.tax_rate, line_total);
  }

  res.json({ success: true });
});

// DELETE /api/orders/:id/items/:menuItemId
router.delete('/:id/items/:menuItemId', auth, (req, res) => {
  const order = db.prepare("SELECT * FROM orders WHERE id = ? AND status = 'open'").get(req.params.id);
  if (!order) return res.status(400).json({ error: 'Order not found or already billed' });

  db.prepare('DELETE FROM order_items WHERE order_id = ? AND menu_item_id = ?')
    .run(req.params.id, req.params.menuItemId);
  res.json({ success: true });
});

// POST /api/orders/:id/bill — finalize & create bill record
router.post('/:id/bill', auth, (req, res) => {
  const { payment_mode, calculations = [] } = req.body;
  if (!payment_mode) return res.status(400).json({ error: 'Payment mode required' });
  if (!['cash', 'upi', 'card', 'other'].includes(payment_mode)) {
    return res.status(400).json({ error: 'Invalid payment mode' });
  }

  const order = db.prepare("SELECT * FROM orders WHERE id = ? AND status = 'open'").get(req.params.id);
  if (!order) return res.status(400).json({ error: 'Order not found or already billed' });

  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(req.params.id);
  if (!items.length) return res.status(400).json({ error: 'Cannot bill an empty order' });

  const subtotal = parseFloat(items.reduce((s, i) => s + i.line_total, 0).toFixed(2));

  let running = subtotal;
  const calcsWithAmounts = calculations.map(calc => {
    let amount = calc.type === 'percentage'
      ? subtotal * (calc.value / 100)
      : Number(calc.value);
    if (calc.is_deduction) amount = -Math.abs(amount);
    running += amount;
    return { ...calc, amount: parseFloat(amount.toFixed(2)) };
  });

  const grand_total = parseFloat(Math.max(0, running).toFixed(2));

  const tx = db.transaction(() => {
    const staff = db.prepare('SELECT username FROM users WHERE id = ?').get(req.user.id);
    const billResult = db.prepare(`
      INSERT INTO bills(order_id, bill_number, subtotal, calculations_json, grand_total, payment_mode, billed_by_name)
      VALUES(?,?,?,?,?,?,?)
    `).run(req.params.id, order.bill_number, subtotal, JSON.stringify(calcsWithAmounts),
           grand_total, payment_mode, staff.username);

    db.prepare("UPDATE orders SET status = 'billed', billed_at = datetime('now','localtime') WHERE id = ?")
      .run(req.params.id);

    return billResult.lastInsertRowid;
  });

  const billId = tx();
  res.json({
    success: true,
    bill_id: billId,
    bill_number: order.bill_number,
    subtotal,
    calculations: calcsWithAmounts,
    grand_total,
    payment_mode
  });
});

module.exports = router;
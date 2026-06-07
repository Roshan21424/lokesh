import { useState, useEffect, useCallback } from 'react';
import api from './api';
import toast from 'react-hot-toast';

// ─── Receipt print helper ─────────────────────────────────────────────────────
function printReceipt(bill, settings) {
  const calcs = Array.isArray(bill.calculations)
    ? bill.calculations
    : JSON.parse(bill.calculations_json || '[]');

  const itemRows = (bill.items || []).map(it => `
    <tr>
      <td style="padding:2px 0">${it.item_name_snapshot}</td>
      <td style="text-align:center;padding:2px 4px">${it.qty}</td>
      <td style="text-align:right;padding:2px 0">&#8377;${Number(it.unit_price_snapshot).toFixed(2)}</td>
      <td style="text-align:right;padding:2px 0">&#8377;${Number(it.line_total).toFixed(2)}</td>
    </tr>`).join('');

  const calcRows = calcs.map(c => `
    <tr>
      <td colspan="3" style="padding:2px 0">${c.name}${c.type === 'percentage' ? ` (${c.value}%)` : ''}</td>
      <td style="text-align:right;padding:2px 0">${c.amount < 0 ? '' : '+'}&#8377;${Number(c.amount).toFixed(2)}</td>
    </tr>`).join('');

  const w = window.open('', '_blank', 'width=400,height=600');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Bill #${bill.bill_number}</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:monospace;font-size:12px;padding:16px;max-width:320px;margin:0 auto}
      h1{font-size:15px;text-align:center;margin-bottom:2px}
      .sub{text-align:center;font-size:11px;color:#555;margin-bottom:2px}
      .divider{border-top:1px dashed #999;margin:8px 0}
      table{width:100%;border-collapse:collapse}
      .total td{font-weight:bold;font-size:13px;border-top:1px dashed #999;padding-top:4px}
      .footer{text-align:center;margin-top:12px;font-size:11px;color:#666}
      @media print{body{padding:4px}}
    </style></head><body>
    <h1>${settings.restaurant_name || 'Restaurant'}</h1>
    ${settings.address ? `<p class="sub">${settings.address}</p>` : ''}
    ${settings.phone   ? `<p class="sub">Ph: ${settings.phone}</p>`   : ''}
    ${settings.gstin   ? `<p class="sub">GSTIN: ${settings.gstin}</p>` : ''}
    <div class="divider"></div>
    <p>Bill #: <strong>${bill.bill_number}</strong></p>
    <p>Date: ${new Date(bill.created_at).toLocaleString()}</p>
    <p>Type: ${bill.order_type}${bill.table_label ? ' • ' + bill.table_label : ''}</p>
    ${bill.customer_name ? `<p>Customer: ${bill.customer_name}</p>` : ''}
    <p>Payment: ${(bill.payment_mode || '').toUpperCase()}</p>
    <div class="divider"></div>
    <table>
      <thead><tr>
        <th style="text-align:left">Item</th>
        <th style="text-align:center">Qty</th>
        <th style="text-align:right">Rate</th>
        <th style="text-align:right">Amt</th>
      </tr></thead>
      <tbody>${itemRows}</tbody>
    </table>
    <div class="divider"></div>
    <table>
      <tr><td colspan="3">Subtotal</td><td style="text-align:right">&#8377;${Number(bill.subtotal).toFixed(2)}</td></tr>
      ${calcRows}
      <tr class="total"><td colspan="3">TOTAL</td><td style="text-align:right">&#8377;${Number(bill.grand_total).toFixed(2)}</td></tr>
    </table>
    <p class="footer">${settings.receipt_footer || 'Thank you!'}</p>
    </body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 400);
}

// ─── New Order Modal ──────────────────────────────────────────────────────────
function NewOrderModal({ onConfirm, onCancel }) {
  const [form, setForm] = useState({ order_type: 'dine-in', table_label: '', customer_name: '' });

  const submit = () => {
    if (form.order_type === 'dine-in' && !form.table_label.trim())
      return toast.error('Enter a table label (e.g. T1)');
    onConfirm(form);
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-surface-1 border border-surface-3 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
        <h2 className="text-lg font-semibold text-gray-100">New Order</h2>

        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Order Type</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { v: 'dine-in',  icon: '🍽️', label: 'Dine-In' },
              { v: 'takeaway', icon: '🥡', label: 'Takeaway' },
              { v: 'delivery', icon: '🛵', label: 'Delivery' },
            ].map(({ v, icon, label }) => (
              <button key={v} onClick={() => setForm(f => ({ ...f, order_type: v }))}
                className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                  form.order_type === v
                    ? 'bg-brand-500 text-white shadow-lg'
                    : 'bg-surface-3 text-gray-400 hover:bg-surface-4'
                }`}>
                <div className="text-base">{icon}</div>
                <div className="text-xs mt-0.5">{label}</div>
              </button>
            ))}
          </div>
        </div>

        {form.order_type === 'dine-in' ? (
          <div>
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">Table</label>
            <input className="input" placeholder="e.g. T1, Table 5, Counter"
              value={form.table_label} onChange={e => setForm(f => ({ ...f, table_label: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && submit()} autoFocus />
          </div>
        ) : (
          <div>
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">
              Customer Name <span className="text-gray-600 normal-case">(optional)</span>
            </label>
            <input className="input" placeholder="Customer name"
              value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && submit()} autoFocus />
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button onClick={onCancel} className="btn-ghost flex-1">Cancel</button>
          <button onClick={submit} className="btn-primary flex-1">Start Order →</button>
        </div>
      </div>
    </div>
  );
}

// ─── Bill Modal ───────────────────────────────────────────────────────────────
function BillModal({ order, billCalcs, onConfirm, onCancel }) {
  const [selected, setSelected] = useState(() => billCalcs.map(c => c.id));
  const [payment, setPayment]   = useState('cash');
  const [loading, setLoading]   = useState(false);

  const subtotal = (order.items || []).reduce((s, i) => s + i.line_total, 0);
  let running = subtotal;
  const preview = billCalcs
    .filter(c => selected.includes(c.id))
    .map(c => {
      const base = c.type === 'percentage' ? subtotal * (c.value / 100) : Number(c.value);
      const amt  = c.is_deduction ? -Math.abs(base) : base;
      running += amt;
      return { ...c, amt };
    });
  const grand = Math.max(0, running);

  const toggle = id => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const confirm = async () => {
    setLoading(true);
    try {
      await onConfirm(
        payment,
        billCalcs.filter(c => selected.includes(c.id)).map(c => ({
          name: c.name, type: c.type, value: c.value, is_deduction: c.is_deduction
        }))
      );
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-surface-1 border border-surface-3 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-gray-100">Generate Bill #{order.bill_number}</h2>

        {/* Items summary */}
        <div className="bg-surface-2 rounded-xl p-3 space-y-1.5 max-h-44 overflow-y-auto">
          {(order.items || []).map(it => (
            <div key={it.id} className="flex justify-between text-sm">
              <span className="text-gray-300 truncate flex-1 mr-2">{it.item_name_snapshot} × {it.qty}</span>
              <span className="text-gray-200 flex-shrink-0">₹{it.line_total.toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Charges / Discounts */}
        {billCalcs.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Charges & Discounts</p>
            <div className="space-y-1">
              {billCalcs.map(c => {
                const previewAmt = c.type === 'percentage'
                  ? subtotal * (c.value / 100)
                  : Number(c.value);
                const checked = selected.includes(c.id);
                return (
                  <label key={c.id}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-2 cursor-pointer transition-colors">
                    <input type="checkbox" checked={checked} onChange={() => toggle(c.id)}
                      className="w-4 h-4 accent-brand-500 rounded flex-shrink-0" />
                    <span className="flex-1 text-sm text-gray-300">
                      {c.name}
                      <span className="text-gray-500 ml-1 text-xs">
                        {c.type === 'percentage' ? `${c.value}%` : `₹${c.value}`}
                      </span>
                    </span>
                    <span className={`text-sm font-medium flex-shrink-0 ${c.is_deduction ? 'text-green-400' : 'text-gray-300'}`}>
                      {c.is_deduction ? '−' : '+'}₹{previewAmt.toFixed(2)}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Totals */}
        <div className="bg-surface-2 rounded-xl p-3 space-y-1.5">
          <div className="flex justify-between text-sm text-gray-400">
            <span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span>
          </div>
          {preview.map(c => (
            <div key={c.id} className="flex justify-between text-sm">
              <span className="text-gray-400">{c.name}</span>
              <span className={c.is_deduction ? 'text-green-400' : 'text-gray-300'}>
                {c.amt < 0 ? '−' : '+'}₹{Math.abs(c.amt).toFixed(2)}
              </span>
            </div>
          ))}
          <div className="flex justify-between text-base font-bold text-gray-100 pt-1.5 border-t border-surface-3 mt-1">
            <span>Total</span>
            <span className="text-brand-400">₹{grand.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment mode */}
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Payment Mode</p>
          <div className="grid grid-cols-4 gap-2">
            {[
              { v: 'cash', icon: '💵', label: 'Cash'  },
              { v: 'upi',  icon: '📱', label: 'UPI'   },
              { v: 'card', icon: '💳', label: 'Card'  },
              { v: 'other',icon: '🔄', label: 'Other' },
            ].map(({ v, icon, label }) => (
              <button key={v} onClick={() => setPayment(v)}
                className={`py-2.5 rounded-xl text-xs font-medium transition-all ${
                  payment === v
                    ? 'bg-brand-500 text-white shadow-lg'
                    : 'bg-surface-3 text-gray-400 hover:bg-surface-4'
                }`}>
                <div className="text-base">{icon}</div>
                <div className="mt-0.5">{label}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onCancel} disabled={loading} className="btn-ghost flex-1">Cancel</button>
          <button onClick={confirm}  disabled={loading} className="btn-primary flex-1 py-3 text-base">
            {loading ? 'Processing…' : `Confirm ₹${grand.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Success Modal ────────────────────────────────────────────────────────────
function SuccessModal({ bill, settings, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-surface-1 border border-surface-3 rounded-2xl shadow-2xl w-full max-w-xs p-6 text-center space-y-4">
        <div className="text-5xl">✅</div>
        <div>
          <h2 className="text-lg font-semibold text-gray-100">Bill Generated!</h2>
          <p className="text-gray-400 text-sm mt-1">
            #{bill.bill_number} &nbsp;•&nbsp; ₹{Number(bill.grand_total).toFixed(2)} &nbsp;•&nbsp;
            <span className="capitalize">{bill.payment_mode}</span>
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => printReceipt(bill, settings)} className="btn-primary flex-1">
            🖨️ Print
          </button>
          <button onClick={onClose} className="btn-ghost flex-1">Done</button>
        </div>
      </div>
    </div>
  );
}

// ─── POS Page ─────────────────────────────────────────────────────────────────
export default function POS() {
  const [categories,  setCategories]  = useState([]);
  const [items,       setItems]       = useState([]);
  const [openOrders,  setOpenOrders]  = useState([]);
  const [activeOrder, setActiveOrder] = useState(null);
  const [billCalcs,   setBillCalcs]   = useState([]);
  const [settings,    setSettings]    = useState({});

  const [selCat,      setSelCat]      = useState(null);
  const [search,      setSearch]      = useState('');

  const [showNew,     setShowNew]     = useState(false);
  const [showBill,    setShowBill]    = useState(false);
  const [doneBill,    setDoneBill]    = useState(null);
  const [busy,        setBusy]        = useState(false);

  // ── initial load
  const loadAll = useCallback(async () => {
    try {
      const [c, it, o, bc, s] = await Promise.all([
        api.get('/categories'),
        api.get('/items'),
        api.get('/orders'),
        api.get('/billcalcs'),
        api.get('/settings'),
      ]);
      setCategories(c.data);
      setItems(it.data);
      setOpenOrders(o.data);
      setBillCalcs(bc.data);
      setSettings(s.data);
    } catch { toast.error('Failed to load data'); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── load / refresh a single order
  const loadOrder = useCallback(async (id) => {
    const res = await api.get(`/orders/${id}`);
    setActiveOrder(res.data);
  }, []);

  // ── create new order
  const createOrder = async (form) => {
    try {
      const res = await api.post('/orders', form);
      await loadOrder(res.data.id);
      // Refresh open orders list
      const o = await api.get('/orders');
      setOpenOrders(o.data);
      setShowNew(false);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to create order'); }
  };

  // ── add / increment item
  const addItem = async (item) => {
    if (!activeOrder) return toast.error('Select or start an order first');
    const existing = (activeOrder.items || []).find(i => i.menu_item_id === item.id);
    const newQty = (existing?.qty || 0) + 1;
    setBusy(true);
    try {
      await api.post(`/orders/${activeOrder.id}/items`, { menu_item_id: item.id, qty: newQty });
      await loadOrder(activeOrder.id);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setBusy(false); }
  };

  // ── update qty (0 = remove)
  const setQty = async (menuItemId, qty) => {
    if (qty < 1) {
      await api.delete(`/orders/${activeOrder.id}/items/${menuItemId}`);
    } else {
      await api.post(`/orders/${activeOrder.id}/items`, { menu_item_id: menuItemId, qty });
    }
    await loadOrder(activeOrder.id);
  };

  // ── generate bill
  const generateBill = async (paymentMode, calculations) => {
    const res = await api.post(`/orders/${activeOrder.id}/bill`, {
      payment_mode: paymentMode,
      calculations,
    });
    const full = await api.get(`/history/${res.data.bill_id}`);
    setDoneBill({ ...full.data, payment_mode: paymentMode });
    setShowBill(false);
    setActiveOrder(null);
    const o = await api.get('/orders');
    setOpenOrders(o.data);
    toast.success(`Bill #${res.data.bill_number} generated!`);
  };

  // ── cancel order
  const cancelOrder = async () => {
    if (!window.confirm('Cancel this order?')) return;
    await api.patch(`/orders/${activeOrder.id}/cancel`);
    setActiveOrder(null);
    const o = await api.get('/orders');
    setOpenOrders(o.data);
    toast.success('Order cancelled');
  };

  const filteredItems = items.filter(it => {
    const catOk  = !selCat || it.category_id === selCat;
    const findOk = !search || it.name.toLowerCase().includes(search.toLowerCase());
    return catOk && findOk && it.is_available && it.is_active;
  });

  const subtotal = (activeOrder?.items || []).reduce((s, i) => s + i.line_total, 0);

  const typeIcon = { 'dine-in': '🍽️', takeaway: '🥡', delivery: '🛵' };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Modals */}
      {showNew && (
        <NewOrderModal onConfirm={createOrder} onCancel={() => setShowNew(false)} />
      )}
      {showBill && activeOrder && (
        <BillModal
          order={activeOrder}
          billCalcs={billCalcs}
          onConfirm={generateBill}
          onCancel={() => setShowBill(false)}
        />
      )}
      {doneBill && (
        <SuccessModal
          bill={doneBill}
          settings={settings}
          onClose={() => setDoneBill(null)}
        />
      )}

      {/* ── LEFT: Menu ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden border-r border-surface-3">
        {/* search bar */}
        <div className="px-3 py-2 border-b border-surface-3 flex-shrink-0">
          <input
            className="input text-sm py-1.5"
            placeholder="🔍  Search menu items…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* category tabs */}
        <div className="flex gap-1.5 px-3 py-2 overflow-x-auto border-b border-surface-3 flex-shrink-0
                        scrollbar-thin scrollbar-thumb-surface-4 scrollbar-track-transparent">
          <button
            onClick={() => setSelCat(null)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              !selCat ? 'bg-brand-500 text-white' : 'bg-surface-3 text-gray-400 hover:text-gray-200 hover:bg-surface-4'
            }`}
          >All</button>
          {categories.map(c => (
            <button
              key={c.id}
              onClick={() => setSelCat(c.id === selCat ? null : c.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                selCat === c.id ? 'bg-brand-500 text-white' : 'bg-surface-3 text-gray-400 hover:text-gray-200 hover:bg-surface-4'
              }`}
            >{c.name}</button>
          ))}
        </div>

        {/* items grid */}
        <div className="flex-1 overflow-y-auto p-3">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-600 select-none">
              <div className="text-4xl mb-3">🍴</div>
              <p className="text-sm">{items.length === 0 ? 'No menu items yet' : 'No matching items'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2">
              {filteredItems.map(item => {
                const orderItem = (activeOrder?.items || []).find(i => i.menu_item_id === item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => addItem(item)}
                    disabled={busy}
                    className={`relative bg-surface-2 hover:bg-surface-3 rounded-xl p-3 text-left transition-all duration-100
                      border active:scale-95
                      ${orderItem
                        ? 'border-brand-500/50 shadow-[0_0_0_1px_rgba(99,102,241,0.3)]'
                        : 'border-transparent hover:border-surface-4'}`
                    }
                  >
                    {orderItem && (
                      <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-brand-500 rounded-full
                                      flex items-center justify-center text-[10px] font-bold text-white shadow">
                        {orderItem.qty}
                      </div>
                    )}
                    <div className="text-xl mb-1.5">🍴</div>
                    <div className="text-xs font-semibold text-gray-200 leading-tight line-clamp-2">{item.name}</div>
                    <div className="text-sm font-bold text-brand-400 mt-1.5">₹{item.price}</div>
                    {item.tax_rate > 0 && (
                      <div className="text-[10px] text-gray-600">+{item.tax_rate}% tax</div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Order panel ─────────────────────────────────────────────── */}
      <div className="w-72 xl:w-80 flex flex-col flex-shrink-0 overflow-hidden">

        {/* header */}
        <div className="h-14 flex items-center gap-2 px-4 border-b border-surface-3 flex-shrink-0">
          <span className="font-semibold text-gray-100 flex-1 truncate">
            {activeOrder ? `Bill #${activeOrder.bill_number}` : 'Open Orders'}
          </span>
          <button onClick={() => setShowNew(true)} className="btn-primary text-sm py-1 px-3 flex-shrink-0">
            + New
          </button>
        </div>

        {/* ── no active order: show open list */}
        {!activeOrder ? (
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {openOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-600 select-none">
                <div className="text-4xl mb-3">🧾</div>
                <p className="text-sm">No open orders</p>
                <button onClick={() => setShowNew(true)} className="btn-primary text-sm mt-4 px-5">
                  Start First Order
                </button>
              </div>
            ) : (
              openOrders.map(order => (
                <button
                  key={order.id}
                  onClick={() => loadOrder(order.id)}
                  className="w-full bg-surface-2 hover:bg-surface-3 rounded-xl p-3 text-left transition-all
                             border border-transparent hover:border-surface-4 group"
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-semibold text-gray-200">#{order.bill_number}</span>
                    <span className="text-xs text-gray-500">
                      {typeIcon[order.order_type]} {order.order_type}
                    </span>
                  </div>
                  <div className="text-sm text-gray-400 truncate">
                    {order.table_label || order.customer_name || '—'}
                  </div>
                  <div className="flex justify-between mt-1 text-xs text-gray-600">
                    <span>{order.item_count || 0} items</span>
                    {order.total_amount > 0 && <span>₹{Number(order.total_amount).toFixed(2)}</span>}
                  </div>
                </button>
              ))
            )}
          </div>

        ) : (
          /* ── active order */
          <>
            {/* order meta */}
            <div className="flex items-center gap-2 px-4 py-2 bg-surface-2 border-b border-surface-3 flex-shrink-0 text-sm">
              <span className="text-gray-400">{typeIcon[activeOrder.order_type]}</span>
              <span className="text-brand-400 font-medium">
                {activeOrder.table_label || activeOrder.customer_name || activeOrder.order_type}
              </span>
              <button onClick={() => setActiveOrder(null)} className="ml-auto text-gray-600 hover:text-gray-400">
                ← Back
              </button>
            </div>

            {/* items */}
            <div className="flex-1 overflow-y-auto divide-y divide-surface-3">
              {(activeOrder.items || []).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-600 select-none">
                  <div className="text-3xl mb-2">🛒</div>
                  <p className="text-sm">Tap items from the menu</p>
                </div>
              ) : (
                (activeOrder.items || []).map(it => (
                  <div key={it.id} className="flex items-center gap-2 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-200 truncate">{it.item_name_snapshot}</p>
                      <p className="text-xs text-gray-500">₹{it.unit_price_snapshot.toFixed(2)} each</p>
                    </div>
                    {/* qty controls */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => setQty(it.menu_item_id, it.qty - 1)}
                        className="w-6 h-6 rounded-md bg-surface-3 hover:bg-surface-4 text-gray-300 text-sm font-bold
                                   flex items-center justify-center leading-none">−</button>
                      <span className="w-5 text-center text-sm font-medium text-gray-200">{it.qty}</span>
                      <button onClick={() => setQty(it.menu_item_id, it.qty + 1)}
                        className="w-6 h-6 rounded-md bg-surface-3 hover:bg-surface-4 text-gray-300 text-sm font-bold
                                   flex items-center justify-center leading-none">+</button>
                    </div>
                    <div className="text-sm font-semibold text-gray-200 w-14 text-right flex-shrink-0">
                      ₹{it.line_total.toFixed(2)}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* footer */}
            <div className="border-t border-surface-3 p-4 space-y-3 flex-shrink-0">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Subtotal</span>
                <span className="font-semibold text-gray-200">₹{subtotal.toFixed(2)}</span>
              </div>
              <button
                onClick={() => setShowBill(true)}
                disabled={!(activeOrder.items || []).length}
                className="btn-primary w-full py-3 text-base"
              >
                Generate Bill →
              </button>
              <button onClick={cancelOrder}
                className="w-full text-xs text-gray-600 hover:text-red-400 transition-colors py-1">
                Cancel Order
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
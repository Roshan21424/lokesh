import { useState, useEffect, useCallback } from 'react';
import api from './api';
import toast from 'react-hot-toast';

function printReceipt(bill, settings = {}) {
  const calcs = Array.isArray(bill.calculations) ? bill.calculations
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
    <p>Bill #: <strong>${bill.bill_number}</strong></p>
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

// ─── Bill Detail Panel ────────────────────────────────────────────────────────
function BillDetail({ billId, settings, onClose }) {
  const [bill, setBill] = useState(null);

  useEffect(() => {
    api.get(`/history/${billId}`).then(r => setBill(r.data)).catch(() => toast.error('Failed to load bill'));
  }, [billId]);

  if (!bill) return (
    <div className="flex items-center justify-center h-full">
      <div className="text-gray-600 text-sm">Loading…</div>
    </div>
  );

  const calcs = bill.calculations || JSON.parse(bill.calculations_json || '[]');
  const typeIcon = { 'dine-in': '🍽️', takeaway: '🥡', delivery: '🛵' };
  const pmIcon   = { cash: '💵', upi: '📱', card: '💳', other: '🔄' };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-3 flex-shrink-0">
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors text-lg">←</button>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-100">Bill #{bill.bill_number}</h3>
          <p className="text-xs text-gray-500">{new Date(bill.created_at).toLocaleString()}</p>
        </div>
        <button onClick={() => printReceipt(bill, settings)}
          className="btn-ghost text-xs py-1.5 px-3">🖨️ Print</button>
      </div>

      {/* content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* meta */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-surface-2 rounded-lg p-3">
            <p className="text-gray-500 mb-0.5">Type</p>
            <p className="text-gray-200 font-medium">
              {typeIcon[bill.order_type]} {bill.order_type}
              {bill.table_label ? ` • ${bill.table_label}` : ''}
            </p>
          </div>
          <div className="bg-surface-2 rounded-lg p-3">
            <p className="text-gray-500 mb-0.5">Payment</p>
            <p className="text-gray-200 font-medium capitalize">
              {pmIcon[bill.payment_mode]} {bill.payment_mode}
            </p>
          </div>
          {bill.customer_name && (
            <div className="bg-surface-2 rounded-lg p-3 col-span-2">
              <p className="text-gray-500 mb-0.5">Customer</p>
              <p className="text-gray-200 font-medium">{bill.customer_name}</p>
            </div>
          )}
          <div className="bg-surface-2 rounded-lg p-3">
            <p className="text-gray-500 mb-0.5">Billed by</p>
            <p className="text-gray-200 font-medium">{bill.billed_by_name}</p>
          </div>
        </div>

        {/* items */}
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Items</p>
          <div className="bg-surface-2 rounded-xl divide-y divide-surface-3">
            {(bill.items || []).map((it, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-200 truncate">{it.item_name_snapshot}</p>
                  <p className="text-xs text-gray-500">
                    ₹{Number(it.unit_price_snapshot).toFixed(2)}
                    {it.tax_rate_snapshot > 0 && ` +${it.tax_rate_snapshot}% tax`}
                  </p>
                </div>
                <span className="text-gray-500 text-xs">×{it.qty}</span>
                <span className="font-medium text-gray-200 w-16 text-right">₹{Number(it.line_total).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* totals */}
        <div className="bg-surface-2 rounded-xl p-3 space-y-1.5">
          <div className="flex justify-between text-sm text-gray-400">
            <span>Subtotal</span><span>₹{Number(bill.subtotal).toFixed(2)}</span>
          </div>
          {calcs.map((c, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-gray-400">{c.name}{c.type === 'percentage' ? ` (${c.value}%)` : ''}</span>
              <span className={c.amount < 0 ? 'text-green-400' : 'text-gray-300'}>
                {c.amount < 0 ? '−' : '+'}₹{Math.abs(Number(c.amount)).toFixed(2)}
              </span>
            </div>
          ))}
          <div className="flex justify-between font-bold text-base text-gray-100 pt-1.5 border-t border-surface-3 mt-1">
            <span>Total</span>
            <span className="text-brand-400">₹{Number(bill.grand_total).toFixed(2)}</span>
          </div>
        </div>

        {bill.notes && (
          <div className="bg-surface-2 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-1">Notes</p>
            <p className="text-sm text-gray-300">{bill.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── History Page ─────────────────────────────────────────────────────────────
export default function History() {
  const [bills,      setBills]      = useState([]);
  const [summary,    setSummary]    = useState(null);
  const [staffList,  setStaffList]  = useState([]);
  const [settings,   setSettings]   = useState({});
  const [selBill,    setSelBill]    = useState(null);
  const [loading,    setLoading]    = useState(false);

  const [filters, setFilters] = useState({
    today: 'true',
    from: '',
    to: '',
    staff: '',
    payment_mode: '',
    order_type: '',
    search: '',
  });

  const loadMeta = useCallback(async () => {
    const [meta, s] = await Promise.all([
      api.get('/history/meta/options'),
      api.get('/settings'),
    ]);
    setStaffList(meta.data.staff);
    setSettings(s.data);
  }, []);

  useEffect(() => { loadMeta(); }, [loadMeta]);

  const loadBills = useCallback(async () => {
    setLoading(true);
    try {
      const params = { ...filters };
      if (filters.today !== 'true') { delete params.today; }
      const res = await api.get('/history', { params });
      setBills(res.data.bills);
      setSummary(res.data.summary);
    } catch { toast.error('Failed to load history'); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { loadBills(); }, [loadBills]);

  const setFilter = (key, val) => setFilters(f => ({ ...f, [key]: val }));

  const typeIcon = { 'dine-in': '🍽️', takeaway: '🥡', delivery: '🛵' };
  const pmIcon   = { cash: '💵', upi: '📱', card: '💳', other: '🔄' };

  const pmColors = {
    cash:  'bg-green-500/10 text-green-400',
    upi:   'bg-blue-500/10 text-blue-400',
    card:  'bg-purple-500/10 text-purple-400',
    other: 'bg-gray-500/10 text-gray-400',
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── LEFT: Filters + list ─────────────────────────────────────────────── */}
      <div className={`${selBill ? 'hidden md:flex' : 'flex'} flex-col flex-1 overflow-hidden`}>
        {/* Summary cards */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 border-b border-surface-3 flex-shrink-0">
            {[
              { label: 'Bills', value: summary.count, fmt: v => v },
              { label: 'Revenue', value: summary.total_sales, fmt: v => `₹${v.toFixed(2)}` },
              { label: 'Avg Bill', value: summary.avg_bill, fmt: v => `₹${v.toFixed(2)}` },
              { label: 'Tax Collected', value: summary.total_tax, fmt: v => `₹${v.toFixed(2)}` },
            ].map(({ label, value, fmt }) => (
              <div key={label} className="bg-surface-1 border border-surface-3 rounded-xl px-4 py-3">
                <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
                <p className="text-xl font-bold text-gray-100 mt-0.5">{fmt(value)}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="px-4 py-3 border-b border-surface-3 space-y-2 flex-shrink-0">
          <div className="flex gap-2 flex-wrap">
            {/* Today toggle */}
            <button
              onClick={() => setFilter('today', filters.today === 'true' ? '' : 'true')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filters.today === 'true' ? 'bg-brand-500 text-white' : 'bg-surface-3 text-gray-400 hover:text-gray-200'
              }`}>
              Today
            </button>

            {/* Date range */}
            <input type="date" className="input text-sm py-1.5 w-36"
              value={filters.from}
              onChange={e => { setFilter('from', e.target.value); setFilter('today', ''); }} />
            <input type="date" className="input text-sm py-1.5 w-36"
              value={filters.to}
              onChange={e => { setFilter('to', e.target.value); setFilter('today', ''); }} />

            {/* Staff */}
            <select className="input text-sm py-1.5 w-32"
              value={filters.staff} onChange={e => setFilter('staff', e.target.value)}>
              <option value="">All Staff</option>
              {staffList.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            {/* Payment mode */}
            <select className="input text-sm py-1.5 w-32"
              value={filters.payment_mode} onChange={e => setFilter('payment_mode', e.target.value)}>
              <option value="">All Payments</option>
              {['cash','upi','card','other'].map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
            </select>

            {/* Order type */}
            <select className="input text-sm py-1.5 w-32"
              value={filters.order_type} onChange={e => setFilter('order_type', e.target.value)}>
              <option value="">All Types</option>
              {['dine-in','takeaway','delivery'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Search */}
          <input className="input text-sm py-1.5"
            placeholder="🔍  Search by bill #, customer, table…"
            value={filters.search}
            onChange={e => setFilter('search', e.target.value)} />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-gray-600 text-sm">Loading…</div>
          ) : bills.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-600 select-none">
              <div className="text-4xl mb-3">📊</div>
              <p className="text-sm">No bills found</p>
            </div>
          ) : (
            <div className="divide-y divide-surface-3">
              {bills.map(bill => (
                <button
                  key={bill.id}
                  onClick={() => setSelBill(bill.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-2 transition-colors ${
                    selBill === bill.id ? 'bg-surface-2 border-l-2 border-brand-500' : ''
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-gray-200 text-sm">#{bill.bill_number}</span>
                      <span className="text-[10px] text-gray-600">{typeIcon[bill.order_type]}</span>
                      {bill.table_label && <span className="text-xs text-gray-500">{bill.table_label}</span>}
                      {bill.customer_name && <span className="text-xs text-gray-500 truncate">{bill.customer_name}</span>}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <span>{new Date(bill.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span>•</span>
                      <span>{bill.billed_by_name}</span>
                      <span>•</span>
                      <span>{bill.item_count} items</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="font-bold text-brand-400 text-sm">₹{Number(bill.grand_total).toFixed(2)}</span>
                    <span className={`badge text-[10px] ${pmColors[bill.payment_mode]}`}>
                      {pmIcon[bill.payment_mode]} {bill.payment_mode.toUpperCase()}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Detail ─────────────────────────────────────────────────────── */}
      {selBill ? (
        <div className={`${selBill ? 'flex' : 'hidden md:flex'} flex-col w-full md:w-80 lg:w-96 flex-shrink-0 border-l border-surface-3 bg-surface-1 overflow-hidden`}>
          <BillDetail
            billId={selBill}
            settings={settings}
            onClose={() => setSelBill(null)}
          />
        </div>
      ) : (
        <div className="hidden md:flex flex-col w-80 lg:w-96 flex-shrink-0 border-l border-surface-3 bg-surface-1 items-center justify-center text-gray-600 select-none">
          <div className="text-4xl mb-3">🧾</div>
          <p className="text-sm">Select a bill to view details</p>
        </div>
      )}
    </div>
  );
}
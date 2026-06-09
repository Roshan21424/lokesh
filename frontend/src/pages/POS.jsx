import { useState, useEffect, useCallback } from "react";
import api from "./api";
import toast from "react-hot-toast";

// ─── Receipt print ────────────────────────────────────────────────────────────
function printReceipt(bill, settings) {
  const calcs = Array.isArray(bill.calculations)
    ? bill.calculations
    : JSON.parse(bill.calculations_json || "[]");

  const itemRows = (bill.items || [])
    .map(
      (it) => `
    <tr>
      <td style="padding:2px 0">${it.item_name_snapshot}</td>
      <td style="text-align:center;padding:2px 4px">${it.qty}</td>
      <td style="text-align:right;padding:2px 0">&#8377;${Number(it.unit_price_snapshot).toFixed(2)}</td>
      <td style="text-align:right;padding:2px 0">&#8377;${Number(it.line_total).toFixed(2)}</td>
    </tr>`,
    )
    .join("");

  const calcRows = calcs
    .map(
      (c) => `
    <tr>
      <td colspan="3" style="padding:2px 0">${c.name}${c.type === "percentage" ? ` (${c.value}%)` : ""}</td>
      <td style="text-align:right;padding:2px 0">${c.amount < 0 ? "" : "+"}&#8377;${Number(c.amount).toFixed(2)}</td>
    </tr>`,
    )
    .join("");

  const w = window.open("", "_blank", "width=400,height=600");
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
    <h1>${settings.restaurant_name || "Restaurant"}</h1>
    ${settings.address ? `<p class="sub">${settings.address}</p>` : ""}
    ${settings.phone ? `<p class="sub">Ph: ${settings.phone}</p>` : ""}
    ${settings.gstin ? `<p class="sub">GSTIN: ${settings.gstin}</p>` : ""}
    <div class="divider"></div>
    <p>Bill #: <strong>${bill.bill_number}</strong></p>
    <p>Date: ${new Date(bill.created_at).toLocaleString()}</p>
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
    <p class="footer">${settings.receipt_footer || "Thank you!"}</p>
    </body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => {
    w.print();
  }, 400);
}

// ─── Bill Modal (no payment method) ──────────────────────────────────────────
function BillModal({ order, billCalcs, onConfirm, onCancel }) {
  const [selected, setSelected] = useState(() => billCalcs.map((c) => c.id));
  const [loading, setLoading] = useState(false);

  const subtotal = (order.items || []).reduce((s, i) => s + i.line_total, 0);
  let running = subtotal;
  const preview = billCalcs
    .filter((c) => selected.includes(c.id))
    .map((c) => {
      const base =
        c.type === "percentage" ? subtotal * (c.value / 100) : Number(c.value);
      const amt = c.is_deduction ? -Math.abs(base) : base;
      running += amt;
      return { ...c, amt };
    });
  const grand = Math.max(0, running);

  const toggle = (id) =>
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
    );

  const confirm = async () => {
    setLoading(true);
    try {
      await onConfirm(
        billCalcs
          .filter((c) => selected.includes(c.id))
          .map((c) => ({
            name: c.name,
            type: c.type,
            value: c.value,
            is_deduction: c.is_deduction,
          })),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-surface-1 border border-surface-3 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-gray-100">
          Bill #{order.bill_number}
        </h2>

        {/* Items */}
        <div className="bg-surface-2 rounded-xl p-3 space-y-1.5 max-h-44 overflow-y-auto">
          {(order.items || []).map((it) => (
            <div key={it.id} className="flex justify-between text-sm">
              <span className="text-gray-300 truncate flex-1 mr-2">
                {it.item_name_snapshot} × {it.qty}
              </span>
              <span className="text-gray-200 flex-shrink-0">
                ₹{it.line_total.toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        {/* Charges */}
        {billCalcs.length > 0 && (
          <div className="space-y-1">
            {billCalcs.map((c) => {
              const previewAmt =
                c.type === "percentage"
                  ? subtotal * (c.value / 100)
                  : Number(c.value);
              return (
                <label
                  key={c.id}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-2 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(c.id)}
                    onChange={() => toggle(c.id)}
                    className="w-4 h-4 accent-brand-500 rounded flex-shrink-0"
                  />
                  <span className="flex-1 text-sm text-gray-300">
                    {c.name}
                    <span className="text-gray-500 ml-1 text-xs">
                      {c.type === "percentage" ? `${c.value}%` : `₹${c.value}`}
                    </span>
                  </span>
                  <span
                    className={`text-sm font-medium flex-shrink-0 ${c.is_deduction ? "text-green-400" : "text-gray-300"}`}
                  >
                    {c.is_deduction ? "−" : "+"}₹{previewAmt.toFixed(2)}
                  </span>
                </label>
              );
            })}
          </div>
        )}

        {/* Totals */}
        <div className="bg-surface-2 rounded-xl p-3 space-y-1.5">
          <div className="flex justify-between text-sm text-gray-400">
            <span>Subtotal</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>
          {preview.map((c) => (
            <div key={c.id} className="flex justify-between text-sm">
              <span className="text-gray-400">{c.name}</span>
              <span
                className={c.is_deduction ? "text-green-400" : "text-gray-300"}
              >
                {c.amt < 0 ? "−" : "+"}₹{Math.abs(c.amt).toFixed(2)}
              </span>
            </div>
          ))}
          <div className="flex justify-between text-base font-bold text-gray-100 pt-1.5 border-t border-surface-3 mt-1">
            <span>Total</span>
            <span className="text-brand-400">₹{grand.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            onClick={onCancel}
            disabled={loading}
            className="btn-ghost flex-1"
          >
            Cancel
          </button>
          <button
            onClick={confirm}
            disabled={loading}
            className="btn-primary flex-1 py-3 text-base"
          >
            {loading ? "Processing…" : `Print Bill ₹${grand.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── POS Page ─────────────────────────────────────────────────────────────────
export default function POS() {
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [order, setOrder] = useState(null); // single active order
  const [billCalcs, setBillCalcs] = useState([]);
  const [settings, setSettings] = useState({});
  const [selCat, setSelCat] = useState(null);
  const [search, setSearch] = useState("");
  const [showBill, setShowBill] = useState(false);
  const [busy, setBusy] = useState(false);

  // ── load everything
  const loadAll = useCallback(async () => {
    try {
      const [c, it, bc, s] = await Promise.all([
        api.get("/categories"),
        api.get("/items"),
        api.get("/billcalcs"),
        api.get("/settings"),
      ]);
      setCategories(c.data);
      setItems(it.data);
      setBillCalcs(bc.data);
      setSettings(s.data);
    } catch {
      toast.error("Failed to load data");
    }
  }, []);

  // ── load / refresh open order (only one)
  const loadOrder = useCallback(async () => {
    try {
      const res = await api.get("/orders");
      const open = res.data[0] || null; // take the first open order
      if (open) {
        const full = await api.get(`/orders/${open.id}`);
        setOrder(full.data);
      } else {
        setOrder(null);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadAll();
    loadOrder();
  }, [loadAll, loadOrder]);

  // ── ensure an order exists, create if not
  const ensureOrder = async () => {
    if (order) return order;
    const res = await api.post("/orders", { order_type: "dine-in" });
    const full = await api.get(`/orders/${res.data.id}`);
    setOrder(full.data);
    return full.data;
  };

  // ── add / increment item
  const addItem = async (item) => {
    setBusy(true);
    try {
      const o = await ensureOrder();
      const existing = (o.items || []).find((i) => i.menu_item_id === item.id);
      const newQty = (existing?.qty || 0) + 1;
      await api.post(`/orders/${o.id}/items`, {
        menu_item_id: item.id,
        qty: newQty,
      });
      const full = await api.get(`/orders/${o.id}`);
      setOrder(full.data);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed");
    } finally {
      setBusy(false);
    }
  };


  

  // ── set qty (0 = remove)
  const setQty = async (menuItemId, qty) => {
    if (!order) return;
    if (qty < 1) {
      await api.delete(`/orders/${order.id}/items/${menuItemId}`);
    } else {
      await api.post(`/orders/${order.id}/items`, {
        menu_item_id: menuItemId,
        qty,
      });
    }
    const full = await api.get(`/orders/${order.id}`);
    setOrder(full.data);
  };

  // ── generate bill + print
  const generateBill = async (calculations) => {
    const res = await api.post(`/orders/${order.id}/bill`, {
      payment_mode: "cash", // backend requires it; defaulting silently
      calculations,
    });
    const full = await api.get(`/history/${res.data.bill_id}`);
    printReceipt({ ...full.data, payment_mode: "cash" }, settings);
    setShowBill(false);
    setOrder(null);
    toast.success(`Bill #${res.data.bill_number} printed!`);
  };

  // ── clear order
  const clearOrder = async () => {
    if (!order) return;
    if (!window.confirm("Clear the current order?")) return;
    await api.patch(`/orders/${order.id}/cancel`);
    setOrder(null);
    toast.success("Order cleared");
  };

  const filteredItems = items.filter((it) => {
    const catOk = !selCat || it.category_id === selCat;
    const findOk =
      !search || it.name.toLowerCase().includes(search.toLowerCase());
    return catOk && findOk && it.is_available && it.is_active;
  });

  const subtotal = (order?.items || []).reduce((s, i) => s + i.line_total, 0);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Bill modal */}
      {showBill && order && (
        <BillModal
          order={order}
          billCalcs={billCalcs}
          onConfirm={generateBill}
          onCancel={() => setShowBill(false)}
        />
      )}

      {/* all categories */}
      <div className="w-36 flex-shrink-0  bg-surface-1 overflow-y-auto p-2 font-semibold text-xs">
        <div className="px-2 py-2 flex justify-center">
          <span className="text-brand-400 uppercase">Categories</span>
        </div>
        <button onClick={() => setSelCat(null)} className={`w-full px-2 py-2 text-left rounded-sm ${!selCat? "bg-brand-500 text-white": "text-gray-400 hover:bg-surface-2 hover:text-gray-200"}`}> All </button>
        {categories.map((category) => (
          <button  key={category.id}  onClick={() => setSelCat(category.id === selCat ? null : category.id)} className={`w-full px-2 py-2 text-left rounded-sm ${selCat === category.id? "bg-brand-500 text-white": "text-gray-400 hover:bg-surface-2 hover:text-gray-200"}`}>{category.name}</button>
        ))}
      </div>
 
      {/* category menu */}
      <div className="flex-1 flex flex-col overflow-hidden font-semibold text-xs">
        {/* search */}
        <div className="p-2 flex-shrink-0">
          <input
            className="input text-sm py-1.5"
            placeholder="search items"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {/* item list */}
        <div className="flex-1 overflow-y-auto p-3">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-600 select-none">
              <p className="text-sm">
                {items.length === 0 ? "No Menu Items Yet" : "No Matching Items"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2">
              {filteredItems.map((item) => {
                const orderItem = order?.items?.find((i) => i.menu_item_id === item.id);
                const qty = orderItem?.qty || 0;
                return (
                <div key={item.id} className="relative bg-surface-2 hover:bg-surface-3 p-3 rounded-sm">
                  {/* item details */}
                  <button onClick={() => addItem(item)} disabled={busy} className="w-full text-left">
                     <div className="text-gray-200">{item.name}</div>
                     <div className="text-brand-400"> ₹ {item.price}</div>
                  </button>
                  {/* buttons */}
                  <div className="mt-3 flex items-center justify-center gap-3">
                     <button onClick={() => removeItem(item)} disabled={qty === 0} className="w-6 h-6 rounded-sm bg-surface-4 hover:bg-surface-6">-</button>
                     <span>{qty}</span>
                     <button onClick={() => addItem(item)} className="w-6 h-6 rounded-sm bg-brand-500 hover:bg-brand-600">+</button>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* order */}
      <div className="w-64 xl:w-72 flex flex-col flex-shrink-0 overflow-hidden bg-surface-1 font-semibold text-xs">

        {/* heading */}
        <div className="px-2 py-2 flex justify-center">
          <span className="text-brand-400 uppercase">order</span>
        </div>

        {/* order list */}
        <div className="flex-1 overflow-y-auto ">
          {!order || (order.items || []).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-600 select-none">
              <p className="text-sm">Add Items</p>
            </div>
          ) : (
            (order.items || []).map((item) => (
              <div key={item.id} className="flex items-center gap-2 p-4">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-200">{item.item_name_snapshot}</p>
                  <p className="text-gray-500">₹{item.unit_price_snapshot.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => setQty(item.menu_item_id, item.qty - 1)} className="w-6 h-6 rounded-sm bg-surface-3 hover:bg-surface-4 flex items-center justify-center">−</button>
                  <span className="w-6 text-center">{item.qty}</span>
                  <button onClick={() => setQty(item.menu_item_id, item.qty + 1)} className="w-6 h-6 rounded-sm bg-surface-3 hover:bg-surface-4 flex items-center justify-center">+</button>
                </div>
                <div className="w-14 text-right flex-shrink-0"> ₹{item.line_total.toFixed(2)}</div>
              </div>
            ))
          )}
        </div>
        
        {/* bill */}
        <div className="space-y-2 flex-shrink-0 p-4 border-t border-surface-3">
          <div className="flex justify-between">
            <span className="text-gray-400">Subtotal</span>
            <span className="text-gray-200">₹ {subtotal.toFixed(2)}</span>
          </div>
          <button onClick={() => setShowBill(true)} disabled={!(order?.items || []).length} className="btn-primary w-full py-2"> Print Bill</button>
          <button onClick={clearOrder} disabled={!order} className="w-full text-red-400 hover:text-red-500 py-2 disabled:opacity-30">Clear Order</button>
        </div>
      </div>
    </div>
  );
}

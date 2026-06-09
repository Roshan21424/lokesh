import { useState, useEffect, useCallback, useRef } from 'react';
import api from './api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/useAuth';

// ─── tiny drag-sort hook ──────────────────────────────────────────────────────
// returns { dragHandlers, draggingId } — attach dragHandlers(item) to each row
function useDragSort(items, onReorder) {
  const dragId = useRef(null);
  const overId = useRef(null);

  const handlers = (id) => ({
    draggable: true,
    onDragStart: () => { dragId.current = id; },
    onDragOver:  (e) => { e.preventDefault(); overId.current = id; },
    onDrop: () => {
      if (dragId.current == null || dragId.current === overId.current) return;
      const from = items.findIndex(i => i.id === dragId.current);
      const to   = items.findIndex(i => i.id === overId.current);
      if (from < 0 || to < 0) return;
      const reordered = [...items];
      const [moved] = reordered.splice(from, 1);
      reordered.splice(to, 0, moved);
      onReorder(reordered);
      dragId.current = null;
      overId.current = null;
    },
    onDragEnd: () => { dragId.current = null; overId.current = null; },
  });

  return handlers;
}

// ─── Category Modal ───────────────────────────────────────────────────────────
function CategoryModal({ cat, onSave, onClose }) {
  const [name, setName] = useState(cat?.name || '');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim()) return toast.error('Name is required');
    setSaving(true);
    try {
      if (cat) {
        await api.patch(`/categories/${cat.id}`, { name });
        toast.success('Category updated');
      } else {
        await api.post('/categories', { name });
        toast.success('Category created');
      }
      onSave();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-surface-1 border border-surface-3 rounded-2xl shadow-2xl w-full max-w-xs p-5 space-y-4">
        <h2 className="text-base font-semibold text-gray-100">{cat ? 'Rename Category' : 'New Category'}</h2>
        <input className="input" autoFocus placeholder="Category name"
          value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()} />
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-ghost flex-1 text-sm">Cancel</button>
          <button onClick={submit} disabled={saving} className="btn-primary flex-1 text-sm">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Item Modal ───────────────────────────────────────────────────────────────
function ItemModal({ item, categories, onSave, onClose }) {
  const [form, setForm] = useState({
    name: item?.name || '',
    price: item?.price ?? '',
    category_id: item?.category_id || categories[0]?.id || '',
    is_available: item?.is_available ?? 1,
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.name.trim()) return toast.error('Name is required');
    if (form.price === '' || Number(form.price) < 0) return toast.error('Valid price required');
    if (!form.category_id) return toast.error('Category required');
    setSaving(true);
    try {
      const payload = { ...form, price: Number(form.price), tax_rate: 0 };
      if (item) {
        await api.patch(`/items/${item.id}`, payload);
        toast.success('Item saved');
      } else {
        await api.post('/items', payload);
        toast.success('Item created');
      }
      onSave();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-surface-1 border border-surface-3 rounded-2xl shadow-2xl w-full max-w-xs p-5 space-y-4">
        <h2 className="text-base font-semibold text-gray-100">{item ? 'Edit Item' : 'New Item'}</h2>

        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">Category</label>
          <select className="input" value={form.category_id}
            onChange={e => setForm(f => ({ ...f, category_id: Number(e.target.value) }))}>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">Item Name</label>
          <input className="input" autoFocus placeholder="e.g. Paneer Butter Masala"
            value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>

        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">Price (₹)</label>
          <input type="number" min="0" step="0.01" className="input" placeholder="0.00"
            value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
        </div>

        <label className="flex items-center gap-3 cursor-pointer select-none">
          <div className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${form.is_available ? 'bg-brand-500' : 'bg-surface-4'}`}
            onClick={() => setForm(f => ({ ...f, is_available: f.is_available ? 0 : 1 }))}>
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.is_available ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
          <span className="text-sm text-gray-300">Available for ordering</span>
        </label>

        <div className="flex gap-2">
          <button onClick={onClose} className="btn-ghost flex-1 text-sm">Cancel</button>
          <button onClick={submit} disabled={saving} className="btn-primary flex-1 text-sm">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Menu Page ────────────────────────────────────────────────────────────────
export default function Menu() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [categories,  setCategories]  = useState([]);
  const [items,       setItems]       = useState([]);
  const [selCat,      setSelCat]      = useState(null);
  const [search,      setSearch]      = useState('');

  const [catModal,    setCatModal]    = useState(null);
  const [itemModal,   setItemModal]   = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [c, it] = await Promise.all([
        api.get('/categories?all=true'),
        api.get('/items?all=true'),
      ]);
      setCategories(c.data);
      setItems(it.data);
      setCategories(c.data);

const activeCats = c.data.filter(c => c.is_active);

if (activeCats.length > 0) {
  setSelCat(activeCats[0].id);
}
    } catch { toast.error('Failed to load menu'); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── save sort order for categories
  const saveCatOrder = async (reordered) => {
    setCategories(reordered);
    try {
      await Promise.all(
        reordered.map((c, i) => api.patch(`/categories/${c.id}`, { sort_order: i }))
      );
    } catch { toast.error('Failed to save order'); }
  };

  // ── save sort order for items
  const saveItemOrder = async (reordered) => {
    setItems(prev => {
      // replace only the reordered slice (keep other-category items in place)
      const updated = [...prev];
      reordered.forEach(item => {
        const idx = updated.findIndex(x => x.id === item.id);
        if (idx >= 0) updated[idx] = item;
      });
      return updated;
    });
    try {
      await Promise.all(
        reordered.map((it, i) => api.patch(`/items/${it.id}`, { sort_order: i }))
      );
    } catch { toast.error('Failed to save order'); }
  };

  // ── remove category (only if empty)
  const removeCategory = async (cat) => {
    const hasItems = items.some(i => i.category_id === cat.id && i.is_active);
    if (hasItems) return toast.error('Remove all items first');
    if (!window.confirm(`Remove category "${cat.name}"?`)) return;
    try {
      await api.patch(`/categories/${cat.id}`, { is_active: 0 });
      toast.success('Category removed');
      loadData();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  // ── remove item
  const removeItem = async (item) => {
    if (!window.confirm(`Remove "${item.name}"?`)) return;
    try {
      await api.patch(`/items/${item.id}`, { is_active: 0 });
      toast.success('Item removed');
      loadData();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const toggleItemAvailable = async (item) => {
    try {
      await api.patch(`/items/${item.id}`, { is_available: item.is_available ? 0 : 1 });
      loadData();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const activeCategories = categories.filter(c => c.is_active);

  const visibleItems = items.filter(it => {
    const catOk  = !selCat || it.category_id === selCat;
    const findOk = !search || it.name.toLowerCase().includes(search.toLowerCase());
    return catOk && it.is_active && findOk;
  });

  const catDrag  = useDragSort(activeCategories, saveCatOrder);
  const itemDrag = useDragSort(visibleItems, saveItemOrder);

  return (
    <div className="flex h-full overflow-hidden">
      {catModal && (
        <CategoryModal cat={catModal === 'new' ? null : catModal}
          onSave={() => { setCatModal(null); loadData(); }} onClose={() => setCatModal(null)} />
      )}
      {itemModal && (
        <ItemModal item={itemModal === 'new' ? null : itemModal}
          categories={activeCategories}
          onSave={() => { setItemModal(null); loadData(); }} onClose={() => setItemModal(null)} />
      )}


      <div className="w-36 flex-shrink-0 bg-surface-1 overflow-y-auto p-2 font-semibold text-xs flex flex-col">
         <div className="px-2 py-2 flex justify-center">
          <span className="text-brand-400 uppercase">Categories</span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1">
           {activeCategories.map(cat => (
            <div key={cat.id} className="group" {...catDrag(cat.id)} style={{ cursor: 'grab' }}>
              <button onClick={() => setSelCat(cat.id)} className={`w-full text-left px-2 py-2 rounded-sm transition-colors ${ selCat === cat.id ? 'bg-brand-500 text-white' : 'text-gray-400 hover:bg-surface-2 hover:text-gray-200'}`}>
              {cat.name}
             </button>
            </div>
          ))}
        </div>

        <div className="px-2 py-2 flex justify-center">
          <button onClick={() => setCatModal('new')} className="p-2 rounded bg-brand-500 hover:bg-brand-600 text-white text-xs leading-none flex items-center justify-center">Add Category</button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* category header */}
          <div className="flex-1 overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-3">
              <h2 className="text-sm ">{activeCategories.find(c => c.id === selCat)?.name}</h2>
              <div className="text-sm flex items-center gap-2">
              <button onClick={() => { const cat = activeCategories.find(c => c.id === selCat); if (cat) setCatModal(cat);}} className=" w-24 px-2 py-1 text-blue-500 hover:text-blue-300">Edit</button>
              <button onClick={() => { const cat = activeCategories.find(c => c.id === selCat); if (cat) removeCategory(cat);}} className="w-24 px-2 py-1 text-red-500 hover:text-red-300">Remove</button>
              <button onClick={() => setItemModal('new')} className=" w-24 px-2 py-1 text-sm bg-brand-500 text-white hover:bg-brand-600 rounded-sm">Add Item</button>
            </div>
          </div>    
          {/* items table */}
          {visibleItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-600 select-none">
              <p className="text-sm">No items found</p>
            </div>
          ) : (
            <table className="w-full text-sm border border-surface-3">
              <thead className="sticky top-0 bg-surface-1 ">
                <tr className="border-b border-surface-3">
                  <th className="w-8 p-2"></th>
                  <th className="text-left px-4 py-2 font-normal">Item</th>
                  <th className="text-left px-4 py-2 font-normal">Price</th>
                  <th className="text-left px-4 py-2 font-normal">Status</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-3">
                {visibleItems.map(item => (
                  <tr key={item.id} className="group transition-colors hover:bg-surface-2 cursor-grab active:cursor-grabbing" >
                    <td className="px-2 py-3 text-left text-gray-600 select-none">⠿</td>
                    <td className="px-4 py-3 text-left text-gray-200">{item.name}</td>
                    <td className="px-4 py-3 text-left text-brand-400">₹{Number(item.price).toFixed(2)}</td>
                    <td className="px-4 py-3 text-left"> {item.is_available ? <span className="badge bg-green-500/10 text-green-400">Available</span> : <span className="badge bg-orange-500/10 text-orange-400">Unavailable</span>}</td>
                    <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                          <button onClick={() => setItemModal(item)} className=" w-24 px-2 py-1 text-blue-500 hover:text-blue-300">Edit</button>
                          <button onClick={() => removeItem(item)} className=" w-24 px-2 py-1 text-red-500 hover:text-red-300">Remove</button>
                          <button onClick={() => toggleItemAvailable(item)} className=" w-24 px-2 py-1 text-yellow-500 hover:text-yellow-300">{item.is_available ? "Unavailable" : 'Available'}</button>
                        </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>


    </div>
  );
}
import { useState, useEffect, useCallback } from 'react';
import api from '../pages/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/useAuth';

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-surface-3 pb-2">{title}</h3>
      {children}
    </div>
  );
}

// ─── Staff Modal ──────────────────────────────────────────────────────────────
function StaffModal({ onSave, onClose }) {
  const [form, setForm] = useState({ username: '', password: '', role: 'staff' });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.username.trim() || !form.password) return toast.error('Username and password required');
    if (form.password.length < 4) return toast.error('Min 4 characters');
    setSaving(true);
    try {
      await api.post('/auth/staff', form);
      toast.success('Staff created');
      onSave();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
      <div className="bg-surface-1 border border-surface-3 rounded-sm shadow-2xl w-full max-w-xs p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-100">New Staff Account</h2>
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Username</label>
          <input className="input text-sm" autoFocus placeholder="e.g. cashier1" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Password</label>
          <input type="password" className="input text-sm" placeholder="Min 4 chars" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Role</label>
          <div className="flex gap-2">
            {['staff', 'admin'].map(r => (
              <button key={r} onClick={() => setForm(f => ({ ...f, role: r }))} className={`flex-1 py-1.5 rounded-sm text-xs font-semibold capitalize ${form.role === r ? 'bg-brand-500 text-white' : 'bg-surface-3 text-gray-400 hover:bg-surface-4'}`}>{r}</button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-ghost flex-1 text-sm rounded-sm">Cancel</button>
          <button onClick={submit} disabled={saving} className="btn-primary flex-1 text-sm rounded-sm">{saving ? 'Creating…' : 'Create'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Change Password Modal ────────────────────────────────────────────────────
function ChangePasswordModal({ staffId, staffName, onClose }) {
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (password.length < 4) return toast.error('Min 4 characters');
    setSaving(true);
    try {
      await api.patch(`/auth/staff/${staffId}/password`, { password });
      toast.success('Password updated');
      onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
      <div className="bg-surface-1 border border-surface-3 rounded-sm shadow-2xl w-full max-w-xs p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-100">Change Password</h2>
        <p className="text-xs font-semibold text-gray-400">New password for <span className="text-gray-200">{staffName}</span></p>
        <input type="password" className="input text-sm" autoFocus placeholder="Min 4 chars" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} />
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-ghost flex-1 text-sm rounded-sm">Cancel</button>
          <button onClick={submit} disabled={saving} className="btn-primary flex-1 text-sm rounded-sm">{saving ? 'Saving…' : 'Update'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Bill Calc Modal ──────────────────────────────────────────────────────────
function BillCalcModal({ calc, onSave, onClose }) {
  const [form, setForm] = useState({ name: calc?.name || '', type: calc?.type || 'percentage', value: calc?.value ?? '', is_deduction: calc?.is_deduction ?? 0 });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.name.trim()) return toast.error('Name required');
    if (form.value === '' || isNaN(Number(form.value))) return toast.error('Valid value required');
    setSaving(true);
    try {
      const payload = { ...form, value: Number(form.value) };
      if (calc) { await api.patch(`/billcalcs/${calc.id}`, payload); toast.success('Updated'); }
      else { await api.post('/billcalcs', payload); toast.success('Created'); }
      onSave();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
      <div className="bg-surface-1 border border-surface-3 rounded-sm shadow-2xl w-full max-w-xs p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-100">{calc ? 'Edit' : 'New'} Charge / Discount</h2>
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Name</label>
          <input className="input text-sm" autoFocus placeholder="e.g. GST, Service Charge, Discount" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Type</label>
            <div className="flex gap-1">
              {['percentage', 'flat'].map(t => (
                <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))} className={`flex-1 py-1.5 rounded-sm text-xs font-semibold capitalize ${form.type === t ? 'bg-brand-500 text-white' : 'bg-surface-3 text-gray-400 hover:bg-surface-4'}`}>{t}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Value {form.type === 'percentage' ? '(%)' : '(₹)'}</label>
            <input type="number" min="0" step="0.01" className="input text-sm" placeholder="0" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Kind</label>
          <div className="flex gap-2">
            {[{ v: 0, label: '+ Charge', cls: 'text-orange-400 bg-orange-500/10 border-orange-500/30' }, { v: 1, label: '− Discount', cls: 'text-green-400 bg-green-500/10 border-green-500/30' }].map(({ v, label, cls }) => (
              <button key={v} onClick={() => setForm(f => ({ ...f, is_deduction: v }))} className={`flex-1 py-1.5 rounded-sm text-xs font-semibold border transition-all ${form.is_deduction === v ? cls + ' border' : 'bg-surface-3 text-gray-400 border-transparent hover:bg-surface-4'}`}>{label}</button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-ghost flex-1 text-sm rounded-sm">Cancel</button>
          <button onClick={submit} disabled={saving} className="btn-primary flex-1 text-sm rounded-sm">{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Settings Drawer ──────────────────────────────────────────────────────────
export default function SettingsDrawer({ open, onClose }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [settings,  setSettings]  = useState({});
  const [staff,     setStaff]     = useState([]);
  const [calcs,     setCalcs]     = useState([]);
  const [saving,    setSaving]    = useState(false);

  const [showStaffModal, setShowStaffModal] = useState(false);
  const [changePwdFor,   setChangePwdFor]   = useState(null);
  const [calcModal,      setCalcModal]      = useState(null);

  const load = useCallback(async () => {
    try {
      const [s, st, c] = await Promise.all([api.get('/settings'), api.get('/auth/staff'), api.get('/billcalcs?all=true')]);
      setSettings(s.data);
      setStaff(st.data);
      setCalcs(c.data);
    } catch { toast.error('Failed to load settings'); }
  }, []);

  useEffect(() => { if (open) load(); }, [open, load]);

  const saveSettings = async () => {
    setSaving(true);
    try { await api.patch('/settings', settings); toast.success('Settings saved'); }
    catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const toggleStaff = async (s) => {
    try { await api.patch(`/auth/staff/${s.id}/toggle`); load(); toast.success(s.is_active ? 'Deactivated' : 'Activated'); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const toggleCalc = async (c) => {
    try { await api.patch(`/billcalcs/${c.id}`, { is_active: c.is_active ? 0 : 1 }); load(); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const deleteCalc = async (c) => {
    if (!window.confirm(`Delete "${c.name}"?`)) return;
    try { await api.delete(`/billcalcs/${c.id}`); toast.success('Deleted'); load(); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  return (
    <>
      {/* modals */}
      {showStaffModal && <StaffModal onSave={() => { setShowStaffModal(false); load(); }} onClose={() => setShowStaffModal(false)} />}
      {changePwdFor  && <ChangePasswordModal staffId={changePwdFor.id} staffName={changePwdFor.username} onClose={() => setChangePwdFor(null)} />}
      {calcModal     && <BillCalcModal calc={calcModal === 'new' ? null : calcModal} onSave={() => { setCalcModal(null); load(); }} onClose={() => setCalcModal(null)} />}

      {/* backdrop */}
      {open && <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />}

      {/* drawer */}
      <div className={`fixed top-0 right-0 h-full w-80 bg-surface-1 border-l border-surface-3 z-50 flex flex-col transition-transform duration-200 ${open ? 'translate-x-0' : 'translate-x-full'}`}>

        {/* header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-3 flex-shrink-0">
          <span className="text-xs font-semibold text-gray-100">Settings</span>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-200 text-lg leading-none">✕</button>
        </div>

        {/* scrollable content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 text-xs font-medium">

          {/* Restaurant Info */}
          <Section title="Restaurant Information">
            
            <div className="space-y-3">
              {[
                { key: 'restaurant_name', label: 'Name',    placeholder: 'My Restaurant'      },
                { key: 'phone',           label: 'Phone',   placeholder: '+91 98765 43210'    },
                { key: 'gstin',           label: 'GSTIN',   placeholder: '22AAAAA0000A1Z5'    },
                { key: 'address',         label: 'Address', placeholder: '123, Main St, City' },
                { key: 'receipt_footer',  label: 'Receipt Footer', placeholder: 'Thank you!'  },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">{label}</label>
                  <input className="input text-xs rounded-sm" placeholder={placeholder} value={settings[key] || ''} onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))} disabled={!isAdmin} />
                </div>
              ))}
              {isAdmin && <button onClick={saveSettings} disabled={saving} className="btn-primary w-full text-xs font-semibold rounded-sm">{saving ? 'Saving…' : 'Save Changes'}</button>}
            </div>
          </Section>

          {/* Charges & Discounts */}
          <Section title="Charges & Discounts">
            <p className="text-xs font-semibold text-gray-500">Applied during billing — taxes, charges, or discounts.</p>
            <div className="space-y-2">
              {calcs.length === 0 && <p className="text-xs font-semibold text-gray-600 text-center py-3">No charges configured</p>}
              {calcs.map(c => (
                <div key={c.id} className={`flex items-center gap-2 p-2.5 rounded-sm border text-xs font-semibold transition-colors ${c.is_active ? 'bg-surface-2 border-surface-3' : 'bg-surface-1 border-surface-2 opacity-50'}`}>
                  <div className="flex-1 min-w-0">
                    <span className="text-gray-200">{c.name}</span>
                    <span className="text-gray-500 ml-1">{c.type === 'percentage' ? `${c.value}%` : `₹${c.value}`}</span>
                  </div>
                  <span className={`badge text-[10px] ${c.is_deduction ? 'bg-green-500/10 text-green-400' : 'bg-orange-500/10 text-orange-400'}`}>{c.is_deduction ? '− Disc' : '+ Chg'}</span>
                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => setCalcModal(c)} className="px-1.5 py-0.5 text-gray-500 hover:text-blue-400 hover:bg-surface-3 rounded-sm">Edit</button>
                      <button onClick={() => toggleCalc(c)} className="px-1.5 py-0.5 text-gray-500 hover:text-orange-400 hover:bg-surface-3 rounded-sm">{c.is_active ? 'Off' : 'On'}</button>
                      <button onClick={() => deleteCalc(c)} className="px-1.5 py-0.5 text-gray-500 hover:text-red-400 hover:bg-surface-3 rounded-sm">✕</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {isAdmin && <button onClick={() => setCalcModal('new')} className="btn-primary w-full text-xs font-semibold rounded-sm">Add Charge / Discount</button>}
          </Section>

          {/* Staff Accounts (admin only) */}
          {isAdmin && (
            <Section title="Staff Accounts">
              <div className="space-y-2">
                {staff.map(s => (
                  <div key={s.id} className={`flex items-center gap-2 p-2.5 rounded-sm border text-xs font-semibold ${s.is_active ? 'bg-surface-2 border-surface-3' : 'bg-surface-1 border-surface-2 opacity-50'}`}>
                    <div className="w-7 h-7 rounded-full bg-brand-500/20 flex items-center justify-center text-xs font-semibold text-brand-400 flex-shrink-0">{s.username[0].toUpperCase()}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-200">{s.username}</span>
                      </div>
                      {!s.is_active && <span className="badge text-[10px] bg-red-500/10 text-red-400 ml-1">Inactive</span>}
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setChangePwdFor(s)} className="px-1.5 py-0.5 text-gray-500 hover:text-blue-400 hover:bg-surface-3 rounded-sm">Change Password</button>
                      {s.id !== user.id && <button onClick={() => toggleStaff(s)} className="px-1.5 py-0.5 text-gray-500 hover:text-orange-400 hover:bg-surface-3 rounded-sm">{s.is_active ? 'Off' : 'On'}</button>}
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => setShowStaffModal(true)} className="btn-primary w-full text-xs font-semibold rounded-sm">Add Staff</button>
            </Section>
          )}
        </div>
      </div>
    </>
  );
}
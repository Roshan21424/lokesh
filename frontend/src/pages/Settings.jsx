import { useState, useEffect, useCallback } from 'react';
import api from './api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/useAuth';

function Section({ title, children }) {
  return (
    <div className="card space-y-4">
      <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider border-b border-surface-3 pb-2">{title}</h2>
      {children}
    </div>
  );
}

function StaffModal({ onSave, onClose }) {
  const [form, setForm] = useState({ username: '', password: '', role: 'staff' });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.username.trim() || !form.password) return toast.error('Username and password required');
    if (form.password.length < 4) return toast.error('Password must be at least 4 characters');
    setSaving(true);
    try {
      await api.post('/auth/staff', form);
      toast.success('Staff account created');
      onSave();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-surface-1 border border-surface-3 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-100">New Staff Account</h2>
        <div>
          <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">Username</label>
          <input className="input" autoFocus placeholder="e.g. cashier1"
            value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">Password</label>
          <input type="password" className="input" placeholder="Min 4 characters"
            value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">Role</label>
          <div className="flex gap-2">
            {['staff', 'admin'].map(r => (
              <button key={r} onClick={() => setForm(f => ({ ...f, role: r }))}
                className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                  form.role === r ? 'bg-brand-500 text-white' : 'bg-surface-3 text-gray-400 hover:bg-surface-4'
                }`}>{r}</button>
            ))}
          </div>
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button onClick={submit} disabled={saving} className="btn-primary flex-1">
            {saving ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ChangePasswordModal({ staffId, staffName, onClose }) {
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (password.length < 4) return toast.error('Password must be at least 4 characters');
    setSaving(true);
    try {
      await api.patch(`/auth/staff/${staffId}/password`, { password });
      toast.success('Password updated');
      onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-surface-1 border border-surface-3 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-100">Change Password</h2>
        <p className="text-sm text-gray-400">New password for <strong className="text-gray-200">{staffName}</strong></p>
        <input type="password" className="input" autoFocus placeholder="Min 4 chars"
          value={password} onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()} />
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button onClick={submit} disabled={saving} className="btn-primary flex-1">
            {saving ? 'Saving…' : 'Update'}
          </button>
        </div>
      </div>
    </div>
  );
}

function BillCalcModal({ calc, onSave, onClose }) {
  const [form, setForm] = useState({
    name: calc?.name || '',
    type: calc?.type || 'percentage',
    value: calc?.value ?? '',
    is_deduction: calc?.is_deduction ?? 0,
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.name.trim()) return toast.error('Name required');
    if (form.value === '' || isNaN(Number(form.value))) return toast.error('Valid value required');
    setSaving(true);
    try {
      const payload = { ...form, value: Number(form.value) };
      if (calc) {
        await api.patch(`/billcalcs/${calc.id}`, payload);
        toast.success('Updated');
      } else {
        await api.post('/billcalcs', payload);
        toast.success('Created');
      }
      onSave();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-surface-1 border border-surface-3 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-100">{calc ? 'Edit' : 'New'} Charge / Discount</h2>

        <div>
          <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">Name</label>
          <input className="input" autoFocus placeholder="e.g. GST, Service Charge, Discount"
            value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">Type</label>
            <div className="flex gap-1">
              {['percentage', 'flat'].map(t => (
                <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                    form.type === t ? 'bg-brand-500 text-white' : 'bg-surface-3 text-gray-400 hover:bg-surface-4'
                  }`}>{t}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">
              Value {form.type === 'percentage' ? '(%)' : '(₹)'}
            </label>
            <input type="number" min="0" step="0.01" className="input" placeholder="0"
              value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">Kind</label>
          <div className="flex gap-2">
            {[
              { v: 0, label: '+ Charge', color: 'text-orange-400 bg-orange-500/10 border-orange-500/30' },
              { v: 1, label: '− Discount', color: 'text-green-400 bg-green-500/10 border-green-500/30' },
            ].map(({ v, label, color }) => (
              <button key={v} onClick={() => setForm(f => ({ ...f, is_deduction: v }))}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                  form.is_deduction === v ? color + ' border' : 'bg-surface-3 text-gray-400 border-transparent hover:bg-surface-4'
                }`}>{label}</button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button onClick={submit} disabled={saving} className="btn-primary flex-1">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Settings() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [settings, setSettings]   = useState({});
  const [staff,    setStaff]      = useState([]);
  const [calcs,    setCalcs]      = useState([]);
  const [saving,   setSaving]     = useState(false);

  const [showStaffModal, setShowStaffModal] = useState(false);
  const [changePwdFor,   setChangePwdFor]   = useState(null);
  const [calcModal,      setCalcModal]      = useState(null);

  const load = useCallback(async () => {
    try {
      const [s, st, c] = await Promise.all([
        api.get('/settings'),
        api.get('/auth/staff'),
        api.get('/billcalcs?all=true'),
      ]);
      setSettings(s.data);
      setStaff(st.data);
      setCalcs(c.data);
    } catch { toast.error('Failed to load settings'); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      await api.patch('/settings', settings);
      toast.success('Settings saved');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const toggleStaff = async (s) => {
    try {
      await api.patch(`/auth/staff/${s.id}/toggle`);
      load();
      toast.success(s.is_active ? 'Account deactivated' : 'Account activated');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const toggleCalc = async (c) => {
    try {
      await api.patch(`/billcalcs/${c.id}`, { is_active: c.is_active ? 0 : 1 });
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const deleteCalc = async (c) => {
    if (!window.confirm(`Delete "${c.name}"?`)) return;
    try {
      await api.delete(`/billcalcs/${c.id}`);
      toast.success('Deleted');
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 max-w-3xl mx-auto w-full">
      {showStaffModal && (
        <StaffModal onSave={() => { setShowStaffModal(false); load(); }} onClose={() => setShowStaffModal(false)} />
      )}
      {changePwdFor && (
        <ChangePasswordModal staffId={changePwdFor.id} staffName={changePwdFor.username}
          onClose={() => setChangePwdFor(null)} />
      )}
      {calcModal && (
        <BillCalcModal calc={calcModal === 'new' ? null : calcModal}
          onSave={() => { setCalcModal(null); load(); }} onClose={() => setCalcModal(null)} />
      )}

      <h1 className="text-xl font-bold text-gray-100">Settings</h1>

      {/* Restaurant Info */}
      <Section title="Restaurant Info">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { key: 'restaurant_name', label: 'Restaurant Name', placeholder: 'My Restaurant' },
            { key: 'phone',   label: 'Phone', placeholder: '+91 98765 43210' },
            { key: 'gstin',   label: 'GSTIN', placeholder: '22AAAAA0000A1Z5' },
            { key: 'address', label: 'Address', placeholder: '123, Main Street, City' },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">{label}</label>
              <input className="input" placeholder={placeholder}
                value={settings[key] || ''}
                onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))}
                disabled={!isAdmin} />
            </div>
          ))}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">Receipt Footer</label>
          <input className="input" placeholder="Thank you for dining with us!"
            value={settings.receipt_footer || ''}
            onChange={e => setSettings(s => ({ ...s, receipt_footer: e.target.value }))}
            disabled={!isAdmin} />
        </div>
        {isAdmin && (
          <button onClick={saveSettings} disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        )}
      </Section>

      {/* Charges & Discounts */}
      <Section title="Charges & Discounts">
        <p className="text-xs text-gray-500">Taxes, service charges, or discounts applied during billing.</p>
        <div className="space-y-2">
          {calcs.length === 0 && (
            <p className="text-sm text-gray-600 text-center py-4">No charges configured yet</p>
          )}
          {calcs.map(c => (
            <div key={c.id}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                c.is_active ? 'bg-surface-2 border-surface-3' : 'bg-surface-1 border-surface-2 opacity-50'
              }`}>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-gray-200">{c.name}</span>
                <span className="text-xs text-gray-500 ml-2">
                  {c.type === 'percentage' ? `${c.value}%` : `₹${c.value}`}
                </span>
              </div>
              <span className={`badge text-xs ${c.is_deduction ? 'bg-green-500/10 text-green-400' : 'bg-orange-500/10 text-orange-400'}`}>
                {c.is_deduction ? '− Discount' : '+ Charge'}
              </span>
              {isAdmin && (
                <div className="flex items-center gap-1">
                  <button onClick={() => setCalcModal(c)}
                    className="px-2 py-1 text-xs text-gray-500 hover:text-blue-400 hover:bg-surface-3 rounded-lg transition-colors">Edit</button>
                  <button onClick={() => toggleCalc(c)}
                    className="px-2 py-1 text-xs text-gray-500 hover:text-orange-400 hover:bg-surface-3 rounded-lg transition-colors">
                    {c.is_active ? 'Disable' : 'Enable'}</button>
                  <button onClick={() => deleteCalc(c)}
                    className="px-2 py-1 text-xs text-gray-500 hover:text-red-400 hover:bg-surface-3 rounded-lg transition-colors">✕</button>
                </div>
              )}
            </div>
          ))}
        </div>
        {isAdmin && (
          <button onClick={() => setCalcModal('new')} className="btn-ghost text-sm">
            + Add Charge / Discount
          </button>
        )}
      </Section>

      {/* Staff (admin only) */}
      {isAdmin && (
        <Section title="Staff Accounts">
          <div className="space-y-2">
            {staff.map(s => (
              <div key={s.id}
                className={`flex items-center gap-3 p-3 rounded-xl border ${
                  s.is_active ? 'bg-surface-2 border-surface-3' : 'bg-surface-1 border-surface-2 opacity-50'
                }`}>
                <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center text-sm font-bold text-brand-400 flex-shrink-0">
                  {s.username[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-200">{s.username}</span>
                    {s.id === user.id && <span className="text-[10px] text-brand-400 bg-brand-500/10 px-1.5 py-0.5 rounded">You</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge text-[10px] capitalize ${s.role === 'admin' ? 'bg-purple-500/10 text-purple-400' : 'bg-gray-500/10 text-gray-400'}`}>
                      {s.role}
                    </span>
                    {!s.is_active && <span className="badge text-[10px] bg-red-500/10 text-red-400">Inactive</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setChangePwdFor(s)}
                    className="px-2 py-1 text-xs text-gray-500 hover:text-blue-400 hover:bg-surface-3 rounded-lg transition-colors">
                    Set PW
                  </button>
                  {s.id !== user.id && (
                    <button onClick={() => toggleStaff(s)}
                      className="px-2 py-1 text-xs text-gray-500 hover:text-orange-400 hover:bg-surface-3 rounded-lg transition-colors">
                      {s.is_active ? 'Disable' : 'Enable'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => setShowStaffModal(true)} className="btn-ghost text-sm">+ Add Staff</button>
        </Section>
      )}

      <Section title="About">
        <div className="space-y-1 text-sm text-gray-500">
          <p>🍽️ Restaurant Billing System</p>
          <p>Daily database backups run at 2:00 AM and are kept for 30 days.</p>
          {!isAdmin && <p className="text-orange-400/80 text-xs mt-2">⚠️ Contact an admin to change restaurant settings.</p>}
        </div>
      </Section>
    </div>
  );
}
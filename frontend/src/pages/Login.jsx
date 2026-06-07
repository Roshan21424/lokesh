import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import api from './api';
import toast from 'react-hot-toast';

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) return toast.error('Enter username and password');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', form);
      login(res.data.token, res.data.user);
      toast.success(`Welcome, ${res.data.user.username}!`);
      navigate('/pos');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-500 mb-4 text-3xl">🍽️</div>
          <h1 className="text-2xl font-semibold text-gray-100">Restaurant Billing</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Username</label>
            <input
              className="input"
              placeholder="Enter username"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Password</label>
            <input
              type="password"
              className="input"
              placeholder="Enter password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            />
          </div>
          <button type="submit" className="btn-primary w-full mt-2" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-600 mt-4">Default admin: admin / admin123</p>
      </div>
    </div>
  );
}
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import toast from 'react-hot-toast';


export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) {
      return toast.error('Enter username and password');
    }

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
    <div className="min-h-screen bg-surface-0 flex items-center justify-center p-4 text-xs font-semibold">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">

          <h1 className="text-xl font-semibold text-gray-100">
            Restaurant Billing
          </h1>

          <p className="text-xs font-semibold text-gray-500 mt-1">
            Sign in to continue
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="card rounded-sm space-y-4 text-xs font-semibold"
        >
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">
              Username
            </label>

            <input
              className="input text-xs font-semibold rounded-sm"
              placeholder="Enter username"
              value={form.username}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  username: e.target.value,
                }))
              }
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">
              Password
            </label>

            <input
              type="password"
              className="input text-xs font-semibold rounded-sm"
              placeholder="Enter password"
              value={form.password}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  password: e.target.value,
                }))
              }
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full mt-2 text-xs font-semibold rounded-sm"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

      </div>
    </div>
  );
}

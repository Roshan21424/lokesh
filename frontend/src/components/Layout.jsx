import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

const NAV = [
  { to: '/pos',      label: 'POS' },
  { to: '/menu',     label: 'Menu' },
  { to: '/history',  label: 'History' },
  { to: '/settings', label: 'Settings' },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* ── Top navbar ── */}
      <header className="h-12 flex-shrink-0 bg-surface-1 border-b border-surface-3 flex items-center px-4 gap-6">
        {/* Brand */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-lg">🍽️</span>
          <span className="font-semibold text-gray-100 text-sm hidden sm:block">Billing</span>
        </div>

        {/* Nav tabs */}
        <nav className="flex items-center gap-1">
          {NAV.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-brand-500 text-white'
                    : 'text-gray-400 hover:bg-surface-2 hover:text-gray-100'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* User + logout */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center text-xs font-bold text-white">
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <span className="text-xs text-gray-400 hidden sm:block">{user?.username}</span>
            <span className="text-xs text-gray-600 capitalize hidden sm:block">({user?.role})</span>
          </div>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="text-xs text-gray-500 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-surface-2"
          >
            Logout
          </button>
        </div>
      </header>

      {/* ── Page content ── */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {children}
      </main>
    </div>
  );
}
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

const NAV = [
  { to: '/pos',        icon: '🧾', label: 'POS / Order' },
  { to: '/menu',       icon: '🍴', label: 'Menu' },
  { to: '/history',    icon: '📊', label: 'History' },
  { to: '/settings',   icon: '⚙️',  label: 'Settings' },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-16 lg:w-52 flex-shrink-0 bg-surface-1 border-r border-surface-3 flex flex-col">
        {/* Logo */}
        <div className="h-14 flex items-center justify-center lg:justify-start lg:px-4 border-b border-surface-3 flex-shrink-0">
          <span className="text-2xl">🍽️</span>
          <span className="hidden lg:block ml-2 font-semibold text-gray-100 text-sm">Billing</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 space-y-1 px-2">
          {NAV.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-2 py-2.5 rounded-lg transition-all duration-150 group
                ${isActive
                  ? 'bg-brand-500 text-white'
                  : 'text-gray-400 hover:bg-surface-2 hover:text-gray-100'}`
              }
            >
              <span className="text-lg flex-shrink-0 w-6 text-center">{icon}</span>
              <span className="hidden lg:block text-sm font-medium truncate">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User + logout */}
        <div className="border-t border-surface-3 p-2 flex-shrink-0">
          <div className="flex items-center gap-2 px-2 py-2 rounded-lg">
            <div className="w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div className="hidden lg:block flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-200 truncate">{user?.username}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-gray-500 hover:bg-surface-2 hover:text-red-400 transition-colors text-sm"
          >
            <span className="text-lg w-6 text-center">🚪</span>
            <span className="hidden lg:block">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {children}
      </main>
    </div>
  );
}
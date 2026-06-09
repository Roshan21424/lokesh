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
   <header className="h-12 flex-shrink-0 bg-surface-1 border-b border-surface-3 grid grid-cols-3 items-center px-4">
  
  <div className="flex items-center gap-2"> Hotel Name</div>
  <nav className="flex items-center justify-center gap-1">
    {NAV.map(({ to, label }) => (
      <NavLink key={to} to={to} className={({ isActive }) => `px-4 py-2 rounded-sm text-xs font-semibold  ${ isActive ? 'bg-brand-500 text-white' : 'text-gray-400 hover:bg-surface-2 hover:text-white'}`}>
        {label}
      </NavLink>
    ))}
  </nav>
  <div className="flex items-center justify-end gap-3">
    <div className="flex items-center gap-2">
      <div className="w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center text-xs font-semibold text-white">
        {user?.username?.[0]?.toUpperCase()}
      </div>
      <span className="text-xs font-semibold text-gray-400 hidden sm:block">
        {user?.username}
      </span>
    </div>
    <button onClick={() => { logout(); navigate('/login');}}className="text-xs font-semibold bg-red-600 text-gray-300 hover:text-white transition-colors px-2 py-1 rounded-sm hover:bg-red-500">
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
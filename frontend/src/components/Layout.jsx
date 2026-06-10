import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/useAuth';
import SettingsDrawer from '../pages/Settingsdrawer';

const NAV = [
  { to: '/pos',     label: 'Billing'     },
  { to: '/menu',    label: 'Categories'    },
  { to: '/history', label: 'History' },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* navbar */}
      <header className="h-12 flex-shrink-0 bg-surface-1 border-b border-surface-3 grid grid-cols-3 items-center px-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-300">Hotel Name</div>
        <nav className="flex items-center justify-center gap-5">
          {NAV.map(({ to, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `px-2 py-1 rounded-sm text-xs font-semibold ${isActive ? 'bg-brand-500 text-white' : 'text-gray-400 hover:bg-surface-2 hover:text-white'}`}>
              {label}
            </NavLink>
          ))}
        </nav>
      <div className="flex items-center justify-end gap-5">
  <div className="flex items-center gap-2">
    <div className="w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center text-xs font-semibold text-white">
      {user?.username?.[0]?.toUpperCase()}
    </div>
    <span className="text-xs font-semibold text-gray-400 hidden sm:block">
      {user?.username}
    </span>
  </div>

  <button
    onClick={() => {
      logout();
      navigate('/login');
    }}
    className="text-xs font-semibold bg-red-600 text-gray-300 hover:text-white px-2 py-1 rounded-sm hover:bg-red-500"
  >
    Logout
  </button>

  <button
    onClick={async () => {
      try {
        await fetch('/api/shutdown', {
          method: 'POST'
        });

        window.close();
      } catch (err) {
        console.error(err);
      }
    }}
    className="text-xs font-semibold bg-gray-700 text-gray-300 hover:text-white px-2 py-1 rounded-sm hover:bg-gray-600"
  >
    Exit
  </button>

  <button
    onClick={() => setSettingsOpen(true)}
    className="text-gray-400 hover:text-white transition-colors p-1.5 rounded-sm hover:bg-surface-2"
    title="Settings"
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  </button>
</div>

      </header>

      {/* page */}
      <main className="flex-1 overflow-hidden flex flex-col">{children}</main>

      {/* settings drawer */}
      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
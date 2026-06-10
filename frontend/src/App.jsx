import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './hooks/useAuth';
import Login   from './pages/Login';
import Layout  from './pages/Layout';
import POS     from './pages/POS';
import Menu    from './pages/Menu';
import History from './pages/History';

function PrivateRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid #334155', fontSize: '13px' },
          success: { iconTheme: { primary: '#22c55e', secondary: '#f1f5f9' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#f1f5f9' } },
        }}
      />
      <Routes>
        <Route path="/login"   element={<Login />} />
        <Route path="/pos"     element={<PrivateRoute><POS     /></PrivateRoute>} />
        <Route path="/menu"    element={<PrivateRoute><Menu    /></PrivateRoute>} />
        <Route path="/history" element={<PrivateRoute><History /></PrivateRoute>} />
        <Route path="*"        element={<Navigate to="/pos" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
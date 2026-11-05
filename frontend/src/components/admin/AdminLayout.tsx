import { Outlet, Navigate } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminTopbar from './AdminTopbar';
import { useAuth } from '../../auth/AuthContext';

export default function AdminLayout() {
  const { user, loading, error, refresh } = useAuth();
  if (loading) return (
    <div className="admin-state-screen">
      <div className="admin-state-card">
        <div className="admin-state-spinner"></div>
        <p>Checking access…</p>
      </div>
    </div>
  );
  if (error) return (
    <div className="admin-state-screen">
      <div className="admin-state-card">
        <div className="admin-state-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
        </div>
        <h2>Connection error</h2>
        <p>Unable to reach the server. Make sure the backend is running and try again.</p>
        <button className="btn btn-fill" onClick={() => void refresh()}>Try again</button>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/auth" replace />;
  if (user.role === 'USER' || user.role === 'MEMBER') return <Navigate to="/member" replace />;
  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-main-wrapper">
        <AdminTopbar />
        <main className="admin-main">
          <div className="admin-main-inner">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

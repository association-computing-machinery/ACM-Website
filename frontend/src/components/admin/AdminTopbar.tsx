import { useAuth } from '../../auth/AuthContext';
import { useSite } from '../../context/SiteContext';

export default function AdminTopbar() {
  const { user } = useAuth();
  const { settings } = useSite();

  const initials = user?.fullName
    ? user.fullName.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
    : 'A';

  return (
    <header className="admin-topbar">
      <div className="admin-topbar-left">
        <span className="admin-topbar-brand">{settings.societyName}</span>
      </div>
      <div className="admin-topbar-right">
        <span className="admin-topbar-role">{user?.role?.replace('_', ' ')}</span>
        <div className="admin-topbar-avatar" aria-label={user?.fullName ?? 'Admin'}>
          {initials}
        </div>
      </div>
    </header>
  );
}

import { NavLink } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useSite } from '../../context/SiteContext';
import { useEscapeKey } from '../../hooks/useEscapeKey';

export default function AdminSidebar() {
  const location = useLocation();
  const { logout } = useAuth();
  const { settings } = useSite();
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [signOutError, setSignOutError] = useState('');
  const navRef = useRef<HTMLElement>(null);
  const [activeIndicator, setActiveIndicator] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  useEscapeKey(() => setShowConfirm(false), showConfirm);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const updateIndicator = () => {
      const activeLink = nav.querySelector<HTMLElement>('.admin-nav-link.active');
      if (!activeLink) return;
      const navRect = nav.getBoundingClientRect();
      const linkRect = activeLink.getBoundingClientRect();
      setActiveIndicator({
        left: linkRect.left - navRect.left,
        top: linkRect.top - navRect.top,
        width: linkRect.width,
        height: linkRect.height,
      });
    };

    updateIndicator();
    const observer = new ResizeObserver(updateIndicator);
    observer.observe(nav);
    window.addEventListener('resize', updateIndicator);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateIndicator);
    };
  }, [location.pathname]);

  const links = [
    {
      to: '/admin', label: 'Dashboard', exact: true,
      icon: (
        <svg viewBox="0 -0.5 25 25" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 24, height: 24 }}>
          <path fillRule="evenodd" clipRule="evenodd" d="M9.918 10.0005H7.082C6.66587 9.99708 6.26541 10.1591 5.96873 10.4509C5.67204 10.7427 5.50343 11.1404 5.5 11.5565V17.4455C5.5077 18.3117 6.21584 19.0078 7.082 19.0005H9.918C10.3341 19.004 10.7346 18.842 11.0313 18.5502C11.328 18.2584 11.4966 17.8607 11.5 17.4445V11.5565C11.4966 11.1404 11.328 10.7427 11.0313 10.4509C10.7346 10.1591 10.3341 9.99708 9.918 10.0005Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path fillRule="evenodd" clipRule="evenodd" d="M9.918 4.0006H7.082C6.23326 3.97706 5.52559 4.64492 5.5 5.4936V6.5076C5.52559 7.35629 6.23326 8.02415 7.082 8.0006H9.918C10.7667 8.02415 11.4744 7.35629 11.5 6.5076V5.4936C11.4744 4.64492 10.7667 3.97706 9.918 4.0006Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path fillRule="evenodd" clipRule="evenodd" d="M15.082 13.0007H17.917C18.3333 13.0044 18.734 12.8425 19.0309 12.5507C19.3278 12.2588 19.4966 11.861 19.5 11.4447V5.55666C19.4966 5.14054 19.328 4.74282 19.0313 4.45101C18.7346 4.1592 18.3341 3.9972 17.918 4.00066H15.082C14.6659 3.9972 14.2654 4.1592 13.9687 4.45101C13.672 4.74282 13.5034 5.14054 13.5 5.55666V11.4447C13.5034 11.8608 13.672 12.2585 13.9687 12.5503C14.2654 12.8421 14.6659 13.0041 15.082 13.0007Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path fillRule="evenodd" clipRule="evenodd" d="M15.082 19.0006H17.917C18.7661 19.0247 19.4744 18.3567 19.5 17.5076V16.4936C19.4744 15.6449 18.7667 14.9771 17.918 15.0006H15.082C14.2333 14.9771 13.5256 15.6449 13.5 16.4936V17.5066C13.525 18.3557 14.2329 19.0241 15.082 19.0006Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
    {
      to: '/admin/team', label: 'Teams',
      icon: (
        <svg viewBox="0 0 100 100" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style={{ width: 22, height: 22 }}>
          <path d="M57,44h-6h-6c-3.3,0-6,2.7-6,6v9c0,1.1,0.5,2.1,1.2,2.8c0.7,0.7,1.7,1.2,2.8,1.2v9c0,3.3,2.7,6,6,6h2h2c3.3,0,6-2.7,6-6v-9c1.1,0,2.1-0.4,2.8-1.2c0.7-0.7,1.2-1.7,1.2-2.8v-9C63,46.7,60.3,44,57,44z"/>
          <circle cx="51" cy="33" r="7"/>
          <path d="M36.6,66.7c-0.2-0.2-0.5-0.4-0.7-0.6c-1.9-2-3-4.5-3-7.1v-9c0-3.2,1.3-6.2,3.4-8.3c0.6-0.6,0.1-1.7-0.7-1.7c-1.7,0-3.6,0-3.6,0h-6c-3.3,0-6,2.7-6,6v9c0,1.1,0.5,2.1,1.2,2.8c0.7,0.7,1.7,1.2,2.8,1.2v9c0,3.3,2.7,6,6,6h2h2c0.9,0,1.7-0.2,2.4-0.5c0.4-0.2,0.6-0.5,0.6-0.9c0-1.2,0-4,0-5.1C37,67.2,36.9,66.9,36.6,66.7z"/>
          <circle cx="32" cy="29" r="7"/>
          <path d="M76,40h-6c0,0-1.9,0-3.6,0c-0.9,0-1.3,1-0.7,1.7c2.1,2.2,3.4,5.1,3.4,8.3v9c0,2.6-1,5.1-3,7.1c-0.2,0.2-0.4,0.4-0.7,0.6c-0.2,0.2-0.4,0.5-0.4,0.8c0,1.1,0,3.8,0,5.1c0,0.4,0.2,0.8,0.6,0.9c0.7,0.3,1.5,0.5,2.4,0.5h2h2c3.3,0,6-2.7,6-6v-9c1.1,0,2.1-0.4,2.8-1.2c0.7-0.7,1.2-1.7,1.2-2.8v-9C82,42.7,79.3,40,76,40z"/>
          <circle cx="70" cy="29" r="7"/>
        </svg>
      ),
    },
    {
      to: '/admin/events', label: 'ITU Fest',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 8C3 5.79086 4.79086 4 7 4H17C19.2091 4 21 5.79086 21 8V17C21 19.2091 19.2091 21 17 21H7C4.79086 21 3 19.2091 3 17V8Z" stroke="currentColor" strokeWidth="2"/>
          <path d="M8 3V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <path d="M17 10H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <path d="M17 17L16 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <path d="M16 3V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      to: '/admin/projects', label: 'Projects',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22"/>
        </svg>
      ),
    },
    {
      to: '/admin/users', label: 'Users',
      icon: (
        <svg viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path fillRule="evenodd" d="M6 2a3.5 3.5 0 100 7 3.5 3.5 0 000-7zM4 5.5a2 2 0 114 0 2 2 0 01-4 0z" clipRule="evenodd"/>
          <path d="M4.25 10A3.75 3.75 0 00.5 13.75v.5a.75.75 0 001.5 0v-.5a2.25 2.25 0 012.25-2.25h3.5A2.25 2.25 0 0110 13.75v.5a.75.75 0 001.5 0v-.5A3.75 3.75 0 007.75 10h-3.5zM11.25 10.75A.75.75 0 0112 10h.25a3.25 3.25 0 013.25 3.25v1a.75.75 0 01-1.5 0v-1a1.75 1.75 0 00-1.75-1.75H12a.75.75 0 01-.75-.75zM11.273 2.24a.75.75 0 00-.546 1.396 2.001 2.001 0 010 3.728.75.75 0 00.546 1.397 3.501 3.501 0 000-6.522z"/>
        </svg>
      ),
    },
    {
      to: '/admin/recruitment', label: 'Recruitment',
      icon: (
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="6" y="6" width="36" height="36" rx="3" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M6 14H40" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M30 22H42" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M30 30H42" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M23 22H24" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M23 30H24" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M14 6L14 42" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
    {
      to: '/admin/settings', label: 'Settings',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 22, height: 22 }}>
          <path fillRule="evenodd" clipRule="evenodd" d="M11.0175 19C10.6601 19 10.3552 18.7347 10.297 18.373C10.2434 18.0804 10.038 17.8413 9.76171 17.75C9.53658 17.6707 9.31645 17.5772 9.10261 17.47C8.84815 17.3365 8.54289 17.3565 8.30701 17.522C8.02156 17.7325 7.62943 17.6999 7.38076 17.445L6.41356 16.453C6.15326 16.186 6.11944 15.7651 6.33361 15.458C6.49878 15.2105 6.52257 14.8914 6.39601 14.621C6.31262 14.4332 6.23906 14.2409 6.17566 14.045C6.08485 13.7363 5.8342 13.5051 5.52533 13.445C5.15287 13.384 4.8779 13.0559 4.87501 12.669V11.428C4.87303 10.9821 5.18705 10.6007 5.61601 10.528C5.94143 10.4645 6.21316 10.2359 6.33751 9.921C6.37456 9.83233 6.41356 9.74433 6.45451 9.657C6.61989 9.33044 6.59705 8.93711 6.39503 8.633C6.1424 8.27288 6.18119 7.77809 6.48668 7.464L7.19746 6.735C7.54802 6.37532 8.1009 6.32877 8.50396 6.625L8.52638 6.641C8.82735 6.84876 9.21033 6.88639 9.54428 6.741C9.90155 6.60911 10.1649 6.29424 10.2375 5.912L10.2473 5.878C10.3275 5.37197 10.7536 5.00021 11.2535 5H12.1115C12.6248 4.99976 13.0629 5.38057 13.1469 5.9L13.1625 5.97C13.2314 6.33617 13.4811 6.63922 13.8216 6.77C14.1498 6.91447 14.5272 6.87674 14.822 6.67L14.8707 6.634C15.2842 6.32834 15.8528 6.37535 16.2133 6.745L16.8675 7.417C17.1954 7.75516 17.2366 8.28693 16.965 8.674C16.7522 8.99752 16.7251 9.41325 16.8938 9.763L16.9358 9.863C17.0724 10.2045 17.3681 10.452 17.7216 10.521C18.1837 10.5983 18.5235 11.0069 18.525 11.487V12.6C18.5249 13.0234 18.2263 13.3846 17.8191 13.454C17.4842 13.5199 17.2114 13.7686 17.1083 14.102C17.0628 14.2353 17.0121 14.3687 16.9562 14.502C16.8261 14.795 16.855 15.1364 17.0323 15.402C17.2662 15.7358 17.2299 16.1943 16.9465 16.485L16.0388 17.417C15.7792 17.6832 15.3698 17.7175 15.0716 17.498C14.8226 17.3235 14.5001 17.3043 14.2331 17.448C14.0428 17.5447 13.8475 17.6305 13.6481 17.705C13.3692 17.8037 13.1636 18.0485 13.1099 18.346C13.053 18.7203 12.7401 18.9972 12.3708 19H11.0175Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path fillRule="evenodd" clipRule="evenodd" d="M13.9747 12C13.9747 13.2885 12.9563 14.333 11.7 14.333C10.4437 14.333 9.42533 13.2885 9.42533 12C9.42533 10.7115 10.4437 9.66699 11.7 9.66699C12.9563 9.66699 13.9747 10.7115 13.9747 12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
  ];

  const signOutIcon = (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M2 6.5C2 4.01472 4.01472 2 6.5 2H12C14.2091 2 16 3.79086 16 6V7C16 7.55228 15.5523 8 15 8C14.4477 8 14 7.55228 14 7V6C14 4.89543 13.1046 4 12 4H6.5C5.11929 4 4 5.11929 4 6.5V17.5C4 18.8807 5.11929 20 6.5 20H12C13.1046 20 14 19.1046 14 18V17C14 16.4477 14.4477 16 15 16C15.5523 16 16 16.4477 16 17V18C16 20.2091 14.2091 22 12 22H6.5C4.01472 22 2 19.9853 2 17.5V6.5ZM18.2929 8.29289C18.6834 7.90237 19.3166 7.90237 19.7071 8.29289L22.7071 11.2929C23.0976 11.6834 23.0976 12.3166 22.7071 12.7071L19.7071 15.7071C19.3166 16.0976 18.6834 16.0976 18.2929 15.7071C17.9024 15.3166 17.9024 14.6834 18.2929 14.2929L19.5858 13L11 13C10.4477 13 10 12.5523 10 12C10 11.4477 10.4477 11 11 11L19.5858 11L18.2929 9.70711C17.9024 9.31658 17.9024 8.68342 18.2929 8.29289Z" fill="currentColor"/>
    </svg>
  );

  async function handleSignOut() {
    setBusy(true);
    setSignOutError('');
    try {
      const ok = await logout();
      if (ok) setShowConfirm(false);
      // The local user is cleared either way, so keep the dialog open and say
      // plainly that the server session may still be alive.
      else setSignOutError('Signed out on this device, but the server could not be reached. Close other tabs and try again.');
    } finally { setBusy(false); }
  }

  return (
    <>
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-brand-logo">
            <img src={settings.logoUrl} alt={settings.societyName} />
          </div>
        </div>
        <nav className="admin-nav" ref={navRef}>
          {activeIndicator && (
            <span className="admin-nav-indicator" style={activeIndicator} aria-hidden="true" />
          )}
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.exact}
              className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
            >
              <span className="admin-nav-icon">{link.icon}</span>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <button
          className="admin-nav-link admin-signout-btn"
          onClick={() => setShowConfirm(true)}
        >
          <span className="admin-nav-icon">{signOutIcon}</span>
          Sign out
        </button>
      </aside>

      {showConfirm && (
        <div className="admin-signout-overlay" role="dialog" aria-modal="true" aria-labelledby="signout-title">
          <div className="admin-signout-dialog">
            <h2 id="signout-title">Sign out?</h2>
            <p>Are you sure you want to sign out?</p>
            {signOutError && <p className="form-message" role="alert">{signOutError}</p>}
            <div className="admin-signout-actions">
              <button
                className="btn"
                onClick={() => setShowConfirm(false)}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                className="btn btn-fill"
                onClick={handleSignOut}
                disabled={busy}
              >
                {busy ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

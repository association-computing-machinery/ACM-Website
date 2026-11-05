import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminSponsors from '../../components/admin/AdminSponsors';
import { api } from '../../lib/api';

interface AdminMember { published: boolean; archived: boolean; group: string; name: string; role: string }
interface AdminUser   { id: string; fullName: string; email: string; role: string }
interface CoreMember { positionLabel: string; memberName: string }
interface SubTeamMember { id: string; team_id: string; member_name: string; member_email: string; member_phone: string; member_bio: string; member_photo: string; position: string }
interface SubTeam { id: string; name: string; display_order: number; members: SubTeamMember[] }

interface Stats {
  totalMembers: number;
  totalUsers:   number;   // ALL registered accounts (users + admins + super admins)
  totalProjects: number;
  admins:       number;   // ADMIN + SUPER_ADMIN
  recentMembers: AdminMember[];
  recentUsers:   AdminUser[];
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const now = new Date();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [teamRes, coreTeamRes, subTeamsRes, usersRes, projectsRes] = await Promise.all([
          api<{ members: AdminMember[] }>('/admin/team'),
          api<{ members: CoreMember[] }>('/core-team'),
          api<{ teams: SubTeam[] }>('/sub-teams'),
          // The row list is capped, so totals come from the server.
          api<{ users: AdminUser[]; total: number; admins: number; members: number }>('/admin/users'),
          api<{ projects: { id: string }[] }>('/projects'),
        ]);
        if (cancelled) return;

        const members = teamRes.members;
        const allUsers = usersRes.users;
        const projects = projectsRes.projects;
        const activeMembers = members.filter(m => m.published && !m.archived);
        const memberAccounts = allUsers.filter(u => u.role === 'MEMBER');

        const formatPosition = (value?: string) => {
          switch (value) {
            case 'TEAM_DIRECTOR': return 'Team Director';
            case 'TEAM_LEAD': return 'Team Head';
            case 'TEAM_CO_LEAD': return 'Team Co-Head';
            default: return 'Member';
          }
        };

        const subTeamMembers = subTeamsRes.teams.flatMap(team =>
          team.members.map(member => ({
            name: member.member_name || 'Unnamed member',
            role: formatPosition(member.position),
            group: team.name,
            published: true,
            archived: false,
          }))
        );

        const coreTeamMembers = coreTeamRes.members
          .filter(member => member.memberName.trim())
          .map(member => ({
            name: member.memberName,
            role: member.positionLabel,
            group: 'Core Team',
            published: true,
            archived: false,
          }));

        // Count what the "Recent Members" table actually lists, then fall back
        // to the published roster and finally to the full MEMBER-role count.
        const rosterMembers = coreTeamMembers.length + subTeamMembers.length;
        const totalMembers = rosterMembers || activeMembers.length || usersRes.members;

        // Every list from the API is newest-first (the published roster has no
        // recency column, so it keeps roster order) — take from the front, and
        // never slice(-n), which returned the OLDEST rows.
        const recentMembers = coreTeamMembers.length || subTeamMembers.length
          ? [...coreTeamMembers, ...subTeamMembers].slice(0, 7)
          : activeMembers.length
            ? activeMembers.slice(0, 7)
            : memberAccounts.slice(0, 7).map(u => ({
                name: u.fullName,
                role: 'Member',
                group: 'Member',
                published: true,
                archived: false,
              }));

        setStats({
          totalMembers,
          totalUsers: usersRes.total,
          totalProjects: projects.length,
          admins: usersRes.admins,
          recentMembers,
          recentUsers: allUsers.slice(0, 7),
        });
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load the dashboard.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [reloadKey]);

  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.fullName?.split(' ')[0] ?? 'Admin';
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const statCards = [
    {
      label: 'Total Members',
      value: stats?.totalMembers,
      color: '#3a63c9',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
    },
    {
      label: 'Total Users',
      value: stats?.totalUsers,
      color: '#5b8ff0',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      ),
    },
    {
      label: 'Total Projects',
      value: stats?.totalProjects,
      color: '#7c9eee',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="12 2 2 7 12 12 22 7 12 2"/>
          <polyline points="2 17 12 22 22 17"/>
          <polyline points="2 12 12 17 22 12"/>
        </svg>
      ),
    },
    {
      label: 'Admins',
      value: stats?.admins,
      color: '#a8c1f8',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      ),
    },
  ] as const;

  return (
    <div className="db-root">

      {/* top bar */}
      <div className="db-topbar">
        <div>
          <AdminPageHeader title="Dashboard" subtitle={`${dateStr} · ${greeting}, ${firstName}`} icon="dashboard" />
        </div>
      </div>

      {/* failure banner: without it an outage is indistinguishable from an empty chapter */}
      {error && (
        <div className="db-panel" role="alert" style={{ marginBottom: 16 }}>
          <p style={{ margin: '0 0 12px' }}>{error}</p>
          <button className="btn" onClick={() => setReloadKey(k => k + 1)}>Try again</button>
        </div>
      )}

      {/* stat cards */}
      <div className="db-stats-row">
        {statCards.map(card => (
          <div key={card.label} className="db-stat-card">
            <div className="db-stat-header">
              <div className="db-stat-icon-wrap" style={{ background: `${card.color}18`, color: card.color }}>
                {card.icon}
              </div>
              <div className="db-stat-text">
                <span className="db-stat-label">{card.label}</span>
                <span className="db-stat-value">
                  {loading ? <span className="db-shimmer db-shimmer-num" /> : (card.value ?? '—')}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* recent tables */}
      <div className="db-bottom-row">

        <div className="db-panel">
          <div className="db-panel-head">
            <span className="db-panel-title">Recent Members</span>
            <span className="db-count-badge">{stats?.totalMembers ?? '—'}</span>
            <Link to="/admin/team" className="db-view-all">View all →</Link>
          </div>
          {loading ? (
            <div className="db-table-skeleton">
              {[1,2,3,4].map(i => <div key={i} className="db-shimmer db-shimmer-row" />)}
            </div>
          ) : (
            <table className="db-table">
              <thead><tr><th>Name</th><th>Position</th><th>Team</th></tr></thead>
              <tbody>
                {stats?.recentMembers.length ? stats.recentMembers.map((m, i) => (
                  <tr key={i}>
                    <td className="db-td-name">{m.name}</td>
                    <td>{m.role}</td>
                    <td>{m.group}</td>
                  </tr>
                )) : <tr><td colSpan={3} className="db-empty-msg">No members yet.</td></tr>}
              </tbody>
            </table>
          )}
        </div>

        <div className="db-panel">
          <div className="db-panel-head">
            <span className="db-panel-title">Recent Users</span>
            <span className="db-count-badge">{stats?.totalUsers ?? '—'}</span>
            <Link to="/admin/users" className="db-view-all">View all →</Link>
          </div>
          {loading ? (
            <div className="db-table-skeleton">
              {[1,2,3,4].map(i => <div key={i} className="db-shimmer db-shimmer-row" />)}
            </div>
          ) : (
            <table className="db-table">
              <thead><tr><th>Name</th><th>Email</th><th>Access</th></tr></thead>
              <tbody>
                {stats?.recentUsers.length ? stats.recentUsers.map(u => (
                  <tr key={u.id}>
                    <td className="db-td-name">{u.fullName}</td>
                    <td className="db-td-email">{u.email}</td>
                    <td>
                      <span className={`db-status-pill ${u.role === 'SUPER_ADMIN' ? 'db-pill-super' : u.role === 'ADMIN' ? 'db-pill-admin' : u.role === 'MEMBER' ? 'db-pill-member' : 'db-pill-user'}`}>
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                )) : <tr><td colSpan={3} className="db-empty-msg">No users yet.</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <AdminSponsors />

    </div>
  );
}

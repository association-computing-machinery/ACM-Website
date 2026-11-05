import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

interface SubTeam {
  id: string;
  name: string;
  members: SubTeamMember[];
}

interface SubTeamMember {
  id: string;
  member_name: string;
  member_photo: string;
  position: string;
}

function formatPosition(position: string) {
  switch (position) {
    case 'TEAM_DIRECTOR': return 'Team Director';
    case 'TEAM_LEAD': return 'Team Head';
    case 'TEAM_CO_LEAD': return 'Team Co-Head';
    default: return 'Member';
  }
}

export default function TeamPage() {
  const [teams, setTeams] = useState<SubTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    let cancelled = false;
    setLoading(true);
    setError('');

    api<{ teams: SubTeam[] }>('/sub-teams')
      .then(result => {
        if (!cancelled) setTeams(result.teams ?? []);
      })
      .catch(cause => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'Unable to load teams.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [reloadKey]);

  return (
    <main className="team-page wrap">
      <div className="team-heading">
        <h1>Our Team</h1>
        <p>Meet the teams that bring our chapter’s events, projects, and community to life.</p>
      </div>
      <section aria-labelledby="team-groups-title">
        <h2 className="team-hierarchy-title" id="team-groups-title">Sub-Teams &amp; Committees</h2>
        {loading ? (
          <p className="team-list-status" role="status">Loading teams…</p>
        ) : error ? (
          <div className="empty-state clay-surface-white">
            <p role="alert">{error}</p>
            <button className="btn" onClick={() => setReloadKey(key => key + 1)}>Try again</button>
          </div>
        ) : teams.length ? (
          <div className="team-committee-grid">
            {teams.map((team, index) => (
              <article className="team-committee-card" key={team.id}>
                <span className="team-committee-number" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3>{team.name}</h3>
                {team.members.length ? (
                  <ul className="team-committee-members" aria-label={`${team.name} members`}>
                    {team.members.map(member => (
                      <li className="team-committee-member" key={member.id}>
                        {member.member_photo ? (
                          <img src={member.member_photo} alt="" />
                        ) : (
                          <span className="team-committee-member-initials" aria-hidden="true">
                            {member.member_name
                              .split(' ')
                              .map(part => part[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase()}
                          </span>
                        )}
                        <span className="team-committee-member-info">
                          <span className="team-committee-member-name">{member.member_name}</span>
                          <span className="team-committee-member-position">{formatPosition(member.position)}</span>
                        </span>
                        <Link className="team-member-profile-link" to={`/team/sub-member/${encodeURIComponent(member.id)}`}>
                          Show profile
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="team-committee-empty">Members will be announced soon.</p>
                )}
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state clay-surface-white">
            <h3>No teams available yet</h3>
            <p>Sub-teams and committees will appear here once they have been added.</p>
          </div>
        )}
      </section>
    </main>
  );
}

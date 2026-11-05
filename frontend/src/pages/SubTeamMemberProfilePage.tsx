import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';

interface SubTeamMemberProfile {
  id: string;
  team_name: string;
  member_name: string;
  member_email: string;
  member_phone: string;
  member_bio: string;
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

export default function SubTeamMemberProfilePage() {
  const { memberId } = useParams();
  const [member, setMember] = useState<SubTeamMemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    let cancelled = false;
    setLoading(true);
    setError('');

    api<{ member: SubTeamMemberProfile }>(`/sub-teams/members/${encodeURIComponent(memberId ?? '')}`)
      .then(result => {
        if (!cancelled) setMember(result.member);
      })
      .catch(cause => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Unable to load this profile.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [memberId, reloadKey]);

  useEffect(() => {
    if (member) document.title = `${member.member_name} | ACM ITU`;
  }, [member]);

  return (
    <main className="team-page wrap sub-team-profile-page">
      {loading ? (
        <p className="team-list-status" role="status">Loading profile…</p>
      ) : error ? (
        <div className="empty-state clay-surface-white">
          <p role="alert">{error}</p>
          <button className="btn" onClick={() => setReloadKey(key => key + 1)}>Try again</button>
        </div>
      ) : member ? (
        <article className="member-profile clay-surface-white sub-team-member-profile">
          <div className="sub-profile-photo">
            {member.member_photo ? (
              <img src={member.member_photo} alt={member.member_name} />
            ) : (
              <div className="team-photo-placeholder" aria-hidden="true">
                <span>{member.member_name.split(' ').map(part => part[0]).slice(0, 2).join('').toUpperCase()}</span>
              </div>
            )}
          </div>
          <div className="sub-profile-content">
            <span className="pill sub-profile-team">{member.team_name}</span>
            <h1>{member.member_name}</h1>
            <dl className="sub-profile-details">
              <div><dt>Team &amp; Position</dt><dd>{member.team_name} · {formatPosition(member.position)}</dd></div>
              <div><dt>Email</dt><dd>{member.member_email ? <a href={`mailto:${member.member_email}`}>{member.member_email}</a> : 'Not provided'}</dd></div>
              <div><dt>Phone</dt><dd>{member.member_phone ? <a href={`tel:${member.member_phone}`}>{member.member_phone}</a> : 'Not provided'}</dd></div>
            </dl>
          </div>
        </article>
      ) : (
        <div className="empty-state clay-surface-white">
          <h1>Profile unavailable</h1>
          <p>This member profile is not available.</p>
          <Link className="btn btn-fill" to="/team">Browse the teams</Link>
        </div>
      )}
    </main>
  );
}

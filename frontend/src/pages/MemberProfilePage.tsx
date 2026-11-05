import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMember } from '../hooks/useTeam';

export default function MemberProfilePage() {
  const { memberId } = useParams();
  const { member, loading, error, retry } = useMember(memberId);
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [memberId]);
  useEffect(() => {
    if (member) document.title = `${member.name} | ACM ITU`;
  }, [member]);
  return (
    <main className="team-page wrap">
      <Link className="team-back-link" to="/team">← View Full Team</Link>
      {loading ? <p role="status">Loading profile…</p> : error ? <div className="empty-state clay-surface-white"><p role="alert">{error}</p><button className="btn" onClick={retry}>Try again</button></div> : member ? <article className="member-profile clay-surface-white">
        {member.photoUrl && <img className="team-member-photo" src={member.photoUrl} alt={member.name} />}
        <div className="team-heading"><span className="pill">{member.group}</span><h1>{member.name}</h1><p>{member.role}</p></div>
        {member.archived && <p className="form-message">Former chapter member. This profile is preserved for existing society card links.</p>}
        {(member.department || member.tenure) && <dl className="member-profile-details">
          {member.department && <div><dt>Department</dt><dd>{member.department}</dd></div>}
          {member.tenure && <div><dt>Tenure</dt><dd>{member.tenure}</dd></div>}
        </dl>}
        <h2>About</h2>
        <p className="member-profile-bio">{member.bio || 'More about this member will be shared soon.'}</p>
      </article> : <div className="empty-state clay-surface-white"><h1>Profile unavailable</h1><p>This member profile has not been published or is no longer available.</p><Link className="btn btn-fill" to="/team">Browse the team</Link></div>}
    </main>
  );
}

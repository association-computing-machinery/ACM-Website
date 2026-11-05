import { Link } from 'react-router-dom';
import type { Member } from '../data/team';

interface Props {
  member: Member;
}

export default function MemberCard({ member }: Props) {
  return (
    <Link
      to={`/team/${member.id}`}
      className="member-card clay-surface-white"
      aria-label={`${member.name}, ${member.role}`}
    >
      <div className="member-card-photo">
        {member.photoUrl ? (
          <img src={member.photoUrl} alt={member.name} />
        ) : (
          <div className="member-card-initials" aria-hidden="true">
            {member.name
              .split(' ')
              .map(w => w[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()}
          </div>
        )}
      </div>
      <div className="member-card-body">
        <p className="member-card-name">{member.name}</p>
        <p className="member-card-role">{member.role}</p>
        {member.group && (
          <span className="pill member-card-group">{member.group}</span>
        )}
      </div>
    </Link>
  );
}

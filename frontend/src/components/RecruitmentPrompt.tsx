import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api } from '../lib/api';

interface RecruitmentStatus {
  isOpen: boolean;
}

interface ApplicationStatus {
  hasApplied: boolean;
}

const CAMPUS_EMAIL_SUFFIX = '@itu.edu.pk';
const RECRUITMENT_MESSAGE = 'Recruitment is open! Our teams bring together students who plan events, design creative campaigns, build technology, support operations, and connect ACM with the campus and industry. Join a welcoming community where you can develop practical skills, collaborate with peers, and turn ideas into impact. Choose a team that fits your interests and help shape memorable experiences at ITU.';

export default function RecruitmentPrompt() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(false);
  const shownFor = useRef<string | null>(null);
  const userId = user?.id;
  const userEmail = user?.email;

  useEffect(() => {
    if (loading) return;
    if (!userId || !userEmail) {
      shownFor.current = null;
      setVisible(false);
      return;
    }

    if (!['USER', 'MEMBER'].includes(user.role)) {
      setVisible(false);
      return;
    }
    if (pathname === '/recruitment/apply'
      || !userEmail.toLowerCase().endsWith(CAMPUS_EMAIL_SUFFIX)
      || shownFor.current === userId) return;

    let active = true;
    Promise.all([
      api<RecruitmentStatus>('/recruitment/status'),
      api<ApplicationStatus>('/recruitment/applications/mine'),
    ])
      .then(([status, application]) => {
        if (!active) return;
        shownFor.current = userId;
        setVisible(status.isOpen && !application.hasApplied);
      })
      .catch(err => {
        if (active) console.error('Could not check recruitment status:', err);
      });

    return () => { active = false; };
  }, [loading, pathname, userId, userEmail, user?.role]);

  if (!visible) return null;

  return (
    <div className="am-overlay recruitment-overlay" role="dialog" aria-modal="true" aria-labelledby="recruitment-prompt-title">
      <section className="recruitment-prompt">
        <button className="recruitment-prompt-close" type="button" onClick={() => setVisible(false)} aria-label="Close recruitment announcement">
          ×
        </button>
        <span className="recruitment-eyebrow">ACM ITU · Recruitment open</span>
        <h2 id="recruitment-prompt-title">Join our community</h2>
        <p>{RECRUITMENT_MESSAGE}</p>
        <div className="recruitment-prompt-actions">
          <button type="button" className="btn" onClick={() => setVisible(false)}>Maybe later</button>
          <button
            type="button"
            className="btn btn-fill"
            onClick={() => {
              setVisible(false);
              navigate('/recruitment/apply');
            }}
          >
            Apply now
          </button>
        </div>
      </section>
    </div>
  );
}

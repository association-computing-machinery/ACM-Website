import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api } from '../lib/api';
import { ContactSection, Footer, GlobalStyles, Hero, Navbar, ProjectGallery, TeamSection } from './LandingPage';

interface Project {
  id: string;
  name: string;
  github_url: string;
  image_url: string;
  display_order: number;
}

interface TeamMembership {
  team: string;
  position: string;
}

interface AccountProfile {
  fullName: string;
  email: string;
  phone: string;
  photoUrl: string;
  memberships: TeamMembership[];
}

export default function MemberHomePage() {
  const { user, loading, error, refresh } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState('');
  const [projectsRetry, setProjectsRetry] = useState(0);

  useEffect(() => {
    if (!user || loading || user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') return;
    let active = true;
    setProjectsLoading(true);
    setProjectsError('');
    api<{ projects: Project[] }>('/projects/mine')
      .then(result => { if (active) setProjects(result.projects); })
      .catch(err => {
        if (active) setProjectsError(err instanceof Error ? err.message : 'Unable to load your projects.');
      })
      .finally(() => { if (active) setProjectsLoading(false); });
    return () => { active = false; };
  }, [user, loading, projectsRetry]);

  useEffect(() => {
    if (!user || loading) return;
    let active = true;
    setProfileLoading(true);
    setProfileError('');
    api<{ profile: AccountProfile }>('/profile/me')
      .then(result => { if (active) setProfile(result.profile); })
      .catch(err => {
        if (active) setProfileError(err instanceof Error ? err.message : 'Unable to load your profile.');
      })
      .finally(() => { if (active) setProfileLoading(false); });
    return () => { active = false; };
  }, [user, loading]);

  if (loading) {
    return <main className="member-home-state" role="status">Checking your account…</main>;
  }

  if (error) {
    return (
      <main className="member-home-state">
        <h1>We couldn’t load your account</h1>
        <p>{error}</p>
        <button type="button" className="member-home-button" onClick={() => void refresh()}>Try again</button>
      </main>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') return <Navigate to="/admin" replace />;

  return (
    <>
    <GlobalStyles />
    <Navbar showNavigation={false} account={{
      fullName: user.fullName,
      photoUrl: profile?.photoUrl,
      memberships: profile?.memberships,
    }} />
    <main className="member-home">
      <Hero
        memberPage
        memberName={user.fullName}
        memberTeams={profile?.memberships ?? []}
        memberTeamsLoading={profileLoading}
        memberTeamsError={profileError}
      />

      {projectsLoading || projectsError || projects.length > 0 ? (
        <ProjectGallery
          projects={projects}
          loading={projectsLoading}
          error={projectsError}
          onRetry={() => setProjectsRetry(value => value + 1)}
          sectionId="member-projects"
          title="Projects You're Part Of"
        />
      ) : null}
    </main>
    <TeamSection />
    <ContactSection />
    <Footer />
    </>
  );
}

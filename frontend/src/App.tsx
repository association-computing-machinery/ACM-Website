import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import PrivacyPage from "./pages/PrivacyPage";
import TermsPage from "./pages/TermsPage";
import TeamPage from "./pages/TeamPage";
import MemberProfilePage from "./pages/MemberProfilePage";
import SubTeamMemberProfilePage from "./pages/SubTeamMemberProfilePage";
import MemberHomePage from "./pages/MemberHomePage";
import AccountProfilePage from "./pages/AccountProfilePage";
import RecruitmentApplicationPage from "./pages/RecruitmentApplicationPage";
import ItuFestApplicationPage from "./pages/ItuFestApplicationPage";
import RecruitmentPrompt from "./components/RecruitmentPrompt";

// Admin Imports
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminTeam from "./pages/admin/AdminTeam";
import AdminEvents from "./pages/admin/AdminEvents";
import AdminFestModuleApplicants from "./pages/admin/AdminFestModuleApplicants";
import AdminFestModuleFormBuilder from "./pages/admin/AdminFestModuleFormBuilder";
import AdminProjects from "./pages/admin/AdminProjects";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminRecruitment from "./pages/admin/AdminRecruitment";
import AdminSettings from "./pages/admin/AdminSettings";

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ behavior: "smooth" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname, hash]);
  return null;
}

function PageMetadata() {
  const { pathname } = useLocation();

  useEffect(() => {
    const path = pathname.replace(/\/+$/, '') || '/';
    const titles: Record<string, string> = {
      '/': 'Home',
      '/auth': 'Sign In',
      '/member': 'Member Home',
      '/profile': 'My Profile',
      '/recruitment/apply': 'Team Application',
      '/itu-fest/apply': 'ITU Fest Application',
      '/privacy': 'Privacy Policy',
      '/terms': 'Terms of Service',
      '/team': 'Our Team',
      '/admin': 'Admin Dashboard',
      '/admin/team': 'Manage Teams',
      '/admin/events': 'ITU Fest Modules',
      '/admin/projects': 'Manage Projects',
      '/admin/users': 'Manage Users',
      '/admin/recruitment': 'Recruitment Management',
      '/admin/settings': 'Admin Settings',
    };
    const title = path.startsWith('/team/sub-member/')
      ? 'Team Member Profile'
      : path.startsWith('/team/')
        ? 'Team Member Profile'
        : path.startsWith('/itu-fest/apply/')
          ? 'ITU Fest Application'
        : path.startsWith('/admin/events/')
          ? path.endsWith('/form') ? 'ITU Fest Form Builder' : 'ITU Fest Applicants'
        : titles[path] ?? 'Page Not Found';

    document.title = `${title} | ACM ITU`;
  }, [pathname]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <PageMetadata />
      <ScrollToTop />
      <Routes>
        {/* Landing page is standalone — has its own Navbar/Footer */}
        <Route path="/" element={<LandingPage />} />

        <Route path="/auth" element={<AuthPage />} />
        <Route path="/member" element={<MemberHomePage />} />
        <Route path="/profile" element={<AccountProfilePage />} />
        <Route path="/recruitment/apply" element={<RecruitmentApplicationPage />} />
        <Route path="/itu-fest/apply" element={<ItuFestApplicationPage />} />
        <Route path="/itu-fest/apply/:moduleId" element={<ItuFestApplicationPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/team" element={<TeamPage />} />
        <Route path="/team/sub-member/:memberId" element={<SubTeamMemberProfilePage />} />
        <Route path="/team/:memberId" element={<MemberProfilePage />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="team" element={<AdminTeam />} />
          <Route path="events" element={<AdminEvents />} />
          <Route path="events/:moduleId/form" element={<AdminFestModuleFormBuilder />} />
          <Route path="events/:moduleId" element={<AdminFestModuleApplicants />} />
          <Route path="projects" element={<AdminProjects />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="recruitment" element={<AdminRecruitment />} />
          <Route path="admins" element={<Navigate to="/admin/settings" replace />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
      </Routes>
      <RecruitmentPrompt />
    </BrowserRouter>
  );
}

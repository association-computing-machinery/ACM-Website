import { Link } from "react-router-dom";
import { CONTACT_EMAIL, getContactComposeLink } from "../lib/contact";
const bgTexture = "https://ik.imagekit.io/acmitu/Others/background.png";

const CREAM = "rgb(247,242,238)";
const DARK = "#383838";
const MONO = "Geist Mono, ui-monospace, monospace";
const SANS = "ui-sans-serif, system-ui, sans-serif";

// Text opacities are chosen to clear WCAG AA (4.5:1) against CREAM at these
// font sizes. The previous values (0.25–0.7) measured 1.6:1–4.45:1.
const INK_78 = "rgba(56,56,56,0.78)"; // body copy
const INK_75 = "rgba(56,56,56,0.75)"; // labels, links, footer, TOC entries
const INK_72 = "rgba(56,56,56,0.72)"; // numerals, eyebrows, meta lines

// Legal documents carry a revision date; it is fixed, not computed, so the
// published date cannot drift with the visitor's clock.
const LAST_UPDATED = "October 4, 2026";

export default function PrivacyPage() {
  const contactLink = getContactComposeLink();
  return (
    <div className="privacy-page" style={{ minHeight: "100vh", backgroundColor: CREAM }}>

      {/* ── NAVBAR ── */}
      <header style={{ position: "sticky", top: 20, zIndex: 100, background: CREAM, backgroundImage: "none", backgroundColor: CREAM, borderBottom: "1px solid rgba(56,56,56,0.1)" }}>
        <nav style={{ maxWidth: 1100, margin: "0 auto", padding: "2px 2px 20px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", background: CREAM, backgroundImage: "none", backgroundColor: CREAM }}>
          <Link to="/" style={{ fontFamily: MONO, fontSize: 16, fontWeight: 800, color: DARK, textDecoration: "none" }}>ACM ITU</Link>
          <Link to="/" style={{ fontFamily: MONO, fontSize: 13, color: INK_75, textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
            Back to Home
          </Link>
        </nav>
      </header>

      <div style={{ backgroundImage: `url(${bgTexture})`, backgroundSize: "cover", backgroundAttachment: "fixed", backgroundRepeat: "repeat" }}>

      {/* ── HERO ── */}
      <div style={{ background: CREAM, padding: "72px 32px 56px", borderBottom: "1px solid rgba(56,56,56,0.08)" }}>
        <div style={{ maxWidth: 780, margin: "0 auto" }}>
          <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: INK_72, letterSpacing: "0.12em", textTransform: "uppercase" as const }}>Legal</span>
          <h1 style={{ fontFamily: MONO, fontSize: "clamp(36px, 5vw, 56px)", fontWeight: 700, color: DARK, margin: "12px 0 20px", letterSpacing: "-1.5px", lineHeight: 1.1 }}>
            Privacy Policy
          </h1>
          <p style={{ fontFamily: SANS, fontSize: 17, lineHeight: 1.7, color: INK_78, maxWidth: 580, margin: "0 0 24px" }}>
            The ACM ITU Student Chapter is committed to protecting the privacy of its members and all individuals who interact with us through this Website.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: MONO, fontSize: 12, color: INK_72 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
            Last updated: {LAST_UPDATED} · Adapted from the ACM Privacy Policy
          </div>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="privacy-layout" style={{ maxWidth: 1100, margin: "0 auto", padding: "56px 32px 80px", display: "grid", gridTemplateColumns: "220px 1fr", gap: 48, alignItems: "start" }}>

        {/* TOC — sticky inside the grid column */}
        <aside className="privacy-toc" style={{ position: "sticky", top: 80, alignSelf: "start" }} aria-label="Contents">
          <div style={{ background: CREAM, border: "1px solid rgba(56,56,56,0.1)", borderRadius: 12, padding: "16px 16px 12px" }}>
            <p style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: INK_72, letterSpacing: "0.1em", textTransform: "uppercase" as const, margin: "0 0 14px" }}>Contents</p>
            {[
              ["s1","How We Collect & Use"],["s2","Technical Information"],["s3","Third Parties"],
              ["s4","Global Transfer"],["s5","Links"],["s6","Security"],
              ["s7","Changes to Policy"],["s8","Your Rights"],["s9","Updating Information"],
              ["s10","Retention"],["s11","Contact Us"],
            ].map(([id, label], i) => (
              <a key={id} href={`#${id}`} style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: SANS, fontSize: 12, color: INK_75, textDecoration: "none", padding: "4px 0", borderBottom: i < 10 ? "1px solid rgba(56,56,56,0.06)" : "none" }}>
                <span style={{ fontFamily: MONO, fontSize: 10, color: INK_72, flexShrink: 0 }}>{String(i+1).padStart(2,"0")}</span>
                {label}
              </a>
            ))}
          </div>
        </aside>

        {/* Content */}
        <main className="privacy-body">
          {[
            { id:"s1", num:"01", title:"How We Collect & Use Your Information", content: (
              <>
                <p>ACM ITU only collects Personal Information that is relevant to its activities and seeks to ensure that it is accurate and up to date. Personal Information we may collect includes your name, email address, phone number, university department, and year of study.</p>
                <p>We may use your Personal Information to:</p>
                <ul><li>Correspond and stay in touch with you regarding ACM ITU activities, events, and updates.</li><li>Process your membership registration and manage your account.</li><li>Process your registration for events, workshops, competitions, or other activities.</li><li>Improve our Website and community offerings to better serve members.</li><li>Comply with our legal obligations.</li></ul>
                <p>We will only process your personal data where we have a legal basis for doing so, including to fulfill our agreement with you, to pursue our legitimate interests, to comply with applicable law, or where we have your consent.</p>
                <p><strong>Member Databases</strong></p>
                <p>ACM ITU maintains member databases containing mailing and profile information. This information is used by authorized ACM ITU staff to process registrations, send event announcements, and respond to inquiries.</p>
                <p><strong>ACM ITU Emails</strong></p>
                <p>ACM ITU does not sell, rent, or exchange email addresses of its members or users. We do not send newsletters or marketing email: the only messages this Website sends are the verification and password-reset codes you request. To stop receiving chapter correspondence, or to ask us to delete your details, email <a href={contactLink.href} target={contactLink.target} rel={contactLink.target === '_blank' ? 'noopener noreferrer' : undefined}>{CONTACT_EMAIL}</a>.</p>
                <p><strong>Web Accounts</strong></p>
                <p>To create an account, you will be asked to provide your name, university email address, and create a password.</p>
              </>
            )},
            { id:"s2", num:"02", title:"Technical Personal Information", content: (
              <><p>ACM ITU may keep access logs containing information such as a visitor's IP address. We may analyze log files periodically to help maintain and improve our Website. Raw log files are treated as confidential.</p><p>ACM ITU only uses cookies as necessary to operate the Website and does not use user-specific targeting cookies. We use a single essential session cookie to keep you signed in; it is not used for tracking or advertising.</p></>
            )},
            { id:"s3", num:"03", title:"Third Parties", content: (
              <><p>From time to time, we may share Personal Information with third parties where we have your consent, it is necessary for services you requested, it is required for event registration, or it is required by legal process.</p><p>We require all third parties to use personal information only for authorized purposes consistent with this Policy.</p><p>Images you upload (for example a profile photo) are stored and delivered by <strong>ImageKit</strong>, our image hosting provider, which receives the file and the request metadata needed to serve it. Emails are delivered through our email provider, which processes the recipient address and message content.</p><p>Names, roles and photos of chapter members are published on the public Team page of this Website. Tell us if you do not want your details published, or if you want an image removed.</p></>
            )},
            { id:"s4", num:"04", title:"Global Transfer of Personal Information", content: (
              <><p>ACM ITU is based at Information Technology University, Lahore, Pakistan. Personal information you provide may be transferred to and stored on servers operated by ACM ITU or its partners. We take all appropriate steps to protect it.</p><p>By submitting your Personal Information, you acknowledge this potential transfer, storage, and processing.</p></>
            )},
            { id:"s5", num:"05", title:"Links", content: (
              <p>Our Website may contain links to third-party websites. Those websites have their own privacy policies and we do not accept responsibility for those policies. Please check before you submit any Personal Information to those websites.</p>
            )},
            { id:"s6", num:"06", title:"Security", content: (
              <><p>We maintain all personal data with technical, administrative, and physical safeguards to protect against loss, unauthorized access, destruction, misuse, modification, and improper disclosure.</p>
              <div style={{ background: "#F4FFC9", border: "1px solid rgba(56,56,56,0.12)", borderRadius: 10, padding: "16px 20px", fontFamily: SANS, fontSize: 14, lineHeight: 1.65, color: DARK, margin: "16px 0" }}>No computer system can ever be fully protected against every possible hazard. ACM ITU provides reasonable and appropriate security controls to protect personal information against foreseeable hazards.</div></>
            )},
            { id:"s7", num:"07", title:"Changes to this Policy", content: (
              <p>Any changes we may make to this Policy will be posted on our Website. By continuing to use our Website, you will be deemed to have accepted any revised terms.</p>
            )},
            { id:"s8", num:"08", title:"Your Rights", content: (
              <><p>Subject to applicable data protection laws, you have the following rights:</p><ul><li>The right to request erasure of your Personal Information.</li><li>The right to restrict or stop processing of your Personal Information.</li><li>The right to access the Personal Information we hold about you.</li><li>The right to correct any inaccurate Personal Information.</li><li>The right to withdraw consent to processing at any time.</li></ul><p>To exercise any of these rights, contact us at <a href={contactLink.href} target={contactLink.target} rel={contactLink.target === '_blank' ? 'noopener noreferrer' : undefined}>{CONTACT_EMAIL}</a>.</p></>
            )},
            { id:"s9", num:"09", title:"Updating Your Information", content: (
              <><p>You can find out what Personal Information ACM ITU holds about you by contacting us at <a href={contactLink.href} target={contactLink.target} rel={contactLink.target === '_blank' ? 'noopener noreferrer' : undefined}>{CONTACT_EMAIL}</a>.</p><p>To correct or update your details, email us at <a href={contactLink.href} target={contactLink.target} rel={contactLink.target === '_blank' ? 'noopener noreferrer' : undefined}>{CONTACT_EMAIL}</a> and a chapter administrator will apply the change. The Website does not currently offer self-service profile editing.</p></>
            )},
            { id:"s10", num:"10", title:"Retention of Personal Information", content: (
              <><p>We will only retain your Personal Information for as long as reasonably necessary to fulfill the purposes we collected it for, including satisfying any legal, regulatory, or reporting requirements.</p></>
            )},
            { id:"s11", num:"11", title:"Contact Us", content: (
              <><p>Questions, comments, and requests regarding this Privacy Policy should be sent to:</p>
              <div style={{ background: CREAM, border: "1px solid rgba(56,56,56,0.1)", borderRadius: 10, padding: "20px 24px", fontFamily: SANS, fontSize: 14, lineHeight: 2, color: DARK }}>
                ACM ITU Student Chapter<br/>
                Information Technology University, Lahore, Pakistan<br/>
                Email: <a href={contactLink.href} target={contactLink.target} rel={contactLink.target === '_blank' ? 'noopener noreferrer' : undefined} style={{ color: DARK }}>{CONTACT_EMAIL}</a><br/>
                Instagram: <a href="https://www.instagram.com/acmxitu" target="_blank" rel="noopener noreferrer" style={{ color: DARK }}>@acmxitu</a>
              </div></>
            )},
          ].map(({ id, num, title, content }) => (
            <section key={id} id={id} style={{ marginBottom: 56, paddingBottom: 56, borderBottom: "1px solid rgba(56,56,56,0.08)" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 20 }}>
                <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: INK_72, flexShrink: 0 }}>{num}</span>
                <h2 style={{ fontFamily: MONO, fontSize: "clamp(18px, 2vw, 24px)", fontWeight: 700, color: DARK, margin: 0, letterSpacing: "-0.5px" }}>{title}</h2>
              </div>
              <div style={{ fontFamily: SANS, fontSize: 15, lineHeight: 1.8, color: INK_78 }}>
                {content}
              </div>
            </section>
          ))}
        </main>
      </div>

      {/* ── FOOTER ── */}
      <div style={{ borderTop: "1px solid rgba(56,56,56,0.1)", background: CREAM, padding: "24px 32px", textAlign: "center" as const, fontFamily: SANS, fontSize: 13, color: INK_75 }}>
        © {new Date().getFullYear()} ACM ITU Student Chapter — Information Technology University, Lahore
        <span style={{ margin: "0 12px" }}>·</span>
        <Link to="/terms" style={{ color: INK_75, textDecoration: "underline" }}>Terms</Link>
        <span style={{ margin: "0 8px" }}>·</span>
        <Link to="/" style={{ color: INK_75, textDecoration: "underline" }}>Home</Link>
      </div>
      </div>

      {/* Only the responsive grid needs a stylesheet: the inline
          grid-template-columns beats a plain rule, so the mobile override needs
          !important. Everything else lives in the scoped .privacy-page rules in
          global.css. */}
      <style>{`
        @media (max-width: 768px) {
          .privacy-layout { grid-template-columns: 1fr !important; gap: 32px !important; }
          .privacy-toc { position: static !important; }
        }
      `}</style>
    </div>
  );
}

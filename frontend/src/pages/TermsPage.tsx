import { Link } from "react-router-dom";
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

// Fixed revision date — not computed, so the published date cannot drift.
const LAST_UPDATED = "October 4, 2026";

export default function TermsPage() {
  const sections = [
    { id:"s1",  num:"01", title:"Your ACM ITU Account",           content: <><p>If you create an account on the Website, you are responsible for maintaining its security and are fully responsible for all activities that occur under the account.</p><p>You must immediately notify ACM ITU of any unauthorized uses of your account or any other breaches of security.</p></> },
    { id:"s2",  num:"02", title:"Responsibility of Contributors",  content: <><p>If you post material to the Website, you are entirely responsible for the content of, and any harm resulting from, that Content. By making Content available, you represent and warrant that:</p><ul><li>The Content will not infringe proprietary rights of any third party.</li><li>You have received any necessary permissions from your employer.</li><li>You have complied with any third-party licenses relating to the Content.</li><li>The Content does not contain viruses, malware, or other harmful content.</li><li>The Content is not spam, pornographic, threatening, or misleading.</li></ul></> },
    { id:"s3",  num:"03", title:"User Content License",            content: <><p>User contributions are licensed under a <strong>Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License</strong>. ACM ITU has the right to refuse or remove any content that violates any policy or is harmful or objectionable.</p></> },
    { id:"s4",  num:"04", title:"Fees",                            content: <><p>The Website is free to use. ACM ITU does not sell subscriptions, hosting, or support services through the Website, and does not collect payments of any kind — so there is nothing to renew, cancel, or refund.</p><p>Any future paid activity would be announced separately, with its own terms, before it applied to you.</p></> },
    { id:"s5",  num:"05", title:"Availability of the Service",     content: <><p>ACM ITU provides this Website free of charge to its members and visitors, and does not offer paid hosting or support services. Features may change, and access may be interrupted or withdrawn.</p></> },
    { id:"s6",  num:"06", title:"Responsibility of Visitors",      content: <><p>ACM ITU has not reviewed all material posted to the Website and cannot be responsible for that material's content, use, or effects.</p><p>You are responsible for taking precautions to protect yourself and your computer systems from viruses and other harmful content.</p></> },
    { id:"s7",  num:"07", title:"Content on Other Websites",       content: <><p>ACM ITU has not reviewed all material on websites to which it links and is not responsible for their contents. By linking to a third-party website, ACM ITU does not represent that it endorses such website.</p></> },
    { id:"s8",  num:"08", title:"Copyright & DMCA Policy",         content: <><p>If you believe that material located on or linked to by the ACM ITU Website violates your copyright, you are encouraged to notify ACM ITU in accordance with ACM's DMCA Policy.</p><p>ACM ITU will respond to all such notices, including by removing the infringing material or disabling links to it.</p></> },
    { id:"s9",  num:"09", title:"Intellectual Property",           content: <><p>This Agreement does not transfer from ACM ITU to you any ACM ITU or third-party intellectual property. All right, title and interest in such property will remain solely with ACM ITU.</p><p>Your use of the Website grants you no right or license to reproduce or use any ACM ITU or third-party trademarks.</p></> },
    { id:"s10", num:"10", title:"Advertising",                     content: <p>This Website displays no advertising, and there is no ad-free tier to purchase.</p> },
    { id:"s11", num:"11", title:"Attribution",                     content: <p>ACM ITU does not insert attribution footers or toolbars into your content, and does not require you to display ACM ITU branding.</p> },
    { id:"s12", num:"12", title:"Changes",                         content: <><p>ACM ITU reserves the right to modify or replace any part of this Agreement at its sole discretion. It is your responsibility to check this Agreement periodically for changes. Your continued use of the Website constitutes acceptance of those changes.</p></> },
    { id:"s13", num:"13", title:"Termination",                     content: <><p>ACM ITU may terminate your access to all or any part of the Website at any time, with or without cause, effective immediately.</p><p>All provisions of this Agreement which by their nature should survive termination shall survive, including ownership provisions, warranty disclaimers, indemnity, and limitations of liability.</p></> },
    { id:"s14", num:"14", title:"Disclaimer of Warranties",        content: <><div style={{ background: "#F4FFC9", border: "1px solid rgba(56,56,56,0.12)", borderRadius: 10, padding: "16px 20px", fontFamily: SANS, fontSize: 14, lineHeight: 1.65, color: DARK, margin: "0 0 16px" }}>The Website is provided "as is". ACM ITU and its suppliers and licensors hereby disclaim all warranties of any kind, express or implied, including the warranties of merchantability, fitness for a particular purpose, and non-infringement.</div><p>You understand that you download from, or otherwise obtain content or services through, the Website at your own discretion and risk.</p></> },
    { id:"s15", num:"15", title:"Limitation of Liability",         content: <><p>In no event will ACM ITU, or its suppliers or licensors, be liable for any special, incidental or consequential damages, the cost of procurement for substitute products or services, interruption of use or loss of data, or any amounts that exceed the fees paid by you to ACM ITU during the twelve month period prior to the cause of action.</p></> },
    { id:"s16", num:"16", title:"General Representation",          content: <><p>You represent and warrant that your use of the Website will be in strict accordance with the ACM ITU Privacy Policy, this Agreement, and all applicable laws, and will not infringe the intellectual property rights of any third party.</p></> },
    { id:"s17", num:"17", title:"Indemnification",                 content: <p>You agree to indemnify and hold harmless ACM ITU, its contractors, and its licensors from and against any and all claims and expenses, including attorneys' fees, arising out of your use of the Website, including but not limited to your violation of this Agreement.</p> },
    { id:"s18", num:"18", title:"Miscellaneous",                   content: <><p>This Agreement constitutes the entire agreement between ACM ITU and you. This Agreement will be governed by the laws applicable in the jurisdiction of the ACM ITU Student Chapter at Information Technology University, Lahore, Pakistan.</p><div style={{ background: CREAM, border: "1px solid rgba(56,56,56,0.1)", borderRadius: 10, padding: "16px 20px", fontFamily: SANS, fontSize: 13, lineHeight: 1.7, color: INK_75, marginTop: 16 }}>Adapted from the WordPress Terms of Service and the ACM.org Terms of Service for the ACM ITU Student Chapter.</div></> },
  ];

  return (
    <div className="terms-page" style={{ minHeight: "100vh", backgroundColor: CREAM }}>

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
            Terms of Service
          </h1>
          <p style={{ fontFamily: SANS, fontSize: 17, lineHeight: 1.7, color: INK_78, maxWidth: 580, margin: "0 0 24px" }}>
            Please read these terms carefully before accessing or using the ACM ITU Student Chapter website and its services.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: MONO, fontSize: 12, color: INK_72 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
            Last updated: {LAST_UPDATED} · Adapted for the ACM ITU Student Chapter
          </div>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="terms-layout" style={{ maxWidth: 1100, margin: "0 auto", padding: "56px 32px 80px", display: "grid", gridTemplateColumns: "220px 1fr", gap: 48, alignItems: "start" }}>

        {/* TOC */}
        <aside className="terms-toc" style={{ position: "sticky", top: 80, alignSelf: "flex-start" }} aria-label="Contents">
          {/* overflowY:auto (not hidden) — the 18 entries do not fit in the
              viewport, and hidden made sections 13-18 unreachable. */}
          <div style={{ background: CREAM, border: "1px solid rgba(56,56,56,0.1)", borderRadius: 12, padding: "16px 16px 12px", maxHeight: "calc(100vh - 110px)", overflowY: "auto" }}>
            <p style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: INK_72, letterSpacing: "0.1em", textTransform: "uppercase" as const, margin: "0 0 14px" }}>Contents</p>
            {sections.map(({ id, num, title }, i) => (
              <a key={id} href={`#${id}`} style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: SANS, fontSize: 12, color: INK_75, textDecoration: "none", padding: "4px 0", borderBottom: i < sections.length - 1 ? "1px solid rgba(56,56,56,0.06)" : "none", overflow: "hidden" }}>
                <span style={{ fontFamily: MONO, fontSize: 10, color: INK_72, flexShrink: 0 }}>{num}</span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{title}</span>
              </a>
            ))}
          </div>
        </aside>

        {/* Content */}
        <main className="terms-body">
          {sections.map(({ id, num, title, content }) => (
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
        <Link to="/privacy" style={{ color: INK_75, textDecoration: "underline" }}>Privacy</Link>
        <span style={{ margin: "0 8px" }}>·</span>
        <Link to="/" style={{ color: INK_75, textDecoration: "underline" }}>Home</Link>
      </div>
      </div>

      {/* Only the responsive grid needs a stylesheet. The bare p/ul/li/a rules
          that used to live here applied to EVERY page while /terms was mounted;
          the equivalent scoped rules are in global.css under .terms-page. */}
      <style>{`
        @media (max-width: 768px) {
          .terms-layout { grid-template-columns: 1fr !important; gap: 32px !important; }
          .terms-toc { position: static !important; }
        }
      `}</style>
    </div>
  );
}

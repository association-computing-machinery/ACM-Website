import { useState } from "react";
import { Link } from "react-router-dom";
import img5 from "../../assets/image_5.svg";
import img41 from "../../assets/image_41.svg";
import img1 from "../../assets/image_1.svg";
import img2 from "../../assets/image_2.svg";
import img3 from "../../assets/image_3.svg";
const bgTexture = "https://ik.imagekit.io/acmitu/Others/background.png";
import { useEffect, useRef } from "react";
import { useSite } from "../context/SiteContext";
import { api } from "../lib/api";
import { getContactComposeLink } from "../lib/contact";

interface CoreMember {
  positionKey: string;
  positionLabel: string;
  positionOrder: number;
  memberName: string;
  memberPhoto: string;
}

interface Sponsor {
  id: string;
  name: string;
  imageUrl: string;
}

/* ─────────────────────────── TOKENS ───────────────────────────── */
// color-1: #383838  color-2: #F6F2EE  color-3: #F4FFC9  color-4: #FFFFFF
// color-5 (Authentic Cream, fixed navbar + hero card fill): rgb(247, 242, 238)

const AUTHENTIC_CREAM = "rgb(247, 242, 238)";
// Total height of the fixed navbar (kept constant so every section below can
// reserve exactly this much space — logo/tabs/button stay vertically centered
// inside it, so the space above the row equals the space below it).
const NAV_HEIGHT = 28;

/**
 * Height of the fixed landing header, measured when a link is clicked: the
 * constant below describes only the inner row, while the header itself is
 * roughly twice that tall. Using the constant left section headings tucked
 * under the navbar after a nav click.
 */
function headerOffset() {
  const header = document.querySelector("header");
  const height = header instanceof HTMLElement ? header.getBoundingClientRect().height : NAV_HEIGHT;
  return height + 16;
}

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - headerOffset();
  window.scrollTo({ top, behavior: "smooth" });
}

/* ─────────────────────────── NAVBAR ───────────────────────────── */
export function Navbar({ account, showNavigation = true, rightAction }: {
  account?: {
    fullName: string;
    photoUrl?: string;
    memberships?: { team: string; position: string }[];
  };
  showNavigation?: boolean;
  rightAction?: { label: string; to: string };
} = {}) {
  const [open, setOpen] = useState(false);
  const [activeHref, setActiveHref] = useState("");

  const links = [
    { href: "#about", label: "About" },
    { href: "#events", label: "Events" },
    { href: "#projects", label: "Projects" },
    { href: "#team", label: "Team" },
    { href: "#contact", label: "Contact" },
  ];

  // Same side padding on every breakpoint/zoom level so the "ACM" mark and
  // the login button stay pinned to the true corners of the viewport instead
  // of drifting toward the center as the page is zoomed out.
  const NAV_PAD = 24;

  // Track which section is currently under the navbar so its tab can be
  // shown in bold — no hover effect, just a static "you are here" state.
  useEffect(() => {
    const ids = links
      .map((l) => account && l.href === "#projects" ? "member-projects" : l.href.slice(1))
      .filter(id => document.getElementById(id));
    const onScroll = () => {
      let current = "";
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top <= NAV_HEIGHT + 40 && rect.bottom > NAV_HEIGHT + 40) {
          current = id === "member-projects" ? "#projects" : `#${id}`;
          break;
        }
      }
      setActiveHref(current);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <header
      style={{
        position: "fixed",
        top: -7,
        left: 0,
        right: 0,
        zIndex: 100,
        // Always the fixed Authentic Cream color — never transparent, never
        // swapped on scroll, and never hidden.
        background: AUTHENTIC_CREAM,
        borderBottom: "1px solid rgba(56,56,56,0.12)",
      }}
    >
      <nav
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          minHeight: NAV_HEIGHT,
          paddingTop: 17,
          paddingBottom: 10,
          paddingLeft: NAV_PAD,
          paddingRight: 0,
        }}
      >
        {/* ── LEFT: wordmark — pinned to the true left edge ── */}
        <Link
          to={account ? "/" : "#home"}
          onClick={!account ? (e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); } : undefined}
          aria-label="ACM ITU"
          style={{
            justifySelf: "start",
            display: "flex",
            alignItems: "center",
            textDecoration: "none",
          }}
        >
          <span
            style={{
              fontFamily: "Geist Mono, ui-monospace, monospace",
              fontSize: 22,
              fontWeight: 800,
              color: "#383838",
              letterSpacing: "-0.5px",
            }}
          >
            ACM
          </span>
        </Link>

        {/* ── CENTER: tabs — grid keeps this mathematically centered
             regardless of how wide the logo or the login button are, and
             regardless of browser zoom level ── */}
        {showNavigation && (
          <div
            style={{ display: "flex", gap: 4, alignItems: "center" }}
            className="lp-nav-links"
          >
            {links.map((l) => (
              <Link
                key={l.href}
                to={account && !["#projects", "#team", "#contact"].includes(l.href)
                  ? `/${l.href}`
                  : `#${account && l.href === "#projects" ? "member-projects" : l.href.slice(1)}`}
                onClick={!account || ["#projects", "#team", "#contact"].includes(l.href)
                  ? (e) => {
                      e.preventDefault();
                      scrollToSection(account && l.href === "#projects" ? "member-projects" : l.href.slice(1));
                    }
                  : undefined}
                style={{
                  fontFamily: "Geist Mono, ui-monospace, monospace",
                  fontSize: 12,
                  color: "#383838",
                  textDecoration: "none",
                  padding: "4px 10px",
                  fontWeight: activeHref === l.href ? 700 : 500,
                }}
              >
                {l.label}
              </Link>
            ))}
          </div>
        )}

        {/* ── RIGHT: burger (mobile only) + Login button — pinned to the
             true right edge ── */}
        <div
          className="lp-nav-right"
          style={{
            gridColumn: 3,
            justifySelf: "end",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          {showNavigation && <button
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            style={{
              display: "none",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 8,
              color: "#383838",
            }}
            className="lp-burger"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              {open ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="4" y1="7" x2="20" y2="7" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="17" x2="20" y2="17" />
                </>
              )}
            </svg>
          </button>}

          {rightAction ? (
            <Link
              to={rightAction.to}
              style={{
                fontFamily: "Geist Mono, ui-monospace, monospace",
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: "0.04em",
                background: "#F4FFC9",
                color: "#383838",
                border: "1.5px solid #383838",
                padding: "10px 22px",
                borderRadius: 14,
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              {rightAction.label}
            </Link>
          ) : account ? (
            <>
              {account.memberships && account.memberships.length > 0 && (
                <div className="member-home-nav-memberships" aria-label="Your teams and positions">
                  {account.memberships.map((membership, index) => (
                    <span key={`${membership.team}-${membership.position}-${index}`}>
                      <strong>{membership.team}</strong>
                      {membership.position && <> · {membership.position}</>}
                    </span>
                  ))}
                </div>
              )}
              <Link
                  to="/profile"
                  className="lp-account-id member-home-id"
                  title={`View profile for ${account.fullName}`}
                  aria-label={`View profile for ${account.fullName}`}
                >
                  {account.photoUrl ? (
                    <img src={account.photoUrl} alt="" />
                  ) : (
                    account.fullName.trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase()).join("")
                  )}
              </Link>
            </>
          ) : (
            <a
              href="/auth"
              style={{
                fontFamily: "Geist Mono, ui-monospace, monospace",
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: "0.04em",
                background: "#F4FFC9",
                color: "#383838",
                border: "1.5px solid #383838",
                padding: "10px 22px",
                borderRadius: 14,
                textDecoration: "none",
                whiteSpace: "nowrap",
                transition: "background 0.15s cubic-bezier(0.4,0,0.2,1), color 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "#383838";
                (e.currentTarget as HTMLElement).style.color = "#F4FFC9";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "#F4FFC9";
                (e.currentTarget as HTMLElement).style.color = "#383838";
              }}
            >
              LOG IN
            </a>
          )}
        </div>
      </nav>

      {/* Mobile menu */}
      {showNavigation && open && (
        <div
          style={{
            background: AUTHENTIC_CREAM,
            borderTop: "1px solid rgba(56,56,56,0.12)",
            padding: "16px 24px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
          className="lp-mobile-menu"
        >
          {links.map((l) => (
            <Link
              key={l.href}
              to={account && !["#projects", "#team", "#contact"].includes(l.href)
                ? `/${l.href}`
                : `#${account && l.href === "#projects" ? "member-projects" : l.href.slice(1)}`}
              onClick={!account || ["#projects", "#team", "#contact"].includes(l.href)
                ? (e) => {
                    e.preventDefault();
                    setOpen(false);
                    setTimeout(() => scrollToSection(account && l.href === "#projects" ? "member-projects" : l.href.slice(1)), 50);
                  }
                : () => setOpen(false)}
              style={{
                fontFamily: "Geist Mono, ui-monospace, monospace",
                fontSize: 16,
                color: "#383838",
                textDecoration: "none",
                padding: "12px 0",
                fontWeight: activeHref === l.href ? 700 : 500,
                borderBottom: "1px solid rgba(56,56,56,0.08)",
              }}
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}

/* ─────────────────────────── HERO ─────────────────────────────── */
export function Hero({
  memberPage = false,
  memberName,
  memberTeams = [],
  memberTeamsLoading = false,
  memberTeamsError = '',
}: {
  memberPage?: boolean;
  memberName?: string;
  memberTeams?: { team: string; position: string }[];
  memberTeamsLoading?: boolean;
  memberTeamsError?: string;
}) {
  const [recruitmentOpen, setRecruitmentOpen] = useState(false);
  const [ituFestOpen, setItuFestOpen] = useState(false);

  useEffect(() => {
    if (!memberPage) {
      setRecruitmentOpen(false);
      return;
    }

    let cancelled = false;
    api<{ isOpen: boolean }>('/recruitment/status')
      .then(status => {
        if (!cancelled) setRecruitmentOpen(status.isOpen);
      })
      .catch(error => {
        if (!cancelled) {
          setRecruitmentOpen(false);
          console.error('Could not check recruitment status:', error);
        }
      });

    return () => { cancelled = true; };
  }, [memberPage]);

  useEffect(() => {
    if (!memberPage) {
      setItuFestOpen(false);
      return;
    }

    let cancelled = false;
    api<{ isOpen: boolean }>('/itu-fest/period')
      .then(status => {
        if (!cancelled) setItuFestOpen(status.isOpen);
      })
      .catch(error => {
        if (!cancelled) {
          setItuFestOpen(false);
          console.error('Could not check ITU Fest application dates:', error);
        }
      });

    return () => { cancelled = true; };
  }, [memberPage]);

  return (
    <section
      id="home"
      style={{
        backgroundImage: `url(${bgTexture})`,
        backgroundSize: "cover",
        backgroundRepeat: "repeat",
        backgroundPosition: "center",
        paddingTop: NAV_HEIGHT + 45,
        paddingBottom: 0,
        paddingLeft: 24,
        paddingRight: 24,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
      }}
    >
      {/* Card: overflow visible on desktop so image bleeds above top border */}
      <div
        style={{
          width: "min(960px, 100%)",
          margin: "0 auto",
          border: "2px solid #1a1a1a",
          borderRadius: 16,
          overflow: "visible",
          background: AUTHENTIC_CREAM,
          position: "relative",
        }}
        className="lp-hero-card"
      >
        {/* ── Desktop layout: two columns ── */}
        <div
          className="lp-hero-inner"
          style={{
            display: "grid",
            gridTemplateColumns: "44% 56%",
            minHeight: 500,
            borderRadius: 14,
          }}
        >
          {/* LEFT: copy */}
          <div
            style={{
              padding: "64px 48px 56px 52px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              position: "relative",
              zIndex: 2,
            }}
            className="lp-hero-copy"
          >
            <h1
              style={{
                fontFamily: "Geist Mono, ui-monospace, monospace",
                fontSize: "clamp(32px, 3.6vw, 50px)",
                fontWeight: 700,
                color: "#383838",
                lineHeight: 1.1,
                margin: "0 0 24px",
                letterSpacing: "-1.5px",
              }}
            >
              {memberPage ? `Hi, ${memberName}` : (
                <>
                  Empower your<br />
                  Innovation<br />
                  with ACM
                </>
              )}
            </h1>

            {memberPage && (memberTeamsLoading || memberTeamsError || memberTeams.length > 0) && (
              <div style={{ margin: "-8px 0 24px", display: "grid", gap: 8 }}>
                {memberTeamsLoading ? (
                  <p role="status" style={{ margin: 0, color: "rgba(56,56,56,0.6)", fontSize: 13 }}>
                    Loading your team information…
                  </p>
                ) : memberTeamsError ? (
                  <p role="alert" style={{ margin: 0, color: "#b42318", fontSize: 13 }}>
                    {memberTeamsError}
                  </p>
                ) : memberTeams.map((membership, index) => (
                  <p key={`${membership.team}-${membership.position}-${index}`} style={{ margin: 0, color: "rgba(56,56,56,0.7)", fontSize: 14 }}>
                    <strong>{membership.team}</strong> · {membership.position}
                  </p>
                ))}
              </div>
            )}

            <p
              style={{
                fontFamily: "ui-sans-serif, system-ui, sans-serif",
                fontSize: 15,
                lineHeight: 1.75,
                color: "rgba(56,56,56,0.6)",
                margin: "0 0 40px",
                maxWidth: 340,
              }}
              className="lp-hero-description"
            >
              {memberPage
                ? "Welcome to the ACM ITU community. We’re glad you’re here. Stay connected with your teams and explore what’s happening across the chapter."
                : "A student-run computing community that supercharges your tech career. Learn, build, compete and ship with a community that has your back."}
            </p>

            {memberPage && recruitmentOpen && (
              <div style={{ marginTop: -20, marginBottom: 24 }}>
                <p className="lp-hero-notice" style={{ margin: "0 0 12px", color: "rgba(56,56,56,0.7)", fontSize: 14 }}>
                  Recruitment is open! Apply now to join one of our teams.
                </p>
                <Link
                  to="/recruitment/apply"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                    fontFamily: "Geist Mono, ui-monospace, monospace",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#383838",
                    background: "#F4FFC9",
                    border: "1.5px solid rgba(56,56,56,0.3)",
                    borderRadius: 20,
                    padding: "12px 22px",
                    textDecoration: "none",
                    letterSpacing: "0.04em",
                  }}
                >
                  APPLY NOW
                </Link>
              </div>
            )}

            {memberPage && ituFestOpen && (
              <div style={{ marginTop: -20, marginBottom: 24 }}>
                <p className="lp-hero-notice" style={{ margin: "0 0 12px", color: "rgba(56,56,56,0.7)", fontSize: 14 }}>
                  ITU Fest applications are open! Choose a competition module and apply to participate.
                </p>
                <Link
                  to="/itu-fest/apply"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                    fontFamily: "Geist Mono, ui-monospace, monospace",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#fff",
                    background: "#0085FF",
                    border: "1.5px solid #000",
                    borderRadius: 10,
                    padding: "12px 22px",
                    textDecoration: "none",
                    letterSpacing: "0.04em",
                  }}
                >
                  APPLY TO ITU FEST
                </Link>
              </div>
            )}

            {!memberPage && (
              <>
                <div style={{ marginBottom: 20 }}>
                  <a
                    href="/auth"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 10,
                      fontFamily: "Geist Mono, ui-monospace, monospace",
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#383838",
                      background: "#F4FFC9",
                      border: "1.5px solid rgba(56,56,56,0.3)",
                      borderRadius: 20,
                      padding: "12px 22px",
                      textDecoration: "none",
                      letterSpacing: "0.04em",
                      transition: "background 0.15s, border-color 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "#e9f7a3";
                      (e.currentTarget as HTMLElement).style.borderColor = "#383838";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "#F4FFC9";
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(56,56,56,0.3)";
                    }}
                  >
                    JOIN THE CHAPTER
                  </a>
                </div>

                <p style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 14, color: "rgba(56,56,56,0.5)", margin: 0 }}>
                  Want to learn more?{" "}
                  <a
                    href="#about"
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToSection("about");
                    }}
                    style={{
                      fontFamily: "Geist Mono, ui-monospace, monospace",
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#383838",
                      textDecoration: "underline",
                      textUnderlineOffset: 3,
                      letterSpacing: "0.06em",
                    }}
                  >
                    ABOUT US
                  </a>
                </p>
              </>
            )}
          </div>

          {/* RIGHT: image container — on desktop the image is absolute inside here */}
          <div
            className="lp-hero-art"
            style={{ position: "relative", minHeight: 500 }}
          >
            {/* Desktop: bleeds above the card top border */}
            <img
              src={img5}
              alt="ACM ITU computing community illustration"
              className="lp-hero-img"
              style={{
                position: "absolute",
                bottom: 50,
                left: 70,
                width: "110%",
                height: "auto",
                pointerEvents: "none",
                zIndex: 10,
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────── BRAND MARQUEE ────────────────────────── */
function BrandMarquee() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [repeatCount, setRepeatCount] = useState(1);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    api<{ sponsors: Sponsor[] }>('/sponsors')
      .then(result => { if (active) setSponsors(result.sponsors); })
      .catch(error => console.error('Unable to load community partners:', error));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const updateRepeatCount = () => {
      setRepeatCount(Math.max(1, Math.ceil(viewport.clientWidth / 228)));
    };
    const observer = new ResizeObserver(updateRepeatCount);
    observer.observe(viewport);
    updateRepeatCount();
    return () => observer.disconnect();
  }, []);

  const repeatedSponsors = sponsors.length
    ? Array.from({ length: repeatCount }, (_, index) => sponsors[index % sponsors.length])
    : [];

  return (
    <div
      style={{
        width: "100%",
        overflow: "hidden",
        backgroundImage: `url(${bgTexture})`,
        backgroundSize: "cover",
        padding: "16px 0 40px",
      }}
    >
      <p
        style={{
          fontFamily: "Geist Mono, ui-monospace, monospace",
          fontSize: 12,
          fontWeight: 600,
          color: "rgba(56,56,56,0.45)",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          textAlign: "center",
          margin: "0 0 28px",
        }}
      >
        Our community partners
      </p>

      <div
        ref={viewportRef}
        style={{ width: "100%" }}
        onMouseEnter={(e) => {
          const track = e.currentTarget.querySelector(".lp-marquee-track") as HTMLElement;
          if (track) track.style.animationPlayState = "paused";
        }}
        onMouseLeave={(e) => {
          const track = e.currentTarget.querySelector(".lp-marquee-track") as HTMLElement;
          if (track) track.style.animationPlayState = "running";
        }}
      >
        <div
          className="lp-marquee-track"
          style={{
            display: "flex",
            width: "max-content",
            animation: "lp-marquee 20s linear infinite",
            willChange: "transform",
          }}
        >
          {[0, 1].map((set) => (
            <div
              key={set}
              aria-hidden={set === 1}
              style={{ display: "flex", gap: 48, alignItems: "center", paddingRight: 48 }}
            >
            {repeatedSponsors.map((partner, index) => (
              <div
                key={`${set}-${partner.id}-${index}`}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, width: 180 }}
              >
                <img
                  src={partner.imageUrl}
                  alt={set === 0 ? partner.name : ""}
                  style={{
                    height: 72,
                    width: 180,
                    objectFit: "contain",
                    display: "inline-block",
                    opacity: 0.85,
                    transition: "opacity 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.opacity = "1";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.opacity = "0.85";
                  }}
                />
              </div>
            ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── ABOUT ────────────────────────────── */
function About() {
  const timeline = [
    { year: "1947", title: "The Beginning", desc: "ACM was founded, uniting computing pioneers to advance knowledge, collaboration, and professional excellence worldwide." },
    { year: "1960s", title: "Shaping Computer Science", desc: "ACM expanded technical communities, influencing computer science education, research, and publications globally." },
    { year: "1980s–2000s", title: "A Global Community", desc: "ACM grew internationally, connecting researchers, educators, and students as computing transformed society." },
    { year: "Today", title: "Shaping the Future", desc: "ACM advances computing through research, education, conferences, and communities, empowering innovators worldwide." },
  ];

  return (
    <section
      id="about" className="lp-section"
      style={{
        background: "rgb(247,242,238)",
        padding: "75px 75px",
        position: "relative",
        overflow: "hidden",
      }}
    >

      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 80,
            alignItems: "start",
          }}
          className="lp-two-col"
        >
          {/* Left */}
          <div>
            <span
              style={{
                fontFamily: "Geist Mono, ui-monospace, monospace",
                fontSize: 12,
                fontWeight: 600,
                color: "rgba(56,56,56,0.5)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              01 / The Community
            </span>
            <h2
              style={{
                fontFamily: "Geist Mono, ui-monospace, monospace",
                fontSize: "clamp(22px, 4vw, 38px)",
                fontWeight: 600,
                color: "#383838",
                lineHeight: 1.1,
                margin: "16px 0 24px",
                letterSpacing: "-1.5px",
              }}
            >
              More than a society, a computing community.
            </h2>
            <p
              style={{
                fontFamily: "ui-sans-serif, system-ui, sans-serif",
                fontSize: 17,
                lineHeight: 1.75,
                color: "rgba(56,56,56,0.65)",
                margin: "0 0 30.5px",
              }}
            >
              ITUxACM is a community of innovators, developers, and problem-solvers united
              by a passion for computing. We empower students through technology,
              collaboration, learning, and leadership — creating opportunities to build
              skills, explore ideas, and shape the future.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              {[
                { value: "100+", label: "Members" },
                { value: "20+", label: "Events hosted" },
                { value: "10+", label: "Workshops run" },
                { value: "15+", label: "Projects built" },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{
                    background: "#32c5ff8e",
                    borderRadius: 13,
                    padding: "24px",
                    border: "1.5px solid rgb(23, 23, 23)",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "Geist Mono, ui-monospace, monospace",
                      fontSize: 32,
                      fontWeight: 700,
                      color: "#383838",
                      lineHeight: 1,
                    }}
                  >
                    {s.value}
                  </div>
                  <div
                    style={{
                      fontFamily: "ui-sans-serif, system-ui, sans-serif",
                      fontSize: 14,
                      color: "rgba(56,56,56,0.55)",
                      marginTop: 6,
                    }}
                  >
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div>
            <div
              style={{
                background: "#f0eae5f6",
                borderRadius: 13,
                padding: "32px",
                border: "1.5px solid rgb(32, 32, 32)",
              }}
            >
              <span
                style={{
                  fontFamily: "Geist Mono, ui-monospace, monospace",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "rgba(56,56,56,0.5)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                ACM history
              </span>
              <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 0 }}>
                {timeline.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      gap: 16,
                      paddingBottom: i < timeline.length - 1 ? 28 : 0,
                      position: "relative",
                    }}
                  >
                    {/* Line */}
                    {i < timeline.length - 1 && (
                      <div
                        style={{
                          position: "absolute",
                          left: 19,
                          top: 28,
                          bottom: 0,
                          width: 1,
                          background: "rgba(56,56,56,0.15)",
                        }}
                        aria-hidden="true"
                      />
                    )}
                    {/* Dot */}
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: "50%",
                        background: i === timeline.length - 1 ? "#383838" : "#F4FFC9",
                        border: "1px solid rgba(56,56,56,0.2)",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 1,
                      }}
                      aria-hidden="true"
                    >
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: i === timeline.length - 1 ? "#F4FFC9" : "#383838",
                        }}
                      />
                    </div>
                    <div>
                      <h4
                        style={{
                          fontFamily: "Geist Mono, ui-monospace, monospace",
                          fontSize: 14,
                          fontWeight: 600,
                          color: "#383838",
                          margin: "8px 0 6px",
                        }}
                      >
                        {item.year} — {item.title}
                      </h4>
                      <p
                        style={{
                          fontFamily: "ui-sans-serif, system-ui, sans-serif",
                          fontSize: 14,
                          lineHeight: 1.65,
                          color: "rgba(56,56,56,0.6)",
                          margin: 0,
                        }}
                      >
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────── EVENTS ──────────────────────────── */
function Events() {
  return (
    <section
      id="events" className="lp-section"
      style={{
        backgroundImage: `url(${bgTexture})`,
        backgroundSize: "cover",
        backgroundRepeat: "repeat",
        padding: "75px 75px",
        position: "relative",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ marginBottom: 56 }}>
          <span
            style={{
              fontFamily: "Geist Mono, ui-monospace, monospace",
              fontSize: 12,
              fontWeight: 600,
              color: "rgba(56,56,56,0.5)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            02 / Events
          </span>
          <h2
            style={{
              fontFamily: "Geist Mono, ui-monospace, monospace",
              fontSize: "clamp(28px, 3.5vw, 40px)",
              fontWeight: 700,
              color: "#383838",
              margin: "12px 0 0",
              letterSpacing: "-1px",
            }}
          >
            Events
          </h2>
        </div>

        <EmptyState
          icon={
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          }
          title="No upcoming events yet."
          desc="We're preparing what's next. Upcoming ACM ITU events will appear here."
        />
      </div>
    </section>
  );
}

/* ─────────────────────────── PROJECTS ─────────────────────────── */
interface LPProject { id: string; name: string; github_url: string; image_url: string; }
interface ProjectGalleryProps {
  projects: LPProject[];
  loading: boolean;
  error: string;
  onRetry: () => void;
  sectionId?: string;
  title?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}

const PROJECT_CARD_COLORS = [
  "#FF3B30", "#007AFF", "#34C759", "#FF9500", "#AF52DE",
  "#00C7BE", "#FF2D55", "#5856D6", "#FFCC00", "#32D74B",
  "#FF6B35", "#5AC8FA", "#FF375F", "#8E8E93", "#00B894",
  "#FF7A59", "#1E90FF", "#B5179E", "#FFD166", "#06D6A0",
  "#EF476F", "#118AB2", "#7B2CBF", "#F72585", "#4CC9F0",
  "#F9844A", "#2A9D8F", "#E63946", "#7209B7", "#00B4D8",
];

// Cards are ~180px wide, so a row needs this many to be wider than a typical
// viewport. The strip is translated by -50% (exactly one copy), so a copy
// narrower than the container leaves a visible gap on every cycle.
const ROW_SIZE = 10;

function buildProjectRows(items: LPProject[]) {
  // (This condition used to read `items.length <= 4 || items.length <= 15`,
  // which is always true, so the split below was dead code.)
  const chunks: LPProject[][] = [];
  if (items.length <= 15) {
    chunks.push(items);
  } else {
    for (let index = 0; index < items.length; index += ROW_SIZE) {
      chunks.push(items.slice(index, index + ROW_SIZE));
    }
    // Fold a short final row back into the previous one. The old 10/5
    // alternation left 16 projects as rows of 10, 5 and then a single stray
    // card.
    if (chunks.length > 1 && chunks[chunks.length - 1].length < ROW_SIZE) {
      const last = chunks.pop()!;
      chunks[chunks.length - 1] = [...chunks[chunks.length - 1], ...last];
    }
  }

  // Repeat each chunk until one copy is at least ROW_SIZE cards wide. Both
  // halves of the strip stay identical, so it still tiles seamlessly.
  return chunks.map((chunk, index) => {
    const copies = Math.max(1, Math.ceil(ROW_SIZE / chunk.length));
    const repeated: LPProject[] = [];
    for (let i = 0; i < copies; i += 1) repeated.push(...chunk);
    return {
      items: repeated,
      direction: index % 2 === 0 ? "rtl" as const : "ltr" as const,
    };
  });
}

function getProjectShadowColor(index: number) {
  return PROJECT_CARD_COLORS[(index * 7 + 3) % PROJECT_CARD_COLORS.length];
}

/** Only absolute http(s) URLs become links; anything else (javascript:, data:,
 *  malformed) renders as inert content instead of a clickable href. */
function safeHref(url: string | undefined) {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    return (u.protocol === 'https:' || u.protocol === 'http:') && !u.username && !u.password ? url : undefined;
  } catch { return undefined; }
}

function ProjectCard({ project, index }: { project: LPProject; index: number }) {
  const shadowColor = getProjectShadowColor(index);

  return (
    <a
      href={safeHref(project.github_url)}
      target="_blank"
      rel="noopener noreferrer"
      className="project-card-shell"
      style={{
        display: "inline-flex",
        width: 180,
        flex: "0 0 auto",
        textDecoration: "none",
        position: "relative",
        overflow: "visible",
        transition: "transform 0.12s ease",
        marginBottom: 12,
      }}
      onMouseEnter={e => {
        const inner = e.currentTarget.querySelector(".project-card-inner") as HTMLElement | null;
        if (inner) inner.style.boxShadow = `-12px 12px 0px ${shadowColor}`;
        (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)";
      }}
      onMouseLeave={e => {
        const inner = e.currentTarget.querySelector(".project-card-inner") as HTMLElement | null;
        if (inner) inner.style.boxShadow = `-8px 8px 0px ${shadowColor}`;
        (e.currentTarget as HTMLElement).style.transform = "none";
      }}
    >
      <div
        className="project-card-inner"
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          background: "#ffffff",
          border: "1.5px solid #383838",
          borderRadius: 14,
          overflow: "hidden",
          boxShadow: `-8px 8px 0px ${shadowColor}`,
          transition: "box-shadow 0.15s, transform 0.12s",
          marginBottom: 8,
          minWidth: 0,
        }}
      >
        <div style={{ width: "100%", aspectRatio: "16/9", background: "#ede9e3", overflow: "hidden", flexShrink: 0 }}>
          {project.image_url ? (
            <img src={project.image_url} alt={project.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(56,56,56,0.25)" }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
              </svg>
            </div>
          )}
        </div>

        <div style={{ padding: "10px 12px 12px", flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <h3 style={{ fontFamily: "Geist Mono, ui-monospace, monospace", fontSize: 13, fontWeight: 700, color: "#383838", margin: 0, lineHeight: 1.3 }}>
            {project.name}
          </h3>

          <div style={{ marginTop: "auto" }}>
            <span
              className="project-badge"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                width: "100%",
                padding: "8px 10px",
                borderRadius: 10,
                background: "#f5f5f5",
                border: "1px solid #383838",
                color: "#383838",
                fontFamily: "Geist Mono, ui-monospace, monospace",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                lineHeight: 1,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.167 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.014-1.703-2.782.604-3.369-1.34-3.369-1.34-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.087.636-1.337-2.22-.252-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.03-2.682-.103-.253-.447-1.27.098-2.646 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836a9.59 9.59 0 012.504.337c1.909-1.294 2.748-1.025 2.748-1.025.546 1.376.202 2.393.1 2.646.64.698 1.028 1.59 1.028 2.682 0 3.842-2.338 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.337-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
              </svg>
              Open in GitHub
            </span>
          </div>
        </div>
      </div>
    </a>
  );
}

export function ProjectGallery({
  projects,
  loading,
  error,
  onRetry,
  sectionId = 'projects',
  title = 'Community Projects',
  emptyTitle = 'No projects published yet.',
  emptyDescription = "ACM ITU projects and community work will appear here once they're published.",
}: ProjectGalleryProps) {
  return (
    <section
      id={sectionId}
      className="lp-section"
      style={{
        background: "rgb(247,242,238)",
        padding: "75px 75px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <img
        src={img41}
        alt=""
        aria-hidden="true"
        style={{ position: "absolute", right: -10, bottom: 60, width: 180, opacity: 0.45, pointerEvents: "none" }}
      />

      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ marginBottom: 56 }}>
          <span style={{ fontFamily: "Geist Mono, ui-monospace, monospace", fontSize: 12, fontWeight: 600, color: "rgba(56,56,56,0.5)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            03 / Projects
          </span>
          <h2 style={{ fontFamily: "Geist Mono, ui-monospace, monospace", fontSize: "clamp(28px, 3.5vw, 40px)", fontWeight: 700, color: "#383838", margin: "12px 0 0", letterSpacing: "-1px" }}>
            {title}
          </h2>
        </div>

        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 18 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ borderRadius: 14, overflow: "hidden", border: "1px solid rgba(56,56,56,0.1)" }}>
                <div style={{ height: 160, background: "linear-gradient(90deg, rgba(56,56,56,0.06) 25%, rgba(56,56,56,0.1) 50%, rgba(56,56,56,0.06) 75%)", backgroundSize: "200% 100%", animation: "lp-shimmer 1.5s infinite" }} />
                <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ height: 16, width: "60%", borderRadius: 6, background: "rgba(56,56,56,0.08)" }} />
                  <div style={{ height: 12, width: "80%", borderRadius: 6, background: "rgba(56,56,56,0.05)" }} />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div role="alert" style={{ padding: "24px 0" }}>
            <p style={{ margin: "0 0 12px", color: "#383838" }}>{error}</p>
            <button type="button" className="btn" onClick={onRetry}>Try again</button>
          </div>
        ) : projects.length === 0 ? (
          <EmptyState
            icon={<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>}
            title={emptyTitle}
            desc={emptyDescription}
          />
        ) : projects.length <= 4 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 18 }}>
            {projects.map((project, index) => <ProjectCard key={project.id} project={project} index={index} />)}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {buildProjectRows(projects).map((row, rowIndex) => {
              const rowItems = [...row.items, ...row.items];
              const animation = row.direction === "rtl"
                ? "lp-project-scroll-rtl 28s linear infinite"
                : "lp-project-scroll-ltr 28s linear infinite";
              return (
                <div key={`${rowIndex}-${row.direction}`} style={{ overflow: "hidden", padding: "4px 0" }}>
                  <div style={{ display: "flex", alignItems: "stretch", gap: 18, width: "max-content", animation, willChange: "transform" }}>
                    {rowItems.map((project, itemIndex) => (
                      <ProjectCard key={`${rowIndex}-${project.id}-${itemIndex}`} project={project} index={itemIndex + rowIndex * 10} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function Projects() {
  const [projects, setProjects] = useState<LPProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    // Use the shared client: a raw fetch with no response.ok check rendered a
    // backend outage as the "no projects yet" empty state.
    api<{ projects: LPProject[] }>('/projects')
      .then(d => {
        if (cancelled) return;
        setProjects(Array.isArray(d?.projects) ? d.projects : []);
      })
      .catch(err => {
        if (cancelled) return;
        setProjects([]);
        setError(err instanceof Error ? err.message : 'Projects could not be loaded.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [reloadKey]);

  return <ProjectGallery projects={projects} loading={loading} error={error} onRetry={() => setReloadKey(key => key + 1)} />;
}

/* ─────────────────────────── TEAM ─────────────────────────────── */
export function TeamSection() {
  const [coreMembers, setCoreMembers] = useState<CoreMember[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api<{ members: CoreMember[] }>('/core-team')
      .then(({ members }) => setCoreMembers(members.filter(member => member.memberName.trim())))
      .catch(() => setCoreMembers([]))
      .finally(() => setLoaded(true));
  }, []);

  return (
    <section
      id="team" className="lp-section"
      style={{
        backgroundImage: `url(${bgTexture})`,
        backgroundSize: "cover",
        backgroundRepeat: "repeat",
        padding: "75px 75px",
      }}
      aria-labelledby="team-heading"
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ marginBottom: 56 }}>
          <span
            style={{
              fontFamily: "Geist Mono, ui-monospace, monospace",
              fontSize: 12,
              fontWeight: 600,
              color: "rgba(56,56,56,0.5)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            04 / Our Teams
          </span>
          <h2
            id="team-heading"
            style={{
              fontFamily: "Geist Mono, ui-monospace, monospace",
              fontSize: "clamp(28px, 3.5vw, 40px)",
              fontWeight: 700,
              color: "#383838",
              margin: "12px 0 8px",
              letterSpacing: "-1px",
            }}
          >
            Meet the leads
          </h2>
          <p
            style={{
              fontFamily: "ui-sans-serif, system-ui, sans-serif",
              fontSize: 16,
              color: "rgba(56,56,56,0.6)",
              margin: 0,
            }}
          >
            The people bringing our computing community together.
          </p>
        </div>

        {!loaded ? (
          <div style={{ minHeight: 300 }} aria-label="Loading core team" />
        ) : coreMembers.length ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
              width: "min(100%, 960px)",
              margin: "0 auto",
              gap: 18,
            }}
            className="lp-core-team-grid"
          >
            {coreMembers.map(member => (
              <div
                key={member.positionKey}
                style={{
                  textAlign: "center",
                }}
                className="lp-core-team-card"
              >
                <div
                  style={{
                    width: "min(100%, 220px)",
                    aspectRatio: "1",
                    margin: "0 auto",
                    borderRadius: "50%",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#F4FFC9",
                    color: "#383838",
                    fontFamily: "Geist Mono, ui-monospace, monospace",
                    fontSize: 30,
                    fontWeight: 700,
                  }}
                  className="lp-core-team-photo"
                >
                  {member.memberPhoto ? (
                    <img src={member.memberPhoto} alt={member.memberName} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
                  ) : (
                    member.memberName.split(" ").map(word => word[0]).slice(0, 2).join("").toUpperCase()
                  )}
                </div>
                <div style={{ padding: "16px 10px 8px" }}>
                  <p style={{ margin: 0, color: "#383838", fontFamily: "Geist Mono, ui-monospace, monospace", fontSize: 14, fontWeight: 700 }}>
                    {member.memberName}
                  </p>
                  <p style={{ margin: "8px 0 0", color: "rgba(56,56,56,0.6)", fontSize: 13 }}>
                    {member.positionLabel}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
            }
            title="Meet our leads soon."
            desc="Our chapter leadership will appear here once the team is announced."
          />
        )}

        <div style={{ marginTop: 48, textAlign: "center" }}>
          <Link
            to="/team"
            style={{
              fontFamily: "Geist Mono, ui-monospace, monospace",
              fontSize: 15,
              fontWeight: 600,
              background: "#383838",
              color: "#F4FFC9",
              padding: "14px 32px",
              borderRadius: 20,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              transition: "background 0.15s cubic-bezier(0.4,0,0.2,1), color 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "#F4FFC9";
              (e.currentTarget as HTMLElement).style.color = "#383838";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "#383838";
              (e.currentTarget as HTMLElement).style.color = "#F4FFC9";
            }}
          >
            View Full Teams →
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── CONTACT ──────────────────────────── */
export function ContactSection() {
  const contactLink = getContactComposeLink();
  return (
    <section
      id="contact" className="lp-section"
      style={{
        background: "rgb(247,242,238)",
        padding: "80px 32px",
        position: "relative",
      }}
      aria-labelledby="contact-heading"
    >
      {/* Floating yellow squares — bob up and down with staggered delays */}
      <div aria-hidden="true" style={{ position:"absolute", top:"90%", left:"10%", width:16, height:16, border:"1px solid #383838", background:"#F4FFC9", zIndex:0, borderRadius:3, animation:"lp-bob 6s ease-in-out infinite" }} />
      <div aria-hidden="true" style={{ position:"absolute", bottom:"6%", right:"10%", width:16, height:16, border:"1px solid #383838", background:"#F4FFC9", zIndex:0, borderRadius:3, animation:"lp-bob 5s ease-in-out 1s infinite" }} />
      <div aria-hidden="true" style={{ position:"absolute", bottom:"6%", right:"62%", width:16, height:16, border:"1px solid #383838", background:"#F4FFC9", zIndex:0, borderRadius:3, animation:"lp-bob 8s ease-in-out 2s infinite" }} />
      <div aria-hidden="true" style={{ position:"absolute", bottom:"6%", right:"38%", width:16, height:16, border:"1px solid #383838", background:"#F4FFC9", zIndex:0, borderRadius:3, animation:"lp-bob 4s ease-in-out 3s infinite" }} />

      {/* Vertical dashed lines — one under each square's horizontal path */}
      {/* Square 1: left:10% → center at left:calc(10% + 8px) */}
      <div aria-hidden="true" style={{ position:"absolute", top:0, bottom:0, left:"calc(10% + 8px)", width:1, borderLeft:"1px dashed rgba(56,56,56,0.15)", zIndex:0 }} />
      {/* Square 2: right:10% → center at right:calc(10% + 8px) */}
      <div aria-hidden="true" style={{ position:"absolute", top:0, bottom:0, right:"calc(10% + 8px)", width:1, borderRight:"1px dashed rgba(56,56,56,0.15)", zIndex:0 }} />
      {/* Square 3: right:62% → center at right:calc(62% + 8px) */}
      <div aria-hidden="true" style={{ position:"absolute", top:0, bottom:0, right:"calc(62% + 8px)", width:1, borderRight:"1px dashed rgba(56,56,56,0.15)", zIndex:0 }} />
      {/* Square 4: right:38% → center at right:calc(38% + 8px) */}
      <div aria-hidden="true" style={{ position:"absolute", top:0, bottom:0, right:"calc(38% + 8px)", width:1, borderRight:"1px dashed rgba(56,56,56,0.15)", zIndex:0 }} />

      {/* THE CARD */}
      <div
        style={{
          maxWidth: 780,
          margin: "0 auto",
          position: "relative",
          zIndex: 1,
          background: "rgb(247,242,238)",
          border: "1.5px solid #383838",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "-12px 12px 0px #058BFF",
        }}
        className="lp-contact-card"
      >
        {/* Title bar */}
        <div
          style={{
            borderBottom: "1.5px solid rgba(56,56,56,0.15)",
            padding: "10px 20px",
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: 12,
          }}
          aria-hidden="true"
        >
          {["—","×","□"].map(sym => (
            <span key={sym} style={{ fontFamily:"Geist Mono, ui-monospace, monospace", fontSize:13, color:"rgba(56,56,56,0.45)", lineHeight:1 }}>{sym}</span>
          ))}
        </div>

        {/* Copy — image floats absolutely on the right */}
        <div style={{ padding: "36px 44px 40px 44px", position: "relative", minHeight: 220 }} className="lp-contact-copy">
          <h2
            id="contact-heading"
            style={{
              fontFamily: "Geist Mono, ui-monospace, monospace",
              fontSize: "clamp(28px, 3.2vw, 42px)",
              fontWeight: 700,
              color: "#383838",
              margin: "0 0 14px",
              letterSpacing: "-1px",
              lineHeight: 1.15,
              maxWidth: "55%",
            }}
          >
            Contact us!
          </h2>
          <p style={{ fontFamily:"ui-sans-serif, system-ui, sans-serif", fontSize:15, color:"rgba(56,56,56,0.6)", margin:"0 0 32px", lineHeight:1.6, maxWidth:"55%" }}>
            Have a question about ACM ITU, our events, or membership? Get in touch with our team
          </p>
          <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
            <a
              href={contactLink.href}
              target={contactLink.target}
              rel="noopener noreferrer"
              style={{
                fontFamily:"Geist Mono, ui-monospace, monospace", fontSize:13, fontWeight:700,
                background:"#F4FFC9", color:"#383838",
                border:"1.5px solid rgba(56,56,56,0.3)", borderRadius:12,
                padding:"11px 22px", textDecoration:"none",
                display:"inline-flex", alignItems:"center", gap:8,
                letterSpacing:"0.04em", transition:"background 0.15s, border-color 0.15s",
                width:"fit-content",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background="#e9f7a3"; (e.currentTarget as HTMLElement).style.borderColor="#383838"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background="#F4FFC9"; (e.currentTarget as HTMLElement).style.borderColor="rgba(56,56,56,0.3)"; }}
            >
              CONTACT US →
            </a>
          </div>

          {/* Image — floats on the right, no column */}
          <img
            src={img41}
            alt="ACM community illustration"
            className="lp-contact-art"
            style={{
              position: "absolute",
              right: 15,
              bottom: -5,
              width: 400,
              pointerEvents: "none",
            }}
          />
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── FOOTER ───────────────────────────── */
function FooterLogo() {
  const { settings } = useSite();
  return (
    <img
      src={settings.logoUrl}
      alt={settings.societyName}
      style={{ height: 55, width: "auto", display: "block" }}
    />
  );
}

export function Footer() {
  return (
    <footer
      style={{
        backgroundImage: `url(${bgTexture})`,
        backgroundSize: "cover",
        backgroundRepeat: "repeat",
        borderTop: "1px solid rgba(56,56,56,0.1)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* ── TOP SECTION ── */}
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "64px 32px 40px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr",
          gap: 40,
          alignItems: "start",
          position: "relative",
          zIndex: 1,
        }}
        className="lp-footer-grid"
      >
        {/* Logo + tagline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* ACM logo from site settings */}
            <FooterLogo />
          </div>
          <p
            style={{
              fontFamily: "ui-sans-serif, system-ui, sans-serif",
              fontSize: 13,
              lineHeight: 1.7,
              color: "rgba(56,56,56,0.55)",
              margin: 0,
              maxWidth: 200,
            }}
          >
            A student-run computing community at Information Technology University, Lahore.
          </p>
        </div>

        {/* Chapter links */}
        <div>
          <p
            style={{
              fontFamily: "Geist Mono, ui-monospace, monospace",
              fontSize: 13,
              fontWeight: 700,
              color: "#383838",
              margin: "0 0 16px",
              letterSpacing: "0.04em",
            }}
          >
            Chapter
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { href: "#about", label: "About Us" },
              { href: "#events", label: "Events" },
              { href: "#projects", label: "Projects" },
              { href: "#team", label: "Our Team" },
            ].map((l) => (
              <a
                key={l.href}
                href={l.href}
                style={{
                  fontFamily: "ui-sans-serif, system-ui, sans-serif",
                  fontSize: 14,
                  color: "rgba(56,56,56,0.6)",
                  textDecoration: "none",
                  transition: "color 0.15s",
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#383838")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(56,56,56,0.6)")}
              >
                {l.label}
              </a>
            ))}
          </div>
        </div>

        {/* Community links */}
        <div>
          <p
            style={{
              fontFamily: "Geist Mono, ui-monospace, monospace",
              fontSize: 13,
              fontWeight: 700,
              color: "#383838",
              margin: "0 0 16px",
              letterSpacing: "0.04em",
            }}
          >
            Community
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { href: "#contact", label: "Join Us" },
              { href: "https://linkedin.com/company/acm-itu", label: "LinkedIn" },
              { href: "https://www.instagram.com/acmxitu", label: "@acmxitu" },
            ].map((l) => (
              <a
                key={l.href}
                href={l.href}
                style={{
                  fontFamily: "ui-sans-serif, system-ui, sans-serif",
                  fontSize: 14,
                  color: "rgba(56,56,56,0.6)",
                  textDecoration: "none",
                  transition: "color 0.15s",
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#383838")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(56,56,56,0.6)")}
              >
                {l.label}
              </a>
            ))}
          </div>
        </div>

        {/* Right illustration column */}
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "flex-end",
            minHeight: 160,
          }}
          className="lp-footer-art"
        >
          {/* Wireframe box (image_3) behind mascot */}
          <img
            src={img3}
            alt=""
            aria-hidden="true"
            style={{
              position: "absolute",
              top: 0,
              right: 20,
              width: 180,
              opacity: 0.7,
            }}
          />
          {/* Purple coding brackets (image_2) — right side */}
          <img
            src={img2}
            alt=""
            aria-hidden="true"
            style={{
              position: "absolute",
              top: "60%",
              right: 140,
              width: 80,
              opacity: 0.85,
              zIndex: 3,
            }}
          />
          {/* Mascot (image_1) — front center */}
          <img
            src={img1}
            alt="ACM mascot"
            style={{
              width: 130,
              position: "relative",
              zIndex: 2,
              marginBottom: -20,
            }}
          />
        </div>
      </div>

      {/* ── DIVIDER ── */}
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 32px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ height: 1, background: "rgba(56,56,56,0.12)" }} />
      </div>

      {/* ── BOTTOM BAR ── */}
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "20px 32px 28px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          position: "relative",
          zIndex: 1,
        }}
        className="lp-footer-bottom"
      >
        <span
          style={{
            fontFamily: "ui-sans-serif, system-ui, sans-serif",
            fontSize: 13,
            color: "rgba(56,56,56,0.45)",
          }}
        >
          © {new Date().getFullYear()} ACM ITU Student Chapter. All rights reserved.
        </span>

        <nav aria-label="Footer legal links" style={{ display: "flex", gap: 20 }}>
          {[
            { to: "/privacy", label: "Privacy Policy" },
            { to: "/terms", label: "Terms of Service" },
          ].map((l) => (
            <Link
              key={l.to}
              to={l.to}
              style={{
                fontFamily: "ui-sans-serif, system-ui, sans-serif",
                fontSize: 13,
                color: "rgba(56,56,56,0.5)",
                textDecoration: "underline",
                textUnderlineOffset: 3,
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#383838")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(56,56,56,0.5)")}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Social icons */}
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <a href="https://www.instagram.com/acmxitu" target="_blank" rel="noopener noreferrer"
            style={{ color: "rgba(56,56,56,0.45)", transition: "color 0.15s" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#383838")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(56,56,56,0.45)")}
            aria-label="Instagram"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" /><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
            </svg>
          </a>
          <a href="https://www.linkedin.com/in/association-for-computing-machinery-acm-a58a5a438/" target="_blank" rel="noopener noreferrer"
            style={{ color: "rgba(56,56,56,0.45)", transition: "color 0.15s" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#383838")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(56,56,56,0.45)")}
            aria-label="LinkedIn"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/>
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
}

/* ──────────────────────── EMPTY STATE ─────────────────────────── */
function EmptyState({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1.5px dashed rgba(56,56,56,0.18)",
        borderRadius: 13,
        padding: "64px 32px",
        textAlign: "center",
        color: "rgba(56,56,56,0.4)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
      }}
    >
      <div style={{ color: "rgba(56,56,56,0.3)" }}>{icon}</div>
      <h3
        style={{
          fontFamily: "Geist Mono, ui-monospace, monospace",
          fontSize: 18,
          fontWeight: 600,
          color: "#383838",
          margin: 0,
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          fontSize: 15,
          lineHeight: 1.6,
          color: "rgba(56,56,56,0.5)",
          maxWidth: 400,
          margin: 0,
        }}
      >
        {desc}
      </p>
    </div>
  );
}

/* ──────────────────────── GLOBAL STYLES ───────────────────────── */
export function GlobalStyles() {
  const css = `
    @keyframes lp-bob {
      0%, 100% { transform: translateY(0px); }
      50%       { transform: translateY(-360px); }
    }
    @keyframes lp-marquee {
      from { transform: translateX(0); }
      to   { transform: translateX(-50%); }
    }
    @keyframes lp-project-scroll-rtl {
      from { transform: translateX(0); }
      to   { transform: translateX(-50%); }
    }
    @keyframes lp-project-scroll-ltr {
      from { transform: translateX(-50%); }
      to   { transform: translateX(0); }
    }
    @media (max-width: 768px) {
      .project-card-inner {
        border-radius: 12px !important;
      }
      .project-card-shell {
        width: 128px !important;
      }
      .project-card-inner h3 {
        font-size: 11px !important;
      }
      .project-card-inner .project-badge {
        padding: 7px 8px !important;
        font-size: 9px !important;
      }
    }
    @keyframes lp-shimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; overflow-x: hidden; }
    body { margin: 0; overflow-x: hidden; background-image: url(${bgTexture}); background-size: cover; background-attachment: fixed; }
    section[id] { scroll-margin-top: 64px; }

    @media (max-width: 768px) {
      .lp-nav-links  { display: none !important; }
      .lp-burger     { display: flex !important; }
      .lp-nav-right  { grid-column: 3; justify-self: end !important; }
      .lp-two-col    { grid-template-columns: 1fr !important; gap: 32px !important; }
      .lp-section    { padding-top: 48px !important; padding-bottom: 48px !important; padding-left: 35px !important; padding-right: 35px !important; }

      /* Footer responsive */
      .lp-footer-grid   { grid-template-columns: 1fr 1fr !important; gap: 32px !important; padding: 40px 24px 24px !important; }
      .lp-footer-art    { grid-column: 2 !important; grid-row: 2 !important; display: flex !important; justify-content: center !important; align-items: flex-end !important; min-height: unset !important; }
      .lp-footer-bottom { flex-direction: column !important; align-items: flex-start !important; gap: 16px !important; padding: 16px 24px 24px !important; }
      .lp-contact-card  { overflow: hidden !important; }
      .lp-contact-art   { position: static !important; width: 100% !important; max-width: 220px !important; margin: 16px auto 0 !important; display: block !important; }
      .lp-contact-copy  { max-width: 100% !important; padding: 24px 24px 16px !important; min-height: unset !important; }
      .lp-contact-copy h2 { font-size: 28px !important; max-width: 100% !important; }
      .lp-contact-copy p  { max-width: 100% !important; }
      .lp-contact-copy a  { width: fit-content !important; }

      /* Hero card: clip on mobile so image stays inside */
      .lp-hero-card  { overflow: hidden !important; }

      /* Stack copy then image */
      .lp-hero-inner {
        grid-template-columns: 1fr !important;
        min-height: unset !important;
      }
      .lp-hero-copy {
        padding: 36px 28px 24px !important;
      }
      .lp-hero-copy .lp-hero-description {
        font-size: 15px !important;
        line-height: 1.55 !important;
        margin-bottom: 28px !important;
      }
      .lp-hero-copy .lp-hero-notice {
        font-size: 14px !important;
        line-height: 1.5 !important;
        margin-bottom: 10px !important;
      }
      .lp-hero-copy > div:has(.lp-hero-notice) {
        margin-top: 0 !important;
        margin-bottom: 22px !important;
      }
      .lp-hero-art {
        min-height: 280px !important;
        width: 100% !important;
      }
      /* Image: static flow, contained in art column */
      .lp-hero-img {
        position: static !important;
        width: 85% !important;
        height: auto !important;
        display: block !important;
        margin: 0 auto !important;
        z-index: 0 !important;
      }
    }
  `;
  const ref = useRef<HTMLStyleElement | null>(null);
  useEffect(() => {
    if (ref.current) return;
    const el = document.createElement("style");
    el.setAttribute("data-lp", "1");
    el.textContent = css;
    document.head.appendChild(el);
    ref.current = el;
    return () => { el.remove(); ref.current = null; };
    // `css` is a constant template literal, so this compares equal on every
    // render and the effect still runs once.
  }, [css]);
  return null;
}

/* ──────────────────────────── PAGE ────────────────────────────── */
export default function LandingPage() {
  return (
    <>
      <GlobalStyles />
      <Navbar />
      <main>
        <Hero />
        <BrandMarquee />
        <About />
        <Events />
        <Projects />
        <TeamSection />
        <ContactSection />
      </main>
      <Footer />
    </>
  );
}
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth";
import { SITE } from "../config";
import { WhatsAppFab } from "./pay";
import { Logo } from "./ui";

const LINKS = [["/", "Home"], ["/about", "About"], ["/events", "Events"], ["/briefs", "Policy briefs"], ["/contact", "Contact"]];

function PwaInstallButton() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;

  useEffect(() => {
    setInstalled(window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true);
    const beforeInstall = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const installedApp = () => {
      setInstallPrompt(null);
      setInstalled(true);
    };
    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", installedApp);
    return () => {
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("appinstalled", installedApp);
    };
  }, []);

  const install = async () => {
    if (!installPrompt) {
      setShowHelp(true);
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setInstallPrompt(null);
  };

  if (installed) return null;
  return (
    <>
      <button className="btn btn-gold sm pwa-install" type="button" onClick={install}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 17v3h14v-3" /></svg>
        <span>Install app</span>
      </button>
      {showHelp && (
        <div className="pwa-help-backdrop" onClick={() => setShowHelp(false)}>
          <section className="pwa-help" role="dialog" aria-modal="true" aria-labelledby="pwa-help-title" onClick={(event) => event.stopPropagation()}>
            <button className="pwa-help-close" type="button" aria-label="Close" onClick={() => setShowHelp(false)}>×</button>
            <h2 id="pwa-help-title">Install KUSOPPA</h2>
            <p>{isIos
              ? "In Safari, tap the Share button, then choose Add to Home Screen and tap Add."
              : "Open your browser menu and choose Install app or Add to Home screen."}</p>
            <button className="btn btn-green sm" type="button" onClick={() => setShowHelp(false)}>Got it</button>
          </section>
        </div>
      )}
    </>
  );
}

function SocialIcon({ name }) {
  switch (name) {
    case "Instagram":
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      );
    case "LinkedIn":
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
          <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
        </svg>
      );
    case "Facebook":
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      );
    case "X":
      return (
        <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    case "Email":
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
      );
    default:
      return null;
  }
}

function FootSection({ title, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`foot-col foot-accordion ${open ? "open" : ""}`}>
      <button
        type="button"
        className="foot-heading-btn"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <h4>{title}</h4>
        <svg className="foot-chevron" viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
      <div className="foot-collapsible">
        {children}
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="foot">
      <div className="container foot-grid">
        {/* Brand column */}
        <div className="foot-brand-col">
          <Link to="/" aria-label="KUSOPPA Home">
            <Logo variant="full-white" className="foot-logo" />
          </Link>
          <p className="foot-sub">
            Kenyatta University Students of Public Policy & Administration.
          </p>
          <p className="foot-tag">
            Shaping Policies, Empowering Communities.
          </p>
          <div className="foot-socials" aria-label="Official social media links">
            {SITE.socials.map((s) => (
              <a
                key={s.label}
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className={`social-icon-btn ${s.label.toLowerCase()}`}
                aria-label={`Follow KUSOPPA on ${s.label}`}
                title={s.label}
              >
                <SocialIcon name={s.label} />
              </a>
            ))}
            <a
              href={`mailto:${SITE.email}`}
              className="social-icon-btn email"
              aria-label="Email KUSOPPA"
              title="Email us directly"
            >
              <SocialIcon name="Email" />
            </a>
          </div>
        </div>

        {/* Explore navigation */}
        <FootSection title="Explore">
          <nav className="foot-nav" aria-label="Explore pages">
            {LINKS.map(([to, l]) => <Link key={to} to={to}>{l}</Link>)}
            <Link to="/join">Join KUSOPPA</Link>
          </nav>
        </FootSection>

        {/* Membership & Resources */}
        <FootSection title="Members">
          <nav className="foot-nav" aria-label="Member resources">
            <Link to="/login">Member portal</Link>
            <Link to="/join">Membership fees</Link>
            <Link to="/about">Executive board</Link>
            <Link to="/briefs">Policy briefs</Link>
            <Link to="/events">Events & forums</Link>
          </nav>
        </FootSection>

        {/* Contact & Location */}
        <div className="foot-col">
          <h4>Get in Touch</h4>
          <div className="foot-contact-item">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
          </div>
          <div className="foot-contact-item">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>Kenyatta University Main Campus, Nairobi, Kenya</span>
          </div>
          <div className="foot-affil">
            <small>Department of Public Policy & Administration, School of Law, Arts and Social Sciences</small>
          </div>
        </div>
      </div>

      <div className="container foot-base">
        <div>&copy; {new Date().getFullYear()} KUSOPPA, Kenyatta University. All rights reserved.</div>
        <div className="foot-base-links">
          <span>Student Association</span>
          <span>•</span>
          <a href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Back to top ↑</a>
        </div>
      </div>
    </footer>
  );
}

export default function Layout() {
  const { pathname } = useLocation();
  const { me, isStaff } = useAuth();
  const cta = me ? [isStaff ? "/admin" : "/account", isStaff ? "Dashboard" : "My account"] : ["/join", "Join us"];
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => { window.scrollTo({ top: 0 }); setOpen(false); }, [pathname]);
  useEffect(() => {
    const k = (e) => e.key === "Escape" && setOpen(false);
    const s = () => setScrolled(window.scrollY > 8);
    s();
    window.addEventListener("keydown", k);
    window.addEventListener("scroll", s, { passive: true });
    return () => { window.removeEventListener("keydown", k); window.removeEventListener("scroll", s); };
  }, []);
  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className={`nav ${scrolled ? "scrolled" : ""}`}>
        <div className="container nav-in">
          <Link to="/" aria-label="KUSOPPA home"><Logo variant="short" /></Link>
          <nav className="links" aria-label="Main">
            {LINKS.map(([to, l]) => <NavLink key={to} to={to} end={to === "/"}>{l}</NavLink>)}
            {!me && <NavLink to="/login">Log in</NavLink>}
            <Link className="btn btn-gold sm" to={cta[0]}>{cta[1]}</Link>
          </nav>
          <PwaInstallButton />
          <button className={`burger ${open ? "open" : ""}`} aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}><i /><i /><i /></button>
        </div>
      </header>
      {/* Mobile drawer: hidden on desktop */}
      <aside className={`side ${open ? "open" : ""}`} aria-label="Mobile navigation">
        <Link to="/" className="side-logo" aria-label="KUSOPPA home"><Logo variant="short" /></Link>
        <p className="side-sub">Students of Public Policy and Administration, Kenyatta University</p>
        <nav aria-label="Mobile">
          {LINKS.map(([to, l]) => <NavLink key={to} to={to} end={to === "/"}>{l}</NavLink>)}
          {!me && <NavLink to="/login">Log in</NavLink>}
        </nav>
        <Link className="btn btn-gold" to={cta[0]}>{cta[1]}</Link>
        <div className="side-foot">
          <p className="side-tag">Shaping Policies, Empowering Communities</p>
          <div className="side-socials">
            {SITE.socials.map((s) => (
              <a
                key={s.label}
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="social-icon-btn dark"
                aria-label={`KUSOPPA on ${s.label}`}
                title={s.label}
              >
                <SocialIcon name={s.label} />
              </a>
            ))}
            <a
              href={`mailto:${SITE.email}`}
              className="social-icon-btn dark"
              aria-label="Email KUSOPPA"
              title="Email us"
            >
              <SocialIcon name="Email" />
            </a>
          </div>
        </div>
      </aside>
      <div className={`scrim ${open ? "show" : ""}`} onClick={() => setOpen(false)} />
      <main id="main" key={pathname} className="page"><Outlet /></main>
      <Footer />
      <WhatsAppFab />
    </>
  );
}

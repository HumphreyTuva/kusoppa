import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { fmtTime, gcal } from "../utils";

const LOGOS = { short: "/brand/logo-short.png", full: "/brand/logo-full.png", "full-white": "/brand/logo-full-white.png", emblem: "/brand/logo-emblem.png" };
export function Logo({ variant = "short", className = "" }) {
  return <img className={`brandlogo ${className}`} src={LOGOS[variant]} alt="KUSOPPA" />;
}

export function Reveal({ className = "", children }) {
  const ref = useRef(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect(); } }, { threshold: 0.12 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} className={`reveal ${on ? "in" : ""} ${className}`}>{children}</div>;
}

export function Counter({ to, suffix = "", prefix = "" }) {
  const ref = useRef(null);
  const [n, setN] = useState(0);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const tick = (t) => {
        const p = Math.min((t - t0) / 1500, 1);
        setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.6 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [to]);
  return <span ref={ref}>{prefix}{n.toLocaleString()}{suffix}</span>;
}

export const PageHead = ({ title, lead, variant = "" }) => (
  <header className={`phead ${variant}`}>
    <div className="container">
      <h1 className="in">{title}</h1>
      {lead && <p className="in" style={{ "--d": "120ms" }}>{lead}</p>}
    </div>
  </header>
);

export const SectionHead = ({ title, lead, to, link }) => (
  <div className="shead">
    <div><h2>{title}</h2>{lead && <p>{lead}</p>}</div>
    {to && <Link className="more" to={to}>{link}</Link>}
  </div>
);

export function EventRow({ e }) {
  const d = new Date(e.starts_at), past = d < new Date();
  return (
    <article className={`ev ${past ? "past" : ""}`}>
      <div className="date"><span>{d.toLocaleString("en-GB", { month: "short" })}</span><b>{d.getDate()}</b></div>
      <div>
        <h3>{e.title}</h3>
        <p className="meta"><span>{fmtTime(e.starts_at)}</span>{e.location && <span>{e.location}</span>}<span className="tag">{e.category}</span></p>
        {e.description && <p className="desc">{e.description}</p>}
      </div>
      {!past && (
        <div className="actions">
          {e.registration_url && <a className="btn btn-gold sm" href={e.registration_url} target="_blank" rel="noreferrer">Register</a>}
          <a className="btn btn-line sm" href={gcal(e)} target="_blank" rel="noreferrer">Add to calendar</a>
        </div>
      )}
    </article>
  );
}

export function BriefCard({ b }) {
  return (
    <article className="brief">
      <div className="cover"><span className="topic">{b.topic}</span><h3>{b.title}</h3></div>
      <p className="by">{b.author}<br />{b.reading_minutes} minute read</p>
      <p className="sum">{b.summary}</p>
      {b.pdf && <a className="more" href={b.pdf} target="_blank" rel="noreferrer">Download the brief</a>}
    </article>
  );
}

export function Field({ label, name, type = "text", value, onChange, required, error, as, className = "", placeholder, children, ...rest }) {
  const [showPass, setShowPass] = useState(false);
  const Tag = as || "input";
  const isPass = type === "password";
  const inputType = isPass ? (showPass ? "text" : "password") : type;

  return (
    <label className={`field ${className}`}>
      <span>{label}{required && " *"}</span>
      {isPass ? (
        <div className="field-pass-wrap">
          <input
            name={name}
            type={inputType}
            value={value}
            onChange={onChange}
            required={required}
            placeholder={placeholder}
            {...rest}
          />
          <button
            type="button"
            className="field-eye-btn"
            onClick={(e) => { e.preventDefault(); setShowPass(!showPass); }}
            aria-label={showPass ? "Hide password" : "Show password"}
            tabIndex={-1}
            title={showPass ? "Hide password" : "Show password"}
          >
            {showPass ? (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
      ) : (
        <Tag name={name} type={as ? undefined : type} value={value} onChange={onChange} required={required} rows={as === "textarea" ? 5 : undefined} placeholder={placeholder} {...rest}>{children}</Tag>
      )}
      {error && <em role="alert">{error}</em>}
    </label>
  );
}

export const Done = ({ title, text }) => (
  <div className="done" role="status">
    <svg viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="24" /><path d="M14 27l8 8 16-17" /></svg>
    <h3>{title}</h3>
    <p>{text}</p>
  </div>
);

export const Skeleton = ({ n = 3 }) => (
  <>{Array.from({ length: n }, (_, i) => <div key={i} className="skeleton" />)}</>
);

export const Check = ({ name, checked, onChange, error, children }) => (
  <div>
    <label className="check"><input type="checkbox" name={name} checked={checked} onChange={onChange} /><span>{children}</span></label>
    {error && <em className="ferr" role="alert">{error}</em>}
  </div>
);

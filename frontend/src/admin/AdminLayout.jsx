import { useEffect, useState } from "react";
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { request } from "../api";
import { useAuth } from "../auth";
import { ToastProvider } from "./kit";

const ICONS = {
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  card: "M2 6h20v12H2zM2 10h20",
  users: "M16 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM4 21a8 8 0 0 1 16 0",
  calendar: "M4 5h16v16H4zM4 10h16M8 3v4M16 3v4",
  book: "M4 4h10a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4zM8 8h6",
  award: "M12 14a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM8 13l-2 8 6-3 6 3-2-8",
  link: "M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1",
  mail: "M3 5h18v14H3zM3 6l9 7 9-7",
  sliders: "M4 6h16M4 12h16M4 18h16M9 4v4M15 10v4M8 16v4",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
  list: "M8 6h13M8 12h13M8 18h13M3 6h1M3 12h1M3 18h1",
};
const ALL = ["admin", "treasurer", "secretary"], CONTENT = ["admin", "secretary"];
const NAV = [
  { to: "/admin", label: "Dashboard", icon: "grid", end: true, roles: ALL },
  { to: "/admin/payments", label: "Payments", icon: "card", roles: ["admin", "treasurer"], badge: "pending_payments" },
  { to: "/admin/members", label: "Members", icon: "users", roles: ALL },
  { group: "Content", roles: CONTENT },
  { to: "/admin/events", label: "Events", icon: "calendar", roles: CONTENT },
  { to: "/admin/briefs", label: "Policy briefs", icon: "book", roles: CONTENT },
  { to: "/admin/board", label: "Board", icon: "award", roles: CONTENT },
  { to: "/admin/links", label: "Links", icon: "link", roles: CONTENT },
  { to: "/admin/messages", label: "Messages", icon: "mail", roles: CONTENT, badge: "unread_messages" },
  { group: "Administration", roles: ["admin", "treasurer"] },
  { to: "/admin/settings", label: "Settings", icon: "sliders", roles: ["admin", "treasurer"] },
  { to: "/admin/users", label: "Users and roles", icon: "shield", roles: ["admin"] },
  { to: "/admin/audit", label: "Audit log", icon: "list", roles: ["admin", "treasurer"] },
];

export default function AdminLayout() {
  const { me, ready, isStaff, logout } = useAuth();
  const loc = useLocation();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [counts, setCounts] = useState({});
  useEffect(() => { setOpen(false); }, [loc.pathname]);
  useEffect(() => {
    if (isStaff) request("GET", "manage/overview/").then(setCounts).catch(() => {});
  }, [isStaff, loc.pathname]);
  if (!ready) return <div className="adm-boot"><div className="skeleton" /></div>;
  if (!me) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  if (!isStaff) return <Navigate to="/account" replace />;

  const items = NAV.filter((n) => n.roles.includes(me.role));
  const title = (NAV.find((n) => n.to && (n.end ? loc.pathname === n.to : loc.pathname.startsWith(n.to))) || {}).label || "Dashboard";
  return (
    <ToastProvider>
      <div className="adm">
        <aside className={`adm-side ${open ? "open" : ""}`} aria-label="Dashboard navigation">
          <Link to="/admin" className="adm-brand"><img src="/brand/logo-full-white.png" alt="KUSOPPA" /><span>Admin dashboard</span></Link>
          <nav className="adm-nav">
            {items.map((n) => n.group ? <p key={n.group} className="adm-group">{n.group}</p> : (
              <NavLink key={n.to} to={n.to} end={n.end}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d={ICONS[n.icon]} /></svg>
                {n.label}
                {n.badge && counts[n.badge] > 0 && <span className="count">{counts[n.badge]}</span>}
              </NavLink>
            ))}
          </nav>
          <div className="adm-user">
            <b>{me.full_name}</b><small>{me.role}</small>
            <div><Link to="/">View site</Link><Link to="/account">My account</Link><button onClick={async () => { await logout(); nav("/login"); }}>Log out</button></div>
          </div>
        </aside>
        <div className={`adm-scrim ${open ? "show" : ""}`} onClick={() => setOpen(false)} />
        <div className="adm-main">
          <header className="adm-top">
            <button className={`burger ${open ? "open" : ""}`} aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}><i /><i /><i /></button>
            <h2>{title}</h2>
            <span className="role-chip">{me.role}</span>
          </header>
          <main className="adm-content"><Outlet /></main>
        </div>
      </div>
    </ToastProvider>
  );
}

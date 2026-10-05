import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { request } from "../api";
import { errText } from "../utils";

export const money = (n) => `Ksh ${Number(n || 0).toLocaleString("en-KE")}`;
export const fmtD = (d) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "");
export const fmtDT = (d) => (d ? new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "");

const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }) {
  const [list, set] = useState([]);
  const push = useCallback((msg, kind = "ok") => {
    const id = Math.random();
    set((l) => [...l, { id, msg, kind }]);
    setTimeout(() => set((l) => l.filter((t) => t.id !== id)), 4200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" aria-live="polite">{list.map((t) => <div key={t.id} className={`toast ${t.kind}`}>{t.msg}</div>)}</div>
    </ToastCtx.Provider>
  );
}

export const Badge = ({ s, children }) => <span className={`badge ${s}`}>{children || s}</span>;

export function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const k = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? "wide" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-h"><h3>{title}</h3><button className="x" onClick={onClose} aria-label="Close">&times;</button></div>
        <div className="modal-b">{children}</div>
      </div>
    </div>
  );
}

export function useLoad(path) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const load = useCallback(async () => {
    try { setErr(null); setData(await request("GET", path)); } catch (e) { setErr(errText(e)); }
  }, [path]);
  useEffect(() => { load(); }, [load]);
  return { data, err, reload: load };
}

export const PageHeader = ({ title, sub, children }) => (
  <div className="ph"><div><h1>{title}</h1>{sub && <p>{sub}</p>}</div><div className="ph-actions">{children}</div></div>
);
export const Loading = () => <div className="panel"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div>;
export const ErrorBox = ({ msg, retry }) => (
  <div className="panel err-box" role="alert"><p>{msg}</p>{retry && <button className="btn btn-line dark sm" onClick={retry}>Try again</button>}</div>
);
export const Empty = ({ title, text }) => <div className="empty-state"><h3>{title}</h3><p>{text}</p></div>;

export const Chips = ({ options, value, onChange }) => (
  <div className="filters tight" role="group">
    {options.map(([v, label, n]) => (
      <button key={v} className={`chip ${value === v ? "on" : ""}`} onClick={() => onChange(v)}>{label}{n != null && <small>{n}</small>}</button>
    ))}
  </div>
);

export function useDebounced(v, ms = 300) {
  const [d, setD] = useState(v);
  useEffect(() => { const t = setTimeout(() => setD(v), ms); return () => clearTimeout(t); }, [v, ms]);
  return d;
}

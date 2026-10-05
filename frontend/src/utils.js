import { useEffect, useState } from "react";

export const fmtTime = (d) => new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
export const fmtDate = (d) => new Date(d).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

export function gcal(e) {
  const f = (x) => new Date(x).toISOString().replace(/[-:]|\.\d{3}/g, "");
  const end = e.ends_at || new Date(new Date(e.starts_at).getTime() + 2 * 3600e3);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(e.title)}&dates=${f(e.starts_at)}/${f(end)}&location=${encodeURIComponent(e.location || "")}&details=${encodeURIComponent(e.description || "")}`;
}

export function useData(loader) {
  const [data, set] = useState(null);
  useEffect(() => {
    let on = true;
    loader().then((d) => on && set(d));
    return () => { on = false; };
  }, []);
  return data;
}

export function useTitle(t) {
  useEffect(() => {
    document.title = t ? `${t} | KUSOPPA` : "KUSOPPA | Kenyatta University Students of Public Policy and Administration";
  }, [t]);
}

// first message for one field, from a Django REST error object
export const fe = (errors, k) => { const v = errors?.[k]; return Array.isArray(v) ? v[0] : v; };
// one readable sentence from any error object
export const errText = (e) => {
  if (!e) return "Something went wrong.";
  const v = e.detail ?? Object.values(e)[0];
  const x = Array.isArray(v) ? v[0] : v;
  return typeof x === "string" ? x : "Something went wrong.";
};
export const toLocalInput = (iso) => {
  if (!iso) return "";
  const d = new Date(iso), p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

export function useForm(initial, submitFn) {
  const [values, set] = useState(initial);
  const [status, setStatus] = useState("idle");
  const [errors, setErrors] = useState({});
  const onChange = (e) => { const t = e.target; set((v) => ({ ...v, [t.name]: t.type === "checkbox" ? t.checked : t.value })); };
  const submit = async (e) => {
    if (e) e.preventDefault();
    setStatus("sending");
    setErrors({});
    try {
      const r = await submitFn(values);
      setStatus("done");
      return r;
    } catch (err) {
      setErrors(err || {});
      setStatus("error");
    }
  };
  return { values, set, onChange, submit, status, errors, reset: () => { set(initial); setStatus("idle"); setErrors({}); } };
}

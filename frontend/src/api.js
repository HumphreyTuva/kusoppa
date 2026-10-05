import { SAMPLE } from "./sample";

export const BASE = import.meta.env.VITE_API_URL || "http://localhost:8080/api";
const KEY = "kusoppa_token";
export const getToken = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
export const setToken = (t) => { try { t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY); } catch { /* storage blocked */ } };

// Public lists fall back to placeholder content if the API cannot be reached.
async function getPublic(path, fallback) {
  try {
    const r = await fetch(`${BASE}/${path}/`);
    if (!r.ok) throw new Error(r.status);
    const data = await r.json();
    if (!Array.isArray(data)) throw new Error("unexpected response");
    return data;
  } catch {
    return fallback;
  }
}

export const api = {
  events: () => getPublic("events", SAMPLE.events),
  briefs: () => getPublic("briefs", SAMPLE.briefs),
  board: () => getPublic("board", SAMPLE.board),
};

export async function request(method, path, data, opts = {}) {
  const headers = {};
  const t = getToken();
  if (t) headers.Authorization = `Token ${t}`;
  let body;
  if (data instanceof FormData) body = data;
  else if (data !== undefined) { headers["Content-Type"] = "application/json"; body = JSON.stringify(data); }
  let r;
  try {
    r = await fetch(`${BASE}/${path}`, { method, headers, body });
  } catch {
    throw { detail: ["Cannot reach the server. Check your connection and try again."] };
  }
  if (r.status === 204) return null;
  const json = await r.json().catch(() => null);
  if (!r.ok) {
    if (r.status === 401 && t && !opts.quiet401) { setToken(null); window.dispatchEvent(new Event("kusoppa-logout")); }
    throw json || { detail: ["Something went wrong. Please try again."] };
  }
  return json;
}

export const post = (path, data) => request("POST", `${path}/`, data);

export async function download(path, name) {
  const t = getToken();
  const r = await fetch(`${BASE}/${path}`, { headers: t ? { Authorization: `Token ${t}` } : {} });
  if (!r.ok) throw { detail: ["The download failed. Please try again."] };
  const a = document.createElement("a");
  a.href = URL.createObjectURL(await r.blob());
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getToken, request, setToken } from "./api";

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);
export const STAFF_ROLES = ["admin", "treasurer", "secretary"];

export function AuthProvider({ children }) {
  const [me, setMe] = useState(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const d = await request("GET", "auth/me/");
      setMe(d);
      return d;
    } catch {
      setMe(null);
      return null;
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (getToken()) refresh(); else setReady(true);
    const out = () => setMe(null);
    window.addEventListener("kusoppa-logout", out);
    return () => window.removeEventListener("kusoppa-logout", out);
  }, [refresh]);

  const login = async (email, password) => {
    const d = await request("POST", "auth/login/", { email, password });
    setToken(d.token);
    return refresh();
  };
  const googleLogin = async (credential) => {
    const d = await request("POST", "auth/google/", { credential });
    setToken(d.token);
    return refresh();
  };
  const register = async (values) => {
    const d = await request("POST", "auth/register/", values);
    setToken(d.token);
    return refresh();
  };
  const logout = async () => {
    try { await request("POST", "auth/logout/", {}, { quiet401: true }); } catch { /* already signed out */ }
    setToken(null);
    setMe(null);
  };

  return (
    <Ctx.Provider value={{ me, ready, login, googleLogin, register, logout, refresh, isStaff: STAFF_ROLES.includes(me?.role) }}>
      {children}
    </Ctx.Provider>
  );
}

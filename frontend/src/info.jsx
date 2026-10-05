import { createContext, useContext, useEffect, useState } from "react";
import { request } from "./api";

// Public settings (fees, payment number, WhatsApp, public links), loaded once.
const Ctx = createContext(null);
export const useInfo = () => useContext(Ctx);

export function InfoProvider({ children }) {
  const [info, setInfo] = useState(null);
  useEffect(() => {
    request("GET", "membership/info/", undefined, { quiet401: true }).then(setInfo).catch(() => setInfo({ error: true }));
  }, []);
  return <Ctx.Provider value={info}>{children}</Ctx.Provider>;
}

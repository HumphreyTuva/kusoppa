import { useState } from "react";
import { useInfo } from "../info";

export function CopyButton({ text }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1800); } catch { /* clipboard blocked */ }
  };
  return <button type="button" className="copy" onClick={copy}>{done ? "Copied" : "Copy"}</button>;
}

export function PayDetails({ amount }) {
  const info = useInfo();
  if (!info) return <div className="skeleton" />;
  const n = info.pochi_number;
  return (
    <div className="paycard">
      <h3>Pay by M-Pesa</h3>
      {n ? (
        <>
          <p>Send {amount != null ? <b>Ksh {amount}</b> : "the membership fee"} to our Pochi la Biashara number:</p>
          <div className="paynum"><strong>{n}</strong><CopyButton text={n} /></div>
          {info.pochi_name && <p className="muted">Account name: {info.pochi_name}</p>}
          {info.payment_note && <p className="muted">{info.payment_note}</p>}
        </>
      ) : (
        <p className="muted">The payment number will appear here once the treasurer adds it. Please check back soon.</p>
      )}
      <div className="soon"><span className="badge soon">Coming soon</span><span>Pay online with M-Pesa, right here on the site.</span></div>
    </div>
  );
}

export function WhatsAppFab() {
  const info = useInfo();
  if (!info?.whatsapp_link) return null;
  return (
    <a className="wafab" href={info.whatsapp_link} target="_blank" rel="noreferrer" aria-label="Chat with KUSOPPA on WhatsApp">
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3z" fill="#fff" />
        <path d="M11.2 9.8c0 5.3 5.7 11 11 11l1.9-2.3-3.3-1.8-1.4 1.3c-1.7-.7-3.5-2.5-4.2-4.2l1.3-1.4-1.8-3.3-2.5 2.7z" fill="#25D366" />
      </svg>
    </a>
  );
}

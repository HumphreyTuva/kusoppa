import { useEffect, useRef, useState } from "react";
import { useAuth } from "../auth";

let googleScript;

function loadGoogleIdentity() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google);
  if (googleScript) return googleScript;

  googleScript = new Promise((resolve, reject) => {
    let script = document.getElementById("google-gsi-script");
    if (!script) {
      script = document.createElement("script");
      script.id = "google-gsi-script";
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", () => {
      if (window.google?.accounts?.id) resolve(window.google);
      else reject(new Error("Google sign-in did not load."));
    }, { once: true });
    script.addEventListener("error", () => reject(new Error("Google sign-in could not be loaded.")), { once: true });
  });
  return googleScript;
}

export function GoogleButton({ onSuccess, text = "Continue with Google" }) {
  const { googleLogin } = useAuth();
  const [msg, setMsg] = useState("");
  const button = useRef(null);
  const latest = useRef({ onSuccess, googleLogin });
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  latest.current = { onSuccess, googleLogin };

  useEffect(() => {
    let mounted = true;
    if (!clientId) {
      setMsg("Google sign-in is not configured. Add VITE_GOOGLE_CLIENT_ID to the frontend environment.");
      return () => { mounted = false; };
    }
    setMsg("");
    loadGoogleIdentity().then((google) => {
      if (!mounted || !button.current) return;
      google.accounts.id.initialize({
        client_id: clientId,
        callback: async (res) => {
          if (!res.credential) return;
          try {
            if (latest.current.onSuccess) await latest.current.onSuccess(res.credential);
            else await latest.current.googleLogin(res.credential);
          } catch {
            setMsg("Could not complete Google sign-in. Please try again.");
          }
        },
      });
      button.current.replaceChildren();
      google.accounts.id.renderButton(button.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        shape: "pill",
        text: text === "Sign up with Google" ? "signup_with" : "signin_with",
        width: Math.min(button.current.clientWidth, 400),
      });
    }).catch(() => {
      if (mounted) setMsg("Google sign-in could not be loaded. Check your connection and try again.");
    });
    return () => { mounted = false; };
  }, [clientId, text]);

  const handleClick = () => {
    if (!clientId) {
      setMsg("Google sign-in is not configured. Add VITE_GOOGLE_CLIENT_ID to the frontend environment.");
    }
  };

  return (
    <div className="google-auth-box">
      <div ref={button} className="google-signin-button" onClick={handleClick} />
      {msg && <p className="google-hint" role="status">{msg}</p>}
    </div>
  );
}

import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { STAFF_ROLES, useAuth } from "../auth";
import { GoogleButton } from "../components/GoogleButton";
import { Field, PageHead } from "../components/ui";
import { fe, useForm, useTitle } from "../utils";

export default function Login() {
  useTitle("Log in");
  const { login, googleLogin } = useAuth();
  const nav = useNavigate();
  const from = useLocation().state?.from;
  const [googleErr, setGoogleErr] = useState("");
  const f = useForm({ email: "", password: "" }, async (v) => {
    const me = await login(v.email, v.password);
    nav(from || (STAFF_ROLES.includes(me?.role) ? "/admin" : "/account"), { replace: true });
  });

  const onGoogleSuccess = async (credential) => {
    try {
      setGoogleErr("");
      const me = await googleLogin(credential);
      nav(from || (STAFF_ROLES.includes(me?.role) ? "/admin" : "/account"), { replace: true });
    } catch (err) {
      setGoogleErr(err?.detail?.[0] || "Could not log in with Google.");
    }
  };

  return (
    <>
      <PageHead title="Log in" lead="Members check their status and renew here. Officials reach the dashboard." />
      <section className="section">
        <div className="container narrow">
          <GoogleButton onSuccess={onGoogleSuccess} text="Sign in with Google" />
          {googleErr && <p className="err" role="alert" style={{ marginTop: ".5rem" }}>{googleErr}</p>}
          <div className="auth-divider"><span>or with email</span></div>

          <form className="form" onSubmit={f.submit}>
            <Field label="Email" name="email" type="email" value={f.values.email} onChange={f.onChange} required />
            <Field label="Password" name="password" type="password" value={f.values.password} onChange={f.onChange} required />
            {f.status === "error" && <p className="err" role="alert">{fe(f.errors, "detail") || "Please check your details."}</p>}
            <button className="btn btn-green" disabled={f.status === "sending"}>{f.status === "sending" ? "Logging in" : "Log in"}</button>
            <p className="muted"><Link className="more" to="/forgot-password">Forgot your password?</Link></p>
            <p className="muted">New here? <Link className="more" to="/join">Become a member</Link></p>
          </form>
        </div>
      </section>
    </>
  );
}

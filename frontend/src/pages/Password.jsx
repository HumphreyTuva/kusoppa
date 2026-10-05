import { Link, useSearchParams } from "react-router-dom";
import { post } from "../api";
import { Done, Field, PageHead } from "../components/ui";
import { fe, useForm, useTitle } from "../utils";

export function Forgot() {
  useTitle("Reset password");
  const f = useForm({ email: "" }, (v) => post("auth/password-reset", v));
  return (
    <>
      <PageHead title="Reset your password" lead="Enter your email and we will send you a link." />
      <section className="section">
        <div className="container narrow">
          {f.status === "done" ? <Done title="Check your email" text="If that email has an account, a reset link is on its way." /> : (
            <form className="form" onSubmit={f.submit}>
              <Field label="Email" name="email" type="email" value={f.values.email} onChange={f.onChange} required />
              {f.status === "error" && <p className="err" role="alert">{fe(f.errors, "detail") || "Please try again."}</p>}
              <button className="btn btn-green" disabled={f.status === "sending"}>Send reset link</button>
            </form>
          )}
        </div>
      </section>
    </>
  );
}

export function Reset() {
  useTitle("Choose a new password");
  const [q] = useSearchParams();
  const f = useForm({ password: "", confirm: "" }, async (v) => {
    if (v.password !== v.confirm) throw { confirm: ["The passwords do not match."] };
    return post("auth/password-reset/confirm", { uid: q.get("uid"), token: q.get("token"), password: v.password });
  });
  return (
    <>
      <PageHead title="Choose a new password" />
      <section className="section">
        <div className="container narrow">
          {f.status === "done" ? (
            <><Done title="Password updated" text="You can now log in with your new password." /><p className="center"><Link className="btn btn-green" to="/login">Log in</Link></p></>
          ) : (
            <form className="form" onSubmit={f.submit}>
              <Field label="New password" name="password" type="password" value={f.values.password} onChange={f.onChange} required />
              <Field label="Confirm password" name="confirm" type="password" value={f.values.confirm} onChange={f.onChange} required error={fe(f.errors, "confirm")} />
              {f.status === "error" && f.errors.detail && <p className="err" role="alert">{fe(f.errors, "detail")}</p>}
              <button className="btn btn-green" disabled={f.status === "sending"}>Save password</button>
            </form>
          )}
        </div>
      </section>
    </>
  );
}

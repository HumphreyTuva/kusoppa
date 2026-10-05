import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { useInfo } from "../info";
import { GoogleButton } from "../components/GoogleButton";
import { Check, Field, PageHead } from "../components/ui";
import { fe, useForm, useTitle } from "../utils";

const LEAD = [["yes", "Yes, I am interested"], ["maybe", "Maybe later"], ["no", "Not right now"]];

export default function Register() {
  useTitle("Create account");
  const { register, googleLogin } = useAuth();
  const info = useInfo();
  const nav = useNavigate();
  const [googleErr, setGoogleErr] = useState("");
  const f = useForm(
    { full_name: "", reg_no: "", email: "", phone: "", year_of_study: "", course: "", leadership_interest: "", password: "", confirm: "", consent: false },
    async (v) => {
      if (v.password !== v.confirm) throw { confirm: ["The passwords do not match."] };
      if (!v.consent) throw { consent: ["Please agree so we can manage your membership."] };
      const { confirm, consent, ...data } = v;
      await register(data);
      nav("/account", { replace: true });
    }
  );
  const v = f.values, e = f.errors;
  const closed = info && !info.error && info.registration_open === false;

  const onGoogleSuccess = async (credential) => {
    try {
      setGoogleErr("");
      await googleLogin(credential);
      nav("/account", { replace: true });
    } catch (err) {
      setGoogleErr(err?.detail?.[0] || "Could not sign up with Google.");
    }
  };

  return (
    <>
      <PageHead variant="join" title="Create your account" lead="Step one of becoming a KUSOPPA member. You pay the fee on the next page." />
      <section className="section">
        <div className="container narrow">
          {closed ? <p className="empty">Registration is currently closed. Please check back soon.</p> : (
            <>
              <GoogleButton onSuccess={onGoogleSuccess} text="Sign up with Google" />
              {googleErr && <p className="err" role="alert" style={{ marginTop: ".5rem" }}>{googleErr}</p>}
              <div className="auth-divider"><span>or fill details</span></div>

              <form className="form" onSubmit={f.submit} noValidate>
                <Field label="Full name" name="full_name" value={v.full_name} onChange={f.onChange} required error={fe(e, "full_name")} />
              <div className="two">
                <Field label="Registration number" name="reg_no" value={v.reg_no} onChange={f.onChange} required error={fe(e, "reg_no")} />
                <Field label="Phone number" name="phone" type="tel" value={v.phone} onChange={f.onChange} required error={fe(e, "phone")} />
              </div>
              <Field label="Email" name="email" type="email" value={v.email} onChange={f.onChange} required error={fe(e, "email")} />
              <div className="two">
                <Field label="Course" name="course" value={v.course} onChange={f.onChange} error={fe(e, "course")} />
                <Field label="Year of study" name="year_of_study" as="select" value={v.year_of_study} onChange={f.onChange}>
                  <option value="">Select</option>
                  {["Year 1", "Year 2", "Year 3", "Year 4", "Alumni"].map((y) => <option key={y}>{y}</option>)}
                </Field>
              </div>
              <fieldset className="radios">
                <legend>Would you like to be considered for a leadership role in KUSOPPA in future? *</legend>
                <div>
                  {LEAD.map(([val, label]) => (
                    <label key={val} className={`radio ${v.leadership_interest === val ? "on" : ""}`}>
                      <input type="radio" name="leadership_interest" value={val} checked={v.leadership_interest === val} onChange={f.onChange} />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
                {fe(e, "leadership_interest") && <em className="ferr" role="alert">{fe(e, "leadership_interest")}</em>}
              </fieldset>
              <div className="two">
                <Field label="Password" name="password" type="password" value={v.password} onChange={f.onChange} required error={fe(e, "password")} />
                <Field label="Confirm password" name="confirm" type="password" value={v.confirm} onChange={f.onChange} required error={fe(e, "confirm")} />
              </div>
              <Check name="consent" checked={v.consent} onChange={f.onChange} error={fe(e, "consent")}>
                I agree that KUSOPPA may store my details (name, registration number, phone, email and payment code) to manage my membership. Only club officials can see them.
              </Check>
              {f.status === "error" && e.detail && <p className="err" role="alert">{fe(e, "detail")}</p>}
              <button className="btn btn-green" disabled={f.status === "sending"}>{f.status === "sending" ? "Creating account" : "Create account"}</button>
              <p className="muted">Already registered? <Link className="more" to="/login">Log in</Link></p>
            </form>
          </>
        )}
        </div>
      </section>
    </>
  );
}

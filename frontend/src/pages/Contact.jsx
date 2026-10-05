import { post } from "../api";
import { SITE } from "../config";
import { Done, Field, PageHead } from "../components/ui";
import { useForm, useTitle } from "../utils";

const first = (x) => (Array.isArray(x) ? x[0] : x);

export default function Contact() {
  useTitle("Contact");
  const f = useForm({ name: "", email: "", subject: "", message: "" }, (v) => post("contact", v));
  return (
    <>
      <PageHead title="Contact us" lead="Questions, partnerships or media enquiries: we read every message." />
      <section className="section">
        <div className="container split">
          <div>
            <h2>Reach the team</h2>
            <p>Email <a className="more" href={`mailto:${SITE.email}`}>{SITE.email}</a></p>
            <p>Or follow our latest activity:</p>
            <ul className="plain">{SITE.socials.map((s) => <li key={s.label}><a className="more" href={s.url} target="_blank" rel="noreferrer">{s.label}</a></li>)}</ul>
          </div>
          {f.status === "done" ? (
            <Done title="Message sent" text="Thank you. We will reply to your email address soon." />
          ) : (
            <form className="form" onSubmit={f.submit}>
              <Field label="Your name" name="name" value={f.values.name} onChange={f.onChange} required error={first(f.errors.name)} />
              <Field label="Email" name="email" type="email" value={f.values.email} onChange={f.onChange} required error={first(f.errors.email)} />
              <Field label="Subject" name="subject" value={f.values.subject} onChange={f.onChange} required error={first(f.errors.subject)} />
              <Field label="Message" name="message" as="textarea" value={f.values.message} onChange={f.onChange} required error={first(f.errors.message)} />
              {f.status === "error" && <p className="err" role="alert">{first(f.errors.detail) || "Please fix the highlighted fields and try again."}</p>}
              <button className="btn btn-green" disabled={f.status === "sending"}>{f.status === "sending" ? "Sending" : "Send message"}</button>
            </form>
          )}
        </div>
      </section>
    </>
  );
}

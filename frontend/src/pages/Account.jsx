import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { request } from "../api";
import { useAuth } from "../auth";
import { useInfo } from "../info";
import { PayDetails } from "../components/pay";
import { Field, PageHead } from "../components/ui";
import { fe, useForm, useTitle } from "../utils";

const LEAD = { yes: "Interested in leadership", maybe: "Maybe later", no: "Not right now", "": "Not answered" };
const day = (x) => (x ? new Date(x).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "");
const initials = (n) => (n || "").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "KU";

function cleanMpesaCode(val) {
  if (!val) return "";
  const match = val.match(/\b([A-Za-z0-9]{10})\b/);
  if (match) return match[1].toUpperCase();
  return val.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
}

export default function Account() {
  useTitle("My account");
  const { me, logout, refresh } = useAuth();
  const info = useInfo();
  const nav = useNavigate();
  const m = me.membership, st = m.status;
  const staff = me.role !== "member";
  const needsPay = !staff && ["unpaid", "expired", "rejected"].includes(st) && m.semester;
  const renewing = m.history.some((h) => h.status === "approved");
  const amount = info && !info.error ? (renewing ? info.fee_renewal : info.fee_new) : null;
  const f = useForm({ mpesa_code: "" }, async (v) => { await request("POST", "membership/pay/", v); await refresh(); });

  const [editing, setEditing] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const editForm = useForm(
    {
      full_name: me.full_name || "",
      reg_no: me.reg_no || "",
      phone: me.phone || "",
      year_of_study: me.year_of_study || "",
      course: me.course || "",
      leadership_interest: me.leadership_interest || "",
      new_password: "",
    },
    async (v) => {
      await request("PATCH", "auth/me/", v);
      await refresh();
      setSavedMsg("Your details have been updated successfully!");
      setEditing(false);
      setTimeout(() => setSavedMsg(""), 5000);
    }
  );

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        const code = cleanMpesaCode(text);
        if (code) f.set({ mpesa_code: code });
      }
    } catch {
      /* clipboard access not available or denied */
    }
  };

  const banner = staff
    ? ["active", "Official account", "You have staff access. Open the dashboard from the top button or the menu."]
    : {
        active: ["active", "You are an active member", `Your membership for ${m.semester} is active until ${day(m.semester_ends)}.`],
        pending: ["pending", "Payment received", "The treasurer will check your M-Pesa code and activate your membership. You will get an email when it is done."],
        rejected: ["rejected", "Your payment could not be confirmed", `${m.reject_reason || "The code did not match a payment."} Please submit the correct code below.`],
        expired: ["expired", "Your membership has expired", m.semester ? `Renew for ${m.semester} to stay an active member.` : "Renewal for the next semester will open soon."],
        unpaid: ["unpaid", "Complete your registration", m.semester ? `Pay the membership fee to join for ${m.semester}.` : "Payment for the next semester will open soon."],
      }[st];

  return (
    <>
      <PageHead title={`Hello, ${me.full_name.split(" ")[0]}`} lead="Your KUSOPPA membership portal." />
      <section className="section">
        <div className="container account-wrap">
          {/* Top Member Bar */}
          <div className="acc-userbar">
            <div className="acc-user-info">
              <div className="acc-avatar" aria-hidden="true">{initials(me.full_name)}</div>
              <div>
                <div className="acc-name-row">
                  <h2>{me.full_name}</h2>
                  <span className={`badge ${staff ? "role-" + me.role : st}`}>
                    {staff ? me.role : (st === "active" ? "Active member" : st)}
                  </span>
                </div>
                <div className="acc-meta">
                  {me.reg_no && <span><strong>Reg:</strong> {me.reg_no}</span>}
                  {me.year_of_study && <span><strong>Year:</strong> {me.year_of_study}</span>}
                  <span><strong>Email:</strong> {me.email}</span>
                  {me.phone && <span><strong>Phone:</strong> {me.phone}</span>}
                </div>
              </div>
            </div>
            <div className="acc-actions">
              {staff && <Link to="/admin" className="btn btn-line dark sm">Dashboard</Link>}
              <button className="btn btn-line dark sm" onClick={async () => { await logout(); nav("/"); }}>Log out</button>
            </div>
          </div>

          {/* Membership Status Banner */}
          <div className={`status ${banner[0]}`} role="status">
            <h2>{banner[1]}</h2>
            <p>{banner[2]}</p>
          </div>

          {/* Pending Verification Notice */}
          {st === "pending" && (
            <div className="acc-card acc-pending-card">
              <div className="acc-pending-header">
                <div className="acc-pending-icon" aria-hidden="true">⏳</div>
                <div>
                  <h3>Payment under review</h3>
                  <p>
                    Your M-Pesa payment code{" "}
                    <strong>{m.history[0]?.mpesa_code}</strong> (Ksh {m.history[0]?.amount}) for{" "}
                    <strong>{m.semester}</strong> has been submitted.
                  </p>
                  <p className="muted">
                    The treasurer will check your transaction against the statement and activate your membership in the admin portal. Once approved, your status will update to <strong>Active member</strong> and all member links will unlock.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Payment Card */}
          {needsPay && (
            <div className="acc-card">
              <h2>Pay and submit your code</h2>
              <PayDetails amount={amount} />
              <form className="form codeform" onSubmit={f.submit}>
                <div className="code-input-row">
                  <Field
                    label="M-Pesa confirmation code"
                    name="mpesa_code"
                    value={f.values.mpesa_code}
                    required
                    placeholder="e.g. SGH7K2L9QX"
                    className="mono-input"
                    error={fe(f.errors, "mpesa_code")}
                    onChange={(e) => f.set({ mpesa_code: cleanMpesaCode(e.target.value) })}
                  />
                  {typeof navigator !== "undefined" && navigator?.clipboard?.readText && (
                    <button type="button" className="btn btn-line dark sm paste-btn" onClick={pasteFromClipboard} title="Paste code from clipboard">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true" style={{ marginRight: 6 }}>
                        <path d="M19 2h-4.18C14.4.84 13.3 0 12 0c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm7 18H5V4h2v3h10V4h2v16z"/>
                      </svg>
                      Paste code
                    </button>
                  )}
                </div>
                <p className="muted">
                  Find it in your M-Pesa SMS confirmation, for example <strong>SGH7K2L9QX</strong>. You can paste the code or the full message above.
                </p>
                {f.status === "error" && f.errors.detail && <p className="err" role="alert">{fe(f.errors, "detail")}</p>}
                <button className="btn btn-green" disabled={f.status === "sending"}>
                  {f.status === "sending" ? "Submitting..." : "Submit payment"}
                </button>
              </form>
            </div>
          )}

          {/* Member Links & Resources */}
          {me.links.length > 0 && (
            <div className="acc-card links-card">
              <h2>Member links & resources</h2>
              <div className="acc-links-row">
                {me.links.map((l) => <a key={l.id} className="btn btn-gold" href={l.url} target="_blank" rel="noreferrer">{l.label}</a>)}
              </div>
            </div>
          )}
          {!staff && st !== "active" && (
            <p className="muted" style={{ marginBottom: "2rem" }}>
              Links such as the WhatsApp group appear here once your membership is active.
            </p>
          )}

          {/* Payment History Table (collapsible click-to-view) */}
          {m.history.length > 0 && (
            <details className="acc-details-toggle">
              <summary className="acc-details-summary">
                <span>View payment history ({m.history.length} {m.history.length === 1 ? "record" : "records"})</span>
                <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </summary>
              <div className="acc-details-body scroll">
                <table className="tbl-public">
                  <thead>
                    <tr><th>Semester</th><th>Type</th><th>Amount</th><th>Code</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {m.history.map((h) => (
                      <tr key={h.id}>
                        <td>{h.semester_name}</td>
                        <td>{h.kind}</td>
                        <td>Ksh {h.amount}</td>
                        <td className="mono">{h.mpesa_code || "None"}</td>
                        <td><span className={`badge ${h.status}`}>{h.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}

          {/* Collapsible Registration Details Drawer with Edit Mode */}
          <details className="acc-details-toggle" open={editing ? true : undefined}>
            <summary className="acc-details-summary">
              <span>Your profile & registration details</span>
              <div className="acc-summary-right">
                <button
                  type="button"
                  className="btn btn-line dark sm"
                  style={{ padding: ".25rem .8rem", fontSize: ".85rem" }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setEditing(!editing);
                  }}
                >
                  {editing ? "Cancel" : "Edit details"}
                </button>
                <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </summary>
            <div className="acc-details-body">
              {editing ? (
                <form className="form" onSubmit={editForm.submit}>
                  <Field label="Full name" name="full_name" value={editForm.values.full_name} onChange={editForm.onChange} required error={fe(editForm.errors, "full_name")} />
                  <div className="two">
                    <Field label="Registration number" name="reg_no" value={editForm.values.reg_no} onChange={editForm.onChange} error={fe(editForm.errors, "reg_no")} />
                    <Field label="Phone number" name="phone" type="tel" value={editForm.values.phone} onChange={editForm.onChange} error={fe(editForm.errors, "phone")} />
                  </div>
                  <div className="two">
                    <Field label="Course" name="course" value={editForm.values.course} onChange={editForm.onChange} error={fe(editForm.errors, "course")} />
                    <Field label="Year of study" name="year_of_study" as="select" value={editForm.values.year_of_study} onChange={editForm.onChange}>
                      <option value="">Select year</option>
                      {["Year 1", "Year 2", "Year 3", "Year 4", "Alumni"].map((y) => <option key={y} value={y}>{y}</option>)}
                    </Field>
                  </div>
                  {!staff && (
                    <Field label="Leadership interest" name="leadership_interest" as="select" value={editForm.values.leadership_interest} onChange={editForm.onChange}>
                      <option value="yes">Interested in leadership</option>
                      <option value="maybe">Maybe later</option>
                      <option value="no">Not right now</option>
                    </Field>
                  )}
                  <Field
                    label="Change password (leave blank to keep current)"
                    name="new_password"
                    type="password"
                    value={editForm.values.new_password}
                    onChange={editForm.onChange}
                    error={fe(editForm.errors, "new_password")}
                    placeholder="Enter new password if changing"
                  />
                  {editForm.status === "error" && editForm.errors.detail && <p className="err" role="alert">{fe(editForm.errors, "detail")}</p>}
                  {savedMsg && <p className="acc-success" role="status">{savedMsg}</p>}
                  <div className="acc-form-actions">
                    <button type="submit" className="btn btn-green sm" disabled={editForm.status === "sending"}>
                      {editForm.status === "sending" ? "Saving..." : "Save changes"}
                    </button>
                    <button type="button" className="btn btn-line dark sm" onClick={() => setEditing(false)}>Cancel</button>
                  </div>
                </form>
              ) : (
                <>
                  <dl className="acc-dl">
                    <div><dt>Full name</dt><dd>{me.full_name}</dd></div>
                    {me.reg_no && <div><dt>Registration number</dt><dd>{me.reg_no}</dd></div>}
                    <div><dt>Email address</dt><dd>{me.email}</dd></div>
                    <div><dt>Phone number</dt><dd>{me.phone || "Not added"}</dd></div>
                    {me.year_of_study && <div><dt>Year of study</dt><dd>{me.year_of_study}</dd></div>}
                    {me.course && <div><dt>Course</dt><dd>{me.course}</dd></div>}
                    {!staff && <div><dt>Leadership interest</dt><dd>{LEAD[me.leadership_interest]}</dd></div>}
                  </dl>
                  {savedMsg && <p className="acc-success" role="status">{savedMsg}</p>}
                </>
              )}
            </div>
          </details>
        </div>
      </section>
    </>
  );
}

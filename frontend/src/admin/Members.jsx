import { useState } from "react";
import { download, request } from "../api";
import { useAuth } from "../auth";
import { Field } from "../components/ui";
import { errText, fe } from "../utils";
import ImportWizard from "./ImportWizard";
import { Badge, Chips, Empty, ErrorBox, Loading, Modal, PageHeader, fmtD, money, useDebounced, useLoad, useToast } from "./kit";

const LEAD = { yes: "Interested", maybe: "Maybe later", no: "Not now", "": "None" };

function Detail({ m, canEdit, onClose, onSaved }) {
  const toast = useToast();
  const [v, setV] = useState({ full_name: m.full_name, reg_no: m.reg_no || "", phone: m.phone, year_of_study: m.year_of_study, course: m.course, leadership_interest: m.leadership_interest });
  const [edit, setEdit] = useState(false);
  const [errs, setErrs] = useState({});
  const set = (e) => setV((s) => ({ ...s, [e.target.name]: e.target.value }));
  const save = async (e) => {
    e.preventDefault(); setErrs({});
    try { await request("PATCH", `manage/members/${m.id}/`, v); toast("Member updated."); onSaved(); } catch (x) { setErrs(x || {}); }
  };
  return (
    <Modal title={m.full_name} onClose={onClose} wide>
      {!edit ? (
        <>
          <dl className="kv">
            <dt>Status</dt><dd><Badge s={m.status} /></dd>
            <dt>Registration no.</dt><dd>{m.reg_no || "Not set"}</dd>
            <dt>Email</dt><dd>{m.email || "No account yet (imported)"}</dd>
            <dt>Phone</dt><dd>{m.phone || "Not set"}</dd>
            <dt>Year and course</dt><dd>{[m.year_of_study, m.course].filter(Boolean).join(", ") || "Not set"}</dd>
            <dt>Leadership</dt><dd>{LEAD[m.leadership_interest]}</dd>
            <dt>Joined</dt><dd>{fmtD(m.created_at)}</dd>
          </dl>
          <h3 className="sub">Payment history</h3>
          {m.history.length ? (
            <div className="scroll"><table className="tbl small">
              <thead><tr><th>Semester</th><th>Type</th><th className="num">Amount</th><th>Code</th><th>Status</th></tr></thead>
              <tbody>{m.history.map((h) => <tr key={h.id}><td>{h.semester_name}</td><td className="cap">{h.kind}</td><td className="num">{money(h.amount)}</td><td className="mono">{h.mpesa_code || "None"}</td><td><Badge s={h.status} /></td></tr>)}</tbody>
            </table></div>
          ) : <p className="muted">No payments yet.</p>}
          {canEdit && <div className="modal-f"><button className="btn btn-green sm" onClick={() => setEdit(true)}>Edit details</button></div>}
        </>
      ) : (
        <form className="form" onSubmit={save}>
          <Field label="Full name" name="full_name" value={v.full_name} onChange={set} required error={fe(errs, "full_name")} />
          <div className="two">
            <Field label="Registration no." name="reg_no" value={v.reg_no} onChange={set} error={fe(errs, "reg_no")} />
            <Field label="Phone" name="phone" value={v.phone} onChange={set} error={fe(errs, "phone")} />
          </div>
          <div className="two">
            <Field label="Year of study" name="year_of_study" value={v.year_of_study} onChange={set} />
            <Field label="Course" name="course" value={v.course} onChange={set} />
          </div>
          <Field label="Leadership interest" name="leadership_interest" as="select" value={v.leadership_interest} onChange={set}>
            <option value="">Not answered</option><option value="yes">Interested</option><option value="maybe">Maybe later</option><option value="no">Not now</option>
          </Field>
          {errs.detail && <p className="err" role="alert">{fe(errs, "detail")}</p>}
          <div className="modal-f"><button type="button" className="btn btn-line dark sm" onClick={() => setEdit(false)}>Cancel</button><button className="btn btn-green sm">Save changes</button></div>
        </form>
      )}
    </Modal>
  );
}

export default function Members() {
  const { me } = useAuth();
  const toast = useToast();
  const canEdit = ["admin", "secretary"].includes(me.role);
  const canImport = ["admin", "treasurer"].includes(me.role);
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const { data, err, reload } = useLoad(`manage/members/?q=${encodeURIComponent(dq)}`);
  const [status, setStatus] = useState("all");
  const [lead, setLead] = useState(false);
  const [sel, setSel] = useState(null);
  const [imp, setImp] = useState(false);
  const all = data || [];
  const n = (s) => all.filter((m) => m.status === s).length;
  const rows = all.filter((m) => (status === "all" || m.status === status) && (!lead || ["yes", "maybe"].includes(m.leadership_interest)));
  return (
    <>
      <PageHeader title="Members" sub="Everyone who has registered or been imported. Download Excel, edit it, and import it back to update many records at once.">
        {canImport && <button className="btn btn-line dark sm" onClick={() => setImp(true)}>Import from Excel</button>}
        <button className="btn btn-green sm" onClick={() => download("manage/export/", `kusoppa-members-${new Date().toISOString().slice(0, 10)}.xlsx`).catch((e) => toast(errText(e), "err"))}>Download Excel</button>
      </PageHeader>
      <div className="bar-tools">
        <Chips value={status} onChange={setStatus} options={[["all", "All", all.length], ["active", "Active", n("active")], ["pending", "Pending", n("pending")], ["expired", "Expired", n("expired")], ["unpaid", "Unpaid", n("unpaid")]]} />
        <button className={`chip ${lead ? "on" : ""}`} onClick={() => setLead(!lead)}>Interested in leadership</button>
        <input className="search" type="search" placeholder="Search name, reg no., email or phone" aria-label="Search members" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {err ? <ErrorBox msg={err} retry={reload} /> : !data ? <Loading /> : !rows.length ? (
        <div className="panel"><Empty title="No members found" text={all.length ? "Try a different filter or search." : "Members appear here when they register, or import your Excel list to start."} /></div>
      ) : (
        <div className="panel flush scroll">
          <table className="tbl click">
            <thead><tr><th>Member</th><th>Contact</th><th>Year</th><th>Leadership</th><th>Status</th><th>Joined</th></tr></thead>
            <tbody>{rows.map((m) => (
              <tr key={m.id} tabIndex={0} onClick={() => setSel(m)} onKeyDown={(e) => e.key === "Enter" && setSel(m)}>
                <td><b>{m.full_name}</b><small className="sub">{m.reg_no}</small></td>
                <td>{m.phone || "No phone"}<small className="sub">{m.email || "No account yet"}</small></td>
                <td>{m.year_of_study}</td>
                <td>{m.leadership_interest ? <Badge s={`lead-${m.leadership_interest}`}>{LEAD[m.leadership_interest]}</Badge> : <span className="muted">None</span>}</td>
                <td><Badge s={m.status} /></td>
                <td>{fmtD(m.created_at)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {sel && <Detail m={sel} canEdit={canEdit} onClose={() => setSel(null)} onSaved={() => { setSel(null); reload(); }} />}
      {imp && <ImportWizard onClose={() => setImp(false)} onDone={reload} />}
    </>
  );
}

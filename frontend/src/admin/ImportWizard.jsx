import { useState } from "react";
import { request } from "../api";
import { errText } from "../utils";
import { Badge, Modal, fmtDT, useLoad, useToast } from "./kit";

const body = (file, o, mapping) => {
  const f = new FormData();
  f.append("file", file);
  if (o.sheet) f.append("sheet", o.sheet);
  if (o.header_row != null) f.append("header_row", o.header_row);
  if (mapping) f.append("mapping", JSON.stringify(mapping));
  if (o.semester) f.append("semester", o.semester);
  f.append("overwrite", o.overwrite);
  f.append("all_paid", o.all_paid);
  return f;
};
const LEVEL = { ok: ["approved", "Ready"], warn: ["pending", "Check"], error: ["rejected", "Problem"] };
const MEMBER = { new: "New member", repeat: "Same member", existing: "Existing member" };
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

export default function ImportWizard({ onClose, onDone }) {
  const toast = useToast();
  const [file, setFile] = useState(null);
  const [o, setO] = useState({ sheet: "", header_row: null, semester: "", overwrite: false, all_paid: false });
  const [pv, setPv] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [res, setRes] = useState(null);
  const [problemsOnly, setProblemsOnly] = useState(false);
  const batches = useLoad("manage/import/batches/");

  // mapping === null lets the server guess the columns again
  const run = async (f, opts, mapping) => {
    setO(opts); setBusy(true); setErr("");
    try { setPv(await request("POST", "manage/import/preview/", body(f, opts, mapping))); } catch (e) { setErr(errText(e)); } finally { setBusy(false); }
  };
  const pick = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f); setPv(null);
    run(f, { ...o, sheet: "", header_row: null }, null);
  };
  const setMap = (key, val) => {
    const m = { ...pv.mapping };
    if (val === "") delete m[key]; else m[key] = Number(val);
    run(file, o, m);
  };
  const apply = async () => {
    setBusy(true); setErr("");
    try {
      const r = await request("POST", "manage/import/apply/", body(file, { ...o, sheet: pv.sheet, header_row: pv.header_row, semester: o.semester || pv.semester }, pv.mapping));
      setRes(r); onDone(); batches.reload();
    } catch (e) { setErr(errText(e)); } finally { setBusy(false); }
  };
  const undo = async (id) => {
    try { const r = await request("POST", `manage/import/batches/${id}/undo/`); toast(`Import undone. ${plural(r.payments_removed, "payment")} removed.`); setRes(null); batches.reload(); onDone(); } catch (e) { toast(errText(e), "err"); }
  };

  const s = pv?.summary;
  const actionable = s ? s.new_members + s.updated_members + s.payments : 0;
  const rows = pv ? pv.rows.filter((r) => !problemsOnly || r.level !== "ok") : [];

  return (
    <Modal title="Import members from Excel" onClose={onClose} wide>
      {res ? (
        <>
          <p><b>Import complete.</b> {plural(res.summary.members_created, "new member")}, {plural(res.summary.members_updated, "member")} updated, {plural(res.summary.payments_created, "payment")} recorded{res.summary.problems ? `, ${plural(res.summary.problems, "row")} skipped because of problems` : ""}.</p>
          <p className="muted">Made a mistake? You can undo the whole import. It removes the payments and the members it created.</p>
          <div className="modal-f"><button className="btn btn-line dark sm danger-text" onClick={() => undo(res.batch)}>Undo this import</button><button className="btn btn-green sm" onClick={onClose}>Done</button></div>
        </>
      ) : !pv ? (
        <>
          <label className="drop">
            <input type="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={pick} />
            <b>{busy ? "Reading your file" : "Choose an Excel (.xlsx) or CSV file"}</b>
            <span>You see a preview first. Nothing is saved until you confirm.</span>
          </label>
          {err && <p className="err" role="alert">{err}</p>}
          <p className="muted">The sheet can have title rows above the headings. Download Excel from the Members page to get a file in the exact layout this expects.</p>
          {batches.data?.length > 0 && (
            <>
              <h3 className="sub">Recent imports</h3>
              <ul className="inbox">{batches.data.map((b) => (
                <li key={b.id}><div className="batch">
                  <span><b>{b.filename}</b><small className="sub">{fmtDT(b.created_at)}{b.by ? `, ${b.by}` : ""}. {plural(b.summary.members_created || 0, "new member")}, {plural(b.summary.payments_created || 0, "payment")}</small></span>
                  {b.undone ? <Badge s="expired">Undone</Badge> : <button className="btn btn-line dark sm danger-text" onClick={() => undo(b.id)}>Undo</button>}
                </div></li>
              ))}</ul>
            </>
          )}
        </>
      ) : (
        <>
          <p className="muted"><b>{pv.filename}</b>{pv.sheets.length > 1 && <> , sheet{" "}
            <select value={pv.sheet} onChange={(e) => run(file, { ...o, sheet: e.target.value, header_row: null }, null)}>{pv.sheets.map((n) => <option key={n}>{n}</option>)}</select></>}
            . {pv.header_row >= 0 ? `Headings found on row ${pv.header_row + 1}.` : "No heading row detected; match the columns below."}</p>

          <h3 className="sub">Match your columns</h3>
          <div className="wiz-map">
            {pv.fields.map((f) => (
              <label key={f.key} className="field"><span>{f.label}{f.required && " *"}</span>
                <select value={pv.mapping[f.key] ?? ""} onChange={(e) => setMap(f.key, e.target.value)}>
                  <option value="">Not in my sheet</option>
                  {pv.columns.map((c) => <option key={c.i} value={c.i}>{c.i + 1}. {c.name}{c.sample[0] ? ` (${c.sample[0].slice(0, 18)})` : ""}</option>)}
                </select>
              </label>
            ))}
          </div>

          <div className="wiz-opts">
            <label className="field"><span>Semester for rows that do not name one</span>
              <select value={o.semester || pv.semester || ""} onChange={(e) => run(file, { ...o, semester: e.target.value }, pv.mapping)}>
                {pv.semesters.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
            </label>
            <label className="check"><input type="checkbox" checked={o.overwrite} onChange={(e) => run(file, { ...o, overwrite: e.target.checked }, pv.mapping)} /><span>Replace existing members' details with the sheet's values. Off keeps what the site already has and only fills blanks.</span></label>
            <label className="check"><input type="checkbox" checked={o.all_paid} onChange={(e) => run(file, { ...o, all_paid: e.target.checked }, pv.mapping)} /><span>Count every row as a paid member for that semester, even with no M-Pesa code or amount (for older records).</span></label>
          </div>

          {pv.blocking ? <p className="err" role="alert">{pv.blocking}</p> : (
            <>
              <div className="wiz-chips">
                <span><b>{s.new_members}</b> new members</span>
                <span><b>{s.existing_members}</b> existing ({s.updated_members} updated)</span>
                <span><b>{s.payments}</b> payments ({s.renewals} renewals)</span>
                <span><b>{s.skipped_payments}</b> payments already recorded</span>
                <span className={s.problems ? "bad" : ""}><b>{s.problems}</b> problems</span>
              </div>
              <label className="check"><input type="checkbox" checked={problemsOnly} onChange={(e) => setProblemsOnly(e.target.checked)} /><span>Show only rows that need attention</span></label>
              <div className="panel flush scroll wiz-rows"><table className="tbl small">
                <thead><tr><th>Row</th><th>Member</th><th>Result</th><th>Payment</th><th>Notes</th></tr></thead>
                <tbody>{rows.map((r) => (
                  <tr key={r.row} className={`lvl-${r.level}`}>
                    <td>{r.row}</td>
                    <td><b>{r.name || "No name"}</b><small className="sub">{r.reg_no || "No registration number"}</small></td>
                    <td><Badge s={LEVEL[r.level][0]}>{r.level === "error" ? "Skipped" : MEMBER[r.member]}</Badge></td>
                    <td>{r.payment === "none" ? <span className="muted">None</span> : <>{r.payment === "renewal" ? "Renewal" : "Joining"}, Ksh {r.amount}<small className="sub">{r.semester}</small></>}</td>
                    <td>{[...r.issues, ...r.changes.map((c) => `will update ${c}`), r.note].filter(Boolean).map((m) => <small key={m} className="sub">{m}</small>)}</td>
                  </tr>
                ))}</tbody>
              </table></div>
              {pv.rows.length < s.rows && <p className="muted">Showing the first {pv.rows.length} of {s.rows} rows. The import still covers all of them.</p>}
            </>
          )}
          {err && <p className="err" role="alert">{err}</p>}
          <div className="modal-f">
            <button className="btn btn-line dark sm" onClick={() => { setPv(null); setFile(null); setErr(""); }}>Choose a different file</button>
            <button className="btn btn-green sm" disabled={busy || !!pv.blocking || !actionable} onClick={apply}>{busy ? "Working" : actionable ? `Import ${plural(s.new_members + s.updated_members, "member")} and ${plural(s.payments, "payment")}` : "Nothing to import"}</button>
          </div>
        </>
      )}
    </Modal>
  );
}

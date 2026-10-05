import { useState } from "react";
import { request } from "../api";
import { CopyButton } from "../components/pay";
import { Field } from "../components/ui";
import { errText } from "../utils";
import { Badge, Chips, Empty, ErrorBox, Loading, Modal, PageHeader, fmtDT, money, useDebounced, useLoad, useToast } from "./kit";

export default function Payments() {
  const [status, setStatus] = useState("pending");
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const [act, setAct] = useState(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [ferr, setFerr] = useState("");
  const toast = useToast();
  const { data, err, reload } = useLoad(`manage/payments/?status=${status === "all" ? "" : status}&q=${encodeURIComponent(dq)}`);
  const close = () => { setAct(null); setReason(""); setFerr(""); };

  const run = async () => {
    setBusy(true); setFerr("");
    try {
      await request("POST", `manage/payments/${act.row.id}/${act.type}/`, act.type === "reject" ? { reason } : {});
      toast(act.type === "approve" ? "Payment approved. The member is now active." : "Payment rejected and the member was told why.");
      close(); reload();
    } catch (e) { setFerr(errText(e)); } finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader title="Payments" sub="Check each M-Pesa code against the Pochi la Biashara statement before approving." />
      <div className="bar-tools">
        <Chips value={status} onChange={setStatus} options={[["pending", "Pending"], ["approved", "Approved"], ["rejected", "Rejected"], ["all", "All"]]} />
        <input className="search" type="search" placeholder="Search name, reg no. or code" aria-label="Search payments" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {err ? <ErrorBox msg={err} retry={reload} /> : !data ? <Loading /> : !data.length ? (
        <div className="panel"><Empty title={status === "pending" ? "Nothing waiting for review" : "No payments found"} text={status === "pending" ? "New payments show up here as members submit their M-Pesa codes." : "Try a different filter or search."} /></div>
      ) : (
        <div className="panel flush scroll">
          <table className="tbl">
            <thead><tr><th>Member</th><th>Semester</th><th>Type</th><th className="num">Amount</th><th>M-Pesa code</th><th>Submitted</th><th>Status</th><th /></tr></thead>
            <tbody>{data.map((p) => (
              <tr key={p.id}>
                <td><b>{p.member_name}</b><small className="sub">{p.reg_no}</small></td>
                <td>{p.semester_name}</td>
                <td className="cap">{p.kind}</td>
                <td className="num">{money(p.amount)}</td>
                <td><span className="mono">{p.mpesa_code || "None"}</span> {p.mpesa_code && <CopyButton text={p.mpesa_code} />}</td>
                <td>{fmtDT(p.submitted_at)}</td>
                <td><Badge s={p.status} />{p.reject_reason && <small className="sub">{p.reject_reason}</small>}</td>
                <td className="act">{p.status === "pending" && (
                  <><button className="btn btn-green sm" onClick={() => setAct({ type: "approve", row: p })}>Approve</button> <button className="btn btn-line dark sm" onClick={() => setAct({ type: "reject", row: p })}>Reject</button></>
                )}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {act && (
        <Modal title={act.type === "approve" ? "Approve this payment?" : "Reject this payment"} onClose={close}>
          <p><b>{act.row.member_name}</b> ({act.row.reg_no}) paid <b>{money(act.row.amount)}</b> with code <span className="mono">{act.row.mpesa_code}</span>.</p>
          {act.type === "approve" ? <p className="muted">Only approve if you have seen this code in the Pochi la Biashara statement for the right amount.</p> : (
            <Field label="Reason shown to the member" name="reason" value={reason} onChange={(e) => setReason(e.target.value)} required />
          )}
          {ferr && <p className="err" role="alert">{ferr}</p>}
          <div className="modal-f">
            <button className="btn btn-line dark sm" onClick={close}>Cancel</button>
            <button className={`btn sm ${act.type === "approve" ? "btn-green" : "btn-danger"}`} disabled={busy || (act.type === "reject" && !reason.trim())} onClick={run}>
              {busy ? "Working" : act.type === "approve" ? "Approve payment" : "Reject payment"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

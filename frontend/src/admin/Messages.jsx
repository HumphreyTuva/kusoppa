import { useState } from "react";
import { request } from "../api";
import { errText } from "../utils";
import { Empty, ErrorBox, Loading, Modal, PageHeader, fmtDT, useLoad, useToast } from "./kit";

export default function Messages() {
  const { data, err, reload } = useLoad("manage/messages/");
  const [sel, setSel] = useState(null);
  const toast = useToast();
  const open = async (m) => {
    setSel(m);
    if (!m.is_read) { try { await request("PATCH", `manage/messages/${m.id}/`, { is_read: true }); reload(); } catch { /* not critical */ } }
  };
  const remove = async () => {
    try { await request("DELETE", `manage/messages/${sel.id}/`); toast("Message deleted."); reload(); } catch (e) { toast(errText(e), "err"); }
    setSel(null);
  };
  return (
    <>
      <PageHeader title="Messages" sub="Messages sent from the contact form." />
      {err ? <ErrorBox msg={err} retry={reload} /> : !data ? <Loading /> : !data.length ? <div className="panel"><Empty title="No messages yet" text="Messages from the contact page will appear here." /></div> : (
        <div className="panel flush"><ul className="inbox">{data.map((m) => (
          <li key={m.id}><button onClick={() => open(m)} className={m.is_read ? "" : "unread"}>
            <b>{m.subject}</b><span>{m.name}, {m.email}</span><time>{fmtDT(m.created_at)}</time>
          </button></li>
        ))}</ul></div>
      )}
      {sel && <Modal title={sel.subject} onClose={() => setSel(null)} wide>
        <p className="muted">From {sel.name} ({sel.email}) on {fmtDT(sel.created_at)}</p>
        <p className="msg">{sel.message}</p>
        <div className="modal-f"><button className="btn btn-line dark sm danger-text" onClick={remove}>Delete</button><a className="btn btn-green sm" href={`mailto:${sel.email}?subject=Re: ${encodeURIComponent(sel.subject)}`}>Reply by email</a></div>
      </Modal>}
    </>
  );
}

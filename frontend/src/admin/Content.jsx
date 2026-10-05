import { useState } from "react";
import { request } from "../api";
import { Check, Field } from "../components/ui";
import { errText, fe, toLocalInput } from "../utils";
import { Badge, Empty, ErrorBox, Loading, Modal, PageHeader, fmtD, fmtDT, useLoad, useToast } from "./kit";

const isFile = (f) => f.type === "image" || f.type === "file";

function ResourceForm({ endpoint, fields, row, noun, onDone }) {
  const [v, setV] = useState(() => Object.fromEntries(fields.filter((f) => !isFile(f)).map((f) => [
    f.name, row ? (f.type === "datetime" ? toLocalInput(row[f.name]) : row[f.name] ?? (f.type === "checkbox" ? false : "")) : (f.default ?? (f.type === "checkbox" ? false : "")),
  ])));
  const [files, setFiles] = useState({});
  const [errs, setErrs] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (e) => setV((s) => ({ ...s, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErrs({});
    const fd = new FormData();
    for (const f of fields) {
      if (isFile(f)) { if (files[f.name]) fd.append(f.name, files[f.name]); continue; }
      let x = v[f.name];
      if (f.type === "datetime" && x) x = new Date(x).toISOString();
      if (f.type === "checkbox") x = x ? "true" : "false";
      fd.append(f.name, x ?? "");
    }
    try {
      if (row) await request("PATCH", `manage/${endpoint}/${row.id}/`, fd); else await request("POST", `manage/${endpoint}/`, fd);
      onDone();
    } catch (x) { setErrs(x || {}); } finally { setBusy(false); }
  };

  return (
    <form className="form" onSubmit={submit}>
      {fields.map((f) => {
        const err = fe(errs, f.name);
        if (f.type === "checkbox") return <Check key={f.name} name={f.name} checked={!!v[f.name]} onChange={(e) => setV((s) => ({ ...s, [f.name]: e.target.checked }))} error={err}>{f.label}</Check>;
        if (isFile(f)) return (
          <label key={f.name} className="field"><span>{f.label}</span>
            <input type="file" accept={f.type === "image" ? "image/*" : ".pdf,application/pdf"} onChange={(e) => setFiles((s) => ({ ...s, [f.name]: e.target.files[0] }))} />
            {row?.[f.name] && <small className="sub">Current file: <a className="more" href={row[f.name]} target="_blank" rel="noreferrer">open</a>. Choose a new one to replace it.</small>}
            {err && <em role="alert">{err}</em>}
          </label>
        );
        if (f.type === "select") return <Field key={f.name} label={f.label} name={f.name} as="select" value={v[f.name]} onChange={set} required={f.required} error={err}>{f.options.map(([val, l]) => <option key={val} value={val}>{l}</option>)}</Field>;
        if (f.type === "textarea") return <Field key={f.name} label={f.label} name={f.name} as="textarea" value={v[f.name]} onChange={set} required={f.required} error={err} />;
        return <Field key={f.name} label={f.label} name={f.name} type={f.type === "datetime" ? "datetime-local" : f.type} value={v[f.name]} onChange={set} required={f.required} error={err} />;
      })}
      {errs.detail && <p className="err" role="alert">{fe(errs, "detail")}</p>}
      <div className="modal-f"><button className="btn btn-green sm" disabled={busy}>{busy ? "Saving" : row ? "Save changes" : `Add ${noun}`}</button></div>
    </form>
  );
}

export function Resource({ title, sub, endpoint, noun, cols, fields, embedded }) {
  const { data, err, reload } = useLoad(`manage/${endpoint}/`);
  const [edit, setEdit] = useState(null);
  const [del, setDel] = useState(null);
  const toast = useToast();
  const remove = async () => {
    try { await request("DELETE", `manage/${endpoint}/${del.id}/`); toast(`${noun} deleted.`); reload(); } catch (e) { toast(errText(e), "err"); }
    setDel(null);
  };
  const add = <button className="btn btn-green sm" onClick={() => setEdit({ row: null })}>Add {noun}</button>;
  const table = err ? <ErrorBox msg={err} retry={reload} /> : !data ? <Loading /> : !data.length ? (
    <Empty title={`No ${noun}s yet`} text={`Add the first ${noun} to get started.`} />
  ) : (
    <div className="scroll"><table className="tbl">
      <thead><tr>{cols.map((c) => <th key={c.h}>{c.h}</th>)}<th /></tr></thead>
      <tbody>{data.map((r) => (
        <tr key={r.id}>{cols.map((c) => <td key={c.h}>{c.r(r)}</td>)}
          <td className="act"><button className="btn btn-line dark sm" onClick={() => setEdit({ row: r })}>Edit</button> <button className="btn btn-line dark sm danger-text" onClick={() => setDel(r)}>Delete</button></td>
        </tr>
      ))}</tbody>
    </table></div>
  );
  return (
    <>
      {embedded ? <div className="panel"><div className="ph tight"><h3>{title}</h3>{add}</div>{table}</div> : (
        <><PageHeader title={title} sub={sub}>{add}</PageHeader><div className="panel flush">{table}</div></>
      )}
      {edit && <Modal title={edit.row ? `Edit ${noun}` : `Add ${noun}`} onClose={() => setEdit(null)} wide>
        <ResourceForm endpoint={endpoint} fields={fields} row={edit.row} noun={noun} onDone={() => { setEdit(null); toast("Saved."); reload(); }} />
      </Modal>}
      {del && <Modal title={`Delete this ${noun}?`} onClose={() => setDel(null)}>
        <p>This cannot be undone.</p>
        <div className="modal-f"><button className="btn btn-line dark sm" onClick={() => setDel(null)}>Cancel</button><button className="btn btn-danger sm" onClick={remove}>Delete</button></div>
      </Modal>}
    </>
  );
}

const Thumb = ({ src }) => (src ? <img className="thumb" src={src} alt="" /> : <span className="thumb empty" />);
const Pub = ({ on }) => <Badge s={on ? "approved" : "unpaid"}>{on ? "Published" : "Hidden"}</Badge>;

export const EventsPage = () => (
  <Resource title="Events" sub="Upcoming and past events shown on the public site." endpoint="events" noun="event"
    cols={[{ h: "Event", r: (r) => <><b>{r.title}</b><small className="sub">{r.location}</small></> }, { h: "Starts", r: (r) => fmtDT(r.starts_at) }, { h: "Type", r: (r) => <span className="cap">{r.category}</span> }, { h: "Status", r: (r) => <Pub on={r.is_published} /> }]}
    fields={[
      { name: "title", label: "Title", type: "text", required: true },
      { name: "starts_at", label: "Starts", type: "datetime", required: true },
      { name: "ends_at", label: "Ends (optional)", type: "datetime" },
      { name: "location", label: "Location", type: "text" },
      { name: "category", label: "Type", type: "select", required: true, default: "campus", options: [["campus", "Campus"], ["international", "International"], ["academic", "Academic"], ["webinar", "Webinar"]] },
      { name: "description", label: "Description", type: "textarea" },
      { name: "registration_url", label: "Registration link (optional)", type: "url" },
      { name: "image", label: "Photo (optional)", type: "image" },
      { name: "is_published", label: "Show on the public site", type: "checkbox", default: true },
    ]} />
);

export const BriefsPage = () => (
  <Resource title="Policy briefs" sub="Short analysis pieces members can read and download." endpoint="briefs" noun="brief"
    cols={[{ h: "Brief", r: (r) => <><b>{r.title}</b><small className="sub">{r.author}</small></> }, { h: "Topic", r: (r) => <span className="cap">{r.topic}</span> }, { h: "Published", r: (r) => fmtD(r.published_on) }, { h: "Status", r: (r) => <Pub on={r.is_published} /> }]}
    fields={[
      { name: "title", label: "Title", type: "text", required: true },
      { name: "summary", label: "Summary", type: "textarea", required: true },
      { name: "topic", label: "Topic", type: "select", required: true, default: "governance", options: [["governance", "Governance"], ["devolution", "Devolution"], ["education", "Education"], ["economy", "Economy"], ["youth", "Youth"], ["technology", "Technology"]] },
      { name: "author", label: "Author", type: "text", required: true },
      { name: "reading_minutes", label: "Reading time (minutes)", type: "number", default: 5, required: true },
      { name: "published_on", label: "Publish date", type: "date", required: true },
      { name: "pdf", label: "PDF (optional)", type: "file" },
      { name: "is_published", label: "Show on the public site", type: "checkbox", default: true },
    ]} />
);

export const BoardPage = () => (
  <Resource title="Executive board" sub="Current officials, and past executives in the archive." endpoint="board" noun="board member"
    cols={[{ h: "Member", r: (r) => <span className="who"><Thumb src={r.photo} /><span><b>{r.name}</b><small className="sub">{r.role}</small></span></span> }, { h: "Term", r: (r) => r.term }, { h: "Order", r: (r) => r.order }, { h: "Status", r: (r) => <Badge s={r.is_current ? "approved" : "unpaid"}>{r.is_current ? "Current" : "Past"}</Badge> }]}
    fields={[
      { name: "name", label: "Name", type: "text", required: true },
      { name: "role", label: "Role", type: "text", required: true },
      { name: "term", label: "Term (for example 2025/26)", type: "text" },
      { name: "order", label: "Display order (lowest first)", type: "number", default: 0 },
      { name: "bio", label: "Short bio (optional)", type: "textarea" },
      { name: "photo", label: "Photo", type: "image" },
      { name: "is_current", label: "Currently serving (untick for the past executives archive)", type: "checkbox", default: true },
    ]} />
);

export const LinksPage = () => (
  <Resource title="Links" sub="Links such as the WhatsApp group. Members-only links appear on active members' accounts." endpoint="links" noun="link"
    cols={[{ h: "Link", r: (r) => <><b>{r.label}</b><small className="sub">{r.url}</small></> }, { h: "Who sees it", r: (r) => (r.members_only ? "Active members" : "Everyone") }, { h: "Order", r: (r) => r.order }, { h: "Status", r: (r) => <Badge s={r.is_active ? "approved" : "unpaid"}>{r.is_active ? "On" : "Off"}</Badge> }]}
    fields={[
      { name: "label", label: "Button label (for example Join the WhatsApp group)", type: "text", required: true },
      { name: "url", label: "Link", type: "url", required: true },
      { name: "order", label: "Display order (lowest first)", type: "number", default: 0 },
      { name: "members_only", label: "Only active members can see this link", type: "checkbox", default: true },
      { name: "is_active", label: "Link is switched on", type: "checkbox", default: true },
    ]} />
);

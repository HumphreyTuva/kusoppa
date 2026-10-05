import { useState } from "react";
import { request } from "../api";
import { Field } from "../components/ui";
import { fe } from "../utils";
import { Badge, ErrorBox, Loading, Modal, PageHeader, useLoad, useToast } from "./kit";

const ROLE_NOTE = { admin: "Everything, including users", treasurer: "Payments, fees and settings", secretary: "Members, events, briefs, board, links and messages" };

function UserForm({ row, onDone }) {
  const [v, setV] = useState({ full_name: row?.full_name || "", email: row?.email || "", role: row?.role || "secretary", password: "", is_active: row?.is_active ?? true });
  const [errs, setErrs] = useState({});
  const set = (e) => setV((s) => ({ ...s, [e.target.name]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const save = async (e) => {
    e.preventDefault(); setErrs({});
    const body = { full_name: v.full_name, role: v.role };
    if (v.password) body.password = v.password;
    try {
      if (row) await request("PATCH", `manage/users/${row.id}/`, { ...body, is_active: v.is_active });
      else await request("POST", "manage/users/", { ...body, email: v.email });
      onDone();
    } catch (x) { setErrs(x || {}); }
  };
  return (
    <form className="form" onSubmit={save}>
      <Field label="Full name" name="full_name" value={v.full_name} onChange={set} required error={fe(errs, "full_name")} />
      <Field label="Email (their login)" name="email" type="email" value={v.email} onChange={set} required error={fe(errs, "email")} />
      <Field label="Role" name="role" as="select" value={v.role} onChange={set}>
        {Object.keys(ROLE_NOTE).map((r) => <option key={r} value={r}>{r[0].toUpperCase() + r.slice(1)}: {ROLE_NOTE[r]}</option>)}
      </Field>
      <Field label={row ? "New password (leave empty to keep)" : "Temporary password"} name="password" type="password" value={v.password} onChange={set} required={!row} error={fe(errs, "password")} />
      {row && <label className="check"><input type="checkbox" name="is_active" checked={v.is_active} onChange={set} /><span>Account is active (untick to block this person from signing in)</span></label>}
      {errs.detail && <p className="err" role="alert">{fe(errs, "detail")}</p>}
      <div className="modal-f"><button className="btn btn-green sm">{row ? "Save changes" : "Add official"}</button></div>
    </form>
  );
}

export default function Users() {
  const { data, err, reload } = useLoad("manage/users/");
  const [edit, setEdit] = useState(null);
  const toast = useToast();
  return (
    <>
      <PageHeader title="Users and roles" sub="Officials who can sign in to this dashboard. Update this list after each election.">
        <button className="btn btn-green sm" onClick={() => setEdit({ row: null })}>Add official</button>
      </PageHeader>
      {err ? <ErrorBox msg={err} retry={reload} /> : !data ? <Loading /> : (
        <div className="panel flush scroll"><table className="tbl">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th /></tr></thead>
          <tbody>{data.map((u) => (
            <tr key={u.id}><td><b>{u.full_name}</b></td><td>{u.email}</td><td><Badge s={`role-${u.role}`}>{u.role}</Badge></td>
              <td><Badge s={u.is_active ? "approved" : "rejected"}>{u.is_active ? "Active" : "Blocked"}</Badge></td>
              <td className="act"><button className="btn btn-line dark sm" onClick={() => setEdit({ row: u })}>Edit</button></td></tr>
          ))}</tbody>
        </table></div>
      )}
      {edit && <Modal title={edit.row ? "Edit official" : "Add official"} onClose={() => setEdit(null)}>
        <UserForm row={edit.row} onDone={() => { setEdit(null); toast("Saved."); reload(); }} />
      </Modal>}
    </>
  );
}

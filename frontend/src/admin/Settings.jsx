import { request } from "../api";
import { Check, Field } from "../components/ui";
import { fe, useForm } from "../utils";
import { ErrorBox, Loading, PageHeader, fmtD, useLoad, useToast } from "./kit";
import { Resource } from "./Content";

function Panel({ title, sub, fields, data, reload }) {
  const toast = useToast();
  const form = useForm(Object.fromEntries(fields.map((f) => [f.name, data[f.name] ?? (f.type === "checkbox" ? false : "")])), async (v) => {
    await request("PATCH", "manage/settings/", v);
    toast("Saved.");
    reload();
  });
  return (
    <form className="panel form" onSubmit={form.submit}>
      <div><h3>{title}</h3>{sub && <p className="muted">{sub}</p>}</div>
      {fields.map((f) => f.type === "checkbox"
        ? <Check key={f.name} name={f.name} checked={!!form.values[f.name]} onChange={form.onChange}>{f.label}</Check>
        : <Field key={f.name} label={f.label} name={f.name} type={f.type === "textarea" ? undefined : f.type} as={f.type === "textarea" ? "textarea" : undefined} value={form.values[f.name]} onChange={form.onChange} error={fe(form.errors, f.name)} />)}
      {form.status === "error" && form.errors.detail && <p className="err" role="alert">{fe(form.errors, "detail")}</p>}
      <div><button className="btn btn-green sm" disabled={form.status === "sending"}>{form.status === "sending" ? "Saving" : "Save"}</button></div>
    </form>
  );
}

export default function Settings() {
  const { data, err, reload } = useLoad("manage/settings/");
  if (err) return <ErrorBox msg={err} retry={reload} />;
  if (!data) return <Loading />;
  return (
    <>
      <PageHeader title="Settings" sub="Payment details, fees, semesters and the WhatsApp button." />
      <div className="grid-2 even">
        <Panel title="Payment details" sub="Shown to members when they pay. Update this when the treasurer changes. Admins are emailed about every change." data={data} reload={reload}
          fields={[{ name: "pochi_number", label: "Pochi la Biashara number", type: "tel" }, { name: "pochi_name", label: "Name on the account", type: "text" }, { name: "payment_note", label: "Extra note for members (optional)", type: "textarea" }]} />
        <Panel title="Membership fees" sub="In Kenyan shillings." data={data} reload={reload}
          fields={[{ name: "fee_new", label: "New members (joining plus first semester)", type: "number" }, { name: "fee_renewal", label: "Renewal per semester", type: "number" }]} />
        <Panel title="WhatsApp chat button" sub="The floating button on the public site. Leave the number empty to hide it." data={data} reload={reload}
          fields={[{ name: "whatsapp_number", label: "WhatsApp number", type: "tel" }, { name: "whatsapp_message", label: "Message prefilled for visitors", type: "text" }]} />
        <div>
          <Panel title="Registration" data={data} reload={reload} fields={[{ name: "registration_open", label: "Accept new registrations", type: "checkbox" }]} />
          <div className="panel"><h3>Online payment <span className="badge soon">Coming soon</span></h3><p className="muted">Automatic M-Pesa payment will be switched on once the club has a till or paybill number.</p></div>
        </div>
      </div>
      <Resource embedded title="Semesters" endpoint="semesters" noun="semester"
        cols={[{ h: "Semester", r: (r) => <b>{r.name}</b> }, { h: "Starts", r: (r) => fmtD(r.starts_on) }, { h: "Ends", r: (r) => fmtD(r.ends_on) }]}
        fields={[{ name: "name", label: "Name (for example Sep to Dec 2026)", type: "text", required: true }, { name: "starts_on", label: "Starts", type: "date", required: true }, { name: "ends_on", label: "Ends", type: "date", required: true }]} />
    </>
  );
}

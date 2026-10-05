import { ErrorBox, Loading, PageHeader, fmtDT, useLoad } from "./kit";

export default function Audit() {
  const { data, err, reload } = useLoad("manage/audit/");
  return (
    <>
      <PageHeader title="Audit log" sub="Who approved payments and changed settings. The most recent 200 entries." />
      {err ? <ErrorBox msg={err} retry={reload} /> : !data ? <Loading /> : (
        <div className="panel flush scroll"><table className="tbl">
          <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Details</th></tr></thead>
          <tbody>{data.map((a) => <tr key={a.id}><td>{fmtDT(a.at)}</td><td>{a.actor || "System"}</td><td className="cap">{a.action.replace(/_/g, " ")}</td><td>{a.detail}</td></tr>)}</tbody>
        </table></div>
      )}
    </>
  );
}

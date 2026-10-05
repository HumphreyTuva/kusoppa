import { Link } from "react-router-dom";
import { useAuth } from "../auth";
import { Counter } from "../components/ui";
import { ErrorBox, Loading, PageHeader, fmtDT, useLoad } from "./kit";

const Stat = ({ label, value, prefix, note, to, tone }) => {
  const inner = <><span>{label}</span><b><Counter to={value} prefix={prefix} /></b>{note && <small>{note}</small>}</>;
  return to ? <Link to={to} className={`stat ${tone || ""}`}>{inner}</Link> : <div className={`stat ${tone || ""}`}>{inner}</div>;
};

function Bars({ data }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="bars" role="img" aria-label="Sign-ups per month">
      {data.map((d, i) => (
        <div key={i} className="bar"><span className="v">{d.count}</span><i style={{ height: `${(d.count / max) * 80}%`, animationDelay: `${i * 80}ms` }} /><small>{d.label}</small></div>
      ))}
    </div>
  );
}

export default function Overview() {
  const { me } = useAuth();
  const { data, err, reload } = useLoad("manage/overview/");
  if (err) return <ErrorBox msg={err} retry={reload} />;
  if (!data) return <Loading />;
  const todo = data.setup.filter((s) => !s.done);
  const canMoney = data.revenue !== null;
  return (
    <>
      <PageHeader title={`Welcome, ${me.full_name.split(" ")[0]}`} sub={data.semester ? `Current semester: ${data.semester}` : "No semester has been set up yet"} />
      {todo.length > 0 && me.role !== "secretary" && (
        <div className="panel callout">
          <h3>Finish setting up</h3>
          <ul className="todo">{todo.map((s) => <li key={s.key}><Link className="more" to="/admin/settings">{s.label}</Link></li>)}</ul>
        </div>
      )}
      <div className="kpis">
        <Stat label="Active members" value={data.active_members} note={`${data.new_this_semester} new, ${data.renewals} renewals`} />
        {canMoney && <Stat label="Pending payments" value={data.pending_payments} to="/admin/payments" tone={data.pending_payments ? "warn" : ""} note={data.pending_payments ? "Waiting for your review" : "All caught up"} />}
        <Stat label="Total members" value={data.total_members} to="/admin/members" />
        {canMoney && <Stat label="Collected this semester" value={data.revenue} prefix="Ksh " />}
        <Stat label="Interested in leadership" value={data.leadership_interested} note="Answered yes or maybe" />
      </div>
      <div className="grid-2">
        <div className="panel"><h3>New members, last six months</h3><Bars data={data.signups} /></div>
        <div className="panel">
          <h3>Recent activity</h3>
          {data.recent.length ? (
            <ul className="feed">{data.recent.map((a, i) => <li key={i}><b>{a.actor || "System"}</b> <span>{a.action.replace(/_/g, " ")}</span><small>{a.detail}</small><time>{fmtDT(a.at)}</time></li>)}</ul>
          ) : <p className="muted">Activity from treasurers and admins will show here.</p>}
        </div>
      </div>
    </>
  );
}

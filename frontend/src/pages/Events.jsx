import { useState } from "react";
import { api } from "../api";
import { EventRow, PageHead, Skeleton } from "../components/ui";
import { useData, useTitle } from "../utils";

export default function Events() {
  useTitle("Events");
  const events = useData(api.events);
  const [tab, setTab] = useState("upcoming");
  const [cat, setCat] = useState("all");
  const now = new Date();
  const list = (events || [])
    .filter((e) => (tab === "upcoming" ? new Date(e.starts_at) >= now : new Date(e.starts_at) < now))
    .filter((e) => cat === "all" || e.category === cat)
    .sort((a, b) => (tab === "upcoming" ? new Date(a.starts_at) - new Date(b.starts_at) : new Date(b.starts_at) - new Date(a.starts_at)));
  const cats = ["all", ...new Set((events || []).map((e) => e.category))];
  return (
    <>
      <PageHead variant="events" title="Events" lead="Panels, webinars and meetings. Add any event to your calendar in one tap." />
      <section className="section">
        <div className="container">
          <div className="filters" role="group" aria-label="Filter events">
            {["upcoming", "past"].map((t) => <button key={t} className={`chip ${tab === t ? "on" : ""}`} onClick={() => setTab(t)}>{t === "upcoming" ? "Upcoming" : "Past events"}</button>)}
            <span className="sep" />
            {cats.map((c) => <button key={c} className={`chip ${cat === c ? "on" : ""}`} onClick={() => setCat(c)}>{c === "all" ? "All types" : c}</button>)}
          </div>
          {!events ? <Skeleton /> : list.length ? list.map((e) => <EventRow key={e.id} e={e} />) : <p className="empty">Nothing here yet. Try another filter, or check back soon.</p>}
        </div>
      </section>
    </>
  );
}

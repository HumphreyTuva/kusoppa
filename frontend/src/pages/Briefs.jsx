import { useState } from "react";
import { api } from "../api";
import { BriefCard, PageHead, Skeleton } from "../components/ui";
import { useData, useTitle } from "../utils";

export default function Briefs() {
  useTitle("Policy briefs");
  const briefs = useData(api.briefs);
  const [q, setQ] = useState("");
  const [topic, setTopic] = useState("all");
  const topics = ["all", ...new Set((briefs || []).map((b) => b.topic))];
  const list = (briefs || []).filter((b) => (topic === "all" || b.topic === topic) && `${b.title} ${b.summary} ${b.author}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <PageHead variant="briefs" title="Policy briefs" lead="Short, evidence-based analysis on the issues shaping Kenya and the region." />
      <section className="section">
        <div className="container">
          <div className="filters">
            <input className="search" type="search" placeholder="Search briefs" aria-label="Search briefs" value={q} onChange={(e) => setQ(e.target.value)} />
            {topics.map((t) => <button key={t} className={`chip ${topic === t ? "on" : ""}`} onClick={() => setTopic(t)}>{t === "all" ? "All topics" : t}</button>)}
          </div>
          <div className="grid3">{!briefs ? <Skeleton /> : list.map((b) => <BriefCard key={b.id} b={b} />)}</div>
          {briefs && !list.length && <p className="empty">No briefs match your search. Clear the search or choose another topic.</p>}
        </div>
      </section>
    </>
  );
}

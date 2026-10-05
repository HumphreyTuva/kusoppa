import { Link } from "react-router-dom";
import { api } from "../api";
import { PARTNERS, PILLARS, STATS } from "../config";
import { BriefCard, Counter, EventRow, Reveal, SectionHead, Skeleton } from "../components/ui";
import { fmtDate, useData, useTitle } from "../utils";

export default function Home() {
  useTitle("");
  const events = useData(api.events);
  const briefs = useData(api.briefs);
  const upcoming = (events || []).filter((e) => new Date(e.starts_at) >= new Date());
  const next = upcoming[0];

  return (
    <>
      <section className="hero">
        <div className="container hero-in">
          <div>
            <p className="tag in">Kenyatta University</p>
            <h1 className="in" style={{ "--d": "100ms" }}>KUSOPPA</h1>
            <h2 className="in" style={{ "--d": "200ms" }}>Students of Public Policy and Administration</h2>
            <p className="in" style={{ "--d": "300ms" }}>
              A hub where students, faculty and policy experts connect to drive change. Through mentorship, discussion and advocacy, we nurture the next generation of policy analysts and leaders.
            </p>
            <div className="cta-row in" style={{ "--d": "400ms" }}>
              <Link className="btn btn-gold" to="/join">Join KUSOPPA</Link>
              <Link className="btn btn-line" to="/events">See upcoming events</Link>
            </div>
            {next && (
              <p className="next in" style={{ "--d": "550ms" }}>
                Next up: <Link to="/events">{next.title}</Link>, {fmtDate(next.starts_at)}
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="container stats-wrap">
        <dl className="stats">
          {STATS.map((s) => (
            <div key={s.l}><dt><Counter to={s.n} suffix={s.s} /></dt><dd>{s.l}</dd></div>
          ))}
        </dl>
      </div>

      <section className="section">
        <div className="container split">
          <Reveal>
            <h2>A student community built around policy that works</h2>
            <p>KUSOPPA is a student-led organisation at Kenyatta University committed to advancing policy awareness, leadership and community impact. We give students a place to engage, learn, network and contribute to meaningful change.</p>
            <p><b>Our vision:</b> a future where informed policies create inclusive and sustainable societies.</p>
            <p><b>Our mission:</b> to empower students through policy education, leadership and community engagement.</p>
            <Link className="btn btn-green" to="/about">Meet the team</Link>
          </Reveal>
          <Reveal className="pillars">
            {PILLARS.map((p) => (<div key={p.t}><h3>{p.t}</h3><p>{p.d}</p></div>))}
          </Reveal>
        </div>
      </section>

      <section className="section tint">
        <div className="container">
          <Reveal>
            <SectionHead title="Upcoming events" lead="Talks, panels and webinars open to all students." to="/events" link="All events" />
            {!events ? <Skeleton /> : upcoming.length ? upcoming.slice(0, 3).map((e) => <EventRow key={e.id} e={e} />) : <p className="empty">No events are scheduled right now. Follow us on social media to hear first.</p>}
          </Reveal>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <Reveal>
            <SectionHead title="Policy briefs" lead="Short, evidence-based reads from our community." to="/briefs" link="All briefs" />
            <div className="grid3">{!briefs ? <Skeleton /> : briefs.slice(0, 3).map((b) => <BriefCard key={b.id} b={b} />)}</div>
          </Reveal>
        </div>
      </section>

      <section className="partners">
        <div className="container">
          <p>We work with</p>
          <ul>{PARTNERS.map((p) => <li key={p}>{p}</li>)}</ul>
        </div>
      </section>

      <section className="section dark cta">
        <div className="container">
          <Reveal>
            <h2>Ready to shape the policies of tomorrow?</h2>
            <p>Join students across Kenyatta University who are learning, debating and acting on the issues that matter.</p>
            <div className="cta-row"><Link className="btn btn-gold" to="/join">Become a member</Link><Link className="btn btn-line" to="/contact">Contact us</Link></div>
          </Reveal>
        </div>
      </section>
    </>
  );
}

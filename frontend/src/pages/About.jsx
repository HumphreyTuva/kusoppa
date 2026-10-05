import { api } from "../api";
import { PARTNERS, PILLARS } from "../config";
import { PageHead, Reveal, SectionHead, Skeleton } from "../components/ui";
import { useData, useTitle } from "../utils";

const initials = (n) => n.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("");

export default function About() {
  useTitle("About");
  const board = useData(api.board);
  const current = (board || []).filter((m) => m.is_current);
  const past = (board || []).filter((m) => !m.is_current);
  const Person = ({ m }) => (
    <figure className="person">
      {m.photo ? <img src={m.photo} alt={m.name} loading="lazy" /> : <div className="avatar" aria-hidden="true">{initials(m.name)}</div>}
      <figcaption><b>{m.name}</b><span>{m.role}</span></figcaption>
    </figure>
  );
  return (
    <>
      <PageHead title="About KUSOPPA" lead="Kenyatta University Students of Public Policy and Administration: a hub for students, faculty and policy experts." />
      <div className="container banner-wrap"><img className="banner" src="/images/about.webp" alt="Students discussing a policy paper around a table" width="1400" height="1050" loading="lazy" /></div>
      <section className="section">
        <div className="container split">
          <Reveal>
            <h2>Why we exist</h2>
            <p>We believe informed policy making improves society. KUSOPPA gives students studying public policy and administration a place to build skills, test ideas and prepare for careers that shape public life.</p>
            <p>Our mission is <i>Shaping Policies, Empowering Communities</i>.</p>
          </Reveal>
          <Reveal className="pillars">{PILLARS.map((p) => (<div key={p.t}><h3>{p.t}</h3><p>{p.d}</p></div>))}</Reveal>
        </div>
      </section>
      <section className="section tint">
        <div className="container">
          <Reveal>
            <SectionHead title="Our executive board" lead="The students leading KUSOPPA this year." />
            <div className="people">{!board ? <Skeleton n={4} /> : current.map((m) => <Person key={m.id} m={m} />)}</div>
            {past.length > 0 && (<><h3 className="sub">Past executives</h3><div className="people">{past.map((m) => <Person key={m.id} m={m} />)}</div></>)}
          </Reveal>
        </div>
      </section>
      <section className="partners"><div className="container"><p>Our partners</p><ul>{PARTNERS.map((p) => <li key={p}>{p}</li>)}</ul></div></section>
    </>
  );
}

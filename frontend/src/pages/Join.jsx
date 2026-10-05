import { Link } from "react-router-dom";
import { useAuth } from "../auth";
import { useInfo } from "../info";
import { PayDetails } from "../components/pay";
import { PageHead, Reveal } from "../components/ui";
import { useTitle } from "../utils";

const STEPS = [
  ["Create your account", "Register with your name, registration number, phone number and email."],
  ["Pay the membership fee", "Send the fee by M-Pesa to the club's Pochi la Biashara number shown on this page."],
  ["Submit your M-Pesa code", "Enter the confirmation code from the M-Pesa message on your account page."],
  ["Get confirmed", "The treasurer checks your payment and activates your membership. You will get an email."],
];

export default function Join() {
  useTitle("Join us");
  const { me } = useAuth();
  const info = useInfo();
  const fees = info && !info.error;
  return (
    <>
      <PageHead variant="join" title="Join KUSOPPA" lead="Open to all Kenyatta University students interested in public policy and administration." />
      <section className="section">
        <div className="container split">
          <Reveal>
            <h2>How to become a member</h2>
            <ol className="steps">
              {STEPS.map(([t, d], i) => <li key={t}><b>{i + 1}</b><div><h3>{t}</h3><p>{d}</p></div></li>)}
            </ol>
            <ul className="ticks">
              <li>Invitations to panels, webinars and the annual general meeting</li>
              <li>Mentorship from faculty and practising policy professionals</li>
              <li>Policy briefs, career guidance and exchange opportunities</li>
            </ul>
          </Reveal>
          <Reveal>
            {fees && (
              <div className="fees">
                <div><span>New members</span><b>Ksh {info.fee_new}</b><small>Joining plus your first semester</small></div>
                <div><span>Renewal</span><b>Ksh {info.fee_renewal}</b><small>Every semester after that</small></div>
              </div>
            )}
            <PayDetails amount={fees ? info.fee_new : null} />
            <div className="cta-row">
              {me ? <Link className="btn btn-green" to="/account">Go to my account</Link> : (
                <>
                  <Link className="btn btn-green" to="/register">Create my account</Link>
                  <Link className="btn btn-line dark" to="/login">I already have one</Link>
                </>
              )}
            </div>
            {fees && info.registration_open === false && <p className="muted">Registration is currently closed.</p>}
          </Reveal>
        </div>
      </section>
    </>
  );
}

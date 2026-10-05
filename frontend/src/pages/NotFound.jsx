import { Link } from "react-router-dom";
import { PageHead } from "../components/ui";
import { useTitle } from "../utils";

export default function NotFound() {
  useTitle("Page not found");
  return (
    <>
      <PageHead title="Page not found" lead="The page you are looking for has moved or does not exist." />
      <section className="section"><div className="container"><Link className="btn btn-green" to="/">Go to the home page</Link></div></section>
    </>
  );
}

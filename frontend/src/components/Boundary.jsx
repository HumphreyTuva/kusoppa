import { Component } from "react";

// Shows the error on screen instead of a blank page if something crashes.
export default class Boundary extends Component {
  state = { err: null };
  static getDerivedStateFromError(err) { return { err }; }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: 720 }}>
        <h1>Something went wrong</h1>
        <p>Please refresh. If it keeps happening, send this message to the developer:</p>
        <pre style={{ whiteSpace: "pre-wrap" }}>{String(this.state.err)}</pre>
      </div>
    );
  }
}

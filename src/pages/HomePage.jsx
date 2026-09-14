import { Link } from "react-router-dom";
import { AppHeader } from "../components/AppHeader";

export default function HomePage() {
  return (
    <main className="page">
      <AppHeader />
      <section className="glass panel-lg mb-5">
        <span className="pill">Multi-Sport Evaluations</span>
        <h2 className="hero-title">Evaluate. Rank. Report.</h2>
        <p className="hero-copy">
          Build rosters, score skills 0–100, and share rankings — synced with Firebase across
          web and iOS for coaches in soccer, basketball, baseball, and more.
        </p>
        <div className="row mt-6">
          <Link to="/login" className="btn">
            Sign in
          </Link>
          <Link to="/register" className="btn btn-secondary">
            Create account
          </Link>
          <Link to="/dashboard" className="btn btn-secondary">
            Open dashboard
          </Link>
        </div>
      </section>
      <section className="glass panel muted" style={{ fontSize: "0.9rem" }}>
        Demo coach: <strong style={{ color: "var(--text)" }}>coach@evalscout.org</strong> /{" "}
        <strong style={{ color: "var(--text)" }}>Coach123!</strong>
      </section>
    </main>
  );
}

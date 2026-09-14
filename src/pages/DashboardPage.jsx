import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppHeader } from "../components/AppHeader";
import { RequireAuth } from "../components/RequireAuth";
import { EmptyState, Stat } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { api, ApiError } from "../lib/api";

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardContent />
    </RequireAuth>
  );
}

function DashboardContent() {
  const { user } = useAuth();
  const [sports, setSports] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .listSports()
      .then(setSports)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load sports"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="page">
      <AppHeader />
      <section className="glass panel-lg mb-5">
        <span className="pill">Coach dashboard</span>
        <h2 className="hero-title hero-title--md">Choose your sport.</h2>
        <p className="hero-copy">
          Signed in as {user?.email}. Open a sport app for roster, evaluate, and rankings.
        </p>
      </section>

      {loading ? <p className="muted">Loading sports…</p> : null}
      {error ? (
        <p className="text-danger" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && !error && sports.length === 0 ? (
        <EmptyState title="No sports" body="Seed the API database to load the sports catalog." />
      ) : (
        <section className="grid-3">
          {sports.map((sport) => (
            <Link key={sport.id} to={`/sports/${sport.id}`} className="glass sport-card">
              <div className="sport-icon">{sport.icon}</div>
              <h3>{sport.name}</h3>
              <p>{sport.tagline}</p>
              <div className="sport-card__stats">
                <Stat label="Skills" value={Array.isArray(sport.skills) ? sport.skills.length : 0} />
                <Stat
                  label="Positions"
                  value={Array.isArray(sport.positions) ? sport.positions.length : 0}
                />
              </div>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}

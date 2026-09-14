"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { EmptyState, Stat } from "@/components/ui";
import { RequireAuth } from "@/components/RequireAuth";
import { api, ApiError } from "@/lib/api";
import type { Sport } from "@/lib/types";
import { useAuth } from "@/context/AuthProvider";

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardContent />
    </RequireAuth>
  );
}

function DashboardContent() {
  const { user } = useAuth();
  const [sports, setSports] = useState<Sport[]>([]);
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
      <section className="glass mb-5 p-6">
        <span className="mb-3 inline-flex rounded-full bg-[color-mix(in_srgb,var(--lime)_16%,transparent)] px-3 py-2 text-[0.72rem] font-black uppercase tracking-[0.14em] text-lime-400">
          Coach dashboard
        </span>
        <h2 className="font-display text-5xl font-bold uppercase leading-none sm:text-6xl">
          Choose your sport.
        </h2>
        <p className="mt-3 text-muted">
          Signed in as {user?.email}. Open a sport app for roster, evaluate, and rankings.
        </p>
      </section>

      {loading ? <p className="text-muted">Loading sports…</p> : null}
      {error ? <p className="text-danger" role="alert">{error}</p> : null}

      {!loading && !error && sports.length === 0 ? (
        <EmptyState title="No sports" body="Seed the API database to load the sports catalog." />
      ) : (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sports.map((sport) => (
            <Link
              key={sport.id}
              href={`/sports/${sport.id}`}
              className="glass block p-[18px] no-underline transition hover:border-lime-400"
            >
              <div className="mb-3 grid h-[52px] w-[52px] place-items-center rounded-2xl bg-lime-400 text-3xl text-ink">
                {sport.icon}
              </div>
              <h3 className="text-xl font-black">{sport.name}</h3>
              <p className="mt-1 text-sm text-muted">{sport.tagline}</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
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

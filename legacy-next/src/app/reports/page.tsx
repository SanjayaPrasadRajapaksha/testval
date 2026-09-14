"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { EmptyState, Stat } from "@/components/ui";
import { RequireAuth } from "@/components/RequireAuth";
import { api, ApiError } from "@/lib/api";
import { averageScore, medianScore } from "@/lib/scores";
import type { Player, Sport } from "@/lib/types";

export default function ReportsPage() {
  return (
    <RequireAuth>
      <ReportsContent />
    </RequireAuth>
  );
}

function ReportsContent() {
  const [sports, setSports] = useState<Sport[]>([]);
  const [sportId, setSportId] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api
      .listSports()
      .then((list) => {
        setSports(list);
        if (list[0]) setSportId(list[0].id);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load sports"));
  }, []);

  useEffect(() => {
    if (!sportId) return;
    setLoading(true);
    api
      .listPlayers({ sportId, limit: 100 })
      .then(setPlayers)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load players"))
      .finally(() => setLoading(false));
  }, [sportId]);

  const sport = sports.find((s) => s.id === sportId);
  const skills = useMemo(() => sport?.skills ?? [], [sport]);

  const ranked = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...players]
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.position?.toLowerCase().includes(q))
      .sort((a, b) => averageScore(b.evaluations, skills) - averageScore(a.evaluations, skills));
  }, [players, skills, search]);

  const evaluatedScores = ranked
    .filter((p) => (p.evaluations?.length ?? 0) > 0)
    .map((p) => averageScore(p.evaluations, skills));

  return (
    <main className="page">
      <AppHeader subtitle="Reports & rankings" />
      <section className="glass mb-5 p-6">
        <h2 className="font-display text-4xl font-bold uppercase">The board</h2>
        <p className="mt-2 text-muted">Cross-check rankings and email player summaries.</p>
      </section>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-bold" htmlFor="sportFilter">
          Sport
          <select
            id="sportFilter"
            className="select"
            value={sportId}
            onChange={(e) => setSportId(e.target.value)}
          >
            {sports.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-bold" htmlFor="playerSearch">
          Search players
          <input
            id="playerSearch"
            className="input"
            placeholder="Name or position"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Median" value={medianScore(evaluatedScores)?.toFixed(1) ?? "N/A"} />
        <Stat label="Players" value={ranked.length} />
        <Stat
          label="Evaluated"
          value={`${evaluatedScores.length}/${ranked.length}`}
        />
      </div>

      {error ? <p className="mb-3 text-danger">{error}</p> : null}
      {loading ? <p className="text-muted">Loading…</p> : null}

      {!loading && ranked.length === 0 ? (
        <EmptyState title="No players" body="Add roster players in a sport to generate rankings." />
      ) : (
        <section className="grid gap-3">
          {ranked.map((player, index) => {
            const score = averageScore(player.evaluations, skills);
            const latest = player.evaluations?.[0];
            const body = [
              `${sport?.brand ?? "EvalScout"} Evaluation`,
              `Player: ${player.name}`,
              `Position: ${player.position ?? "N/A"}`,
              `Overall: ${score.toFixed(1)} / 100`,
              latest?.notes ? `Notes: ${latest.notes}` : "",
            ]
              .filter(Boolean)
              .join("\n");
            const mailto = `mailto:?subject=${encodeURIComponent(
              `${sport?.brand ?? "EvalScout"} — ${player.name}`,
            )}&body=${encodeURIComponent(body)}`;

            return (
              <article
                key={player.id}
                className="glass grid grid-cols-[auto_1fr_auto] items-center gap-4 p-4 sm:grid-cols-[auto_1fr_auto_auto]"
              >
                <strong className="text-lime-400">#{index + 1}</strong>
                <div>
                  <h3 className="m-0 text-lg font-bold">{player.name}</h3>
                  <p className="m-0 text-sm text-muted">
                    {player.position || "No position"} · {player.evaluations?.length ?? 0} evals
                  </p>
                </div>
                <span className="text-3xl font-black text-lime-400">{score.toFixed(1)}</span>
                <div className="col-span-3 flex gap-2 sm:col-span-1 sm:flex-col">
                  <a className="btn text-center text-sm no-underline" href={mailto}>
                    Email
                  </a>
                  {sportId ? (
                    <Link
                      className="btn btn-secondary text-center text-sm no-underline"
                      href={`/sports/${sportId}?tab=evaluate&playerId=${player.id}`}
                    >
                      Edit
                    </Link>
                  ) : null}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}

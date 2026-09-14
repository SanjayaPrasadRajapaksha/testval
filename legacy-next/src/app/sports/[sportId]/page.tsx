"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  FormEvent,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AppHeader } from "@/components/AppHeader";
import { EmptyState, Field, Stat } from "@/components/ui";
import { RequireAuth } from "@/components/RequireAuth";
import { api, ApiError } from "@/lib/api";
import {
  averageFromScores,
  averageScore,
  defaultScores,
  defaultSkillNotes,
  medianScore,
} from "@/lib/scores";
import type { Evaluation, Player, Sport } from "@/lib/types";

type Tab = "roster" | "evaluate" | "rankings";

const EVAL_TYPES = [
  "Tryout",
  "Practice",
  "Tournament",
  "Season Evaluation",
  "Camp",
  "Clinic",
];

export default function SportPage() {
  return (
    <RequireAuth>
      <Suspense fallback={<main className="page text-muted">Loading sport…</main>}>
        <SportWorkspace />
      </Suspense>
    </RequireAuth>
  );
}

function SportWorkspace() {
  const params = useParams<{ sportId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const sportId = params.sportId;

  const initialTab = (searchParams.get("tab") as Tab) || "roster";
  const [tab, setTab] = useState<Tab>(
    ["roster", "evaluate", "rankings"].includes(initialTab) ? initialTab : "roster",
  );
  const [sport, setSport] = useState<Sport | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [editingPlayerId, setEditingPlayerId] = useState("");
  const [playerForm, setPlayerForm] = useState({
    name: "",
    age: "",
    jerseyNumber: "",
    birthday: "",
    position: "",
    notes: "",
  });

  const [selectedPlayerId, setSelectedPlayerId] = useState(searchParams.get("playerId") ?? "");
  const [editingEvalId, setEditingEvalId] = useState("");
  const [scores, setScores] = useState<Record<string, number>>({});
  const [skillNotes, setSkillNotes] = useState<Record<string, string>>({});
  const [evaluationNotes, setEvaluationNotes] = useState("");
  const [season, setSeason] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [evaluationType, setEvaluationType] = useState("Tryout");
  const [emailAddress, setEmailAddress] = useState("");

  const loadPlayers = useCallback(async () => {
    const list = await api.listPlayers({ sportId, limit: 100, search: search || undefined });
    setPlayers(list);
    return list;
  }, [sportId, search]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await api.getSport(sportId);
        if (cancelled) return;
        setSport(s);
        setPlayerForm((f) => ({
          ...f,
          position: Array.isArray(s.positions) && s.positions[0] ? s.positions[0] : "",
        }));
        setScores(defaultScores(s.skills ?? []));
        setSkillNotes(defaultSkillNotes(s.skills ?? []));
        const list = await api.listPlayers({ sportId, limit: 100 });
        if (cancelled) return;
        setPlayers(list);
        if (!selectedPlayerId && list[0]) setSelectedPlayerId(list[0].id);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Failed to load sport");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sportId]);

  useEffect(() => {
    const q = new URLSearchParams();
    if (tab !== "roster") q.set("tab", tab);
    if (selectedPlayerId && tab === "evaluate") q.set("playerId", selectedPlayerId);
    const suffix = q.toString() ? `?${q}` : "";
    router.replace(`/sports/${sportId}${suffix}`, { scroll: false });
  }, [tab, selectedPlayerId, sportId, router]);

  const skills = useMemo(() => sport?.skills ?? [], [sport]);
  const positions = useMemo(() => sport?.positions ?? [], [sport]);
  const selectedPlayer = players.find((p) => p.id === selectedPlayerId) ?? players[0];

  const filteredPlayers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return players;
    return players.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.position?.toLowerCase().includes(q) ||
        p.jerseyNumber?.includes(q),
    );
  }, [players, search]);

  const rankedPlayers = useMemo(
    () =>
      [...filteredPlayers].sort(
        (a, b) => averageScore(b.evaluations, skills) - averageScore(a.evaluations, skills),
      ),
    [filteredPlayers, skills],
  );

  const currentOverall = averageFromScores(scores, skills);

  function resetPlayerForm() {
    setEditingPlayerId("");
    setPlayerForm({
      name: "",
      age: "",
      jerseyNumber: "",
      birthday: "",
      position: positions[0] ?? "",
      notes: "",
    });
  }

  async function savePlayer(event: FormEvent) {
    event.preventDefault();
    if (!playerForm.name.trim()) return;
    setBusy(true);
    setError("");
    try {
      const payload = {
        ...playerForm,
        name: playerForm.name.trim(),
        sportId,
      };
      if (editingPlayerId) {
        await api.updatePlayer(editingPlayerId, payload);
      } else {
        const created = await api.createPlayer(payload);
        setSelectedPlayerId(created.id);
      }
      await loadPlayers();
      resetPlayerForm();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save player");
    } finally {
      setBusy(false);
    }
  }

  function editPlayer(player: Player) {
    setEditingPlayerId(player.id);
    setSelectedPlayerId(player.id);
    setPlayerForm({
      name: player.name,
      age: player.age ?? "",
      jerseyNumber: player.jerseyNumber ?? "",
      birthday: player.birthday ?? "",
      position: player.position || positions[0] || "",
      notes: player.notes ?? "",
    });
    setTab("roster");
  }

  async function deletePlayer(id: string) {
    if (!confirm("Delete this player and their evaluations?")) return;
    setBusy(true);
    try {
      await api.deletePlayer(id);
      if (selectedPlayerId === id) setSelectedPlayerId("");
      if (editingPlayerId === id) resetPlayerForm();
      await loadPlayers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  function loadEvaluation(playerId: string, evaluation?: Evaluation) {
    setSelectedPlayerId(playerId);
    const player = players.find((p) => p.id === playerId);
    const latest = evaluation ?? player?.evaluations?.[0];
    setEditingEvalId(latest?.id ?? "");
    setScores({ ...defaultScores(skills), ...(latest?.scores || {}) });
    setSkillNotes({ ...defaultSkillNotes(skills), ...(latest?.skillNotes || {}) });
    setEvaluationNotes(latest?.notes || "");
    setSeason(latest?.seasonName || "");
    setYear(latest?.seasonYear || String(new Date().getFullYear()));
    setEvaluationType(latest?.evaluationType || "Tryout");
  }

  async function saveEvaluation(event: FormEvent) {
    event.preventDefault();
    if (!selectedPlayer) return;
    setBusy(true);
    setError("");
    try {
      const body = {
        playerId: selectedPlayer.id,
        sportId,
        seasonName: season,
        seasonYear: year,
        evaluationType,
        scores,
        skillNotes,
        notes: evaluationNotes,
        overallScore: currentOverall,
      };
      if (editingEvalId) {
        await api.updateEvaluation(editingEvalId, body);
      } else {
        await api.createEvaluation(body);
      }
      await loadPlayers();
      setEditingEvalId("");
      setTab("rankings");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save evaluation");
    } finally {
      setBusy(false);
    }
  }

  async function deleteEvaluation(id: string) {
    if (!confirm("Delete this evaluation?")) return;
    setBusy(true);
    try {
      await api.deleteEvaluation(id);
      await loadPlayers();
      if (editingEvalId === id) {
        setEditingEvalId("");
        setScores(defaultScores(skills));
        setSkillNotes(defaultSkillNotes(skills));
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  async function resetSport() {
    if (!confirm("Reset all players and evaluations for this sport?")) return;
    setBusy(true);
    try {
      await api.resetSportData(sportId);
      await loadPlayers();
      resetPlayerForm();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  }

  if (!sport && !error) {
    return (
      <main className="page">
        <p className="text-muted">Loading sport…</p>
      </main>
    );
  }

  if (!sport) {
    return (
      <main className="page">
        <AppHeader />
        <p className="text-danger">{error || "Sport not found"}</p>
        <Link href="/dashboard" className="btn mt-4 inline-block no-underline">
          Back to dashboard
        </Link>
      </main>
    );
  }

  return (
    <main className="page">
      <AppHeader title={sport.brand} subtitle={sport.tagline} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link href="/dashboard" className="btn btn-secondary no-underline" aria-label="Back to sports">
          ⌂ Sports
        </Link>
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-lime-400 text-2xl text-ink">
          {sport.icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="m-0 text-sm text-muted">{sport.name} toolkit</p>
        </div>
      </div>

      <nav className="mb-4 grid grid-cols-3 gap-2" aria-label="Sport sections">
        {(["roster", "evaluate", "rankings"] as Tab[]).map((item) => (
          <button
            key={item}
            type="button"
            className={`rounded-xl px-3 py-3 font-black capitalize ${
              tab === item ? "bg-lime-400 text-ink" : "bg-surface-strong text-foreground"
            }`}
            onClick={() => setTab(item)}
            aria-current={tab === item ? "page" : undefined}
          >
            {item}
          </button>
        ))}
      </nav>

      {error ? (
        <p className="mb-3 text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mb-4">
        <label className="grid gap-1.5 text-sm font-bold" htmlFor="rosterSearch">
          Search / filter players
          <input
            id="rosterSearch"
            className="input"
            placeholder="Name, position, or jersey"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>

      {tab === "roster" && (
        <section className="grid gap-4">
          <section className="glass p-6">
            <span className="mb-3 inline-flex rounded-full bg-[color-mix(in_srgb,var(--lime)_16%,transparent)] px-3 py-2 text-[0.72rem] font-black uppercase tracking-[0.14em] text-lime-400">
              {sport.name} toolkit
            </span>
            <h2 className="font-display text-4xl font-bold uppercase leading-none sm:text-5xl">
              Build the roster.
            </h2>
            <p className="mt-2 text-muted">Add, edit, and manage players before evaluations.</p>
          </section>

          <form className="glass grid gap-3 p-[18px]" onSubmit={savePlayer}>
            <h3 className="m-0 text-lg font-bold">
              {editingPlayerId ? "Edit player" : "Add player"}
            </h3>
            <Field id="playerName" label="Player name">
              <input
                id="playerName"
                className="input"
                required
                value={playerForm.name}
                onChange={(e) => setPlayerForm({ ...playerForm, name: e.target.value })}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field id="jersey" label="Jersey #">
                <input
                  id="jersey"
                  className="input"
                  value={playerForm.jerseyNumber}
                  onChange={(e) => setPlayerForm({ ...playerForm, jerseyNumber: e.target.value })}
                />
              </Field>
              <Field id="age" label="Age">
                <input
                  id="age"
                  className="input"
                  value={playerForm.age}
                  onChange={(e) => setPlayerForm({ ...playerForm, age: e.target.value })}
                />
              </Field>
              <Field id="birthday" label="Birthday">
                <input
                  id="birthday"
                  className="input"
                  placeholder="MM/DD/YYYY"
                  value={playerForm.birthday}
                  onChange={(e) => setPlayerForm({ ...playerForm, birthday: e.target.value })}
                />
              </Field>
              <Field id="position" label="Position">
                <select
                  id="position"
                  className="select"
                  value={playerForm.position}
                  onChange={(e) => setPlayerForm({ ...playerForm, position: e.target.value })}
                >
                  {positions.map((position) => (
                    <option key={position} value={position}>
                      {position}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field id="notes" label="Coach notes">
              <textarea
                id="notes"
                className="textarea"
                value={playerForm.notes}
                onChange={(e) => setPlayerForm({ ...playerForm, notes: e.target.value })}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              {editingPlayerId ? (
                <button type="button" className="btn btn-secondary" onClick={resetPlayerForm}>
                  Cancel
                </button>
              ) : null}
              <button className="btn" type="submit" disabled={busy}>
                {editingPlayerId ? "Save player" : "Add player"}
              </button>
            </div>
          </form>

          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-danger" onClick={resetSport} disabled={busy}>
              Reset sport data
            </button>
          </div>

          {filteredPlayers.length === 0 ? (
            <EmptyState title="No players yet" body="Add your first rostered player." />
          ) : (
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {filteredPlayers.map((player) => (
                <article key={player.id} className="glass grid gap-3 p-[18px]">
                  <div>
                    <h3 className="m-0 text-lg font-bold">{player.name}</h3>
                    <p className="m-0 text-sm text-muted">
                      {player.position}
                      {player.age ? ` · Age ${player.age}` : ""}
                      {player.jerseyNumber ? ` · #${player.jerseyNumber}` : ""}
                    </p>
                  </div>
                  <strong className="text-4xl font-black text-lime-400">
                    {averageScore(player.evaluations, skills).toFixed(1)}
                  </strong>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" className="btn btn-secondary" onClick={() => editPlayer(player)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => deletePlayer(player.id)}
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      className="btn col-span-2"
                      onClick={() => {
                        loadEvaluation(player.id);
                        setTab("evaluate");
                      }}
                    >
                      Evaluate
                    </button>
                  </div>
                </article>
              ))}
            </section>
          )}
        </section>
      )}

      {tab === "evaluate" && (
        <form className="grid gap-4" onSubmit={saveEvaluation}>
          <section className="glass p-6">
            <span className="mb-3 inline-flex rounded-full bg-[color-mix(in_srgb,var(--lime)_16%,transparent)] px-3 py-2 text-[0.72rem] font-black uppercase tracking-[0.14em] text-lime-400">
              New {sport.name} evaluation
            </span>
            <h2 className="font-display text-4xl font-bold uppercase leading-none sm:text-5xl">
              Rate the player.
            </h2>
            <p className="mt-2 text-muted">Score each skill from 0 to 100 and save.</p>
          </section>

          {players.length === 0 ? (
            <EmptyState title="Add players first" body="Create a roster, then come back to evaluate." />
          ) : (
            <>
              <div className="glass grid gap-3 p-[18px]">
                <Field id="evalPlayer" label="Player">
                  <select
                    id="evalPlayer"
                    className="select"
                    value={selectedPlayer?.id || ""}
                    onChange={(e) => loadEvaluation(e.target.value)}
                  >
                    {players.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="text-5xl font-black text-lime-400">{currentOverall.toFixed(1)}</div>
                {selectedPlayer?.evaluations?.length ? (
                  <div className="grid gap-2">
                    <p className="m-0 text-sm text-muted">Saved evaluations</p>
                    {selectedPlayer.evaluations.map((evaluation) => (
                      <div key={evaluation.id} className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn btn-secondary text-sm"
                          onClick={() => loadEvaluation(selectedPlayer.id, evaluation)}
                        >
                          Edit {evaluation.evaluationType} (
                          {evaluation.overallScore?.toFixed?.(1) ?? "—"})
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger text-sm"
                          onClick={() => deleteEvaluation(evaluation.id)}
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="btn btn-secondary text-sm"
                      onClick={() => {
                        setEditingEvalId("");
                        setScores(defaultScores(skills));
                        setSkillNotes(defaultSkillNotes(skills));
                        setEvaluationNotes("");
                      }}
                    >
                      Start new evaluation
                    </button>
                  </div>
                ) : null}
              </div>

              {skills.map((skill) => (
                <div key={skill.id} className="glass grid gap-3 p-[18px]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="m-0 text-lg font-bold">{skill.label}</h3>
                      <p className="m-0 text-sm text-muted">{skill.hint}</p>
                    </div>
                    <strong className="text-3xl font-black text-lime-400">
                      {Number(scores[skill.id] || 0).toFixed(1)}
                    </strong>
                  </div>
                  <label className="sr-only" htmlFor={`skill-${skill.id}`}>
                    {skill.label} score
                  </label>
                  <input
                    id={`skill-${skill.id}`}
                    type="range"
                    min={0}
                    max={100}
                    step={0.1}
                    value={scores[skill.id] || 0}
                    onChange={(e) =>
                      setScores({ ...scores, [skill.id]: Number(e.target.value) })
                    }
                  />
                  <label className="grid gap-1.5 text-sm font-bold" htmlFor={`note-${skill.id}`}>
                    {skill.label} notes
                    <textarea
                      id={`note-${skill.id}`}
                      className="textarea"
                      value={skillNotes[skill.id] || ""}
                      onChange={(e) =>
                        setSkillNotes({ ...skillNotes, [skill.id]: e.target.value })
                      }
                    />
                  </label>
                </div>
              ))}

              <div className="grid gap-3 sm:grid-cols-2">
                <Field id="season" label="Season">
                  <input
                    id="season"
                    className="input"
                    value={season}
                    onChange={(e) => setSeason(e.target.value)}
                  />
                </Field>
                <Field id="year" label="Year">
                  <input
                    id="year"
                    className="input"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                  />
                </Field>
              </div>
              <Field id="evalType" label="Evaluation type">
                <select
                  id="evalType"
                  className="select"
                  value={evaluationType}
                  onChange={(e) => setEvaluationType(e.target.value)}
                >
                  {EVAL_TYPES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </Field>
              <Field id="evalNotes" label="Evaluation notes">
                <textarea
                  id="evalNotes"
                  className="textarea"
                  value={evaluationNotes}
                  onChange={(e) => setEvaluationNotes(e.target.value)}
                />
              </Field>
              <button className="btn" type="submit" disabled={busy}>
                {editingEvalId ? "Update evaluation" : "Save evaluation"}
              </button>
            </>
          )}
        </form>
      )}

      {tab === "rankings" && (
        <section className="grid gap-4">
          <section className="glass p-6">
            <span className="mb-3 inline-flex rounded-full bg-[color-mix(in_srgb,var(--lime)_16%,transparent)] px-3 py-2 text-[0.72rem] font-black uppercase tracking-[0.14em] text-lime-400">
              {sport.name} insights
            </span>
            <h2 className="font-display text-4xl font-bold uppercase leading-none sm:text-5xl">
              The board.
            </h2>
            <p className="mt-2 text-muted">Ranked by overall rating across saved evaluations.</p>
          </section>

          <div className="grid grid-cols-2 gap-3">
            <Stat
              label="Median score"
              value={
                medianScore(
                  rankedPlayers
                    .filter((p) => p.evaluations?.length)
                    .map((p) => averageScore(p.evaluations, skills)),
                )?.toFixed(1) || "N/A"
              }
            />
            <Stat
              label="Evaluated"
              value={`${rankedPlayers.filter((p) => p.evaluations?.length).length}/${rankedPlayers.length}`}
            />
          </div>

          <Field id="emailShare" label="Email address for sharing">
            <input
              id="emailShare"
              className="input"
              type="email"
              placeholder="coach@team.org"
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
            />
          </Field>

          {rankedPlayers.length === 0 ? (
            <EmptyState title="No roster yet" body="Add players to generate rankings." />
          ) : (
            rankedPlayers.map((player, index) => {
              const score = averageScore(player.evaluations, skills);
              const latest = player.evaluations?.[0];
              const summary = [
                `${sport.brand} Evaluation`,
                `Sport: ${sport.name}`,
                `Player: ${player.name}`,
                `Position: ${player.position}`,
                `Age: ${player.age || "N/A"}`,
                `Overall Score: ${score.toFixed(1)} / 100`,
                latest ? `Date: ${new Date(latest.date ?? Date.now()).toLocaleDateString()}` : "",
                latest?.notes ? `Notes: ${latest.notes}` : "",
              ]
                .filter(Boolean)
                .join("\n");
              const mailto = emailAddress
                ? `mailto:${emailAddress}?subject=${encodeURIComponent(
                    `${sport.brand} Evaluation - ${player.name}`,
                  )}&body=${encodeURIComponent(summary)}`
                : null;

              return (
                <article
                  key={player.id}
                  className="glass grid grid-cols-[auto_1fr_auto] items-center gap-3 p-4 sm:grid-cols-[auto_1fr_auto_auto]"
                >
                  <strong className="text-lime-400">#{index + 1}</strong>
                  <div>
                    <h3 className="m-0 text-lg font-bold">{player.name}</h3>
                    <p className="m-0 text-sm text-muted">
                      {player.position} · {player.evaluations?.length || 0} evaluations
                    </p>
                  </div>
                  <span className="text-3xl font-black text-lime-400">{score.toFixed(1)}</span>
                  <div className="col-span-3 flex flex-wrap gap-2 sm:col-span-1">
                    <button
                      type="button"
                      className="btn btn-secondary text-sm"
                      onClick={() => {
                        loadEvaluation(player.id);
                        setTab("evaluate");
                      }}
                    >
                      Edit
                    </button>
                    {mailto ? (
                      <a className="btn text-sm no-underline" href={mailto}>
                        Email
                      </a>
                    ) : null}
                  </div>
                </article>
              );
            })
          )}
        </section>
      )}
    </main>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AppHeader } from "../components/AppHeader";
import { EmptyState, Field, Stat } from "../components/ui";
import { ReportPreview } from "../components/ReportPreview";
import { RequireAuth } from "../components/RequireAuth";
import { api, ApiError } from "../lib/api";
import { makeAIAssistFeedback } from "../lib/aiAssist";
import { ageFromBirthday, toDateInputValue } from "../lib/playerAge";
import {
  buildPlayerEmailBody,
  buildRosterEmailBody,
  embedProfileLogo,
  playerReportFile,
  rosterReportFile,
  shareEvaluationReport,
  shareResultNotice,
} from "../lib/reportPdf";
import {
  averageFromScores,
  averageScore,
  defaultScores,
  defaultSkillNotes,
  latestEvaluation,
  medianScore,
} from "../lib/scores";

const EVAL_TYPES = [
  "Tryout",
  "Practice",
  "Tournament",
  "Season Evaluation",
  "Camp",
  "Clinic",
];

const TABS = ["roster", "evaluate", "rankings"];

export default function SportPage() {
  return (
    <RequireAuth>
      <SportWorkspace />
    </RequireAuth>
  );
}

function SportWorkspace() {
  const { sportId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialTab = searchParams.get("tab") || "roster";
  const [tab, setTab] = useState(TABS.includes(initialTab) ? initialTab : "roster");
  const [sport, setSport] = useState(null);
  const [players, setPlayers] = useState([]);
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
  const [scores, setScores] = useState({});
  const [skillNotes, setSkillNotes] = useState({});
  const [evaluationNotes, setEvaluationNotes] = useState("");
  const [season, setSeason] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [evaluationType, setEvaluationType] = useState("Tryout");
  const [emailAddress, setEmailAddress] = useState("");
  const [profile, setProfile] = useState(null);
  const [settings, setSettings] = useState({ reportLanguage: "english" });
  const [customSkills, setCustomSkills] = useState([]);
  const [hiddenSkillIds, setHiddenSkillIds] = useState([]);
  const [customSkillName, setCustomSkillName] = useState("");
  const [customSkillHint, setCustomSkillHint] = useState("");
  const [customSkillScope, setCustomSkillScope] = useState("all");
  const [customSkillPlayerId, setCustomSkillPlayerId] = useState("");
  const [editingCustomId, setEditingCustomId] = useState("");
  const [aiBusyId, setAiBusyId] = useState("");
  const [reportPreview, setReportPreview] = useState(null);
  const [shareNotice, setShareNotice] = useState("");
  const evalLoadedKey = useRef("");
  const startNewRef = useRef(false);

  const loadPlayers = useCallback(async () => {
    const list = await api.listPlayers({ sportId, limit: 100, search: search || undefined });
    setPlayers(list);
    return list;
  }, [sportId, search]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [s, customs, hidden, coachProfile, coachSettings] = await Promise.all([
          api.getSport(sportId),
          api.listCustomSkills(sportId),
          api.getHiddenSkills(sportId),
          api.getProfile(),
          api.getSettings().catch(() => ({ reportLanguage: "english" })),
        ]);
        if (cancelled) return;
        setSport(s);
        setCustomSkills(customs);
        setHiddenSkillIds([...hidden]);
        setProfile(coachProfile);
        setSettings(coachSettings || { reportLanguage: "english" });
        setEmailAddress(coachProfile?.coachEmail || coachProfile?.email || "");
        setPlayerForm((f) => ({
          ...f,
          position: Array.isArray(s.positions) && s.positions[0] ? s.positions[0] : "",
        }));
        const activeSkills = [
          ...(s.skills || []).filter((skill) => !hidden.has(skill.id)),
          ...customs,
        ];
        setScores(defaultScores(activeSkills));
        setSkillNotes(defaultSkillNotes(activeSkills));
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
    navigate(`/sports/${sportId}${suffix}`, { replace: true });
  }, [tab, selectedPlayerId, sportId, navigate]);

  useEffect(() => {
    if (tab !== "evaluate" || !selectedPlayerId || startNewRef.current) return;
    const player = players.find((p) => p.id === selectedPlayerId);
    if (!player) return;
    const latest = latestEvaluation(player);
    const key = `${sportId}:${selectedPlayerId}:${latest?.id || "none"}`;
    if (evalLoadedKey.current === key) return;
    loadEvaluation(selectedPlayerId, latest);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, selectedPlayerId, players, sportId]);

  const reportSkills = useMemo(() => {
    const base = (sport?.skills ?? []).filter((skill) => !hiddenSkillIds.includes(skill.id));
    return [...base, ...customSkills];
  }, [sport, customSkills, hiddenSkillIds]);
  const skills = useMemo(() => {
    return reportSkills.filter(
      (skill) => skill.scope !== "player" || skill.playerId === selectedPlayerId,
    );
  }, [reportSkills, selectedPlayerId]);
  const positions = useMemo(() => sport?.positions ?? [], [sport]);
  const selectedPlayer = players.find((p) => p.id === selectedPlayerId) ?? players[0];

  const filteredPlayers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return players;
    return players.filter((p) => {
      const position = p.sportPositions?.[sportId] || p.position || "";
      return (
        p.name.toLowerCase().includes(q) ||
        position.toLowerCase().includes(q) ||
        p.jerseyNumber?.includes(q)
      );
    });
  }, [players, search, sportId]);

  const rankedPlayers = useMemo(
    () =>
      [...filteredPlayers].sort(
        (a, b) => averageScore(b.evaluations, skills) - averageScore(a.evaluations, skills),
      ),
    [filteredPlayers, skills],
  );

  const teamMedian = useMemo(() => {
    const values = rankedPlayers
      .filter((p) => p.evaluations?.length)
      .map((p) =>
        averageScore(
          p.evaluations,
          reportSkills.filter((skill) => skill.scope !== "player" || skill.playerId === p.id),
        ),
      );
    return medianScore(values);
  }, [rankedPlayers, reportSkills]);

  const currentOverall = averageFromScores(scores, skills);
  const canShareReports = Boolean(
    profile?.coachName?.trim() && profile?.organizationName?.trim() && profile?.teamName?.trim(),
  );

  async function persistCustomSkills(next) {
    setCustomSkills(next);
    await api.saveCustomSkills(sportId, next);
  }

  async function persistHiddenSkills(nextIds) {
    setHiddenSkillIds(nextIds);
    await api.saveHiddenSkills(sportId, nextIds);
  }

  async function addCustomSkill() {
    const label = customSkillName.trim();
    if (!label) {
      setError("Enter a custom skill name.");
      return;
    }
    if (customSkillScope === "player" && !customSkillPlayerId) {
      setError("Select a player for this skill, or choose all rostered players.");
      return;
    }
    const skill = editingCustomId
      ? {
          ...customSkills.find((item) => item.id === editingCustomId),
          id: editingCustomId,
          label,
          hint: customSkillHint.trim() || "Custom evaluation category",
          scope: customSkillScope,
          playerId: customSkillScope === "player" ? customSkillPlayerId : "",
          custom: true,
        }
      : {
          id: `custom_${Date.now()}`,
          label,
          symbol: "star.fill",
          hint: customSkillHint.trim() || "Custom evaluation category",
          scope: customSkillScope,
          playerId: customSkillScope === "player" ? customSkillPlayerId : "",
          custom: true,
        };
    const next = editingCustomId
      ? customSkills.map((item) => (item.id === editingCustomId ? skill : item))
      : [...customSkills, skill];
    setBusy(true);
    setError("");
    try {
      await persistCustomSkills(next);
      if (!editingCustomId) {
        setScores((current) => ({ ...current, [skill.id]: 50 }));
        setSkillNotes((current) => ({ ...current, [skill.id]: "" }));
      }
      setCustomSkillName("");
      setCustomSkillHint("");
      setCustomSkillScope("all");
      setCustomSkillPlayerId("");
      setEditingCustomId("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add skill");
    } finally {
      setBusy(false);
    }
  }

  async function removeSkill(skill) {
    setBusy(true);
    setError("");
    try {
      if (skill.custom || customSkills.some((item) => item.id === skill.id)) {
        await persistCustomSkills(customSkills.filter((item) => item.id !== skill.id));
      } else {
        await persistHiddenSkills([...new Set([...hiddenSkillIds, skill.id])]);
      }
      setScores((current) => {
        const next = { ...current };
        delete next[skill.id];
        return next;
      });
      setSkillNotes((current) => {
        const next = { ...current };
        delete next[skill.id];
        return next;
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not remove skill");
    } finally {
      setBusy(false);
    }
  }

  function startEditCustomSkill(skill) {
    setEditingCustomId(skill.id);
    setCustomSkillName(skill.label || "");
    setCustomSkillHint(skill.hint || "");
    setCustomSkillScope(skill.scope === "player" ? "player" : "all");
    setCustomSkillPlayerId(skill.playerId || selectedPlayerId || "");
  }

  function reportArgs(player, nextProfile = profile) {
    return {
      sport,
      player,
      skills: reportSkills,
      profile: nextProfile,
      reportLanguage: settings.reportLanguage || "english",
      teamMedian,
    };
  }

  async function exportPlayerPdf(player) {
    try {
      if (!canShareReports) {
        setError("Complete coach name, organization, and team name in Profile before sharing PDFs.");
        return;
      }
      setError("");
      setShareNotice("");
      const nextProfile = await embedProfileLogo(profile);
      setReportPreview(playerReportFile(reportArgs(player, nextProfile)));
    } catch (err) {
      setError(err.message || "Could not open PDF");
    }
  }

  async function exportRosterPdf() {
    try {
      if (!canShareReports) {
        setError("Complete coach name, organization, and team name in Profile before sharing PDFs.");
        return;
      }
      setError("");
      setShareNotice("");
      const nextProfile = await embedProfileLogo(profile);
      setReportPreview(
        rosterReportFile({
          sport,
          players: rankedPlayers,
          skills: reportSkills,
          profile: nextProfile,
          reportLanguage: settings.reportLanguage || "english",
          teamMedian,
        }),
      );
    } catch (err) {
      setError(err.message || "Could not open PDF");
    }
  }

  async function emailPlayerReport(player) {
    const to = emailAddress || profile?.coachEmail || profile?.email;
    if (!to) {
      setError("Add a coach email on your profile to share reports.");
      return;
    }
    if (!canShareReports) {
      setError("Complete coach name, organization, and team name in Profile before sharing reports.");
      return;
    }
    const nextProfile = await embedProfileLogo(profile);
    const file = playerReportFile(reportArgs(player, nextProfile));
    setBusy(true);
    setError("");
    setShareNotice("");
    try {
      const result = await shareEvaluationReport({
        to,
        subject: `${sport.brand} Evaluation - ${player.name}`,
        html: file.html,
        emailHtml: file.emailHtml,
        text: buildPlayerEmailBody(reportArgs(player, nextProfile)),
        filename: file.filename,
      });
      setShareNotice(shareResultNotice(result, to));
    } catch (err) {
      setError(err.message || "Could not send the evaluation email.");
    } finally {
      setBusy(false);
    }
  }

  async function emailAllReports() {
    const evaluated = rankedPlayers.filter((p) => p.evaluations?.length);
    if (!evaluated.length) {
      setError(
        `No saved evaluations for ${sport?.name || "this sport"}. Save an evaluation on the Evaluate tab for this sport first.`,
      );
      return;
    }
    const to = emailAddress || profile?.coachEmail || profile?.email;
    if (!to) {
      setError("Add a coach email on your profile to email full reports.");
      return;
    }
    if (!canShareReports) {
      setError("Complete coach name, organization, and team name in Profile before sharing reports.");
      return;
    }
    const nextProfile = await embedProfileLogo(profile);
    const file = rosterReportFile({
      sport,
      players: rankedPlayers,
      skills: reportSkills,
      profile: nextProfile,
      reportLanguage: settings.reportLanguage || "english",
      teamMedian,
    });
    setBusy(true);
    setError("");
    setShareNotice("");
    try {
      const result = await shareEvaluationReport({
        to,
        subject: `${sport.brand} — All evaluations`,
        html: file.html,
        emailHtml: file.emailHtml,
        text: buildRosterEmailBody({
          sport,
          players: rankedPlayers,
          skills: reportSkills,
          profile: nextProfile,
        }),
        filename: file.filename,
      });
      setShareNotice(shareResultNotice(result, to));
    } catch (err) {
      setError(err.message || "Could not send the evaluation email.");
    } finally {
      setBusy(false);
    }
  }

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

  async function savePlayer(event) {
    event.preventDefault();
    if (!playerForm.name.trim()) {
      setError("Enter a player name before saving.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const existing = players.find((p) => p.id === editingPlayerId);
      const payload = {
        ...playerForm,
        name: playerForm.name.trim(),
        age: ageFromBirthday(playerForm.birthday) || playerForm.age,
        sportPositions: {
          ...(existing?.sportPositions || {}),
          [sportId]: playerForm.position,
        },
        position: playerForm.position,
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
      setError(err instanceof ApiError ? err.message : "Could not save player. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function editPlayer(player) {
    setEditingPlayerId(player.id);
    setSelectedPlayerId(player.id);
    setPlayerForm({
      name: player.name,
      age: ageFromBirthday(player.birthday) || player.age || "",
      jerseyNumber: player.jerseyNumber ?? "",
      birthday: toDateInputValue(player.birthday),
      position: player.sportPositions?.[sportId] || player.position || positions[0] || "",
      notes: player.notes ?? "",
    });
    setTab("roster");
  }

  async function deletePlayer(id) {
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

  function loadEvaluation(playerId, evaluation) {
    setSelectedPlayerId(playerId);
    startNewRef.current = false;
    const player = players.find((p) => p.id === playerId);
    const latest = evaluation ?? latestEvaluation(player);
    evalLoadedKey.current = `${sportId}:${playerId}:${latest?.id || "none"}`;
    setEditingEvalId(latest?.id ?? "");
    setScores({ ...defaultScores(skills), ...(latest?.scores || {}) });
    setSkillNotes({ ...defaultSkillNotes(skills), ...(latest?.skillNotes || {}) });
    setEvaluationNotes(latest?.notes || "");
    setSeason(latest?.seasonName || "");
    setYear(latest?.seasonYear || String(new Date().getFullYear()));
    setEvaluationType(latest?.evaluationType || "Tryout");
  }

  async function saveEvaluation(event) {
    event.preventDefault();
    if (!selectedPlayer) {
      setError("Select a player before saving an evaluation.");
      return;
    }
    const scored = Object.values(scores || {}).filter((value) => Number(value) > 0);
    if (scored.length === 0) {
      setError("Set at least one skill score before saving.");
      return;
    }
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
      setError(err instanceof ApiError ? err.message : "Could not save evaluation. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteEvaluation(id) {
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
    if (!confirm("Reset evaluations and custom skills for this sport? Rostered players are kept for all sports.")) return;
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
        <p className="muted">Loading sport…</p>
      </main>
    );
  }

  if (!sport) {
    return (
      <main className="page">
        <AppHeader />
        <p className="text-danger">{error || "Sport not found"}</p>
        <Link to="/dashboard" className="btn mt-4">
          Back to dashboard
        </Link>
      </main>
    );
  }

  return (
    <main className="page">
      <AppHeader title={sport.brand} subtitle={sport.tagline} />

      <div className="row mb-4">
        <Link to="/dashboard" className="btn btn-secondary" aria-label="Back to sports">
          ⌂ Sports
        </Link>
        <div className="sport-icon sport-icon--sm">{sport.icon}</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>
            {sport.name} toolkit
          </p>
        </div>
      </div>

      <nav className="tabs" aria-label="Sport sections">
        {TABS.map((item) => (
          <button
            key={item}
            type="button"
            className={`tab-btn ${tab === item ? "tab-btn--active" : ""}`}
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
      {shareNotice ? (
        <p className="mb-3 text-lime" role="status">
          {shareNotice}
        </p>
      ) : null}

      <div className="mb-4">
        <label className="field" htmlFor="rosterSearch">
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
        <section className="stack">
          <section className="glass panel-lg">
            <span className="pill">{sport.name} toolkit</span>
            <h2 className="hero-title hero-title--md">Build the roster.</h2>
            <p className="mt-2 muted">Players stay on your roster for every sport. Age is calculated from birthday.</p>
          </section>

          <form className="glass panel stack-sm" onSubmit={savePlayer}>
            <h3 style={{ margin: 0, fontSize: "1.1rem" }}>
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
            <div className="grid-2">
              <Field id="jersey" label="Jersey #">
                <input
                  id="jersey"
                  className="input"
                  value={playerForm.jerseyNumber}
                  onChange={(e) => setPlayerForm({ ...playerForm, jerseyNumber: e.target.value })}
                />
              </Field>
              <Field id="birthday" label="Birthday" hint="Calendar date. Age fills in automatically.">
                <input
                  id="birthday"
                  className="input"
                  type="date"
                  value={playerForm.birthday}
                  onChange={(e) =>
                    setPlayerForm({
                      ...playerForm,
                      birthday: e.target.value,
                      age: ageFromBirthday(e.target.value),
                    })
                  }
                />
              </Field>
              <Field id="age" label="Age" hint="Calculated from birthday">
                <input id="age" className="input" value={playerForm.age} readOnly />
              </Field>
              <Field id="position" label={`${sport.name} position`}>
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
            <div className="grid-2">
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

          <div className="row-actions">
            <button type="button" className="btn btn-danger" onClick={resetSport} disabled={busy}>
              Reset sport evaluations
            </button>
          </div>

          {filteredPlayers.length === 0 ? (
            <EmptyState title="No players yet" body="Add your first rostered player." />
          ) : (
            <section className="grid-2">
              {filteredPlayers.map((player) => (
                <article key={player.id} className="glass player-card">
                  <div>
                    <h3>{player.name}</h3>
                    <p>
                      {player.sportPositions?.[sportId] || player.position || "Set a position"}
                      {player.age ? ` · Age ${player.age}` : ""}
                      {player.jerseyNumber ? ` · #${player.jerseyNumber}` : ""}
                    </p>
                  </div>
                  <strong className="score-xl">
                    {averageScore(player.evaluations, skills).toFixed(1)}
                  </strong>
                  <div className="grid-2">
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
                      className="btn sm-span-2"
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
        <form className="stack" onSubmit={saveEvaluation}>
          <section className="glass panel-lg">
            <span className="pill">New {sport.name} evaluation</span>
            <h2 className="hero-title hero-title--md">Rate the player.</h2>
            <p className="mt-2 muted">Score each skill from 0 to 100 and save.</p>
          </section>

          {players.length === 0 ? (
            <EmptyState title="Add players first" body="Create a roster, then come back to evaluate." />
          ) : (
            <>
              <div className="glass panel stack-sm">
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
                <div className="score-xl">{currentOverall.toFixed(1)}</div>
                {selectedPlayer?.evaluations?.length ? (
                  <div className="stack-sm">
                    <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>
                      Saved evaluations
                    </p>
                    {selectedPlayer.evaluations.map((evaluation) => (
                      <div key={evaluation.id} className="row-actions">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => loadEvaluation(selectedPlayer.id, evaluation)}
                        >
                          Edit {evaluation.evaluationType} (
                          {evaluation.overallScore?.toFixed?.(1) ?? "—"})
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => deleteEvaluation(evaluation.id)}
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        startNewRef.current = true;
                        evalLoadedKey.current = `${sportId}:${selectedPlayer.id}:new`;
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
                <div key={skill.id} className="glass panel stack-sm">
                  <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "1.1rem" }}>
                        {skill.label}
                        {skill.custom ? <span className="skill-tag">Custom</span> : null}
                      </h3>
                      <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>
                        {skill.hint}
                        {skill.scope === "player" ? " · This player only" : ""}
                      </p>
                    </div>
                    <div className="row-actions">
                      <strong className="score-lg">{Number(scores[skill.id] || 0).toFixed(1)}</strong>
                      {skill.custom ? (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => startEditCustomSkill(skill)}
                          disabled={busy}
                        >
                          Edit
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => removeSkill(skill)}
                        disabled={busy}
                      >
                        Remove
                      </button>
                    </div>
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
                    onChange={(e) => setScores({ ...scores, [skill.id]: Number(e.target.value) })}
                  />
                  <label className="field" htmlFor={`note-${skill.id}`}>
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
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={Boolean(aiBusyId)}
                    onClick={async () => {
                      setAiBusyId(skill.id);
                      setError("");
                      try {
                        const result = await makeAIAssistFeedback({
                          playerName: selectedPlayer?.name,
                          sportName: sport.name,
                          skill,
                          score: scores[skill.id] || 0,
                          existingNote: skillNotes[skill.id],
                          evaluationType,
                        });
                        setSkillNotes((current) => ({ ...current, [skill.id]: result.text }));
                        if (!result.fromAI) {
                          setError(
                            result.reason
                              ? `AI Assist used a local draft (${result.reason}). Check Firebase AI Logic and App Check for EvalSocut Web.`
                              : "AI Assist used a local draft. Enable Gemini and App Check in Firebase.",
                          );
                        }
                      } catch (err) {
                        setError(err.message || "AI assist is not available yet.");
                      } finally {
                        setAiBusyId("");
                      }
                    }}
                  >
                    {aiBusyId === skill.id ? "Writing…" : "AI Assist Feedback"}
                  </button>
                </div>
              ))}

              <section className="glass panel stack-sm">
                <h3 style={{ margin: 0 }}>{editingCustomId ? "Edit custom skill" : "Add custom skill"}</h3>
                <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>
                  Choose whether the skill is for all rostered players or only one player. Added skills can be edited or removed.
                </p>
                <Field id="customSkillName" label="Skill name">
                  <input
                    id="customSkillName"
                    className="input"
                    value={customSkillName}
                    onChange={(e) => setCustomSkillName(e.target.value)}
                    placeholder="e.g. Leadership"
                  />
                </Field>
                <Field id="customSkillHint" label="Hint">
                  <input
                    id="customSkillHint"
                    className="input"
                    value={customSkillHint}
                    onChange={(e) => setCustomSkillHint(e.target.value)}
                    placeholder="What this skill measures"
                  />
                </Field>
                <fieldset className="choice-set">
                  <legend>Available for</legend>
                  <label className="choice-row">
                    <input
                      type="radio"
                      name="customSkillScope"
                      checked={customSkillScope === "all"}
                      onChange={() => setCustomSkillScope("all")}
                    />
                    All rostered players
                  </label>
                  <label className="choice-row">
                    <input
                      type="radio"
                      name="customSkillScope"
                      checked={customSkillScope === "player"}
                      onChange={() => {
                        setCustomSkillScope("player");
                        setCustomSkillPlayerId(customSkillPlayerId || selectedPlayerId || players[0]?.id || "");
                      }}
                    />
                    Only an individual player
                  </label>
                </fieldset>
                {customSkillScope === "player" ? (
                  <Field id="customSkillPlayer" label="Player">
                    <select
                      id="customSkillPlayer"
                      className="select"
                      value={customSkillPlayerId}
                      onChange={(e) => setCustomSkillPlayerId(e.target.value)}
                    >
                      <option value="">Select a player</option>
                      {players.map((player) => (
                        <option key={player.id} value={player.id}>
                          {player.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                ) : null}
                <div className="row-actions">
                  {editingCustomId ? (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setEditingCustomId("");
                        setCustomSkillName("");
                        setCustomSkillHint("");
                        setCustomSkillScope("all");
                        setCustomSkillPlayerId("");
                      }}
                    >
                      Cancel
                    </button>
                  ) : null}
                  <button type="button" className="btn btn-secondary" onClick={addCustomSkill} disabled={busy}>
                    {editingCustomId ? "Save skill" : "Add skill"}
                  </button>
                </div>
              </section>

              <div className="grid-2">
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
        <section className="stack">
          <section className="glass panel-lg">
            <span className="pill">{sport.name} insights</span>
            <h2 className="hero-title hero-title--md">The board.</h2>
            <p className="mt-2 muted">Ranked by overall rating across saved evaluations.</p>
          </section>

          <div className="grid-2">
            <Stat
              label="Median score"
              value={teamMedian?.toFixed(1) || "N/A"}
            />
            <Stat
              label="Evaluated"
              value={`${rankedPlayers.filter((p) => p.evaluations?.length).length}/${rankedPlayers.length}`}
            />
          </div>

          <div className="row mb-3">
            <button type="button" className="btn" onClick={exportRosterPdf} disabled={!rankedPlayers.length || busy}>
              Open all PDFs
            </button>
            <button type="button" className="btn btn-secondary" onClick={emailAllReports} disabled={!rankedPlayers.length || busy}>
              {busy ? "Sending…" : "Share all evaluations"}
            </button>
            {!canShareReports ? (
              <Link className="btn btn-secondary" to="/profile">
                Complete profile for PDFs
              </Link>
            ) : null}
          </div>

          <Field
            id="emailShare"
            label="Email address for sharing"
            hint="Pulled from your coach profile. Emails the designed report and attaches the PDF."
          >
            <input
              id="emailShare"
              className="input"
              type="email"
              placeholder={profile?.coachEmail || "coach@team.org"}
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
            />
          </Field>

          {rankedPlayers.length === 0 ? (
            <EmptyState title="No roster yet" body="Add players to generate rankings." />
          ) : (
            rankedPlayers.map((player, index) => {
              const score = averageScore(player.evaluations, skills);
              return (
                <article key={player.id} className="glass ranking-row">
                  <strong className="text-lime">#{index + 1}</strong>
                  <div>
                    <h3>{player.name}</h3>
                    <p>
                      {player.sportPositions?.[sportId] || player.position || "No position"} · {player.evaluations?.length || 0} evaluations
                    </p>
                  </div>
                  <span className="score-lg">{score.toFixed(1)}</span>
                  <div className="ranking-row__actions">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        loadEvaluation(player.id);
                        setTab("evaluate");
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => exportPlayerPdf(player)}
                      disabled={!player.evaluations?.length}
                    >
                      PDF
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => emailPlayerReport(player)}
                      disabled={!player.evaluations?.length || busy}
                    >
                      {busy ? "Sending…" : "Email"}
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </section>
      )}
      {reportPreview ? (
        <ReportPreview
          html={reportPreview.html}
          filename={reportPreview.filename}
          onClose={() => setReportPreview(null)}
        />
      ) : null}
    </main>
  );
}

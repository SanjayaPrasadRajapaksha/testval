import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppHeader } from "../components/AppHeader";
import { ReportPreview } from "../components/ReportPreview";
import { RequireAuth } from "../components/RequireAuth";
import { EmptyState, Stat } from "../components/ui";
import { api, ApiError } from "../lib/api";
import {
  buildPlayerEmailBody,
  buildRosterEmailBody,
  embedProfileLogo,
  playerReportFile,
  rosterReportFile,
  shareEvaluationReport,
  shareResultNotice,
} from "../lib/reportPdf";
import { averageScore, medianScore } from "../lib/scores";

export default function ReportsPage() {
  return (
    <RequireAuth>
      <ReportsContent />
    </RequireAuth>
  );
}

function ReportsContent() {
  const [sports, setSports] = useState([]);
  const [sportId, setSportId] = useState("");
  const [players, setPlayers] = useState([]);
  const [profile, setProfile] = useState(null);
  const [settings, setSettings] = useState({ reportLanguage: "english" });
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [reportPreview, setReportPreview] = useState(null);
  const [customSkills, setCustomSkills] = useState([]);
  const [hiddenSkillIds, setHiddenSkillIds] = useState([]);
  const [busy, setBusy] = useState(false);
  const [shareNotice, setShareNotice] = useState("");

  useEffect(() => {
    Promise.all([api.listSports(), api.getProfile(), api.getSettings().catch(() => ({ reportLanguage: "english" }))])
      .then(([list, coachProfile, coachSettings]) => {
        setSports(list);
        setProfile(coachProfile);
        setSettings(coachSettings || { reportLanguage: "english" });
        if (list[0]) setSportId(list[0].id);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load sports"));
  }, []);

  useEffect(() => {
    if (!sportId) return;
    setLoading(true);
    setError("");
    setShareNotice("");
    Promise.all([
      api.listPlayers({ sportId, limit: 100 }),
      api.listCustomSkills(sportId),
      api.getHiddenSkills(sportId),
    ])
      .then(([list, customs, hidden]) => {
        setPlayers(list);
        setCustomSkills(customs);
        setHiddenSkillIds([...hidden]);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load players"))
      .finally(() => setLoading(false));
  }, [sportId]);

  const sport = sports.find((s) => s.id === sportId);
  const skills = useMemo(() => {
    const base = (sport?.skills ?? []).filter((skill) => !hiddenSkillIds.includes(skill.id));
    return [...base, ...customSkills];
  }, [sport, customSkills, hiddenSkillIds]);

  const ranked = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...players]
      .filter(
        (p) => !q || p.name.toLowerCase().includes(q) || p.position?.toLowerCase().includes(q),
      )
      .sort((a, b) => averageScore(b.evaluations, skills) - averageScore(a.evaluations, skills));
  }, [players, skills, search]);

  const evaluatedScores = ranked
    .filter((p) => (p.evaluations?.length ?? 0) > 0)
    .map((p) => averageScore(p.evaluations, skills));
  const teamMedian = medianScore(evaluatedScores);
  const canShareReports = Boolean(
    profile?.coachName?.trim() && profile?.organizationName?.trim() && profile?.teamName?.trim(),
  );

  function reportArgs(player, nextProfile = profile) {
    return {
      sport,
      player,
      skills,
      profile: nextProfile,
      reportLanguage: settings.reportLanguage || "english",
      teamMedian,
    };
  }

  async function exportPlayer(player) {
    try {
      if (!canShareReports) {
        setError("Complete coach profile before sharing PDFs.");
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

  async function exportRoster() {
    try {
      if (!canShareReports) {
        setError("Complete coach profile before sharing PDFs.");
        return;
      }
      setError("");
      setShareNotice("");
      const nextProfile = await embedProfileLogo(profile);
      setReportPreview(
        rosterReportFile({
          sport,
          players: ranked,
          skills,
          profile: nextProfile,
          reportLanguage: settings.reportLanguage || "english",
          teamMedian,
        }),
      );
    } catch (err) {
      setError(err.message || "Could not open PDF");
    }
  }

  async function emailPlayer(player) {
    const to = profile?.coachEmail || profile?.email;
    if (!to) {
      setError("Add a coach email on your profile to share reports.");
      return;
    }
    if (!canShareReports) {
      setError("Complete coach profile before sharing reports.");
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
        subject: `${sport?.brand ?? "EvalScout"} Evaluation - ${player.name}`,
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

  async function emailAll() {
    const evaluated = ranked.filter((p) => p.evaluations?.length);
    if (!evaluated.length) {
      setError(
        `No saved evaluations for ${sport?.name || "this sport"}. Switch the Sport filter (e.g. Basketball) or save an evaluation on that sport’s Evaluate tab first.`,
      );
      return;
    }
    const to = profile?.coachEmail || profile?.email;
    if (!to) {
      setError("Add a coach email on your profile to email full reports.");
      return;
    }
    if (!canShareReports) {
      setError("Complete coach profile before sharing reports.");
      return;
    }
    const nextProfile = await embedProfileLogo(profile);
    const file = rosterReportFile({
      sport,
      players: ranked,
      skills,
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
        subject: `${sport?.brand ?? "EvalScout"} — All evaluations`,
        html: file.html,
        emailHtml: file.emailHtml,
        text: buildRosterEmailBody({ sport, players: ranked, skills, profile: nextProfile }),
        filename: file.filename,
      });
      setShareNotice(shareResultNotice(result, to));
    } catch (err) {
      setError(err.message || "Could not send the evaluation email.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page">
      <AppHeader subtitle="Reports & rankings" />
      <section className="glass panel-lg mb-5">
        <h2 className="font-display hero-title--md" style={{ margin: 0 }}>
          The board
        </h2>
        <p className="mt-2 muted">
          Roster shows every player, but evaluations are saved per sport. Use the Sport filter to match the sport you evaluated (e.g. Basketball).
        </p>
      </section>

      <div className="grid-2 mb-4">
        <label className="field" htmlFor="sportFilter">
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
        <label className="field" htmlFor="playerSearch">
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

      <div className="grid-3 mb-4">
        <Stat label="Median" value={teamMedian?.toFixed(1) ?? "N/A"} />
        <Stat label="Players" value={ranked.length} />
        <Stat label="Evaluated" value={`${evaluatedScores.length}/${ranked.length}`} />
      </div>

      <div className="row mb-4">
        <button
          type="button"
          className="btn"
          onClick={exportRoster}
          disabled={!evaluatedScores.length || busy}
        >
          Open all PDFs
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={emailAll}
          disabled={!evaluatedScores.length || busy}
        >
          {busy ? "Sending…" : "Share all evaluations"}
        </button>
        {!canShareReports ? (
          <Link className="btn btn-secondary" to="/profile">
            Complete profile for PDFs
          </Link>
        ) : null}
      </div>

      {!loading && ranked.length > 0 && evaluatedScores.length === 0 ? (
        <p className="mb-3 muted">
          No evaluations for <strong>{sport?.name || "this sport"}</strong> yet. Evaluations are saved per sport —
          switch the Sport filter to the sport you evaluated (for example Basketball), or open that sport’s Rankings tab.
        </p>
      ) : null}

      {error ? <p className="mb-3 text-danger">{error}</p> : null}
      {shareNotice ? <p className="mb-3 text-lime">{shareNotice}</p> : null}
      {loading ? <p className="muted">Loading…</p> : null}

      {!loading && ranked.length === 0 ? (
        <EmptyState title="No players" body="Add roster players in a sport to generate rankings." />
      ) : (
        <section className="stack-sm">
          {ranked.map((player, index) => {
            const score = averageScore(player.evaluations, skills);
            return (
              <article key={player.id} className="glass ranking-row">
                <strong className="text-lime">#{index + 1}</strong>
                <div>
                  <h3>{player.name}</h3>
                  <p>
                    {player.sportPositions?.[sportId] || player.position || "No position"} ·{" "}
                    {player.evaluations?.length ?? 0} evals
                  </p>
                </div>
                <span className="score-lg">{score.toFixed(1)}</span>
                <div className="ranking-row__actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => exportPlayer(player)}
                    disabled={!player.evaluations?.length}
                  >
                    PDF
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => emailPlayer(player)}
                    disabled={!player.evaluations?.length || busy}
                  >
                    {busy ? "Sending…" : "Email"}
                  </button>
                  {sportId ? (
                    <Link
                      className="btn btn-secondary btn-sm"
                      to={`/sports/${sportId}?tab=evaluate&playerId=${player.id}`}
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

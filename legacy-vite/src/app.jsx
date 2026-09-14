import React, { useEffect, useMemo, useState } from "react";

const DEFAULT_ROSTER_SIZE = 15;
const DEFAULT_SCORE = 50;
const STORAGE_PREFIX = "evalscout-web-v1";
const WIX_CONFIG = {
  oauthClientId: import.meta.env.VITE_WIX_CLIENT_ID || window.EVALSCOUT_WIX_CONFIG?.oauthClientId || "",
  redirectUri: import.meta.env.VITE_WIX_REDIRECT_URI || window.EVALSCOUT_WIX_CONFIG?.redirectUri || "",
  productionRedirectUri: window.EVALSCOUT_WIX_CONFIG?.productionRedirectUri || "",
  siteUrl: import.meta.env.VITE_WIX_SITE_URL || window.EVALSCOUT_WIX_CONFIG?.siteUrl || "",
};

const sports = [
  {
    id: "soccer",
    name: "Soccer",
    brand: "PITCHSCOUT",
    icon: "⚽",
    tagline: "Youth Soccer Evaluations",
    positions: ["Forward", "Midfielder", "Defender", "Goalkeeper"],
    skills: [
      ["technical", "Technical", "Touch, dribbling, ball control"],
      ["passing", "Passing", "Accuracy, timing, vision"],
      ["shooting", "Shooting", "Power, placement, confidence"],
      ["defending", "Defending", "Pressure, tackling, recovery"],
      ["speed", "Speed", "Pace, quickness, first step"],
      ["fitness", "Fitness", "Work rate, stamina, intensity"],
      ["soccerIq", "Soccer IQ", "Decision-making, spacing, awareness"],
      ["coachability", "Coachability", "Listening, attitude, effort"],
      ["practiceEffort", "Practice Effort & Performance", "Consistency, intensity, competitiveness"],
    ],
  },
  {
    id: "basketball",
    name: "Basketball",
    brand: "COURTSCOUT",
    icon: "🏀",
    tagline: "Youth Basketball Evaluations",
    positions: ["Point Guard", "Shooting Guard", "Small Forward", "Power Forward", "Center"],
    skills: [
      ["ballHandling", "Ball Handling", "Control, pressure handling, change of pace"],
      ["shooting", "Shooting", "Form, range, consistency"],
      ["passing", "Passing", "Accuracy, timing, court vision"],
      ["defense", "Defense", "On-ball pressure, help defense, footwork"],
      ["rebounding", "Rebounding", "Positioning, timing, toughness"],
      ["athleticism", "Athleticism", "Quickness, explosiveness, body control"],
      ["basketballIq", "Basketball IQ", "Decision-making, spacing, game awareness"],
      ["coachability", "Coachability", "Listening, attitude, team habits"],
      ["practiceEffort", "Practice Effort & Performance", "Effort, competitiveness, training consistency"],
    ],
  },
  {
    id: "baseball",
    name: "Baseball",
    brand: "DIAMONDSCOUT",
    icon: "⚾",
    tagline: "Youth Baseball Evaluations",
    positions: ["Pitcher", "Catcher", "First Base", "Infield", "Outfield"],
    skills: diamondSkills("baseballIq", "Baseball IQ"),
  },
  {
    id: "football",
    name: "Football",
    brand: "GRIDSCOUT",
    icon: "🏈",
    tagline: "Youth Football Evaluations",
    positions: ["Quarterback", "Running Back", "Receiver", "Line", "Linebacker", "Defensive Back"],
    skills: [
      ["speed", "Speed", "Top-end speed, burst, pursuit"],
      ["strength", "Strength", "Functional strength, contact balance"],
      ["agility", "Agility", "Change of direction, footwork, body control"],
      ["tackling", "Tackling / Contact", "Form, physicality, safety, finish"],
      ["catching", "Catching / Ball Skills", "Hands, tracking, ball security"],
      ["blocking", "Blocking", "Leverage, hands, assignment execution"],
      ["footballIq", "Football IQ", "Assignments, reads, situational awareness"],
      ["coachability", "Coachability", "Listening, discipline, adjustment"],
      ["practiceEffort", "Practice Effort & Performance", "Motor, intensity, consistency"],
    ],
  },
  {
    id: "lacrosse",
    name: "Lacrosse",
    brand: "LAXSCOUT",
    icon: "🥍",
    tagline: "Youth Lacrosse Evaluations",
    positions: ["Attack", "Midfield", "Defense", "Goalie", "Faceoff"],
    skills: fieldSkills("lacrosseIq", "Lacrosse IQ"),
  },
  {
    id: "cheerleading",
    name: "Cheerleading",
    brand: "SPIRITSCOUT",
    icon: "📣",
    tagline: "Youth Cheer Evaluations",
    positions: ["Flyer", "Base", "Back Spot", "Tumbler"],
    skills: [
      ["tumbling", "Tumbling", "Technique, control, execution"],
      ["jumping", "Jumping", "Height, form, timing"],
      ["stunting", "Stunting", "Stability, confidence, synchronization"],
      ["motions", "Motions", "Sharpness, precision, consistency"],
      ["dance", "Dance", "Rhythm, movement, performance"],
      ["performance", "Performance", "Energy, confidence, crowd presence"],
      ["cheerIq", "Routine IQ", "Timing, transitions, awareness"],
      ["coachability", "Coachability", "Attitude, listening, adaptability"],
      ["practiceEffort", "Practice Effort & Performance", "Focus, energy, consistency"],
    ],
  },
  {
    id: "softball",
    name: "Softball",
    brand: "SOFTSCOUT",
    icon: "🥎",
    tagline: "Youth Softball Evaluations",
    positions: ["Pitcher", "Catcher", "First Base", "Infield", "Outfield"],
    skills: diamondSkills("softballIq", "Softball IQ"),
  },
  {
    id: "fieldhockey",
    name: "Field Hockey",
    brand: "FIELDSCOUT",
    icon: "🏑",
    tagline: "Youth Field Hockey Evaluations",
    positions: ["Forward", "Midfielder", "Defender", "Goalkeeper"],
    skills: fieldSkills("fieldIq", "Field Hockey IQ"),
  },
  {
    id: "volleyball",
    name: "Volleyball",
    brand: "NETSCOUT",
    icon: "🏐",
    tagline: "Youth Volleyball Evaluations",
    positions: ["Setter", "Outside Hitter", "Middle Blocker", "Opposite", "Libero", "Defensive Specialist"],
    skills: [
      ["serving", "Serving", "Accuracy, pace, consistency"],
      ["passing", "Passing", "Platform, control, serve receive"],
      ["setting", "Setting", "Hands, location, tempo"],
      ["attacking", "Attacking", "Approach, contact, shot selection"],
      ["blocking", "Blocking", "Timing, hand position, read"],
      ["defense", "Defense", "Digging, movement, reaction"],
      ["volleyballIq", "Volleyball IQ", "Rotations, court awareness, decisions"],
      ["coachability", "Coachability", "Listening, attitude, team habits"],
      ["practiceEffort", "Practice Effort & Performance", "Energy, consistency, competitiveness"],
    ],
  },
].map((sport) => ({
  ...sport,
  skills: sport.skills.map(([id, label, hint]) => ({ id, label, hint })),
}));

function diamondSkills(iqId, iqLabel) {
  return [
    ["hitting", "Hitting", "Contact, approach, swing mechanics"],
    ["power", "Power", "Exit strength, gap power, carry"],
    ["fielding", "Fielding", "Glove work, reads, reliability"],
    ["throwing", "Throwing", "Arm strength, accuracy, release"],
    ["running", "Running", "Speed, base running, instincts"],
    ["pitching", "Pitching", "Command, mechanics, pitchability"],
    [iqId, iqLabel, "Situational awareness, decisions, anticipation"],
    ["coachability", "Coachability", "Listening, adjustments, attitude"],
    ["practiceEffort", "Practice Effort & Performance", "Preparation, effort, focus"],
  ];
}

function fieldSkills(iqId, iqLabel) {
  return [
    ["stickSkills", "Stick Skills", "Passing, catching, control"],
    ["shooting", "Shooting", "Accuracy, power, shot selection"],
    ["defense", "Defense", "Positioning, footwork, pressure"],
    ["speed", "Speed", "Acceleration, transition speed"],
    ["agility", "Agility", "Change of direction, balance"],
    ["possession", "Possession", "Reaction, hustle, control"],
    [iqId, iqLabel, "Spacing, awareness, decisions"],
    ["coachability", "Coachability", "Listening, adjustments, attitude"],
    ["practiceEffort", "Practice Effort & Performance", "Intensity, competitiveness, consistency"],
  ];
}

function id() {
  return crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function defaultScores(skills, value = DEFAULT_SCORE) {
  return Object.fromEntries(skills.map((skill) => [skill.id, value]));
}

function averageScore(evaluations, skills) {
  if (!evaluations?.length || !skills.length) return 0;
  const total = evaluations.reduce((sum, evaluation) => {
    const skillTotal = skills.reduce((skillSum, skill) => skillSum + Number(evaluation.scores?.[skill.id] || 0), 0);
    return sum + skillTotal / skills.length;
  }, 0);
  return total / evaluations.length;
}

function medianScore(players, skills) {
  const values = players
    .filter((player) => player.evaluations?.length)
    .map((player) => averageScore(player.evaluations, skills))
    .sort((a, b) => a - b);
  if (!values.length) return null;
  const middle = Math.floor(values.length / 2);
  return values.length % 2 === 0 ? (values[middle - 1] + values[middle]) / 2 : values[middle];
}

function readJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem("evalscout-theme-v1") || "dark");
  const [sportId, setSportId] = useState(null);
  const selectedSport = sports.find((sport) => sport.id === sportId);

  useEffect(() => {
    localStorage.setItem("evalscout-theme-v1", theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <main className="app-shell">
      {!selectedSport ? (
        <Home theme={theme} setTheme={setTheme} onSelectSport={setSportId} />
      ) : (
        <SportApp sport={selectedSport} theme={theme} setTheme={setTheme} onBack={() => setSportId(null)} />
      )}
    </main>
  );
}

function Home({ theme, setTheme, onSelectSport }) {
  return (
    <div className="page">
      <header className="home-header glass">
        <LogoMark />
        <div className="brand-block">
          <h1>EVALSCOUT</h1>
          <p>Multi-Sport Evaluation Platform</p>
        </div>
        <button className="icon-button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
          {theme === "dark" ? "☀" : "☾"}
        </button>
      </header>

      <section className="hero glass">
        <span>Multi-Sport Evaluations</span>
        <h2>Choose your sport.</h2>
        <p>Select a sport to open a dedicated evaluation app with roster management, ratings, notes, rankings, and email sharing.</p>
      </section>

      <section className="wix-status glass">
        <div>
          <strong>Wix Headless</strong>
          <span>{WIX_CONFIG.oauthClientId ? "OAuth client configured" : "OAuth client missing"}</span>
        </div>
        <div>
          <strong>Redirect</strong>
          <span>{WIX_CONFIG.redirectUri || "Not set"}</span>
        </div>
        <a href={WIX_CONFIG.siteUrl || "#"} target="_blank" rel="noreferrer">
          Open Site
        </a>
      </section>

      <section className="sport-grid">
        {sports.map((sport) => (
          <button key={sport.id} className="sport-card glass" onClick={() => onSelectSport(sport.id)}>
            <div className="sport-icon">{sport.icon}</div>
            <h3>{sport.name}</h3>
            <p>{sport.tagline}</p>
            <div className="stats-row">
              <Stat label="Skills" value={sport.skills.length} />
              <Stat label="Roster" value={DEFAULT_ROSTER_SIZE} />
            </div>
          </button>
        ))}
      </section>

      <a className="suggestions glass" href="mailto:evalscout@gmail.com?subject=EVALSCOUT%20Suggestion">
        <strong>Help Improve EVALSCOUT</strong>
        <span>Send suggestions for sports, reports, analytics, or evaluation tools.</span>
      </a>
    </div>
  );
}

function SportApp({ sport, theme, setTheme, onBack }) {
  const storageKey = `${STORAGE_PREFIX}-${sport.id}`;
  const [tab, setTab] = useState("roster");
  const [players, setPlayers] = useState(() => readJson(storageKey, []));
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [editingPlayerId, setEditingPlayerId] = useState("");
  const [playerForm, setPlayerForm] = useState({ name: "", age: "", position: sport.positions[0], notes: "" });
  const [scores, setScores] = useState(() => defaultScores(sport.skills));
  const [skillNotes, setSkillNotes] = useState(() => defaultScores(sport.skills, ""));
  const [evaluationNotes, setEvaluationNotes] = useState("");
  const [season, setSeason] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [evaluationType, setEvaluationType] = useState("Tryout");
  const [emailAddress, setEmailAddress] = useState("");

  const selectedPlayer = players.find((player) => player.id === selectedPlayerId) || players[0];
  const rankedPlayers = useMemo(
    () => [...players].sort((a, b) => averageScore(b.evaluations, sport.skills) - averageScore(a.evaluations, sport.skills)),
    [players, sport.skills]
  );
  const currentOverall = sport.skills.reduce((sum, skill) => sum + Number(scores[skill.id] || 0), 0) / sport.skills.length;

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(players));
  }, [players, storageKey]);

  useEffect(() => {
    if (!selectedPlayerId && players[0]) setSelectedPlayerId(players[0].id);
  }, [players, selectedPlayerId]);

  function resetPlayerForm() {
    setEditingPlayerId("");
    setPlayerForm({ name: "", age: "", position: sport.positions[0], notes: "" });
  }

  function savePlayer(event) {
    event.preventDefault();
    const name = playerForm.name.trim();
    if (!name) return;

    if (editingPlayerId) {
      setPlayers((current) =>
        current.map((player) =>
          player.id === editingPlayerId ? { ...player, ...playerForm, name } : player
        )
      );
      resetPlayerForm();
      return;
    }

    const player = { id: id(), ...playerForm, name, evaluations: [] };
    setPlayers((current) => [player, ...current].slice(0, DEFAULT_ROSTER_SIZE));
    setSelectedPlayerId(player.id);
    resetPlayerForm();
  }

  function editPlayer(player) {
    setEditingPlayerId(player.id);
    setSelectedPlayerId(player.id);
    setPlayerForm({ name: player.name, age: player.age, position: player.position, notes: player.notes });
  }

  function deletePlayer(playerId) {
    setPlayers((current) => current.filter((player) => player.id !== playerId));
    if (selectedPlayerId === playerId) setSelectedPlayerId("");
    if (editingPlayerId === playerId) resetPlayerForm();
  }

  function saveEvaluation(event) {
    event.preventDefault();
    if (!selectedPlayer) return;
    const evaluation = {
      id: id(),
      date: new Date().toISOString(),
      season,
      year,
      evaluationType,
      scores,
      skillNotes,
      notes: evaluationNotes,
    };
    setPlayers((current) =>
      current.map((player) =>
        player.id === selectedPlayer.id
          ? { ...player, evaluations: [evaluation, ...(player.evaluations || [])] }
          : player
      )
    );
    setTab("rankings");
  }

  function loadLatestEvaluation(playerId) {
    setSelectedPlayerId(playerId);
    const player = players.find((item) => item.id === playerId);
    const latest = player?.evaluations?.[0];
    setScores({ ...defaultScores(sport.skills), ...(latest?.scores || {}) });
    setSkillNotes({ ...defaultScores(sport.skills, ""), ...(latest?.skillNotes || {}) });
    setEvaluationNotes(latest?.notes || "");
  }

  return (
    <div className="page">
      <header className="sport-header glass">
        <button className="icon-button" onClick={onBack}>⌂</button>
        <div className="sport-icon">{sport.icon}</div>
        <div className="brand-block">
          <h1>{sport.brand}</h1>
          <p>{sport.tagline}</p>
        </div>
        <button className="icon-button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
          {theme === "dark" ? "☀" : "☾"}
        </button>
      </header>

      <nav className="tabs">
        {["roster", "evaluate", "rankings"].map((item) => (
          <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>
            {item}
          </button>
        ))}
      </nav>

      {tab === "roster" && (
        <section className="stack">
          <section className="hero glass">
            <span>{sport.name} Toolkit</span>
            <h2>Build the roster.</h2>
            <p>Add, edit, and manage players before moving into evaluations.</p>
          </section>

          <form className="panel glass" onSubmit={savePlayer}>
            <h3>{editingPlayerId ? "Edit Player" : "Add Player"}</h3>
            <input placeholder="Player name" value={playerForm.name} onChange={(event) => setPlayerForm({ ...playerForm, name: event.target.value })} />
            <div className="form-grid">
              <input placeholder="Age" value={playerForm.age} onChange={(event) => setPlayerForm({ ...playerForm, age: event.target.value })} />
              <select value={playerForm.position} onChange={(event) => setPlayerForm({ ...playerForm, position: event.target.value })}>
                {sport.positions.map((position) => <option key={position}>{position}</option>)}
              </select>
            </div>
            <textarea placeholder="Coach notes" value={playerForm.notes} onChange={(event) => setPlayerForm({ ...playerForm, notes: event.target.value })} />
            <div className="button-row">
              {editingPlayerId && <button type="button" className="secondary" onClick={resetPlayerForm}>Cancel</button>}
              <button>{editingPlayerId ? "Save Player" : "Add Player"}</button>
            </div>
          </form>

          {players.length === 0 ? (
            <EmptyState title="No players yet" body="Add your first rostered player." />
          ) : (
            <section className="player-grid">
              {players.map((player) => (
                <article key={player.id} className="player-card glass">
                  <div>
                    <h3>{player.name}</h3>
                    <p>{player.position}{player.age ? ` · Age ${player.age}` : ""}</p>
                  </div>
                  <strong>{averageScore(player.evaluations, sport.skills).toFixed(1)}</strong>
                  <div className="button-row">
                    <button className="secondary" onClick={() => editPlayer(player)}>Edit</button>
                    <button className="danger" onClick={() => deletePlayer(player.id)}>Delete</button>
                  </div>
                </article>
              ))}
            </section>
          )}
        </section>
      )}

      {tab === "evaluate" && (
        <form className="stack" onSubmit={saveEvaluation}>
          <section className="hero glass">
            <span>New {sport.name} Evaluation</span>
            <h2>Rate the player.</h2>
            <p>Score each skill from 0 to 100 and save the evaluation.</p>
          </section>

          {players.length === 0 ? (
            <EmptyState title="Add players first" body="Create a roster, then come back to evaluate." />
          ) : (
            <>
              <div className="panel glass">
                <select value={selectedPlayer?.id || ""} onChange={(event) => loadLatestEvaluation(event.target.value)}>
                  {players.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}
                </select>
                <div className="score-callout">{currentOverall.toFixed(1)}</div>
              </div>
              {sport.skills.map((skill) => (
                <div key={skill.id} className="panel glass">
                  <div className="skill-title">
                    <div>
                      <h3>{skill.label}</h3>
                      <p>{skill.hint}</p>
                    </div>
                    <strong>{Number(scores[skill.id] || 0).toFixed(1)}</strong>
                  </div>
                  <input type="range" min="0" max="100" step="0.1" value={scores[skill.id] || 0} onChange={(event) => setScores({ ...scores, [skill.id]: Number(event.target.value) })} />
                  <textarea placeholder={`${skill.label} notes`} value={skillNotes[skill.id] || ""} onChange={(event) => setSkillNotes({ ...skillNotes, [skill.id]: event.target.value })} />
                </div>
              ))}
              <div className="form-grid">
                <input placeholder="Season" value={season} onChange={(event) => setSeason(event.target.value)} />
                <input placeholder="Year" value={year} onChange={(event) => setYear(event.target.value)} />
              </div>
              <select value={evaluationType} onChange={(event) => setEvaluationType(event.target.value)}>
                {["Tryout", "Practice", "Tournament", "Season Evaluation", "Camp", "Clinic"].map((item) => <option key={item}>{item}</option>)}
              </select>
              <textarea placeholder="Evaluation notes" value={evaluationNotes} onChange={(event) => setEvaluationNotes(event.target.value)} />
              <button>Save Evaluation</button>
            </>
          )}
        </form>
      )}

      {tab === "rankings" && (
        <section className="stack">
          <section className="hero glass">
            <span>{sport.name} Insights</span>
            <h2>The board.</h2>
            <p>Ranked by overall rating across saved evaluations.</p>
          </section>
          <div className="stats-row">
            <Stat label="Median Score" value={medianScore(players, sport.skills)?.toFixed(1) || "N/A"} />
            <Stat label="Evaluated" value={`${players.filter((player) => player.evaluations?.length).length}/${players.length}`} />
          </div>
          <input type="email" placeholder="Email address" value={emailAddress} onChange={(event) => setEmailAddress(event.target.value)} />
          {rankedPlayers.length === 0 ? (
            <EmptyState title="No roster yet" body="Add players to generate rankings." />
          ) : rankedPlayers.map((player, index) => (
            <RankingRow key={player.id} rank={index + 1} player={player} sport={sport} emailAddress={emailAddress} />
          ))}
        </section>
      )}
    </div>
  );
}

function RankingRow({ rank, player, sport, emailAddress }) {
  const score = averageScore(player.evaluations, sport.skills);
  const latest = player.evaluations?.[0];
  const summary = [
    `${sport.brand} Evaluation`,
    `Sport: ${sport.name}`,
    `Player: ${player.name}`,
    `Position: ${player.position}`,
    `Age: ${player.age || "N/A"}`,
    `Overall Score: ${score.toFixed(1)} / 100`,
    latest ? `Date: ${new Date(latest.date).toLocaleDateString()}` : "",
    latest?.notes ? `Notes: ${latest.notes}` : "",
  ].filter(Boolean).join("\\n");
  const mailto = emailAddress
    ? `mailto:${emailAddress}?subject=${encodeURIComponent(`${sport.brand} Evaluation - ${player.name}`)}&body=${encodeURIComponent(summary)}`
    : null;

  return (
    <article className="ranking-row glass">
      <strong>#{rank}</strong>
      <div>
        <h3>{player.name}</h3>
        <p>{player.position} · {player.evaluations?.length || 0} evaluations</p>
      </div>
      <span>{score.toFixed(1)}</span>
      {mailto && <a href={mailto}>Email</a>}
    </article>
  );
}

function Stat({ label, value }) {
  return (
    <div className="stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function EmptyState({ title, body }) {
  return (
    <section className="empty glass">
      <strong>{title}</strong>
      <p>{body}</p>
    </section>
  );
}

function LogoMark() {
  return (
    <div className="logo-mark" aria-label="EvalScout logo">
      <svg viewBox="0 0 120 140" role="img">
        <path d="M60 8 104 24v45c0 31-18 53-44 63-26-10-44-32-44-63V24L60 8Z" fill="none" stroke="currentColor" strokeWidth="8" />
        <path d="M32 88l22-24 18 14 24-34" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M32 104h56" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export default App;

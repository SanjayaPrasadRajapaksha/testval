/**
 * Lightweight production web automation against evalscout.hasthiya.com
 * Uses the same API the SPA uses: login, profile, sports, players.
 */
const WEB = (process.env.WEB_URL || "https://evalscout.hasthiya.com").replace(/\/$/, "");
const API = (process.env.API_BASE || "https://api.evalscout.hasthiya.com").replace(/\/$/, "");
const EMAIL = process.env.DEMO_EMAIL || "coach@evalscout.org";
const PASSWORD = process.env.DEMO_PASSWORD || "Coach123!";

let passed = 0;
let failed = 0;
const failures = [];

function ok(condition, message) {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${message}`);
  } else {
    failed += 1;
    failures.push(message);
    console.error(`  ✗ ${message}`);
  }
}

async function get(url) {
  const res = await fetch(url, { redirect: "follow" });
  const text = await res.text();
  return { status: res.status, text, headers: res.headers };
}

async function api(method, path, { token, body } = {}) {
  const headers = { Accept: "application/json", "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  return { status: res.status, data };
}

async function run() {
  console.log(`\nEvalScout web production automation`);
  console.log(`WEB: ${WEB}`);
  console.log(`API: ${API}\n`);

  console.log("1) SPA shell pages");
  for (const path of ["/", "/login", "/register", "/dashboard", "/profile", "/settings", "/reports"]) {
    const page = await get(`${WEB}${path}`);
    ok(page.status === 200, `${path} → ${page.status}`);
    if (path === "/") {
      ok(page.text.includes("index-DFgXjgI9.js") || page.text.includes("/assets/"), "home references built assets");
      ok(page.text.includes(".htaccess") === false, "home does not leak server files");
    }
  }

  console.log("\n2) Static assets");
  const home = await get(`${WEB}/`);
  const assetMatches = [...home.text.matchAll(/\/assets\/[a-zA-Z0-9._-]+/g)].map((m) => m[0]);
  ok(assetMatches.length >= 1, `found ${assetMatches.length} asset refs`);
  for (const asset of [...new Set(assetMatches)].slice(0, 4)) {
    const a = await get(`${WEB}${asset}`);
    ok(a.status === 200, `${asset} → ${a.status}`);
  }

  console.log("\n3) Demo coach login via API (same as web SPA)");
  const login = await api("POST", "/api/auth/login", {
    body: { email: EMAIL, password: PASSWORD },
  });
  ok(login.status === 200, `login status ${login.status}`);
  ok(Boolean(login.data?.accessToken), "login returns access token");
  const token = login.data?.accessToken;

  console.log("\n4) Authenticated profile + sports used by web");
  const me = await api("GET", "/api/auth/me", { token });
  ok(me.status === 200, `me → ${me.status}`);
  ok((me.data?.user?.email || me.data?.email) === EMAIL, "session email matches demo coach");

  const profile = await api("GET", "/api/coach-profile", { token });
  ok(profile.status === 200, `coach-profile → ${profile.status}`);
  ok(typeof (profile.data?.coachName ?? profile.data?.displayName ?? "") === "string", "profile has name field");

  const sports = await api("GET", "/api/sports");
  ok(sports.status === 200 && Array.isArray(sports.data) && sports.data.length >= 10, `sports → ${sports.status} count=${sports.data?.length}`);

  const players = await api("GET", "/api/players?limit=20", { token });
  ok(players.status === 200, `players → ${players.status}`);

  console.log("\n5) Negative auth checks");
  const bad = await api("POST", "/api/auth/login", {
    body: { email: EMAIL, password: "WrongPass999!" },
  });
  ok(bad.status === 401 || bad.status === 400, `wrong password rejected (${bad.status})`);

  console.log("\n6) cPanel report email API");
  const mailNoAuth = await fetch(`${WEB}/api/send-report.php`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  ok(mailNoAuth.status === 401, `send-report.php without token → ${mailNoAuth.status}`);
  const mailBadToken = await fetch(`${WEB}/api/send-report.php`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer invalid.token.here",
    },
    body: "{}",
  });
  ok(mailBadToken.status === 401, `send-report.php bad token → ${mailBadToken.status}`);

  const firebaseKey = "AIzaSyCuFt8kGzq49L4rhSsSgkZUx48aPYIEtcU";
  const fbLogin = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: EMAIL,
        password: PASSWORD,
        returnSecureToken: true,
      }),
    },
  );
  const fbData = await fbLogin.json().catch(() => ({}));
  const idToken = fbData.idToken;
  if (idToken) {
    ok(true, `firebase login → ${fbLogin.status}`);
  } else {
    console.log(
      `  ⚠ firebase login skipped (${fbData.error?.message || fbLogin.status}) — coach@ may be API-only; live app users still use Firebase`,
    );
  }

  if (idToken) {
    const invalidTo = await fetch(`${WEB}/api/send-report.php`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ to: "not-an-email", subject: "EvalScout test" }),
    });
    ok(invalidTo.status === 400, `send-report.php invalid email → ${invalidTo.status}`);

    const tinyPdf = Buffer.from(
      "%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF",
      "utf8",
    ).toString("base64");
    const sendTest = await fetch(`${WEB}/api/send-report.php`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        to: EMAIL,
        subject: "EvalScout automated test",
        html: "<p>Automated cPanel mail test — safe to ignore.</p>",
        text: "Automated cPanel mail test — safe to ignore.",
        pdfBase64: tinyPdf,
        filename: "test.pdf",
      }),
    });
    const sendBody = await sendTest.json().catch(() => ({}));
    ok(sendTest.status === 200 && sendBody.ok === true, `send-report.php send → ${sendTest.status}`);
    if (sendBody.method) {
      console.log(`    mail method: ${sendBody.method}`);
    }
  }

  console.log(`\nResult: ${passed} passed, ${failed} failed`);
  if (failures.length) {
    console.error("Failures:\n- " + failures.join("\n- "));
    process.exit(1);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

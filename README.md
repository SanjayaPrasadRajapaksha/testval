# EvalScout Web

React SPA (Vite + JavaScript) for coaches. Talks to the EvalScout **Node API** — no Wix, no Next.js.

## Stack

- Vite + React (JSX)
- React Router (`BrowserRouter`)
- Plain CSS (lime-on-dark brand tokens + spring press motion)
- Auth + data via **Firebase** (Auth, Firestore, Storage)

Same Firebase project as the iOS app (`evalscout-cb68e`), so coaches share rosters and evaluations across web and mobile.

## Setup

```bash
source ~/.nvm/nvm.sh && nvm use 20
cp .env.example .env.local
npm install
npm run dev
```

Default API: `https://api.evalscout.hasthiya.com` (override with `VITE_API_URL`).

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Local Vite dev server |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview the production build |

## Environment

```
VITE_API_URL=https://api.evalscout.hasthiya.com
```

For local API: `VITE_API_URL=http://localhost:8787`

## Routes

| Path | Auth | Description |
|------|------|-------------|
| `/` | — | Landing |
| `/login` | — | Sign in |
| `/register` | — | Create account |
| `/forgot-password` | — | Request reset email |
| `/reset-password` | — | Set new password (`?token=`) |
| `/verify-email` | — | Verify email (`?token=`) |
| `/dashboard` | ✓ | Sports grid (`GET /api/sports`) |
| `/sports/:sportId` | ✓ | Roster / evaluate / rankings (`?tab=`) |
| `/profile` | ✓ | Coach profile |
| `/settings` | ✓ | Theme & defaults |
| `/reports` | ✓ | Cross-sport rankings |
| `/admin` | ✓ Admin | Super Admin panel |

Protected routes use `RequireAuth` and redirect to `/login`.

## Roles & permissions

| Layer | Values | Purpose |
|-------|--------|---------|
| Account role (`users.role`) | `USER`, `ADMIN` | Real access control |
| Coach title (`coachProfiles.role`) | Head Coach, Assistant Coach, Evaluator, Director | Report/display label only |

- Registration can create `USER` or `ADMIN` based on selected account role.
- Coaches can only read/write their own players, evaluations, and profile (`coachId` / uid scoped).
- Admins can list users, inspect accounts, and change account roles in `/admin/users/:id`.
- Admins cannot remove their own admin role.
- Deploy updated `firestore.rules` / `storage.rules` after pulling these changes.

## Deploy automation (GitHub Actions)

Workflow: repo root `.github/workflows/deploy-web.yml`

On every push to `main` under `web/EvalScoutWeb-main/` (or manual run):
1. Build SPA with production `VITE_API_URL`
2. FTPS upload to cPanel `public_html`
3. Smoke-test web + API health

## Report email (Firebase Functions)

Evaluation **Email** / **Share all** buttons call the callable function `sendReportEmail` (SMTP via your cPanel mail account).

From `web/EvalScoutWeb-main/`:

```bash
firebase functions:secrets:set SMTP_PASS
firebase deploy --only functions:sendReportEmail
```

Optional params: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_FROM` (defaults target `mail.evalscout.hasthiya.com`).

If the function is not deployed, the app downloads the PDF and opens your mail app so you can attach it manually.

**Required secrets** (`Settings → Secrets and variables → Actions`):

| Secret | Value |
|--------|--------|
| `FTP_SERVER` | `s1270.syd1.mysecurecloudhost.com` |
| `FTP_USERNAME` | your FTP user |
| `FTP_PASSWORD` | your FTP password |
| `FTP_SERVER_DIR` | `/public_html/` |
| `VITE_API_URL` | `https://api.evalscout.hasthiya.com` (optional) |

Full guide: monorepo `docs/06-CI_AUTOMATION.md` / `docs/05-CPANEL_DEPLOY.md`.


## Legacy folders

- `legacy-next/` — archived Next.js app (feature reference)
- `legacy-vite/` — old local-only Vite prototype (includes Wix; not used)

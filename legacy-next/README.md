# EvalScoutWeb

Production Next.js website for EvalScout, connected to **EvalScoutApi**.

The original Vite React prototype is preserved under [`legacy-vite/`](./legacy-vite/).

## Stack

- Next.js 15 (App Router)
- React 19 + TypeScript
- Tailwind CSS v4
- Client Bearer tokens (`accessToken` / `refreshToken` in `localStorage`) with automatic refresh via `/api/auth/refresh`

## Prerequisites

- Node 20 (`nvm use 20`)
- EvalScoutApi running at `http://localhost:8787` (see `EvalScoutApi/README.md`)

## Setup

```bash
source ~/.nvm/nvm.sh && nvm use 20
cd EvalScoutWeb
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:8787
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo credentials

After seeding the API:

- **Coach:** `coach@evalscout.org` / `Coach123!`
- **Admin:** `admin@evalscout.org` / `Admin123!`

## Scripts

| Command        | Description                |
|----------------|----------------------------|
| `npm run dev`  | Dev server (Turbopack)     |
| `npm run build`| Production build           |
| `npm start`    | Serve production build     |
| `npm run lint` | ESLint                     |

## Pages

| Route | Purpose |
|-------|---------|
| `/` | Marketing home |
| `/login` | Sign in |
| `/register` | Create account |
| `/forgot-password` | Request reset email |
| `/reset-password` | Set new password (`?token=`) |
| `/verify-email` | Verify email (`?token=`) |
| `/dashboard` | Sport grid (`GET /api/sports`) |
| `/sports/[sportId]` | Roster / Evaluate / Rankings tabs |
| `/profile` | Coach profile |
| `/settings` | Theme, language, roster defaults |
| `/reports` | Cross-sport rankings + email share |

## Migration from Vite

1. Prototype sources were moved to `legacy-vite/` (`src/`, `index.html`, `vite.config.js`, old `package.json`).
2. This folder is now a Next.js App Router app under `src/app/`.
3. Local storage roster demos are replaced by authenticated API calls.
4. To run the old prototype: `cd legacy-vite && npm install && npm run dev` (port 5173).

## Wix notes

Historical Wix Headless notes remain in `legacy-vite/docs/wix-headless-next-steps.md`.

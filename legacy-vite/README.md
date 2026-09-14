# EvalScoutWeb

Browser prototype for the EvalScout web version.

## Run Locally

Install dependencies and start Vite:

```bash
npm install
npm run dev
```

The local app should open at `http://localhost:5173/`.

## What Is Included

- Multi-sport home page
- Roster add/edit/delete
- Player evaluations with 0-100 sliders
- Rankings
- Email summary links
- Light/dark theme
- Browser local storage
- Vite React project structure

## Wix

See `docs/wix-headless-next-steps.md` for the path to move this prototype into Wix Headless.

The requested Vite environment values are in `.env.local`.

Current public Wix fallback values are stored in `public/wix-config.js`:

- OAuth Client ID: `7b03d3a9-6db6-45ae-a037-47a01c870b51`
- Development redirect URI: `http://localhost:5173/auth/callback`
- Production redirect URI: `https://www.evalscout.org/auth/callback`
- Site URL: `https://www.evalscout.org/`

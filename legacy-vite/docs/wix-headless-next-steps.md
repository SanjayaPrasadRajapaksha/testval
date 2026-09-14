# EvalScout Web to Wix Headless

This folder is a Vite + React web version of EvalScout. It currently stores roster/evaluation data in browser `localStorage`.

## Current Status

- Home sport picker is ported.
- Roster add/edit/delete is ported.
- Evaluation sliders and notes are ported.
- Rankings and email summary links are ported.
- Data is local to the browser.
- Public Wix OAuth fallback configuration is stored in `public/wix-config.js`.
- Vite environment configuration is stored in `.env.local`.

## Wix OAuth Values

- Vite env file: `.env.local`
- Express API secret file: `server/.env`
- OAuth Client ID: `7b03d3a9-6db6-45ae-a037-47a01c870b51`
- Development redirect URI: `http://localhost:5173/auth/callback`
- Production redirect URI: `https://www.evalscout.org/auth/callback`
- Site URL: `https://www.evalscout.org/`

Do not add the Wix client secret to a `VITE_` variable. It belongs only in the backend API environment.

## Wix Headless Path

The next production step is to convert this prototype into a Wix-supported frontend project and replace local storage with Wix-backed data.

The local Express API is in the sibling folder:

```text
../EvalScoutApi
```

Recommended data collections:

- `Teams`
- `Players`
- `Evaluations`
- `Sports`

Suggested flow:

1. Install Node.js/npm locally.
2. Run `npm install`.
3. Run `npm run dev`.
4. Create Wix CMS collections for teams, players, and evaluations.
5. Replace `localStorage` calls with Wix SDK/API reads and writes.
6. Add authentication with Wix Members if accounts are needed.
7. Test locally.
8. Release the Wix site and connect a domain.

Note: The current Codex Wix Headless workflow supports a full Astro site path. Custom React/Vite authoring is not available in this environment yet, so this folder is the web prototype and migration source.

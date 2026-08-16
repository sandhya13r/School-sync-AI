# SchoolSync AI

An AI-native school operating system demo — proactive admin dashboard, AI document reader,
conflict-aware timetable generator, substitute-teacher recommender, AI performance analytics,
an AI admin assistant, and role-based portals for Admin / Teacher / Student / Parent.

Runs entirely client-side (no backend required) with data persisted in the browser.

## Demo accounts

All demo accounts use the password `demo123`. On the sign-in screen, click into the
email field to see them listed, or type the address manually:

| Role    | Email                  |
|---------|------------------------|
| Admin   | admin@schoolos.ai      |
| Teacher | teacher@schoolos.ai    |
| Student | student@schoolos.ai    |
| Parent  | parent@schoolos.ai     |

## Run it locally

Requires [Node.js](https://nodejs.org) 18+.

```bash
npm install
npm run dev
```

Then open the URL it prints (usually `http://localhost:5173`).

## Build for production

```bash
npm run build
npm run preview   # optional: preview the production build locally
```

The build output goes to `dist/`.

## Push this project to GitHub

From inside this project folder:

```bash
git init
git add .
git commit -m "Initial commit — SchoolSync AI"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

(Create the empty repo on GitHub first — github.com → New repository — without a README,
so it doesn't conflict with this one.)

## Deploy it (optional)

**GitHub Pages**
1. In `vite.config.js`, set `base: "/<your-repo-name>/"`.
2. `npm install -D gh-pages`
3. Add to `package.json` scripts: `"deploy": "vite build && gh-pages -d dist"`
4. `npm run deploy`, then enable Pages in the repo settings (source: `gh-pages` branch).

**Vercel / Netlify**
Just import the GitHub repo — both auto-detect Vite. Build command: `npm run build`,
output directory: `dist`.

## Notes on data persistence

This app was originally built as a Claude.ai artifact, which provides a `window.storage`
API for persistence. This project includes a small polyfill (top of `src/App.jsx`) that
backs the same API with `localStorage` when running outside Claude.ai, so persistence
works the same way standalone — data is saved per-browser and survives refreshes.

## Scope

This implements the "Round 2 — Must Build + Strong Differentiators" feature set: AI
Document Reader, Smart Timetable + Conflict Solver, Substitute Teacher AI, Student/Teacher
management, Attendance & Marks, AI Performance Analytics, AI Admin Assistant, and the AI
Question Paper Generator. All logic (conflict detection, substitute ranking, at-risk
detection, timetable generation) runs as real deterministic algorithms over the seeded
data — not placeholder UI. Library/Transport/Inventory/Maintenance/Audit-logs were left
out of scope, matching the roadmap's own Priority 3 list.

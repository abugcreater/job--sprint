# Job Sprint React Frontend

This directory is the React-first frontend layer for Job Sprint.

## Scope

The React layer is being built in small phases. The legacy static app remains the rollback path until Android and production routing explicitly switch to React.

Step 1 created the engineering skeleton:

- React + TypeScript + Vite
- Tailwind CSS design tokens
- HashRouter for Android WebView-friendly routing
- Zustand store skeleton with localStorage persistence
- TypeScript domain models
- Vitest setup

Step 2 implements the Today MVP:

- Compact schedule seed generated from `../../data/schedule.json`
- Today sprint dashboard
- Current task focus card
- Evidence Gate with localStorage persistence
- Today risk panel
- Oral practice entry
- Mobile bottom navigation
- Local fallback and sync status display

It does not replace the legacy static app yet, and it does not change Android WebView loading.

## Legacy Fallback

The existing static implementation remains the rollback path:

- `../../schedule.html`
- `../../assets/schedule.css`
- `../../assets/schedule.js`
- `../../apps/android/app/src/main/assets/web/**`

Do not delete those files while the React version is still being built and verified.

## Commands

```bash
cd apps/react-web
npm install
npm run prepare:schedule
npm test
npm run build
npx playwright screenshot --channel chrome --viewport-size "390,844" --wait-for-selector "text=求职冲刺今日工作台" http://127.0.0.1:5174/ ../../docs/evidence/react-step-2-mobile.png
```

`npm run prepare:schedule` regenerates `src/data/scheduleCompact.json` from the full schedule. The compact seed intentionally drops absolute paths and large path-audit detail from the React bundle.

## Android Direction

Later phases can copy `apps/react-web/dist/**` into `apps/android/app/src/main/assets/react/` and let the Android WebView load the React build first. The current Android fallback under `apps/android/app/src/main/assets/web/**` must remain available for rollback.

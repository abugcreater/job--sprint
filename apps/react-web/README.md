# Job Sprint React Frontend

This directory is the React-first frontend layer for Job Sprint.

## Scope

The React layer is the user-facing Job Sprint experience. New users do not receive seed schedules, Java learning cards, interview questions, or opportunity data from static JSON. A user must import a resume/JD, build a profile, and generate a personal calendar before Today, Learn, Interview, Opportunity, and Review modules show task content.

Step 1 created the engineering skeleton:

- React + TypeScript + Vite
- Tailwind CSS design tokens
- HashRouter for Android WebView-friendly routing
- Zustand store skeleton with localStorage persistence
- TypeScript domain models
- Vitest setup

Current flow:

- Profile import and onboarding in the Coach module
- User-scoped calendar generation from the active profile
- Empty states before profile/calendar generation
- User-scoped modules for Today, Learn, Interview, Opportunity, Review, and Stats
- Android WebView loading the React build, with a no-profile fallback page when assets are missing

## Static Fallback

The static implementation is not a user data source. It only redirects into the React app or shows a no-profile fallback when the React assets are unavailable:

- `../../schedule.html`
- `../../assets/schedule.css`
- `../../assets/schedule.js`
- `../../apps/android/app/src/main/assets/web/**`

Do not add task, knowledge, interview, opportunity, or review seed content to these files.

## Commands

```bash
cd apps/react-web
npm install
npm test
npm run build
npx playwright screenshot --channel chrome --viewport-size "390,844" --wait-for-selector "text=导入画像" http://127.0.0.1:5175/today ../../docs/evidence/new-user-data-isolation/web/today-empty-mobile.png
```

## Android Direction

After each React build, run the root `npm run sync:android-react` command so `apps/react-web/dist/**` is copied into `apps/android/app/src/main/assets/react/`. The Android static fallback under `apps/android/app/src/main/assets/web/**` must remain seed-free.

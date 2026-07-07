# Job Sprint Coach

Job Sprint Coach is a multi-surface interview preparation and job-search workflow application. It combines a React web workspace, Node.js and Rust API implementations, and an Android WebView shell for personal learning tasks, evidence tracking, interview practice, application follow-up, review, and AI-assisted coaching.

> Security note: before publishing this repository, remove or replace all private data, local paths, deployment evidence, real domains, server IPs, and personal resume/interview material. Do not publish a branch whose Git history contains sensitive information.

## Features

- Daily task workspace with evidence-gated completion.
- Learning notes, knowledge-boundary cards, and interview-practice records.
- Application follow-up records and review summaries.
- AI-assisted coach artifacts, boundary suggestions, and scoring fallback.
- Multi-user runtime data scopes for development and testing.
- Node.js server, Rust/Axum server, React frontend, and Android WebView shell.
- Functional and boundary tests for web, server, Rust runtime, and Android flows.

## Tech Stack

- Web: React, TypeScript, Vite, Vitest, Playwright.
- Node server: plain Node.js HTTP routes.
- Rust server: Axum, SQLx, SQLite.
- Android: Java WebView shell.
- Tooling: npm scripts, Cargo, Gradle.

## Project Structure

```text
apps/
  react-web/      React frontend
  server/         Node.js API server
  rust-api/       Rust/Axum API server
  android/        Android WebView shell
assets/           Static legacy web assets
data/             Sample or local data inputs
docs/             Architecture and product notes
tests/            Node, browser, Android, and Rust validation tests
tools/            Build, validation, delivery, and safety scripts
```

## Local Setup

```bash
npm install
npm --prefix apps/react-web install
cp .env.example .env
```

Edit `.env` with local-only values. Keep `.env`, signing keys, user databases, runtime databases, and provider tokens out of Git.

## Run

Node server:

```bash
npm start
```

Rust server:

```bash
npm run start:rust
```

React app tests:

```bash
npm --prefix apps/react-web test
```

Repository checks:

```bash
npm run scan:sensitive
npm test
```

Android builds require a local Android SDK and Gradle. Release signing requires a keystore outside this repository.

## Environment Variables

Use `.env.example` as the public template. Important groups:

- Server: `HOST`, `PORT`, `RUNTIME_DATA_PATH`, `DATABASE_URL`.
- Auth: `JOB_SPRINT_AUTH_USER`, `JOB_SPRINT_AUTH_PASSWORD`, `JOB_SPRINT_SESSION_SECRET`, `JOB_SPRINT_USERS_FILE`.
- AI: `ANTHROPIC_BASE_URL`, `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_MODEL`.
- Speech: `ASR_PROVIDER`, `ASR_AUTH_TOKEN`, `ASR_MAX_AUDIO_BYTES`.
- Android: `JOB_SPRINT_ANDROID_WEBVIEW_URL`, `JOB_SPRINT_ANDROID_KEYSTORE`, release signing passwords.

All real values must live in untracked local files or secret managers.

## Security Notes

- Never commit real API keys, tokens, passwords, session secrets, keystores, SQLite databases, evidence reports, or production runtime data.
- Do not publish private resume, interview, job-search, or customer/business records.
- Replace real deployment URLs and IP addresses with example placeholders before open sourcing.
- If secrets have ever been committed, rotate them and rewrite Git history before making the repository public.

## Deployment

This project includes delivery helper scripts, but public deployments should use your own infrastructure and secret-management process. Use `.env.example` to create a private deployment environment file outside the repository.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Security Reports

See [SECURITY.md](SECURITY.md). Do not open public issues containing secrets or exploit details.

## License

This project is released under the MIT License. See [LICENSE](LICENSE).

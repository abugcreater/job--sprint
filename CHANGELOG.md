# Changelog

All notable changes should be documented in this file.

## Unreleased

## 0.2.5 - 2026-07-29

- Added unsaved-change confirmation for editing local review records, preserving the original Evidence Gate record until the user explicitly discards the draft.
- Added unsaved-change confirmation for detailed profile editing flows, preserving the active profile and its draft until the user confirms a replacement action.
- Corrected the Sub2API remote base-path acceptance check to recognize both PNG and SVG branding assets.

## 0.2.4 - 2026-07-26

- Added AI recovery guidance and clearer rate-limit and timeout feedback for coach runs.
- Added unsaved-change confirmation to the opportunity editor, preserving drafts until a user explicitly discards them.

## 0.2.3 - 2026-07-23

- Added authenticated Vite proxy diagnostics for both Node and Rust coach runtimes, including session scope and AI run readback coverage.
- Added a Chinese project overview covering product positioning, user workflow, technical choices, delivery boundaries, and current limitations.

## 0.2.2 - 2026-07-20

- Prepared repository metadata for open-source review.
- Added public security guidance and contribution rules.
- Expanded `.gitignore` and `.env.example` for safer local development.

## 0.2.0

- Added multi-surface job sprint workflow with React, Node.js, Rust, and Android components.
- Added authentication, runtime persistence, evidence tracking, interview practice, application follow-up, review, and AI coach flows.
- Added validation scripts and functional tests for web, server, Rust, and Android workflows.

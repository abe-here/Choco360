# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Dev server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# E2E tests (Playwright — requires dev server running or starts it automatically)
npm test

# Unit tests (Vitest — services/__tests__/**/*.test.ts only)
npm run test:unit

# Unit tests with coverage
npm run test:unit:coverage

# Run a single E2E test file
npx playwright test tests/e2e/auth.spec.ts

# Run a single Vitest test file
npx vitest run services/__tests__/prpImportService.test.ts
```

## Environment Variables

Copy `.env.local` (not committed). Required vars:
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon public key
- `VITE_GEMINI_API_KEY` — Google Gemini AI API key
- `VITE_SLACK_BOT_TOKEN` — Slack bot token (optional; notifications silently skip if missing)
- `VITE_APP_URL` — Deployed app URL (for Slack notification deep links)
- `VITE_GOOGLE_CLIENT_ID` — Google OAuth client ID

## Architecture Overview

**Choco360** is a single-page React 19 + TypeScript app (Vite). It's a 360-degree peer feedback platform for `@choco.media` employees, backed by Supabase (Postgres + Auth).

### Entry point and routing

`App.tsx` is the root. Navigation is tab-based (`activeTab` state), not URL routing. `Layout.tsx` renders the sidebar and conditionally shows menu items based on `user.isSystemAdmin` and `user.isManager`. Tabs: `dashboard`, `nomination`, `give`, `reports`, `profile`, `admin`, `approvals`, `community`.

### Data layer

All Supabase calls go through `services/api.ts` (the `api` object). Components never import `supabase` directly — they call `api.*` methods. `services/supabase.ts` exports the singleton client with an in-memory lock to avoid multi-tab lock contention.

Auth is Google OAuth via Supabase. On login, `api.getCurrentUser()` validates that the session email ends with `@choco.media` and exists in the `profiles` table. Users with `status === 'resigned'` are blocked.

### AI layer

`services/geminiService.ts` calls the Google Gemini API (`@google/genai`) to analyze 360 feedback and produce structured JSON (`AIAnalysis` type): summary, strengths, growth areas, action plan, and "superpowers" (epic English-title achievement badges). The current model is `gemini-3.1-pro-preview`. All prompts and AI output are in Traditional Chinese (繁體中文).

### Key domain types (`types.ts`)

- **`Nomination`** — a feedback round request: one requester, multiple reviewers, one manager approver
- **`FeedbackEntry`** — submitted peer feedback with per-dimension scores and Stop/Start/Continue text
- **`Questionnaire` / `Dimension` / `Question`** — survey structure; active questionnaires are fetched from Supabase
- **`Superpower`** — AI-generated badge with `title` (epic English ALL-CAPS), `category` (`strategic|support|leadership`), `description`
- **`PRPRecord` / `PRPItem`** — Performance Review Process records, imported from structured Markdown documents

### PRP feature

`services/prpImportService.ts` parses Markdown-formatted HR performance review documents and maps them to `PRPRecord` + `PRPItem[]`. Schema is in `migration_prp_schema.sql` (run in Supabase SQL Editor to enable this feature). Admin UI: `components/PRPAdminManager.tsx` and `components/PRPImportModal.tsx`.

### Slack notifications

`services/slackService.ts` sends DMs and channel messages via a Vite dev-server proxy (`/api/slack → https://slack.com/api`). All notifications are intercepted to `DEV_MODE_RECIPIENT` in dev mode.

### Testing strategy

- **E2E (Playwright)**: covers full user flows in `tests/e2e/`. Tests run serially (`workers: 1`, `fullyParallel: false`) because they share a live Supabase database. Auth helpers in `tests/lib/` provide pre-authenticated sessions via stored state files.
- **Unit (Vitest + jsdom)**: covers `services/__tests__/` only. Configured in `vitest.config.ts`. Uses `tests/setup-vitest.ts` for global mocks.
- Coverage is collected via Istanbul instrumentation (Playwright: `monocart-reporter`; Vitest: `@vitest/coverage-v8`).

### Static seed data

`constants.tsx` holds `TEAM_MEMBERS` (the full employee roster) and `INITIAL_QUESTIONNAIRES`. These are used as fallbacks or initial data seeding — the live app reads from Supabase `profiles` and `questionnaires` tables.

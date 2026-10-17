# Nueslify

Your personal AI radio station. An AI host greets you by name, reads you the news that matters
to you, from the outlets you pick, and plays your music in between.

## Features

- **A host who knows you** — friendly, professional or laid-back; English or German; six voices.
- **Your news, from outlets you choose** — 23 German and international outlets (tagesschau, ZDF,
  Deutschlandfunk, SPIEGEL, FAZ, taz, WELT, BBC, Guardian, NYT, …), each labelled with country,
  ownership (e.g. *öffentlich-rechtlich*) and a simple left ↔ right scale from Media Bias/Fact
  Check. Presets for public broadcasters, a balanced spectrum, or international news.
- **Smart news selection** — reports of the same event are grouped across outlets, ranked by
  how widely they're covered, and played once; the host mentions who else reported it. Sections
  and your Bundesland are respected, and outlets take turns.
- **Your music, from wherever you listen** — plug-in music sources: Spotify, Apple Music, TIDAL
  and YouTube Music with your own account, or free music from Audius and Jamendo with no account
  at all. Songs play in each service's own player; pick a source and genres in Settings.
- **Gapless show** — the next block (host + songs + stories) is generated while the current one
  plays; news clips are shared between listeners with identical settings, so most stories are
  instant.
- **Keeps playing while you browse** — the player dock persists across pages; Media Session
  integration for lock screens and headsets; keyboard shortcuts (`Space`, `N`, `R`).
- **History & saved stories** — replay summaries, read transcripts, bookmark stories.
- **Privacy** — read-only music scopes, encrypted OAuth/MusicKit tokens, opt-out of sending
  song titles to the AI, one-click account deletion.
- **Installable PWA**, dark/light/system theme, accessible (axe-checked WCAG 2.1 AA in e2e).

## Stack

| | |
| --- | --- |
| Framework | [TanStack Start](https://tanstack.com/start) (Vite 8, Nitro) with Router, Query, Form, Store and Hotkeys |
| UI | React 19 + React Compiler, [shadcn/ui](https://ui.shadcn.com) on **Base UI** (`base-nova`), Tailwind CSS 4 |
| Auth | [Better Auth](https://better-auth.com) — email/password, plus Spotify, Google and TIDAL (generic OAuth) for music |
| Music | Plugin per provider: Spotify iFrame Embed, MusicKit JS, TIDAL Player SDK, YouTube IFrame API, Audius & Jamendo streams |
| Data | Drizzle ORM on libSQL / [Turso](https://turso.tech) (local SQLite file in dev) |
| AI | [AI SDK](https://ai-sdk.dev) — OpenAI or Google Gemini for scripts, `gpt-4o-mini-tts` / Gemini TTS for voices |
| Audio storage | Local disk (dev) or any S3-compatible bucket (S3, R2, MinIO) |
| Quality | Biome (every rule enabled), strictest TypeScript, Vitest + Testing Library, Playwright + axe |

## Getting started

Requirements: Node ≥ 22.18 (24 recommended) and pnpm (`corepack enable`).

```sh
pnpm install
cp .env.example .env   # everything in it is optional for local development
pnpm db:migrate
pnpm dev               # http://127.0.0.1:3210
```

Without AI keys the app runs in **demo mode**: a deterministic offline host with silent audio,
so the whole flow works with zero setup. Add `OPENAI_API_KEY` and/or
`GOOGLE_GENERATIVE_AI_API_KEY` for real voices.

### Music

Out of the box the show plays free music from **Audius** — no keys, no accounts. To let
listeners use their own services, add the credentials for any of Spotify, YouTube Music
(Google), TIDAL or Apple Music to `.env`; providers without credentials stay hidden.
[docs/music-providers.md](docs/music-providers.md) covers setup, each service's terms, the
services we evaluated and left out (SoundCloud, Amazon Music, Deezer, …), and how to add a new
provider in six steps.

### News

No keys needed: tagesschau's API and the other outlets' RSS feeds are public.
[docs/news-sources.md](docs/news-sources.md) lists every outlet with ownership and ratings,
explains how fetching, clustering and ranking work, and how to add an outlet.

## Scripts

| Command | |
| --- | --- |
| `pnpm dev` | Dev server with HMR and TanStack devtools |
| `pnpm build` / `pnpm start` | Production build / run it (`.output/server/index.mjs`) |
| `pnpm check` | Typecheck, lint and unit tests |
| `pnpm lint` / `pnpm lint:fix` | Biome lint + format check / autofix |
| `pnpm test` / `pnpm test:coverage` | Vitest (server + UI projects) |
| `pnpm test:e2e` | Playwright against a production build with offline fixtures |
| `pnpm db:generate` / `pnpm db:migrate` / `pnpm db:studio` | Drizzle migrations & studio |

## How a show is made

```
listener presses Start
  └─ getNextBlock (server function)
       ├─ ensureFreshNews ── the listener's outlets: tagesschau api2u + RSS, per-feed
       │                     stale-while-revalidate, conditional GET, backoff
       ├─ rankStories ────── one entry per event (clustered across outlets), ranked by
       │                     recency × coverage; events heard in the last 72 h are skipped
       ├─ planBlock ──────── host intro/bridge → N songs → host bridge → M stories
       │                     (N/M from the news↔music balance)
       └─ materialize ────── LLM script → sanitize → TTS → storage   (all segments in parallel)
  └─ PlayerEngine (client)
       ├─ host & news clips → one <audio> element (keeps the autoplay unlock)
       ├─ open-catalogue songs → same <audio> element (Audius, Jamendo)
       ├─ account songs    → the provider's own player (Spotify embed, MusicKit, TIDAL SDK, YouTube)
       └─ prefetches the next block when ≤ 2 segments remain
```

## Project structure

```
src/
  routes/            file-based routes (pages + /api server routes)
  features/          player engine, playback backends per provider, auth forms, preferences
  components/        app chrome, brand, shadcn/ui (Base UI) components
  lib/               shared, isomorphic code (domain model, news outlet catalogue, queries)
  server/
    functions/       TanStack Start server functions (+ auth middleware)
    ai/              prompts, sanitising, LLM + TTS (with offline mock)
    news/            feeds (tagesschau JSON, RSS/Atom), ingestion, clustering, offline fixtures
    show/            planner (pure) and builder
    music/           music source plugins (Spotify, Apple Music, TIDAL, YouTube, Audius, Jamendo)
    db/              Drizzle schema and client
    storage/         local / S3 audio storage
drizzle/             SQL migrations
e2e/                 Playwright specs
test/                test setup, fixtures and helpers
```

## Deployment (Vercel)

1. Create a Turso database. Required variables: `DATABASE_URL` + `DATABASE_AUTH_TOKEN`
   (or the older `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`) and `BETTER_AUTH_SECRET` (≥ 32
   chars; `NEXTAUTH_SECRET` is accepted too).
2. Optional: `CRON_SECRET` (≥ 16 chars) for the daily news refresh, AI keys, music provider
   credentials. `BETTER_AUTH_URL` defaults to the deployment's Vercel URL; set it when you use a
   custom domain.
3. Audio is stored in the database by default on Vercel (`STORAGE_DRIVER=database`), which is
   fine for a handful of listeners. For more, add an S3-compatible bucket (`S3_BUCKET`,
   `S3_PUBLIC_URL`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, optionally `S3_ENDPOINT`; the
   `AWS_*` names work too) and storage switches to S3.
4. Deploy. `vercel.json` runs migrations before the build and schedules `/api/cron/news`
   daily (on Pro you can make it every 30 minutes); news is also refreshed on demand.
   `GET /api/health` shows which database, storage and AI mode the deployment uses.

Any other Node host works too: `pnpm build && pnpm start`.

## License

[GPL-3.0](LICENSE)

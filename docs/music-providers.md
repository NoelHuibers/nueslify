# Music providers

Nueslify plays music from whichever service a listener uses. Every service is a small
**plugin** with two halves:

| Half | Where | Job |
| --- | --- | --- |
| Source adapter | `src/server/music/<provider>.ts` | Which songs? Reads the listener's favourites (or a free catalogue) and returns `TrackRef`s. |
| Playback backend | `src/features/player/backends/<provider>.ts` | How do they play? Drives the provider's own player/SDK and reports `playing` / `ended` / errors. |

Openly licensed catalogues return a `streamUrl` and need no backend: they play through the
show's own `<audio>` element. A listener's choice ("Automatic", a specific service, or "No
music") is resolved by `chooseSource` in `src/lib/music.ts`: explicit choice if usable →
first connected account → first free catalogue.

## Supported services (researched October 2026)

| Service | Account | Plays in | Favourites from | Status |
| --- | --- | --- | --- | --- |
| **Spotify** | Spotify (Premium for full tracks) | Spotify iFrame Embed (visible) | Top tracks | Stable — see the Spotify section below |
| **Apple Music** | Apple Music subscription | MusicKit on the Web | Recently played + library | Beta — not yet verified with a live subscription |
| **TIDAL** | TIDAL subscription | `@tidal-music/player` (official SDK) | Collection tracks | Beta — not yet verified with a live account |
| **YouTube Music** | Google account | YouTube IFrame player (visible, ≥ 200×200) | Liked music videos | Beta — not yet verified with a live account |
| **Audius** | none | Our `<audio>` (stream URL) | Trending, by genre | Stable — verified live |
| **Jamendo** | none | Our `<audio>` (stream URL) | Popular, by genre | Needs a free client id; parser built from the API docs, not yet verified live |

### Evaluated and left out

- **SoundCloud** — API terms (30 Mar 2024) prohibit "webcasting radio app[s]", playback that
  "aggregates and streams User Content with content from other services", and using content
  "as input to any artificial intelligence technology". Registering apps also needs Artist Pro.
- **Amazon Music** — Web API is a closed beta, and playback is limited to certified devices
  (Widevine), not browsers.
- **Deezer** — the public API only exposes 30-second extracts; full tracks need its widget for
  Premium users, use must be non-commercial, and we could not verify that new app
  registration is open. Easy to add later as a plugin if that changes.
- **Last.fm / ListenBrainz** — great taste data, but no playback. They could become "taste
  sources" combined with a catalogue that has search.
- **Bandcamp, Mixcloud, Free Music Archive** — no usable track-level playback API.

## Adding a provider

1. Add an entry to `MUSIC_PROVIDERS` in `src/lib/music.ts` (`kind`: `account` or `catalog`).
2. Write a `MusicSourceAdapter` in `src/server/music/` and register it in `registry.ts`.
   Use `errorFromResponse` so quota/rate-limit/expired-token errors become friendly notices.
3. If the service has OAuth, configure it in `src/server/auth.ts` (built-in social provider
   or Better Auth's generic OAuth plugin, like TIDAL) and map it in `AUTH_PROVIDER`
   (`src/server/music/accounts.ts`). Tokens are stored encrypted and refreshed automatically.
4. If it can't stream into a plain `<audio>` element, write a `PlaybackBackend` and return it
   from `createBackend` in `src/features/player/backends/index.ts`. Set `visible: true` if the
   provider's terms require its player on screen — it then gets a slot in the dock.
5. Add a connect action in `src/features/preferences/music-sources.tsx`.
6. Add parser tests with a recorded or documented response, like the existing ones.

## Setup

All credentials go into `.env` (see `.env.example`). Providers without credentials are simply
hidden from listeners.

- **Spotify** — [developer dashboard](https://developer.spotify.com/dashboard), redirect
  `…/api/auth/callback/spotify`. Development Mode: owner needs Premium, max. 5 allow-listed
  users.
- **YouTube Music** — Google Cloud project, enable *YouTube Data API v3*, OAuth client with
  redirect `…/api/auth/callback/google`. `youtube.readonly` is a sensitive scope: Google's app
  verification is required before going beyond test users. Listing liked videos costs 1 quota
  unit per request.
- **TIDAL** — [developer portal](https://developer.tidal.com), redirect
  `…/api/auth/callback/tidal`. Scopes: `user.read collection.read playback`.
- **Apple Music** — paid Apple Developer Program membership; create a MusicKit key and set
  `APPLE_MUSIC_TEAM_ID`, `APPLE_MUSIC_KEY_ID`, `APPLE_MUSIC_PRIVATE_KEY`. Developer tokens are
  signed server-side (ES256, 12 h, bound to our origin). Listeners authorise in a MusicKit
  popup; their Music User Token is stored encrypted.
- **Audius** — nothing to configure (`AUDIUS_APP_NAME` identifies the app).
- **Jamendo** — free `client_id` from the [developer portal](https://devportal.jamendo.com).

## Terms worth knowing

None of the services' terms is legal advice-proof for an "AI host between songs" product; read
them before a public launch. Highlights from our research:

- **Spotify** — see below (segue/mixing, AI ingestion and "news media" clauses).
- **YouTube** — the player must stay visible (≥ 200×200 px), nothing may overlay it, no
  audio-only/background playback, no caching. Nueslify keeps the player on the dock's stage
  while YouTube songs play and never draws over it.
- **Apple Music / TIDAL** — their developer terms could not be read programmatically during
  research; review them (and Apple's "Listen on Apple Music" badge guidelines) before launch.
  Until official badges are added, these providers are credited by name.
- **Jamendo** — free for non-commercial use; credit the artist and Jamendo and link back to
  each track (done via the `credit` field). Commercial use requires a licence.
- **Audius** — the API terms page is JavaScript-only and could not be reviewed; tracks are
  credited and linked back to Audius.

---

# Spotify integration & compliance

## What changed compared to v1

v1 played music through the **Web Playback SDK** and drew its **own player UI** (album art,
track title, custom controls, a Spotify icon on a coloured button). That is what failed review:
the design guidelines require the full Spotify logo, unaltered artwork with fixed corner radii,
metadata that links back to Spotify, and recommend no controls beyond play/pause.

v2 never renders Spotify content itself:

| Concern | v1 | v2 |
| --- | --- | --- |
| Playback | Web Playback SDK (Premium only, `streaming` scope) | **Spotify iFrame Embed API** — Spotify's own player |
| Artwork & metadata | Custom card with album art | Drawn by Spotify inside the embed |
| Attribution | Icon on an indigo button | Official logo files (`public/brand/spotify`), full logo ≥ 70 px, icon ≥ 21 px, monochrome on non-black/white backgrounds |
| Link-back | "Open on Spotify" to spotify.com | Every track name links to its `open.spotify.com/track/…` page; "Listen on Spotify" button |
| OAuth scopes | `user-read-email user-top-read streaming user-read-private user-modify-playback-state` | `user-read-email user-top-read` only |
| Tokens | Plain text in DB, manual refresh | Encrypted at rest (`encryptOAuthTokens`), refreshed by Better Auth |

The embed is sequenced with the iFrame API (`loadEntity` / `play` and the `playback_update`
event) — see `src/features/player/embed-session.ts` and `src/features/player/state.ts`
(`detectTrackEnd`). Nothing is drawn on top of the embed.

Listeners without Premium (or not logged in to Spotify in the browser) hear 30-second
previews; the show handles that automatically.

## Platform constraints (2025–2026)

- **Extended quota** is only granted to organisations with a launched service and
  ≥ 250k MAU (since 15 May 2025). Individuals cannot apply.
- **Development Mode** (since Feb/Mar 2026): app owner needs Premium; at most **5**
  allow-listed users; quota counted per developer account (July 2026); several endpoints and
  fields were removed — `GET /me` no longer returns `email`. Nueslify only uses
  `GET /me/top/tracks`, which remains available.
- Refresh tokens expire six months after authorisation; Nueslify shows a "reconnect Spotify"
  notice when that happens.

Because of the 5-user limit, Spotify is **optional**: accounts are email/password first and
Spotify is linked in Settings. Without it the app is a news show.

## Open policy questions — read before launching publicly

The design problems are fixed. However, the **Spotify Developer Policy** (effective
15 May 2025) contains clauses that touch the product concept itself:

- **III.7** — "Do not permit any device or system to segue, mix, re-mix, or overlap any
  Spotify Content with any other audio content". Nueslify never *overlaps* audio (host clips
  and songs play strictly one after another, in separate players), but placing AI voice
  segments between songs could be read as a "segue".
- **III.12** — "Do not generate news media". Nueslify summarises third-party news with AI.
- **III.14** — no "ingesting Spotify Content into a machine learning or AI model". When the
  host mentions songs, their titles and artists go into the prompt. The **"Host mentions
  songs by name"** setting turns this off completely (enforced server-side, see
  `src/server/show/builder.ts`).

Mitigations built in: music only in Spotify's own player, no overlap, opt-out of sending
track metadata to AI, minimal scopes, no caching of Spotify content beyond 15 minutes in
memory, account & data deletion in Settings.

**Recommendation:** run Nueslify in Development Mode for personal use, and ask Spotify
(developer support / community forum) for written confirmation before any public launch.

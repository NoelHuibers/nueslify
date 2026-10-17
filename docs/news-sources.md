# News sources

Listeners pick the outlets their show draws from (Settings → Your news). Every outlet is shown
with its country, language, ownership and a simple left ↔ right scale, so it's easy to build a
mix you trust, or a deliberately balanced one.

## The outlets

| Outlet | Country | Ownership | Leaning | Factual | Feed |
| --- | --- | --- | --- | --- | --- |
| tagesschau | DE | Öffentlich-rechtlich (ARD) | Centre | High | JSON API (`api2u`), per section and Bundesland, full articles |
| ZDFheute | DE | Öffentlich-rechtlich (ZDF) | Centre | High | RSS |
| Deutschlandfunk | DE | Öffentlich-rechtlich (Deutschlandradio) | Centre | High | RSS |
| Deutsche Welle | DE | Öffentlich-rechtlich, federally funded | Centre-left | High | RSS |
| DER SPIEGEL | DE | Private (staff KG, Bertelsmann, Augstein family) | Centre-left | High | RSS |
| ZEIT ONLINE | DE | Private (Holtzbrinck) | Centre-left | High | RSS |
| Süddeutsche Zeitung | DE | Private (SWMH) | Centre-left | High | RSS |
| taz | DE | Cooperative (readers and staff) | Left | Mostly factual | RSS |
| FAZ | DE | Trust-owned (FAZIT-Stiftung) | Centre-right | High | RSS |
| WELT | DE | Private (Axel Springer) | Centre-right | High | RSS |
| Handelsblatt | DE | Private (DvH Medien) | Centre-right | High | RSS |
| n-tv | DE | Private (RTL Deutschland / Bertelsmann) | Centre-right | Mostly factual | RSS |
| FOCUS online | DE | Private (Hubert Burda Media) | Centre-right | High | RSS |
| BBC News | GB | Public service (licence fee) | Centre | Mostly factual | RSS |
| The Guardian | GB | Trust-owned (Scott Trust) | Centre-left | High | RSS |
| The Telegraph | GB | Private (Telegraph Media Group) | Right | Mixed | RSS |
| The New York Times | US | Private (listed, Ochs-Sulzberger family) | Centre-left | High | RSS |
| NPR | US | Non-profit | Centre-left | High | RSS |
| France 24 | FR | State-owned (France Médias Monde) | Centre | High | RSS |
| Euronews | FR | Private (Alpac Capital) | Centre-left | Mostly factual | RSS |
| POLITICO Europe | BE | Private (Axel Springer) | Centre-left | High | RSS |
| NZZ | CH | Private (NZZ Mediengruppe) | Centre-right | Mostly factual | RSS |
| Al Jazeera | QA | State-owned (State of Qatar) | Centre-left | Mixed | RSS |

The catalogue lives in [`src/lib/news/`](../src/lib/news) and the feed URLs in
[`src/server/news/feeds.ts`](../src/server/news/feeds.ts). All feeds were checked in October 2026.

### Where the ratings come from

Leaning and factual reporting are taken from
[Media Bias/Fact Check](https://mediabiasfactcheck.com/methodology/) (MBFC), the one independent
rater that covers German *and* international outlets with a published methodology. Each outlet
links to its MBFC page. Their scale maps to ours like this: *Left* → Left, *Left-Center* →
Centre-left, *Least Biased* → Centre, *Right-Center* → Centre-right, *Right* → Right.

AllSides and Ad Fontes Media were considered; they rate few German outlets. Ratings are one
outside opinion and the UI says so. When an outlet's rating changes, update `leaning` /
`factual` in the catalogue.

### Considered and left out

| | Why |
| --- | --- |
| Reuters, AP | No public RSS feeds any more (Reuters returns 404; AP has none). |
| Wall Street Journal | Public feed hasn't been updated since January 2025. |
| BILD | Tabloid; MBFC rates its factual reporting "Mixed". |
| Paid news APIs (NewsAPI, GNews, Mediastack, …) | Teasers only, licensing limits on free tiers, and no better than the outlets' own feeds. |

## How fetching works

```
cron (daily) / a listener's next block
  └─ ensureFreshNews ── per feed: fresh (< 20 min) → nothing
  │                      stale → refresh in the background, serve what we have
  │                      never fetched → fetch now (a newly picked outlet plays right away)
  │                      failing → exponential backoff (5 min … 6 h), never blocks a show
  └─ ingestNews
       ├─ conditional GET (ETag / Last-Modified) → 304s cost nothing
       ├─ parse RSS 2.0 / RDF / Atom or tagesschau JSON, newest 25 per feed, ≤ 14 days old
       ├─ drop videos, live blogs, tickers, opinion, satire, podcasts
       ├─ canonical URLs (no tracking parameters) → stable story ids, no duplicates
       ├─ section from URL path → feed categories → feed default (international → World)
       └─ cluster: same event across outlets → one cluster, section shared within it
```

**Clustering.** Headlines and teasers are reduced to stemmed keywords (names, places, topics;
stopwords dropped) and compared with cosine similarity: at least three shared keywords and a
score ≥ 0.28 put two reports in the same cluster. New reports are compared with each cluster's
*first* report only, so clusters don't drift through chains of loosely related stories. This
works across outlets in one language and, for names and places, across German and English.

**Ranking.** Each event gets `recency × (1 + log₂ outlets) + breaking`, where recency halves
every six hours and *outlets* counts every ingested outlet that covered it, not only the
listener's. So "everyone is reporting this" beats "someone published this a minute ago". The
planner then round-robins the listener's region and sections, and prefers an outlet that hasn't
had a turn in the current block.

**One event, one segment.** The best report of an event (the fullest text, then the newest) is
read out; up to three other selected outlets' teasers go into the prompt so the host can confirm
facts, note disagreements and say who else reported it. Hearing an event from one outlet marks
the whole cluster as heard for 72 hours.

## Adding an outlet

1. Find a public RSS/Atom feed and check it returns recent entries with links, dates and
   teasers.
2. Add the outlet to `src/lib/news/germany.ts` or `international.ts` (ownership from its
   imprint, leaning and factual rating from its MBFC page).
3. Add its feed URL(s) to `RSS_FEEDS` in `src/server/news/feeds.ts`; section feeds can carry a
   category.
4. Run `pnpm test`: the catalogue tests check ids, links and that every outlet has a feed.

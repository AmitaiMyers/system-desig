# Scale or Fail

A phone-first PWA game for learning senior-level system design. You build an architecture,
run a simulated day of traffic through it, and watch what breaks.

- **Campaign (9 levels):** grow one product from a single server to three regions —
  vertical scaling, splitting the database, load balancing, caching, replicas and failover,
  CDN and object storage, sharding, message queues, multi-region.
- **Interview case studies (3):** URL shortener, YouTube, Netflix. Each one is played as
  clarify requirements → estimate → design → survive the incidents → real-world debrief.
- **Learning loop:** post-mortem after every failed run, a quiz after every win, and a
  Codex of 35 concept cards with a "senior insight" each.
- **Learn tab:** 8 subjects covering all the material, built around 24 diagrams — 16 of them
  interactive (change a value, see the effect). Every Codex card links to its full explanation,
  and every level brief opens with its concept diagram.

## Run it

```bash
npm install
npm run dev        # development server (reachable from your phone on the same Wi-Fi)
npm test           # engine unit tests + level balance tests
npm run build      # type-check and build the PWA into dist/
npm run preview    # serve the production build
```

To install it on a phone, host `dist/` over HTTPS and use "Add to Home Screen".
`.github/workflows/deploy.yml` publishes to GitHub Pages on every push to the default branch
(Settings → Pages → Source must be "GitHub Actions").

## How it is built

```
src/engine/    Pure TypeScript simulation — no React. catalog.ts holds every tunable number.
src/content/   Levels, case studies, quizzes and concept cards as typed data.
src/state/     Progress in localStorage.
src/ui/        React UI: design tokens, primitives, the architecture diagram, learning
               figures, run playback, level flow and screens (see docs/DESIGN_SYSTEM.md).
tests/         Engine unit tests and balance tests (every level must fail as given,
               be winnable with 3 stars, and reject the shortcut it teaches against).
```

Adding a level is a content change: add an entry in `src/content/campaign.ts` (or
`cases.ts`) and a reference solution in `tests/levels.test.ts`.

The simulation model is described in `docs/GAME_DESIGN.md`.

## Sources

- Frank Kane, *Mastering the System Design Interview* (Sundog Education) — concept order,
  definitions and the mock-interview flow. Cards cite slide numbers. The slides themselves
  are not part of this repository.
- Public write-ups on Netflix and YouTube architecture, linked from each case study's debrief.

The numbers (requests per second per server, prices, latencies) are rounded, plausible
figures chosen for play. They are not benchmarks.

# Scale or Fail — Game Design Document (v1.0, as built)

An interactive, phone-first PWA for learning senior-level system design by
building architectures and watching them survive (or not) real traffic.

## 1. Decisions

| Topic | Decision |
|---|---|
| Core loop | Builder + traffic simulation |
| Builder UI | Lane/tier-based (tap a component to add/scale/configure) |
| Device | Phone first (touch), responsive up to desktop |
| Realism | Real-world-style numbers (throughput, latency, $ cost) |
| Win condition | Meet SLOs (p99 latency, success rate, data loss, job delay) **within a monthly budget** |
| Incidents | Scripted per level, each one tests the level's concept |
| Feedback | Post-mortem on failure, concept cards, post-level quiz, 1–3 star rating |
| Content | 9-level growth campaign + 7 interview case studies |
| AI interviewer | Not built — a later phase (Claude API grades free-form answers) |
| Language | English |
| Stack | React + TypeScript + Vite + vite-plugin-pwa, Vitest |

## 2. Core loop

```
Brief ──► Build ──► Run a day ──► Incident(s) ──► Result
  ▲                                                 │
  └──── Post-mortem + hint ◄── fail ────────────────┤
                                                    ▼ pass
                                      Stars ─► Quiz ─► Concept cards ─► (case: real-world debrief)
```

Case studies add two steps in front: **Clarify** (pick the good questions, avoid the traps)
and **Estimate** (back-of-the-envelope multiple choice with worked answers).

## 3. Builder (lane layout)

```
 [Regions ×N]
 Users ─► CDN ─► Load balancer ─► App servers ─► Cache ─► Database (primary, replicas, shards, standby)
                                      └─► Queue + workers        └─ Object storage
```

- Each level unlocks a set of controls (`Feature`s); everything else is hidden.
- Tapping a component opens a bottom sheet with its settings and its capacity/price numbers.
- All counts are per region.

## 4. Simulation model (`src/engine`, pure TypeScript, deterministic)

One simulated day = 288 ticks of 5 minutes. Traffic follows a daily shape (quiet night,
lunch bump, evening peak). For each tick:

1. **Load**: requests split into static files, reads and writes; incidents multiply parts of it.
2. **CDN** answers 95% of static requests at the edge. The rest goes to object storage if
   enabled, otherwise to the app servers.
3. **App tier**: capacity = healthy servers × size. Without a load balancer only one server
   receives traffic. Background jobs run inside the request unless a queue is enabled.
4. **Cache** answers the cacheable share of reads, scaled by how *warm* it is. A node restart
   loses 1/N of the cache; it re-warms only as fast as the database can serve the misses.
5. **Database**: writes go to the primary of the right shard; reads go to replicas when they
   exist. The shard key decides hot-shard skew and scatter-gather reads. Primary failure is
   handled by the best available failover (hot standby → replica promotion → cold backup → nothing).
6. **Per component**: utilization ρ = load / capacity. Latency ≈ base / (1 − ρ), capped at 20×.
   Load above capacity is dropped.
7. **Regions**: users without a nearby healthy region pay +100 ms. A region outage removes
   that region's capacity.
8. **Queue**: jobs accumulate as backlog; workers drain it; the delay is tracked.
9. **Cost**: servers and services per month, plus bandwidth per GB (origin $0.09, commercial
   CDN $0.03, own CDN $0.004 + fixed cost).

p99 is the weighted 99th percentile over every successful request of the day.
All tunable numbers live in `src/engine/catalog.ts`.

**Stars**: 1 = all targets met, 2 = cost ≤ 85% of budget, 3 = cost ≤ 70% of budget.

## 5. Growth campaign

| # | Level | Peak req/s | New concept | Scripted incident |
|---|---|---|---|---|
| 1 | Hello, World | 150 | Single server, vertical scaling | 2.5× traffic spike |
| 2 | Split the Box | 2,500 | Separate app and DB tiers, stateless | — |
| 3 | Many Small Boxes | 6,000 | Load balancer, horizontal scaling, N+1 | App server dies at peak |
| 4 | Cache Me If You Can | 20,000 | Caching, cold start / thundering herd | Cache node restarts empty |
| 5 | The Primary Will Die | 30,000 | Read replicas, cold/warm/hot failover | DB primary fails |
| 6 | Bytes Are Expensive | 60,000 | CDN, object storage, bandwidth cost | 6× image traffic |
| 7 | Shard It | 120,000 | Sharding, shard keys, hot shards, CAP | Celebrity hot key |
| 8 | Do It Later | 150,000 | Message queues, backlog, worker sizing | 6× job fan-out |
| 9 | Boss: Region Down | 200,000 | Multi-region, geo-routing | Region outage + primary failure |

## 6. Case studies

| Case | Scale | What it tests |
|---|---|---|
| URL shortener | 40k req/s, 99% reads | Cache + stateless fleet + replicated store; viral link, cache restart, primary failure |
| YouTube | 300k req/s, 70% video | CDN + object storage for playback; queue + transcoding fleet for uploads |
| Netflix | 400k req/s, 80% video, 3 continents | Own CDN economics, multi-region control plane, chaos drill, release spike |
| Restaurant reservations | 3k req/s, bookings must never be lost | Hot standby for zero data loss, SMS through a queue, Valentine's Day spike |
| Web crawler | 20k URL operations/s, every write a job | Sharded URL store (domain vs URL key), worker sizing, cold backup is enough |
| Top-sellers | 50k req/s, 98% cacheable | Precompute + cache, cold cache during Black Friday |
| Search engine | 60k req/s, queries fan out | Index partitioned by document vs keyword, replicas per shard, indexing queue |

## 7. Learning content

- **Concept card**: title, a few facts, a "senior insight" (a trade-off), source citation.
- **Post-mortem**: generated from the simulation data (which component dropped requests or
  ran hot, when, during which incident, and why), plus one authored hint. Never the full solution.
- **Quiz**: 2–4 multiple-choice questions per level, each with an explanation.
- **Codex**: all unlocked cards, for review.

## 7b. Learn subjects

Nine subjects: System design (9 multi-section topics plus 5 distributed-systems lessons) and
eight lesson-based subjects — AWS, Microservices, Kubernetes, PostgreSQL, Redis, Kafka,
PyTorch, Monitoring — with 5 lessons each. A lesson = text, a diagram with switchable
scenarios, a concept card, and a two-question quiz worth up to 3 stars.

## 8. Tests

`tests/levels.test.ts` keeps the game balanced: every level must fail with its starting
build, be winnable with 3 stars by a reference solution, and reject the tempting shortcut
it was designed to teach against. `tests/engine.test.ts` covers the engine rules.

## 9. Possible next steps

- AI interviewer mode for free-form answers.
- Cache TTL / staleness, rate limiting, consistent hashing as their own mechanics.

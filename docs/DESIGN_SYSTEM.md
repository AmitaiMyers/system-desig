# Scale or Fail — Design System

This defines the look, the interaction rules and the user journey for the front end.
It was written as Phase 1 and has since been implemented (see section 6 for what was
built and what was left out). The **(exists)** markers and the "Today" column in 3.3
describe the app *before* that implementation.

## 1. Design language: "Night Shift"

The player is the engineer on call. The app should feel like a calm, well-made operations
console that gets loud only when something is actually wrong.

Three rules follow from that:

1. **Quiet by default.** Dark, low-saturation surfaces. No decoration, gradients or shadows
   competing with the diagram.
2. **Colour means status.** Mint, amber, orange and red are reserved for system health and
   results. They never appear as decoration, so a red node always means "failing".
3. **The diagram is the hero.** Every screen in a level is built around the architecture
   diagram; text supports it.

### 1.1 Colour

Contrast ratios are measured against the three surfaces (base / surface / raised).
WCAG AA needs 4.5:1 for text and 3:1 for UI boundaries.

| Token | Hex | Use | Contrast (base / surface / raised) |
|---|---|---|---|
| `bg-base` | `#0B1020` | App background | — |
| `bg-surface` | `#141B2E` | Cards, nodes, sheets | — |
| `bg-raised` | `#1C2540` | Controls inside a surface | — |
| `border-subtle` | `#2A3556` | Dividers, resting card outline (decorative only) | 1.6 / 1.4 / 1.3 |
| `border-strong` | `#5B6A94` | Outline of anything tappable | 3.6 / 3.2 / 2.8 |
| `text` | `#E9EDF7` | Body and headings | 16.2 / 14.6 / 12.9 |
| `text-muted` | `#9BA7C4` | Secondary text, captions | 7.9 / 7.1 / 6.3 |
| **Primary** `mint` | `#3DDC97` | Primary action, healthy, success | 10.7 / 9.7 / 8.6 |
| `mint-ink` | `#062416` | Text on mint | 9.3 on mint |
| **Secondary** `blue` | `#7AA8FF` | Selection, focus ring, links, hints, learning | 8.0 / 7.2 / 6.4 |
| Accent `amber` | `#FFCB5C` | Incident active, 70–90% load, stars | 12.6 / 11.4 / 10.1 |
| Accent `orange` | `#FF9A4A` | 90–100% load | 9.0 / 8.1 / 7.2 |
| Accent `red` | `#FF6B6B` | Over capacity, failed target, error | 6.8 / 6.2 / 5.5 |

Tinted panels for callouts (body text on each is ≥ 12:1):
success `#12301F`, error `#2C1820`, warning `#332A12`, info `#16243F`.

Two consequences of the numbers above:

- `border-subtle` fails 3:1, so it may only separate things. Anything the player can tap
  uses `border-strong` (which fails 3:1 only on `bg-raised`, so tappable controls on raised
  surfaces get a filled background instead of an outline).
- Red is the weakest status colour on raised surfaces (5.5:1). It still passes for text,
  but red text is always bold and never smaller than 14 px.

### 1.2 Typography

One family: the system UI stack (`system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`).
It costs nothing to load, which matters for an offline PWA, and matches the phone.
All numbers use `font-variant-numeric: tabular-nums` so live values do not jitter.

| Token | Size / line height | Weight | Use |
|---|---|---|---|
| `display` | 28 / 34 | 700 | Result headline, star screen |
| `title` | 20 / 26 | 700 | Screen title, sheet title, quiz question |
| `heading` | 17 / 24 | 700 | Card title, node name |
| `body` | 16 / 24 | 400 | Story, explanations |
| `label` | 14 / 20 | 600 | Control labels, buttons |
| `caption` | 13 / 18 | 400 | Notes, node summaries |
| `overline` | 12 / 16 | 600, +6% tracking, uppercase | Section headers, HUD labels |
| `metric` | 20 / 24 | 700, tabular | HUD values, cost meter |

Nothing readable goes below 12 px. Body text is never below 16 px on a phone.

### 1.3 Spacing, shape, layout

- **Grid:** 4 px base. Allowed steps: 4, 8, 12, 16, 24, 32, 48.
- **Rhythm:** 16 px screen gutter; 12 px between sibling cards; 24 px between sections;
  12–16 px padding inside a card.
- **Radius:** 10 px controls, 14 px cards and nodes, 20 px sheets, full for pills.
- **Touch targets:** 48 × 48 px minimum, 8 px minimum gap between targets.
- **Elevation:** expressed by surface colour (base → surface → raised), not shadows.
  The only shadow is the scrim under a sheet.
- **Layout:** one column, max 540 px, up to 899 px wide. From 900 px: two panes —
  diagram on the left, and the component inspector (the phone's bottom sheet) docked on
  the right, so nothing covers the diagram on desktop.
- **Icons:** one outlined SVG set (24 px, 1.5 px stroke) replaces the current emoji, which
  render differently on every platform and cannot take status colours.

## 2. Interactivity and feedback

### 2.1 Motion tokens

| Token | Duration | Easing | Use |
|---|---|---|---|
| `press` | 100 ms | ease-out | Button and node press |
| `state` | 180 ms | ease-out | Colour, toggle, selection changes |
| `enter` | 280 ms | cubic-bezier(.2, .8, .2, 1) | Sheets, screens, banners arriving |
| `exit` | 180 ms | ease-in | Things leaving |
| `emphasis` | 400 ms | spring-like overshoot | Stars, a newly unlocked card |

Only `transform` and `opacity` animate (no layout thrash on low-end phones).
With `prefers-reduced-motion`, movement is replaced by a plain cross-fade and the request
particles (2.3) are replaced by the static load bars.

### 2.2 Component states

| State | Treatment |
|---|---|
| Rest | `bg-surface` or `bg-raised`, `border-strong` if tappable |
| Hover (pointer only) | Surface lightens one step |
| Pressed | Scale 0.98 and one step darker, `press` timing |
| Focus (keyboard) | 2 px `blue` ring, 2 px offset — never removed |
| Selected | `blue` border + info tint (choices), mint fill (segmented value) |
| Disabled | 45% opacity **and** a reason in text next to it (e.g. "Add a load balancer first") |
| Loading | Not needed for simulation (it computes in milliseconds). First launch shows the app shell immediately; nothing blocks on the network |
| Success | Mint check icon + success tint + text |
| Error / failure | Red cross icon + error tint + text that says what and why |

Status is never carried by colour alone: every status has an icon and a word or number.

### 2.3 Micro-interactions by moment

**Building**
- Changing a value in a sheet updates the diagram behind it at once; the changed node
  pulses once (`state`) so the eye finds it.
- The cost meter counts to its new value (`state`). When it crosses the budget it turns
  red and gives one short shake; it does not keep animating.
- Each node shows a thin **headroom bar**: capacity against the normal daily peak, before
  any incident. This turns sizing from guesswork into estimation. It deliberately ignores
  incidents, so the run still has something to teach.
- A "changed since last run" chip row (e.g. `+2 servers`, `cache on`) links cause to effect
  on the next result.

**Running**
- Requests are dots flowing down the lanes; density follows traffic. Dropped requests
  turn red and fall away at the component that dropped them. This is the core visual:
  the player sees *where* load is lost, not just that it is.
- A node's border and load bar move green → amber → orange → red with load **(exists)**.
  The current continuous shake is replaced by a single shake when a node first goes red.
- An incident slides a banner in from the top, the affected node gets a labelled badge
  ("server down", "cache empty"), and Android devices give one short vibration.
- Playback slows automatically during trouble **(exists)**. Add pause, 1× / 2× speed, and
  dragging the chart to scrub to any moment.

**Result**
- Targets reveal one at a time (120 ms apart), each resolving to a check or a cross.
- On a pass, stars pop in sequence (`emphasis`). On a fail there is no punishing animation:
  the screen goes straight to the post-mortem.
- Each post-mortem finding has a "Show me" action that reopens the timeline at that moment.

**Quiz**
- Correct: the option fills with the success tint and a check. Wrong: one short horizontal
  shake, the right answer is highlighted, and the explanation appears either way **(exists, minus the shake)**.

## 3. Usability

### 3.1 The journey

```
First launch ──► Level 1 brief (no menu, no sign-up)
                    │  three coach marks: tap the server → change its size → run
                    ▼
Brief ─► Build ─► Run ─► Review ─► Quiz ─► Debrief ─► next level
            ▲               │
            └── fail: post-mortem + hint, design is kept ──┘
```

- **Zero setup.** First launch opens Level 1 directly. The map appears after the first win.
- **One primary action per screen**, always in the same place: a full-width mint button
  docked at the bottom, inside thumb reach.
- **A step indicator** (Brief · Build · Run · Review) under the title shows where the
  player is in a level and lets them step back.
- **Failure costs nothing.** The design is kept after a failed run; the post-mortem and the
  build are one tap apart.
- **Two top-level places only:** Map and Codex, as a bottom tab bar on the map screen.
  Inside a level the tab bar is replaced by the level's own action bar.

### 3.2 Keeping cognitive load low

- **Progressive disclosure:** a level shows only the controls it has unlocked **(exists)**,
  and introduces one new concept.
- **Terms explain themselves:** words such as *p99*, *replica* or *shard key* get a dotted
  underline; tapping one opens its concept card in place, without leaving the level.
- **Consistent numbers:** one formatter for money, one for rates, one for percentages;
  the same unit always appears in the same form.
- **Targets stay visible:** a compact target strip sits above the diagram while building,
  instead of being folded away as it is today.
- **Plain cause-and-effect language** in post-mortems: what happened, when, during which
  incident, and why **(exists)**.

### 3.3 Accessibility

| Area | Requirement | Today |
|---|---|---|
| Contrast | All text ≥ 4.5:1, tappable boundaries ≥ 3:1 (table in 1.1) | Text passes; card outlines use the low-contrast border |
| Colour independence | Status always has an icon and text | Load has a percentage; results have ✓/✗ |
| Bottom sheet | `role="dialog"`, `aria-modal`, labelled by its title, focus moves in and is trapped, Esc and swipe-down close it, focus returns to the node | None of this yet |
| Segmented control | `role="radiogroup"` with `role="radio"` and arrow-key movement | Plain buttons |
| Toggle | `role="switch"` with `aria-checked` | Plain button with ON/OFF text |
| Stepper | Buttons labelled in full ("Decrease servers by 10"); value announced on change | Labels are "−10", "+10" |
| Diagram | A list in reading order; each node's accessible name includes its settings and, during a run, its load | Buttons, disabled during a run |
| Live run | Incidents and final result announced through one polite `aria-live` region; per-tick values are not announced | Not announced |
| Chart | Text summary ("failed requests between 12:00 and 13:00") | `aria-label` only |
| Keyboard | Everything reachable; visible focus ring; logical order | Reachable, but no focus style defined |
| Motion | `prefers-reduced-motion` respected everywhere | Only on the node shake |
| Text size | Layout holds at 200% text scaling; no fixed heights on text containers | Untested |

## 4. Front-end architecture

The simulation engine gained only small additions (per-tick "served by" counts, incident
flags, and a moment for each post-mortem finding); the rest is the UI layer.

```
src/ui/
  tokens.css          All colour, type, spacing, radius and motion tokens as CSS variables
  styles.css          Component styles; references tokens only
  primitives/         Icon, controls (Stepper, Segmented, Switch, Slider, Stars), Sheet,
                      Screen (frame, StepIndicator, TabBar, Callout), Rich (glossary + CardView)
  diagram/            Diagram, nodes (model, headroom, trouble labels), RequestFlow (canvas)
  figures/            Learning diagrams: drawing kit, static figures, interactive labs, registry
  run/                RunScreen, Timeline (chart + scrubbing)
  level/              LevelScreen, Build, Inspector, Review, Targets, buildDiff
  screens/            Map + Codex, Learn + Topic, CaseIntro, Quiz
```

- **Tokens first:** components reference tokens only. Changing the palette is a one-file change.
- **Primitives own accessibility:** roles, labels, focus handling and states live in the primitive.
- **Plain CSS, no UI library.**
- **Request flow on a canvas** beside the nodes, driven by tick data from the engine.
- Money and percentage formatting stay in `src/engine/score.ts`, the single source for both
  the engine's result text and the UI.

## 5. Learning diagrams and the Learn tab

- **Figures** (`src/ui/figures`) are SVG diagrams drawn with a small kit (box, cylinder,
  arrow, meter). 10 are static; 18 are interactive "labs" with controls and a one-sentence
  readout of what the current state means. Labs reuse the game's own numbers where they
  exist (server sizes, bandwidth prices, latencies).
- **Learn tab:** 9 subjects, 31 sections. Each section is a diagram plus a few paragraphs,
  with its summary cards folded underneath and "Practice this" links to the levels that use it.
- **Codex → Learn:** every concept card has a "Go deeper" link to the section that explains
  it. A test enforces that each card belongs to exactly one section.
- **Missions:** every level brief opens with its concept diagram and a link to the subject.
- A subject opens *on top of* the current screen, so reading one mid-level loses nothing.

## 6. What was implemented, and what was not

Implemented: tokens and the "Night Shift" palette; SVG icon set; accessible sheet (dialog
role, focus trap, Escape, swipe-down, focus return), switch, radio-group segmented control,
labelled stepper; headroom bars; always-visible target strip; "since last run" chips; request
flow; trouble badges; pause / speed / scrub; staged review reveal with "Show me" links;
first-launch coach marks; step indicator; tab bar; tap-to-explain terms; desktop two-pane
build screen; reduced-motion handling; rem-based type that holds at 200% text size.

Not implemented or different from the plan:
- Android vibration on incidents is in place but untested on a real device.
- The run screen announces incidents to screen readers; it does not announce the final result
  (the review screen's verdict is a status region instead).
- No screen-reader or real-device testing was done; checks were automated browser runs only.

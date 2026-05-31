<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///trace.micro.marks/micro-trace/observe/?confidence=CS:16&p=10 -->

# Micro-trace — What It Is

<!-- → ? -->
<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///trace.micro.marks/micro-trace/observe/?confidence=CS:17#design-intent -->
## Design Intent

The Micro-trace HUD is the **backward-looking annotation layer** of the Signal HUD system. It marks where the governed response *actually changed state* during generation — a post-generative event trace, not a prospective commitment.

Contrast with:

| Layer | Direction | Format | Fires |
|---|---|---|---|
| Intent Header | Prospective (forward) | `//domain.quality.dynamic [R] 🏛️ ◇ @r` | Before generation |
| Micro-trace HUD | Retrospective (backward) | `→◇` `→■` `→○` inline | After/during generation |
| Exchange HUD line | Boundary (tick-level) | `⚡ ~NN% \| mode \| ...` | Opening and closing of operator exchange |
| Sub-agent handoff URI pair | Boundary (intent handoff) | `node-URI → node-URI` | At unloggable sub-agent boundary |

The micro-trace does **not** replace the exchange HUD pair. It annotates the inside of a generative span.

<!-- → ? -->
<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///trace.micro.marks/micro-trace/observe/?confidence=CS:16#scope -->
## Scope

- Covers: phase transitions (OODA-HA), stance shifts, Tagspace slot shifts, sub-agent boundaries
- Does not cover: parse-layer structural decomposition, todo state transitions (debug-only)
- Does not replace: Intent Header (prospective), exchange HUD pair (boundary)

<!-- → ? -->
<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///trace.micro.marks/micro-trace/observe/?confidence=CS:15#prior-art -->
## Prior Art & Sources

- `builds.stuffed.failed/agents/Lares_Preferences.md` § Signal HUD — lineage reference
- SIG-04 tracking item in `lares/sprints/SPRINT_ROADMAP_1_4.md`, `lares/sprints/SPRINT_ROADMAP_1_5.md`
- Operator-confirmed 2026-04-08 (browser session)
- Promoted to `lares/signal/micro-trace.md` in local Claude Code session, 2026-04-08

<!-- → ? -->

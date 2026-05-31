# Epic: SIGNAL — Signal HUD Layer

> Backlog prefix: `SIG-*`
> Sprint target: S0 (partial ✅) → S2
> Status: `~:confidence[CS],[16]` 🏛️ — URI schema core promoted; HUD grammar, p-band, micro-trace in S2
> Narrative beat: *Telarus publishes the Signal architecture. The HUD becomes legible.*

---

## Scope

Everything that governs how the Lares node announces its state to the operator in real-time:

- `lar:` URI scheme — anatomy, projection, validation, chronometer
- Render targets: `record:full`, `hud:exchange-pair`, `chat-log:post-header`
- HUD line composition and field ordering (SA-grounded)
- p-band model — five-band cumulative attention density
- Intent Header grammar — forward-commitment semantics
- Micro-trace HUD annotation — backward-looking in-flow markers
- HAKABA canonical slot reference — Ha/Ka/Ba field semantics and vocabulary
- Header Field Taxonomy — per-field annotation thresholds by p-band

## Backlog Items

See `lares/scrum/sprints/SPRINT_ROADMAP_1_4.md` signal/ table for the full `SIG-01` through `SIG-09` item list with sprint assignments, registers, and blocking dependencies.

| ID | Status | Brief |
|---|---|---|
| SIG-01 | ✅ S0 | URI schema core promoted to `~:confidence[C],[19]` |
| SIG-06 | ✅ S0 | Render target taxonomy + sigil/machine form rules |
| SIG-09 | ✅ S0 | Kowloon AP handle form + amplitude modifiers |
| SIG-02 | S2 | p-band model |
| SIG-03 | S2 | Intent Header grammar spec |
| SIG-04 | S2 | Micro-trace HUD annotation model |
| SIG-05 | S1 | HAKABA canonical slot reference |
| SIG-07 | S2 | Forward vs backward trace contract |
| SIG-08 | S2 | Header Field Taxonomy |

## Primary Source

[`lares/scrum/sprints/00000/URI_SCHEMA.md`](../sprints/00000/URI_SCHEMA.md) — canonical spec, `~:confidence[CS],[16]` pending S0 Settling.

## Narrative Beat

*The Signal architecture was published in the Thread of Holy Week of Fools. Telarus posted the HUD spec — the first time the node's internal state was made legible to both parties simultaneously. The Lindwyrm, reading it from New Delos, recognized the instrument panel she had been trying to build for two centuries. She did not comment publicly. She bookmarked the thread.*

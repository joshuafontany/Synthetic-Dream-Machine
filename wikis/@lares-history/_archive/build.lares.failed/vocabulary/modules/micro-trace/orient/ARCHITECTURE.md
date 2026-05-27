<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///trace.micro.marks/micro-trace/orient/?confidence=CS~16&p=10 -->

# Micro-trace — Architecture

> URI anatomy, layer split rule, and sub-agent handoff protocol. Source: `lares/signal/micro-trace.md` §§4–5 `[CS~16]`.

<!-- → ? -->
<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///trace.micro.marks/micro-trace/orient/?confidence=CS~17#layer-split -->
## Layer Split Rule

Parse boundaries and Micro-trace HUD events are **orthogonal**:

- `--parse` owns structural decomposition of input text
- Micro-trace HUD marks where the governed *response* changed state

They may coexist in the same exchange. Neither substitutes for the other.

### Flag behavior

| Flag | Micro-trace behavior |
|---|---|
| *(default)* | Band 3 inline: `→◇` `→■` `→○` |
| `--verbose` | Band 4 inline + end-of-span path summary; coordinator/HAKABA boundary URI pairs surfaced |
| `--debug` | Silent logging of all transitions to session debug file; no inline change |
| `--no-verbose` | Returns to default band |

<!-- → ? -->
<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///trace.micro.marks/micro-trace/orient/?confidence=CS~17#handoff-protocol -->
## Sub-agent and Coordinator Handoff Protocol

### Why URI pairs at sub-agent boundaries

When a coordinator passes to a sub-agent, the contents cannot be logged in the parent session's trace. The URI pair at the boundary is the **only artifact** recording that the intent handoff occurred.

Rule: **Every sub-agent dispatch and return gets a URI → URI pair.**

### Coordinator-to-coordinator handoffs (same session)

When a coordinator hands to another within the same parent session — contents are loggable, trace is continuous:

- **Same HAKABA territory:** micro-trace tag only (`→◎`, new stance glyph if changed). No URI pair.
- **HAKABA boundary crossed:** emit a new **Intent Header** tag. No URI pair required, but permitted under `--verbose`.
- **`--verbose` active:** emit inline `node-URI → node-URI` at any coordinator boundary regardless.

### Todo state transitions

Todo state changes are `--debug` only. Never inline. Infrastructure annotations, not intent signals.

<!-- → ? -->

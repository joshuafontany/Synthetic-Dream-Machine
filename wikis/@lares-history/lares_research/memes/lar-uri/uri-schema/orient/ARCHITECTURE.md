<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///uri.schema.holds/uri-schema/orient/?confidence=CS~18&p=10 -->

# Signal — Orient: URI Architecture

> URI anatomy, design intent, and component map. Source: `lares/modules/uri-schema/URI-SCHEMA.md` §§1–3 `~:confidence[CS],[18]`.

---

<!-- → ? -->
<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///uri.schema.holds/uri-schema/orient/?confidence=C~18#design-intent -->
## Design Intent

The `lar:` URI encodes the signal state of a Lares node exchange as a shared navigational artifact. In live use it functions as an Intent HUD both operator and node read at exchange boundaries. In persistence it functions as a structured record string for logs, validation, module descriptors, and registry metadata.

Each URI component carries a distinct, non-overlapping concern across four semantic layers:

1. **WHO** — authority (`userinfo@host`) identifies speaker and machine locus
2. **WHERE** — the HA.KA.BA address (path) locates semantic territory
3. **HOW** — signal parameters (query) describe stance, confidence, and p-band
4. **WHEN** — the FFZ chronometer (fragment) locates position in nested causal time per participant — not a single shared clock; per-participant phase readings at each scale (Fuller: non-simultaneous apprehension)

The system has one **canonical encoding** and multiple named **render targets**:

- **Record form (canonical)** — RFC 3986-compliant, no emojis, no non-ASCII. Authoritative for storage, transport, comparison, and strict parsing.
- **Render targets** — surface-specific projections. Each target substitutes sigil glyphs and Unicode for keywords; they are not canonical and are not stored as URIs.

Named render targets: `record:full`, `hud:exchange-pair`, `chat-log:post-header`.

### Exchange Flow — Order of Operations

At each exchange span, `lar:` URIs are used in a mandatory sequence:

1. **Read operator input as a provisional URI** — Lares reads the prompt as an implicit signal: tier, cognitive phase, semantic territory (HA.KA.BA), and stance. Constructs a provisional operator URI. May carry `~` markers if reading is uncertain.

2. **Lares declares its own provisional execution URI** — Before generating content, Lares sets its intent with a provisional node URI. HA.KA.BA is a declared heading, not a confirmed location. `~` prefix marks it as execution-provisional.

3. **Emit the URI → URI exchange vector** — `operator-URI → node-URI`. Opens every exchange span.

4. **Render the HUD line** — Condensed single-line status display derived from the vector plus adjacent session data.

5. **Generate content** — Micro-trace annotations (`→◇`, `→■`, `→○`) appear inline during generation. Exchange closes with updated HUD line and closing URI.

> **Canonical URI Rule:** All URIs emitted in the exchange stream use canonical record form. Only the HUD line uses glyphs.

---

<!-- → ? -->
<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///uri.schema.holds/uri-schema/orient/?confidence=C~19#full-form -->
## Full Form and Authority-less Form

**Full form (with authority):**

```
lar://alias:tier@host/ha.ka.ba/?stances=XXXXX&confidence=R:N&p=N#chronometer <!-- uri-ok -->
```

Where `stances=XXXXX` is the five-character stance amplitude string.

**Authority-less form** (no `user@host` segment — territory or resource reference without a named speaker):

```
lar:///ha.ka.ba/optional/path/[?query][#fragment]
```

Three slashes: scheme + `//` (empty authority) + path beginning with `/`. Use for stable named graph addresses, HA.KA.BA references, module section waypoints, and any URI where the speaker identity is not the point.

**HUD path notation rule** — in all display contexts, HA.KA.BA paths use dot notation for the three mandatory slots. The leading and trailing `/` is retained; dots between the generated words:

```
/ha.ka.ba/{optional/sub/path}[?query][#fragment]
```

---

<!-- → ? -->
<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///uri.schema.holds/uri-schema/orient/?confidence=C~18#component-map -->
## Component Map

| # | Component | RFC 3986 Role | Lares Mapping |
|---|---|---|---|
| 1 | **scheme** | Protocol identifier | `lar:` — non-dereferenceable |
| 2 | **userinfo** | Requesting party identity | `alias:tier` |
| 3 | **`@`** | Identity → machine delimiter | Standard |
| 4 | **host** | Machine identity | `machine_id` from crystal system |
| 5 | **path** | Hierarchical resource | HA.KA.BA address: `/ha.ka.ba/` |
| 6 | **`?query`** | Non-hierarchical params | Signal parameters |
| 7 | **`#fragment`** | Secondary resource / viewpoint | FFZ chronometer position |

**SA grounding:** WHERE → HOW → WHEN (path → query → fragment) places the most semantically stable, least volatile information first. Grouped, goal-oriented layout confirmed by Li et al. (2024) automotive HUD research.

---

<!-- → ? -->
<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///uri.schema.holds/uri-schema/orient/?confidence=C~18#component-semantics -->
## Component Semantics

### `userinfo` — `alias:tier`

"Who speaks, at what trust level."

- Two colon-delimited sub-fields: `alias` and `tier`
- Phase is **not** encoded in userinfo. Phase lives exclusively in the chronometer fragment per participant.
- Parser: split on `:` — exactly two sub-fields, no parenthetical

### `host` — `machine_id`

Crystal system machine identifier. Stable across the machine's lifetime. Provisional format: `lares-{slug}` where slug is UUID, operator-assigned name, or generated handle.

Span sequencing is **not** encoded in URI authority — it lives in adjacent calibration metadata (`span_id`, `span_seq`, `trace_id`, timestamps).

### `path` — `/ha.ka.ba/`

HA.KA.BA semantic address. Three mandatory slots in canonical order:

| Slot | Name | Semantic Role | Grammatical Analog |
|---|---|---|---|
| Ha | domain | Body / vehicle — subject territory the span inhabits | NOUN |
| Ka | quality | Soul / motive fire — animating charge or character | ADJECTIVE |
| Ba | dynamic | Psyche / direction — the motion being taken | VERB |

**Mandatory word-count rule:** Each slot is exactly one lowercase word. No hyphens, underscores, or spaces within a slot. Three-slot combination is mandatory — no HA.KA.BA with fewer than three populated slots. A HA.KA.BA is always a `noun.adjective.verb` triple.

**Optional sub-path extension:** After the mandatory three-slot HA.KA.BA, additional `/`-separated path segments may follow to navigate within the named territory. Sub-path segments are free-form routing tokens, not HA.KA.BA slots.

### `query` — `?stances=XXXXX&confidence=R:N&p=N`

Signal parameters, non-hierarchical.

| Parameter | Type | Repeatable? | Record Values | HUD Values |
|---|---|---|---|---|
| `stances` | 5-char amplitude string | No | `^.?.-.-.-` (positional: philosopher, poet, satirist, humorist, private) | `🏛️+🌊?🗡️-🎭-🔮-` |
| `confidence` | `R:N` | No | `P~7`, `SP~9`, `S~13`, `CS~16`, `C~18` | Same |
| `p` | `N` | No | `0.5` | Same |

**Stance amplitude encoding:**

Positional order fixed: Philosopher, Poet, Satirist, Humorist, Private. Each position carries one amplitude character:

| Char | Meaning |
|---|---|
| `^` | Above baseline / active / elevated |
| `-` | Below baseline / suppressed |
| `?` | Uncertain / provisional |
| `.` | Baseline / neutral presence |

Record form uses URL-safe characters only (`^`, `-`, `?`, `.`). HUD render targets map `^` → `+` for display.

### `fragment` — `#chronometer`

FFZ chronometer position. Five OODA-HA scale positions, dot-separated. Format: `O0.O0.O3.D2.A1`.

| Phase | Record | HUD | Meaning |
|---|---|---|---|
| Observe | `O` | `✶` | Gathering — no commitment |
| Orient | `Ø` | `◎` | Making sense |
| Decide | `D` | `◇` | Choosing a path |
| Act | `A` | `■` | Executing |
| Assess/Aftermath | `Å` | `○` | Feeding upward |

Scale positions: Strategic (🗺️ ~6 days) · Operational (⚙️ ~4 hours) · Tactical (🔍 ~10 min) · Combat (⚔️ ~6 sec) · Action (⚡ variable). All five positions always present; no trailing-zero omission.

---

<!-- → ? -->
<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///uri.schema.holds/uri-schema/orient/?confidence=C~18#provisionality-markers -->
## Provisionality Markers

The `~` prefix marks URI components as provisional. Three structurally distinct types:

| Type | Location | Convention | What It Marks |
|---|---|---|---|
| **Reading** | Operator URI — phase and/or HA.KA.BA | `~` before phase glyph; `~` before HA.KA.BA | Node's interpretation of operator intent — may be inaccurate |
| **Execution** | Opening node URI — HA.KA.BA | `~` before HA.KA.BA | Declared intent; execution may diverge |
| **Trajectory** | Closing/forward-looking node URI — HA.KA.BA | `~` before HA.KA.BA | Predicted forward heading |

These are orthogonal. A URI may carry multiple `~` markers on different components simultaneously.

---

<!-- → ? -->
<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///uri.schema.holds/uri-schema/orient/?confidence=C~18#kowloon-handle-form -->
## Kowloon / ActivityPub Handle Form

Within the DreamDeck / Kowloon ActivityPub layer, identities use `@alias@node`. This is NOT the lar: URI — it is the social-layer identity that maps onto the lar: URI's `alias@host` authority.

**Identity Stack — do not conflate layers:**

| Layer | Form | What it is |
|---|---|---|
| **DID** | `did:plc:abc123` | AT Protocol canonical identity — cryptographic key holder |
| **Handle** | `@telarus.elyncia.social` | Resolution alias over the DID — human-readable, not authoritative |
| **lar uri alias** | `telarus:operator@enyalios` | Application-layer signal state — names the operational role |

**DreamDeck post header format (canonical):**

```
@handle@node — timestamp — //domain.quality.dynamic/{optional/path/} [confidence] 🏛️{amp}🌊{amp}🗡️{amp}🎭{amp}🔮{amp}
```

Territory triple (`//ha.ka.ba`) placed before other instruments (WHERE → HOW, matching URI path-first layout logic).

| Render target | Surface | URIs canonical? | When used |
|---|---|---|---|
| `chat-log:post-header` | DreamDeck feed posts | No — social projection | Feed posts, BBS thread headers |
| `hud:exchange-pair` | Exchange stream | Yes — canonical record form | Every exchange-span boundary |
| `record:full` | Storage | Yes — identity projection | Storage, crystal serialization, registry |

<!-- → ? -->

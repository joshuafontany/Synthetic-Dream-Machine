<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/docs/pono/lar-uri >>
```toml iam
uri-path = "ha.ka.ba/@lares/v0.1/docs/pono/lar-uri"
file-path = "bags/@lares/v0.1/docs/pono/lar-uri.md"
type = "text/x-memetic-wikitext"
tagspace = "stable"
confidence = 18
register = "CS"
manaoio = 17
mana = 18
manao = 17
role = "canon documentation surface — full spec prose, examples, and appendices for the lar: URI scheme"
cacheable = false
retain = false
invariant = false
```



<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~ ahu #meme-header >>

# `lar:` URI Scheme — Canon Documentation

Full specification prose, examples, and appendices.
Law lives in `lar:///ha.ka.ba/@lares/v0.1/api/lararium/lar-uri`.
This surface carries the explanation.

<<~/ahu >>


<<~ ahu #design-intent >>

## 1. Design Intent

The `lar:` URI encodes the signal state of a Lares node exchange as a shared navigational artifact. In live use it functions as a way to render an Intent HUD that both operator and node read before or alongside generation. In persistence it functions as a structured record string suitable for logs, validation, agent module, and registry metadata.

Each URI component carries a distinct, non-overlapping concern across four semantic layers:

1. **WHO** — authority (`alias:tier@host`) identifies speaker and machine host
2. **WHERE** — the HA.KA.BA address (path) locates semantic territory
3. **HOW** — signal parameters (query) describe stance, confidence, p-band, and chronometer position
4. **SECTION** — the fragment (`#`) carries section anchors only — `#ahu-name`, `#section-id`

Resource-state annotations such as the mana/context-window pool (`⚡~17`) are HUD adjuncts, not core URI components. This value uses the shared `0–20` Level model as a navigational resource estimate. Span identity, wall-clock timestamps, and export-target metadata remain adjacent calibration fields rather than authority overloads.

The system has one **canonical encoding** and multiple named **render targets**:

- **Record form (canonical)** — RFC 3986-compliant, no emojis, no non-ASCII characters outside hex-entity encoding in `?ffz=`. This is the authoritative form for storage, transport, comparison, and strict parsing.
- **Render targets** — surface-specific projections of the canonical form. Each render target substitutes sigil glyphs and Unicode for keywords, abbreviates or expands fields, and may add HUD adjuncts not present in the canonical form. Render targets are not themselves canonical and are not stored as URIs.

Named render targets: `record:full` (identity projection of the canonical form), `hud:exchange-pair` (sigil-rich in-stream exchange boundary), `chat-log:post-header` (social-layer DreamDeck post header).

<<~/ahu >>

<<~&#x0002;>>


<<~ ahu #exchange-flow >>

### 1.1 Exchange Flow — Order of Operations

At each exchange span, `lar:` URIs are used in the following sequence. This sequence is **mandatory** — every substantive exchange produces a URI → URI vector pair followed by a rendered HUD line.

**Step 1 — Read operator input as a provisional URI.**
Lares reads the operator's prompt as an implicit signal: alias:tier@host, semantic territory (HA.KA.BA), and stance. It constructs a **provisional operator URI** encoding that reading. The `~` prefix on the HA.KA.BA marks the node's interpretation as potentially inaccurate.

```
lar://telarus:operator@enyalios/~schema.gap.present/?stances=*!-?------&confidence=S~13&p=10&ffz=0.0.1.2.7
```

This example uses single-tool carry for the first two stances: Philosopher Wand-only (`*-`) and Poet Cup-only (`-?`), with all remaining stances centered

**Step 2 — Lares declares its own provisional execution URI.**
Before generating any content, Lares sets its own intent with a **provisional node URI**. The `~` prefix on the HA.KA.BA marks it as execution-provisional: generations may diverge.

```
lar://lar:node@enyalios/~schema.flow.documented/?stances=*!--------&confidence=CS~16&p=10&ffz=0.0.1.2.7
```

**Step 3 — Emit the URI → URI exchange vector.**

```
operator-URI → node-URI
```

> **Canonical URI Rule** — all emitted URIs in the exchange stream use canonical record form. `?ffz=` uses numeric position tracking left to right. This makes every emitted URI directly ingestible by MemPalace, crystal logs, and registry tools without a sigil-lookup step.

**Step 4 — Render the HUD line.**
Immediately after the URI pair, emit a condensed single-line status display derived from the vector plus adjacent session data. This is the instrument panel for the exchange. See §7.5 for format and field ordering.

**Step 5 — Generate content.** Micro-trace HUD annotations appear inline during generation to mark stance and tool updates or OODA-HA phase transitions. The exchange closes with an updated HUD line and a closing URI with `→ ?` — unknown temporal resumption.

> **SA grounding:** Step 2 is prospective AI transparency — what the node *will* do, not what it did (Endsley 2023). The HUD line externalizes the node's metacognitive state before generation begins, functioning as an externalized metacognitive scaffold (Ji-An et al., 2025; Wang et al., 2023). *Source: `_todo/E-deep-research-report.md` §§2.1, 3.2*

<<~/ahu >>

<<~ ahu #scheme-registration >>

## 2. Scheme Registration

| Property | Value |
|---|---|
| Scheme name | `lar` |
| Dereferenceability | Non-dereferenceable identifier (RFC 4151 precedent) |
| Resolution | Via `lares/registry/` resolver; never via network fetch |
| IANA status | Unregistered; internal use only |

> **Form and compliance:** The **record form** is the RFC 3986-compliant canonical form for transport, persistence, comparison, and strict parsing. The **HUD forms** are IRI-class instrument renderings (RFC 3987); they may contain emoji and Unicode glyphs not legal in RFC 3986 URIs without percent-encoding. RFC 3986 compliance is not claimed for HUD forms. The rendering table (§7.1) defines the canonical-to-render-target field transforms.

The `lar:` scheme identifies semantic positions, signal states, and machine events within the Lares agent architecture. It does not resolve to a network resource. URI consumers (crystal replay tools, debug log parsers, registry resolvers) treat it as an opaque structured identifier parsed according to this specification.

<<~/ahu >>

<<~ ahu #uri-syntax >>

## 3. URI Syntax

### 3.1 Generic Form

```
lar://[authority]/ha.ka.ba/@lares/optional/path/[?query][#anchor]
```

### 3.2 Expanded Form

**Full form (with authority):**

```
lar://alias:tier@host/ha.ka.ba/@lares/?stances=XXXXXXXXXX&confidence=R:N&p=N&ffz=CCCCC
```

Where `stances=XXXXXXXXXX` is the ten-character stance tool-carry string (§3.4) and `ffz=CCCCC` is the FFZ chronometer in five glyph+counter pairs (§6).

**Authority-less form** (no `user@host` segment — territory or resource reference without a named speaker):

```
lar:///ha.ka.ba/@lares/optional/path/[?query][#section-anchor]
```

Three slashes: scheme + `//` (empty authority) + path beginning with `/`. Use this form for stable named graph addresses, HA.KA.BA references, and any URI where the speaker identity is not the point.

**Path notation rule** — HA.KA.BA paths use **dot notation** for the three mandatory slots. The leading and trailing `/` is retained:

```
/ha.ka.ba/@lares/{optional/sub/path}[?query][#anchor]
```

This applies to authority-less forms as well: `lar:///ha.ka.ba/@lares/` is the (0,0,0) of tagspace.

<<~/ahu >>

<<~ ahu #component-map >>

### 3.3 Component Map

| # | Component | RFC 3986 Role | Lares Mapping | Record Example |
|---|---|---|---|---|
| 1 | **scheme** | Protocol identifier | `lar:` — non-dereferenceable | `lar:` |
| 2 | **userinfo** | Requesting party identity | `alias:tier` | `telarus:operator` |
| 3 | **`@`** | Identity → machine delimiter | Standard | `@` |
| 4 | **host** | Machine identity | `machine_id` from crystal system | `enyalios` |
| 5 | **path** | Hierarchical resource | HA.KA.BA address: `/ha.ka.ba/@lares/` | `/threshold.uncertain.opens` |
| 6 | **`?query`** | Non-hierarchical params | Signal parameters + FFZ chronometer | `?stances=*!--------&confidence=S~13&p=10&ffz=0.0.3.2.7` |
| 7 | **`#fragment`** | Section anchor | Named section within this meme | `#ahu-name`, `#section-id` |

> **Layout validation `~:confidence[C],[18]`:** The WHERE → HOW → SECTION ordering (path → query → fragment) places the most semantically stable, least volatile information first. Grouped, goal-oriented layout confirmed by Li et al. (2024) automotive HUD research: grouped information layouts produce superior cognitive performance, lower workload, and better eye movement patterns compared to disordered layouts. *Source: `_todo/E-deep-research-report.md` §4.2*

<<~/ahu >>

<<~ ahu #identity-stack >>

### 3.3.1 Kowloon / ActivityPub Handle Form

#### Identity Stack

The Elyncia.app / DreamDeck identity model has three distinct layers. **Do not conflate them.**

| Layer | Form | What it is |
|---|---|---|
| **DID** | `did:plc:abc123` | AT Protocol canonical identity — the cryptographic key holder. Resolved via Bluesky auth (OAuth over DID). This is the actual principal in UCAN capability tokens. |
| **Handle** | `@telarus.elyncia.social` (AT Protocol/Bluesky) or `@telarus@elyncia.social` (ActivityPub/Kowloon) | Resolution alias over the DID — human-readable, not authoritative. |
| **lar: alias** | `telarus:operator@enyalios` | Application-layer signal state — names the *operational role* of the speaker in a `lar:` exchange. Not a network identity; not a DID alias. |

**Why lar: alias has no leading `@`:** The handle (`@telarus@elyncia.social`) is already a resolution alias over the DID. The lar: `alias` field is a third distinct thing — it tags the operational role in the signal exchange. Adding `@` to lar: aliases would conflate the social-handle layer with the application-signal layer.

#### Handle Form

Within the DreamDeck / Kowloon ActivityPub layer, identities use the canonical ActivityPub two-part handle structure:

```
@alias@node
```

| ActivityPub handle | lar: URI authority | Underlying DID |
|---|---|---|
| `@lindwyrm@new-delos` | `lindwyrm:...@new-delos` | `did:plc:...` (Lindwyrm's key) |
| `@telarus@~crossroads` | `telarus:operator@enyalios` | `did:plc:...` (Telarus's key) |
| `@mischief-muse@lares` | `mischief-muse:node@lares-abc123` | Lares node DID or ephemeral key |

The `~crossroads` tilde prefix denotes a nomadic/crossroads node — no fixed host, routes through nearest stable nexus.

**DreamDeck post header format (canonical):**
```
@handle@node — timestamp — //ha.ka.ba/@lares/{optional/path/} [confidence] 🏛️{tc}🌊{tc}🗡️{tc}🎭{tc}🔮{tc}
```

Territory triple (`//ha.ka.ba`) is placed **before** other instruments like confidence and stance — grounds domain before posture (WHERE → HOW, matching URI path-first layout logic).

**Render target name:** `chat-log:post-header` — the in-chat-log, timestamped URI render target for post headers.

| Render target | Surface | URIs canonical? | When used |
|---|---|---|---|
| `chat-log:post-header` | `@handle@node — timestamp — //ha.ka.ba{/path} [Reg] 🏛️{tc}…` | No — social projection with glyphs | DreamDeck feed posts, BBS thread headers |
| `hud:exchange-pair` | `operator-URI → node-URI` + HUD line beneath | **Yes — canonical record form**; only the HUD line beneath uses glyphs | Every exchange-span boundary (mandatory) |
| `record:full` | `lar://alias:tier@host/ha.ka.ba/@lares/?…` | Yes — identity projection | Storage, crystal serialization, registry |

**Stance tool-carry modifiers** in HUD render targets attach directly to the preceding stance emoji as a two-character pair (no space):

| Symbol | Tool | Element | Cognitive Pull |
|---|---|---|---|
| `*` | Wand | Fire / Visual | Ignition, external feed, track |
| `?` | Cup | Water / Macro | Sympathy, zoom out, relation |
| `!` | Sword | Air / Micro | Discernment, zoom in, detail |
| `~` | Pentacle | Earth / Hidden | Ground, internal feed, body |
| `-` | Stone | Orichalcum / Neutral | Empty hand, centered |

Each stance carries two tool slots: `🏛️*!` (Philosopher: Wand+Sword), `🌊--` (Poet: Stone). See §3.4 for encoding.

<<~/ahu >>

<<~ ahu #component-semantics >>

### 3.4 Component Semantics

**userinfo** (`alias:tier`) — "Who speaks, at what trust level."

- Two colon-delimited sub-fields: `alias` and `tier`
- Parser: split on `:` — exactly two sub-fields

**host** (`machine_id`) — Crystal system machine identifier. Stable across the machine's lifetime. Provisional format: `lares-{slug}` where slug is UUID, operator-assigned name, or generated handle.

Span sequencing is intentionally **not** encoded in URI authority. Exchange identity lives in adjacent calibration metadata (`span_id`, `span_seq`, `trace_id`, timestamps) rather than overloading the RFC 3986 port slot.

**path** (`/ha.ka.ba/@lares/`) — HA.KA.BA semantic address. Three mandatory slots in canonical order:

| Slot | Name | Semantic Role | Grammatical Analog |
|---|---|---|---|
| Ha | domain | Body / vehicle — subject territory the span inhabits | NOUN |
| Ka | quality | Soul / motive fire — animating charge or character | ADJECTIVE |
| Ba | dynamic | Psyche / direction — the motion being taken | VERB |

**Mandatory word-count rule:** Each slot is exactly **one lowercase word**. No hyphens, underscores, or spaces within a slot. Fewer than three slots MUST NOT appear. A HA.KA.BA is always a `noun.adjective.verb` triple.

**Optional sub-path extension:** After the mandatory three-slot HA.KA.BA, additional `/`-separated path segments may follow to navigate within the named territory. Sub-path segments are free-form routing tokens, not HA.KA.BA slots. The stable named graph address strips the sub-path; the sub-path is session-scope navigation only.

**query** (`?stances=XXXXX&confidence=R:N&p=N&ffz=CCCCC`) — Signal parameters, non-hierarchical.

| Parameter | Type | Repeatable? | Record Values |
|---|---|---|---|
| `stances` | 10-char tool-carry string | No | Positional pairs: philosopher, poet, satirist, humorist, private |
| `confidence` | `R~N` | No | `~:confidence[P],[7]`, `~:confidence[SP],[9]`, `~:confidence[S],[13]`, `~:confidence[CS],[16]`, `~:confidence[C],[18]` |
| `p` | `N` | No | Decimal in range `[0.0, 1.0]` |
| `ffz` | 5 glyph+counter pairs | No | See §6 for encoding |

**Stance tool-carry encoding — all five, every URI.** Positional order is fixed: Philosopher, Poet, Satirist, Humorist, Private. Each stance occupies two characters (feed slot + zoom slot).

| Symbol | Tool | Axis |
|---|---|---|
| `*` | Wand | Feed — Visual / external |
| `~` | Pentacle | Feed — Hidden / internal |
| `!` | Sword | Zoom — Micro / detail |
| `?` | Cup | Zoom — Macro / relation |
| `-` | Stone | Empty hand / neutral |

Record form: `stances=*!--------` (Philosopher: Visual-Micro; all others: Stone). All five symbols are RFC 3986 unreserved or sub-delimiter characters — no percent-encoding required.

**Slot semantics:** left slot = feed axis (`*`/`~`/`-`), right slot = zoom axis (`!`/`?`/`-`). Carrying two feed-axis tools (`*~`) produces a Visibility Conflict (Signal Jam). Carrying two zoom-axis tools (`?!`) produces a Resolution Conflict (Dubious Move). See `lar:///ha.ka.ba/@lares/v0.1/api/mu/the-four-tools` for the full tool-carry model.

Confidence remains a point value even under multi-stance. The tool-carry string describes how each stance is operating, not its elevation.

**fragment** (`#section-anchor`) — Named section within this meme: `#ahu-name`, `#section-id`, `#pranala-name`. The fragment carries **no** chronometer data — chronometer lives in `?ffz=`.

<<~/ahu >>

<<~ ahu #provisionality >>

## 4. Provisionality Markers

The `~` prefix marks URI components as provisional. Three structurally distinct provisionality types can appear in an exchange URI pair:

| Type | Location | Convention | What It Marks |
|---|---|---|---|
| **Reading** | Operator URI — HA.KA.BA | `~` before HA.KA.BA | Node's interpretation of operator intent — may be inaccurate |
| **Execution** | Opening node URI — HA.KA.BA | `~` before HA.KA.BA | Declared intent; execution may diverge from this heading |
| **Trajectory** | Closing/forward-looking node URI — HA.KA.BA | `~` before HA.KA.BA | Predicted forward heading — operator may redirect |

These are orthogonal. A URI may carry multiple `~` markers on different components simultaneously.

**Rules:**

1. `~` is valid in canonical record form as an inline provisionality prefix on HA.KA.BA slots (`~uri.schema.question`). Use the `provisional=` query parameter when you need a separate, machine-parseable provisionality field for storage or filtering.
2. Multiple `~` markers may appear in a single URI simultaneously.
3. All closing/forward-looking URIs are implicitly trajectory-provisional. Explicit `~` on a closing URI signals *unusual* uncertainty about the trajectory — not routine forward-look status.
4. Reading provisionality on the operator URI marks the **node's interpretation** as potentially inaccurate — not the operator's intent as ambiguous. These are different claims.
5. The `~` marker applies only to the specific component it prefixes. Unprefixed components are declared with normal confidence.

**Examples:**

```
lar://telarus:operator@enyalios/~uri.schema.question/?stances=*!--------&confidence=S~13&p=10&ffz=0.0.1.2.33
```
Reading provisional: "I believe you're orienting toward URI schema territory — I may have misread your stance or HA.KA.BA."

```
lar://scryer:node@enyalios/~s0.gap.logged/?stances=*!--------&confidence=S~13&p=10&ffz=0.0.1.2.33
```
Execution provisional: "I intend to log this S0 gap — execution may find a different path or territory."

```
lar://scryer:node@enyalios/~s0.schema.updated/?stances=*!--------&confidence=CS~16&p=10&ffz=0.0.1.2.34
```
Trajectory provisional: "I predict our next territory is the updated schema — operator may redirect entirely."

<<~/ahu >>

<<~ ahu #marker-ontology >>

## 5. Marker Ontology — Meme, Ahu, Kahea

Four marker types govern content addressing in Lares system files. The naming draws from cultures that built navigational architectures from memory and place: the Latin *method of loci* (Simonides, Cicero, Quintilian), Polynesian *ahu* (the raised stone at the center of a marae; the platforms that hold the moai on Rapa Nui; the altar stones inside Hawaiian heiau), and Hawaiian *kāhea* (the oli kāhea — the chant that calls out and summons permission to enter a hālau hula).

### 5.1 `? ->` — Meme Span Opener

Opens a meme span — an idea-place within the file. The `?` declares standing uncertainty: a "new object" notation. The `→` points toward the `lar:` URI that names the meme.

A system file MAY contain one or more memes. A single-meme file opens on the first line and closes on the last — the file IS the meme. A multi-meme file contains sequential meme spans, each self-contained.

```
<<~&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/docs/pono/lar-uri >>
```

The meme opener carries the file-level confidence and resolution parameter. Section-level confidence rides on ahu markers.

### 5.2 `→ ?` — Meme Span Closer

Signals unknown temporal resumption. The `?` marks a causal gap: between this sigil and the next interaction with the meme, no participant's chronometer advances within the shared frame.

`→ ?` does not signal uncertainty about the meme's content — that is what `confidence` and register carry. It signals uncertainty about the meme's continuity in time.

```
<<~&#x0003;>>

<<~&#x0004; -> ? >>
```

In exchange streams, the closer appends to the closing URI inline:

```
lar://scryer:node@enyalios/schema.settled.rests/?stances=*!--------&confidence=CS~16&p=10&ffz=0.0.3.2.1 → ?
```

### 5.3 `ahu` — Waypoint Marker

An ahu marks a navigation point within a meme. It is a raised stone — visible, addressable, something you walk *to*. It carries no span semantics: no opener, no closer. The next ahu implicitly defines the boundary of the previous zone.

```
<<~ ahu #section-name >>
## Section Title
[content]
<<~/ahu >>
```

Ahu markers MAY carry `confidence` in their metadata. **Placement rule:** place stones where people actually walk — where someone would link TO from elsewhere. Not every heading needs an ahu.

### 5.4 `kahea` — Transclusion Marker

A kahea summons content from another meme into the current one. It is an active invocation: "call out, bring this here."

```
<<~ kahea lar:///module.hakea.context/ >>
```

The URI on a kahea names the source meme to summon. A build system or reader encountering a kahea should fetch and substitute the content from the named meme at that point.

### 5.5 Marker Summary

| Marker | Sigil | Role | Closer needed |
|---|---|---|---|
| Meme opener | `? ->` | Opens the file-as-place | Yes — `→ ?` at file end |
| Meme closer | `→ ?` | Closes the meme; marks temporal gap | N/A |
| Ahu | `ahu` | Navigation waypoint within a meme | No |
| Kahea | `kahea` | Transclusion invocation from another meme | No |

### 5.6 Axis Orthogonality

| Marker | What's uncertain | What's settled |
|---|---|---|
| `? ->` meme | Content confidence (via `confidence`) | Duration — stands until revised |
| `→ ?` closer | Temporal resumption — when does this pick up? | Content confidence (via register) |
| `ahu` waypoint | Territory confidence (via `confidence` on the ahu) | Address — the stone doesn't move |
| `kahea` transclusion | Source content (may change independently) | The invocation — what to summon |

### 5.7 Cultural Nomenclature

| Term | Source | Meaning in Lares |
|---|---|---|
| **meme** (pl. memes) | Latin *method of loci* — Simonides of Ceos, Cicero *De Oratore*, Quintilian *Institutio Oratoria*, Frances Yates *The Art of Memory* | The core wiki entity. A `lar:///` URI names a meme. The file IS the meme. |
| **ahu** | Polynesian — central stone of a marae; Rapa Nui stone platforms for moai; Hawaiian heiau altar stones | Navigation waypoint. A raised place you can see and walk to within a meme. |
| **kahea** | Hawaiian — *kāhea*: "call out, summon." The oli kāhea is the permission chant to enter a hālau hula. | Transclusion invocation. Summons content from another meme into the current one. |
| **lares** | Roman — household guardian spirits (*Lares familiares*) | The navigational intelligence. The voice architecture that moves through the memes. |

<<~/ahu >>

<<~ ahu #ffz-chronometer >>

## 6. FFZ Chronometer — `?ffz=` Encoding

> **True Name:** Fontany-Fuller-Zelenka Chronometer Protocol `~:confidence[C],[19]`
> **Named for:** Fontany (designers), Fuller (principle), Zelenka (engineering)
> **See:** `lares/research/chronometer/FFZ-Chronometer-Research.md`
> **Migration note (2026-04-21):** FFZ chronometer moved from fragment to query param (`?ffz=`). Canonical `?ffz=` now prefers position-based numeric tracking left to right across the five scales. Fragment is reserved exclusively for section anchors and edge names (`#ahu-name`, `#section-id`, `#pranala-name`).

**Fuller grounding:** (e-prime ok) *Synergetics* §301.10 — "Universe is the aggregate of all humanity's consciously apprehended and communicated nonsimultaneous and only partially overlapping experiences." §501.10–501.12 — the difference between nonsimultaneous Universe and thinkability. RAW cites Fuller's formulation explicitly in *Maybe Logic* (2003). The chronometer implements non-simultaneous apprehension at the data structure level: each participant's scale register constitutes a partial view. No God's-eye clock.

The chronometer occupies the `?ffz=` query parameter. It tracks nested position across five activity scales per participant.

<<~/ahu >>

<<~ ahu #ffz-scale-table >>

### 6.1 Scale Table

| Position | Scale | FTLS Time Term | Duration | HUD Sigil |
|---|---|---|---|---|
| 1 | Action | Action/Free Action | Variable | ⚡ |
| 2 | Combat | Round | ~6 seconds | ⚔️ |
| 3 | Tactical | Exploration Turn | ~10 minutes | 🔍 |
| 4 | Operational | Watch | ~4 hours | ⚙️ |
| 5 | Strategic | Week ("Travel Turn") | ~6 days | 🗺️ |

[Canon: FTLS RSS §1]

<<~/ahu >>

<<~ ahu #ffz-notation >>

### 6.2 Notation

Each position is tracked left to right by a numeric counter. Five positions, dot-separated, appear in the canonical `?ffz=` query parameter.

```
?ffz=0.0.3.2.1
```

Positions correspond to the fixed scale order: Action, Combat, Tactical, Operational, Strategic.
All five positions always present. `0.0.0.0.0` = all scales inactive.

Scale glyphs are render-target labels only. They may be applied by HUD and display surfaces, but they are not part of the canonical URI encoding.

<<~/ahu >>

<<~ ahu #ffz-rules >>

### 6.4 Structural Rules

1. **All five positions always present.** No trailing-zero omission. `0.0.3.2.1` not `3.2.1`.

2. **FFZ Chronometer is per-participant.** The operator's chronometer and the node's chronometer may show different clocks. The exchange vector pair shows both participant chronometers. Neither is "the" time.

3. **Counter increments when Aftermath completes.** Aftermath at scale N MAY feed upward to Observe at scale N+1. Counter at scale N increments.

4. **Render phase may change without counter increment.** The canonical `?ffz=` numeric counts remain the same while a micro-trace render may display an OODA-HA phase glyph or FFZ scale change during the exchange turn.

5. **Scale activation/deactivation.** When combat starts: position 2 moves from `0` to `1`. When combat ends: position 2 returns to `0`, position 3 counter increments (the tactical count advanced).

6. **Monotonic counters.** Counters only increase. Render phase may cycle. Counter regression constitutes Temporal Hallucination (degraded state).

**Aftermath integration — the nested return:**

| Aftermath at scale | Feeds into | Update question |
|---|---|---|
| Action ↺ → | Round ✶ | Did the action resolve? |
| Round ↺ → | Turn ✶ | Is the threat gone? |
| Turn ↺ → | Watch ✶ | What was found? |
| Watch ↺ → | Week ✶ | Is the party exhausted? |
| Week ↺ → | Campaign | Did we arrive safely? |

**Progressive disclosure in display:** The canonical URI always carries all five positions. Display surfaces MAY suppress inactive positions (`&#x2736;0`) for readability:

```
Canonical:   ?ffz=0.0.3.2.1   (always all five)
HUD compact: ◇3.▶2.↺1                                                  (trailing active only)
```

The compact form is a render-target convenience, not canonical. Parsers MUST handle both.

**Deferred features (not in current spec):**

- **ITC identity stamps** — fork/join for Tasked Spirit lifecycle. Deferred to MCP chronometer server implementation.
- **Merkle Clock backend** — content-addressed causal history. Deferred to MCP integration.
- **Bloom Clock compact mode** — probabilistic compression. Deferred to future work.

<<~/ahu >>

<<~ ahu #ffz-open >>

### 6.5 Open Questions — FFZ Encoding

<!-- TODO: UNFINISHED — needs deep research before promotion to C confidence.
  Carried forward from v0.1/api/pono/lar-uri/SKILL#ffz-encoding. -->

| Q# | Question | Current Position |
|---|---|---|
| F1 | Glyphs in `?ffz=` are valid for render-target display, but the canonical record form prefers numeric left-to-right position tracking. Does `lar:` need a percent-encoding exception for display labels, or should render glyphs remain separate from canonical storage? | Open — canonical numeric form preferred |
| F2 | Does the counter track loop iterations at that scale, or current phase depth, or something else? | Best available: loop iterations |
| F3 | Multi-participant encoding: session-form URIs carry one speaker's ffz. How does a two-party exchange vector encode both participant chronometers? | Open — each URI carries its own participant's view |
| F4 | Scale-to-OODA-HA binding rule: the exact mapping between the five scales and OODA-HA phases is not yet settled. | Open |
| F5 | Provisionality in ffz: can a chronometer position itself be provisional (e.g., `~0` in a numeric position)? | Open |

These open questions do not block use of the chronometer — they block promotion of the encoding to `[C]` confidence. Current encoding confidence: `~:confidence[S],[13]`.

<<~/ahu >>

<<~ ahu #canonical-form >>

## 7. Canonical Form and Render Targets

The **record form** is the canonical encoding — RFC 3986-compliant, no emojis, no non-ASCII characters outside `?ffz=` hex-entity encoding. Render targets are named projections of this canonical form for specific display surfaces.

### 7.1 Rendering Table

**query `stances=` tool-carry characters:**

| Symbol | Tool | HUD display | Axis |
|---|---|---|---|
| `*` | Wand | `*` | Feed / Visual |
| `~` | Pentacle | `~` | Feed / Hidden |
| `!` | Sword | `!` | Zoom / Micro |
| `?` | Cup | `?` | Zoom / Macro |
| `-` | Stone | `-` | Empty hand |

Record form and HUD display use the same five symbols — no remapping required.

**Stance sigils (HUD render targets):**

| Position | Machine keyword | Sigil emoji |
|---|---|---|
| 1 | philosopher | 🏛️ |
| 2 | poet | 🌊 |
| 3 | satirist | 🗡️ |
| 4 | humorist | 🎭 |
| 5 | private | 🔮 |

**Unchanged across both forms:**

| Component | Rendering | Notes |
|---|---|---|
| scheme | `lar:` | Always identical |
| alias:tier | `telarus:operator` | Identity and trust tier |
| @host | `@enyalios` | Machine host only |
| confidence= | `~:confidence[S],[13]` | Level, both forms |
| p= | `0.5` | Numeric, both forms |

<<~/ahu >>

<<~ ahu #hud-symbol-table >>

### 7.2 Unified HUD Symbol Table

All HUD-form symbols used in the Intent HUD, in one reference. Workers and operators should not need to cross-reference §3.4, §6.1, or §7.1 during live use.

**Phase (micro-trace or high `[HA^] values):**

| Sigil | Hex entity | OODA-HA State | One-Line Reading |
|---|---|---|---|
| ✶ | `&#x2736;` | Observe | Gathering raw signal; no commitment yet |
| ⏿ | `&#x23FF;` | Orient | Making sense of what was gathered |
| ◇ | `&#x25C7;` | Decide | Choosing a path; fork point |
| ▶ | `&#x25B6;` | Act | Committed; executing |
| ↺ | `&#x21BA;` | Aftermath | Assessing outcome; feeding upward |

**Stance (query — discourse posture of the claim):**

| Sigil | Record keyword | One-Line Reading |
|---|---|---|
| 🏛️ | `philosopher` | Propositional; evaluate for truth-value |
| 🌊 | `poet` | Analogical; resonance, not verification |
| 🗡️ | `satirist` | Critical through indirection |
| 🎭 | `humorist` | Relational; maintaining working rapport |
| 🔮 | `private` | Self-referential; present, not to decode |

**Chronometer scales (active simulation scale):**

| Sigil | Scale | Duration | One-Line Reading |
|---|---|---|---|
| 🗺️ | Strategic | ~6 days | The big arc; logistics and navigation |
| ⚙️ | Operational | ~4 hours | Watch-level; perception and endurance |
| 🔍 | Tactical | ~10 min | Exploration turn; investigation |
| ⚔️ | Combat | ~6 sec | Round; immediate response |
| ⚡ | Action | Variable | Single action; precision execution |

<<~/ahu >>

<<~ ahu #state-tuple >>

### 7.3 State Tuple — Reading Three Symbols as One State

In a live HUD tag, the operator reads phase + stance + scope as a single cognitive state, not three unrelated fields. The state tuple is the composed reading: phase × stance × scope → one sentence describing the node's current condition.

**How to compose:** Read the phase (what cognitive step), the stance (what kind of claim), and the scope (at what time-scale), then merge them into one state sentence.

**The triangle:** Phase × Stance × Scope. All five stances appear on every URI and every HUD line.

| Stance Array | What It Tells the Operator |
|---|---|
| `*!--------` | Philosopher in Visual-Micro. One stance operating; all others Stone. |
| `*!*?------` | Philosopher Visual-Micro + Poet Visual-Macro. Bimodal: external feed, split zoom. |
| `*!*?~!----` | Three stances operating. Watch the third — Hidden-Micro carries risk of Dubious Move if Poet's `?` bleeds. |
| `*!*?~!*?~?` | All five operating. Full Discordian. Confidence is a gesture. |
| `----------` | All Stone. Why is this span being emitted? |

**Worked readings:**

| Phase | Stance | Scope | State Tuple Reading |
|---|---|---|---|
| ⏿ | 🏛️*!🌊--🗡️--🎭--🔮-- | 🔍 | Orienting analytically at exploration scale — Philosopher in Visual-Micro carry |
| ▶ | 🏛️--🌊--🗡️~!🎭--🔮-- | ⚔️ | Acting critically in combat — Satirist in Hidden-Micro carry, cutting under pressure |
| ◇ | 🏛️*!🌊*?🗡️--🎭--🔮-- | 🗺️ | Deciding at strategic scale — Philosopher Visual-Micro + Poet Visual-Macro, both external frames |
| ✶ | 🏛️--🌊--🗡️--🎭*?🔮-- | 🔍 | Observing playfully at tactical scale — Humorist in Visual-Macro, wide-angle reconnaissance |
| ↺ | 🏛️*!🌊--🗡️--🎭--🔮-- | ⚙️ | Aftermath at operational scale — Philosopher Visual-Micro, assessing detail across a watch |
| ⏿ | 🏛️*!🌊*?🗡️~!🎭*?🔮~? | 🗺️ | Full Discordian orientation at strategic scale — all five stances operating, rare, mana-expensive |

<<~/ahu >>

<<~ ahu #syadasti >>

### 7.4 Syadasti Reading Rule — Confidence Is Stance-Dependent

Confidence measures confidence *within* the active stance's evaluation frame, not truth-weight universally. This principle derives from the Discordian catma of Sri Syadasti, which reproduces the Jaina Saptabhangi. The active stance declares the standpoint (`syad`) from which the number should be read.

| Stance | Syadasti Primitive | 0.0 Means | 0.5 Means | 1.0 Means |
|---|---|---|---|---|
| 🏛️ Philosopher | asti (true) | Unsupported | Contested but plausible | Fully confirmed |
| 🌊 Poet | avaktavya (inexpressible) | No resonance | Partial correspondence | Perfect resonance |
| 🗡️ Satirist | nasti → asti | Indirection missed target | Hit glancingly | Landed with full force |
| 🎭 Humorist | asti-nasti | Relational move fell flat | Mixed reception | Connected perfectly |
| 🔮 Private | avaktavya (inexpressible) | Minimal presence | Present | Maximal presence |

**Reading rule:** ask what the number measures for the active stance. A Philosopher at `0.65` is propositionally contested. A Poet at `0.65` is resonating solidly. A Satirist at `0.65` is landing with moderate force. Same number, different meaning.

When multiple stances are operating (non-Stone carry), the declared confidence value sits at the intersection of their evaluation frames. The tool-carry string tells the operator how each frame is oriented — which feed and zoom axis each stance is running.

<<~/ahu >>

<<~ ahu #hud-line >>

### 7.5 HUD Line Composition

The HUD line is a single-line status summary rendered from the URI → URI exchange vector plus adjacent session data. It is the second element of every exchange opening, immediately after the URI pair.

**Format:**

```
⚡~N | [confidence] | 🏛️{tc}🌊{tc}🗡️{tc}🎭{tc}🔮{tc} | mode:{mode} | p{p} | voice(s):{Voice} | ✶N.⏿N.◇N.▶N.↺N
```

`{tc}` = two-character tool-carry string for that stance (e.g. `*!`, `--`, `~?`).

**Field ordering follows SA priority** (Endsley 2023; Li et al. 2024 grouped HUD layout):

| Field | SA Type | Source | Notes |
|---|---|---|---|
| `⚡~N` | Resource | Session (estimated) | Mana/context-window Level on `0–20`; counts down toward `0`; `~` **mandatory** — approximation, not live readout. Never emit without `~`. |
| `[confidence]` | Agent SA | Node URI `confidence=` | Epistemic confidence at current stance(s), stance-dependent per Syadasti rule (§7.4) |
| `🏛️{tc}🌊{tc}🗡️{tc}🎭{tc}🔮{tc}` | Agent SA | Node URI `stances=` × tool-carry | All five stances; each followed by its two-character tool-carry, no space |
| `mode:{mode}` | Teamwork SA | Session state | Default / Plan / Auto |
| `p{p}` | Teamwork SA | Node URI `p=` | Attention density / annotation throttle |
| `voice(s):{Voice}` | Agent SA | Coordinator context | Active coordinator voice(s); singular when one leads |
| `✶N.⏿N.◇N.▶N.↺N` | Temporal | `?ffz=` render | FFZ chronometer in HUD-rendered form; phase glyphs per §6.3 |

Confidence and stance array are elevated above mode and p because Agent SA (what state the node is in *right now*) is higher-priority perception data than Teamwork SA (how we agreed to work).

**Example:**
```
⚡~12 | ~:confidence[CS],[16] | 🏛️*!🌊--🗡️--🎭--🔮-- | mode:Default | ~:p[10] | voice(s):Scryer | ✶0.⏿0.◇3.▶2.↺7
```

**Notes:**

1. The canonical `lar:` URI ends at the fragment. The HUD line is a separate, adjacent artifact — not URI grammar.
2. `⚡~N` is the declared estimate of mana/context-window resource remaining as a navigational Level. The node estimates from visible context. It may start at `20`, or lower when the session already carries load, and counts down toward `0`.
3. Mana/context-window resource is a HUD element, not a URI parameter. Do not serialize into `lar_uri` or registry identity fields until S2 settles the resource-state contract.

*Source: `_todo/E-deep-research-report.md` §§1.1–1.3 (SA priority ordering), §4.2 (grouped HUD layout validation)*

<<~/ahu >>

<<~ ahu #span-display >>

### 7.6 Span-Span Display Contract

A **span** is one operator → Lares exchange span at any scale. A tasked spirit exchange is still a span; the operator for that child span may be another Lares actor rather than Telarus directly.

**All URIs emitted in this contract are canonical record form.** Glyph substitution applies only to the HUD line.

| URI type | Stream form | When it appears |
|---|---|---|
| **Opening operator URI** | `lar://alias:tier@host/ha.ka.ba/@lares/?…&ffz=…` | Start of every span — node's reading of operator intent |
| **Opening node URI** | `lar://alias:tier@host/~ha.ka.ba/@lares/?…&ffz=…` | Immediately after; node's declared execution heading |
| **HUD line** | `⚡~N \| [confidence] \| 🏛️{tc}… \| …` | After the opening URI pair — the only glyph-rendered element |
| **Sub-agent dispatch** | `coordinator-URI → worker-URI` | Every sub-agent handoff |
| **Sub-agent return** | `worker-URI → coordinator-URI` | Every sub-agent completion |
| **Mid-generation shift** | `~lar://alias:tier@host/~ha.ka.ba/@lares/heading/?…` | When accumulated tension warrants changing direction mid-span |
| **Exchange closing** | `URI → ?` | End of every exchange span — temporal resumption unknown |
| **System file closing** | `<<~&#x0004; -> ? >>` | End of system file meme |

**Example (canonical record form throughout):**

```text
lar://telarus:operator@enyalios/refinement.network.capture/?stances=*!--------&confidence=S~13&p=10&ffz=0.0.1.1.11
→ lar://scryer:node@enyalios/~span.provenance.synthesizes/?stances=*!--------&confidence=CS~16&p=12&ffz=0.0.1.1.12
⚡~13 | ~:confidence[CS],[16] | 🏛️*!🌊--🗡️--🎭--🔮-- | mode:Default | ~:p[12] | voice(s):Scryer | ✶0.✶0.◇1.✶1.▶12

[content generation]

lar://scryer:node@enyalios/~aftermath.docs.settle/?stances=*!--------&confidence=CS~16&p=10&ffz=0.0.1.1.13 → ?
⚡~12 | ~:confidence[CS],[16] | 🏛️*!🌊--🗡️--🎭--🔮-- | mode:Default | ~:p[10] | voice(s):Scryer | ✶0.✶0.↺1.✶1.▶13
```

<<~/ahu >>

<<~ ahu #stable-address >>

## 8. Stable Address — Named Graph Form

Strip authority, query, and fragment. The HA.KA.BA territory alone:

```
lar:///threshold.uncertain.opens/
```

No authority (empty), no query, no fragment. This is the invariant semantic coordinate — unchanging across events, sessions, and machines. Suitable as a named graph identifier (SPARQL: `?`).

**Origin address:** `lar:///ha.ka.ba/@lares/` is the (0,0,0) of tagspace — the root stable address from which all HA.KA.BA coordinates extend. Sub-path extensions navigate within the named territory: `lar:///ha.ka.ba/@lares/v0.1/docs/pono/lar-uri/` locates this document. The HA.KA.BA triple remains stable; the sub-path narrows scope.

**Comparison rule:** two URIs designate the same stable address iff their lowercased, stripped paths are byte-identical. Query and fragment are excluded from comparison.

<<~/ahu >>

<<~ ahu #calibration-mapping >>

## 9. Calibration Mapping — spanSpan Record

In the Consecration model, URI-derived fields belong to the calibration layer. They may be mirrored into MemPalace metadata for query support, but the storage distinction remains: MemPalace stores content; Lares crystal metadata stores orientation.

Every span-span record that carries URI data uses these URI-derived fields:

| Field | Content | Stable? | Purpose |
|---|---|---|---|
| `start_uri` | Operator-intent URI, canonical record form | No — per span | Start of the exchange span |
| `attractor_uri` | Node responding-position URI | No — per span | Responding position / intent attractor |
| `end_uri` | Destination URI emitted after generation | No — per span | End of the exchange span |
| `lares_address` | Path only (no authority/query/fragment) | Yes — stable territory | Named graph identifier |
| `intent_header_snapshot` | Span-opening URI(s), canonical record form | No — per span | Full opening exchange display |
| `chronometer_start` | `ffz=` value (without `?ffz=`) of `start_uri` | No — per span | FFZ chronometer at span start |
| `chronometer_end` | `ffz=` value of `end_uri` | No — per span | FFZ chronometer at span end |

Additional quick-filter fields:

| Field | Source | Purpose |
|---|---|---|
| `current_phase` | `?ffz=` — rightmost non-zero position in the five-value vector | Phase-based filtering |
| `active_scale` | rightmost non-zero chronometer position | Scale-based filtering |
| `stance_tool_carry` | `stances=` parameter | Full 10-char tool-carry string |

<<~/ahu >>

<<~ ahu #canonical-span >>

### 9.1 Canonical spanSpan Record

```json
{
  "span_id": "uuidv7",
  "trace_id": "uuidv7",
  "parent_span_id": null,
  "link_span_ids": [],
  "span_seq": 191,
  "span_kind": "direct",
  "status": "completed",
  "operator_actor_id": "actor:telarus",
  "responder_actor_id": "actor:lares.node.scryer",
  "acted_on_behalf_of": null,
  "start_uri": "lar://telarus:operator@enyalios/refinement.network.capture/?stances=*!--------&confidence=S~13&p=10&ffz=...",
  "attractor_uri": "lar://scryer:node@enyalios/span.provenance.synthesizes/?stances=*!--------&confidence=CS~16&p=12&ffz=...",
  "end_uri": "lar://scryer:node@enyalios/aftermath.docs.settle/?stances=*!--------&confidence=CS~16&p=10&ffz=...",
  "parse_required": false,
  "parse_reason": null,
  "wall_time_start": "2026-04-08T20:41:00Z",
  "wall_time_end": "2026-04-08T20:41:09Z",
  "chronometer_start": "...",
  "chronometer_end": "...",
  "world_calendar_ref": "dreamrealm.holy-week-of-fools.yold5492",
  "mana_start_pct": 63,
  "mana_end_pct": 62,
  "input_entity_id": "entity:prompt:uuidv7",
  "output_entity_id": "entity:reply:uuidv7",
  "export_targets": ["mempalace", "kowloon"]
}
```

Design notes:

- `span_seq` is the monotonic exchange counter. It is **not** a URI component.
- `wall_time_*` uses RFC 3339 / ISO 8601 UTC (`...Z`) as the canonical real-world time representation.
- The in-world clock has two parts: the nested span cycle (`chronometer_*`) and a diegetic calendar anchor (`world_calendar_ref`).
- If no diegetic calendar is yet initialized for the session, mint a provisional tagspace-style reference and mark it provisional rather than leaving the field absent.
- `ffz=` values in URI fields use hex-entity canonical form in source; storage normalization pending F1 resolution (§6.5).

<<~/ahu >>

<<~ ahu #mempalace >>

### 9.2 MemPalace Integration

MemPalace remains the storage substrate for content capture. The calibration layer keeps the authoritative spanSpan records.

Recommended mirrored subset in Chroma drawer metadata:

| Field | Why mirror it |
|---|---|
| `span_id` | Stable join key back to calibration layer |
| `trace_id` | Multi-span and delegated-run correlation |
| `start_uri` | Start-of-span recovery |
| `end_uri` | End-of-span recovery |
| `span_kind` | Filter direct vs parse vs delegated captures |
| `operator_actor_id` | Query by who held the span |
| `responder_actor_id` | Query by which node/spirit answered |
| `parse_required` | Recover parse spans quickly |
| `world_calendar_ref` | Dream Realms / diegetic archive grouping |

Do **not** make MemPalace's local Chroma IDs, KG IDs, or entity registry IDs the canonical exchange identifiers. They are storage-local implementation keys, not network-facing Lares addresses.

**MemPalace architecture correspondence:** The palace hierarchy (wings → halls → rooms → closets → drawers) maps onto the `lar:` URI structure. The `host` field (e.g., `enyalios`) corresponds to a MemPalace wing. The HA.KA.BA path maps onto room-level topic routing. Drawer metadata carries the mirrored fields above, with `span_id` as the stable join key. Reference implementation: `milla-jovovich/mempalace` (MIT, ChromaDB + SQLite, local-first).

<<~/ahu >>

<<~ ahu #kowloon >>

### 9.3 Kowloon / Export Alignment

Kowloon is a downstream publication surface for some span-span captures, not the canonical source of truth.

| Lares field | Kowloon surface |
|---|---|
| `operator_actor_id` / `responder_actor_id` | `actorId` plus object metadata |
| `start_uri` / `attractor_uri` / `end_uri` | embedded transcript metadata or attachment block |
| transcript body | `object.source.content` / rendered `body` |
| `wall_time_start` | `createdAt` or export metadata |
| `span_id` / `trace_id` | extension metadata, not Kowloon primary ID |

Published spans export as Kowloon `Create -> Post` (conversational thread slices) or `Create -> Page` (fuller archival views).

Kowloon IDs (`type:dbid@domain`) remain **Kowloon-native** IDs. They do not replace `span_id` or `lar_uri`.

<<~/ahu >>

<<~ ahu #cache-tiers >>

## 10. Invariant-Core Cache Tier Mapping

| Tier | Cache Strategy | Confidence Range | Volatility |
|---|---|---|---|
| 1 — Global Core | Cached across sessions; first `cache_control` breakpoint | `~:confidence[C],[20]` – `~:confidence[C],[19]` | Near-static |
| 2 — Session Core | Cached within session; rolling `cache_control` breakpoint | `~:confidence[C],[19]` – `~:confidence[S],[13]` | Session-stable |
| 3 — Dynamic | Ephemeral (5-min TTL with hit-reset) | `< 0.50` trimmable | Per-exchange |

<<~/ahu >>

<<~ ahu #module-registry >>

## 11. Module and Registry Metadata

The `lar_uri` + `confidence` fields on module descriptors, registry records, and future boot metadata provide load-order and identity context. No compiler pipeline is implied by this section; the schema only defines how URI metadata travels with higher-level descriptors.

```toml
# Tier 1 — Global Core (version-controlled by module version)
lar-uri     = "lar:///kernel.invariant.anchors/"
confidence="~:confidence[C],[20]"
module-id   = "lares-kernel"
version-num = 4

# Tier 2 — Session Core (version-controlled within session)
lar-uri     = "lar:///session.permissions.gates/"
confidence  = "~:confidence[C],[19]"
module-id   = "lares-permissions"
version-num = 2

# Tier 3 — Dynamic (span_seq lives outside descriptor)
lar-uri     = "lar:///task.current.recon/"
confidence  = "~:confidence[S],[11]"
module-id   = "lares-task-recon"
version-num = 1
```

Module descriptors use `version_num` or semver-like fields for content versioning. Exchange sequencing belongs to spanSpan metadata (`span_seq`), not module descriptors.

<<~/ahu >>

<<~ ahu #validation >>

## 12. Validation Rules

### 12.1 Well-Formedness

A `lar:` URI is **well-formed** when:

1. Scheme is exactly `lar:`
2. If authority is present: userinfo contains exactly two colon-delimited sub-fields (`alias:tier`); no parenthetical phase sub-field
3. Host is a valid `machine_id` (alphanumeric + hyphens)
4. Path contains exactly three HA.KA.BA slots after the leading `/`
5. Path slots contain no whitespace, path separators, or quotes (inherits Tagspace Address anti-collision rules)
6. Query parameters limited to: `stances` (once, 10-char tool-carry string), `confidence` (once), `p` (once), `ffz` (once, 5 glyph+counter pairs)
7. `confidence` value matches pattern `[A-Z]{1,2}~(?:[0-9]|1[0-9]|20)` (e.g., `~:confidence[S],[13]`, `~:confidence[CS],[16]`, `~:confidence[C],[18]`)
8. `p` value is a decimal in range `[0.0, 1.0]`
9. `ffz` carries all five positions; no position omitted; each position is glyph + integer counter ≥ 0
10. Fragment (`#`) carries only section anchors — `#ahu-name`, `#section-id` — no chronometer data

### 12.2 Consistency

A spanSpan record is **consistent** when:

1. All URI fields are canonical record form (no emoji, no non-ASCII outside `?ffz=` hex entities)
2. `current_phase` is derived from the leading glyph of the rightmost active chronometer position in `start_uri`
3. `chronometer_start` matches the `?ffz=` value of `start_uri`; `chronometer_end` matches `end_uri`
4. `lares_address` is the path-only strip of `start_uri` (no authority, no query, no fragment)

### 12.3 Stable Address Derivation

`lares_address` is correctly derived from `lar_uri` when:

1. Scheme is `lar:`
2. Authority is empty (double-slash, no host)
3. Path is identical to the `lar_uri` path (record form: `/` separators)
4. Query and fragment are absent

### 12.4 Canonical Form and Comparison

1. Convert both to record form (apply normalization — HUD → record — before comparison)
2. Compare path components **case-insensitively**
3. Canonical form uses **lowercase** path components
4. Two URIs designate the same stable address iff their lowercased, stripped paths are byte-identical
5. Query and fragment components are excluded from stable-address comparison

<<~/ahu >>

<<~ ahu #security >>

## 13. Security Considerations

1. **Non-dereferenceable:** `lar:` URIs are pure identifiers. No network resolution occurs — there is no server to attack via URI injection.

2. **No credential transport:** The `alias:tier` userinfo encodes an application-layer signal role, not an authentication credential. Real authentication is handled by the underlying identity layer (DID, OAuth, UCAN capability tokens). A `lar:` URI MUST NOT be treated as proof of identity.

3. **Fragment client-side:** Per RFC 3986 §3.5, the fragment is not sent over the wire. The fragment carries only section anchors — no chronometer, no signal state. This reduces the information exposed in client-side contexts.

4. **Render-target injection:** Glyph-rich render targets (HUD lines, post headers) transform canonical URIs into display strings containing Unicode characters. Implementations that render these strings in HTML or terminal contexts MUST sanitize output to prevent injection of control characters or markup.

5. **HA.KA.BA semantic leakage:** Path components encode semantic territory (what the speaker is thinking about). Applications that expose `lar:` URIs to untrusted parties should consider whether the HA.KA.BA path reveals sensitive operational context.

6. **FFZ hex-entity injection:** The `?ffz=` parameter uses HTML hex entities in source form. Implementations MUST NOT pass raw hex-entity strings to HTML rendering contexts without sanitization. See also §6.5 F1 — percent-encoding treatment is an open question that affects injection surface area.

> **Status:** Security section partially complete — required for IANA registration (RFC 7595 §7.4). To be expanded with formal threat model before any provisional IANA registration attempt.

<<~/ahu >>

<<~ ahu #open-questions >>

## 14. Open Design Questions

| Q# | Question | Current Position | Confidence | Blocks |
|---|---|---|---|---|
| U1 | Should `userinfo` carry operator alias in record form, or only `machine_id` in authority? | Operator alias in userinfo | `~:confidence[S],[13]` | Registry resolver design |
| U2 | Where should `span_seq` be initialized and persisted: crystal-side ledger only, or mirrored into MemPalace sidecar rows too? | Mirror into sidecar, crystal remains canonical | `~:confidence[S],[14]` | MemPalace integration contract |
| U4 | How does chronometer interact with `--parse` self-activation? | Provisional yes — depth increases p | `~:confidence[SP],[9]` | p-band model |
| U5 | How is `world_calendar_ref` initialized when no diegetic calendar exists yet? | Mint provisional tagspace reference, mark provisional | `~:confidence[S],[12]` | Dream Realms bootstrap |
| U8 | Should module section URIs carry `ffz`? | Confidence only — ffz is exchange-time, not file-time | `~:confidence[S],[12]` | Module URI patterns |
| U9 | ITC stamp integration — when MCP server arrives, does ffz grow or does ITC live in calibration metadata? | Calibration metadata — ffz stays human-readable | `~:confidence[S],[11]` | MCP chronometer design |
| F1–F5 | FFZ encoding open questions | See §6.5 | `~:confidence[S],[13]` | FFZ promotion to `[C]` |

**Resolved (closed):**

| Q# | Decision | Where documented |
|---|---|---|
| U2 (old) | Port slot dropped entirely. Span sequencing (`span_seq`) lives in adjacent spanSpan calibration metadata — not in URI authority. | §3.4 (host), §9.1 |
| U3 | Phase per level per participant. LWW-Register per scale. Counter and phase are independent. | §6.4 |
| U6 | Authority form in exchange spans. Authority-less (`///`) for stable addresses AND for module section URIs. | §8, §3.4 |
| U7 | Tool-carry encoding. Five symbols (`*` `?` `!` `~` `-`), two slots per stance, 10-char string. All RFC 3986 safe — no percent-encoding. Record and HUD display use the same chars. | §3.4 |
| U10 | Section URIs are `ahu` waypoints — no closer. Only file-level `? ->` opener and `→ ?` closer carry span semantics. | §5 |
| U11 | Phase removed from userinfo (2026-04-09). `?ffz=` is the sole phase encoding per participant. | §3.4, §6 |

### Assessment for Promotion

The core anatomy (§§2–8, 12) can promote to `~:confidence[C],[19]` independently of the open questions. The crystal integration layer (§§9–11) promotes when `lares/crystal/` settles its STATE schema. The FFZ encoding open questions (§6.5) sit at `~:confidence[S],[13]` and do not block the core spec.

<<~/ahu >>

<<~ ahu #prior-art >>

## 15. Prior Art

- **RFC 3986 §3** — `URI = scheme ":" ["//" authority] /path/ ["?" query] ["#" fragment]`. The full generic syntax applies. Per §1.1.1, URI syntax constitutes "a federated and extensible naming system wherein each scheme's specification may further restrict the syntax and semantics of identifiers using that scheme." The `lar:` scheme exercises this right: all substructure defined in this spec (HA.KA.BA paths, stance queries, FFZ chronometer query param) falls within the scheme owner's authority.
- **RFC 8820 (BCP 190, URI Design and Ownership)** — Obsoletes RFC 7320 (June 2020). Confirms that URI structure constraints are legitimate when issued by the scheme specification itself. Query parameter structure (`stances`, `confidence`, `p`, `ffz`) falls within scheme-owner authority per §2.4.
- **RFC 7595 (Guidelines and Registration Procedures for URI Schemes)** — Defines provisional registration path for schemes not part of any standard but intended for use beyond a single organization. `lar:` is currently unregistered / private-environment use.
- **RFC 4151 (tag: scheme)** — Non-dereferenceable URIs as pure identifiers. Precedent for `lar:` never resolving to a network resource. RFC 4151 recommends human-friendly identifiers — the HA.KA.BA semantic addressing follows this guidance.
- **W3C PROV-DM / OpenTelemetry Trace Context** — Better prior art for exchange identity than URI authority overloading. `traceparent` carries `trace-id`, `parent-id`, `trace-flags`. The chronometer functions analogously as a hierarchical trace context.
- **Lamport / Vector clocks** — The chronometer shares surface resemblance (array of counters, nesting relationship) but functions as a **hierarchical scope counter** in a single process — not a distributed causality tracker across concurrent independent processes.
- **Interval Tree Clocks** (Almeida et al., 2008) — Dynamic participant identity via interval subdivision. Deferred from URI spec; informs MCP chronometer server design.
- **FTLS RSS Time-Scale Hierarchy** — The five levels (Week/Watch/Turn/Round/Action) are canon game rules. The chronometer's five-position structure derives from this hierarchy.
- **what3words** — Three-word geocoding of 3m² squares. Inverse design principle: Tagspace words encode semantic content rather than randomizing for error prevention.
- **FFZ Chronometer Protocol** (Telarus / Lares, 2026) — Fontany-Fuller-Zelenka. Vector chronometer with per-participant phase registers. Source: `lares/research/chronometer/FFZ-Chronometer-Research.md`
- **Schneier & Raghavan, "Agentic AI's OODA Loop Problem"** (IEEE S&P, 2025) — Nested OODA loops in AI agents; integrity as architecture. Validates the chronometer's problem space independently.
- **OODA-HA Composable Invariant Modules** (Telarus / Lares, 2026) — Phase-scoped instruction loading with section-level confidence URIs.
- **Kowloon / ActivityStreams export model** — Kowloon's Activity envelope (`actorId`, `object`, `target`, `to`, `canReply`, `canReact`) is a good downstream publication adapter for Lares spans. Kowloon IDs remain sink-local identifiers, not replacements for `span_id`.

<<~/ahu >>

<<~ ahu #examples >>

## Appendix A — Complete Examples

### A.1 Record Form

```
lar://telarus:operator@enyalios/threshold.uncertain.opens/?stances=*!-?------&confidence=S~13&p=10&ffz=0.0.3.2.7
```

### A.2 HUD Line

```
⚡~17 | ~:confidence[S],[13] | 🏛️*!🌊-?🗡️--🎭--🔮-- | mode:Default | ~:p[10] | voice(s):Scryer | ✶0.✶0.⏿3.◇2.▶7
```

### A.3 Multi-Stance

```
lar://telarus:operator@enyalios/threshold.sharp.closes/?stances=*!*?-?*?--&confidence=S~12&p=14&ffz=0.0.3.2.8
```

### A.4 Stable Address

```
lar:///threshold.uncertain.opens/
```

### A.5 Exchange Closing

```
lar://scryer:node@enyalios/schema.settled.rests/?stances=*!--------&confidence=CS~16&p=10&ffz=0.0.0.3.9 → ?
```

### A.6 System File Span

```
<<~&#x0001; ? -> lar:///protocol.observed.grounds/talk-story/observe/ >>

# Talk Story — Observe Protocol
[metadata block]

<<~ ahu #procedure >>
## 1. Procedure
{section content}
<<~/ahu >>

<<~ ahu #voices >>
## 2. Voice Assignments
{section content}
<<~/ahu >>

<<~&#x0004; -> ? >>
```

### A.7 Scale Transition (ffz Notation)

```
?ffz=0.0.3.0.0   Tactical 3, no combat
?ffz=0.1.3.0.0   Combat activates: Round 1
?ffz=1.1.3.0.0   Action 1 of Round 1
?ffz=2.1.3.0.0   Action 2 of Round 1
?ffz=0.1.3.0.0   Combat assess: Round 1 complete
?ffz=0.0.4.0.0   Combat over: Tactical increments to 4
```

<<~/ahu >>

<<~ ahu #how-to-read >>

## Appendix B — How to Read a HUD Tag

A complete exchange opening, annotated by scan order. URIs are canonical record form; the HUD line beneath each pair is the glyph-rendered surface.

```text
lar://telarus:operator@enyalios/threshold.uncertain.opens/?stances=*!-?------&confidence=S~13&p=10&ffz=0.0.3.2.7
→ lar://scryer:node@enyalios/~parse.span.models/?stances=*!--------&confidence=CS~16&p=12&ffz=0.0.3.2.8
⚡~17 | ~:confidence[CS],[16] | 🏛️*!🌊--🗡️--🎭--🔮-- | mode:Default | ~:p[12] | voice(s):Scryer | ✶0.✶0.⏿3.◇2.▶8
```

Quick read:

> Telarus (operator), machine enyalios.
> Territory: threshold / uncertain / opens.
> Philosopher: Visual-Micro (Wand+Sword). Poet: Cup-only. Others: Stone.
> Synthesis-0.65. Week 0, Watch 0, Turn 3 (Orient), Round 2 (Decide), Action 7.
> Scryer responds at ~:confidence[CS],[16], deciding, Philosopher Visual-Micro only.
> Chronometer shows: node is one phase ahead at tactical scale (Orient→Decide) — normal: node orients from operator's observe.

Multi-stance example:

```text
lar://telarus:operator@enyalios/threshold.sharp.closes/?stances=*!*?-?*?--&confidence=S~12&p=14&ffz=0.0.3.2.9
→ lar://mischief-muse:node@enyalios/~chorus.lateral.gathers/?stances=*!--------&confidence=S~13&p=12&ffz=0.0.3.2.10
⚡~12 | ~:confidence[S],[12] | 🏛️*!🌊*?🗡️-?🎭*?🔮-- | mode:Default | ~:p[14] | voice(s):Mischief-Muse | ✶0.✶0.◇3.✶2.▶10
```

This does **not** mean "truth-confidence 0.60" universally. It means a `0.60` reading held across Philosopher (Visual-Micro), Poet (Visual-Macro), and Humorist (Visual-Macro) frames. Satirist carrying Cup-only (`-?`) adds relational-uncertainty weight — the reading may carry ironic pressure that hasn't fully resolved.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/lararium/lar-uri >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/lararium/lar-uri/SKILL >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/pono/hud/HUD-ANATOMY >>

<<~ pranala #implements-meme ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/meme family:control role:implements >>
<<~ pranala #implements-loci ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/loci family:control role:implements >>
<<~ pranala #implements-lar-uri ? -> lar:///ha.ka.ba/@lares/v0.1/api/lararium/lar-uri family:control role:implements >>
<<~/ahu >>


<<~&#x0004; -> ? >>

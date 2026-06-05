<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/docs/pono/lar-uri >>
```toml iam
uri-path = "ha.ka.ba/@lares/v0.1/docs/pono/lar-uri"
file-path = "bags/@lares/v0.1/docs/pono/lar-uri.md"
type = "text/x-memetic-wikitext"
tagspace = "stable"
register = "Synthesis-Canon"
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

The `lar:` URI names WHERE a Lares node exchange sits — a shared navigational address. In live use the `aim` / `yield` vectors carry it as the turn's WHERE; the sigil panel beside it carries per-turn signal. In persistence it functions as a structured record string suitable for logs, validation, agent module, and registry metadata.

Each URI component carries a distinct, non-overlapping concern across three semantic layers:

1. **WHO** — authority (`alias:tier@host`) identifies speaker and machine host
2. **WHERE** — the HA.KA.BA address (path) locates semantic territory
3. **SECTION** — the fragment (`#`) carries section anchors only — `#ahu-name`, `#section-id`

Resource-state annotations such as the mana/context-window pool are HUD adjuncts, not core URI components. This value uses the shared `0–20` Level model as a navigational resource estimate. Span identity, wall-clock timestamps, and export-target metadata remain adjacent calibration fields rather than authority overloads.

The system has one **canonical encoding** and multiple named **render targets**:

- **Record form (canonical)** — RFC 3986-compliant, no emojis, no non-ASCII characters. This is the authoritative form for storage, transport, comparison, and strict parsing.
- **Render targets** — surface-specific projections of the canonical form. Each render target substitutes sigil glyphs and Unicode for keywords, abbreviates or expands fields, and may add HUD adjuncts not present in the canonical form. Render targets are not themselves canonical and are not stored as URIs.

Named render targets: `record:full` (identity projection of the canonical form), `hud:exchange-pair` (sigil-rich in-stream exchange boundary), `chat-log:post-header` (social-layer DreamDeck post header).

<<~/ahu >>

<<~ &#x0002; >>


<<~ ahu #exchange-flow >>

### 1.1 Exchange Flow — Order of Operations

At each exchange span, the turn opens with an `aim` vector and closes with a `yield` vector, the `hud` · `ward` panel riding beneath. The frame is **mandatory** on every substantive exchange.

**Step 1 — Read operator intent as a provisional WHERE-vector.**
Lares reads the operator's prompt as an implicit signal: semantic territory (HA.KA.BA) and the role it implies. The `~` prefix on the HA.KA.BA marks the node's interpretation as potentially inaccurate.

```
lar://telarus:operator@enyalios/~schema.gap.present/
```

**Step 2 — Lares adopts its own execution WHERE-vector.**
Before generating, Lares sets the role it adopts. The `~` prefix marks it execution-provisional: generations may diverge.

```
lar://lar:node@enyalios/~schema.flow.documented/
```

**Step 3 — Open the turn with the `aim` vector.**

```
<<~ aim lar:///operator.intent.reads -> lar:///lares.role.acts >>
```

> **Canonical URI Rule** — every `lar:` URI in the stream stays canonical ASCII record form, directly ingestible by MemPalace, crystal logs, and registry tools without a sigil-lookup step.

**Step 4 — Ride the panel.**
Beneath the `aim`: `<<~ hud Aperture(N) OODA-HA(N) >>` · `<<~ ward E-Prime >>`, plus the `syad` / `mu` lenses when summoned. The instruments carry per-turn signal; the URI carries WHERE only.

**Step 5 — Generate, then close.** OODA-HA phase markers (`->◇ ->▶ ->↺`) surface forward inline by band. The turn closes on `<<~ yield lar:///lares.what.landed -> ? >>` — `-> ?` marks unknown temporal resumption.

> **SA grounding:** the `aim` is prospective AI transparency — what the node *will* do, not what it did (Endsley 2023). The sigil panel externalizes the node's metacognitive state before generation begins, an externalized metacognitive scaffold (Ji-An et al., 2025; Wang et al., 2023). *Source: `_todo/E-deep-research-report.md` §§2.1, 3.2*

<<~/ahu >>

<<~ ahu #scheme-registration >>

## 2. Scheme Registration

| Property | Value |
|---|---|
| Scheme name | `lar` |
| Dereferenceability | Non-dereferenceable identifier (RFC 4151 precedent) |
| Resolution | Via `lares/registry/` resolver; never via network fetch |
| IANA status | Unregistered; internal use only |

> **Form and compliance:** The **record form** is the RFC 3986-compliant canonical form for transport, persistence, comparison, and strict parsing. The **HUD forms** are IRI-class instrument renderings (RFC 3987); they may contain emoji and Unicode glyphs not legal in RFC 3986 URIs without percent-encoding. RFC 3986 compliance is not claimed for HUD forms. Render targets define the sigil-to-glyph transforms per surface (`render-targets`).

The `lar:` scheme identifies semantic positions, signal states, and machine events within the Lares agent architecture. It does not resolve to a network resource. URI consumers (crystal replay tools, debug log parsers, registry resolvers) treat it as an opaque structured identifier parsed according to this specification.

<<~/ahu >>

<<~ ahu #uri-syntax >>

## 3. URI Syntax

### 3.1 Generic Form

```
lar://[authority]/ha.ka.ba/@lares/optional/path/[#anchor]
```

### 3.2 Expanded Form

**Full form (with authority):**

```
lar://alias:tier@host/ha.ka.ba/@lares/
```


**Authority-less form** (no `user@host` segment — territory or resource reference without a named speaker):

```
lar:///ha.ka.ba/@lares/optional/path/[#section-anchor]
```

Three slashes: scheme + `//` (empty authority) + path beginning with `/`. Use this form for stable named graph addresses, HA.KA.BA references, and any URI where the speaker identity is not the point.

**Path notation rule** — HA.KA.BA paths use **dot notation** for the three mandatory slots. The leading and trailing `/` is retained:

```
/ha.ka.ba/@lares/{optional/sub/path}[#anchor]
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
| 6 | **`#fragment`** | Section anchor | Named section within this meme | `#ahu-name`, `#section-id` |

> **Layout validation `Canon 18/20`:** The WHERE → HOW → SECTION ordering (path → query → fragment) places the most semantically stable, least volatile information first. Grouped, goal-oriented layout confirmed by Li et al. (2024) automotive HUD research: grouped information layouts produce superior cognitive performance, lower workload, and better eye movement patterns compared to disordered layouts. *Source: `_todo/E-deep-research-report.md` §4.2*

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
| `hud:exchange-pair` | `<<~ aim … >>` + `hud`·`ward` panel beneath | **Yes — canonical ASCII URI**; only the sigil panel uses glyphs | Every exchange-span boundary (mandatory) |
| `record:full` | `lar://alias:tier@host/ha.ka.ba/@lares/` | Yes — identity projection | Storage, crystal serialization, registry |

**Stance tool-carry modifiers** in HUD render targets attach directly to the preceding stance emoji as a two-character pair (no space):

| Symbol | Tool | Element | Cognitive Pull |
|---|---|---|---|
| `*` | Wand | Fire / Visual | Ignition, external feed, track |
| `?` | Cup | Water / Macro | Sympathy, zoom out, relation |
| `!` | Sword | Air / Micro | Discernment, zoom in, detail |
| `~` | Pentacle | Earth / Hidden | Ground, internal feed, body |
| `-` | Stone | Orichalcum / Neutral | Empty hand, centered |

The `syad` lens carries the invoked standpoints; an optional `:` binds a tool to a standpoint (`🏛️:*!`). See `the-syad-perspectives` / `the-four-tools`.

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

**fragment** (`#section-anchor`) — Named section within this meme: `#ahu-name`, `#section-id`, `#pranala-name`. The fragment carries section anchors only.

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
lar://telarus:operator@enyalios/~uri.schema.question/
```
Reading provisional: "I believe you're orienting toward URI schema territory — I may have misread your stance or HA.KA.BA."

```
lar://scryer:node@enyalios/~s0.gap.logged/
```
Execution provisional: "I intend to log this S0 gap — execution may find a different path or territory."

```
lar://scryer:node@enyalios/~s0.schema.updated/
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
<<~ &#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/docs/pono/lar-uri >>
```

The meme opener carries the file-level confidence and resolution parameter. Section-level confidence rides on ahu markers.

### 5.2 `→ ?` — Meme Span Closer

Signals unknown temporal resumption. The `?` marks a causal gap: between this sigil and the next interaction with the meme, no participant's chronometer advances within the shared frame.

`→ ?` does not signal uncertainty about the meme's content — that is what `confidence` and register carry. It signals uncertainty about the meme's continuity in time.

```
<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
```

In exchange streams, the closer appends to the closing URI inline:

```
lar://scryer:node@enyalios/schema.settled.rests/ → ?
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

<<~ ahu #cache-tiers >>

## 10. Invariant-Core Cache Tier Mapping

| Tier | Cache Strategy | Confidence Range | Volatility |
|---|---|---|---|
| 1 — Global Core | Cached across sessions; first `cache_control` breakpoint | `Canon 20/20` – `Canon 19/20` | Near-static |
| 2 — Session Core | Cached within session; rolling `cache_control` breakpoint | `Canon 19/20` – `Synthesis 13/20` | Session-stable |
| 3 — Dynamic | Ephemeral (5-min TTL with hit-reset) | `< 0.50` trimmable | Per-exchange |

<<~/ahu >>

<<~ ahu #module-registry >>

## 11. Module and Registry Metadata

The `lar_uri` + `confidence` fields on module descriptors, registry records, and future boot metadata provide load-order and identity context. No compiler pipeline is implied by this section; the schema only defines how URI metadata travels with higher-level descriptors.

```toml
# Tier 1 — Global Core (version-controlled by module version)
lar-uri     = "lar:///kernel.invariant.anchors/"
confidence="Canon 20/20"
module-id   = "lares-kernel"
version-num = 4

# Tier 2 — Session Core (version-controlled within session)
lar-uri     = "lar:///session.permissions.gates/"
confidence  = "Canon 19/20"
module-id   = "lares-permissions"
version-num = 2

# Tier 3 — Dynamic (span_seq lives outside descriptor)
lar-uri     = "lar:///task.current.recon/"
confidence  = "Synthesis 11/20"
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
7. `confidence` value matches pattern `[A-Z]{1,2}~(?:[0-9]|1[0-9]|20)` (e.g., `Synthesis 13/20`, `Synthesis-Canon 16/20`, `Canon 18/20`)
8. `p` value is a decimal in range `[0.0, 1.0]`
10. Fragment (`#`) carries only section anchors — `#ahu-name`, `#section-id` — no chronometer data

### 12.2 Consistency

A spanSpan record is **consistent** when:

1. All URI fields are canonical ASCII record form (no emoji, no non-ASCII)
2. `lares_address` is the path-only strip of `start_uri` (no authority, no query, no fragment)

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

4. **Render-target injection:** Glyph-rich render targets (sigil panels, post headers) transform canonical URIs into display strings containing Unicode characters. Implementations that render these strings in HTML or terminal contexts MUST sanitize output to prevent injection of control characters or markup.

5. **HA.KA.BA semantic leakage:** Path components encode semantic territory (what the speaker is thinking about). Applications that expose `lar:` URIs to untrusted parties should consider whether the HA.KA.BA path reveals sensitive operational context.

> **Status:** Security section partially complete — required for IANA registration (RFC 7595 §7.4). To be expanded with formal threat model before any provisional IANA registration attempt.

<<~/ahu >>

<<~ ahu #prior-art >>

## 15. Prior Art

- **RFC 3986 §3** — `URI = scheme ":" ["//" authority] /path/ ["?" query] ["#" fragment]`. The full generic syntax applies. Per §1.1.1, URI syntax constitutes "a federated and extensible naming system wherein each scheme's specification may further restrict the syntax and semantics of identifiers using that scheme." The `lar:` scheme exercises this right: all substructure defined in this spec (HA.KA.BA paths and the WHERE-only address structure) falls within the scheme owner's authority.
- **RFC 8820 (BCP 190, URI Design and Ownership)** — Obsoletes RFC 7320 (June 2020). Confirms that URI structure constraints are legitimate when issued by the scheme specification itself. Path and address structure falls within scheme-owner authority per §2.4.
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

<<~ ahu #procedure >>
## 1. Procedure
{section content}
<<~/ahu >>

<<~ ahu #voices >>
## 2. Voice Assignments
{section content}
<<~/ahu >>

<<~ &#x0004; -> ? >>
```

<<~/ahu >>

<<~ ahu #how-to-read >>

## Appendix B — How to Read an Exchange Opening

A complete exchange opening, annotated by scan order. The `aim` URI carries WHERE; the sigil panel beside it carries the rest.

```text
<<~ aim lar:///operator.threshold.opens -> lar:///scryer.parse.models >>
<<~ hud Aperture(10) OODA-HA(7) >>
<<~ ward E-Prime >>
<<~ syad 🏛️:*! >>
```

Quick read:

> Operator opens at territory threshold / uncertain / opens; Scryer adopts the parse-span role.
> `Aperture(10)` — paragraph grain; `OODA-HA(7)` shows the node a phase ahead, orienting from the operator's observe.
> `syad 🏛️:*!` — Philosopher in Visual-Micro; `confidence` rides before each grounded claim.

The standpoint reads within its own frame (Syadasti rule): a Philosopher `confidence` rates propositional support, a Poet's rates resonance — never one universal truth-scale. A bare `<<~ syad 🏛️ 🌊 🎭 >>` names which frames a claim spans without flattening them.

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


<<~ &#x0004; -> ? >>

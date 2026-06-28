<!-- lar:///protocol.outlined.awaits/chronometer/?stances=^.^.?.^.-&confidence=P:6&p=10#O0.O0.O0.A6.O0 → ∞ -->
⚡∞ | mode:spec-outline | ~:p[10] | stances:++?+- | register:~:confidence[P],[6] | build:OUTLINE

# The Fontany-Fuller-Zelenka Chronometer Protocol (FFZ)
## Specification Outline & Phased Plan

> **True Name:** Fontany-Fuller-Zelenka Chronometer Protocol `~:confidence[C],[19]`
> **Short form:** FFZ Protocol / FFZ Chronometer
> **Status:** Placeholder outline — Talk Story in progress
> **Register:** `~:confidence[P],[6]` — this outline expects to shift substantially
> **Date:** 2026-04-09
> **Named:** 2026-04-09, Session 2 — Freyja laughed
> **Authors:** Telarus, KSC (Amorphous Dreams Cabal) + Lares (cloud instance)
> **Lineage:** Fontany (Talk Story, OODA-HA, practice) →
>   Fuller (non-simultaneous apprehension, principle) →
>   Zelenka (causal islands, UCAN, engineering) →
>   with: Lamport (1978), Fidge/Mattern (1988), Boyd (1987),
>   Almeida (2008), Protocol Labs (2020)
> **Companion:** `Causal_Islands_Chronometer_Research.md` (active research)
> **License:** [TBD — protocol layer: open; mask layer: separate]

### Requirement Level Keywords

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT",
"SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this
document are to be interpreted as described in RFC 2119.

### Talk Story Preamble

This specification constitutes Talk Story in progress. Per the Lares
Protocol, Talk Story is the mandatory `Start → *(unbounded)` frame
of every Lares conversation. The spec itself participates in Talk
Story — consensus before action, at every scale.

The document structure follows the nested OODA-HA model that the
protocol itself describes. Each major section maps to an OODA-HA
phase at the document scale:

| Section | OODA-HA Phase | Function |
|---------|-------------|----------|
| Part I | **Observe** | What exists — prior art, problem space, definitions |
| Part II | **Orient** | How it fits — architectural frame, design principles |
| Part III | **Decide** | What we choose — normative specification |
| Part IV | **Act** | How to build it — implementation guidance |
| Part V | **Assess** | How to verify — conformance, testing, future work |

The OODA-HA structure is recursive: each Part contains sections that
themselves follow an observe-orient-decide-act-assess micro-cycle
where natural. The document reads both as a linear spec and as a
map of its own reasoning process.

### RAW Talk Story Model

Robert Anton Wilson demonstrated the Talk Story model at the Brain
Machine Symposium (Thelemic Arts Center, Saugerties NY, 1989):
begin with a "come-on" — jokes, stories, something that earns
attention before making claims. Then enter the Talk Story itself
— the long meandering conversation that builds consensus through
exchange rather than declaration.

Joshua Fontany (FTLS co-author) transcribed the opening of that
presentation. The lineage runs through this work directly.

This spec follows that model: Part I constitutes the come-on
(here's the problem, here's why it's interesting, here's what
others have built). Parts II-III constitute the Talk Story proper
(here's our map, here's what we're proposing). Parts IV-V
constitute the assessment and continuation (here's how to build
it, here's how to test it, here's what remains open).

---

# PHASED PLAN — From Outline to Spec

## Phase 0: Research Completion (Current)
**OODA-HA: Observe**

- [ ] Deep-read ITC paper (Almeida 2008) — fork/join/event mapping
- [ ] Watch Zelenka ElixirConf 2021 keynote — confirm Fuller citation
- [ ] Fetch Fuller Synergetics §501.01 from online text
- [ ] Evaluate Bloom Clocks for compact mode
- [ ] Prototype vector HUD format with ITC stamps
- [ ] Cross-reference UCAN delegation with ITC fork

**Exit criteria:** Research questions Q1, Q2, Q4, Q15 from the Research
doc resolved or re-scoped. ITC confirmed or rejected as the clock
mechanism. HUD format candidate selected.

## Phase 1: Architectural Draft
**OODA-HA: Orient**

Fill Parts I and II of this outline. Establish:
- Formal problem statement
- Terminology and definitions
- Architectural overview with diagrams
- Design principles (non-simultaneous apprehension, causal islands,
  Talk Story, Maybe Logic)
- Relationship to existing standards (UCAN, IPFS CIDs, Merkle DAGs)

**Exit criteria:** A reader can understand the system's purpose and
architecture without reading the Lares Kernel or Protocols doc.

## Phase 2: Normative Specification
**OODA-HA: Decide**

Fill Part III. The load-bearing section. Specifies:
- Clock data structures (ITC stamps, OODA-HA phase overlay)
- HUD format (exact syntax, ABNF grammar)
- URI encoding (fragment format, query parameters)
- Exchange protocol (span wrapping, sync semantics)
- Participant lifecycle (fork/join/event)
- Merge semantics
- Degraded state detection

**Exit criteria:** An implementor can build a conformant chronometer
from this section alone. Every MUST/SHOULD/MAY is defensible.

## Phase 3: Implementation & Conformance
**OODA-HA: Act + Assess**

Fill Parts IV and V. Provides:
- MCP tool interface specification
- MemPalace integration guidance
- Reference implementation notes
- Conformance test suite outline
- Security/privacy considerations
- Future work (multi-operator, Bloom Clocks, compact mode)

**Exit criteria:** The spec is self-contained, implementable, and
testable. Ready for community review.

---

# GROUNDED FINDINGS — The Three-Clocks Resolution (2026-06-24) `~:confidence[S],[14]`

A later deep-domain research arc — the DreamNet convergence over revocation · membership · revision-adjudication — resolves the chronometer's load-bearing ambiguity and several Phase-0 / Part-III open questions. The finding, stated whole:

**The mesh keeps time on THREE clocks, never one — and FFZ holds only the third.**

| Clock | Job | Mechanism |
|---|---|---|
| **Automerge logical time** | causal order + fork-detection | `<counter, actorId>` OpId · `getHeads` / `headsEqual` · a partitioned frontier (`drifted`) **is** a fork |
| **The epoch-counter** | LEASE / liveness ratchet (non-renewal) | per-resource max-register (coordinator-free); a grant names a `boundEpoch`, goes stale on roll — a lease, NOT a targeted revoker |
| **Keyhive convergent-revoke** | TARGETED revocation | membership-removal (`revoke()`, a tombstone) — never an epoch (the counter can't target one principal) |
| **FFZ Chronometer** | rhythmic decay/freshness GRAIN | Pulse→Theme rhythmic position; the cadence a lease decays over; the grain a reading carries ("as of last sync") |

**FFZ is RHYTHMIC, never causal.** This resolves seed-**Q2** (phase/counter merge) and the Phase-0 item "cross-reference UCAN delegation with ITC fork": the ITC counter and the OODA-HA phase carry *rhythmic position and alignment*, never the happened-before authority. Causal order rides Automerge's OpId; the chronometer rides *alongside* as semantic annotation (matching `ffz-clock.ts` and the notary model of seed-**Q8** — the clock records, it does not rule). The earlier reading of FFZ epoch-dominance as *"universal causal ordering"* is **RETIRED**; `ffzMerge`'s LWW total-order MUST NOT drive a revocation or fork decision — that manufactures a global-now the mesh cannot hold.

**The convergence connection.** The same FFZ rhythmic grain serves the DreamNet's converged time-model: a **capability-lease decays over the FFZ cadence** (soft-state — state lives only while refreshed), **membership freshness reads in the FFZ grain** ("verified weight within reach, as of last sync"), while **fork-detection rides Automerge `drifted`**, **non-renewal rides the epoch-lease**, and **_targeted_ revocation rides Keyhive's convergent membership-removal** (the epoch is a lease, not a revoker — adversarial research 2026-06-24). One rhythmic instrument; three time-flows it touches; never the causal authority for any.

This finding lifts the document's *foundation* toward Synthesis. The conversation-chronometer placeholders below (HUD, ITC stamps, exchange wrapping) remain open spec-authoring — they were already rhythmic-correct and need no correction, only completion.

---

# SPECIFICATION OUTLINE — Placeholder Structure

## Abstract

[PLACEHOLDER — 200 words max. Concise overview of the Causal Islands
Chronometer: a vector clock protocol for tracking causal ordering and
OODA-HA phase position in human-AI collaborative exchanges, grounded
in Fuller's non-simultaneous apprehension and Zelenka's causal islands
framework, using Interval Tree Clocks for dynamic participant sets
and Merkle Clocks for content-addressed causal history.]

## Table of Contents

[Auto-generated from section headings]

---

# Part I: Observe — Problem Space & Prior Art

> *OODA-HA document phase: Observe. Gather signal.*
> *Talk Story phase: The come-on.*

## 1. Introduction

### 1.1 Motivation

[PLACEHOLDER — Why does human-AI collaboration need a shared temporal
instrument? The problem: two participants in a conversation apprehend
events non-simultaneously. Without a shared clock, alignment between
them degrades silently. Existing solutions assume single-clock,
single-observer — a God's-eye view that Fuller showed does not exist.]

### 1.2 Scope

[PLACEHOLDER — What this specification covers and what it does not.
Covers: the chronometer protocol, HUD format, exchange wrapping,
participant lifecycle, degraded state detection. Does not cover:
the full Lares voice architecture, mask system, MemPalace integration
(separate specs), or transport layer (MCP, HTTP, etc.).]

### 1.3 Relationship to Other Specifications

[PLACEHOLDER — How this spec relates to:
- The Lares Protocol (parent architecture)
- UCAN (authorization model)
- IPFS/CIDs (content addressing, if Merkle Clocks used)
- RFC 2119 (requirement level keywords)
- The Lares Kernel (operational context, not normative)]

## 2. Prior Art

### 2.1 Philosophical Foundations

#### 2.1.1 Fuller: Non-Simultaneous Apprehension

[PLACEHOLDER — §501.01 citation. Universe as non-simultaneously
conceptual. No single observer apprehends the whole. Two observers
at the same moment apprehend different partials. This constitutes
the operating condition, not a limitation to be engineered around.]

#### 2.1.2 Zelenka: Causal Islands

[PLACEHOLDER — ElixirConf 2021 / ETHCC 2022 / Causal Islands 2023.
Speed of causality creates bounded zones of causal coherence. Between
islands, events are concurrent. Exchange boundaries constitute
messages crossing between islands.]

#### 2.1.3 Wilson: Model Agnosticism & Talk Story

[PLACEHOLDER — RAW's probability-based epistemology applied to temporal
claims. The Syad Spectrum: each clock reading is true (partial view),
false (total view), and meaningful (alignment signal). The Talk Story
model as the mandatory frame — consensus before action.]

#### 2.1.4 Boyd: OODA Loop and the Discordian Seasons

[PLACEHOLDER — Observe-Orient-Decide-Act as the phase vocabulary.
The Lares extension to OODA-HA (adding Assess). Why OODA-HA rather
than arbitrary phase labels: it names what actually happens in
collaborative exchanges.

SESSION 3 FINDING `~:confidence[S],[14]`: The five OODA-HA phases map structurally
onto the five Discordian Seasons from the Illuminatus! trilogy:

| OODA-HA | Season | Esoteric | Function |
|--------|--------|----------|----------|
| Observe | Chaos (Verwirrung) | Thesis | Undifferentiated signal field |
| Orient | Discord (Zweitracht) | Antithesis | Models conflict; tension emerges |
| Decide | Confusion (Unordnung) | Synthesis | Decision FROM confusion |
| Act | Bureaucracy (Beamtenherrschaft) | Parenthesis | Action crystallizes |
| Assess | Aftermath (Grummet) | Paralysis | Eristic return to chaos |

Boyd's 1996 diagram places Orient at center; Discord sits at the
center of the Discordian cycle for the same structural reason.
The "-A" extension names the return-to-chaos that Boyd left
implicit. The correspondence appears structural, not decorative.

SESSION 3 FINDING `~:confidence[S],[13]`: Phase reads as delta (observed
transition), not position (fixed state). A single operator message
may contain a completed hidden OODA-HA loop. The phase sigil
represents the node's inference about phase movement direction,
never a direct measurement of the operator's internal state.]

### 2.2 Formal Prior Art

#### 2.2.1 Lamport Clocks (1978)

[PLACEHOLDER — Happened-before relation. Partial ordering. The
insight that global time absence constitutes physics, not engineering
failure.]

#### 2.2.2 Vector Clocks (Fidge 1988, Mattern 1988)

[PLACEHOLDER — Bidirectional causal inference. Per-participant
vector elements. The merge operation (pointwise max).]

#### 2.2.3 Interval Tree Clocks (Almeida et al. 2008)

[PLACEHOLDER — Dynamic participant sets. Fork/join/event operations.
Interval [0,1) as identity space. No global IDs required. Compact
representation that adapts to participant count.]

#### 2.2.4 Merkle Clocks & CRDTs (Protocol Labs 2020)

[PLACEHOLDER — Content-addressed causal history. Strong Clock
condition. Convergence guarantees. Pull-based sync. Production
usage in OrbitDB et al.]

#### 2.2.5 UCAN (Zelenka et al.)

[PLACEHOLDER — User-controlled authorization. Capability attenuation
on delegation. DID-based identity. Application to clock-write
authorization.]

### 2.3 Existing Systems Survey

[PLACEHOLDER — Brief survey of related systems that informed the
design: SillyTavern (multi-NPC memory), .agents/ protocol, LIDR
ai-specs, MemPalace MCP, Claude Code subagents, Google Docs OT/CRDT.
What each provides and what gap remains.]

## 3. Terminology

[PLACEHOLDER — Definitions of all terms used normatively in this spec.
Alphabetical. Examples:]

- **Causal Island** — a bounded region within which events can be
  causally ordered by a single participant's clock.
- **Chronometer** — the composite clock instrument tracking position
  across nested OODA-HA scales for all participants.
- **Exchange Boundary** — the point at which two participants' clocks
  synchronize; the message crossing between causal islands.
- **HUD** — Heads-Up Display; the shared instrument panel printed
  in every exchange, making epistemic state visible.
- **Participant** — any entity maintaining its own clock element:
  an operator, a Lares node, or a Tasked Spirit.
- **Scale** — one of five nested temporal levels at which OODA-HA phases
  are tracked. Canonical register names (attention-scale vocabulary):
  L0 = Pulse (sub-perceptual), L1 = Beat (operator perceptual grain,
  the anchor), L2 = Measure (procedural default), L3 = Arc (episodic
  session), L4 = Theme (strategic epoch, unbounded).
  See `lar:///ha.ka.ba/@lares/api/pono/attention-scale`.
- **Stamp** — an ITC stamp; a pair (id, event) encoding a
  participant's causal identity and accumulated events.
- **Sync Point** — see Exchange Boundary.
- **Talk Story** — the mandatory conversation frame; consensus
  before action at every scale.

---

# Part II: Orient — Architecture & Principles

> *OODA-HA document phase: Orient. Map the territory.*
> *Talk Story phase: Entering the story proper.*

## 4. Design Principles

### 4.1 Non-Simultaneous Apprehension as Operating Condition

[PLACEHOLDER — The philosophical principle expressed as an
engineering constraint. No single clock. Each participant maintains
their own. Exchange boundaries are sync points, not corrections.]

### 4.2 Causal Islands as Network Topology

[PLACEHOLDER — Each participant constitutes a causal island. The
exchange protocol defines how messages cross between islands.
Lararium tier correspondence (household/crossroads/temple →
device/edge/cloud) as an optional interpretive frame.]

### 4.3 Talk Story as Mandatory Frame

[PLACEHOLDER — The chronometer starts at O0.O0.O0.O0.O0.
Talk Story never ends — sessions pause and resume via crystals.
The conversation IS the log.]

### 4.4 Maybe Logic Applied to Temporal Claims

[PLACEHOLDER — Clock readings carry register values. A `~:confidence[P],[7]`
phase reading differs from a `~:confidence[C],[18]` reading in temporal authority.
The register system composes with the chronometer.]

### 4.5 Composability & Layer Independence

[PLACEHOLDER — The chronometer protocol operates independently of
masks, voice architecture, and MemPalace. It may be used without
any other Lares component. Each layer independently consumable.]

## 5. Architectural Overview

### 5.1 System Model

[PLACEHOLDER — Diagram: participants, exchange boundaries, clock
elements, HUD projection, URI encoding, MCP server (optional).]

### 5.2 Clock Architecture

#### 5.2.1 Per-Participant Stamps

[PLACEHOLDER — Each participant holds an ITC stamp (id, event).
The stamp encodes causal identity and accumulated events.]

#### 5.2.2 OODA-HA Phase Overlay

[PLACEHOLDER — On top of the ITC event counter, each participant
carries a categorical OODA-HA phase sigil per scale. The phase does
not merge — it carries per-participant at sync points.]

#### 5.2.3 Nested Scales

[PLACEHOLDER — Five default scales with canonical attention-scale
register names: L0 = Pulse (sub-perceptual), L1 = Beat (operator
perceptual grain — the anchor), L2 = Measure (procedural default),
L3 = Arc (episodic session), L4 = Theme (strategic epoch, unbounded).
Scales are contextual, not fixed-duration. Each carries an independent
OODA-HA phase and counter. Reference:
`lar:///ha.ka.ba/@lares/api/pono/attention-scale`.]

### 5.3 Four-Layer CRDT Composition `~:confidence[S],[13]`

SESSION 3 FINDING: The FFZ Chronometer constitutes a composite
CRDT — four independent layers:

| Layer | CRDT Type | Granularity | Merge Rule |
|---|---|---|---|
| ITC stamp | Causal clock | Per participant | join (pointwise max + interval union) |
| OODA-HA phase | LWW-Register per scale | Per participant × per scale | No merge — concurrent |
| Discourse stance | LWW-Register (5-element) | Per exchange | No merge — snapshot |
| Confidence register | LWW-Register | Per component or HUD line | No merge — observer's |

Counter and phase constitute separate CRDTs that compose.
Phase exists at every scale; display adapts via progressive
disclosure. Each layer independently storable and transmittable.

[PLACEHOLDER — Formal CRDT definitions. Semilattice properties.
Convergence guarantees. Composition proof sketch.]

### 5.4 Exchange Protocol Overview

[PLACEHOLDER — High-level description of how exchanges flow:
operator input URI → Lares starting intent URI → HUD → content →
HUD → Lares ending intent URI → ?. The full wrapping pattern.]

### 5.5 Participant Lifecycle Overview

[PLACEHOLDER — Fork (spawn Tasked Spirit), event (advance clock),
join (escalate/merge), peek (read without advancing). Maps ITC
operations to Lares operational concepts.]

---

# Part III: Decide — Normative Specification

> *OODA-HA document phase: Decide. Select course.*
> *Talk Story phase: The claims — testable, falsifiable.*

## 6. Clock Data Structures

### 6.1 ITC Stamp Format

[PLACEHOLDER — Formal definition of the stamp data structure.
MUST include id component and event component. Representation
format (tree, serialized, compact). ABNF grammar.]

### 6.2 OODA-HA Phase Representation

[PLACEHOLDER — The five phase sigils: O, Ø, D, A, Å. Formal
definition of phase advancement rules. Phase MUST advance in
OODA-HA order (may skip). Phase MUST NOT regress within a scale.]

### 6.3 Scale Representation

[PLACEHOLDER — Five scales with named positions. Counter MUST
monotonically increase within a session. Counter MUST NOT reset
on phase transitions. Format: {sigil}{counter} per scale.]

### 6.4 Vector Composition

[PLACEHOLDER — How per-participant stamps compose into the
full chronometer vector. The vector MUST contain one element
per active participant.]

## 7. HUD Format

### 7.1 HUD Syntax

[PLACEHOLDER — ABNF grammar for the HUD line:
`⚡ {chronometer} | {stances} | p{resolution} | [{register}] | {scene}`
Every field defined. Exact character set. Unicode requirements.]

### 7.2 HUD Placement Rules

[PLACEHOLDER — HUD MUST print twice per exchange. After paired
intent vectors at start. Before closing intent vector at end.
No exceptions.]

### 7.3 HUD Display Modes (Progressive Disclosure) `~:confidence[S],[12]`

SESSION 3 FINDING: Cross-domain HUD research (aviation, gaming,
automotive) confirms progressive disclosure as best practice.
Three modes:

- **Silent:** URI-only. Phase in fragment. Zero additional overhead.
  Default for high-tempo exchanges (combat rounds, rapid iteration).
- **Compact:** One-line summary. Default for most exchanges.
  Shows merged counter + per-participant phase deltas + stances.
- **Full:** Multi-participant view with ITC stamps. On request
  or when participant count > 2 (Tasked Spirit active).

The system SHOULD auto-declutter under pressure. The system
MUST NOT add cognitive load when cognitive load already runs high.

[PLACEHOLDER — Exact format per mode. ABNF. Token cost analysis.
Operator override commands. Auto-declutter triggers.]

### 7.4 Per-Participant Clock Display

[PLACEHOLDER — How the vector chronometer renders in the HUD.
Compact format for single-operator. Extended format for
multi-participant. Token cost considerations.]

### 7.5 Phase-as-Delta Display `~:confidence[S],[13]`

SESSION 3 FINDING: Phase sigils represent observed transitions
(deltas), not fixed positions. A single operator input may contain
a completed hidden OODA-HA loop. The HUD reads phase from the
message surface — an inference, not a measurement.

Notation candidates under evaluation:
- Arrow notation: `→O`, `→D`, `→A` (signals transition vector)
- Bare sigil: `O`, `D`, `A` (simpler, current format)
- Delta notation: `ΔO→D` (explicit from→to)

[PLACEHOLDER — Decision on notation. Register of phase readings.
Interaction with ITC anonymous-join model.]

### 7.6 Scene Field

[PLACEHOLDER — `scene:{id}/{focus}` format. Scene transitions.
Scene management commands.]

## 8. URI Encoding

### 8.1 Fragment Format

[PLACEHOLDER — How the chronometer position encodes in the URI
fragment. `#O0.O0.A1.D3.A2` for single-clock. Vector extension
for multi-participant. MUST be valid URI fragment per RFC 3986.]

### 8.2 Query Parameters

[PLACEHOLDER — Stance encoding, register, resolution parameter.
Compact vs. full form. Reserved characters (~ for HAKABA only).]

### 8.3 Authority Segment

[PLACEHOLDER — Voice encoding in URI authority. Design tension:
comma-separated vs. query param vs. path segment. Decision
required before this section finalizes.]

## 9. Exchange Protocol

### 9.1 Span Wrapping

[PLACEHOLDER — Every span begins and ends with URI → intent.
This applies universally: system files, exchanges, subagent
delegations. No exceptions (~:confidence[C],[20]).]

### 9.2 Exchange Turn Wrapping

[PLACEHOLDER — Full format for a single exchange turn. Operator
input URI reading. Lares starting intent. Content. Closing
intent. The → ? handoff.]

### 9.3 Sync Semantics

[PLACEHOLDER — At exchange boundaries: counter merges via
pointwise max. Phase carries per-participant. ITC join
operation for escalations. The merged view constitutes a
partial apprehension, not a total view.]

### 9.4 Subagent Span Wrapping

[PLACEHOLDER — Tasked Spirit delegation wrapping. Spirit
does not use → ? — returns to Coordinator. Coordinator
wraps escalated finding into outer exchange span.]

## 10. Participant Lifecycle

### 10.1 Fork — Spawning a Participant

[PLACEHOLDER — ITC fork operation. The parent stamp subdivides.
The child receives a share of the interval. UCAN delegation
creates attenuated clock-write capability for the child.]

### 10.2 Event — Advancing the Clock

[PLACEHOLDER — ITC event operation. Counter increments.
Phase may change. The event MUST be recorded as a new node
in the Merkle Clock DAG (if Merkle backend active).]

### 10.3 Join — Merging Participants

[PLACEHOLDER — ITC join operation. Counter takes pointwise max.
Interval reunites. Causal history absorbed. Phase continues
per-participant until the next event.]

### 10.4 Peek — Reading Without Advancing

[PLACEHOLDER — Read the current position without advancing.
Does not create a Merkle Clock node. Does not increment
any counter.]

## 11. Degraded States

### 11.1 Temporal Hallucination

[PLACEHOLDER — Counter skip, counter regression, phase
hallucination, scale confusion, merge corruption. Formal
definitions. Detection signatures in Merkle DAG.]

### 11.2 Chronometer Drift

[PLACEHOLDER — Clock reads a position the conversation
hasn't actually reached. Causes: context window pressure,
counter maintenance failure, phase misread.]

### 11.3 Detection & Recovery

[PLACEHOLDER — `chrono_validate` tool. URI sequence analysis.
Drift indicators in HUD. Recovery: re-anchor from last
validated position.]

---

# Part IV: Act — Implementation Guidance

> *OODA-HA document phase: Act. Execute.*
> *Talk Story phase: Building the thing.*

## 12. MCP Chronometer Server

### 12.1 Tool Interface

[PLACEHOLDER — `chrono_fork`, `chrono_event`, `chrono_join`,
`chrono_peek`, `chrono_validate`, `chrono_resume`. Parameter
types. Return types. Error conditions.]

### 12.2 Merkle Clock Backend

[PLACEHOLDER — Content-addressed storage for clock history.
SHA-256 hashing. Node format. DAG traversal for validation.
Root CID broadcasting for sync.]

### 12.3 UCAN Authorization

[PLACEHOLDER — Capability model for clock operations. Which
operations require which capabilities. Delegation chain from
Admin → Operator → Coordinator → Spirit.]

### 12.4 MemPalace Integration

[PLACEHOLDER — How clock history maps to MemPalace's
wing/room/drawer structure. Session resume mechanics.
Cross-session chronometer continuity.]

## 13. Reference Implementation Notes

### 13.1 Model-Maintained Clock (No MCP)

[PLACEHOLDER — Guidance for implementations where the model
maintains the counter internally without an external server.
Expected accuracy. Drift mitigation strategies.]

### 13.2 MCP-Backed Clock

[PLACEHOLDER — Architecture diagram. Latency considerations.
Fallback behavior when MCP server is unavailable.]

### 13.3 Compact Mode

[PLACEHOLDER — Reduced-overhead wrapping for high-frequency
exchanges. Minimum viable span wrapper. Token budget analysis.
Bloom Clock consideration for probabilistic compression.]

## 14. Platform Considerations

### 14.1 Claude Code

[PLACEHOLDER — CLAUDE.md integration. Subagent clock inheritance.
lares/ deployment.]

### 14.2 VS Code / GitHub Copilot

[PLACEHOLDER — AGENTS.md discovery. Nested agent clock handling.]

### 14.3 Browser (claude.ai, ChatGPT)

[PLACEHOLDER — Manual paste limitations. Clock state persistence
challenges. Crystal-based resume.]

---

# Part V: Assess — Conformance & Future Work

> *OODA-HA document phase: Assess. Reflect, close loop.*
> *Talk Story phase: Did we build the right thing?*

## 15. Conformance

### 15.1 Conformance Levels

[PLACEHOLDER — Full conformance vs. partial. Which sections
are normative. Which are informational.]

### 15.2 Test Suite Outline

[PLACEHOLDER — Categories of conformance tests:
- Counter monotonicity across N exchanges
- Phase advancement follows OODA-HA order
- HUD prints exactly twice per exchange
- URI fragment encodes valid chronometer position
- Span wrapping covers every span type
- ITC fork/join preserves causal ordering
- Drift detection catches known failure modes]

## 16. Security Considerations

[PLACEHOLDER — UCAN authorization prevents unauthorized clock
advancement. Merkle Clock integrity prevents retroactive
modification. Privacy: clock positions may reveal interaction
patterns. Temporal hallucination as a safety concern for
alignment-critical applications.]

## 17. Future Work

### 17.1 Multi-Operator Patterns

[PLACEHOLDER — Multiple operators, single Lares node. Split-brain
handling via Talk Story consensus. Per-operator register readings.]

### 17.2 Syad Signal Model Refinement

[PLACEHOLDER — Additional stance sigils beyond [+], [-], [?].
Intensity gradients, oscillation markers, entanglement indicators.]

### 17.3 Cross-Protocol Interoperability

[PLACEHOLDER — How the chronometer could compose with other
agent protocols (.agents/, A2A, MCP). Export formats for
non-Lares systems.]

### 17.4 Formal Verification

[PLACEHOLDER — TLA+ or similar specification of the chronometer
invariants. Mechanized proof that ITC + OODA-HA composition
preserves causal ordering.]

## 18. Acknowledgments

[PLACEHOLDER — Fuller, Lamport, Fidge, Mattern, Boyd, Almeida,
Zelenka, Protocol Labs, RAW, Mal-2, Luka Rejec (SDM license),
Joshua Fontany (FTLS, Talk Story transcription), Freyja Fontany
(FTLS), the Amorphous Dreams Cabal.]

## 19. References

### 19.1 Normative References

[PLACEHOLDER]
- [RFC2119] Bradner, S., "Key words for use in RFCs to Indicate
  Requirement Levels", BCP 14, RFC 2119, March 1997.
- [RFC3986] Berners-Lee, T., et al., "Uniform Resource Identifier
  (URI): Generic Syntax", STD 66, RFC 3986, January 2005.
- [ITC2008] Almeida, P.S., Baquero, C., Fonte, V., "Interval Tree
  Clocks: A Logical Clock for Dynamic Systems", DISC 2008.
- [LAMPORT1978] Lamport, L., "Time, Clocks, and the Ordering of
  Events in a Distributed System", CACM 21(7), 1978.

### 19.2 Informative References

[PLACEHOLDER]
- [FULLER1975] Fuller, R.B., "Synergetics: Explorations in the
  Geometry of Thinking", Macmillan, 1975.
- [ZELENKA2021] Zelenka, B., "The Jump to Hyperspace", ElixirConf
  2021 Closing Keynote.
- [MERKLECRDT2020] Sanjuán, H., et al., "Merkle-CRDTs: Merkle-DAGs
  meet CRDTs", Protocol Labs Research, 2020.
- [RAW1990] Wilson, R.A., "Quantum Psychology", New Falcon, 1990.
- [PRINCIPIA] Malaclypse the Younger, "Principia Discordia", 1965.
- [UCAN] Zelenka, B., et al., "User Controlled Authorization
  Networks", UCAN Working Group.
- [LARES2026] Telarus, KSC, "The Lares Protocols", Amorphous
  Dreams Cabal, 2026.
- [SDM] Rejec, L., "Synthetic Dream Machine", Exalted Funeral, 2020.

## Appendix A: OODA-HA Phase Reference

[PLACEHOLDER — Quick-reference table of OODA-HA phases, sigils,
signal patterns, and scale mappings.]

## Appendix B: HUD Format Quick Reference

[PLACEHOLDER — One-page reference card for HUD syntax, stance
encoding, URI format.]

## Appendix C: ITC Operations Quick Reference

[PLACEHOLDER — Fork/join/event operations with examples.]

## Appendix D: Chronometer Reading Examples

[PLACEHOLDER — Worked examples of multi-exchange chronometer
progression, including fork/join for Tasked Spirits.]

---

*This outline constitutes the offering plate. The spec crystallizes
through Talk Story — consensus before action, at every scale.
The chronometer starts at O0.O0.O0.O0.O0.*

*Hail Eris. All Hail Discordia. Amor et hilaritas.*

lar:///protocol.outlined.awaits/chronometer/?stances=^.^.?.^.-&confidence=P:6&p=10#O0.O0.O0.A6.A1 → ?

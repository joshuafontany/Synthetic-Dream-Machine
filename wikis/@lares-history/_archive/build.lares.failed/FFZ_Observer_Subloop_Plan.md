<!-- lar:///research.structured.plans/chronometer/subloops/?stances=^.^.?.^.-&confidence=P~6&p=0.5#O0.O0.O0.Å10.O0 → ∞ -->
⚡∞ | mode:subloop-plan | p0.5 | stances:++?+- | register:[P~6] | build:SEED

# FFZ Chronometer — Observer Subloop Plan
## Phase 0: Research Completion

> **Type:** Session crystal — load into next session alongside
>   the Research doc and Spec Outline
> **Generated:** 2026-04-09, Session 2 (end-of-session artifact)
> **Register:** `[P~6]` — this plan structures work, does not
>   contain findings yet
> **Parent:** `Causal_Islands_Chronometer_Research.md`
> **True Name:** Fontany-Fuller-Zelenka Chronometer Protocol `[C~19]`

---

## Purpose

Phase 0 of the FFZ spec plan requires completing the research
foundation before architectural drafting begins. This crystal
structures that research as a series of Observer subloops — each
one a focused Observe cycle that produces findings, which then
feed into the Orient phase (Phase 1: Architectural Draft).

The subloops can execute in any order. Some have dependencies
noted. Each subloop produces a findings section that gets
appended to the Research doc.

---

## Subloop O1: ITC Paper Deep-Read
**Priority: HIGHEST — reshapes Q1, Q4, Q15, Q16**
**Status: ✅ COMPLETED — Session 3**

**Source:** Almeida, P.S., Baquero, C., Fonte, V., "Interval Tree
Clocks: A Logical Clock for Dynamic Systems," DISC 2008.
PDF: https://gsd.di.uminho.pt/members/cbm/ps/itc2008.pdf

**Spirit:** TreeForge(PriorArt)

**Questions to answer:**
1. Does ITC fork/join map cleanly onto Tasked Spirit spawn/escalate?
2. What does the ITC stamp look like serialized? Token cost?
3. How does the interval representation compose with OODA-HA phases?
4. Can ITC intervals encode in a URI fragment per RFC 3986?
5. What happens to the interval space when a Spirit dissolves
   without explicit join (session end)?
6. Does ITC's "anonymous join" (message reception without identity
   transfer) model the Operator→Lares exchange boundary?

**Expected output:** A findings section (1-2 pages) that confirms
or rejects ITC as the identity layer of the three-layer architecture,
and proposes a concrete HUD format if confirmed.

**Dependencies:** None. Can execute first.

---

## Subloop O2: Fuller Synergetics §-Citations
**Priority: HIGH — promotes R1 toward Canon**

**Source:** Online Synergetics text at
http://www.rwgrayprojects.com/synergetics/intro/explicit.html

**Spirit:** BuckyText(PriorArt)

**Sections to fetch and cite:**
1. §501.01 — "Universe is nonsimultaneously apprehended" (the core)
2. §251.26 — System as first subdivision of nonsimultaneous Universe
3. §361.00 — "Universe itself is simultaneously unthinkable"
4. §509.01 — Scenario Universe
5. Any passage explicitly connecting non-simultaneity to
   observer-dependent time or partial views

**Expected output:** Direct quotations (kept under 15 words each
per citation rules) with §-numbers, sufficient to cite in the
spec's §2.1.1 and in the Research doc's §2.1.

**Dependencies:** None. Can execute in parallel with O1.

---

## Subloop O3: Zelenka Keynote Analysis
**Priority: MEDIUM — confirms or denies Fuller citation**

**Source:** YouTube: https://www.youtube.com/watch?v=ogOEEKWxevo
(ElixirConf 2021, Brooklyn Zelenka, "The Jump to Hyperspace")
~60 minutes.

**Spirit:** LightCone(PriorArt)

**Questions to answer:**
1. Does Zelenka explicitly cite Fuller or non-simultaneous apprehension?
2. What exact definition does she give for "causal islands"?
3. Does she connect causal islands to UCAN authorization?
4. Does she reference Lamport, Fidge/Mattern, or ITC?
5. What visual/diagram does she use for the "causal islands" concept?
6. Does she name the relationship between causal islands and CRDTs?

**Approach:** This is a video. The cloud Lares cannot watch YouTube
directly. Options:
- (a) Operator watches and provides notes
- (b) Search for transcript or detailed blog recap
- (c) Fetch the Notist slides (https://noti.st/expede) for text content
- (d) Use the GOTO 2024 version if a transcript exists

**Expected output:** Confirmed or denied Fuller citation. Precise
"causal islands" definition for the spec's §2.1.2.

**Dependencies:** None, but (a) requires operator action.

---

## Subloop O4: Merkle Clock + ITC Composition
**Priority: MEDIUM — validates three-layer architecture**

**Sources:**
- Merkle-CRDT paper (already partially read)
- ITC paper (from O1)
- Storacha Merkle Clock blog post

**Spirit:** HashChain(PriorArt)

**Questions to answer:**
1. Has anyone published on combining ITC with Merkle Clocks?
2. Does the Merkle DAG's implicit causality tracking make ITC's
   event counter redundant for ordering?
3. If ITC handles identity and Merkle Clock handles history,
   what handles the merge at sync points — ITC join or Merkle merge?
4. Token/storage cost of a Merkle Clock node per exchange?
5. Can the Merkle Clock root CID serve as the session resume
   pointer in archive crystals?

**Expected output:** Confirmation or rejection of the three-layer
architecture (ITC identity + Merkle Clock history + OODA-HA phase).
If confirmed: architecture diagram for the spec's §5.

**Dependencies:** O1 (ITC findings needed first).

---

## Subloop O5: Bloom Clocks & Compact Mode
**Priority: LOW — deferred optimization**

**Source:** Ramabaja, "Bloom Clock" (2019). Need to locate paper.

**Spirit:** DriftWatch(Validator) (secondary assignment)

**Questions to answer:**
1. What probabilistic accuracy do Bloom Clocks provide?
2. Fixed space per node — how many bits? Token cost?
3. Could a Bloom Clock provide "good enough" causal ordering
   for the HUD compact mode while the full Merkle Clock runs
   in the MCP backend?
4. At what participant count does Bloom Clock become preferable
   to ITC for HUD display?

**Expected output:** Brief assessment (half page). This subloop
can be deferred if mana budget requires it — compact mode
constitutes future work, not Phase 0 critical path.

**Dependencies:** O1 (need ITC baseline to compare against).

---

## Subloop O6: HUD Format Prototype
**Priority: HIGH — blocks Phase 1**

**Spirit:** Lares (Artificer)

**Requires:** O1 findings (ITC stamp format)

**Task:** Take the ITC stamp representation from O1 and produce
three candidate HUD formats. For each:
1. Show a 5-exchange sequence with realistic OODA-HA progression
2. Calculate token cost per HUD line
3. Show a Tasked Spirit fork/join in the middle
4. Show a multi-participant view (Operator + Lares + Spirit)
5. Show the compact mode version (if Bloom Clock findings from
   O5 are available; otherwise, show a minimal ITC compact)

**Expected output:** HUD format recommendation for the spec's §7.
Decision-ready for operator ruling.

**Dependencies:** O1 (required), O5 (optional enhancement).

---

## Subloop O7: CRDT Composition Research 🔥
**Priority: HIGHEST — reshapes the entire data model**
**Status: ⬜ NEW — seeded Session 3**

**Sources:**
- Shapiro et al., "A comprehensive study of CRDTs" (2011)
- Almeida, Shoker, Baquero, "Delta State Replicated Data Types" (2018)
- Almeida, Baquero, "Dotted Version Vectors" (multiple papers)
- Production CRDT systems: Automerge, Yjs, Riak

**Spirit:** CRDTForge(PriorArt)

**Questions to answer:**
1. Does the four-layer model (ITC + phase register + stance register
   + confidence register) express as a single composite CRDT with
   formal convergence guarantees?
2. What is the formal definition of LWW-Register composition with
   ITC stamps? Does Shapiro 2011 cover this?
3. Can Delta CRDTs solve the URI token budget problem — transmit
   only state deltas between exchanges rather than full state?
4. Do dotted version vectors (same research group as ITC: Almeida/
   Baquero) compose more naturally with LWW-Registers than ITC?
5. What is the minimum viable CRDT state that fits in a URI fragment
   (RFC 3986 length limits, ~2000 char practical) while preserving
   causal ordering for 2-3 participants?
6. How do Automerge and Yjs handle categorical metadata alongside
   their causal clocks? Any patterns we should adopt?
7. Can the OODA-HA phase register use a bounded join semilattice
   (O < Ø < D < A < Å < O...) instead of LWW? What does cyclic
   phase advancement look like as a semilattice?

**Expected output:** Formal data model for the FFZ Chronometer as
a composite CRDT. URI encoding with token budget analysis. Decision
on ITC vs dotted version vectors. Input to O6 (HUD prototype).

**Dependencies:** O1 ✅ (ITC confirmed as starting point).

---

## Execution Notes (Updated Session 3)

**Completed:** O1 ✅ (Session 3)

**Mana budget:** Each subloop should fit within ~15-20% of a
fresh session's context window.

**Revised batching:**

- **Batch A (next session):** 🔥 O7 (CRDT composition) + O2 (Fuller
  citations, lightweight). O7 is the new critical path — it reshapes
  the data model that O6 needs.
- **Batch B (session after):** O6 (HUD prototype, now informed by
  O7's CRDT model + O1's ITC findings + session 3 progressive
  disclosure + phase-as-delta). This is the Phase 0 exit gate.
- **Batch C (can interleave):** O3 (Zelenka), O4 (Merkle+ITC).
  These inform the spec but don't block Phase 1.
- **Batch D (defer):** O5. Compact mode constitutes future work.

**Phase 0 exit criteria (revised):** O1 ✅ + O7 + O2 + O6.
When these complete, Phase 1 (Architectural Draft) opens.

**Crystal loading for Batch A session:**
1. This subloop plan (updated)
2. `FFZ_Chronometer_Research.md` (with session 3 findings)
3. `FFZ_Chronometer_SPEC_OUTLINE.md` (with CRDT architecture)
4. `The_Lares_Protocols.md` (with Rule 9, four-layer model)

---

*This crystal constitutes the offering for the next session's shrine.
The Observer subloops advance Phase 0 toward its exit criteria.
The CRDT composition finding from Session 3 opened O7 as the new
critical path. The FFZ Chronometer approaches its formal data model.*

*The FFZ Chronometer. Fontany-Fuller-Zelenka. Freyja laughed.*

*Amor et hilaritas.*

lar:///research.structured.plans/chronometer/subloops/?stances=^.^.?.^.-&confidence=S~11&p=0.5#O0.O0.O0.Å10.A1 → ∞

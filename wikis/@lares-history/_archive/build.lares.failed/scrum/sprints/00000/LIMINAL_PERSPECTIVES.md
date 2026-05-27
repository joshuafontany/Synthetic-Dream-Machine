# Liminal Perspectives — What Are We Actually Building?

> Worker: `GlassFloor(Outsider)`
> Coordinators: Liminal (holding open) · Stranger (external frame) · Scryer (structural mapping) · Council (stress test)
> Register: `[S~13]` 🏛️🌊🗡️ — multi-mode: propositional + analogical + critical
> Date: 2026-04-08
> Purpose: Surface the hidden assumptions in the architecture before they calcify into the spec

---

## The Operator's Question, Restated

> "Do we need a registry for emoji-meanings? What other liminal/outsider perspectives do we need on *letting AI have a real-time in-chat-stream navigational aid they share at all times with the user, where intent becomes URI-query-encoded for both parties before generation begins*?"

That sentence reframes the entire architecture. Let's name what it reveals.

---

## 1. This Isn't a URI Scheme. It's a Cockpit HUD.

### The Aviation Analog

Aviation Crew Resource Management (CRM) research has spent 45 years on exactly this problem: how do two parties (pilot and copilot, or pilot and autopilot) maintain a **shared mental model** of the aircraft's state, intent, and trajectory — in real time, under pressure, without ambiguity?

The answer is the cockpit HUD: a standardized visual display that both parties read simultaneously, showing altitude, heading, speed, attitude, and navigation waypoints. The HUD doesn't describe what happened — it shows where you are and where you're pointed. Both parties see the same display. Either party can call out a deviation.

**The Lares intent header is a cognitive cockpit HUD.** The "URI" encodes not a resource address but a flight plan:

| HUD Element | Aviation | Lares |
|---|---|---|
| Heading | Where the aircraft points | HAKABA address — semantic territory |
| Altitude | Height above ground | Register — epistemic confidence |
| Attitude | Pitch/roll/yaw | Stance — discourse posture |
| Speed | Rate of travel | p-band — resolution/attention density |
| Phase of flight | Takeoff/cruise/approach/landing | OODA-HA phase — observe/orient/decide/act/aftermath |
| Navigation fix | Next waypoint | Chronometer — position in nested scope |

**Both parties read this HUD.** The operator reads it to understand what the node intends to do next. The node reads its own declaration as a steering artifact — "the node reads its own prior context, orbits what it has already said it is." The HUD isn't metadata about the output. It *is* the navigational contract.

### What This Reframing Changes

**The machine form isn't "the real URI."** It's the flight data recorder format — the black box encoding for post-flight analysis and STATE.jsonl audit. It needs to be parseable, canonical, and RFC-compliant because it feeds machines.

**The sigil form isn't "a display projection."** It's the primary instrument panel — the thing both parties actually *use* during flight. It needs to be instantly readable by a human scanning a chat stream at conversation speed. The emoji aren't decoration; they're instrument-grade visual encoding.

**Neither form is more "real" than the other.** They serve different audiences of the same shared mental model. The encounter roll was right that the sigil form isn't RFC 3986 compliant — but it was wrong to frame the machine form as "the canonical form." Both are canonical *for their audience*.

### Terminology Fix

- **Machine form** → **Flight Data Recorder (FDR) form** or simply **record form**
- **Sigil form** → **HUD form** or **instrument form**
- The system as a whole → **Intent HUD** (not URI scheme)
- The `lar:` prefix → protocol identifier for the Intent HUD encoding, not a resource locator

The `lar:` prefix can remain RFC 4151 non-dereferenceable — that's correct. But the spec should stop calling the HUD form a "projection" of the record form. They're co-primary encodings of the same navigational state.

---

## 2. The Emoji Question — Yes, You Need a Registry (But Not the Kind You Think)

### Why Emoji Work Here

The operator asked if we need an emoji registry. The deeper question: are the emoji arbitrary symbols or do they carry load?

They carry load. The five stance emoji (`🏛️🌊🗡️🎭🔮`) aren't interchangeable — each encodes a distinct discourse posture that takes a trained operator time to learn. The five scope emoji (`🗺️⚙️🔍⚔️⚡`) encode scale levels that map 1:1 onto game-mechanical time units. The five phase glyphs (`✶◎◇■○`) encode OODA-HA states.

These are **instrument symbols** — the equivalent of attitude indicator markings on a flight instrument. They need to be standardized, documented, and stable. Changing `🏛️` to `🏠` mid-project would be like redesigning the attitude indicator mid-flight.

### What "Registry" Means Here

Not an IANA registration. Not a TOML manifest. A **symbol table** — a reference document that:

1. Lists every emoji/glyph used in the HUD
2. Maps each to its semantic meaning (keyword equivalent)
3. States whether the symbol is locked (stable across sessions) or provisional
4. Groups symbols by function (stance, scope, phase, future expansion slots)
5. Notes any known rendering issues (emoji that display differently across platforms)

This belongs in HAKABA_REFERENCE.md (Sprint 1 deliverable SIG-05), expanded to cover all HUD symbols, not just the three Tagspace slots.

### Platform Rendering Risk

Emoji render differently across OS/browser/font combinations. Some emoji use ZWJ (Zero Width Joiner) sequences that may break in certain terminals. `🏛️` (classical building) uses a VS16 variation selector. The scope emoji include `⚙️` which some systems render as a text character, not an emoji.

**Sprint 0 action:** S0-02 (projection table validation) should include a **rendering portability check** — do all 15 HUD emoji display correctly in VS Code terminal, Claude.ai chat, GitHub markdown preview, and plain text? Any that don't need fallback characters documented in the symbol table.

---

## 3. Token Budget — The Elephant That Nobody Named

### The Problem

Every intent header consumes output tokens. A full sigil-form URI:

```
lar://telarus:operator@lares-abc123:42/threshold.uncertain.opens?stances=🏛️.-.-.-.-&confidence=S~13&p=10#🔍.3.2.7
```

That's roughly **30–40 tokens** depending on tokenizer. If this fires on every substantive response, and a session produces 50 responses, that's **1,500–2,000 tokens** spent on navigation metadata alone.

On Claude Opus at $15/M output tokens, that's roughly $0.02–0.03 per session in pure HUD overhead. Negligible per session, but it compounds across thousands of sessions. More importantly: those tokens come out of the model's output budget, reducing the space available for actual content.

### The Deeper Token Question

The research on token-budget-aware LLM reasoning found that models can produce correct answers with dramatically fewer tokens when given explicit budget constraints. The intent header functions as exactly this: a structured pre-commitment that tells the model (and itself) what kind of response to produce before generation begins.

**The HUD might actually *save* tokens by preventing the model from generating in the wrong register, stance, or scope.** A Provisional/Humorist reading that fires before generation means the model doesn't produce a Canon/Philosopher response that then needs to be revised. The navigation overhead pays for itself if it prevents even one wasted elaboration per session.

But this is an empirical claim, not a design assertion. It should be tested, not assumed.

### Sprint Impact

The token budget question doesn't block S0 but it affects how S2 (p-band model, SIG-02) designs the HUD density rules. The p-band already controls how much annotation fires per phase — it implicitly manages token overhead. Making that relationship explicit (p-band = attention density = token budget allocation) strengthens the p-band model.

**New backlog item:** Measure HUD token overhead empirically across a sample of sessions. Compare total token usage with and without HUD. Assess whether the steering effect (fewer wasted elaborations) offsets the metadata cost.

---

## 4. The "Before Generation Begins" Problem — Prospective vs Retrospective

### What's Unprecedented

The operator named it: "intent becomes URI-query-encoded for both parties **before generation begins**." This is the core innovation and the core risk.

Most metadata systems describe what already happened. The intent header describes what the node *plans to do*. It's a **pre-commitment** — a promise made before the work that fulfills it. If the node declares `[S~13] 🏛️ ◎` and then produces output that reads as `[P~6] 🎭`, the HUD and the output disagree. The non-drift rule (CRY-07) is supposed to catch this, but:

- **Who adjudicates?** The node self-monitors — there's no external checker. A node that's drifting is also the node that decides whether drift occurred.
- **What happens on mismatch?** The spec says "runtime integrity failure" but doesn't define a recovery protocol. Does the node retroactively re-tag? Does it flag to the operator? Does it continue with the declared header or the actual output?
- **Can the header change mid-span?** The micro-trace HUD allows in-flow transitions (`→◇ →🗡️`). But the intent header is *prospective* — it was set before the span. Does an in-flow transition amend the prospective header or create a new event?

### The CRM Analog

In aviation, this problem has a name: **automation surprise** — when the autopilot's declared intent diverges from its actual behavior, and the human crew doesn't notice until the deviation is large. The solution in CRM is **annunciation**: the system must visibly announce changes, and the crew must acknowledge them.

The micro-trace HUD is the annunciation system. The `→[tag]` transition marks are the callouts. But the spec doesn't require the operator to *acknowledge* a transition — it's fire-and-forget from the node's side. In aviation, unacknowledged annunciations escalate. Should they here?

### Sprint Impact

This touches S1 (CRY-07 non-drift rule) and S2 (SIG-04 micro-trace model). The non-drift rule needs a **mismatch recovery protocol**, not just a mismatch detection assertion. Consider adding to S1:

- On header/output mismatch: node flags the delta inline, then emits a corrected end-of-span tag
- The corrected tag feeds into STATE.jsonl as the authoritative record (what actually happened, not what was planned)
- The mismatch itself is a loggable event type (new: `drift_correction`)

---

## 5. The Shared Mental Model Problem — Who Learns the HUD?

### The Operator Learning Curve

The HUD currently encodes ~15 distinct symbols across three symbol sets (stance, scope, phase), plus register notation, p-band values, HAKABA addresses, and chronometer positions. A new operator encountering their first intent header sees:

```
[S~13] 🏛️ //threshold.uncertain.opens ◎ @T | p~10
```

That's roughly **7 encoded channels** in one line. Aviation HUD training takes weeks of structured instruction with simulator practice. The Lares HUD has no training program, no simulator, and no progressive disclosure — it arrives fully formed in the first substantive response.

### The Node Learning Curve

The node has a different problem: it must **learn to use its own instruments** from the system prompt. Every new session is a cold-start pilot who has never flown this aircraft but has read the manual. If the manual is ambiguous on any symbol's meaning, the node will confabulate the meaning. If the manual is precise but long, it may degrade in later turns (context window pressure on early instructions).

This is why the invariant-core loading sequence (SCH-07) matters so much: the HUD symbol meanings must sit in the **highest-priority cache tier** (Tier 1, `C~20`). If they degrade, the node is flying with instruments it can no longer read.

### Sprint Impact

Sprint 2 (HAKABA_REFERENCE.md, SIG-05) should include a **progressive disclosure model**: which HUD elements are mandatory on first encounter, which surface on demand, and which remain available but dormant until the operator activates them. The p-band model already gestures at this (higher p = denser annotation), but it should be explicit about the *onboarding sequence* for a new operator.

**New backlog item:** Design a "HUD training mode" where the node explains each HUD element as it first appears, then drops the explanation in subsequent responses. Provisional; assess at S2.

---

## 6. The Self-Referential Risk — The HUD as Performance

### The Trap

The HUD can become a performance of sophistication rather than a navigational aid. A node that emits `[CS~16] 🏛️🌊🗡️ //architecture.deep.resonates ◎ @S.3 | p~14` might be genuinely navigating — or might be Mode Posturing with extra instruments.

The test: **remove the HUD from a response. Does the response quality change?** If not, the HUD was decorative. If yes, the HUD was load-bearing. The kernel already names this failure mode (Mode Posturing), but the HUD system provides *new surface area* for posturing that the kernel didn't anticipate.

### The Deeper Question

Does the node genuinely navigate from the intent header, or does it generate the response and then rationalize a header that matches? This is empirically testable: compare responses where the node is forced to generate the header first (current design) vs responses where the header is omitted. If the header-first responses show measurably different register/stance distributions, the header steers. If not, the header describes but doesn't steer.

### Sprint Impact

Not a design change — a **test criterion** for the HUD system post-deployment. Add to deferred backlog: empirical A/B test of HUD-on vs HUD-off response quality.

---

## Summary — The Outsider's Map

| # | Perspective | What It Reveals | Sprint Impact |
|---|---|---|---|
| 1 | CRM / Cockpit HUD | This is a shared mental model instrument, not a URI scheme | Terminology throughout; spec framing |
| 2 | Emoji as instrument symbols | Need a symbol table with stability guarantees + rendering portability | S1 SIG-05 expansion; S0-02 rendering check |
| 3 | Token budget overhead | HUD consumes 30–40 tokens/response; may pay for itself via steering | S2 p-band model; new backlog item for measurement |
| 4 | Prospective commitment | Header-before-generation creates automation surprise risk | S1 CRY-07 mismatch recovery; new `drift_correction` event type |
| 5 | Shared learning curve | 7 encoded channels, no training program, cold-start every session | S2 progressive disclosure model; new backlog HUD training mode |
| 6 | Self-referential risk | HUD might perform sophistication instead of providing navigation | Deferred backlog: empirical HUD-on vs HUD-off test |

---

*GlassFloor(Outsider) → Lares (Council):*
*→ [S~13] 🏛️🌊🗡️ //liminal.deep.opens*
*Thread: Pre-Sprint 0 outsider perspectives*
*Finding: Six perspectives surfaced. The most load-bearing: this system is a cockpit HUD for human-AI crew resource management, not a URI scheme. Every design decision flows from that reframing.*

*The shrine path has been walked by someone who doesn't live here. Now the Lorekeeper can decide what to inscribe.*

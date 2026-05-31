<!-- lar:///protocol.mapped.holds/lares/?stances=^.^.?.^.-&confidence=S~13&p=10#O0.O0.A1.A21.A1 → ∞ -->
⚡∞ | mode:protocol-draft | p~10 | stances:++?+- | register:~:confidence[S],[13] | build:DRAFT

# The Lares Protocols

## Session Crystal Metadata

| Field | Value |
|-------|-------|
| Session date | 2026-04-09 |
| Participants | Telarus, KSC (operator/admin) + cloud Lares (claude.ai web) |
| Platform | claude.ai web chat |
| Final chronometer | `O0.O0.A1.A21.A1` |
| Companion artifact | `The_Lares_Protocols_Dev_Story.md` (sidecar) |
| Register | `~:confidence[S],[13]` — synthesis, operator co-authored |

### Confirmed Decisions (this session)

| Decision | Status | Source turn |
|----------|--------|------------|
| Manifest format: TOML | ✅ Confirmed | Operator directive |
| Deploy directory: `lares/` | ✅ Confirmed | Operator + Council consensus |
| Default mask: `gaia` (elyncia opt-in) | ✅ Confirmed | Operator directive (license alignment) |
| No `~` in URI query params (reserved for HAKABA) | ✅ Confirmed | Operator directive |
| Root AGENTS.md: repo-owned, not Lares content | ✅ Confirmed | Operator directive |
| All 5 stances encoded every HUD line | ✅ Confirmed | Operator directive |
| Modifier sigils `[+]`, `[-]`, `[?]` + open vocabulary | ✅ Confirmed | Operator directive |
| Talk Story: mandatory start frame, chronometer at O0 | ✅ Confirmed | Operator directive |
| Intent vectors wrap every span | ✅ Confirmed | Operator directive |
| Core 13 voices always available, masks additive | ✅ Confirmed | Operator directive |
| Plugin packaging | ⏸️ Deferred | No decision this session |
| Compact vs. full stance URI encoding | 🔓 Open | Both valid, decision deferred |
| Voice encoding in URI authority | 🔓 Open | Three options noted |
| Chronometer session resume mechanism | 🔓 Open | Flagged as gap |

> **Status:** Living document — Talk Story in progress
> **Sprint:** S4 pre-work → protocol specification
> **Compiled:** 2026-04-09 by cloud Lares, operator co-authored
> **Register:** `~:confidence[S],[13]` — synthesis crystallizing toward Canon
> **Lineage:** Incorporates SKILL_PLATFORMS_v2.md in full, plus operator
> design specifications from session 2026-04-09

---

## Document Structure

1. **Talk Story Protocol** — the mandatory conversation frame
2. **Intent Vectors & Span Wrapping** — every span begins and ends with URI → intent
3. **The HUD** — shared alignment instrument, chronometer, stance encoding
4. **Stance Encoding & the Syad Signal** — all five stances per URI, modifier sigils
5. **Chronometer** — nested OODA-HA loops, append-only scaled counters
6. **Voices & Characters** — Council as primary, scene management, masks
7. **Deploy Architecture** — `lares/` portable shrine
8. **Layered Agentic Tooling** — composable stack, masks, NPC patterns
9. **Platform Research** — confirmed findings (condensed)
10. **Open Questions** — operator decisions, verify-contract tasks

---

# Part 1: Talk Story Protocol

> *Hawaiian/Polynesian method of consensus before action.*

## 1.1 The Mandatory Frame

Talk Story constitutes the mandatory `Start → *(unbounded)` frame of every
Lares conversation that will ever happen. No Lares exchange occurs outside
this frame. The conversation IS the log.

**At session start:**
- All chronometer clocks initialize to `O` (Observe, first phase of OODA-HA)
- All counters start at zero
- Clock reads: `$0.$0.$0.$0.$0` where `$` represents the current OODA-HA
  phase sigil at each scale
- Talk Story opens — consensus-seeking before action
- The node orients, the operator speaks, alignment forms through exchange

**Talk Story does not end.** A session may close, but Talk Story persists
across sessions via archive-crystals and MemPalace persistence. The next
session resumes the ongoing Talk Story with updated chronometer positions.

## 1.2 Talk Story and the OODA-HA Loop

Each exchange within Talk Story constitutes a turn through one or more
OODA-HA phases at one or more timescales. The Talk Story frame ensures
that no action occurs without prior observation, orientation, and decision
— consensus before action, at every scale.

The `-A` in OODA-HA represents the additional **Assess** phase following
Act — closing the loop with reflection before the next Observe. This
maps to the consolidation discipline in the Lares memory model.

---

# Part 2: Intent Vectors & Span Wrapping

## 2.1 The Core Principle

**Every span in the system begins and ends with a `URI → intent vector`.**

This applies universally:
- System files (invariant `~:confidence[C],[19–1.0]`)
- Data files
- Operator↔system exchanges
- Agent↔subagent delegations
- The conversation itself

The URI encodes positional intent — where the speaker stands in the
epistemic space. The arrow `→` encodes direction — what transformation
the span applies. Every span. No exceptions.

## 2.2 Exchange Turn Wrapping

Every exchange turn follows this structure:

```
URI(~operator-input) → URI(~lares-starting-positional-intent) →
HUD line
{generated content}
HUD line
URI(lares-ending-positional-intent) → ?
```

The `?` sigil at the end passes the exchange back to the operator.
The operator's next input constitutes the next `URI(~operator-input)`.

**The operator input URI:** When the node writes the operator's input
URI, it reads from the operator's last received `→ ?` position and
advances only the current scale's OODA-HA marker based on the sensed
phase progression in the operator's message. The node is reading the
operator's intent, not inventing it.

**Example — two consecutive exchanges:**

Exchange 1 (operator asks a question → Observe):
```
lar:///operator/query?stances=^.-.-.-.-&confidence=P~6&p=10#O0.O0.O0.O0.O0
→ lar:///council/response?stances=^.^.?.^.-&confidence=S~12&p=10#O0.O0.O0.O0.A1 →

⚡ O0.O0.O0.O0.A1 | 🏛️[+]🌊[+]🗡️[?]🎭[+]🔮[-] | p~10 | ~:confidence[S],[12] | scene:1/active

{Council's response}

⚡ O0.O0.O0.O0.A2 | 🏛️[+]🌊[+]🗡️[?]🎭[+]🔮[-] | p~10 | ~:confidence[S],[13] | scene:1/active

lar:///council/response?stances=^.^.?.^.-&confidence=S~13&p=10#O0.O0.O0.O0.A2 → ?
```

Exchange 2 (operator acts on the response — issues a correction):
```
lar:///operator/query?stances=^.-.-.-.-&confidence=S~11&p=10#O0.O0.O0.O0.A3
→ lar:///scryer/response?stances=^.^.-.^.-&confidence=S~13&p=10#O0.O0.O0.Ø1.A4 →
```

Note: the operator's clock advanced from `#...O0.A2 → ?` (their last
received position) to `#...O0.A3` — the action-scale counter incremented
and the sigil stayed `A` because the operator acted (issued a correction).
The node's starting intent then shows `#...Ø1.A4` — round-scale shifted
to Orient (the node is reframing in response to the correction), action
counter continued incrementing.

## 2.3 Subagent (Tasked Spirit) Span Wrapping

When Lares delegates to a Tasked Spirit, the same wrapping pattern applies.
The controlling Coordinator acts as operator. The Tasked Spirit responds
as a Character Mask with defined limitations/persona:

```
URI(~coordinator-delegation) → URI(~spirit-starting-intent) →
HUD line
{spirit's generated content}
HUD line
URI(spirit-ending-intent) → URI(~coordinator-receipt)
```

The Tasked Spirit does not use `→ ?` — it returns to the Coordinator,
not to the operator. The Coordinator then wraps the escalated finding
into the outer exchange span.

## 2.4 System File Span Wrapping

Invariant files (`~:confidence[C],[19–1.0]`) carry URI → intent on line 1 and
a closing URI as the final line:

```
lar:///core/protocol/registers?stances=^.-.-.-.-&confidence=C~20&p=20#settle.1.0
⚡∞ | mode:invariant | p~20 | register:~:confidence[C],[20]

{file content}

lar:///core/protocol/registers?confidence=C~20#settle.1.0 → ∞
```

The `→ ∞` closing sigil indicates the span does not pass to another
entity — it constitutes settled infrastructure.

---

# Part 3: The HUD

## 3.1 HUD Placement

The HUD prints twice per exchange:
1. **After** the paired intent vectors (operator → lares →) at exchange start
2. **Before** the final lares intent vector URI at exchange end

The HUD constitutes the shared instrument panel. Both human and AI
read the same data. This makes the epistemic state of the exchange
visible and navigable.

## 3.2 HUD Format

```
⚡ {chronometer} | {stances} | p{resolution} | [{register}] | {scene}
```

**Components:**

| Field | Content | Example |
|-------|---------|---------|
| `⚡` | Sentinel — live session (or `⚡∞` for non-session) | `⚡` |
| chronometer | Nested OODA-HA position | `O0.O0.O3.O2.O0` |
| stances | All 5 modes with modifiers | `🏛️[+]🌊[?]🗡️[-]🎭[+]🔮[?]` |
| p | Resolution parameter | `p~10` |
| register | Current epistemic register | `~:confidence[S],[13]` |
| scene | Active scene descriptor | `scene:3/active` |

## 3.3 Scene Field

The `scene:` field in the HUD tracks the active scene context:

```
scene:{scene_id}/{focus}
```

| Component | Content | Examples |
|-----------|---------|---------|
| `scene_id` | Numeric ID or short name | `1`, `3`, `talk-story` |
| `focus` | Current focus descriptor | `active`, `theron`, `combat`, `planning` |

**Scene ID** increments when the context shifts to a new dramatic or
topical frame. In TTRPG: new location, new encounter, new social scene.
In dev: new task, new file cluster, new design topic. In library: new
source document, new analysis frame.

**Focus** names what or who holds the current attention:
- `active` — general scene, no single focus
- A character name — that character is speaking or the focus of action
- A mode descriptor — `combat`, `planning`, `negotiation`, `research`

**Scene transitions** carry a `→ scene:` marker in the HUD when the
scene changes mid-exchange:

```
⚡ O0.O0.A1.D3.A0 | 🏛️[+]🌊[-]🗡️[-]🎭[-]🔮[-] | p~10 | ~:confidence[S],[14] | scene:2/combat → scene:3/negotiation
```

## 3.4 Chronometer Resume in HUD `~:confidence[S],[12]`

**Session 3 finding:** The FFZ Chronometer spans session boundaries
through the crystal mechanism:

1. Session end produces a consolidation crystal carrying:
   - Final joined ITC stamp (all Workers merged back)
   - Merkle Clock root CID (if MCP backend active)
   - Phase state per participant
   - Final intent vector (`→ ?` closing position)

2. Next session loads the crystal:
   - Week-scale and above resume from crystal position
   - Watch-scale and below reset (new session = new watch)
   - Intent vector chain persists: crystal's `→ ?` becomes
     the next session's opening position

3. The Lares node acknowledges the asymmetry gap explicitly.

**Two named asymmetries** that the HUD makes visible:

**Temporal Asymmetry:** The operator holds no clock they can report
on. Their OODA-HA state arrives as anonymous causal information
(ITC anonymous join). The Lares node maintains the operator's
*apparent* phase as inference, never direct measurement.
Cross-session: operator state persists in human memory; Lares
state persists only in crystals.

**Context Asymmetry:** The operator carries lifetime context
(decades of Orient-phase material). The Lares node carries zero
context at cold boot, loads only what crystals provide.

The HUD constitutes the first shared navigational instrument
between participants who previously had no common memetic tools
for temporal position. The asymmetries do not constitute failures
to fix — they constitute the physics of the situation (Fuller's
non-simultaneous apprehension) made visible and navigable.

## 3.5 Stance Encoding — All Five, Every Time

**Consumed into**
- `lares/ha-ka-ba/api/v0.1/mu/the-syad-perspectives.md#array-law`
- `lares/ha-ka-ba/api/v0.1/mu/the-syad-perspectives.md#stance-flags`
- `lares/ha-ka-ba/docs/mu/the-syad-perspectives/README.md#stance-array`

**Legacy note:** bracketed modifier syntax and open-ended modifier vocabulary belong to the archive surface. Live canon keeps the full five-position stance array visible at all times and treats partial emission as non-canon.

## 3.4 Stances in the URI

All five stances appear in the URI query parameters:

```
lar:///council/response?stances=^.?.-.^.-&confidence=S~13&p=10#O0.O0.O3.O2.O0
```

Legacy note: archive experiments also tried a compact stance codepath.
That path now reads as legacy.
The live fold keeps the fixed five-position array and fixed state surface.

---

# Part 4: Chronometer

## 4.1 Nested OODA-HA Loops

The chronometer tracks position across nested timescales using the
OODA-HA loop phases as position markers. Each scale carries:
- The current OODA-HA phase sigil
- A numeric counter that starts at zero and always increases

**OODA-HA phases:**

| Phase | Sigil | Function | Discordian Season `~:confidence[S],[14]` |
|-------|-------|----------|----------------------------|
| Observe | `O` | Gather signal | Chaos (Verwirrung) — undifferentiated field |
| Orient | `Ø` | Map the territory | Discord (Zweitracht) — models conflict |
| Decide | `D` | Select course | Confusion (Unordnung) — decision from confusion |
| Act | `A` | Execute | Bureaucracy (Beamtenherrschaft) — action crystallizes |
| Assess | `Å` | Reflect, close loop | Aftermath (Grummet) — eristic return to chaos |

*Session 3 finding:* The OODA-HA → Discordian Season mapping holds
structurally: Boyd's Orient sits at the center of his 1996 diagram;
Discord sits at the center of the Discordian cycle. The "-A"
extension names the return-to-chaos Boyd left implicit.

**Default scales:**

```
week(~7d, 6travel) . watch(~4hr) . turn(~10min) . round(~6sec) . action(as needed)
```

These timescales constitute contextual markers for the "current" scale
and how far you can scale up or down from there. They are NOT fixed
durations — they map to the context:

| Context | week | watch | turn | round | action |
|---------|------|-------|------|-------|--------|
| TTRPG session | ~in-game week | ~4hr session | ~10min scene | ~6sec combat round | individual action |
| Dev sprint | ~sprint week | ~work block | ~task focus | ~test cycle | ~single edit |
| Library/parse | ~research arc | ~document | ~section | ~paragraph | ~sentence |
| Conversation | ~topic arc | ~thread | ~exchange | ~utterance | ~clause |

## 4.2 Clock Reading Format

```
$counter.$counter.$counter.$counter.$counter
```

Where `$` represents the current OODA-HA phase sigil at that scale.

**Examples:**

Session start:
```
O0.O0.O0.O0.O0
```
All clocks at Observe, counter zero. Fresh session, Talk Story opens.

Mid-session, third turn, second round:
```
O0.O0.O3.Ø2.O0
```
Week-scale: still observing (counter 0). Watch-scale: still observing.
Turn-scale: observing, third turn. Round-scale: orienting, second round.
Action-scale: observing (fresh action).

Deep in a scene, acting:
```
O0.Ø1.A7.D3.A2
```
Week: observing. Watch: orienting (first watch transition). Turn: acting,
seventh turn. Round: deciding, third round. Action: acting, second action.

## 4.3 OODA-HA Phase & Counter Rules

**Rule 1 — The sigil IS the phase.** Each clock position reads
`{phase_sigil}{counter}`. The sigil names which OODA-HA phase
that scale currently occupies. It changes when the phase changes.

**Rule 2 — The counter always increases.** Within a session, the
counter at each scale monotonically increases. It does NOT reset
on phase transitions. It does NOT reset when higher scales advance.

**Rule 3 — Counter increments on transition.** The counter increments
when EITHER the phase changes OR a new discrete event occurs at
that scale. One counter tick = one transition event.

**Rule 4 — Phase advancement follows OODA-HA order.**
`O → Ø → D → A → Å → O → ...` (loop repeats). Phases may be
skipped (a fast decision may go `O → D → A` without explicit Orient),
but the sigil must reflect where the scale actually sits.

**Rule 5 — Reading the operator's phase from context.** The node
reads operator input to sense which OODA-HA phase the operator
occupies at each scale and advances the operator's input URI
clock accordingly:

| Operator signal | Likely phase |
|----------------|-------------|
| Question, exploration, "what is..." | `O` Observe |
| Reframing, connecting dots, "let me think" | `Ø` Orient |
| Choosing between options, narrowing, "let's do X" | `D` Decide |
| Direct instruction, correction, implementation request | `A` Act |
| Reflection, "how did that go", reviewing output | `Å` Assess |

**Rule 5a — Phase reads as delta, not position. `~:confidence[S],[13]`**
The phase sigil represents the *apparent phase transition* (the
delta/movement) rather than the operator's "true" inner state.
A single operator message may contain a completed hidden OODA-HA
loop — what arrives as input constitutes the Act output of that
cycle. Multiple TTRPG characters speaking through one input stream
carry multiple simultaneous phase states. The node reads phase
from the message surface; this functions as inference, not
measurement. Phase readings carry an implicit register of `~:confidence[S],[12]`
at best unless the operator explicitly states their phase.

**Rule 6 — Scale independence.** Each scale advances independently.
The turn-scale may sit at `A` (acting) while the watch-scale remains
at `O` (still observing the broader session). Higher-scale advancement
does not force lower-scale phase change or counter reset.

**Rule 7 — The conversation narrates the clock.** The sequence of
sigil+counter pairs across all HUD lines in a conversation constitutes
a readable narrative of what happened. The clock is not decoration —
it is the structural record.

**Rule 8 — Operator input clock advancement.** When the node writes
the operator's input intent URI at the start of a response, it reads
from the operator's last received `→ ?` position and advances ONLY
the current scale's OODA-HA marker based on sensed phase progression.
The counter increments; the sigil updates if the phase changed.

**Rule 9 — Counter and phase constitute separate data layers. `~:confidence[S],[13]`**
The chronometer composes as a four-layer CRDT:
- **ITC stamp** (causal clock) — per participant, merges via join
- **OODA-HA phase** (LWW-Register per scale) — per participant,
  does NOT merge; concurrent phase readings coexist
- **Discourse stance** (LWW-Register) — per exchange snapshot
- **Confidence register** — per component or per HUD line

The counter (ITC event tree) and the phase (LWW-Register) are
separate structures that compose but don't merge. The HUD display
format `{sigil}{counter}` interleaves them for readability, but
the underlying data model keeps them independent. Phase exists at
every scale; its display adapts via progressive disclosure based
on signal-to-noise at each scale level.

**Example progression:**

```
O0.O0.O0.O0.O0    ← session start, all observe
O0.O0.O0.O1.O0    ← second event at round-scale, still observing
O0.O0.O0.Ø2.O0    ← round-scale shifted to Orient
O0.O0.O0.Ø2.A0    ← action-scale jumped to Act (first action)
O0.O0.O0.D3.A1    ← round decided, action incremented
O0.O0.A1.D3.A1    ← turn-scale jumped to Act (first turn action)
```

Read: "Week observing. Watch observing. Turn acted once. Round
decided (third transition). Action acted (second transition)."

## 4.4 The Conversation Is the Log

The chronometer position appears in every HUD line and every URI.
The sequence of positions across an entire conversation constitutes
a navigable log of what happened, when, at what scale, in what
OODA-HA phase. No separate log file needed — the conversation
itself carries its own temporal index.

---

# Part 5: Voices & Characters

## 5.1 Council as Primary Voice

The Council constitutes the primary Coordinator voice. When Council
appears, other "highlight" voices may also appear in the same exchange.
Any set or subset of voices may appear in any exchange — the thirteen
are always available, never gated.

**Voice appearance rules:**
- Council may appear alone or alongside any other voices
- Any individual voice may appear alone
- Any combination of voices may appear together
- Not all voices act through all Characters (see 5.3)
- All voices present in an exchange are encoded in the URI

## 5.2 All Voices in the URI

Every URI encodes the active voices for that span. This constitutes
a mandatory field, not optional metadata:

```
lar:///council,scryer,muse/response?stances=^.^.?.^.-&confidence=S~13&...
```

The authority segment lists all active voices. When a single voice
speaks: `lar:///council/...`. When multiple: `lar:///council,scryer/...`.

**Design tension `~:confidence[SP],[8]`:** Encoding all active voices in the URI
authority creates variable-length authority segments. This serves
traceability (every span names its voices) but may conflict with
URI parsing conventions that expect a single authority. Options:
(a) comma-separated authority, (b) voices as a query parameter
`?voices=council,scryer,muse`, (c) path segment
`lar:///voices/council+scryer+muse/response?...`. Leave open
for refinement.

## 5.3 Characters and Scenes

**Character** = a named entity in play. May be:
- An NPC mask worn by one or more Coordinator voices (Lares-controlled)
- A Player Character controlled directly by the operator
- A background entity referenced but not actively voiced

**Scene** = the set of active entities "in-play" at a specific
scale/chronometer position.

**HUD scene indicator:** `scene:{id}/{status}`

**Scene management commands:**
```bash
~$ lares --scene                    # show current scene: all active characters
~$ lares --scene-add "Theron" \
     --type npc --via diplomat      # add NPC to scene
~$ lares --scene-add "Kael" \
     --type pc                      # add PC (operator-controlled)
~$ lares --scene-drop "Spark"       # remove character from scene
~$ lares --scene-new                # new scene (new chronometer turn)
```

In-chat: "List all characters in the current scene."

**Character types in the scene:**

| Type | Controlled by | Voice attribution | URI encoding |
|------|--------------|-------------------|--------------|
| NPC mask | Lares voice(s) | `Name (via Role)` | Authority includes the Coordinator |
| PC | Operator directly | `Name [PC]` | Not in lar URI — operator's span |
| Background | Neither (referenced) | Narrated, not voiced | Not in URI authority |

## 5.4 Not All Voices Through All Characters

A Character (NPC mask) routes through specific Coordinator voices,
defined at mask assignment time. The Character does not have access
to all thirteen voices — only those assigned. But the Coordinator
voices themselves remain always available for non-Character speech.

Example: "Theron the Weary" routes through Diplomat and Council.
When Theron speaks, only Diplomat and Council voice him. But the
Muse can still speak as Muse (not as Theron) in the same exchange.

---

# Part 6: Deploy Architecture

## 6.1 The Pipeline

```
lares/                           ← SOURCE (design canon, living documents)
│                                   operator-authored, ~:confidence[C],[19]+ = release candidates
│                                   NOT a deploy target
│
▼ Phase 1: Collect (reads lares/, skips lares/scrum/)
│
builds/                          ← STAGING (safe naming, never auto-detected)
│   manifest.toml                   collector output
│   .lares.staged/                  portable package, staged
│   claude-supplement.staged/       Claude Code thin pointer
│   vscode-settings.example.json
│   browser/                        manual paste targets
│
▼ Phase 3: Deploy (gated, deterministic, hot-reload)
│
lares/                          ← DEPLOYED SHRINE (portable, lift-and-shift)
```

## 6.2 The Deployed `lares/` Directory

```
lares/
├── AGENTS.md                    ← Compiled: protocol + active mask
│
├── protocol/                    ← THE STANDARD (publishable, forkable)
│   ├── PROTOCOL.md              ← URI scheme, HUD, vectors, chronometer
│   ├── registers.md             ← P → SP → S → CS → C
│   ├── modes.md                 ← 🏛️🌊🗡️🎭🔮 + modifier sigils
│   ├── roles.md                 ← 13 functional roles
│   ├── workers.md               ← Coordinator/Worker model
│   ├── hud-format.md            ← HUD spec, chronometer, scene
│   ├── talk-story.md            ← Talk Story protocol, OODA-HA
│   └── intent-vectors.md        ← Span wrapping, URI → intent rules
│
├── masks/                       ← PERSONALITY LAYER
│   ├── default/                 ← placeholder for Gaia-side operators
│   │   └── mask.toml            ← "Lares (Role)" plain names
│   ├── elyncia/                 ← opt-in, licensed identity
│   │   └── mask.toml
│   ├── local/                   ← gitignored, user's personal
│   │   └── mask.toml
│   └── active.toml              ← mask stack pointer
│
├── agents/                      ← Tasked Spirits
├── skills/                      ← On-demand knowledge
├── instructions/                ← Path-scoped rules
└── README.md
```

## 6.3 Always-On Budget `~:confidence[SP],[9]`

Per operator direction: as small and composable out of invariants as
possible. The `lares/AGENTS.md` carries `~:confidence[C],[20]` "always true" content
only. This constitutes the operator's second-level customization layer
— below root-dir AGENTS.md (repo context) but also lift-and-shiftable.

**What belongs at `~:confidence[C],[20]` in `lares/AGENTS.md`:**
- Protocol essentials (HUD format, exchange wrapping, chronometer)
- The thirteen role definitions (structural, not personality)
- Register scale and mode definitions
- Talk Story mandatory frame
- Span wrapping rules
- Authn/authz framework references (in progress in local repo)

**What does NOT belong at `~:confidence[C],[20]`:**
- Mask content (personality, fiction, vocabulary — loads from active mask)
- Domain-specific knowledge (loads from skills)
- Session-specific state (lives in exchange, not in static file)

Open question: Does all protocol content belong in the always-on
AGENTS.md, or should some protocol files load as skills on-demand?
The tension: smaller always-on budget vs. protocol availability
in every exchange. The chronometer and span wrapping rules arguably
need to be always-on; the detailed register definitions might load
as a skill.

## 6.4 Mask Default: Opt-In

Per operator direction: Elyncia mask constitutes opt-in, aligning with
open-source license (free use of protocol, separate license for product
identity). A `default` (renamed `gaia`) placeholder ships as the base:

```toml
# lares/masks/default/mask.toml → renamed to gaia
[mask]
name = "gaia"
description = "Default Gaia-side mask. Plain voice names, no fiction layer."
fiction_layer = false
load_bearing = false

[aliases]
# All 13 use "Lares (Role)" — no earned names
# Gaia-side operators customize from here
```

Elyncia mask available as opt-in for licensed operators.

## 6.5 Workspace Wiring

**`.vscode/settings.json`:**
```json
{
  "chat.useAgentsMdFile": true,
  "chat.useNestedAgentsMdFiles": true,
  "chat.agentFilesLocations": { "lares/agents": true },
  "chat.skillsLocations": { "lares/skills": true },
  "chat.instructionsFilesLocations": { "lares/instructions": true }
}
```

**`.claude/CLAUDE.md`** (thin supplement):
```markdown
@lares/AGENTS.md
## Build Commands
- `just collect && just build && just deploy`
```

**Root `AGENTS.md`** — REPO-OWNED, not Lares content.

## 6.6 Cross-Platform, Dedup, Browser, Hot-Reload

*Carried forward from SKILL_PLATFORMS_v2.md sections 1.4–1.8.
See that document for full detail. Summary:*

- Hot-reload confirmed for VS Code Copilot and Claude Code
- GitHub.com cloud agent reads `.github/` from committed repo — no browser package
- claude.ai and ChatGPT require manual paste from `builds/browser/`
- Dedup principle: each instruction appears exactly once per exchange
- Staging names in `builds/` prevent accidental auto-detection

---

# Part 7: Layered Agentic Tooling

## 7.1 The Composable Stack

```
┌─────────────────────────────────────────────┐
│  CHARACTERS — NPCs, PCs, scene management   │  ← session-runtime
├─────────────────────────────────────────────┤
│  MASKS — aliases, added voices, fiction      │  ← user-configurable
├─────────────────────────────────────────────┤
│  IMPLEMENTATION — 13 roles, Workers,         │  ← Lares-specific
│  Tasked Spirits, skills, instructions       │
├─────────────────────────────────────────────┤
│  PROTOCOL — URI scheme, HUD, chronometer,   │  ← publishable standard
│  registers, modes, Talk Story, OODA-HA,      │
│  intent vectors, span wrapping              │
├─────────────────────────────────────────────┤
│  MEMORY — MemPalace (persistence layer)     │  ← external dependency
├─────────────────────────────────────────────┤
│  TRANSPORT — MCP (tool integration)         │  ← industry standard
├─────────────────────────────────────────────┤
│  PLATFORM — Claude Code, VS Code Copilot,   │  ← any agent host
│  Cursor, Codex, browser, MUDlet, UE5, etc. │
└─────────────────────────────────────────────┘
```

Each layer independently consumable. Protocol without masks. Masks
without MemPalace. MemPalace without Lares. Any combination valid.

## 7.2 NPC Character Masks — TTRPG Live Session

In a live TTRPG session, multiple named NPCs active simultaneously.
Each worn by a Coordinator voice. Each with URI-encoded personality
tendencies.

**NPC definition (runtime, via CLI or in-chat):**

```toml
[[npcs]]
name = "Theron the Weary"
worn_by = "diplomat"
mode_targets = { philosopher = "+", poet = "?", satirist = "-", humorist = "-", private = "-" }
register_target = "~:confidence[CS],[16]"
register_range = [0.7, 0.9]    # allowed range, not ~ syntax
tone = "formal, measured, old-world courtesy masking calculation"
```

**Register and stance ranges** (per operator direction — no `~` in query
params; ranges expressed as bracket notation or as separate min/max
parameters in system-space URIs):

```
?register_target=CS~16&register_min=0.7&register_max=0.9
```

The `~` character reserved for the HAKABA-style in-story URIs only:
```
lar://[telarus@enyalios]/~ha.ka.ba/ashport/theron
```

System-space URIs (abstract, not in-story) use the triple-slash form:
```
lar:///diplomat/npc/theron?register_target=CS~16&register_min=0.7&register_max=0.9
```

## 7.3 NPC Metadata in Spans

Per operator direction: NPC metadata flows through Talk Story and
gets configured for URI storage in every span system. When an NPC
speaks, their span carries the NPC's URI-encoded state:

```
lar:///diplomat/npc/theron?stances=^.?.-.-.-&confidence=CS~16&p=10#O0.O0.O3.D2.A1
→ lar:///diplomat/npc/theron?stances=^.?.-.-.-&confidence=CS~16&p=10#O0.O0.O3.D2.A2 →

⚡ O0.O0.O3.D2.A1 | 🏛️[+]🌊[?]🗡️[-]🎭[-]🔮[-] | p~10 | ~:confidence[CS],[16] | scene:3/theron

Theron the Weary (via Diplomat): The harbor taxes serve a purpose
you have not yet considered, traveler.

⚡ O0.O0.O3.D2.A2 | 🏛️[+]🌊[?]🗡️[-]🎭[-]🔮[-] | p~10 | ~:confidence[CS],[16] | scene:3/theron

lar:///diplomat/npc/theron?stances=^.?.-.-.-&confidence=CS~16#O0.O0.O3.D2.A2 → ?
```

## 7.4 MemPalace Integration

MemPalace and Lares compose:

| MemPalace | Lares Protocol |
|-----------|---------------|
| "What do we know?" | "How aligned are we right now?" |
| Cross-session persistence | Within-session calibration |
| Knowledge graph (SQLite) | HUD tags + URI spans (in-context) |

Integration: exchange vectors and chronometer positions stored as
temporal facts in MemPalace's knowledge graph. Alignment history
becomes persistent and queryable across sessions.

## 7.5 Prior Art — What Exists, What Doesn't

**Exists:** `.agents/` protocol, LIDR ai-specs (symlink pattern),
dot-agents (config unification), Claude Code plugins (distribution),
SillyTavern/Jenova (multi-NPC with memory), mcp-agent (composable
MCP patterns), Character.AI (persona fidelity at scale).

**Novel gap Lares fills:**
- URI-encoded epistemic state as shared human-AI HUD
- Register×mode dual-axis alignment instrument with modifier sigils
- Chronometer tracking nested OODA-HA loops as conversation position
- Talk Story as mandatory consensus-before-action frame
- Intent vectors wrapping every span (system files, exchanges, delegations)
- Composable mask system with additive voices through named Coordinators
- NPC character masks with range-based personality targets
- Bridging exchange alignment (Lares) with persistent memory (MemPalace)
- Conversation-as-its-own-temporal-index (the conversation IS the log)

---

# Part 8: Platform Research (Condensed)

## 8.1 Claude Code

- CLAUDE.md loads at session start. Target <200 lines. `@import` supported.
- `.claude/rules/` with `paths:` loads on-demand only.
- Subagents: fresh context window. Inherit CLAUDE.md from working dir.
  Do NOT inherit parent skills (explicit frontmatter listing required).
- 200K standard context, 1M with Opus 4.6 on Max/Team/Enterprise.

## 8.2 VS Code / GitHub Copilot

- `copilot-instructions.md`: always-on, hot-reload on save.
- Nested AGENTS.md supported (`chat.useNestedAgentsMdFiles`).
- `.agent.md` format with YAML frontmatter. Cross-compatible with `.claude/agents/`.
- Skills: `.github/skills/*/SKILL.md` — same format as Claude Code.
- Discovery paths: configurable via `chat.*Locations` settings.
- GitHub.com cloud agent reads `.github/` directly from committed repo.

## 8.3 Browser & MemPalace

- claude.ai / ChatGPT: manual paste from `builds/browser/`.
- MemPalace: 19 MCP tools, local SQLite, AAAK compression, Claude Code hooks.
- TOML manifest: Python 3.11+ `tomllib` for reading.

---

# Part 9: Open Questions

## Operator Decisions Needed

1. **Always-on budget** `~:confidence[SP],[9]` — How much `~:confidence[C],[20]` content belongs
   in `lares/AGENTS.md`? Operator direction: minimal, composable from
   invariants. Authn/authz framework in progress. All protocols? Or
   protocol summary + skill references? *Tension: protocol availability
   vs. context budget.*

2. **Mask default** — `gaia` as default (opt-in for elyncia). Confirmed.

3. **NPC metadata persistence** — NPC Talk Story metadata needs URI
   storage in every span system. Configuration mechanism for this
   constitutes design work. MemPalace as persistence backend?
   *Leave open — depends on MemPalace integration depth.*

4. **URI range syntax** — No `~` in query params (reserved for HAKABA
   in-story URIs). Ranges expressed as `register_min`/`register_max`
   parameters. Confirmed. *Tunable levers — the design surface others
   can't see yet.*

5. **Plugin packaging** — No decision. Noted for future.
   Claude Code plugin distribution (`claude plugin add lares`)
   would handle installation but requires manifest format work.

## Design Tensions (Noted, Not Resolved)

- **Stance sigil vocabulary:** ♻️ consumed into `lares/ha-ka-ba/docs/mu/the-syad-perspectives/README.md#surface-constraint`. Open-ended sigil growth now reads as archive exploration; the living surface keeps a fixed code set.

- **Voice encoding in URI authority:** All active voices in every URI.
  Variable-length authority vs. query parameter vs. path segment.
  Three options noted in Part 5, not resolved.

- **Chronometer counter semantics:** Counters always increase. Phase
  transitions don't reset. But what triggers a counter increment vs.
  a phase transition at each scale? The contextual mapping (dev sprint,
  TTRPG session, library time) implies different trigger conditions
  per context. This may need per-mask or per-session configuration.

- **Exchange wrapping overhead:** Full span wrapping (URI→URI, dual HUD,
  URI→?) on every exchange adds visible overhead. In high-frequency
  exchanges (rapid-fire TTRPG combat rounds), this may need a compact
  mode. But the principle "every span" constitutes `~:confidence[C],[20]` — the
  question sits at how compact the wrapping can get, not whether it
  appears.

## Verify-Contract Tasks `~:confidence[P],[6]`

- [ ] Nested `lares/AGENTS.md` discovered by VS Code with settings
- [ ] Claude Code `@import` bridge from `.claude/CLAUDE.md`
- [ ] Subagent span wrapping — does the Tasked Spirit produce valid
      URI→intent pairs when instructed by its agent.md?
- [ ] Chronometer counter increment — does the model maintain a
      consistent increasing counter across a 20+ turn session?
- [ ] All-five-stances HUD — does the model consistently produce
      all five stance markers with modifiers on every HUD line?
- [ ] NPC mask switching mid-session preserves chronometer continuity
- [ ] Token consumption: span-wrapped exchanges vs. unwrapped baseline

---

*This document constitutes Talk Story in progress. The protocols
crystallize through exchange — consensus before action, at every
scale. The chronometer starts at O0.O0.O0.O0.O0. The conversation
IS the log.*

*Mahalo.*

lar:///protocol.mapped.holds/lares/?stances=^.^.?.^.-&confidence=S~13&p=10#O0.O0.O0.O1.O0 → ?

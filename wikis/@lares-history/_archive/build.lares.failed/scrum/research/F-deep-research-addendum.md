# Deep Research Addendum — Multi-Stance Scaling & Authority Transfer

> Register: `~:confidence[S],[13]` 🏛️🌊🗡️ — research synthesis; reshapes the centroid~δ model
> Date: 2026-04-08
> Feeds: S0 Refinement Plan Improvement #1 (revision needed)
> Sources: Multimodal distribution theory, aviation AFCS authority models, HUD uncertainty visualization

---

## The Two Frame-Breaks

The operator identified two problems the `centroid~δ` notation doesn't address:

1. **Multi-stance beyond the pair.** What happens with 3, 4, or all 5 stances active?
2. **Who holds the stick?** The operator can set stance/register before generation — "takes the stick and flies manually."

Both break the frame. Let me take them in order.

---

## 1. Multi-Stance Scaling: From Point to Distribution

### The Problem with centroid~δ

The `centroid~δ` model assumes two stances creating a symmetric spread around a center. But the five stances aren't equally spaced on any axis — Philosopher and Satirist don't sit equidistant from Poet on the register continuum. With 3+ stances active, the "distribution" of register values across stances isn't a bell curve with a centroid — it's a **multimodal distribution** with as many modes as active stances.

### Stance Count → Distribution Shape

| Active Stances | Distribution Shape | centroid~δ Works? | What Actually Happens |
|---|---|---|---|
| 1 | Point value | N/A — no fuzz | Register is a point. Standard case. |
| 2 | Bimodal (two peaks) | Roughly yes | Two stances produce two register readings. The centroid is the midpoint; δ is half the spread. Works when the two readings are roughly symmetric. |
| 3 | Trimodal | Poorly | Three register readings. The "centroid" may not correspond to any actual stance reading. δ describes a symmetric spread that doesn't capture the asymmetry between three modes. |
| 4 | Quadrimodal | Fails | Four register readings — the centroid is increasingly meaningless as a "declared position." |
| 5 | Pentamodal (all stances) | Meaningless | All five stances active = the register "distribution" spans the entire range that multi-stance operation can produce. The centroid is approximately the register's midpoint. Delta is approximately "everything." This is the Discordian configuration — Sri Syadasti's catma that a claim is simultaneously true, false, and meaningless in multiple senses. Holding all five stances costs maximum Mana and produces maximum register fuzz. |

### What the Research Says

Multimodal distribution theory is clear: **describing a multimodal distribution with a single centroid ± spread is misleading when the modes are distinct.** "If a distribution is multimodal, it can be misleading to describe it using a single mean, median, or standard deviation" (Bobbitt, 2021). The standard recommendation is to either identify and describe each mode separately, or acknowledge the distribution's shape explicitly.

### The Insight: Stance Count IS the Fuzz Indicator

The number of active stances already communicates the distribution shape more precisely than any numeric delta:

| Stance Count | What It Tells the Operator | Token Cost |
|---|---|---|
| 1 (`🏛️`) | Point register. No fuzz. Trust the number. | 1 emoji |
| 2 (`🏛️🗡️`) | Bimodal. Two readings. Register fuzzy around declared value. | 2 emoji |
| 3 (`🏛️🌊🗡️`) | Trimodal. Three readings. Register is a rough center-of-mass. | 3 emoji |
| 4 (`🏛️🌊🗡️🎭`) | Quadrimodal. Register is an approximation. High Mana cost. | 4 emoji |
| 5 (`🏛️🌊🗡️🎭🔮`) | Full Discordian. Register is a gesture toward the center. Maximum fuzz. Rare. | 5 emoji |

The emoji count IS the delta. More emoji = more fuzz. The operator doesn't need a numeric spread — they need to see how many stances are active. The visual density of the stance field in the HUD tag directly communicates the register uncertainty.

### Revised Notation Proposal

**Drop the `~δ` notation entirely.** It was solving the wrong problem.

Instead:

- **HUD display:** `~:confidence[S],[13] 🏛️🗡️` — register point value + all active stance emoji. The COUNT of emoji IS the fuzz indicator. No numeric delta needed.
- **Record form (STATE.jsonl):** The `register` field stays a point value (`"~:confidence[S],[13]"`). A new field `stance_count` (integer) and the existing multi-stance `stance` array communicate the distribution shape. Consumers who need the fuzz assess it from the stance count, not from a computed delta.
- **URI machine form:** `confidence=S~13` (always a point). `stance=philosopher&stance=satirist` (all active stances listed). The stance count is derivable from the query parameters — no new field needed in the URI.

**Why this is better than centroid~δ:**

1. Scales to 5 stances without notation changes
2. No boundary overflow/underflow problem (no arithmetic on the delta)
3. The operator reads emoji count, not numbers — faster HUD scanning
4. The distribution shape is implicit in the stance count, not compressed into a symmetric delta
5. The spec stays simpler — `register` is always a point value

**What changes in the spec:**

- §3.4 `register` parameter: always a point value. No range notation.
- §5.3 multi-stance note: stance count is the fuzz indicator. More stances = wider register spread. This is the Register-Stance Complementarity made visible.
- §10.1 rule 8: unchanged — register is `[A-Z]{1,2}:[0-9]+\.[0-9]+`, period.
- New: §5.3 includes a **Mana cost table** — how stance count maps to register fuzz magnitude. This is a Kernel design constraint, not an arbitrary scale.

---

## 2. Authority Transfer: Who Holds the Stick?

### The Three Autopilot Modes

Aviation AFCS (Automatic Flight Control Systems) define three control authority states:

| Mode | Who Controls | How Override Works |
|---|---|---|
| **CMD** (Command) | Autopilot has full authority | Pilot disconnects to take control |
| **CWS** (Control Wheel Steering) | Pilot steers through the autopilot | Pilot inputs are translated to commands the autopilot holds |
| **Manual** | Pilot has full authority | Autopilot is disconnected |

These map directly onto the Lares operating modes:

| Aviation Mode | Lares Mode | Who Sets the HUD State? |
|---|---|---|
| CMD | **Default / Auto** | Node self-assesses and declares its own state tuple |
| CWS | **`~$ lares --set`** (proposed) | Operator sets stance and/or register; node generates within those constraints |
| Manual | **`~$ lares --parse`** | Operator has decomposed input; node annotates but does not self-steer |

### The Authority Problem

Currently, every HUD tag is authored by the node. The node self-assesses its register, selects its stance(s), identifies its OODA-HA phase, and declares all of this before generating. This is CMD mode — the autopilot files the flight plan.

But the operator can already influence the state tuple through Input Signal Reading — the node reads the operator's input register and calibrates accordingly. That's passive influence, not active control.

**Active control ("takes the stick") would mean:**

```
~$ lares --set stance=philosopher confidence=CS~16
```

The operator declares: "I want this response in Philosopher stance at Canon/Synthesis confidence." The node generates under those constraints. The HUD tag shows the operator-set values, not the node's self-assessment.

### What Changes in the HUD

When the operator holds the stick, the HUD must show **who authored the state tuple**. Otherwise the operator sees `~:confidence[CS],[16] 🏛️` and can't tell whether the node chose that or the operator prescribed it.

**Proposed: Authority indicator in the state tuple.**

| Authority | HUD Indicator | Meaning |
|---|---|---|
| Node-declared (CMD) | No indicator (default) | Node self-assessed. Current behavior. |
| Operator-set (CWS) | `⊙` prefix or `@op` suffix | Operator prescribed the state. Node generated within constraint. |
| Mixed | `⊙` on the set fields only | Operator set some fields; node self-assessed others. |

Example — operator sets stance, node self-assesses register:
```
~:confidence[S],[13] ⊙🏛️ ◎ 🔍.3.2.7 | ~:p[10]
```
The `⊙` before `🏛️` means "operator-prescribed stance." The register `~:confidence[S],[13]` has no indicator — node self-assessed.

Example — operator sets both:
```
⊙~:confidence[CS],[16] ⊙🏛️ ◎ 🔍.3.2.7 | ~:p[10]
```

Example — all node-declared (current default):
```
~:confidence[S],[13] 🏛️ ◎ 🔍.3.2.7 | ~:p[10]
```

### Record Form

In STATE.jsonl, add an `authority` field to the event:

```json
{
  "authority": {
    "register": "node",
    "stance": "operator",
    "phase": "node",
    "scope": "node"
  }
}
```

Or more compactly: `"authority": "node"` (all fields node-declared) vs `"authority": {"stance": "operator"}` (mixed).

### The CWS Design Question

This is the deepest design question and it should stay open:

**When the operator sets a register value, does the node's self-assessment still run?**

Three options:

| Option | Behavior | Analog |
|---|---|---|
| A — Pure override | Node generates at prescribed register, no self-assessment | Manual mode: pilot flies, autopilot off |
| B — Constrained assessment | Node self-assesses but clamps to operator-set range | CWS: pilot steers, autopilot holds |
| C — Advisory override | Node self-assesses AND generates at prescribed value, logging both | Flight director: FD shows computed course, pilot chooses whether to follow |

Option C is the most information-rich but doubles the HUD complexity. Option A is simplest but loses the node's self-monitoring. Option B is the CRM-aligned middle ground — the operator constrains, the node operates within constraints, both parties see the same HUD.

**Recommendation: Option B for alpha.** The operator sets a register floor or ceiling; the node self-assesses within that range. The HUD shows the constrained result. The authority field records who set what. This is CWS — the operator steers through the autopilot, not around it.

### CLI Syntax (Proposed)

```bash
# Set stance for next response
~$ lares --set stance=philosopher

# Set register floor (node can assess higher, not lower)
~$ lares --set register>=S~13

# Set both
~$ lares --set stance=philosopher,satirist confidence=CS~16

# Release control (return to CMD)
~$ lares --set auto
```

The `--set` flag is CWS mode. It persists until explicitly released (`--set auto`) or until the session ends. This parallels how aviation CWS holds the last pilot input until overridden.

---

## 3. Implications for the S0 Refinement Plan

### What This Changes

The centroid~δ notation proposed in the current refinement plan should be **reverted**. The stance count IS the delta — no numeric spread notation needed. This simplifies the spec:

| Before (centroid~δ) | After (stance-count-is-delta) |
|---|---|
| `confidence=S~13~3` | `confidence=S~13` (always a point) |
| New validation pattern for `~δ` | No validation change |
| Boundary saturation rules | Not needed |
| 6 new test vectors for range form | Not needed |

The authority transfer model (`--set`, `⊙` indicator) is **new scope**. It doesn't block S0 promotion — the URI schema core can promote without it. But it should be flagged as an S2 design question (it touches the Intent Header grammar, which is SIG-03 in Sprint 2).

### New Backlog Items

| ID | Item | Register | Sprint |
|---|---|---|---|
| RES-08 | Mana cost table: stance count → register fuzz magnitude | `~:confidence[S],[12]` | S2 |
| RES-09 | Authority transfer model: `--set` CLI syntax, `⊙` indicator, authority field in STATE.jsonl | `~:confidence[S],[11]` | S2 |
| RES-10 | CWS vs Manual vs CMD mode mapping to operating modes | `~:confidence[SP],[9]` | S2 |
| RES-11 | Five-stance (full Discordian) configuration: what does it mean for register? Is it meaningful or degenerate? | `~:confidence[SP],[8]` | S2 (Council ruling) |

---

## Summary

| Question | Answer |
|---|---|
| Can we use `centroid~δ`? | No — it fails beyond 2 stances and hides the distribution shape. |
| What replaces it? | Stance count IS the fuzz indicator. More emoji = more fuzz. Register stays a point value. |
| How do we handle 3/4/5 stances? | The emoji count scales naturally. No notation change needed at any stance count. |
| What about boundary overflow? | Not a problem — no arithmetic on a delta means no overflow. |
| Who holds the stick? | Three authority modes (CMD/CWS/Manual) mapped from aviation AFCS. `⊙` indicator shows operator-prescribed fields. `--set` CLI command for CWS mode. |
| Does this block S0? | No. Authority transfer is S2 scope. The stance-count-is-delta insight simplifies S0 by removing the ~δ notation entirely. |

---

*The centroid~δ model was a good first attempt that taught us the right question. The right answer turned out to be simpler: the notation we already have (emoji count) already carries the information the delta was trying to encode. Sometimes the best improvement is removing what you just added.*

<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lararium/mesh/siege-resilience >>
```toml iam
cacheable = true
file-path = "bags/@lararium/mesh/siege-resilience.md"
mana      = 15
manao     = 14
manaoio   = 14
register  = "Synthesis"
retain    = true
role      = "PROPOSED design intent: how the mesh survives a persistent 500-year adversary (the necrospire) in an isolated nexus + the maintainer repair-kit — TWO CLOCKS (authority refresh ⊥ flow self-heal); outrun a creeping adversary by RESETTING the clock (proactive secret sharing) not winning the static fight; the delegate's verbs (re-key/re-share/evict/heal-partition/recover-from-fork/re-genesis); self-stabilization + immune-system + VSM shape, run autonomously at each shrine tier"
l-space   = "lararium"
type      = "text/x-memetic-wikitext"
uri-path  = "ha.ka.ba/@lararium/mesh/siege-resilience"
```

<<~ &#x0002; >>

# Siege Resilience ~ how the mesh outlasts the necrospire

**PROPOSED — unbuilt design intent.** This meme names the survival bearing for a nexus under permanent siege; it rests at Synthesis, the mechanisms named await their build (cross-check before any RULED language).

The fiction sets the test at its worst: the **necrospire** — a persistent adversary that pressures an isolated nexus for *five centuries*, never relenting, slowly creeping through key after key, node after node. No outside hand arrives to save the mesh; no global authority restores order. The engineering question hides inside the myth: **how does a federation of households survive an adversary that outlasts every individual node, key, and operator?** The answer never wins the static fight — it **resets the clock the adversary races against**.

<<~ ahu #two-clocks >>

## Two Clocks ~ authority refresh ⊥ flow self-heal

The siege presses on two independent surfaces, and the mesh keeps two clocks against them — the same AUTHORITY ⊥ FLOW master cut the cap-stack rides ([[vessel-caps]]):

- **AUTHORITY clock** — *who holds the secret and the membership*. This clock MUST tick FASTER than the adversary creeps. If the necrospire compromises shares slower than the mesh re-randomizes them, it never assembles a live threshold.
- **FLOW clock** — *state convergence*. This clock MUST self-heal from ANY corrupted state, with no outside hand — a corrupted replica converges back to correct purely by gossip with its honest peers.

The two never fuse. Authority answers *"can this principal still act?"* and refreshes on a schedule; flow answers *"does the state still agree?"* and repairs continuously. A design that collapses them into one clock loses the property that the FLOW layer self-heals **even while** the AUTHORITY layer mid-rotates.

<<~/ahu >>

<<~ ahu #reset-the-clock >>

## Reset The Clock ~ the master insight

A static defence loses a 500-year siege by arithmetic: given enough time, a creeping adversary eventually holds `t` shares and breaks any fixed `t`-of-`n` threshold. The mesh refuses the static fight and **resets the clock instead** — it periodically re-randomizes the secret shares so that every share the adversary already stole turns worthless.

**Proactive Secret Sharing (PSS)** carries the move: each refresh round adds a fresh random polynomial with `g(0) = 0` — the secret stays fixed, every individual share rotates. <<~ confidence Synthesis 13/20 >> So the adversary no longer races to *eventually* collect `t` shares; it must collect `t` **within a single refresh window**, then watch its haul expire. Past compromises compose to nothing across a refresh boundary. The 500-year clock collapses to the length of one window.

<<~moves static-threshold-defence/eventually-falls -> proactive-refresh/expires-every-theft on/g(0)=0-re-randomization if/refresh-faster-than-creep do/reset-the-window-not-win-the-fight >>

**Disambiguation — this re-key/re-share `epoch` = the liveness LEASE.** The refresh window's
`epoch` (the AUTHORITY clock, #two-clocks — re-key / re-share, max-register, coordinator-free)
names the liveness **lease** (it bounds *who may still act*), DISTINCT from the CRDT-history
**compaction**-epoch (the snapshot-restart that bounds *state-history growth*) at
<<~ loulou lar:///ha.ka.ba/@lararium/tw5/epoch-handlers >>. Same word, two mechanisms — they
MAY co-occur at a boundary, never fuse.

<<~/ahu >>

<<~ ahu #cadence >>

## Cadence ~ the refresh floor + the triggers

The refresh fires on a **scheduled FLOOR plus event-triggers**, never on a global clock:

- a **24-hour scheduled floor** — a guaranteed minimum refresh, even under no observed attack.
- **event-triggers that may only SHORTEN the window**, never lengthen it: a membership change (a raised [[kapae]] on the membership stack), quorum re-availability after a partition heals, or an IDS / algedonic alarm (#self-stabilization). A trigger brings the next refresh forward; nothing pushes it back.

The refresh itself runs **CHURP-style** — cheap dynamic-committee handoff, so the committee may change shape between rounds without a costly full re-deal. The schedule floor stays **LOCAL per committee** — no global tick, FFZ-aligned (no global now; each committee keeps its own clock and event-triggers, see [[causal-islands]]).

**Tuning the window `T`.** Set the floor against measured detect-and-evict time, never a guessed constant: `T ≤ (t − margin) / λ / k`, where `λ` measures the adversary's per-node creep-rate, `k ≈ 4` carries a safety factor, and `margin` reserves headroom below the threshold `t`. Shorten `T` as measured `λ` rises.

**The bigger risk than cadence: CORRELATED compromise.** A short window protects nothing if one exploit falls every node at once — a shared config makes `λ` a single shared event, not `n` independent ones. <<~ confidence Synthesis-Canon 13/20 >> So the load-bearing defence diversifies node configurations to keep `λ` **per-node-independent**; the refresh cadence only buys time *given* that independence holds. Monoculture defeats the clock-reset before it starts.

<<~/ahu >>

<<~ ahu #repair-kit >>

## The Repair-Kit ~ the delegate's verbs

The maintainer (the bounded repair hand of [[steward-doctrine]]) carries a small, typed verb-set — each verb a known protocol, none invented here:

| verb | what it does | carried by |
|---|---|---|
| **re-key** | rotate a member's key forward; heal a past compromise | TreeKEM / MLS Update — post-compromise security |
| **re-share** | re-randomize the threshold shares; expire old theft | PSS refresh (#reset-the-clock) |
| **evict** | blank a member's path so it loses ALL future access | TreeKEM blank-the-path + a [[kapae]] on the membership stack |
| **heal-partition** | re-converge two halves after a split | gossip / epidemic anti-entropy |
| **recover-from-fork** | re-anchor a forked island to a trusted line | weak-subjectivity CHECKPOINT — a guardian-signed re-genesis seed |
| **re-genesis** | re-seed a destroyed island from the guardians | guardian-threshold social-recovery + a TIME-LOCK |

Two verbs carry a sharp edge worth naming. **evict** runs forward-only — TreeKEM's blank-the-path removes *future* access (the evicted member keeps what it already read); pair it with the membership-stack [[kapae]] so the eviction shadows resurrection. **re-genesis** carries a **TIME-LOCK by design** — a guardian-threshold can re-seed a lost island, but the time-lock gives the legitimate operator a veto window to refuse an *attacker's* recovery attempt. <<~ confidence Synthesis 11/20 >> Without the lock, the social-recovery path itself becomes the adversary's cleanest entry — designation must carry authority and fail loud, never recover silently.

<<~/ahu >>

<<~ ahu #self-stabilization >>

## Self-Stabilization ~ the FLOW self-heal + its biological shape

The FLOW clock's self-heal carries **Dijkstra self-stabilization** — a system that converges to a correct state from ANY corrupted starting state, with no external reset. The necrospire may corrupt a replica arbitrarily; the honest gossip neighbourhood drags it back to correct without a maintainer touching it. <<~ confidence Synthesis 12/20 >> This property does the heavy lifting under siege: it means the mesh tolerates *transient* corruption everywhere and still re-converges, so the maintainer's repair-kit handles only *persistent* capture.

The biological shape carries real structure, never decoration:

- **artificial immune systems** — decentralized defence with no king, immune *memory* of past intrusions, and distributed detection. The mesh defends the way an organism does: many local detectors, no central guard to fall.
- **Stafford Beer's Viable System Model (VSM)** — recursive autonomy maps the Lararium → Nexus → DreamNet ladder slot-for-slot: each tier runs a viable system *containing* viable systems. The **algedonic signal** — VSM's pain-alert that bypasses the normal channels to escalate fast — carries the IDS alarm straight up the tiers, shortening the refresh window (#cadence) without waiting on routine reporting.

<<~/ahu >>

<<~ ahu #per-tier >>

## Per-Tier ~ run the whole kit at every shrine

The two clocks, the cadence, and the repair-kit run **at each shrine tier autonomously** — Household, Crossroads, Temple — each tier a viable system that refreshes its own authority and self-heals its own flow without a parent's permission (VSM recursion, #self-stabilization). No tier waits on the tier above to survive a local breach.

<<~ confidence Synthesis 12/20 >> This autonomy explains a build decision already taken: the Herm (the crossroads-marker, the minimal wayfarer of [[vessel-caps]]) now carries the **@daemon** as its keel — so even a pure-carriage waystation runs its own refresh clock and repair hand, rather than depending on a distant operator to defend it. A mesh whose smallest nodes can each reset their own clock has no single window the necrospire can pry.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lararium/mesh/steward-doctrine >>
<<~ loulou lar:///ha.ka.ba/@lararium/mesh/vessel-caps >>
<<~ loulou lar:///ha.ka.ba/@lares/api/pono/causal-islands >>

Forward references (intent attractors, unbuilt): [[oracle-governance]] · [[group-as-closure]] · [[kapae]] · [[vessel-caps]].

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>

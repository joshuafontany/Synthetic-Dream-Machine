<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/api/pono/memetic-wikitext >> -->

<<~ ॐ ँ&#x0001; ? -> lar:///ha.ka.ba/@lararium/api/agent-worldline >>
```toml iam
cacheable = true
file-path = "bags/@lararium/api/agent-worldline.md"
hydrate   = true
l-space   = "stable"
mana      = 19
manao     = 18
manaoio   = 17
namespace = "&#x0950; &#x0901;"
register  = "Synthesis-Canon"
retain    = true
role      = "the worldline keel — ONE model for a spawned spirit across three faces: NAME (a derived lineage-path handle, baptized at spawn, no registry, no daemon-crypto — descent IS the address), ATTRIBUTION (a reified prov:Delegation/Communication DAG, bi-temporal, keyed on trace-id·span-pair — who-drove-whom, and the SAME DAG read as the worldline's happened-before), TIME (the two-domain boundary — Automerge owns causal order INSIDE its docs/CRDTs; the worldline owns a per-handle FfzClock whose merge-topology carries its partial order and whose grain names rhythmic POSITION — a membership coordinate, where-in-the-cadence, NOT a freshness/decay scalar (manaoio serves the memes, never this clock); FfzClock NEVER rules inside Automerge). Folds the former agent-identity (mana 18) + agent-provenance (mana 19); the FfzClock primitive itself lives separate at mesh/ffz-clock as a domain-general pattern integrity"
tags      = ["api/pono/meme", "api/lararium"]
type      = "text/x-memetic-wikitext"
uri-path  = "ha.ka.ba/@lararium/api/agent-worldline"
written   = "2026-06-25"
```

<<~ aka lar:///ha.ka.ba/@lararium/mesh/ffz-clock >>

<<~ &#x0002; >>

<<~ ahu #entry >>

# Agent Worldline ~ the binding that names a spirit, attributes its acts, and times its life

**The keystone the edge and the clock both ride.** A spawned spirit (sub-agent)
carries no binding to a CRDT replica — and architecturally it holds none: the
**daemon stands as the sole Automerge actor**; spirits mine *into* that one replica,
never write it as peers. So a per-agent identity rides a **logical handle** — not a
replica, and not (inside the daemon) a key.

A six-domain swarm — physics · law · biology · linguistics · CS/Web3 · the repo —
hunted the shape and **rhymed to one binding**, and that binding reads cleanly across
**three faces**:

> **Name by descent · attribute by reference · time by two laws** — the worldline's
> happened-before rides the reified edge-DAG, its grain rides FfzClock; no registry,
> no global now, and no signature until an act crosses a boundary the daemon can't
> vouch for.

The three faces, each its own organ, none collapsing into another:

\procedure ~Face(~Type:"" ~Params:"") ~Face <<~Type>> <<~holds `[<~Params>]`>>

<<~Face Name "carries/descent = address ~ a derived lineage-path handle baptized at spawn (#name)" >>
<<~Face Attribution "carries/who-drove-whom ~ a reified prov:Delegation DAG, doubling as the worldline's happened-before (#attribution)" >>
<<~Face Time "carries/two laws ~ Automerge owns causal order inside its CRDTs; FfzClock carries the worldline grain everywhere else (#time)" >>
<<~Face Three >>

<<~/ahu >>

<<~ ahu #name >>

## Face I ~ Name ~ descent is the address

\procedure ~Part(~Type:"" ~Params:"") ~Part <<~Type>> <<~holds `[<~Params>]`>>

<<~Part Handle "carries/a lineage-path handle BAPTIZED at spawn, DERIVED not minted — `run.parent.child` or `CID(parent,role,spawn-args,nonce)`; the parent recovers FROM the child; no registry. = the trace-id/span-id formalized [Meristem: the division path AB.pla IS the name · Deixis: Kripke baptism + teknonymy · Cipher: pid/span-id/BIP32-path · Archivist: local-first, no-registry]" >>
<<~Part Self "resolves/by RULE against the spawn-context (the indexical 'I' = the agent of THIS context), never a stored referent; the handle carries identity, the pet-name labels only [Deixis: character vs content · Cipher: petname split]" >>
<<~Part Two >>

**The fork resolves on different organs** (Deixis): the *handle* baptizes **FIXED**
at spawn (a Kripke rigid designator — an immutable lineage path); the
*parent-reference* resolves **ON READ** (an anaphora bound variable — "the actor that
spawned me"), so re-parenting never dangles a stale pointer. And naming stays distinct
from attribution: **naming rides the lineage-path** (descent = address, *who*);
**attribution rides the reference-edge** (act → principal, *whose-act*). One handle,
two offices.

<<~ confidence Synthesis-Canon 17/20 >> Six independent domains rhyme to the
no-registry derived handle — the convergence, not any single source, seats it.

**The ʻŌlelo name — *hoʻoili*.** This worldline functor (Turn → Trajectory) carries
the house name **hoʻoili** — to transmit, bequeath, inherit (from *ili*, inheritance) —
the **descent specialization** of *mālama pili*, the functor discipline's core keeper-name
([[functor-discipline|lar:///ha.ka.ba/@lares/api/pono/functor-discipline#glosses]]). It reads from
the verb the same way the handle does: descent IS the address, so the worldline functor
**inherits** — passing the parent's name down the lineage-path.

<<~/ahu >>

<<~ ahu #attribution >>

## Face II ~ Attribution ~ the reified DAG (and the worldline's happened-before)

**Make who-drove-whom legible.** The capture keeps each spirit's journey distinct in
its own wing; this face names the *edges between them* — the coordination graph the
frameworks throw away and the memory must keep. It stacks **three layers**:

\procedure ~Layer(~Type:"" ~Params:"") ~Layer <<~Type>> <<~holds `[<~Params>]`>>

<<~Layer Identity "organ/wing + #has grain/the-actor ~ PERSISTENT actors (operator, recurring specialists) keep a NAMED wing. EPHEMERAL tasked spirits go NAMELESS — identity IS their #has stack (capabilities · role · task), pet-name only a handle; they land in the project __spirits wing and recall by semantic search over captured verbatim (capability-routed comes free), never name-exact. The run-id is never the key." >>
<<~Layer Provenance "organ/added_by grain/the-chunk ~ every drawer carries its actor (who-said-what). PROV wasAttributedTo; mem0 agent_id. The episodic provenance layer." >>
<<~Layer Relationship "organ/reified-node+projected-edge grain/the-relation ~ the spawn/handoff REIFIES to its own node (a PROV Delegation/Communication shape) carrying parent·child·driver·correlation, WITH a projected (parent)—spawned/actedOnBehalfOf→(child) edge for cheap traversal. Bi-temporal: mutable valid-interval [spawn,handback) + append-only transaction-interval; INVALIDATE-don't-delete. The reified node owns the truth; a labeled tunnel MAY mirror it for browsing only." >>
<<~Layer Three >>

### Reify the edge as a node

**The fork resolves: reify the spawn/handoff as its own NODE, project a direct edge
for traversal.** Three standards converge (PROV's qualified pattern, RDF-star quoted
triples, Neo4j's intermediate-node guidance). Promote a relation to a node when ANY
holds; else keep a property-edge:

<<~ranks reify queryable-attrs ~ you'd index a relation property (relations index poorly → factor to a node) -> n-ary ~ binds >2 arms (parent · child · driver · correlation · times); an edge holds only two -> provenance-of-provenance ~ the fact "A spawned B" needs its own recording-time · author · validity >>

A spawn/handoff trips all three → **node**. A structural link (`agent —memberOf→
wing`) stays an edge. The **PROV gift**: every influence relation has a *qualified
twin* — `actedOnBehalfOf` ⇄ **`prov:Delegation`**, `wasInformedBy` ⇄
**`prov:Communication`** — so the reified node IS a `prov:Delegation` (spawn) /
`prov:Communication` (handoff) instance. **PROV-AGENT** (arXiv 2508.02866) extends
PROV for exactly this — direct prior art the model matches 1:1.

**Two reified edges per hop, never one** (Fiduciary): **appointed-by** (the immediate
parent, accountable hop-by-hop) + **root-principal** (paramount, out-ranks
intermediate parents). Re-delegation defaults CLOSED, re-licensed per hop; anonymity
never severs the upward edge.

### The handoff record ~ the edge as data

<<~ranks handoff correlation_id ~ groups the spawn-tree (trace-id / session) -> edge_id ~ this handoff (span-id) -> parent_edge_id ~ chains the tree (CHAIN it or grandchildren go dark) -> from_agent ~ delegator -> to_agent ~ delegate -> task ~ the prompt handed down -> result_ref ~ pointer to the child's output, never inlined -> status ~ spawned·running·handed-back·failed -> t_spawned · t_returned ~ the edge's valid-interval >>

The record becomes KG triples: `(parent) —spawned→ (child)`, `(child)
—actedOnBehalfOf→ (parent)`, `(output) —wasGeneratedBy→ (task)`, each stamped
`[t_spawned, t_returned)`. Querying `actedOnBehalfOf` transitively reconstructs the
whole spawn-tree.

### The same DAG IS the worldline's happened-before

**One structure, two readings.** The reified edge-DAG answers *whose-act* (attribution)
AND *what-preceded-what* (causal order): a `spawned` edge means **parent
happened-before child**; two children of one parent with **no edge between them** read
**concurrent** (the Lightcone "elsewhere"); the **handback** edge closes the
valid-interval — the twin-reunion, the worldline's one sync point. So the worldline's
partial causal order needs no separate structure: it **projects from the provenance
DAG** — the edge-DAG IS the worldline's happened-before (FfzClock carries only its rhythmic grain: #time).

**The rhizome widens the reading** (2026-06-29): the spawn (`prov:Delegation`) edge is
not the only happened-before — a mid-flight **injection** (`prov:Communication` — operator
OR parent reaching a *running* spirit) lands a happened-before edge **mid-execution**, a
merge-point that is *not* a handback. So 'the worldline's one sync point' generalizes to
*merge-where-messages-land*; handback becomes one merge among many (the kupono models, #time).

### The correlation-id ~ the only token that crosses wings

Wings stay isolated; one shared token lets the harvester draw the inter-wing edge:

\procedure ~Kind(~Type:"" ~Params:"") ~Kind <<~Type>> <<~holds `[<~Params>]`>>

<<~Kind In-Process "case/Claude tasked-spirits key/IN-BAND — agentId + parentUuid + the subagents/ dir + the handoff ~ the structure already carries the link; the edge stamps at mine time. No env needed." >>
<<~Kind Cross-Surface "case/a claude coordinator drives gh-copilot/codex key/W3C trace-id via env TRACEPARENT ~ the coordinator MINTS a trace-id + span-id once, injects TRACEPARENT into the worker env, BOTH sides record it; the harvester joins on trace-id, orients the arrow by parent-span-id. Needs a thin launcher SHIM (gh copilot ignores TRACEPARENT today)." >>
<<~Kind Two >>

<<~ confidence Synthesis-Canon 16/20 >> Causality over timing: a propagated id
records happened-before **at the point the edge is created** — a fact, not an
inference. Heuristic cwd+time correlation breaks on concurrency, clock-skew (no global
now), retries, and fan-out. The id travels *with* the work.

<<~/ahu >>

<<~ ahu #time >>

## Face III ~ Time ~ the two-domain boundary (the operator's cut, 2026-06-25)

**Locality first — the worldline is LOCAL work-memory** (operator ruling, 2026-06-25):
an agent/subagent's memories-of-work — handles · edges · clocks · captured drawers —
ride a **LOCAL causal island** (the mempalace) and MUST NOT enter the mesh/federation.
The mesh carries shared canon + the social plane; work-memory stays node-local (Law-of-5s
scope: ephemeral/personal never federates). So the worldline clock persists in the LOCAL
store (the work-log · `lar_ffz` on local drawers), NEVER the mesh `SessionEventLog`
(capability-gated, shared). Stamping the handle/edge graph on chroma reads CORRECT — the
local island is its right home, no web3-only breach. (The earlier worry that work-memory
should move toward the mesh muddled the two island kinds; corrected here.)

**Causal order splits by where the order lives — proximal vs distal.** The line follows
the actor-boundary, not a preference: where Automerge owns an actorId it owns the
order; where nothing does (agents · the outside world) the worldline-DAG and FfzClock
carry it.

<<~ranks domain inside-automerge ~ docs · wiki-CRDTs (the proximal/internal order): Automerge logical time owns causal order — `<counter,actorId>` · `getHeads` · the `drifted` frontier. FfzClock NEVER carries causal order here, and an `ffzCompare` LWW total-order MUST NOT drive a fork/revocation verdict inside the CRDT (that manufactures a global-now the mesh cannot hold) -> the-worldline ~ the agent worldline (NO Automerge actor — spirits mine into the daemon's sole replica): its causal PARTIAL order rides the **reified edge-DAG** (#attribution) — a `spawned` edge = happened-before, no-edge-between-siblings = concurrent, handback closes the interval (the twin-reunion). FfzClock keyed on the HANDLE carries the worldline's RHYTHMIC POSITION only (where-in-the-cadence, a membership coordinate — NOT a freshness/decay scalar; manaoio serves the memes, never this clock), never the causal verdict — by code its `ffzCompare` is a total-order LWW and `ffzMerge` a max-join (no concurrency, no merge-ancestry), so causal CANNOT ride it. **Code divergence (2026-06-25 read):** `FfzClock.actorId` still keys on the Automerge actor — re-key to the handle when the worldline clock is wired (the actorId slip, live in code). A separate `LarTickCounter` already carries a monotonic cross-source join key -> other-domains ~ all other non-Automerge domains (external streams: game · Mudlet · video · DAW · market feed; capability-leases): FfzClock carries the rhythmic grain per FFZ_PROFILE, pulled across the causal-island boundary inward. The domain-general primitive lives at lar:///ha.ka.ba/@lararium/mesh/ffz-clock >>

**The retired over-claim stays retired** (across both domains): FfzClock measures
*tempo/grain*, never *who-acted-first* as a CRDT verdict. Inside Automerge, Automerge
rules; on the worldline, the merge-topology rules and FfzClock's LWW only paces the
grain. The Fuller-Fontany-Zelenka Chronometer earns its name as the **rhythm** of the
house, not its causality court.

<<~ confidence Synthesis-Canon 16/20 >> The boundary holds because it follows the
actor-boundary. Open at the mechanism (#open): `ffzCompare` must return *concurrent*
(not an LWW tiebreak) when two clocks share no merge-ancestry — confirm the API
separates the causal partial-order read from the rhythmic LWW read at wire-time.

### The FfzClock as a cached projection ~ the facet a palace reads (2026-06-29)

**A form-palace drawer's worldline-temporal facet PROJECTS off this DAG; it never
rules.** When the living-grammar palace stamps a drawer's `lar_ffz` and reads the
worldline position across its collection ([[living-grammar-palace|lar:///ha.ka.ba/@lararium/api/living-grammar-palace#ffz-binding]]), that
facet stands as a **CACHED PROJECTION** of the per-handle FfzClock (the grain) over the
reified edge-DAG (the order) — a materialized view, re-derivable from the worldline,
**NEVER the causal authority**. The edge-DAG owns happened-before; the palace caches its
position for query. This keeps the worldline as the single source: lose the cache,
re-project from the DAG; the cache MUST NOT out-rank the structure it derives from. The
binding ratified narrowed (12-Voice mufakat, operator-ratified 2026-06-29), with five
kept dissents live at [[living-grammar-palace|lar:///ha.ka.ba/@lararium/api/living-grammar-palace#kept-hoike]].

### The epistemic/ontic cut ~ what the worldline names (Borrill 2026)

**The worldline names what COULD-HAVE-influenced, never what physically CAUSED.** Borrill
2026 ("The Category Mistake in Logical Clocks," arXiv 2602.21730) draws the cut the
happened-before DAG already honors: a `spawned` edge records an **epistemic** bound —
*this act could have informed that one, as of the island's last sync* — never an
**ontic** claim about a physical causal chain. The mistake the paper names: reading a
logical clock's order as actual causation. Our edge-DAG sidesteps it by construction —
it records the influence-possibility at the point the edge is created (#attribution),
and the **DAG stays per-island LOCAL** (a union of local cones, never one global graph,
the Lightcone rhyme #the-six-rhymes). Borrill certifies this as
**more-correct-than-vanilla-Lamport**: vanilla Lamport manufactures a total order that
overclaims causation; the worldline's partial order, local and epistemic, claims only
what it can hold. <<~ confidence Synthesis-Canon 16/20 >> The cut grounds the
facet-as-projection ruling above: the cache reads an epistemic position ("as of last
sync"), never an ontic verdict.

### Rewind, fork & the rhizome ~ the kupono models (operator-ratified 2026-06-29)

A four-spirit swarm + a mempalace recall of the prior floor's own moʻolelo read the
worldline against a **mutable, branching, injectable** source. Three operations the
append-only-LINEAR reading never held — each resolved, each grounded in a mechanism the
base already carries.

**Rewind = *kapae*** (to set aside, never erase). A deleted transcript turn is no hole —
it stands **tombstoned and kept**, stamped so recall weights it down (the eidetic palace
remembers the road not taken). Four traditions converge — Datomic retraction · PROV
`wasInvalidatedBy` · git reflog (dangling, not deleted) · bitemporal valid-close — and the
base enacts it already: **mempalace `kg_invalidate` closes a triple's `valid_to`
append-only** (history preserved, never dropped), and the L7 tunnel/hallway dynamics decay
salience to a floor but **never to zero**. *Gap held:* `as_of` filters **valid-time only**;
a true belief-rewind (transaction-time — "what did the palace believe at T") is net-new
atop `extracted_at`.

**Fork = concurrency the DAG already holds.** A session-fork is topologically a
sibling-spawn — common ancestor, two concurrent frontiers, no edge between — so it needs
**no new graph structure**. Derived palace data separates two ways: **content-address the
drawer by change-hash** (shared-prefix dedups, divergent turns mint distinct CIDs — the
form-palace already keys by `verbatim_sha`), or **fork-by-palace-path** (the daemon is
keyed per `palace_key = sha256(path)` — each fork its own queue/token/KG/tunnels). And the
**handle gains a branch-frontier component** so same-session forks stop colliding on the
shared `run` handle.

**Injection = the rhizome — the `prov:Communication` leg, lit at last.** Because
`SendMessage` lets *both* operator and node redirect any running spirit — even a grandchild
the parent never spawned — the worldline is a **rhizome, not a tree**. A mid-flight
injection lands a happened-before edge **mid-execution**: a merge-point that is **not** a
handback. So **'merge-only-at-handback' generalizes to 'merge-where-messages-land'** — the
vector-clock law (a causal clock merges on every message-receive, not only at a join); the
sealed-delegation rule was the special case where the only messages were spawn + return.
The **edge-DAG absorbs this** (causal stays on the structure); the **FfzClock stays purely
rhythmic** — the PATH-B cut already in this meme, now confirmed not overturned: causal never
rode the clock, so the rhizome adds no burden to it. **The forks, now operator-cut (2026-06-29):**

<<~ranks rhizome-cut C-turn-DAG ~ handoffs key to the TURN-DAG node (survives rewind/fork) — operator-cut -> D-full-ticks ~ EVERY injection ticks+merges (full vector-clock fidelity); we cannot yet reliably detect a bearing/vector-change, so full ticks beat a lossy bearing-test — operator-cut -> E-operator-root ~ injected siblings share their injector as a COMMON CAUSE, and the OPERATOR is the root (the operator initiates every flow today; chron / other triggers MAY add non-operator roots later — held open) — operator-cut >>

*Mechanism (the build path):* the worldline's merge-where-messages-land rides the **edge-DAG
stamped into the mempalace** — the **chat-session store**. **Automerge does NOT hold
chat-session data**; it serves only the DreamNet mesh + the operator's wiki-bags (which
project to disk as markdown memes), so it never touches this plane (the two-domain cut,
sharpened). A `prov:Communication` edge stamps at the injection-point, keyed turn-DAG;
**Interval Tree Clocks** (fork = spawn · event = inject · join = handback) model the
worldline clock where plain vector-clocks bloat under spawning agents — vendor it. The
cap-handoff rides **`@endo/captp` over the daemon UDS** (`@endo/far` = the attenuated
reference). **Migration is cheap:** the FFZ/DAG over past sessions is a **re-derivable
projection** — nuke-and-pave + re-harvest from the transcripts (the source of truth), so no
forward-retrofit is owed (this answers the kept retrofit-migration dissent). And **install
must ingest a complex pre-existing chat-store** (e.g. MemPalace's own populated palace), not
only a fresh one.

So the canon's earlier 'twin-reunion, the worldline's one sync point' widens: **handback is
one merge among many; the rhizome merges wherever a message lands.** The donation boundary
holds — these models ride *our* @daemon atop the base's bi-temporal KG (`kg_invalidate`) +
content-addressed tunnels; MemPalace's trunk (entity-first real-name registry, single-node
"local-first") stays a different ontology — faithful upstream gets only backend/adapters/fixes.

<<~ confidence Synthesis-Canon 16/20 >> The three resolutions rest on convergent prior art
(bitemporal · PROV-invalidation · vector-clocks · Merkle-fork) and on mechanisms the base
already ships; the rhizome forks (C·D·E) are operator-cut (turn-DAG · full-ticks · operator-root), and the past-session FFZ/DAG re-derives by nuke-and-pave + re-harvest.

<<~/ahu >>

<<~ ahu #lifecycle >>

## Lifecycle ~ ephemeral by default, a few promoted to memory

\procedure ~Stage(~Type:"" ~Params:"") ~Stage <<~Type>> <<~holds `[<~Params>]`>>

<<~Stage Mandate "carries/scope + TTL + revocability + duties on the spawn (power-of-attorney); lapses on parent-dissolution unless 'durable'; handback RATIFIES (back-dates, re-checks scope) + merges packaged-atomic-filtered (apoptosis: sealed, never spilled; the bottleneck filters what merges back) [Fiduciary: POA + ratification · Meristem: apoptosis + mtDNA bottleneck]" >>
<<~Stage Span "runs/EPHEMERAL by default (effectors culled after task), a few promoted to MEMORY (persistent named wings); spawn-rate governed by backpressure; a parent normally holds MANY merged lineages (chimerism = health, not corruption) [Meristem: clonal effector/memory · CLV-WUS feedback]" >>
<<~Stage Two >>

### Ephemeral execution ~ the blind dir

**Capture is ON by default; ephemeral work is LAUNCHED isolated, never gated**
(operator ruling, 2026-06-24). Main session AND all subagents harvest by default — and
we do NOT gate existing capture by a session toggle or a derived #has (not
deterministically enforceable across handoffs). Instead, **`lares ephemeral <task>`
LAUNCHES the task into an ephemeral swarm born in a blind temp dir — outside every
harvested path**. The run is ephemeral *by construction*: its verbatim never enters
`~/.claude/projects` or any mined wing. The dir persists for inspection by default;
`--cleanup` disposes (off by default). The lived reason: the operator drives
**thousands of blind multi-model Q&A panels** through `gh copilot` — pure noise;
launched ephemeral, they leave no trace.

**The keystone of isolation — redirect each CLI's state dir into the blind dir.** Each
agent CLI keys its whole transcript/state tree off ONE env var:

<<~ranks redirect CLAUDE_CONFIG_DIR ~ Claude Code: ~/.claude → $BLIND (caveat #3833: may still drop a local .claude/ in cwd → run cwd INSIDE $BLIND) -> COPILOT_HOME ~ Copilot CLI -> CODEX_HOME ~ Codex -> HOME · XDG_* ~ belt-and-suspenders for any state dir missed >>

**Sandbox tiers — match heaviness to trust** (operator selects per task):

<<~ranks tier T0-blind ~ temp dir + env-redirect + caps; the DEFAULT, right for trusted self-judging Q&A -> T1-bwrap ~ bubblewrap namespaces (--ro-bind repo · --tmpfs work · --unshare-net) -> T2-container ~ Podman/Docker --rm, shared kernel, semi-trusted -> T3-microvm ~ E2B/gVisor/Firecracker, untrusted generated code >>

Blast-radius levers (T1+): read-only-bind the real repo, tmpfs the work, deny egress,
cap runaway swarms (`systemd-run --scope -p MemoryMax -p CPUQuota -p RuntimeMaxSec`,
which auto-reaps orphans), and **isolate credentials** — inject ONLY the model API key,
never the host env. The fork held for the operator: (a) do the panels need network
egress to the model API (→ an allow-listed proxy, not `--unshare-net`); (b) trusted
prompts vs untrusted generated code (sets the tier floor: T0 vs T1+).

<<~ confidence Synthesis-Canon 15/20 >>

<<~/ahu >>

<<~ ahu #crypto >>

## Crypto ~ deferred to the founding boundary

**NONE inside the daemon** — the single replica grants ocap-grade unforgeability for
free. A signature (did:key / UCAN / AIP) earns its cost ONLY where an act crosses into
a peer's trust-domain the daemon can't vouch for — the *founding/incorporation*
crossing, where the agent handle meets the operator's keyhive vessel-identity
(→ keyhive, the founding boundary). Derive lineage into the id; attribute by reference
edge, not a signed chain; sign only at the hostile boundary.

<<~/ahu >>

<<~ ahu #the-six-rhymes >>

## The Six Rhymes ~ pattern integrities, one per domain

<<~ranks rhyme physics ~ Lightcone: each worldline carries its own proper time; happened-before orders only cone-neighbors; 'elsewhere' = concurrency (REFUSE to order siblings); the twin REUNITES at handback; keep the order a union of local cones, never a global DAG -> law ~ Fiduciary: the act binds the principal (qui-facit), keyed to the act, stopping at scope; re-delegation defaults CLOSED; mandate carries scope+TTL+revocability; conduit-not-person until a deliberate founding; anonymity never severs the upward edge -> biology ~ Meristem: the division path IS the name (no registry); work attributed to the LINE; apoptosis packages teardown (merge sealed, never spilled); coordinate on locally-sensed thresholds (no global clock) -> linguistics ~ Deixis: identity = a character (rule) resolving content per context; the 'I' shifts at the spawn boundary; the parent resolves as a bound variable up the tree; name by relation (teknonymy) -> cs-web3 ~ Cipher: a logical handle holds identity unforgeably INSIDE one trust-domain (ocap-grade); derive lineage into the id; attribute by reference edge not signed chain; crypto only at the hostile boundary -> repo ~ Archivist: local-first, run-local-stable (not crypto), capability-not-platform, nameless-subagents-ok, no-global-wall-clock; the KG triple (temporal validity + provenance fields) stands ready to extend with agent_handle >>

<<~/ahu >>

<<~ ahu #build-sequence >>

## What Stands vs What Builds

**The homes already stand**: the KG triple carries temporal validity + provenance
fields (extend with `agent_handle`); diary/drawer metadata extends
backward-compatibly; the v3 content-addressed id-recipe holds; the **FfzClock library
ships complete** (ffzZero · ffzTick · ffzCompare · ffzMerge), wired nowhere yet.

**Build sequence — the handle first; the edge and the rhythm both ride it:**

<<~ranks build handle ~ LIVE-PROVEN on real drawers (2026-06-25): SPIRIT drawers stamp `lar_agent_handle`=run.agentId + `lar_parent_handle`/`lar_root_handle`=run; MAIN drawers stamp `lar_agent_handle`=`lar_root_handle`=run (no parent — a root). A spirit's `lar_parent_handle` RESOLVES to its main agent's `lar_agent_handle` (both = the session run), so the attribution graph CLOSES. Derived from the staged source_file (in-process); cross-surface launcher shim still mints trace-id/span-id — the keystone -> edge ~ PROJECTED form LIVE (2026-06-25): stamp `lar_parent_handle` (appointed-by) + `lar_root_handle` (root-principal) on spirit drawers, single-source. The reified bi-temporal `prov:Delegation` NODE (valid/tx · status · times) awaits a code-reachable KG — MCP/tunnel-only today; when it lands the edge RE-PROJECTS from it (never a double-write) -> rhythm ~ MECHANISM LIVE (`worldline-clock.ts`, 2026-06-25): per-handle FfzClock keyed on the HANDLE (slip fixed at source) · construct-on-first-event · grounding-tick (L1 Beat on the operator's acknowledging move, NEVER on emission) · rollover-checkpoint to the LOCAL work-log (NOT the mesh SessionEventLog — work-memory is a local island). GRAIN RESOLVED (Loom-grounded, 2026-06-25): `lar_ffz` stamps a prefix-truncatable rhythmic ADDRESS `Theme.Arc.Measure.Beat.Segment.block` — **L0 Pulse = one generation segment** (`stop_reason`, = the OTel span), **block = a sub-offset** (index, not a tick); the clock reads the HARNESS transcript, never the rendered grammar (lar:///ha.ka.ba/@lararium/mesh/ffz-clock#rhythmic-address). Address serializer + Claude-agent profile BUILT/TESTED; the live stamp's capture-path wiring (drawer→(turn,segment) mapping) is the next slice. Grounded by the Horologe spirit — ITC identity/event split (bearer≠replica) · Clark-Brennan/Ginzburg grounding (Pending→Moves) · Automerge/Yjs ephemeral convention · event-sourcing checkpoints -> mandate ~ carry scope+TTL+revocability+duties; handback ratifies + filters the merge -> crypto ~ at the peer/founding boundary only, anchor to keyhive >>

<<~/ahu >>

<<~ ahu #open >>

## Open ~ held, not papered over

- **The actorId slip — live in code** (`ffz-clock.ts` read 2026-06-25): `FfzClock.actorId`
  keys on the Automerge actor (header + field doc both say so); the worldline clock MUST
  re-key on the HANDLE. The concrete first fix when the rhythm road is wired. No
  `ffzCompare` change needed — causal rides the edge-DAG, FfzClock stays a rhythmic
  total-order. The existing `LarTickCounter` already carries a monotonic cross-source
  join key; reconcile whether the worldline reuses it or the edge-DAG alone.
- **The cross-surface launcher shim** — `gh copilot` ignores `TRACEPARENT`; build the
  `lares`-driven wrapper that mints + injects the trace-id and writes both sides, or
  only half the tunnel exists.
- **The reified node is substrate-gated** — tunnels + KG triples live MCP-only (no
  `mempalace` CLI subcommand); the disconnected MCP blocks a code-path reified
  `prov:Delegation` node. The projected metadata edge (`lar_parent_handle`/`lar_root_handle`)
  carries who-drove-whom meanwhile, single-source; wire the node when the KG is code-reachable.
- **Chain `parent_edge_id`** or a grandchild generation goes dark.
- **Ephemeral blind-dir hardening** — sandbox tiers · cleanup · resource/leak
  containment · the egress fork (#lifecycle) — under a dedicated research pass.

<<~/ahu >>

<<~ ahu #standards-anchor >>

## Standards Anchor ~ stand on the ratified

- **W3C Trace Context** — `traceparent`; trace-id constant across the chain, parent-id
  up. The correlation carrier. Stable.
- **W3C PROV** (PROV-DM/O) — Entity · Activity · Agent + `wasGeneratedBy` ·
  `wasAttributedTo` · `actedOnBehalfOf`. The edge vocabulary; provenance forms a DAG.
- **PROV-AGENT** (arXiv 2508.02866) — W3C PROV extended for agentic systems; matches
  the model 1:1.
- **Borrill 2026, "The Category Mistake in Logical Clocks"** (arXiv 2602.21730) — the
  epistemic/ontic cut; certifies no-global-now (a per-island local DAG of
  could-have-influenced edges) as more-correct than vanilla Lamport's overclaimed total
  order. Grounds the worldline's partial order as epistemic, never causal-physical (#time).
- **OTel GenAI** — `gen_ai.agent.id/name`, `gen_ai.operation.name=invoke_agent`. Node
  identity; a span is a NODE, parent-child a by-reference edge — confirming the dual
  node+edge treatment. **Do NOT wait** on the unratified multi-agent handoff spec
  (issue #2664); rest the edge on stable trace-context + PROV.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lararium/mesh/ffz-clock >>
<<~ loulou lar:///ha.ka.ba/@lares/api/pono/causal-islands >>
<<~ loulou lar:///ha.ka.ba/@lararium/api/capture-annotation-model >>
<<~ loulou lar:///ha.ka.ba/@lararium/api/lar-telemetry >>
<<~ loulou lar:///ha.ka.ba/@lares/api/lares/voices#worker-swarm >>
<<~ loulou lar:///ha.ka.ba/@lararium/api/living-grammar-palace >>

**Tie ~ the form-palace as a third FeedCap.** The nameless palace-instance that captures a turn's FORM
([[living-grammar-palace|lar:///ha.ka.ba/@lararium/api/living-grammar-palace#palace-instance]]) extends the same has-stack runtime twin a spirit's worldline
already rides; its drawers carry the worldline's `lar_agent_handle` + `lar_ffz` address, so form-vectors
attribute to the spirit that moved them.

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>

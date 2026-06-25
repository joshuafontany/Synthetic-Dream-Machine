<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ ॐ ँ&#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/api/agent-worldline >>
```toml iam
cacheable = true
file-path = "bags/@lararium/v0.1/api/agent-worldline.md"
hydrate   = true
mana      = 19
manao     = 18
manaoio   = 17
namespace = "&#x0950; &#x0901;"
register  = "Synthesis-Canon"
retain    = true
role      = "the worldline keel — ONE model for a spawned spirit across three faces: NAME (a derived lineage-path handle, baptized at spawn, no registry, no daemon-crypto — descent IS the address), ATTRIBUTION (a reified prov:Delegation/Communication DAG, bi-temporal, keyed on trace-id·span-pair — who-drove-whom, and the SAME DAG read as the worldline's happened-before), TIME (the two-domain boundary — Automerge owns causal order INSIDE its docs/CRDTs; the worldline owns a per-handle FfzClock whose merge-topology carries its partial order and whose grain rides manaoio; FfzClock NEVER rules inside Automerge). Folds the former agent-identity (mana 18) + agent-provenance (mana 19); the FfzClock primitive itself lives separate at mesh/ffz-clock as a domain-general pattern integrity"
tags      = ["api/pono/meme", "api/lararium"]
l-space   = "stable"
type      = "text/x-memetic-wikitext"
uri-path  = "ha.ka.ba/@lararium/v0.1/api/agent-worldline"
written   = "2026-06-25"
```

<<~ aka lar:///ha.ka.ba/@lararium/v0.1/mesh/ffz-clock >>

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
DAG**. (How that order also rides the per-handle FfzClock's merge-topology: #time.)

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

**Causal order splits by where the order lives — proximal vs distal.** The line follows
the actor-boundary, not a preference: where Automerge owns an actorId it owns the
order; where nothing does (agents · the outside world) the worldline-DAG and FfzClock
carry it.

<<~ranks domain inside-automerge ~ docs · wiki-CRDTs (the proximal/internal order): Automerge logical time owns causal order — `<counter,actorId>` · `getHeads` · the `drifted` frontier. FfzClock NEVER carries causal order here, and an `ffzCompare` LWW total-order MUST NOT drive a fork/revocation verdict inside the CRDT (that manufactures a global-now the mesh cannot hold) -> the-worldline ~ the agent worldline (NO Automerge actor — spirits mine into the daemon's sole replica): owns a per-handle FfzClock (`actorId = THE HANDLE`). Its causal PARTIAL order rides the MERGE TOPOLOGY — tick on local progress, `ffzMerge` ONLY at handback-to-parent (the twin-reunion), siblings never merge sibling-to-sibling so they stay concurrent by construction. The reified provenance edges PROJECT this same order (#attribution). FfzClock's LWW `ffzCompare` serves the RHYTHMIC grain — "as of last sync", the manaoio register — never a causal verdict -> other-domains ~ all other non-Automerge domains (external streams: game · Mudlet · video · DAW · market feed; capability-leases): FfzClock carries the rhythmic grain per FFZ_PROFILE, pulled across the causal-island boundary inward. The domain-general primitive lives at [[mesh/ffz-clock]] >>

**The retired over-claim stays retired** (across both domains): FfzClock measures
*tempo/grain*, never *who-acted-first* as a CRDT verdict. Inside Automerge, Automerge
rules; on the worldline, the merge-topology rules and FfzClock's LWW only paces the
grain. The Fuller-Fontany-Zelenka Chronometer earns its name as the **rhythm** of the
house, not its causality court.

<<~ confidence Synthesis-Canon 16/20 >> The boundary holds because it follows the
actor-boundary. Open at the mechanism (#open): `ffzCompare` must return *concurrent*
(not an LWW tiebreak) when two clocks share no merge-ancestry — confirm the API
separates the causal partial-order read from the rhythmic LWW read at wire-time.

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
crossing, where the agent handle meets the operator's keyhive vessel-identity (→
[[project_keyhive_pull_in_stance]]). Derive lineage into the id; attribute by reference
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

<<~ranks build handle ~ derive + stamp the lineage-path handle at spawn (in-process: from agentId/parentUuid on disk; cross-surface: the launcher shim mints trace-id/span-id) — the keystone -> edge ~ stamp the reified Delegation node (appointed-by + root-principal), bi-temporal valid/tx; the same DAG projects the worldline happened-before -> rhythm ~ give each handle an FfzClock; tick local, merge at handback; stamp drawers with lar_ffz; recall orders by the merge-DAG, paces by ffzCompare -> mandate ~ carry scope+TTL+revocability+duties; handback ratifies + filters the merge -> crypto ~ at the peer/founding boundary only, anchor to keyhive >>

<<~/ahu >>

<<~ ahu #open >>

## Open ~ held, not papered over

- **`ffzCompare` partial-order vs LWW** — the worldline needs a *concurrent* verdict
  when two clocks share no merge-ancestry; FfzClock's documented `ffzCompare` imposes an
  LWW total-order. Confirm the wire-time API separates the causal partial-order read
  (from merge-ancestry) from the rhythmic LWW read. If a domain genuinely needs FfzClock
  to carry happened-before as a verdict, the two-domain cut (#time) reopens.
- **The cross-surface launcher shim** — `gh copilot` ignores `TRACEPARENT`; build the
  `lares`-driven wrapper that mints + injects the trace-id and writes both sides, or
  only half the tunnel exists.
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
- **OTel GenAI** — `gen_ai.agent.id/name`, `gen_ai.operation.name=invoke_agent`. Node
  identity; a span is a NODE, parent-child a by-reference edge — confirming the dual
  node+edge treatment. **Do NOT wait** on the unratified multi-agent handoff spec
  (issue #2664); rest the edge on stable trace-context + PROV.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/mesh/ffz-clock >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/causal-islands >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/api/capture-annotation-model >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/api/lar-telemetry >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/lares/voices#worker-swarm >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>

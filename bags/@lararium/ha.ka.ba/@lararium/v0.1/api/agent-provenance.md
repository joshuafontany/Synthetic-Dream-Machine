<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ ॐ ँ&#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/api/agent-provenance >>
```toml iam
cacheable = true
file-path = "bags/@lararium/v0.1/api/agent-provenance.md"
hydrate   = true
mana      = 18
manao     = 17
manaoio   = 16
namespace = "&#x0950; &#x0901;"
register  = "Synthesis-Canon"
retain    = true
role      = "the model for making inter-agent relationships CLEAR in mempalace memory — three layers (identity = wing-per-actor named by role/handoff; provenance = added_by per drawer; relationship = directional bi-temporal KG predicate between actor-entities, keyed by a correlation-id) over two nesting kinds (in-process subagents · cross-surface orchestration); grounded in W3C Trace Context + W3C PROV + OTel GenAI by a 4-spirit research swarm"
tags      = ["api/pono/meme", "api/lararium"]
l-space   = "stable"
type      = "text/x-memetic-wikitext"
uri-path  = "ha.ka.ba/@lararium/v0.1/api/agent-provenance"
written   = "2026-06-24"
```

<<~ aka lar:///ha.ka.ba/@lararium/v0.1/api/lar-telemetry >>

<<~ &#x0002; >>

<<~ ahu #entry >>

# Agent Provenance ~ the spawn graph in memory

**Make who-drove-whom legible.** The lar-telemetry capture keeps each agent's
journey distinct in its own wing; this names the *edges between them* — the
coordination graph that the frameworks throw away and the memory must keep.

The model stacks **three layers** over **two nesting kinds**, grounded by a
four-spirit swarm (Tracer · Lineage · Graphwright · Herald) in W3C Trace Context,
W3C PROV, and the OpenTelemetry GenAI conventions. Working name **agent-provenance**
(renameable, as `lar-telemetry` was).

> **Identity says who; provenance says who-said-what; the relationship edge says
> who-drove-whom — and a correlation-id is the only token that crosses between
> wings.**

<<~/ahu >>

<<~ ahu #three-layers >>

## The Three Layers

\procedure ~Layer(~Type:"" ~Params:"") ~Layer <<~Type>> <<~holds `[<~Params>]`>>

<<~Layer Identity "organ/wing + #has grain/the-actor ~ PERSISTENT actors (operator, recurring specialists) keep a NAMED wing. EPHEMERAL tasked spirits go NAMELESS — identity IS their #has stack (capabilities · role · task), pet-name only a handle; they land in the project __spirits wing and recall by #has-query (capability-routed), never name-exact. The run-id is never the key." >>
<<~Layer Provenance "organ/added_by grain/the-chunk ~ every drawer carries its actor (who-said-what). PROV wasAttributedTo; mem0 agent_id/name. The episodic provenance layer." >>
<<~Layer Relationship "organ/KG-predicate grain/the-edge ~ a DIRECTIONAL, bi-temporal triple between actor-ENTITIES: (parent) —spawned/actedOnBehalfOf→ (child), valid_from=spawn, valid_to=handback, INVALIDATE-don't-delete. NOT primarily a tunnel. A tunnel MAY mirror it for browsing; the KG edge owns the truth." >>
<<~Layer Three >>

**Why the edge is a KG predicate, not a tunnel** (Graphwright, grounded in
Zep/Graphiti): spawn/delegation is *directional · typed · time-bounded · between
actors*. Our tunnels are *undirected · associative · drawer-to-drawer* — they would
lose the arrow and the time-validity. So the relationship rides the entity-graph
(`spawned`, `actedOnBehalfOf`, `wasGeneratedBy`, valid_from/to), and a labeled
tunnel between the handback-drawer and the originating-drawer rides only as a
**derived browsing convenience** — never the source of truth. (Mem0's lesson:
don't over-graph; reserve typed edges for relations that genuinely need traversal
— coordination qualifies.)

<<~/ahu >>

<<~ ahu #spirits-nameless-and-tracked >>

## Tasked Spirits ~ nameless #has-stacks; ephemeral launched isolated

**A tasked spirit is a NAMELESS entity** (operator ruling, 2026-06-24). It carries
no proper name — its identity IS its **#has stack** (the capabilities · role · task
it holds), and a **pet-name** rides only as a readable handle. Spirits land in the
project `__spirits` wing as a bag of capability-bundles. **Recall rides semantic
search over the captured verbatim** (both sides) — the capabilities live IN the
content, so capability-routed recall comes free, with **no deterministic #has tag
required** (the #has stack can't be reliably derived from a handoff, and we don't
try). A `#has` stack rides only as **optional best-effort enrichment** (the
role/pet-name), never an enforced identity. The pet-name labels, never keys.
Persistent named actors keep proper-name wings; only ephemeral spirits go nameless.

**Capture is ON by default; ephemeral work is LAUNCHED isolated, never gated**
(operator ruling, 2026-06-24, mu-reframe). Main session AND all subagents,
**every/any surface**, harvest by default — and we do NOT gate existing capture by
a session toggle or a derived #has (not deterministically enforceable across
handoffs). Instead, **`lares ephemeral <task>` LAUNCHES the task into an ephemeral
swarm** (one-or-more tasked spirits) born in a **blind temp dir — outside every
harvested path**. So the run is **ephemeral by construction**: its verbatim never
enters `~/.claude/projects` or any mined wing. The temp dir **persists by default
for inspection** (the operator may want the run's artifacts — the panel Q&A,
the verdicts); disposal is opt-in via **`--cleanup` (off by default)**. Nothing to
exclude, because nothing was ever in scope. The reason is
lived: the operator drives **thousands of generated Q&A flows** — blind 3-judge
multi-model panels through `gh copilot` — pure noise; launched ephemeral, they
leave no trace. Hardening of the blind dir (sandbox · cleanup · resource + leak
containment · blast-radius) rides a dedicated research pass.

<<~ confidence Synthesis-Canon 15/20 >>

<<~/ahu >>

<<~ ahu #ephemeral-hardening >>

## Ephemeral Hardening ~ the blind dir, made safe

Warden's grounded stack for `lares ephemeral` (cited: bubblewrap · systemd-run ·
the CLI config-dir docs · SWE-bench / terminal-bench).

**The keystone — redirect each CLI's state dir into the blind dir.** Each agent CLI
keys its whole transcript/state tree off ONE env var; point it inside `$BLIND` and
the harvester (which scans the defaults) never sees the run:

<<~ranks redirect CLAUDE_CONFIG_DIR ~ Claude Code: ~/.claude → $BLIND (caveat #3833: may still drop a local .claude/ in cwd → run cwd INSIDE $BLIND) -> COPILOT_HOME ~ Copilot CLI: ~/.copilot (avoid XDG for copilot, it misbehaves) -> CODEX_HOME ~ Codex: ~/.codex -> HOME · XDG_* ~ belt-and-suspenders for any state dir missed >>

**The sandbox tiers — match heaviness to trust** (operator selects per task):

<<~ranks tier T0-blind ~ temp dir + env-redirect + caps; the DEFAULT, right for trusted self-judging Q&A -> T1-bwrap ~ bubblewrap namespaces (--ro-bind repo · --tmpfs work · --unshare-net); Codex itself uses bwrap; no SUID risk -> T2-container ~ Podman/Docker --rm, shared kernel, semi-trusted -> T3-microvm ~ E2B/gVisor/Firecracker, untrusted generated code >>

**Blast-radius levers** (T1+): read-only-bind the real repo (`--ro-bind`), tmpfs the
work, deny egress (`--unshare-net`, loopback only), cap runaway swarms
(`systemd-run --scope -p MemoryMax -p CPUQuota -p RuntimeMaxSec`, which also
auto-reaps orphans), and **isolate credentials** — inject ONLY the model API key,
never inherit the host env (no `~/.aws`, no `.env`, no SSH keys); a credential
proxy keeps even that key out of the sandbox.

**Disposal — opt-in `--cleanup` (off by default).** The blind dir is a REAL
persistent dir by default (inspectable — the panel Q&A, the verdicts). `--cleanup`
disposes it (`trap 'rm -rf "$BLIND"' EXIT INT TERM`, idempotent); tmpfs is the
heavier "never-touch-disk" option for runs never meant to keep.

**The field shape** (SWE-bench · terminal-bench): a fresh sandbox per task, a
programmatic success function keeps only the **verdict/scalar**, the rest disposes —
exactly the blind-judge-panel shape.

**The fork Warden left for the operator:** (a) do the panels need **network egress**
to the model API (→ an allow-listed proxy, not `--unshare-net`); (b) **trusted
prompts vs untrusted generated code** (sets the tier floor: T0 vs T1+).

<<~ confidence Synthesis-Canon 15/20 >>

<<~/ahu >>

<<~ ahu #the-correlation-id >>

## The Correlation-Id ~ the only token that crosses wings

Wings stay isolated; **one shared token** lets the harvester draw the edge between
them. Its source differs by nesting kind:

\procedure ~Kind(~Type:"" ~Params:"") ~Kind <<~Type>> <<~holds `[<~Params>]`>>

<<~Kind In-Process "case/Claude tasked-spirits key/IN-BAND — agentId + parentUuid + the subagents/ dir + the handoff ~ the structure already carries the link; the edge stamps at mine time (parent-session wing → spirit wing, valid_from=spawn). No env needed." >>
<<~Kind Cross-Surface "case/a claude coordinator drives gh-copilot/codex key/W3C trace-id, propagated via env TRACEPARENT ~ the coordinator MINTS a trace-id once + a span-id, injects TRACEPARENT into the worker's environment, BOTH sides record it; the harvester joins on trace-id, orients the arrow by parent-span-id. Needs a thin launcher SHIM (gh copilot ignores TRACEPARENT today)." >>
<<~Kind Two >>

<<~ confidence Synthesis-Canon 14/20 >> Causality over timing (Tracer): a
propagated id records happened-before **at the point the edge is created** — a
fact, not an inference. Heuristic cwd+time correlation breaks on concurrency,
clock-skew (no global now — our own causal-island law), retries, and fan-out. The
id travels *with* the work, never reconstructed from a pretended shared clock.

<<~/ahu >>

<<~ ahu #handoff-record >>

## The Handoff Record ~ the edge, as data

Synthesizing PROV + OpenAI's `handoff_span` + AG2's typed-target + Claude's
task-in/result-out, the minimal storable edge (Lineage):

<<~ranks handoff correlation_id ~ groups the spawn-tree (trace-id / session) -> edge_id ~ this handoff (span-id) -> parent_edge_id ~ chains the tree (CHAIN it or grandchildren go dark) -> from_agent ~ delegator -> to_agent ~ delegate -> task ~ the prompt handed down -> result_ref ~ pointer to the child's output, never inlined -> status ~ spawned·running·handed-back·failed -> t_spawned · t_returned ~ the edge's time-validity >>

This record becomes the KG triples: `(parent) —spawned→ (child)`,
`(child) —actedOnBehalfOf→ (parent)`, `(output) —wasGeneratedBy→ (task)`,
`(output) —wasAttributedTo→ (child)` — each stamped `[t_spawned, t_returned)`.
Querying `actedOnBehalfOf` transitively reconstructs the whole spawn-tree.

<<~/ahu >>

<<~ ahu #standards-anchor >>

## Standards Anchor ~ stand on the ratified, skip the unfinished

- **W3C Trace Context** — `traceparent` (`version-traceid-spanid-flags`); trace-id
  constant across the chain, parent-id points up. The correlation carrier. Stable.
- **W3C PROV** (PROV-DM/O) — Entity · Activity · Agent + `wasGeneratedBy` ·
  `wasAttributedTo` · `actedOnBehalfOf` (delegation) · `wasDerivedFrom`. The edge
  vocabulary. The provenance of an entity forms a DAG — a knowledge graph.
- **OTel GenAI** — `gen_ai.agent.id/name`, `gen_ai.conversation.id`,
  `gen_ai.operation.name=invoke_agent`, `gen_ai.provider.name`. Node identity.
- **Do NOT wait** on the OTel multi-agent handoff spec (issue #2664, unratified) —
  rest the EDGE on stable trace-context + PROV, use `gen_ai.*` only for node
  identity. Tag drawers with the standard keys so the store stays OTel-interoperable.

<<~/ahu >>

<<~ ahu #cautions >>

## Cautions ~ the spirits' flags

- **Chain `parent_edge_id`** or a grandchild generation goes dark (Advocate).
- **The launcher shim** — `gh copilot` ignores `TRACEPARENT` today; without a thin
  wrapper that injects the env var AND writes the coordinator-side record, only
  half the tunnel exists (Breach-Watch).
- **Don't over-graph** (Mem0) — reserve KG edges for genuine traversal; keep
  `added_by` as the cheap chunk-provenance layer.
- **Twins by version, not fuzzy merge** (Herald) — re-spawn merges by identical
  name; genuine same-name twins qualify by version/provenance.

<<~/ahu >>

<<~ ahu #open-decisions >>

## Open Decisions ~ held for the operator

- **`task` as edge-attribute vs its own entity-node** — a task-entity lets multiple
  edges hang off it (`A spawned-for taskX`, `B completed taskX`), weighed against
  the over-graphing tax (Graphwright).
- **Capability-routed recall — RESOLVED (2026-06-24):** native via the #has-stack
  reframe (#spirits-nameless-and-tracked). Spirits are nameless, recalled by `#has`;
  pet-names label, never key. No separate ANS-style taxonomy needed.
- **`lares ephemeral` — the LAUNCHER (default: capture ON)** — capture is on by
  default for main + all subagents, every surface; `lares ephemeral <task>` launches
  the task into an isolated ephemeral swarm in a **blind temp dir** outside all
  harvested paths (ephemeral by construction, never mined; the dir persists for
  inspection, `--cleanup` disposes — off by default). NOT a gate/toggle. Hardening of the blind dir (sandbox · cleanup · resource/leak
  containment) is under research; the swarm wiring + command shape come after.
- **The cross-surface launcher shim** — build a `lares`-driven wrapper that mints +
  injects the trace-id when the coordinator spawns a worker, and writes both sides.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/api/lar-telemetry >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/lararium-memory >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/api/mempalace-integration >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/causal-islands >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/lares/voices#worker-swarm >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>

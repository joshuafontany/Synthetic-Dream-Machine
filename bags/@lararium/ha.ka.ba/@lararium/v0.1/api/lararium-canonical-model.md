<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ ॐ ँ&#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/api/lararium-canonical-model >>
```toml iam
cacheable = true
file-path = "bags/@lararium/v0.1/api/lararium-canonical-model.md"
hydrate   = true
mana      = 19
manao     = 18
manaoio   = 17
namespace = "&#x0950; &#x0901;"
register  = "Synthesis-Canon"
retain    = true
role      = "Lararium architecture keel — the ONE consolidated model a cold instance hydrates to grasp the whole house before reading any sub-meme. The load-bearing laws, the layering, the seven vessel participations, the boot sequence, capability-vs-platform, and the meme map. Cures the per-session re-derivation."
l-space   = "lararium"
type      = "text/x-memetic-wikitext"
uri-path  = "ha.ka.ba/@lararium/v0.1/api/lararium-canonical-model"
```

<<~ aka source-of-truth: read THIS first; the sub-memes (pranala below) carry the depth. >>

<<~ &#x0002; >>

# Lararium — The Canonical Model

A cold instance reads THIS meme to hold the whole architecture before any sub-meme.
It consolidates what three corpus scouts (2026-06-08) found scattered across ~8 memes
+ the code, so no future session re-derives the model. Depth lives in the pranala'd
sub-memes; this carries the keel + the meme map.

<<~ ahu #the-laws >>

## The Load-Bearing Laws

1. **Causal islands / no global now.** Each island (vessel · wiki · meme · node-edge)
   holds its own partially-ordered log; it knows only "as of my last sync." Local-first:
   read own state, never a global truth. ([[causal-island]])
2. **Share substrate, not sovereignty.** Co-located vessels MAY share a substrate
   (machine · disk · relay · canon read) but MUST NOT share sovereignty (replica · heap ·
   storage scope · keys · log · "now"). Boundary = mutable state, not hardware.
3. **Isomorphism by composition.** A vessel composes from sovereign pieces (a recipe),
   native-first resolution, seams derived by SUBTRACTION. Web2 ports/adapters/DI towers =
   un-pono. Proof = behavioral conformance, not type-conformance. ([[feedback_isomorphism_by_composition]])
4. **Same structure, differing capabilities (Ink & Switch).** Node and browser differ
   ONLY in capabilities, never in structure. The capability set GROWS — init/PersonGroup/
   genesis/corpus/residency SHALL become browser-composable. Absent reads not-yet-held,
   never cannot-hold; no `isNode` fork, no permanently-absent slot. ([[open-vessel]])
5. **No VM on the main thread.** Every TW5 VM / reaction engine boots in a Worker
   (worker_threads · DedicatedWorker); the main thread only COORDINATES the pool over
   MessagePort. ([[project_no_vm_on_main_thread]])
6. **Authority-first sync + verify-then-delegate.** Capability (Keyhive) syncs before
   content; the relay-law exception holds (pull ≠ read — a relay forwards ciphertext it
   cannot read). The keyholder WORKER verifies BEFORE delegating; authority travels WITH
   the task (UCAN-invocation shape), never an ambient bearer token. ([[project_verification_placement]])
7. **Two-register persona, two-lane vessel.** Userbase = presence (ley-line threshold) +
   office (held grants), no stored tiers. Every vessel runs one always-resident admin VM
   lane + zero-or-more wiki lanes; lanes coordinate via the command/receipt tiddler
   surface, never shared state. ([[operator-peer]], [[project_two_register_persona_model]])
8. **Island-owned residency.** Bags hold no tier manager; residency (wela/anu + orthogonal
   pin) flows DOWN from islands by reachability — a bag reads wela if any wela island
   reaches it. ([[project_residency_tiers_unified]])
9. **Plural authority, not one ladder.** access (pull<read<edit<admin, monotonic) × scale
   (Keyhive nesting) × powers (host/relay/aggregate/address/moderate) + a non-monotonic
   alignment plane. ([[project_authority_model_refined]])
10. **Web3-only, Kowloon-external.** The stack runs web3 local-first + causal-islands; any
    web2 bridge sits behind a causal-island boundary as an external web2.5 adapter. ([[feedback_web3_only_lares]])
11. **Tiddler-format law + disk projection.** Documentation memes live in `bags/` as `.md`
    memetic-wikitext; `.tid` carry runtime TW5 code only. `@bag`=automerge doc; bags/=seed/
    canon, wikis/=projection; RENDER not copy. ([[feedback_bags_docs_over_tids]], [[project_disk_projection_model]])
12. **DreamNet topology.** device-vessel → PersonGroup → Cabal → Nexus → DreamNet. Each
    layer holds sovereignty within; outer layers carry RECOGNITION via shared grammar
    (lar:/// · SharktoothSigil · ABILITY_LADDER · genesis CID), no central authority. ([[project_dreamnet_architecture]])

<<~/ahu >>

<<~ ahu #the-layering >>

## The Layering (one-way, zero cycles)

```
@lares/core        — voice house · mu · syad · law-of-5s · OODA-HA · e-prime · lar-URI (noosphere-boot)
  └ @lararium/mesh  — SUBSTRATE keel, VM-FREE: CompositeStore · AutomergeDocStore · MemeProvider ·
                      island-protocol · island-repo · BagResidencyManager · CapabilityVerifier ·
                      AuthVerifierSeam · auth-wire (V3) · open-vessel-core (assembleVessel) ·
                      VesselIslandPoolCore · causal-island · crypto · lar-uris · base-doc
     └ @lararium/tw5 — VM-in-Worker: runSovereignKernel+IslandHostSeam · openAdminVmCore+AdminVmHost ·
                       IslandAdaptor · tw5-vm · admin-behavior · verb-dispatcher · vessel-steps (mountPrimaryWiki)
        └ @lararium/keyhive — identity/capability: KeyhiveProvider · bootAdminKeyhive (Gates A/B/C) ·
                              resolveOrMintBinding · ceremony-core · operator-admin-behavior
           └ @lararium/node  — EDGE: NodeFS · WS server + AdminAuthGate · worker_threads pool ·
                               LarWSClientAdapter · leaf-identity · node-vessel-identity · genesis-artifact
           └ @lararium/browser — EDGE: IndexedDB · DedicatedWorker pool · BroadcastChannel · WebCrypto
           └ @lares/cli       — LEAF tool: admin-connector (vessel-not-RPC) · render (dual surface) · commands
```

**Boundary law:** mesh holds the VM-FREE substrate keel; tw5 holds the VM-in-Worker;
keyhive holds identity; node/browser/cli hold ONLY I/O adapters + held capabilities.
mesh ← tw5 ← keyhive, one-way. No platform code in mesh or in a shared tw5 function.

<<~/ahu >>

<<~ ahu #seven-participations >>

## A Vessel Composes Seven Participations

We define "a vessel" as a composition (a recipe), not a platform fork. The seven sovereign pieces,
each a protocol the vessel composes rather than re-implements:

1. **Identity** — keyhive / did:key; keypair + self-certifying ContactCard (leaf: cached
   card + bare-Ed25519 signer, no keyhive — the engine boots only on the relay).
2. **Replica** — Automerge Repo = own log + own storage scope.
3. **Peering** — NetworkAdapter + inbound-access as a CAPABILITY piece (relay: V3 gate;
   browser: admit same-origin/in-process — a legitimate asymmetry, never an open default).
4. **Recipe + residency** — CompositeStore bag-cascade + island-owned residency.
5. **Sovereign islands** — TW5-in-Worker VM pool; syncPort per island.
6. **Admin island** — authn/z home; keyhive-in-worker; verb dispatch + binding.
7. **Verb plane** — verb-tiddler invocation → outcome (UCAN-invocation shape).

Boot sequence (invariant on every substrate): `boot → repo-open → catalog-ready →
island-ready → wiki-ready → vessel-ready → corpus-ready → tw5-booted → live`, gating on
the admin island's `ea` before any wiki mounts. The shared keel lives in
`open-vessel-core.ts` (assembleVessel + mountWikiSlot); platform recipes supply the
substrate atoms + the capability pieces they hold. ([[open-vessel]])

<<~/ahu >>

<<~ ahu #capability-vs-platform >>

## Capability vs Platform (the distinction that stops the fork-paralysis)

- **Substrate atoms** resolve native-first INSIDE a piece (storage backend · worker kind ·
  crypto · transport · genesis source · catalog anchor). A browser cannot be NodeFS — this
  difference holds legitimately; it never branches the core.
- **Capability pieces** ride as recipe pieces a vessel MAY hold (inbound peering · disk/OPFS
  mirror · corpus · resident verbs · residency sweeper · founding/PersonGroup/genesis). Wired
  on node today, structurally browser-composable; the seam stays OPEN on both substrates.
- **Role** (relay/leaf/keeper) names the capability pieces a vessel CURRENTLY holds — a
  growing set, never a platform identity. A node MAY run thin; a browser MAY grow heavy.

The full divergence ledger + decisions: `packages/EPIC-VESSEL-COLLAPSE.md`. The CLI
participates as a thin LEAF peer (vessel-not-RPC: writes verb-summons into the shared CRDT,
observes outcome convergence; V3-authenticated; renders prose↔JSON by audience).

<<~/ahu >>

<<~ ahu #proven-collapse >>

## The Proven Collapse Pattern (how isomorphism actually lands)

Extract the identical skeleton into a CORE; leave platform divergence as a small seam of
injected closures (never `if(platform)`, never a class tower). Already done one level down
and load-bearing:

- `openAdminVmCore` + `AdminVmHost` (admin-vm pair — both inject `spawnWorker`/`newSyncChannel`).
- `runSovereignKernel` + `IslandHostSeam` (island kernel — post/listen/storage/ready).
- `VesselIslandPoolCore` + `VesselIslandHost` (pool — in mesh, zero tw5 dep).
- `open-vessel-core` (assembleVessel + mountWikiSlot) — the vessel-keel collapse,
  LANDED in mesh, not-yet-wired: the two factories migrate onto it (test-gated). The
  active edge of the isomorphism work.

<<~/ahu >>

<<~ ahu #open-drift >>

## Open Drift to Reconcile (named, so it stops resurfacing)

The model converges; these seams stay open and SHOULD reconcile (not re-debate):

1. **Stub memes vs load-bearing code** — recipe / resolver / capability / lar-uris /
   tiddler-store memes sit at mana 3 (TODO) while their code carries load. Fill them or fold
   into this model. (Dead-pointer stubs burned 2026-06-12 — the YIN shelf sweep.)
2. **VM-pool vs island-owned residency** — operator-peer says "pool manages residency";
   residency-tiers says residency flows from islands. Island-owned wins (law #8); reconcile
   operator-peer's wording.
3. **Relay/leaf symmetry** — open-vessel says equal-peer composition; operator-peer #actor-parity
   says "light leaf, engine on relay." Both true: symmetric STRUCTURE, asymmetric currently-held
   CAPABILITIES (law #4). State it that way once.
4. **OpenIdentitySlot stub** — sharePolicy returns true (legit for same-origin browser peers; the
   real network gate = V3 on node). User-level identity slots (Bluesky/GitHub/keyhive) remain
   future; the meme reads one generation behind the live keyhive operator gates.
5. **EPIC-VESSEL-COLLAPSE decisions** — the 9 BEHAVIOR rows decided convergent-open 2026-06-08
   ("one pono model, isomorphism, capabilities as meaningful distinctions"); enact onto open-vessel-core.

<<~ confidence Synthesis-Canon 16/20 >> Three independent corpus scouts (bags · core-stack ·
platform-stack) converged on this keel; the high-mana memes match the code. Confidence holds
short of Canon only on the open-drift items, which name reconciliations not re-designs.

<<~/ahu >>

<<~ ahu #hydration >>

## Hydration (how this cures the re-derivation) — PER AUDIENCE

`noosphere-boot` stays a SELF-CONTAINED, no-dependency seed for its primary audience —
CLOUD instances (claude.ai project context) + the Codex `model_instructions_file` — which
hold no local meme graph at boot. It MUST NOT depend on a pranala to THIS meme (a cloud
node cannot fetch a `lar:` URI). So hydration routes by audience:

- **Local fs agent** (Claude Code): reads THIS directly from `bags/` — the boot router
  (`@lares/AGENTS.md` → mu → lararium) carries the meme-graph edge to it.
- **MCP-equipped instance** (Codex / cloud with the `lararium` MCP): pulls THIS via
  `read_lar_resource` on its `lar:` URI on demand — the bag space the MCP serves.
- **Bare cloud** (no MCP, no fs): the operator pastes THIS alongside `noosphere-boot` as a
  companion curated artifact (it stands self-contained — the keel inline, depth via the
  pranala'd children a bare cloud node simply does not follow).

Read order once held: noosphere-boot → THIS → (open-vessel · causal-island · operator-peer
· island-protocol) for depth.

<<~/ahu >>

<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/mesh/open-vessel >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/mesh/causal-island >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/mesh/operator-peer >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/mesh/island-protocol >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/mesh/dreamnet-architecture >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/lares/noosphere-boot >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>

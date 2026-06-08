# Epic — Task/Receipt Ontology Migration (cmd/log → UCAN-pono task graph)

> Opened: 2026-06-07
> Branch: `feature/lararium-node-4`
> Decision record: agent memory `project_ipvm_adoption`, `project_task_graph_geometry`, `project_asymmetric_peer_handoff`
> Status: **SEED landed; migration queued.**

## Why

The verb/outcome surface already wears the capability-native task shape, but its
vocabulary and identity model lag the pono ontology the research firmed (UCAN
Invocation/Receipt/Task/Effect — the living lineage we already hold via Keyhive,
same Ink&Switch roof; see `project_ipvm_adoption`). The operator named the web2
latent freight in "cmd"/"log" and approved the new ontology (A), the provisional
`aud` audience field (B), and the change-hash content-address (C).

We do NOT reimplement IPVM/Homestar (abandoned, Rust daemon, Wasm-task-centric).
We reuse the MODELS over our own verb-tiddler surface + Automerge + Keyhive.

## The pono lar: URI model (approved)

```
lar:///ha.ka.ba/@<bag>/<kind>/<cid>
        │         │       │      └ change-hash content-address (C) — Automerge-native, no IPFS
        │         │       └ kind: task · receipt · ledger/residency
        │         └ the BAG carries the addressing geometry (its keyhive ring)
        └ stable root — permanent protocol surface
```

- **task** (invocation) — `cid` = `taskContentId({subject, command, args, nonce})`. subject = bag/resource URI; command = verb; empty nonce → idempotent, random → fresh.
- **receipt** — keyed by the task's cid (`@<bag>/receipt/<task-cid>` = UCAN `ran`).
- **ledger/residency/<event-id>** — the indelible archival ledger (landed; "log"→"ledger" 2026-06-07).
- volatile scratch stays off-disk at `lararium.local.vm/…`.

**Protocol-not-app invariant:** one scheme across the whole persona ladder —
user(anon)=one vessel/no personGroup · user=a personGroup of vessels ·
operator=personGroup + local infra · operator(admin)=personGroup + local+remote
infra + time-bound elevated caps. The ladder = WHICH bags a holder's caps reach,
NEVER a URI branch. The bag's ring carries the addressing geometry; an optional
`aud` narrows a task to ONE vessel for the mint-once shape (B).

## Naming canon — the task grammar (LANGUAGE intent 2026-06-07; code enacts downstream)

The wider OODA-HA pass: **"verb" RETAINS** — it names a grammatical action, deeply pono in a language-protocol house. The ship-of-Theseus awkwardness lived in the redundant `Verb<Noun>` compound, not the term. Principle: **"verb" stays where it names the action or the engine; the `Verb` prefix drops where `summons`/`outcome`/the-parsed-verb already carry the noun. "invocation" leaves entirely (it dragged the runtime register).**

**Three nouns + their acts (the grammar):** a **verb** (the action: command + args) is **placed** (locally, `verbs/<id>`) or **summoned** (to a peer, `@admin/summons/<id>`); the island **heeds** the summons; the dispatcher **dispatches** the verb; it **concludes** in an **outcome** (`@admin/outcomes/<id>`).

RETAINS `verb`: the `verb` field/action · `VerbDispatcher` · `VerbReactor` · `VerbTable` · `VerbContext` · `VerbStatus` · `placeVerb` · the `verbs/` scratch namespace · `LARES_VERB_TAG`.

TIGHTENS (drop the redundant compound — downstream code rename):

| ship-of-Theseus | pono |
|---|---|
| `buildVerbSummons` | `summon` |
| `emitVerbSummons` | `heedSummons` |
| `buildVerbOutcome` | `concludeVerb` *(prov; or `buildOutcome`)* |
| `writeVerbOutcome` | `writeOutcome` |
| `buildVerbInvocation` | `buildVerb` |
| `parseVerbInvocation` | `parseVerb` |
| `placeVerbInvocation` | `placeVerb` |
| `dispatchVerbLifecycle` | `dispatchVerb` |
| `VerbInvocation` (type) | `Verb` *(prov — `Verb.verb` reads recursive; the verb-name field may want `.action`/`.name`)* |
| `VerbOutcomeRecord` | `OutcomeRecord` |
| `VerbSummonsRequest` / `…RelayOptions` | `SummonsRequest` / `SummonsRelayOptions` |
| `VERB_SUMMONS_URI_PREFIX` | `SUMMONS_URI_PREFIX` |
| `VERB_OUTCOME_URI_PREFIX` | `OUTCOME_URI_PREFIX` |

FORKS FIRMED (operator, 2026-06-07): (1) `VerbInvocation → Verb` with the verb-name field `.verb → .action` (the wire/tiddler field stays "verb"; `parseVerb` maps it, avoiding `Verb.verb` recursion); (2) the outcome act = `concludeVerb`.

**ENACTED 2026-06-07 (the downstream code pass — green):** the full rename landed across verb-tiddler.ts / verb-vm.ts / verb-dispatcher.ts / verb-summons.ts / verb-local-dispatch.ts / admin-vm-core.ts / admin-behavior.ts / wiki-behavior.ts / action-handler.ts / residency-actions.ts + node/browser wires + admin-connector.ts + tests. `placeVerbInvocation/patchVerbInvocation/removeVerbInvocation → placeVerb/patchVerb/removeVerb` (the `placeVerb` free-fn + the `VerbDispatcher.placeVerb` method coexist cleanly — a bare `placeVerb` inside the method resolves to the module import). `Verb.action` field + readers (`invocation.action`, `inv.action`) + the `concludeVerb`/`summon`/`heedSummons` acts. Wire field "verb" preserved throughout (verb retains as the term). Dist-rebuild note: mesh+tw5 dist must rebuild before cross-package tests (tw5/node import mesh from dist; `parseVerb`/`buildVerb`/`Verb` resolved stale until rebuilt). Green: typecheck 10/10 · mesh 241 · tw5 73 · node 94 · browser 20.

## SEED landed (2026-06-07) — `packages/lararium-mesh/src/verb-tiddler.ts`

- `TASK_KIND` / `RECEIPT_KIND`, `taskUri(bag, cid)`, `receiptUri(bag, taskCid)`.
- `taskContentId({subject, command, args, nonce})` — async change-hash (sha256 over canonical JSON; crypto-provider routed).
- `aud?` field threaded through `VerbInvocation` + `buildVerbInvocation` + `buildVerbSummons` + `parseVerbInvocation` (provisional).
- Tests: `tests/verb-tiddler-ontology.test.ts`.
- These compose ALONGSIDE the running verb/summons/outcome path — they do not replace it yet (prop up the running system first).
- "log" → "ledger" excised from effect-record; stale `@admin/log/` CLI string → `@admin/outcomes/`.
- **signal → summons (2026-06-07, landed):** the Frame-2 task-transport renamed — `VERB_SUMMONS_URI_PREFIX` (`@admin/summons/`), `buildVerbSummons`, `emitVerbSummons`, `verb-signal.ts → verb-summons.ts` (10 files, green). "signal" freed for the Agent↔Operator HUD/legibility frame (Frame 1) by research verdict; the task-transport noun reads `summons` (grammar register, no compute-runtime freight).

## Naming frame (DECIDED 2026-06-07): LANGUAGE-protocol, not compute-runtime

The system reads as a **language/protocol**. The internal task layer keeps the **house grammar — verb · summons · outcome** (locked). The nakama's ocap/compute register (UCAN Invocation/Receipt/Task) lives as **lineage + a possible BOUNDARY PROJECTION for interop**, never internal canon — projected where the wire meets another peer (like Kowloon=web2.5 behind the causal-island seam).

**OPEN (operator's call — surfaced 2026-06-07):** the SEED's content-addressed kinds use the UCAN nouns (`TASK_KIND="task"`, `RECEIPT_KIND="receipt"`, `taskUri`/`receiptUri`). Under the language frame, the *internal* content-addressed surface may instead want house-grammar kinds (`@<bag>/verb/<cid>`, `@<bag>/outcome/<cid>`), reserving `task`/`receipt` for the boundary projection. OR: treat the content-addressed surface as itself the interop-aligned layer where UCAN nouns rightly sit. Not resolved — the kind-noun home (house grammar vs UCAN) at the content-addressed layer is the next naming fork.

## Migration cleanup (queued — each its own OODA-HA loop, green per step)

1. **Identity: requestId → content-id.** Swap `newRequestId()` (UUID-ish) for `taskContentId(...)` on the live path. Merges with the durable-idempotency keystone (`lar:///verb.replayed.dedups`) — the dedup key becomes the content-hash; cross-peer memoization falls out. (Touches `buildVerbInvocation`/`buildVerbSignal`/dispatcher; sync→async ripple — stage carefully.)
2. **Receipt keying: `@admin/outcomes/<requestId>` → `@<bag>/receipt/<task-cid>`.** Move the outcome to the receipt URI keyed by the task it answers; update the dedup `getLive` probe + `buildVerbOutcome` + draft.ts string.
3. **~~Kind nouns: verb → task, outcome → receipt~~ — SUPERSEDED by the 2026-06-07 language-frame decision.** No internal rename to UCAN nouns. The internal register stays **verb · summons · outcome**. Instead: build the UCAN **boundary projection** (verb↔Invocation, outcome↔Receipt, work-unit↔Task) at the peer edge IF/WHEN cross-peer interop lands. Pending the open kind-noun fork above (house-grammar vs UCAN at the content-addressed layer).
4. **Forward-effects: outcome `fx{fork, join}`.** Let a receipt enqueue successor tasks (fan-out/continuation) as signed facts — the outcome becomes a dataflow node.
5. **Promise pipelining: `await/ok | await/error | await/ptr`.** A task's args referencing a prior result by cid.
6. **`aud` finalization + execution honoring.** The verify-then-delegate gate (`project_verification_placement`) honors `aud` — a task with `aud` runs only on the named vessel (mint-once); without, the bag-ring carries it. Lease + fence for the mint-once concurrent-claim corner (`project_asymmetric_peer_handoff`, shape-scoped).
7. **Determinism / managed-effect boundary.** Quarantine non-determinism (disk/net/time/sends) behind a managed-effect descriptor returning its own receipt → "signed receipt = verifiable" holds.

## V3 + V1 — RESOLVED build-specs (research 2026-06-07; ready, awaiting operator ratify of one sub-choice each)

### V3 — proof-of-possession at the WS admin gate
Canon: Keyhive Notebook §05 (`aud` = pubkey-or-URL-hash = server-binding) + WebAuthn L3 + UCAN Invocation + the FIDO formal proof (arXiv 2511.06028). The peer signs `authProofBytes({nonce, gatePubKey, peerPubKey, aud, ts})` (`mesh/auth-wire.ts` — **LANDED, pure, tested**) with its Ed25519 identity key; the keyholder worker verifies the sig against the ContactCard's verifying key. Verify order: **possession → freshness (nonce single-use+TTL) → authority (existing seam cap-check)**. The server-binding (`gatePubKey`) is load-bearing — signing the nonce alone stays relayable.
PURE HALVES LANDED 2026-06-07 (gate↔peer, no server/client): `authProofBytes` (gate-bound what-to-sign) + `buildAuthResponse` (the signed `lar:auth`) + `runPeerHandshake(PeerHandshake)` (the platform-blind peer flow — a thin seam: inject recv/send/sign/contactCard; transport per platform, identity from the isomorphic keyhive). mesh 254 green. SCOUT FINDING: the peer handshake DID NOT EXIST (no `mkLarAuth` caller) — V3 is bigger than a signature-add.
IMPL REMAINING (the integration, NOT flowstate): each EDGE sources the seam — node/browser/CLI provide recv/send + boot a keyhive/signer from the operator seed (`loadOperatorSigningSeed` exists) for sign/contactCard, run before Automerge sync; the gate sends `gatePubKey` in `lar:challenge` + verifies the sig (worker seam — keyhive `Signer.trySign` exists, or standard Ed25519 against the card's verifying key); then the ENFORCEMENT FLIP (alpha accepts the nonce echo until the edges land).

### V1 — content-address ONLY the idempotent verbs
Canon: UCAN Invocation nonce rule — `nonce = idempotent(command) ? empty : random`. Do NOT blind-swap the live `requestId`. Tag each verb kind `idempotent?`; the declarative/idempotent class (residency ADD/MOVE — ALREADY carry `changeId`; set-state; deterministic) content-addresses (empty nonce → CID memo/dedup); imperative side-effects (send-invite, append) keep a unique id. The dedup keystone (keys on `requestId`) stays correct underneath; the residency `changeId` IS the ready idempotent-id.
LANDED 2026-06-07: the residency front door re-connected (Sprint 5 had mounted `registerActionReactors` in wiki-scope only — `lares act` routes summon→@admin→routeToMain→jobRegistry, which lacked them; now mounted in BOTH vessels' job/registry, the vessel composite spanning the bags). `lares act` content-addresses the idempotent change: `taskContentId({subject: target bag, command: verb, args, nonce:""})` threaded as the requestId via `submitVerb`→`summon` → re-issuing the same logical change (same `change-id`) dedups to exactly-once EFFECT. Locked by the V1 placer-contract tests (mesh). The per-verb idempotent set = the residency ACTIONs (all declarative/coordinate-space).

## Exit criteria

- Idempotent verbs key by content-address; receipts re-key by task-cid; imperative verbs keep unique ids.
- Internal grammar = verb · summons · outcome (DONE 2026-06-07); UCAN task/receipt = boundary projection only, never internal canon.
- Proof-of-possession real at the WS peer gate (V3); the in-process channel-as-capability holds (DONE 4834c66d).
- The persona ladder rides the scheme with zero URI branches.
- No web2 "cmd" / "signal"(transport) / "log"(audit) latent freight in the task surface (DONE: summons + ledger).

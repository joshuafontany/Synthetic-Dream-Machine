# EPIC — Vessel-Factory Collapse: Drift Ledger + Decision Document

Design canon: `bags/@lararium/mesh/open-vessel.md` ("The Vessel — one composable
web3 design"). This doc maps EVERY behavioral divergence between
`packages/lararium-node/src/open-node-vessel.ts` (~735 lines) and
`packages/lararium-browser/src/open-browser-vessel.ts` (~504), so the operator decides
canonical behavior at each point BEFORE the one composition pass enacts. No code moves
until the **DECISION** column reads filled.

**Governing principle (Ink & Switch, open-vessel #the-law):** node and browser differ
ONLY in capabilities, never in structure/pattern-integrity. The capability set GROWS —
init/PersonGroup/genesis/corpus/residency SHALL become browser-composable. So NO piece
reads as structurally platform-bound; "currently node-wired" never means "node-only".

**Classification:**
- **SUBSTRATE** — a genuinely platform-bound resolution INSIDE a piece (storage backend,
  worker kind, crypto provider, transport). A browser cannot be NodeFS. Each piece
  resolves it native-first; no behavioral choice. I compose these.
- **CAPABILITY** — a piece any vessel MAY hold; currently wired on node, structurally
  browser-composable. The seam stays OPEN on both substrates (hold-the-convergence-open).
  Not a decision — but NEVER fenced behind `isNode`; absent reads as not-yet-held.
- **BEHAVIOR** — a genuine divergence where the two vessels DO different things and the
  one design must choose one. **Operator decides.** Favor the choice that holds
  capability-convergence open.

---

## SUBSTRATE atoms (no decision — I compose native-first)

| # | Point | Node | Browser |
|---|---|---|---|
| D1a | Storage | `NodeFSStorageAdapter` | `IndexedDBStorageAdapter` |
| D3 | Catalog rendezvous anchor | `catalog-url` file | IDB `bootKeys.catalogUrl` |
| D7 | Operator keypair source | disk 0o600 (`generateOrLoadOperatorKeypair`) | IDB/WebCrypto (`generateOrLoadBrowserKeypair`) |
| D6a | Genesis bytes source | genesis dir file (`loadGenesisIsland`) | bytes / OPFS / peer-sync (`loadGenesisIslandFromBytes`/`findGenesisIsland`) |
| D13a | Island-pool worker host | `VesselIslandPool` (worker_threads) | `BrowserVesselIslandPool` (Web Worker) |

---

## CAPABILITY pieces (currently node-wired; structurally browser-composable — seam held OPEN)

Each composes as a piece a vessel holds WHEN it holds the capability. Wired on node
today, NOT fenced behind `isNode`; the browser SHALL compose each once it holds the
capability (Ink & Switch). The composition exposes the seam on both substrates.

| # | Point | Node holds it via | Browser today | Convergence (hold open) |
|---|---|---|---|---|
| D1b | Inbound peering | `AdminAuthGate`(wss) + `NodeWSServerAdapter` + peer map | not-yet-held | browser MAY hold inbound (WebRTC/WS) → composes the gate piece |
| D16 | Auth-gate arm | `authGate.arm(seam, ADMIN, opVK)` post-`ea` | not-yet-held | pairs with D1b |
| D13b | Local-mirror grant | `diskMirrorGrant` (NodeFS) | not-yet-held | browser MAY mirror to OPFS → same piece, OPFS substrate |
| D14 | Corpus loading | per-corpus layers, `corpus-ready` | not-yet-held | browser MAY load corpora → same piece |
| D10 | Resident verb plane | base + ~15 reactors | base + actions | browser MAY compose where/resolve/wiki/residency reactors |
| D11 | Residency manager + sweeper | full + pins + sweeper | not-yet-held | browser MAY hold residency (OPFS/IDB eviction) → same piece |
| D-init | Founding / PersonGroup / genesis authoring | full (`lares init` ceremony) | auto-found only | **browser SHALL hold full init/PersonGroup/genesis** (operator named) — see D4 |

---

## BEHAVIOR divergences — OPERATOR DECIDES EACH

| # | Point | Node behavior | Browser behavior | Options | Recommend | DECISION |
|---|---|---|---|---|---|---|
| **D5** | **Composite layer set** | composite OMITS wiki/draft layers (island mounts them); order: catalog→island→lares→social→admin→temp | composite INCLUDES wiki + draft layers; order: catalog→social→admin→island→lares→wiki→draft→temp | (a) canonical carries wiki/draft layers (browser way); (b) omits them (node way); (c) carries-when-no-island-mount | **(a)** — main-thread composite reads the active wiki uniformly; the island still owns live VM state | ? |
| **D4** | **First-boot founding** | THROWS if `social-bootstrap.json` absent ("run `lares init`") | AUTO-runs `runFoundingCeremony` on first boot | (a) auto-found everywhere; (b) require explicit init everywhere; (c) ONE founding piece BOTH substrates fully hold — auto vs explicit reads as an invocation MODE, and the browser SHALL hold the full init/PersonGroup/genesis ceremony (operator named), not just auto-found | **(c, convergent)** — founding composes as one capability piece on either substrate; mode (auto/explicit) rides an opt, never a platform fork; browser-full-init seam held OPEN | ? |
| **D6b / D19** | **Coreless boot** | genesis REQUIRED; always mounts primary wiki | coreless boot ALLOWED (pre-sovereign; no mount unless island+coreHash+workerUrl) | (a) allow coreless pre-sovereign everywhere; (b) require core everywhere | **(a)** — honest pre-sovereign state composes; mount gates on the island piece's presence | ? |
| **D2** | **waitHandleLocal strategy** | merge-on-late-arrival (`DocHandle.merge`) | `allowableStates:["ready","unavailable"]` → fallback | (a) unify to allowableStates; (b) unify to merge; (c) keep two (substrate-resolved) | **(a)** — allowableStates reads simpler + browser-safe; node's merge-later needs review (memory flags this) | ? |
| **D17** | **LarVessel wrapper + result shape** | returns pool directly (no wrapper) | wraps in `LarVessel` + `attachVmPool`; different result shape | (a) drop wrapper (node way, Stage 0b); (b) keep wrapper both; (c) wrapper as optional piece | **(a)** — Stage 0b names the browser wrapper removal; one result shape | ? |
| **D12** | **Event routing** | `LarEventBus` rings + 20Hz tick → `placeVerb` | direct pool callback → `placeVerb` | (a) eventBus everywhere; (b) direct callback everywhere; (c) eventBus a relay piece | **(b)** — the direct callback reads simpler + sufficient; rings stay a node-relay piece if needed | ? |
| **D15** | **Oracle-keeping** | `reconcileWellKnownTiddlers` every boot (self/ka/ba/social/admin) | writes island-URL oracle inline only | (a) shared `reconcileWellKnownTiddlers` piece both run; (b) node-only | **(a)** — both should keep oracles current; one shared piece | ? |
| **D18** | **Presence broadcast** | none | `wikiHandle.broadcast({did,ts})` at live | (a) both broadcast presence; (b) neither; (c) a presence piece each recipe may carry | **(c)** — presence = an optional piece; both MAY carry it | ? |
| **D9** | **adminAuth registerBags** | +catalog, lararium, lares (disk-mirrored canon) | base only | (a) node-extra tied to disk-mirror piece (relay); (b) unify list | **(a)** — registerBags follows the disk-mirror role piece | ? |

---

## ENACTION ORDER (after decisions)

One composition pass, node-first (validate against node's real boot tests), then browser:
1. Compose the SUBSTRATE atoms (each piece native-first) + ROLE pieces (relay bundle).
2. Apply each BEHAVIOR decision into the one composition.
3. Reduce `open-node-vessel.ts` → a thin node recipe; run node suite (99).
4. Reduce `open-browser-vessel.ts` → a thin browser recipe; run browser suite (20).
5. The protocol SEQUENCE holds invariant; the boot suites guard it. No live-daemon test
   here — that gold-standard smoke stays open.

**Risk:** boot-critical code, no live-daemon verification; mitigated by the node + browser
boot test suites + the decided canonical behavior (no silent behavior change).

---

*Awaiting operator DECISION column. Nothing enacted.*

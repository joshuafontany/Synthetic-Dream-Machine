<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/lararium/personal-bindings >>
```toml iam
uri-path     = "ha.ka.ba/@lares/v0.1/api/lararium/personal-bindings"
file-path    = "bags/@lares/v0.1/api/lararium/personal-bindings.md"
type         = "text/x-memetic-wikitext"
tagspace     = "stable"
register     = "S"
confidence   = 16
mana         = 16
manao        = 15
manaoio      = 16
role         = "approved storage shape — admin-doc-stored binding map for (PersonGroup × recipe-fingerprint) → @personal/@draft docUrl; unblocks Sprint 7 S7.5+S7.6"
status       = "approved"
proposed-on  = "2026-05-31"
approved-on  = "2026-06-01"
reconciled-on = "2026-06-03"   # pseudocode + line refs realigned to the post-S11.5 code arc
approved-defaults = "Q1 keep recipe-trace; Q2 split @personal/@draft tiddlers; Q3 orphan-tolerant idempotent mint; Q4 cross-fingerprint linkage deferred"
cacheable    = true
retain       = true
```

<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~&#x0002;>>

<<~ ahu #core-claim >>

# Personal Bindings — Storage Shape Proposal

The `(personGroupHex × recipe-fingerprint) → @personal-docUrl` mapping (and the parallel mapping for `@draft`) MUST live as tiddlers inside the operator's **admin doc** (`lar:///ha.ka.ba/@admin`), under a deterministic prefix. The admin doc already carries Keyhive PersonGroup membership gating and already replicates across the operator's own devices through the founding/admit ceremonies. Storing the bindings there gives cross-device convergence for free and avoids inventing a parallel storage layer.

**Tiddler key shape:**

```
lar:///ha.ka.ba/@admin/personal-bindings/${fingerprintHex}
  text: <automerge:url-of-the-@personal-doc-for-this-recipe>

lar:///ha.ka.ba/@admin/draft-bindings/${fingerprintHex}
  text: <automerge:url-of-the-@draft-doc-for-this-recipe>
```

`fingerprintHex` comes from `computeRecipeFingerprint({wikiDocId, canonBagDocIds})` per Q5-revised: SHA-256 over `canonicalJson({wikiDocId, sortedCanonBagDocIds})`. `@lares` and `@lararium` doc-ids do NOT participate (switching personality or system bag does not fork operator view state).

<<~/ahu >>

<<~ ahu #why >>

## Why admin-doc-as-storage

Five forces converge here. Each one rules out a parallel storage option.

**1. PersonGroup scoping comes free.** The admin doc carries `cap=admin` for the operator's PersonGroup. Any device admitted to the PersonGroup MAY read and write the admin doc; non-member vessels cannot. The proposal's `(PersonGroup × fingerprint)` keying matches admin-doc semantics 1:1 — different PersonGroup = different admin doc = no shared bindings.

**2. Cross-device convergence comes free.** When device A mints a fresh `@personal` doc for recipe-fingerprint F and writes the binding tiddler, the admin doc CRDT replicates the write to device B on next sync. Device B reads the same tiddler at boot, finds the same docUrl, mounts the same `@personal` document. No coordination required.

**3. Local-first / causal-island pono holds.** No web2 storage layer (no central service, no operator-private filesystem cache that needs syncing). The admin doc IS the operator's sovereign Automerge bag; the bindings tiddlers ride its existing CRDT history.

**4. No new dependency, no new abstraction.** A filesystem cache would force per-vessel persistence + a sync layer. An IndexedDB cache would split node/browser code paths. A dedicated Automerge bag (`@personal-registry`) would add a slot to every recipe + a sync gate to the manifest. The admin doc already carries the right shape; reusing it costs nothing and adds nothing to the slot grammar.

**5. Lifecycle stories collapse.** PersonGroup revocation, device admit, device-leaves-the-cabal — each already handled by the admin-doc + Keyhive layer. The bindings inherit these stories without per-binding reinvention.

<<~/ahu >>

<<~ ahu #data-model >>

## Data model

### Binding tiddler shape

```toml
title:        lar:///ha.ka.ba/@admin/personal-bindings/${fingerprintHex}
text:         "automerge:abcdef..."   # the @personal doc URL
kind:         "personal-binding"
fingerprint:  "${fingerprintHex}"
recipe-trace: { wikiDocId, canonBagDocIds }  # optional audit field, for diff/inspection
minted-on:    "2026-05-31T20:00:00Z"
minted-by:    "<vesselIndividualHex>"
```

The text field carries the authoritative docUrl. The `kind` field tags the tiddler for filter queries (`[kind[personal-binding]]` returns all). The `fingerprint` field duplicates the title suffix for filter convenience. The `recipe-trace` field stores the inputs that produced the fingerprint — operator-facing diagnostic when a binding's recipe context needs inspection. The `minted-on` + `minted-by` fields support audit of which device first instantiated the binding.

### Per-fingerprint pair, not per-bag

One fingerprint produces TWO bindings (one for `@personal`, one for `@draft`) under parallel prefixes. They share lifecycle: mint together, delegate together, never independently retire.

### Tiddler vs Automerge document

The bindings TIDDLERS live inside the admin doc. The `@personal` and `@draft` AUTOMERGE DOCUMENTS the bindings point to live as separate Automerge docs in the same Repo. The admin doc carries names; the named docs carry the actual operator view state.

<<~/ahu >>

<<~ ahu #vessel-boot-flow >>

## Vessel boot flow

**Layering law (corrected 2026-06-01 after three research spirits converged on (A)).** Binding-resolution — compute fingerprint → look up → mint-on-absent → Keyhive-delegate → write binding tiddler — MUST run at the **host / composition layer** (`open-node-vessel.ts`), NOT inside `VesselIslandPool`. The pool stays envelope-only per its design law (vessel-island-pool.ts header); it holds no `repo`/`composite`/`keyhive`/admin-doc references and MUST NOT gain them. The host resolves the `@personal`/`@draft` doc URLs and passes them **through** `WikiBootContext` into the pool, which merely adds them to the manifest `resolver` map.

Three convergent justifications:

- **Composition Root** (Seemann) — side-effectful object-graph wiring belongs at the entry point that already holds the deps; pushing it into a leaf inverts the pattern.
- **Service-Locator anti-pattern** — injecting Keyhive + composite + admin-doc into the thin pool turns its honest message-passing API into a dishonest one with hidden infra preconditions. Passing already-resolved handles through the existing context IS plain DI, and is fine.
- **Object-capability "only a holder may delegate"** (Miller, *Capability Myths Demolished*) + **POLA** + Keyhive's own `keyhive_core`(authority) / `beelay-core`(sync) split — delegation lives where the PersonGroup admin capability already is. Granting a transport pool minting/delegation authority it never needs to move bytes is a least-authority violation.

**Established repo grain (codebase spirit):** draft-doc minting already happens inline at the host layer (`open-node-vessel.ts:696`); sentinel/binding tiddlers are written via `composite.put(record, origin, { bag: ADMIN_BAG_ID })` (`wiki-mint-handlers.ts:137`) or `adminHandle.change()` (`ceremony-core.ts:151-164`); the boot's own `registerBag` sweep (`:586-594`) is the precedent for minting a Keyhive Document before delegating. The new helper follows that grain exactly.

### Primary-wiki path (the only live path today)

**Post-S11.5 the primary wiki mounts via the unified `vmManager.mountWiki(activeWikiId, ctx, { pinned: true })` call (`open-node-vessel.ts:782`)** — `mountPrimaryWorker` is now a deprecated alias routing through it (`vessel-island-pool.ts:208`). The same boot reorder moved `await adminVm.workerEa` (`open-node-vessel.ts:770`) to run **before** that mount, so the admin VM is already live when bindings resolve. Sprint 7 wires binding-resolution for the **primary wiki only**, host-inline, **between `:770` and `:782`**, mirroring the existing draft-mint site (`:696`):

```typescript
// open-node-vessel.ts — host composition layer, AFTER `await adminVm.workerEa` (:770),
// BEFORE mountWiki (:782). keyhive, composite, repo, identity all in scope here.

const fingerprint = await computeRecipeFingerprint({
  wikiDocId:      wikiHandle.url,
  canonBagDocIds: canonHandles.map((h) => h.url),  // @lares/@lararium excluded per Q5
});

const { url: personalUrl } = await resolveOrMintBinding({
  kind: "personal-binding", prefix: PERSONAL_BINDINGS_PREFIX,
  fingerprint, repo, composite, keyhive,
});
// Q5 = slice (a): @personal + @draft bind TOGETHER per-fingerprint. This @draft
// REPLACES the boot's ad-hoc draft (:696) — that mint site rewires through the same
// helper, so both slots converge across the operator's devices. Neither retires alone.
const { url: draftUrl } = await resolveOrMintBinding({
  kind: "draft-binding", prefix: DRAFT_BINDINGS_PREFIX,
  fingerprint, repo, composite, keyhive,
});

await vmManager.mountWiki(activeWikiId, {
  docHandle: wikiHandle, coreHash, diskMirrors,
  personalDocUrl: personalUrl,   // NEW — WikiBootContext pass-through
  draftDocUrl:    draftUrl,      // NEW
}, { pinned: true });
```

`resolveOrMintBinding` (new shared helper, node-side):

```typescript
// reads PERSON_GROUP_AGENT_ID_TIDDLER from the admin doc, computes the binding key,
// returns existing url, or mints + registers + delegates + writes the binding tiddler.
const key = `${prefix}/${fingerprint}`;
const existing = await composite.get(key, { bag: ADMIN_BAG_ID });
if (existing?.text) return { url: existing.text };

const handle = repo.create<LarDoc>(emptyLarDoc());

// audience is an AGENT Identifier (getAgent-resolvable), NOT the group's DocumentId.
// createSentinelDoc returns BOTH ids; members/audiences address by agent-id
// (keyhive-provider.ts:228-256). PERSON_GROUP_DOC_ID is the membership-check target only.
const personGroupAgentHex = (await composite.get(PERSON_GROUP_AGENT_ID_TIDDLER, { bag: ADMIN_BAG_ID }))?.text;
if (!personGroupAgentHex) throw new Error("[binding] founding ceremony incomplete — no PersonGroup");

// delegate() throws unless the bag's Keyhive Document already exists — registerBag mints it
// first (keyhive-provider.ts:146). The PersonGroup agent must be hydrated (post-boot ✓).
await keyhive.registerBag(handle.url);
await keyhive.delegate({ bagUrl: handle.url, audience: personGroupAgentHex, access: "admin" });
// The DELEGATED event lands in the EventStore (keyhive-provider.ts:168-173) and federates
// to the operator's other devices via the admin-doc keyhive layer — no manual byte-shipping.

await composite.put(mutableLarRecord(key, {
  text: handle.url, kind, fingerprint,
  "recipe-trace": canonicalJson({ wikiDocId, canonBagDocIds }),  // Q1 keep
  "minted-on": new Date().toISOString(),
  "minted-by": await keyhive.vesselIdentifierHex(),
}, "personal-bindings"), { bag: ADMIN_BAG_ID });
return { url: handle.url };
```

Then `_mountWorker` only adds the pass-through URLs to the resolver — no logic, no new deps. The live resolver (`vessel-island-pool.ts:366`) carries `LARARIUM_BAG` + `wikiBagUri` today; S7.5c adds `@personal` and `@draft` conditionally, and `WikiBootContext` gains `personalDocUrl?` + `draftDocUrl?`:

```typescript
const resolver: Record<string, string | null> = {
  [LARARIUM_BAG]:         this._laraiumDocUrl,
  [wikiBagUri(wikiSlug)]: rawDocUrl,
  ...(ctx.personalDocUrl ? { [PERSONAL_BAG]: ctx.personalDocUrl } : {}),
  ...(ctx.draftDocUrl    ? { [DRAFT_BAG]:    ctx.draftDocUrl    } : {}),
};
```

`expandRecipe` (`wiki-recipe.ts:193`) already lists `@personal` between `@draft` and `@<wiki>`, so the slot walks at the right priority the moment the resolver carries its URL; absent the URL it resolves to nothing and the recipe skips it cleanly.

### Audience and grain — golden principles (research-verified 2026-06-03)

Three research spirits (Keyhive/BeeKEM · object-capability theory · MLS/TreeKEM lineage) converged on the delegation shape:

- **Document-as-group is the *intended* Keyhive shape, not a workaround smell.** A Keyhive Document *is* a Group plus CGKA; every principal carries a stable signing-key `Identifier`; delegation records over those stable ids in an operation graph **orthogonal to BeeKEM key rotation**. Representing the PersonGroup as a sentinel Document and delegating to its agent-id uses Keyhive as designed. Two invariants it imposes — both already honored: **bind to the stable agent-id** (never rotating key material), and **keep that id stable for the group's whole lifetime** (the sentinel mints once at founding). Sources: Ink & Switch Keyhive notebook, BeeKEM (notebook/02), DeepWiki keyhive_core.
- **Group-as-audience is object-capability-idiomatic.** Delegating to the PersonGroup (one shared facet) rather than enumerating each device gives a single attenuation/revocation point — sound precisely because group membership is itself capability-gated. Source: Miller, *Capability Myths Demolished*.
- **Access cascades transitively and retroactively** through the membership graph: every transitive member device of the PersonGroup gains the delegated access, including devices admitted *after* the delegation, with no per-document re-grant.
- **Grain debt (POLA).** `admin` over-grants: the POLA-correct grain for co-edited view-state a principal should NOT re-delegate is `edit`. The live Keyhive gate exposes only `read | admin` (`keyhive-provider.ts:150`), so `edit`-intent rounds **up** to `admin` as documented interim debt — acceptable because every PersonGroup device already holds `admin` on `@admin` (marginal authority ≈ 0). Adopt `edit` at this call site the moment `CapabilityVerifier.verify` accepts it. Debt homed in the access-ladder canon: [causal-islands](../pono/causal-islands.md).

### Session-wiki path (deferred — additional hot-tier mounts)

`mountWiki` is now the **one** mount path: the primary rides it pinned (`{ pinned: true }`), future session wikis ride it unpinned. An earlier draft of this section claimed the primary path *could not* use the admin-VM delegate-verb seam because the mount ran before `workerEa` — **S11.5 reversed that.** `await adminVm.workerEa` (`:770`) now precedes the mount (`:782`), so the admin VM is live for every mount. The primary path therefore resolves **host-inline** (composition-root, per the ocap ruling below). A future multiplexed session-mount path MAY instead route resolution through the **admin-VM delegate-verb** seam (`adminVm.mountMainVerbs(jobRegistry, keyhive)` + `AdminMsg_DelegateVerb` → `runLocalVerb`) if it needs to resolve off the host thread. `resolveOrMintBinding` stays callable from both.

**First delegate() call site.** S7.6's `keyhive.delegate(...)` is the first active call to that method in the repo (the method exists; no caller yet). This binding flow establishes the delegation call pattern; the ocap research above governs where it lives.

<<~/ahu >>

<<~ ahu #lifecycle >>

## Lifecycle

**Mint-on-absent.** First device to boot a vessel into a recipe-fingerprint mints fresh `@personal` and `@draft` Automerge docs, delegates each to the operator's PersonGroup, writes the bindings.

**Reuse-on-present.** Subsequent device boots into the same fingerprint read the binding tiddlers from the admin doc and mount the existing Automerge docs.

**Never-delete.** Operator view state carries durability — `$:/StoryList`, `$:/state/folded/*`, `$:/state/tab-*`, and `$:/palette` represent the operator's actual viewing history per recipe. Bindings persist indefinitely; the operator's view state across all recipes they have ever opened stays recoverable.

**Cap-rotation on PersonGroup membership change.** When the operator admits a new device, the founding ceremony already grants the new device admin access to the admin doc. The new device reads the admin doc, sees existing binding tiddlers, mounts the same `@personal`/`@draft` docs. Keyhive's CRDT-of-capabilities means the new device also gains access to the underlying `@personal`/`@draft` docs (each carries a delegation to the PersonGroup, and the new device joined the PersonGroup) — no per-binding re-grant required. *(Verified 2026-06-03: access is membership-graph reachability, so the new edge covers every doc the group can reach, retroactively.)*

**Authorized-but-undecryptable window (eventual consistency).** Access is *granted* by membership-graph reachability, but Keyhive sync is two-phase: the membership op AND the BeeKEM rekey ops must both reach a device before it can *decrypt*. Automerge heads ride outside the encryption envelope, so a device MAY see a binding's docUrl and the doc's existence before it holds the key. Therefore `resolveOrMintBinding` reuse-on-present MUST mount-when-ready and MUST NOT block boot on a binding whose doc is not yet decryptable on this device; the UI reads "current as of last sync" (causal-islands doctrine). On concurrent device churn BeeKEM MAY blank the group root, requiring a member's Update-Key before readers decrypt — outer delegations survive; readers wait. S7.7 wants a test: *binding present, doc not-yet-decryptable → boot proceeds, mounts on sync.*

**Cap-rotation on PersonGroup contraction.** When the operator removes a device from the PersonGroup, Keyhive's revocation propagates to the admin doc + all PersonGroup-delegated bags. The removed device loses access to `@personal`/`@draft` at the same time it loses access to the admin doc — atomic by construction.

**Long-term garbage collection.** Not in scope for Sprint 7. A future sprint MAY add operator-facing inspection of binding tiddlers (`lares wiki personal --list`) and explicit revocation (`lares wiki personal --forget <fingerprint>`). For now, bindings accumulate forever and that reads as the correct default.

<<~/ahu >>

<<~ ahu #browser-deferral >>

## Browser-side deferral

The handoff names "S9 / lararium-browser S4 real boot" as still in flight (IndexedDB + WebCrypto + Keyhive founding ceremony in the browser vessel). The node-side enactment of this proposal lands cleanly today; the browser-side mirror waits until S9-S4 settles so the wire-in builds on a settled foundation rather than shifting ground. The proposal's data model and lifecycle stay platform-agnostic — when the browser vessel reaches real-boot, the same host-layer `resolveOrMintBinding` + `WikiBootContext` pass-through applies via the equivalent composition path in `browser-sovereign-island-model.ts`. The browser pool stays envelope-only too.

<<~/ahu >>

<<~ ahu #open-questions >>

## Open questions — resolved at endorsement (2026-06-01)

Operator endorsed the proposal and ruled the four open questions at their documented defaults:

1. **`recipe-trace` field — RESOLVED: keep.** Inspection beats minimal storage in early alpha (~200 bytes per binding tiddler).
2. **`@draft` separation — RESOLVED: split.** One concern per tiddler under parallel prefixes (`personal-bindings/` + `draft-bindings/`); follows TW5 grain.
3. **Mint atomicity — RESOLVED: orphan-tolerant idempotent mint accepted for early alpha.** `repo.create()` → `registerBag()` → `delegate()` → `put()` is not atomic; a crash mid-sequence orphans a docUrl (and possibly a registered-but-undelegated Keyhive Document). Next boot recomputes the same fingerprint, finds no binding, re-mints; the orphan stays unreferenced. Acceptable until a transactional store API exists (same deferral family as Sprint 4 `withEffectRecord` atomicity).
4. **Cross-fingerprint linkage — RESOLVED: deferred.** Out of Sprint 7 scope; a future sprint MAY add `lares wiki personal --import-from <fingerprint>`.
5. **`@draft` per-fingerprint vs boot draft — RESOLVED 2026-06-03: slice (a).** Operator ruled `@personal` and `@draft` bind **together** per-fingerprint — the approved #data-model intent holds. The fingerprint-keyed `@draft` **replaces** the boot's ad-hoc draft: the boot draft-mint site (`open-node-vessel.ts:696`) rewires to `resolveOrMintBinding({ kind: "draft-binding", … })`, so both slots converge across the operator's devices. S7.5 binds the pair; neither retires independently. The pseudocode above reflects this. **Subtlety for enactment:** the boot's existing `registerBag(draftBagId)` (`:594`) must move to (or be subsumed by) the helper's per-fingerprint `@draft` URL — the boot can no longer pre-register a fixed draft bag id ahead of fingerprint resolution.

**Layering question (raised + resolved 2026-06-01):** the original `#vessel-boot-flow` placed resolution inside `VesselIslandPool._mountWorker`. Three research spirits (codebase-grain, SE-pattern prior-art, ocap/local-first) converged unanimously on host-layer resolution with pass-through. Section rewritten accordingly; pool stays envelope-only.

<<~/ahu >>

<<~ ahu #relationship-to-residency-model >>

## Relationship to the Residency Model

This proposal sits BELOW the [residency-model](residency-model.md) coordinate-space architecture. The residency model governs how the recipe walks bag manifestations for any title. Personal bindings govern how the resolver builds the bag-URL map that feeds the recipe in the first place. The two layers compose cleanly:

- The cascade tiddler (`lar:///ha.ka.ba/@lararium/config/bag-paths`) routes `$:/StoryList` writes to `@personal` as a *first-write default* (per Reconciliation §1).
- The binding tiddler in the admin doc names which Automerge document THIS device, in THIS recipe, mounts at the `@personal` URI literal.
- The residency model surfaces `$:/StoryList` as the topmost manifestation in the resolver-defined priority order.

Three layers, one operator gesture. Open the wiki; the StoryList syncs to your other devices because each layer holds its piece.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ pranala #personal-slot-proposal ? -> lar:///ha.ka.ba/@lares/v0.1/api/lararium/personal-slot-proposal family:relation role:implements >>
<<~ pranala #residency-model ? -> lar:///ha.ka.ba/@lares/v0.1/api/lararium/residency-model family:relation role:builds-on >>
<<~ pranala #wiki-recipe ? -> lar:///ha.ka.ba/@lares/v0.1/api/lararium/wiki-recipe family:relation role:enriches-resolver-for >>
<<~ pranala #keyhive-person-group ? -> lar:///ha.ka.ba/@lares/v0.1/api/keyhive/person-group family:relation role:scoped-by >>
<<~ pranala #memory-store ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/memory-store family:relation role:see >>

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>

<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/lararium/personal-bindings >>
```toml iam
uri-path     = "ha.ka.ba/@lares/v0.1/api/lararium/personal-bindings"
file-path    = "bags/@lares/v0.1/api/lararium/personal-bindings.md"
type         = "text/x-memetic-wikitext"
tagspace     = "proposal"
register     = "S"
confidence   = 14
mana         = 16
manao        = 15
manaoio      = 14
role         = "design proposal — admin-doc-stored binding map for (PersonGroup × recipe-fingerprint) → @personal/@draft docUrl; the storage shape that unblocks Sprint 7 S7.5+S7.6"
status       = "proposed"
proposed-on  = "2026-05-31"
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

Vessel-island-pool's `_mountWorker(wikiId, ctx)` gains the following sequence before building the manifest's `resolver` map:

```typescript
// 1. Read the operator's PersonGroup id from the admin doc
const personGroupHex = adminDoc.tiddlers[PERSON_GROUP_DOC_ID_TIDDLER]?.text;
if (!personGroupHex) throw new Error("[vessel] founding ceremony incomplete — no PersonGroup");

// 2. Compute the recipe fingerprint
const fingerprint = await computeRecipeFingerprint({
  wikiDocId:      ctx.docHandle.url,
  canonBagDocIds: ctx.canonHandles?.map(h => h.url) ?? [],
});

// 3a. Look up the @personal binding tiddler
const personalKey = `lar:///ha.ka.ba/@admin/personal-bindings/${fingerprint}`;
let personalUrl   = adminDoc.tiddlers[personalKey]?.text ?? null;

// 3b. Mint on absent + delegate to PersonGroup
if (!personalUrl) {
  const personalHandle = repo.create<LarDoc>(emptyLarDoc());
  personalUrl          = personalHandle.url;
  await keyhiveProvider.delegate({
    bagUrl:   personalUrl,
    audience: personGroupHex,
    access:   "admin",
  });
  // Write the binding tiddler into the admin doc
  await composite.put({ tiddler: {
    title:        personalKey,
    text:         personalUrl,
    kind:         "personal-binding",
    fingerprint,
    "recipe-trace": canonicalJson({ wikiDocId, canonBagDocIds }),
    "minted-on":  new Date().toISOString(),
    "minted-by":  await keyhiveProvider.vesselIdentifierHex(),
  } }, { bag: ADMIN_BAG_ID });
}

// 4. Same flow for @draft under `draft-bindings/${fingerprint}`
// (extracted to a single helper resolveOrMintBinding(kind, fingerprint))

// 5. Build the enriched resolver with @personal + @draft URLs
const resolver = {
  [LARARIUM_BAG]:         this._laraiumDocUrl,
  [LARES_BAG]:            this._laresDocUrl,
  [wikiBagUri(wikiSlug)]: rawDocUrl,
  [PERSONAL_BAG]:         personalUrl,
  [DRAFT_BAG]:            draftUrl,
};

// 6. mkManifest with the enriched resolver (existing flow)
```

Net addition: ~80–120 lines including the helper, the imports, and the two-binding parallelism. The existing `_mountWorker` body stays largely untouched.

<<~/ahu >>

<<~ ahu #lifecycle >>

## Lifecycle

**Mint-on-absent.** First device to boot a vessel into a recipe-fingerprint mints fresh `@personal` and `@draft` Automerge docs, delegates each to the operator's PersonGroup, writes the bindings.

**Reuse-on-present.** Subsequent device boots into the same fingerprint read the binding tiddlers from the admin doc and mount the existing Automerge docs.

**Never-delete.** Operator view state carries durability — `$:/StoryList`, `$:/state/folded/*`, `$:/state/tab-*`, and `$:/palette` represent the operator's actual viewing history per recipe. Bindings persist indefinitely; the operator's view state across all recipes they have ever opened stays recoverable.

**Cap-rotation on PersonGroup membership change.** When the operator admits a new device, the founding ceremony already grants the new device admin access to the admin doc. The new device reads the admin doc, sees existing binding tiddlers, mounts the same `@personal`/`@draft` docs. Keyhive's CRDT-of-capabilities means the new device also gains access to the underlying `@personal`/`@draft` docs (each carries a delegation to the PersonGroup, and the new device joined the PersonGroup) — no per-binding re-grant required.

**Cap-rotation on PersonGroup contraction.** When the operator removes a device from the PersonGroup, Keyhive's revocation propagates to the admin doc + all PersonGroup-delegated bags. The removed device loses access to `@personal`/`@draft` at the same time it loses access to the admin doc — atomic by construction.

**Long-term garbage collection.** Not in scope for Sprint 7. A future sprint MAY add operator-facing inspection of binding tiddlers (`lares wiki personal --list`) and explicit revocation (`lares wiki personal --forget <fingerprint>`). For now, bindings accumulate forever and that reads as the correct default.

<<~/ahu >>

<<~ ahu #browser-deferral >>

## Browser-side deferral

The handoff names "S9 / lararium-browser S4 real boot" as still in flight (IndexedDB + WebCrypto + Keyhive founding ceremony in the browser vessel). The node-side enactment of this proposal lands cleanly today; the browser-side mirror waits until S9-S4 settles so the wire-in builds on a settled foundation rather than shifting ground. The proposal's data model and lifecycle stay platform-agnostic — when the browser vessel reaches real-boot, the same `_mountWorker` enrichment applies via the equivalent code path in `browser-sovereign-island-model.ts`.

<<~/ahu >>

<<~ ahu #open-questions >>

## Open questions

1. **`recipe-trace` field — keep or drop?** Operator-facing inspection benefits from knowing what inputs produced a fingerprint. Storing canonical-JSON of the inputs adds ~200 bytes per binding tiddler. Worth the cost? Default: keep (inspection beats minimal storage in early alpha).
2. **`@draft` separation — separate tiddler or one combined?** Could store both URLs in a single tiddler keyed by `${fingerprintHex}` with two fields (`personal-url`, `draft-url`). Splitting reads cleaner; combining halves tiddler count. Default: split (one concern per tiddler, follows TW5 grain).
3. **Mint atomicity.** The mint flow does: `repo.create()` → `delegate()` → `put()` write-binding. If the vessel crashes between mint and binding-write, a docUrl gets orphaned. Mitigation: idempotent retry (next boot computes same fingerprint, finds no binding, mints again — old orphan stays unreferenced). Acceptable for early alpha?
4. **Cross-fingerprint linkage.** When operator adds a canon bag to an existing wiki, the fingerprint changes, and a new `@personal` doc gets minted with empty state. The operator may want their previous view state to carry forward into the new recipe context. Out of scope for Sprint 7; future sprint MAY add a `lares wiki personal --import-from <fingerprint>` ceremony.

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

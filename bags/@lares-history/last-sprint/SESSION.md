# Session State — Lararium Web3 Refactor

> Updated: 2026-05-12 (peer boot parity: digest-checked TW5 core blob boot for Node primary/admin/worker VMs)
> Branch: feature/lararium-node-3
> Purpose: Resume artifact — enough state to continue without prior chat context

---


## What Just Happened (2026-05-12 — peer boot parity / content-addressed TW5 core)

Node peer drift closed before browser-peer work proceeds. Browser peers were already intended to boot TW5 from the core/plugin blobs carried in the main Automerge docs; Node still leaned on the installed `tiddlywiki` package path for TW5 runtime authority. That split is gone.

| Component | Change |
|---|---|
| `tw5-vm.ts` | Added `TW5CoreBootBlob { bytes, sha256?, source? }`; `TW5Engine.boot()` verifies SHA-256 before evaluating/injecting core bytes. Node path evaluates the content-addressed TW5 core blob, not package runtime bytes. |
| `tw5-vm.ts` | Node blob boot now uses a narrow host membrane: synthetic package metadata, denied `fs`, explicit builtin allowlist, temporary virtual `window`/`require`/`module` only during boot, then global restoration. TW5 runs in neutral host profile (`node=null`, `browser=null`) and `loadTiddlersNode` is disabled so wiki content ingress stays on preloads/adaptors. |
| `open-node-lar-peer.ts` | Reads `LarariumDoc.blobs[ENGINE_CORE_ID]`, packages bytes + `sha256` + `source`, and passes that boot blob to primary and admin TW5 VMs. |
| `open-admin-vm.ts` | Requires `TW5CoreBootBlob` for admin VM boot. |
| `lar-worker-protocol.ts` / `node-vm-manager.ts` / `lar-wiki-worker.ts` | Hot worker promotion carries the same digest-checked `TW5CoreBootBlob`; worker protocol remains version `1` during alpha. |
| `@lararium/tw5` exports | Re-exported `TW5CoreBootBlob` type from package index. |

**Verification:**

- `pnpm --filter @lararium/tw5 build` — passes; pre-existing heleuma drift/missing-symbol diagnostics still report in dry-run output.
- `pnpm --filter @lararium/node typecheck` — passes.
- `pnpm --filter @lararium/node exec tsx scripts/test-quine.ts` — passes; grammar tiddler raw text hash survives VM round-trip.

**Boundary note:** this is an authority-narrowing boot membrane, not a malicious-code sandbox. Trust still roots in the genesis artifact/build chain and its content hashes.

---

## What Just Happened (2026-05-11 — Path H + P.3.5 + NodeVmManager tests)

Two sessions landed in one commit (`4d25401d`):

**P.3.5 — Worker-thread changeset application:**

| Component | Change |
|---|---|
| `lar-worker-protocol.ts` | `WorkerMsg_Changeset` reprotocolled: `added: Record<string,unknown>[]` + `deleted: string[]` arrays (no Automerge WASM in Worker) |
| `lar-wiki-worker.ts` | Changeset handler implemented: `wiki.addTiddler`/`deleteTiddler` per field, then `re.onChangeset(uris, origin, tw5.$tw.wiki)` for Scale-3 tick |
| `kumu-device.ts` | `ReactionEngine.onChangeset` gains optional `wiki?: BootScanSurface` — updates papalohe edge bindings before firing (correctness gap closed) |
| `node-vm-manager.ts` | `_subscribeDocChanges` derives tiddler delta from `DocHandleChangePayload.patches`; `unsubChange` wired at mount + teardown; snapshot `Automerge.getHeads` wrapped in try/catch (test stub safety) |

**Path H — Save-side auto-split (MemeSyncAdaptor):**

| Component | Change |
|---|---|
| `deserializer.ts` | `splitBodyTiddler(uri, bodyText, baseFields)` exported — fourth call site of `splitRecursive`; handles plain body text (no SOH/STX/ETX envelope needed) |
| `meme-sync-adaptor.ts` | `direct` save handler: detects `<<~ ahu` blocks, calls `splitBodyTiddler`, writes parent + children to bag, tombstones removed children. ONE parser, FOUR call sites law complete. |

**Tests:**

- `vm-manager-echo.mjs` fixture (lightweight Worker, no TW5/RE)
- `node-vm-manager.test.ts` — 7 lifecycle integration tests
- 35 tests passing, 4 skipped (3 suites)

**Heleuma:** 16 body-sha256 anchors updated; plugin bundle rebuilt (46 inner tiddlers, 120.4 KiB).

**J.3 closed:** `action-handler.ts` already enumerates `#fragment` children by URI prefix and co-promotes atomically under the same `ChangeOrigin`. HANDOFF was stale — marked ✅.

**Next open paths:**
- Path K — F-arc debounce (`$:/state/*` → projection, draft bag, 300-500ms captureTimeout in MemeSyncAdaptor). Important once browser peers come online.
- Path L — S7.4 admin doc ingress trust gate (`cap=infrastructure` proof on admin WebSocket federation)
- Path G.rest — remaining sigils (lele, papalohe, pae) — less urgent per operator

---

## What Just Happened (2026-05-10 — disk projection five-layer child memes)

Full end-to-end verification: `wikis/scratch/memes/docs/lares/the-lares-protocols/` now receives nine files (parent + 8 slot children), each with the canonical five-layer meme structure.

**Architecture hardening landed:**

| Component | Change |
|---|---|
| `disk-projector.ts` | Rewritten to subscribe to `wiki.addEventListener("change")` — TW5 VM primacy enforced. No Automerge subscription. Reads `bag` field from TW5 tiddler for mirror routing. |
| `projection-kinds.ts` | `DiskKindDeps` gains `tw5: TW5Engine`; `projector.start(deps.tw5)` replaces the old `peer.store` subscription path. |
| `meme-sync-adaptor.ts` | `_applyLiveRecord` and `onChangeset` bulk path both stamp `bag` field on TW5 tiddlers — disk projector reads bag provenance without touching Automerge. |
| `bag-mirror.ts` | `wikiShadowPathStrategy` extended with bare `lar:///ha.ka.ba/{rest}` URI fallback (no @-scope) → `memes/{rest}.md`. Fragment URIs → `memes/{path}/{fragment}.md`. Fixes the zero-projection bug for wiki-bag tiddlers. |
| `deserializer.ts` + plugin bundle | `splitRecursive` extended: `parentSourceFile` param threads to child `file-path` generation. Children receive full effective iam via `regenerateIamToml(effectiveIam, {})` with child-specific `uri-path` + `file-path` override. Child `file-path` strips the leading `#` from `block.slot`. **Build law: changes to `deserializer.ts` require `tsx scripts/build-plugin-tiddler.ts` — `tsc` alone is NOT sufficient (deserializer runs inside TW5 plugin bundle).** |
| `tw5-widgets.ts` | `LARARIUM_MEME_TEMPLATE_MARKDOWN_MEME` updated for five-layer child structure: conditional SOH (for tiddlers with `fragment-parent`), iam block (from `iam-source`), STX (`<<~&#x0002; >>`), `{{!!text}}`, ETX (`<<~&#x0003; >>`), EOT (`<<~&#x0004; -> ? >>`). Prologue emitted only when explicitly present (not inherited from parent). |

**Five-layer child file structure confirmed:**
```
<<~ &#x0001; ? -> lar:///ha.ka.ba/docs/lares/the-lares-protocols#thesis >>
```toml iam
uri-path = "ha.ka.ba/docs/lares/the-lares-protocols#thesis"
file-path = "wikis/scratch/memes/docs/lares/the-lares-protocols/thesis.md"
l-space  = "draft"
…
```

<<~&#x0002; >>

body text…

<<~&#x0003; >>

<<~&#x0004; -> ? >>
```

**OODA-HA code review findings (non-blocking smells):**

1. `meme-sync-adaptor.ts:129` — `targetBag` default is `"room"` (stale string from rooms→wikis rename). Cosmetic; the actual bag ID comes from each adaptor instance's constructor call in production.
2. `file-path` absent in child iam when authored directly in TW5 UX (not via disk sync) — `source-file` field not set → `parentSourceFile` empty → `childFilePath` undefined. Acceptable by design: tiddlers not yet on disk have no disk path. Behaviour is consistent.
3. `iam-source` mutex: explicit operator-authored block takes priority over generated iam. Correct.
4. `TimeoutNegativeWarning` — pre-existing Automerge repo noise. Non-blocking.
5. Heleuma drift `ha.ka.ba/@lararium/tw5/widgets/toml` — pre-existing, needs `--sync-modules --commit` to resolve.

**J.3 still open.** Parent + child tiddlers both land in wiki bag after `lares wiki sync`. `lares act MOVE` moves only the parent URI; children stay in wiki bag; canonical disk projector writes only what's in the canonical bag → child slot files never land in `packages/`. J.3 fix: promote handler must walk `#fragment` children and co-promote them atomically.

---

## What Just Happened (2026-05-09 — rooms→wikis full rename)

Global terminology alignment: every occurrence of the concept "room" as a _wiki workspace_ renamed to "wiki" throughout the codebase, filesystem, and URI namespace.

**Filesystem:**
- `rooms/` directory moved to `wikis/` on disk
- `.gitignore` entry updated

**URI namespace (breaking change — stored Automerge docs will use new keys after re-init):**
- `@lararium/rooms/{slug}` → `@lararium/wikis/{slug}`
- `@catalog/rooms/{slug}` → `@catalog/wikis/{slug}`

**Exported TypeScript symbols (auto-renamed via language-server, propagated across all import sites):**

| Old | New |
|---|---|
| `roomLarUri` | `wikiLarUri` |
| `roomDraftLarUri` | `wikiDraftLarUri` |
| `roomBagId` (alias) | `wikiBagId` |
| `roomShadowPathStrategy` | `wikiShadowPathStrategy` |
| `ADMIN_ROOM_SLUG` | `ADMIN_WIKI_SLUG` |
| `ADMIN_ROOM_URI` | `ADMIN_WIKI_URI` |

**Local variables, CLI flags, phase literals (sed batch across all affected files):**
- `roomId/Key/Handle/Store/BagId/Rec/Uri/DocUrl/Oracle/Idx` → `wikiId/Key/Handle/Store/BagId/Rec/Uri/DocUrl/Oracle/Idx`
- `existingRoomRec` → `existingWikiRec`, `existingRoom` → `existingWiki`
- `"room-ready"` (LarOpenPhase literal) → `"wiki-ready"`
- `"room-shadow"` (strategy key in main.ts) → `"wiki-shadow"`
- `--room` CLI flag → `--wiki`, `LAR_ROOM` env → `LAR_WIKI`
- `ROOM_PREFIX` → `WIKI_PREFIX`

**Schema field:** `CatalogDoc.rooms` → `CatalogDoc.wikis` (field renamed; legacy fallback paths updated)

**Default bag tier string:** `buildDirectRecord` default `targetBag` → `"wiki"` (was `"room"`)

**Affected files (14 total):**
- `packages/lararium-mesh/src/lararium-doc.ts`
- `packages/lararium-mesh/src/tiddler-store.ts`
- `packages/lararium-mesh/src/composite-store.ts`
- `packages/lararium-mesh/src/open-phase.ts`
- `packages/lararium-mesh/src/bag-mirror.ts`
- `packages/lararium-mesh/src/resolver.ts`
- `packages/lararium-mesh/src/catalog.ts`
- `packages/lararium-mesh/tests/composite-store.test.ts`
- `packages/lararium-mesh/tests/causal-island.test.ts`
- `packages/lararium-tw5/src/meme-write.ts`
- `packages/lararium-node/src/main.ts`
- `packages/lararium-node/src/open-node-lar-peer.ts`
- `packages/lararium-node/src/wiki-handlers.ts`
- `packages/lararium-node/src/epoch-handlers.ts`
- `packages/lares-cli/src/commands/wiki.ts`

**Build result:** `pnpm -r build` clean, zero TypeScript errors. `.lararium/` wiped for re-init.

**OODA-HA orient — next task:** Smoke J.3 child co-promotion with the live test artifact at `wikis/altar-fire/memes/docs/lares/the-lares-protocols.md`. This file contains multiple `<<~ ahu #slot >>` blocks. `lares wiki sync altar-fire` → `lares act MOVE ... --to lar:///ha.ka.ba/@lares --yes` should land _both_ the parent _and_ each `#fragment` child in `packages/lares-core/memes/docs/lares/the-lares-protocols/`. J.3 implement → smoke → verify.

---

## What Just Happened (2026-05-10 — Daemon smoke + J.3 gap)

Two commits:

| sha | What |
|---|---|
| `f2f0fdf0` | `requestKeyhivePromotion` stub export added to `causal-island.ts` — test suite was broken (import missing); 84+52+12 tests now green |
| `fd1691ae` | HANDOFF updated — daemon smoke campsite closed |

**Smoke result — happy path confirmed, gap revealed:**

1. `lares reset --force` → fresh genesis + new operator key
2. `lares serve` → daemon up, Keyhive initialized
3. `lares wiki sync altar-fire` → `ingested: 1` — disk file landed in room bag; `splitRecursive` created parent + N child tiddlers in bag
4. `lares act MOVE lar:///ha.ka.ba/@lares/docs/lares/the-lares-protocols --to lar:///ha.ka.ba/@lares --yes` → ceremony clean; audit tiddler written
5. Promoted parent file appeared in `packages/lares-core/memes/docs/lares/the-lares-protocols.md` with correct `<<~ kahea ahu #slot >>` refs — **but no child slot files**

**Gap named (J.3):** `lares act MOVE` is single-URI. `splitRecursive` creates `#fragment` child tiddlers in the bag alongside the parent, but the promote handler moves only the parent URI. Children stay in the room bag; disk projector for the canonical bag writes only what's in that bag. The parent renders correctly (always-split, always-kahea); the child meme files never land in `packages/lares-core/memes/`. The fix: promote handler must walk `#fragment` children of the promoted parent and co-promote them in the same ceremony. Named J.3 — recursive promote / child co-promotion.

Test artifact (`packages/lares-core/memes/docs/lares/the-lares-protocols.md`) deleted (untracked, no git rm needed). Server reset clean. `voices/` and `voices.md` in same dir are legitimate canonicals — untouched.

---

## What Just Happened (2026-05-09 late+2 — Sigil family arc)

Eleven commits across two arcs land the Sigil family work:

**G arc — sigil ports + factory:**

| sha | What |
|---|---|
| `a5878459` G.1 | aka URI sigil — `<<~ aka <uri> >>` parses to `aka` widget node, cascade picks template, html template emits `.lar-aka` span with shadow transclusion of target. URI_FORM_SIGIL_RE in lar-sigil-shared.ts matches aka/kahea/loulou. |
| `136a8c9f` G.2 | pranala-header — `<<~ ? -> uri >>` widget + cascade + templates. PRANALA_HEADER_RE matches the `?` token + arrow + uri shape. |
| `ab3453f6` G.3 | kahea + loulou URI sigils — widgets for nodes already matched by G.1's URI_FORM_SIGIL_RE. Both render as cascade-resolved spans. |
| `505932a0` G.4 | pranala edge sigil — inline (`<<~ pranala from -> to family:f role:r >>`) + block (with body) forms. PRANALA_OPEN_RE captures slot/from/to + key:value attrs. Single template branches on `<<pranala-body>>` non-emptiness. |
| `8a2e1fa2` G.5 | refactor — five widgets collapse into `widgets/_cascade-sigil-base.ts::makeCascadeSigilWidget(config)`. Net 590→97 lines of widget code (+165 line factory). Adding a new cascade sigil = config object, not a fresh prototype-chain dance. |

**J arc — meme/slot framing + iam round-trip:**

| sha | What |
|---|---|
| `cac583f8` J.1 | postamble symmetric with prologue — text after last ETX/EOT lands on parent meme as `postamble` field. Meme-template emits prologue + text + postamble. |
| `1e34a60a` J.2a | per-slot preamble/postamble + iam field capture. extractSlotStructure replaces extractAhuFields. preamble holds prose flanking iam toml; iam toml fields lift to native fields; text holds body proper between first and last inner kahea ref; postamble holds trailing prose. Slot is itself a "full published meme MD file" projection (operator-confirmed). |
| `28775447` J.2a refinement | `<<~ iam >>` sentinel in preamble records iam original position (operator may write prose on either side). SOH regex tightened to `<<~(⊙?)\s*&#x000<digit>;` so DOCTYPE comments + pranala-headers don't false-match. Parent-text postamble dedup. |
| `494666bc` J.2c | round-trip emission via meme-template. preamble-rendered field substitutes the iam sentinel with regenerated toml block. Meme-template uses `<$text>` widget (not `{{!!field}}` transclude) — per Jermolene GH #6712, `\rules only` pragma scope doesn't propagate through field transclude. |
| `bf893a78` J.2b | regenerateIamToml(fields, parentFields) — denylist + TOML formatter + default-elision. splitRecursive threads parentIam through recursion so deep slots elide against immediate parent's effective iam. Operator edits to native iam-class fields flow back to disk; inherited values disappear unless overridden. |

**Architecture invariant established (operator-confirmed): slot-as-full-meme-MD-projection.** Every ahu slot has the same structural shape as a meme root: prologue/preamble + iam toml + body + postamble. The deserializer applies the same split recursively so each slot file on disk reads as a self-contained "full published meme MD file." iam fields inherit down through the slot tree; default-elision keeps emission compact.

**Build/test posture:** `pnpm build` clean, `pnpm test` 52/52 passing, smoke clean across plugin boot + six sigils + slot round-trip + default-elision. Plugin envelope: 13 modules + 27 data tiddlers, 114.7 KiB.

**Outstanding (next):** end-to-end daemon smoke (`lares serve` + CLI MOVE (residency ACTION) with a real meme); kau cleanup (deferred — its dispatch is logic-heavy, not cascade-shaped); remaining G sigils (lele/papalohe/pae — less urgent per operator); Path I follow-ups (DOCTYPE/dash polish — single-backtick already cured).

---

## What Just Happened (2026-05-09 late+1 — Path V.2 + namespace alignment + Path A)

Three commits retire architectural debts and canonicalize TW5 module shapes.

| sha | What |
|---|---|
| `0adc3697` E.10.13 | TW5Engine boot path → plugin-tiddler load. `_registerWidgets` / `_registerDeserializer` / parser-wrapper-injection deleted. Boot pushes one envelope tiddler into `preloadTiddlers`; TW5's standard plugin loader unpacks. Namespace alignment: every Lares system title moved to `lar:///`. Tag VALUES stay TW5-conventional. Dual-distribution emits both canonical and drag-and-drop envelopes. |
| `8a543b6e` (docs) | E.10.13 closure docs + namespace decision recorded in `packages/lares-core/memes/api/pono/lar-uri.md`. |
| `430f40f5` E.10.14 (Path A) | Canonical TW5 module export shapes. Wikirule split into three module-type:wikirule files. Parser exports as `{ MemeticParser as "text/x-memetic-wikitext" }`. Widgets self-`require`("$:/core/.../widget.js"), set prototype chain, export under tag name. Plugin loader unpacks via canonical `$tw.modules.applyMethods` flow. In-process smoke harness lands at `scripts/smoke-plugin-boot.ts`. |

**Operator-flagged debts retired:**
  - Construction-path debt — parsers instantiate via canonical `$tw.modules` path. Single-backtick regression cured.
  - Sync-namespace debt — shadow-tiddler edits + in-VM plugin re-pack now sync to disk; MOVE (residency ACTION) no longer bugs out on `$:/`-prefixed system tiddlers.

**Decision recorded** in `packages/lares-core/memes/api/pono/lar-uri.md` under "TW5 System Boundary" subsection. Rule: lar:// for everything that crosses the sync filter; $:/ for browser-local UX state.

---

## What Just Happened (2026-05-09 late — original — Path V.2 + namespace alignment)

One commit (`0adc3697` E.10.13) retired two architectural debts in a single swing.

| sha | What |
|---|---|
| `0adc3697` E.10.13 | TW5Engine boot path converted to plugin-tiddler load. `_registerWidgets` / `_registerDeserializer` / parser-wrapper-injection block deleted. Boot pushes one envelope tiddler (`lar:///plugins/lares/memetic-wikitext`) into `preloadTiddlers`; TW5's standard plugin loader unpacks wikirule, parser, deserializer, widget modules + materializes cascade configs, templates, and `<$lar-meme-split>` global mount as shadow tiddlers. Folded with namespace alignment: every Lares system title moved from `$:/...` to `lar:///...` (cascades, mount, templates, plugin envelope). Tag VALUES stay TW5-conventional `$:/tags/...`. Dual-distribution build emits both `lares-memetic-wikitext.lar.tid` (canonical, sync-eligible) and `lares-memetic-wikitext.tid` (drag-and-drop) from one Vite library bundle (72.2 KiB each, 5 modules + 7 data tiddlers). |

**Operator-flagged debts retired:**
  - **Construction-path debt.** Parsers now instantiate via the canonical `$tw.modules` path. The single-backtick regression — produced by hand-rolled `stdParser.call(this, ...)` prototype-chain wrapping — is gone as a side effect.
  - **Sync-namespace debt.** Browser-side shadow-tiddler edits + in-VM plugin re-pack now sync to disk because every Lares system title sits in the `lar:`-only sync namespace. The MOVE (residency ACTION) no longer bugs out on `$:/`-prefixed system tiddlers. Drafts and per-operator UX state stay browser-local in `$:/` by design.

**Decision recorded** in `packages/lares-core/memes/api/pono/lar-uri.md` under a new "TW5 System Boundary" subsection of Path Taxonomy. Rule: lar:// for everything that crosses the sync filter; $:/ for browser-local UX state; tag values stay TW5-conventional in either case; `$:/`-titled plugin envelopes are a drag-and-drop packaging convention only.

**Build/test posture:** `pnpm build` clean, `pnpm test` 52/52 passing, plugin tiddler regenerates deterministically.

**Outstanding (smoke next):** boot the Node daemon, verify the plugin tiddler unpacks via the standard loader, exercise an ahu round-trip with the cascade-resolved markdown-meme template (expected emission: `<<~ kahea ahu #slot >>` per always-split-always-kahea law). Until smoke runs once, build/type/unit-test-green is necessary but not sufficient.

---

## What Just Happened (2026-05-09 night — yin-mode collapse + Path V.1)

Two layers of work landed: (a) yin-mode architectural collapse driven by web-research synthesis (Roslyn / recast / TW5 internals), (b) Vite plugin packaging that produces a drag-and-drop TW5 plugin tiddler.

| sha | What |
|---|---|
| `2d6da6f4` E.10.4-WIP | Begin template-cascade rewrite — drop mode-dispatch, scaffold templates. |
| `a9ff64c9` E.10.4 | Wikirule + cascade + templates — `<<~` first-class TW5 grammar. |
| `5d5fc3f7` (docs) | E.10.4 closure SESSION + ROADMAP + HANDOFF. |
| `c08a0a42` E.10.5 | Radical simplification — wikirule covers ALL sigils, 18 dead files purged (300+ lines deleted). MemeticParser nodeToTw5 collapses ~150 lines → ~15 lines. |
| `aa315259` E.10.7 | Cascade-by-shape + disk-projection gate + nested-ahu regex. |
| `6ba194e1` E.10.6 | MemeticParser → 30-line pragma-prepending wrapper; `prologue` field captures pre-SOH content (DOCTYPE comment). |
| `a6a5b50e` E.10.8 | Tag-driven file roots, full-depth split, `<$lar-meme-split>` action widget — closes the four-call-sites law. |
| `10bc4c2a` E.10.9 | Yin-cleanup — drop tag-driven cascade; consolidate ahu scanner; WikiParser subclass; lar-generated marker + content-equality guards. |
| `c734b030` E.10.10 | `tw5-typed` dev dep added (linonetwo / tiddly-gittly). |
| `b55d6f1a` E.10.11 | tw5-typed activated alongside hand-rolled types — coexistence, per-site migration path. |
| `99530399` E.10.12 (Path V.1) | Vite plugin config + build script ship `dist-plugin/lares-memetic-wikitext.tid` (71.3 KiB drag-and-drop artifact). |

**Architecture invariant established (operator-confirmed):**
  - **Always-split, always-kahea.** Deserializer + `<$lar-meme-split>` widget split every ahu sigil into its own tiddler at sync/save time. Parent text always carries `<<~ kahea ahu #slot >>` references for slot children. Disk emission canonical: parent file + N child files.
  - **Single source of truth.** ahu scanner + control-slot set + slot-path composer live in `@lararium/mesh/meme-ast/ahu-scan.ts`. Three callers (deserializer, action widget, wikirule) import from there. Drift = bug.
  - **Roslyn / recast / XInclude consensus**: serialization is a function of the tree, never of external metadata. Tag-driven discrimination (the `$:/tags/Lar/MemeRoot`-gated cascade) was the named anti-pattern; eliminated in E.10.9.
  - **Drag-and-drop ecosystem play.** `dist-plugin/lares-memetic-wikitext.tid` (V.1) installs in any TW5 5.4+ wiki; gives memetic-wikitext authoring + export without lararium-node infrastructure. Bidirectional: operators can author in vanilla TW5, export to .md, ingest into lararium. Same plugin code in both.

**Web-research dividends cited inline:**
  - Roslyn / red-green CST: serialization is a tree function, never metadata.
  - recast / magic-string: mutations re-print, untouched bytes verbatim.
  - XInclude / Org-mode / AsciiDoc: source-resident reference token IS the round-trip marker.
  - TW5 wiki.js: `nextTick` coalescing IS the transaction primitive.
  - TW5 GH discussion #6712: `\rules except` pragma scope ≠ transclude (Jermolene).
  - tobibeer/codemirror-6-tw5 + Lezer aligned territory for Path W.

**Outstanding (V.2 next push):**
  - Boot path conversion: `tw5-vm.ts` still runs imperative widget/parser registration mutations. V.2 replaces with plugin-tiddler load via TW5's `$tw.modules` flow.
  - **Single-backtick parser regression resolves as side effect** — TW5's plugin loader instantiates parsers via the proper construction path; eliminates our hand-rolled `stdParser.call(this, ...)` prototype-chain workaround.
  - Engine corpus integration: load the plugin artifact at lararium daemon boot.

---

**Architectural notes worth holding (E.10.4):**

- *The round-trip law*: ONE parser, FOUR call sites — disk sync (CLI `wiki sync`), CRDT inbound (MemeSyncAdaptor.onUriChanged), TW5 UX save (saveTiddler — Path H, deferred), disk export (exportMemeText). All consume `parseMemeText` output. This commit gets three of the four call sites aligned. Path H lands save-side auto-split next.
- *Templates not modes*: AhuWidget owns no scope decision. The cascade `$:/tags/Lar/AhuTemplate` evaluates filter expressions over the `lar-export-scope` variable; first non-empty result names the template tiddler. Operators override per-wiki by writing tiddlers tagged `$:/tags/Lar/AhuTemplate` — no TS recompile needed. Render scope decisions live in TW5 grammar, not in JS.
- *Wikirule unlocks browser authoring*: `<<~ sigil ... >>` syntax becomes first-class wikitext. Drafts in TW5 UX recognize the syntax without a custom parser. Operator's stated next-tier UX requirement — author memes inside the live wiki, sigils auto-promote to child tiddlers on save (Path H closes the loop).
- *Three small wikifier diff items remain* (DOCTYPE HTML comment, em-dash conversion of `|---|`, aka URI sigil routes to empty `<<~ ahu>>`). Aesthetic, not load-bearing — Path I.

## What Just Happened (2026-05-09 late — E.10 follow-ons hardened the canon ceremony AND rewrote ahu render dispatch)

The E-arc closed but the canon-MOVE (residency ACTION) broke under load when tested against a real meme. Four follow-on commits hardened everything end-to-end and pivoted ahu rendering to a TW5-native architecture.

| sha | What |
|---|---|
| `ba7a518e` E.10.1 | Closed the sync→draft→promote loop. Keyhive registers all writable bags at boot (lar: URIs, not automerge: URLs). New `lares draft <uri>` ceremony — pulls a tiddler from any composite-resolvable bag into a writable draft; the missing third leg between `wiki sync` and `promote`. New `CompositeStore.defaultWritableBagId()` accessor. |
| `4262cef2` E.10.2 | Hardened cross-bag MOVE (residency ACTION). Six interlocking bugs fixed: BAG_IDS.lares + BAG_IDS.lararium open as writable+defaultWritable:false (canon writes work; default writable still routes to room); MemeSyncAdaptor.onUriChanged — only crdt-remote events go through buffer gate (local-origin events apply immediately, cross-bag promote-write reaches TW5); AutomergeDocStore.tombstone fires {deleted:true, bag:this.bagId} (listeners can route per-bag); disk-projector per-bag unlink on tombstone (room file disappears, canonical stays); MemeSyncAdaptor cross-bag tombstone walks composite.getLive() (no "promote wipes its own write" race); promote/where source-detection via listBagsHolding (stale tombstones in draft layers no longer masquerade). New `composite.getLive()` helper. |
| `50d93821` E.10.3 | exportMemeText routes through `wiki.renderTiddler` with `lar-export-scope: "carrier"` (renamed to "markdown-meme" in E.10.4). Per-slot iam toml emission added to `dispatchSlotRenderMode("carrier")` with hardcoded suppress list. Note: this commit's mode-dispatch architecture got replaced wholesale in E.10.4 below. |
| `2d6da6f4` E.10.4-WIP | Begin template+cascade rewrite. Mode-dispatch widget architecture deleted; `transformParentText` deleted; `dispatchSlotRenderMode` markdown-meme branch deleted. Template memes authored at `packages/lararium-tw5/memes/templates/{ahu,meme}/`. AhuWidget rewritten as cascade-resolve + transclude shim. exportMemeText points at meme-level template + scope variable. |
| `a9ff64c9` E.10.4 | **The big architectural pivot.** `<<~` becomes first-class TW5 grammar via a new wikirule module (`wikirules/memetic-wikitext-sigil.ts`) — block + inline forms, mutates `WikiParser.prototype.{block,inline}RuleClasses`. Cascade tiddlers `$:/config/Lar/AhuTemplate/{html,markdown-meme}` plus their template tiddlers ship as preload. Template uses `\rules except lar-sigil-block lar-sigil-inline macrocallinline macrocallblock` so literal `<<~ ahu` survives instead of recursing. MemeticParser, deserializer, wikirule registration moved from async `import().then()` to synchronous module imports — eliminates the parser-not-registered-at-first-render race. Deserializer sets `slot` and `fragment-parent` fields on child tiddlers (template's `{{!!slot}}` resolves; `[field:fragment-parent[<uri>]]` filter enumerates slots). exportMemeText threads currentTiddler + lar-export-scope through renderTiddler options. Round-trip verified end-to-end. |

## What Just Happened (2026-05-09 evening — S8 wiki composition closed via E.1→E.10)

E-arc closed end-to-end. Ten commits + this closure commit. Twelve operator verbs ship across two subcommand surfaces (`lares bag` + `lares wiki`).

| sha | What |
|---|---|
| `3f33f6dc` E.1 | `lares bag` subcommand refactor — retire flat pin/unpin/residency/register-cold; ship `lares bag pin/unpin/stats/register-cold`. Backwards-incompatible CLI break, accepted at hobbyist scale. |
| `3afaf226` E.2 | Explicit `BAG_IDS.projection` MemoryTiddlerStore layer. Top-priority composite layer; `defaultWritable: false` so unbagged writes still route to draft. |
| `9d2c0821` E.3 | Per-wiki draft refactor. `roomDraftLarUri(slug)` replaces static `BAG_IDS.draft` constant in composite-layer bagId namespace. |
| `22efd1f7` E.4 | `lares wiki list` + `wiki which`. Read-only commands; prove subcommand dispatcher pattern at wiki granularity. |
| `0441d456` E.5 | `lares wiki init/open/sync`. End-to-end disk → CRDT path. The protocols meme authored in earlier sessions now lives in TestWiki's canonical Automerge doc. |
| `ce42baaf` E.6 | `lares wiki pin/unpin` (whole-recipe). Walks bag-stack and fan-outs residency calls. |
| `e3d8f6cf` E.7 | `lares wiki add-bag/remove-bag`. Hot-reload via composite addLayer/removeLayer. Research-informed (Pattern 5 SQLite refcount, Pattern 3 MNT_DETACH drain, Pattern 1 VS Code per-title delta). |
| `ea973973` E.8 | `lares bag epoch` + `lares wiki epoch`. DXOS-style snapshot-restart. Tombstones survive (Cassandra rule). Catalog oracle records `epoch-prev` for forensic recovery. |
| `9479a144` E.9a | `lares wiki rotate-recipe`. Nix-generations stack rotation. Each rotation accumulates a `canon/v{n}` underlay slot at lower priority. |
| `fb4690ea` E.9b | `lares wiki prune-stale`. Read-only inspection of stale draft tiddlers; `--days <N>` threshold. |
| (this) E.10 | Closure: HANDOFF + SESSION + ROADMAP + memory updates; smoke recipe extension. |

**Architectural notes worth holding:**

- *Twelve operator verbs* span the bag-level surface (5 verbs: pin/unpin/stats/register-cold/epoch) and the wiki-level surface (7 verbs: init/open/sync/pin/unpin/add-bag/remove-bag plus list/which plus epoch/rotate-recipe/prune-stale = 12 wiki verbs total). Total CLI surface: top-level `init/promote/bag/wiki/status/serve/dev/reset/fresh/build-genesis/test-quine/heleuma/help`.
- *Three GC primitives ship*: bag epoch (snapshot-restart one bag, bound history), recipe rotation (whole-wiki fresh start with retained underlays), prune-stale (operator inspection of forgotten drafts). Per the research, these compose to give Lares the only practical history-elision pattern in deployed local-first CRDT space (DXOS Epochs + Nix generations + Kafka-style stale-key surfacing).
- *Disk → CRDT direction operational* via `lares wiki sync`. First time the codebase ships this direction. Direct doc writes via `repo.find()` + `handle.change()` bypass composite-overlay routing because the target wiki may not be the daemon's currently-mounted active room.
- *Open caveats*: `wiki open` writes a marker tiddler but the daemon doesn't live re-mount — operator must restart `lares serve` to pick up the new active room. Live re-mount waits on F-arc. Recipe-rotation's draft-drain step also waits on F-arc routing rules.

### Where the arc rests

S5.8 ✅, S6 ✅, S7.1 ✅, S8 ✅. Branch holds the full E-arc plus the closure. Origin pending push.

Next path candidates (HANDOFF Path A→E):
- **A** — F-arc: TW5 routing rule + Yjs-style `captureTimeout` debounce shim + auto-truncate projection
- **B** — S7.4 admin doc ingress trust gate
- **C** — dreamdeck-app sprint (browser peer scaffold; picks up C.5 same-machine consolidation)
- **D** — `<$lar-promote>` action-widget UI shim
- **E** — heleuma authoring + federated promotion

---

## What Just Happened (2026-05-09 — S6 BagResidencyManager closed)

S6 closed end-to-end. Five commits on top of S7.1's evening close.

| sha | What |
|---|---|
| `67525b63` C.2 | LRU + idle sweeper + sync-state guard. `enforceCap()` trims hot when over cap; `sweepOnce()` evicts idle non-syncing bags then re-trims; `evict()` refuses bags with `syncActive=true` (the automerge-repo#358 invariant). Sweeper unrefs the timer so daemon shutdown stays clean. |
| `6ecd17f0` C.3 | `register-cold` handler + CLI command. Surfaces the API for oracle stub-by-default — URLs known but not loaded. |
| `00bd9771` C.4 | `composite.attachResidency()` wires reads through residency.touch. `lares status` adds a residency line. **Pin namespace bug caught**: C.1 had used `handle.url` (automerge:) but composite layers use `bagId` (lar:); pinned set never intersected reads. Fixed by switching pins to `BAG_IDS` constants. |
| (this commit) C.6 | S6 closure docs. C.5 same-machine peer consolidation deferred to dreamdeck-app sprint where the consumer side firms up against real demand. |

**Architectural notes worth holding:**

- *onEvict stays a stub.* The manager's book-keeping (LRU, idle sweep, sync-state guard) lands now. Actual Automerge handle drop waits on automerge-repo#358 (no public eviction API today). Wiring complete; payload pending upstream.
- *Hot tier reflects reads against non-pinned bags.* All 7 boot-pinned infrastructure bags stay pinned; hot populates only when reads land on bags outside the pin set (corpus children, future dynamic bags).
- *Cold-promote-mid-`composite.get()` deferred.* Composite knows how to touch existing layers but not how to mint new ones for cold-stub URLs — that requires repo.find() integration plus C.5's same-machine consolidation story.

### Where the arc rests

S5.8 ✅, S6 ✅, S7.1 ✅. Branch holds 5 S6 commits + 1 closure commit since the morning's `3dfa5c3c`.

Next path candidates (HANDOFF listings):
- **A** — S7.4 admin doc ingress trust gate (newly unblocked by S7.1's cap layer)
- **B** — dreamdeck-app sprint (browser peer scaffold; picks up C.5 in context)
- **C** — `<$lar-promote>` action-widget UI shim
- **D** — heleuma authoring (still deferred)
- **E** — federated promotion (longer horizon)

---

## What Just Happened (2026-05-08 evening — S7.1 closed via D.3 → D.6)

Cap layer landed end-to-end. Three more commits on top of the morning's D.1+D.1.5+D.2.

| sha | What |
|---|---|
| `108c54d7` D.3 | operator-key.ts ↔ KeyhiveProvider bridge. `loadOperatorSigningSeed` surfaces the 32-byte private seed; `KeyhiveProvider.init({seed})` derives the same identity as `verifyingKey`. Sanity-check log fires if the bridge ever drifts. Self-verify: ok=true. |
| `0d632011` D.4 | `AdminEventStore` persists every Keyhive event as `$:/tags/CapEvent` tiddlers under `lar:///@admin/cap/<sha256>`. SHA-256 de-dup via composite.get pre-write. `keyhive.hydrateFromEventStore()` re-ingests on boot. Restart cycle smoked: same DID + same self-admin survive. |
| `a69bcffe` D.5 | `CommandContext.cap` becomes a curried `(access, bagUrl) → Promise<{ok}>` closure bound to each command's `requestedBy` DID. `CapabilityVerifier` interface decouples dispatcher from `@lararium/keyhive`. Promote-handler enforces `ctx.cap("admin", toBag)` before any composite read. CLI loads operator's verifyingKey via the new `loadOperatorVerifyingKey` and submits `0x` + hex as the DID. |

**Three architectural notes worth holding:**
- *Two-tier policy holds.* Keyhive provides the binary read/admin cryptographic gate. Future action-handler ABILITY_LADDER caveats (e.g. "only specific peers may push canon") layer above the Keyhive proof. D.5 wires the Keyhive layer; the application layer waits for federated peers.
- *D4.a "minimum-viable" scope.* All Keyhive events route to the admin doc today regardless of semantic scope (operator-principal vs document vs group-CGKA). Per-bag routing per the strict D4.a decision is reserved for when federation actually pressures it. Captured in HANDOFF "Don't re-decide" + memory.
- *Pre-alpha hiccup logged.* `ingestEventsBytes` occasionally hits `Stuck on a fixed point: ReceiveCgkaOpError(UnknownInvitePrekey)` on hydrate when CGKA events re-ingest out of natural causal order. Non-fatal — operator identity + admin proof verify regardless. Track when bumping past `0.0.0-alpha.56c`.

### Where the arc rests

S5.8 ✅, S6.C.1 partial, S7.1 ✅. Next path candidates documented in HANDOFF:
- **A** — resume S6 (C.2 LRU + sweeper, C.3 oracle stub, C.4 hydrate-on-read, C.5 same-machine consolidation, C.6 closure)
- **B** — S7.4 admin doc ingress trust gate (newly unblocked by S7.1)
- **C** — `<$lar-promote>` action-widget UI shim
- **D** — heleuma authoring (still deferred)
- **E** — federated promotion (longer horizon)

---

## What Just Happened (2026-05-08 — S5.8 closed; S6.C.1 + S7.1.D{1,1.5,2} opened)

Big arc in one session. Three sprint movements landed; two more opened and paused awaiting research.

### S5.8 Promotion Ceremony — closed (six-commit B-arc)

| sha | What |
|---|---|
| `47d72020` B.1 | `@lares/cli` package scaffold + `lares init` (replaces old pnpm scripts) |
| `50a9c5be` B.2 | Full taxonomy port — status, serve, dev, reset, fresh, build-genesis, test-quine, heleuma |
| `b564ef0c` B.3 | Command-tiddler protocol + TS dispatcher in `@lararium/node`; echo handler smoke |
| `1681e83f` B.4 | Promote handler (TS, factory closing over room composite) + audit-event side channel |
| `1ff23ede` B.5 | `lares act MOVE <uri> --to <bag>` CLI; WS-attach to daemon, recipe-presence preview, polled round-trip |
| `1d4df5b2` B.6 | Smoke green; HANDOFF + memory updates |

End-to-end CRDT-native CLI ↔ daemon coordination via command-tiddlers in the admin doc. **No HTTP/RPC dispatch surface anywhere** — preserves web3-only invariant.

### Three-tension fix — single commit on top of B.6

Captured tensions surfaced after B.6 closure; fixed in one pass:

- **Tension 1 (cmd-tiddler tombstone hygiene).** Old shape: one tiddler at `cmd/<id>` carried both signal AND result; CLI tombstoned after read; CLI crash mid-flight = dirty namespace. New shape: split signal from record. `cmd/<id>` thin signal-only (status state machine). `log/<id>` durable record (full result+audit). Dispatcher tombstones cmd/<id> after writing log/<id>. CLI polls log/<id> and never tombstones. Crash-safe.
- **Tension 2 (heleuma deficit).** 54 missing source-file memes. `parse-args.ts` marked `@heleuma:exempt`; remaining 54 scaffolded via `lares heleuma --write`; `bin/lares.ts` anchor authored beyond stub. `lares heleuma` now reports "all aligned."
- **Tension 3 (corpus-vs-engine package asymmetry).** Documented as category boundary. Corpus packages hold tiddler-package projections; engine packages run `src/`+`dist/`+`tsc`. Inline note in `packages/lares-core/index.js` forbids TS migration.

### S6 BagResidencyManager — opened C.1, paused mid-arc

Triggered by an explicit operator scale concern. Two background research agents returned with a cluster of golden principles (working set << total store; tier hot-warm-cold; sync the index before content; compress history into strata; one authoritative writer per bag).

C.1 commit landed `BagResidencyManager` skeleton in `@lararium/mesh/bag-residency.ts` — pinned/hot/cold tiers, `pin/unpin/touch/registerCold/evict/setSyncActive` surface, stats reporting. **No eviction logic yet** — instrumentation only by design (research warning: don't theorize eviction policy, watch numbers grow under real use). Three CLI commands wired: `lares pin <url> [--reason]`, `lares unpin <url>`, `lares residency`. Daemon pre-pins all infrastructure docs at boot.

Sprint paused after C.1 to scope S7 — the cap layer is what S7 needs and changes shape downstream of decisions made there.

### S7.1 Capability Layer — opened D.1, D.1.5, D.2; paused for design

Two research streams reframed the original "use UCAN, swap to Keyhive later" plan:

1. **UCAN library survey** returned with: *Keyhive does NOT use UCAN.* It uses concap (convergent capabilities, CRDT-shaped revocation). Migration UCAN→Keyhive is re-implementation, not swap.
2. **Keyhive deep-dive** confirmed: concap spec is design-phase ("very recently begun to implement" per Notebook 01), but `keyhive_wasm` (npm `@keyhive/keyhive`) ships as pre-alpha 0.0.0-alpha.56c with TypeScript bindings. Operator chose **adopt directly** rather than hand-roll concap-shape from incomplete spec.

D.1 probe (`packages/lararium-keyhive/probes/operator-delegate-device.ts`) end-to-end exercised init → contact-card exchange → registerBag → addMember → SignedDelegation. Verdict: **WORKABLE.** D.1.5 enumerated `Access.tryFromString` → only `read` and `admin` accepted (binary, NOT our 8-step ABILITY_LADDER). Captured event variants per ceremony: PREKEY_ROTATED (frequent ~172B), CGKA_OPERATION (3×), DELEGATED (2×).

D.2 landed `CapabilityProvider` interface + `KeyhiveProvider` impl in `@lararium/keyhive/src/`. End-to-end provider smoke green: two providers init, exchange contact cards, register a bag, delegate, verify admin access, 8 events captured per ceremony.

Three architectural decisions locked across the D-arc:

- **Two-tier policy.** Keyhive provides the cryptographic gate (binary read/admin). Application layer (action-handler etc.) checks finer-grained ABILITY_LADDER caveats only AFTER Keyhive's admin proof verifies.
- **Sync semantics: γ-with-operator-α-mirror.** Room peers hold the cap-subgraph for bags they're members of (Beelay's transitive-closure-rooted-at-doc rule). Operator's own devices hold the full cap log across all bags as a strict subset. NOT (β) full-graph (leaks topology). NOT pure (α) operator-private (breaks revocation propagation). Forward-compatible with Beelay/Keyhive's production model.
- **Cap-event home: D4.a — inside the bag's own Automerge doc.** Title `lar:///{bag-uri}/cap/{event-id}`, tag `$:/tags/CapEvent` (with sub-tags Prekey/Cgka/Delegation/Revocation). TW5 research drove this: bags are policy boundaries (not performance boundaries); cap events MUST share the bag's sync surface (peer with bag but no cap log can't validate writes); Automerge has no cross-doc atomicity. Companion-doc shape reserved for future performance tuning only.

**Pin pre-alpha:** @keyhive/keyhive `0.0.0-alpha.56c`. Treat upgrades as planned breaking changes per operator's named migration policy.

### Where the arc rests now

Branch is at origin (`0e120ec4`); 11 unpushed commits actually pushed when checked. Three pending docs (HANDOFF, SESSION, ROADMAP) updated this turn to capture the locked decisions.

Next code work: D.3 (operator-key bridge: tie `operator-key.ts` ed25519 to KeyhiveProvider; `lares init` writes operator's `cap=infrastructure` self-delegation). After D.6 closes S7.1, resume S6 (C.2-C.6: LRU sweeper, oracle stub-by-default, hydrate-on-read, same-machine consolidation).

---

## What Just Happened (2026-05-07 — S5.6 Admin VM Lift complete)

Five-step sub-arc closed (A.1 → A.5):

**A.1 `9461d7ca`** — `seedAdminDoc()` in `genesis-island.ts`; `reconcileWellKnownTiddlers` extended with optional `adminUrl`. AdminDoc reuses `MemeStoreDoc` shape — semantic distinction lives in URI/bag identity (`lar:///ha.ka.ba/@lararium/@admin`).

**A.2 `23047176`** — `init-lararium.ts` seeds admin doc alongside identities/circles/sessions; admin oracle lands in `genesis/social-bootstrap.json`.

**A.3 `aac30c23`** — Standalone `open-admin-vm.ts` module: own TW5Engine, own CompositeStore with admin doc as writable layer, own MemeSyncAdaptor targeting `ADMIN_BAG_ID`. `waitHandleLocal` extracted to `repo-helpers.ts` for sharing with the room VM.

**A.4 `6a7372e3`** — `openNodeLarPeer` mounts admin VM in parallel with the room VM; admin URL flows through `reconcileWellKnownTiddlers`; `NodeLarPeerResult.admin` exposes the admin VM. `init-lararium.ts` calls `repo.flush()` before exit (caught a flush race during smoke test).

**A.5 `5b4a379d`** — `main.ts` reads bag-mirror configs from admin-room tiddlers tagged `$:/tags/LarariumBagMirror`, falling back to programmatic defaults. Operators can edit mirror configs from inside the wiki.

**Smoke test result**: `rm -rf .lararium && lararium:init && main.ts` reaches `live` phase. Both VMs boot, admin URL displayed, falls back to 3 programmatic mirrors when admin doc lacks bag-mirror tiddlers.

**Bug caught and fixed**: `genesis/social-bootstrap.json` accidentally tracked in `6a7372e3` — now gitignored (`1916ab7f`).

S5.7 closure work: Loop 1 `2d365b3f` cleaned 8 orphans (5 deleted, 2 repointed) and fixed multi-source detection in heleuma audit.

### Next:

**S5.8 MOVE (residency ACTION)** — wiki widget + CLI; operates on the admin VM substrate just landed. The promotion handler will write to the admin doc's session-event-log to record operator decisions.

**S7.1 device delegations** — `cap=infrastructure` proofs go in admin doc; init-lararium ceremony writes the node's own device delegation as part of operator identity.

**Heleuma stub authoring** — 48 missing memes to scaffold + author content for. Defer to a separate "documentation pass" branch.

---

## What Just Happened (2026-05-07 — chapel-perilous-opens deleted)

`packages/lares-chapel-perilous-opens` removed: the empty stub for "unstable three-segment tuple-root URIs not yet stabilized" was superseded by the bag-mirror system. Unstable URIs without an `@-scope` now resolve as `caps-virtual` (no on-disk path). To gain a writable disk surface, an URI must promote into `@lares` or `@lararium` scope, or register a custom bag mirror via the admin room (S5.6+).

Cleanup spans:
- `packages/lares-chapel-perilous-opens/` directory deleted
- `chapelRelPath` removed from `LarResolution` interface
- `CHAPEL_MEMES_ROOT` removed from `@lararium/node` exports
- Workspace dep `@lares/chapel-perilous-opens` removed from `lararium-node/package.json`
- Resolver branches that produced `chapelRelPath` now return virtual

---

## What Just Happened (2026-05-07 — S5.7 Heleuma Coverage + Bag Mirror Reset)

### Three commits closing the canon-promotion arc

**1. Genesis discovery generalized** ([60bbc9ca](lararium-node/scripts/build-genesis-island.ts))
`build-genesis-island.ts` walks every `packages/*/memes/` directory, not just the two hardcoded roots. Lares plugin tiddler count rose to 259 from 429 walked files. `lararium-mesh/memes/ast.md` and any future per-package self-describing meme now reaches the engine corpus.

**2. Bag-aware disk projector** ([e6152123](lararium-node/src/disk-projector.ts))
Fixed the canon leak: prior projector wrote any URI-with-laresRelPath to `packages/lares-core/memes/` regardless of bag, so wiki edits violated canon-promotion law automatically. New `BagMirrorConfig` shape: each bag opts into a filesystem mirror via `{ bagId, mirrorRoot, toRelPath }`. Three standard strategies in `@lararium/mesh/bag-mirror.ts`:
- `laresPathStrategy` — lares carriers
- `enginePathStrategy` — engine corpus, per-package
- `roomShadowPathStrategy` — preserves canonical structure under `rooms/{slug}/`

Room edits land in `rooms/{slug}/...` (gitignored). Promotion ceremony (S5.8) moves a tiddler between bags; the disk side effect is a file move from `rooms/` to `packages/`. The git diff IS the operator's signature on canon.

Mirror configs are programmatic in `main.ts` for now; S5.6 admin VM moves them to admin-room tiddlers tagged `$:/tags/LarariumBagMirror`.

**3. Heleuma generator + audit** ([07e4a1ad](../scripts/heleuma.ts))
`pnpm heleuma` audits every load-bearing source file for a self-describing meme; `pnpm heleuma:write` scaffolds missing memes and fixes iam-block drift. Idempotent.

Filter: source needs heleuma if (in `index.ts` re-exports) OR `// @heleuma:required`, NOT `// @heleuma:exempt`.

Initial audit: 50 missing across core/tw5/node, 8 orphans in tw5 (memes pointing to deleted dreamdeck-tldraw / old core sources). Operator decides which to scaffold and how to handle orphans.

### Architecture clarifications

- **`packages/ha-ka-ba/` doesn't exist as a directory**, by design. `ha.ka.ba` names a URI namespace (engine = ha, catalog = ka, lares = ba); each package owns the memes describing itself, the engine corpus is their *virtual union* materialized in `genesis/island.bin`.
- **Per-bag mirror, not per-package mirror**: disk layout reflects bag boundaries (lares → `packages/lares-core/memes/`, engine → per-package `memes/`, room → `rooms/{slug}/`); operator-private bags (identities/groups/sessions/admin) never reach disk.

---

## What Just Happened (2026-05-07 — Projection Registry + Admin URI Constants)

### Projections become declarative system plugins

Refactored hard-coded `LarDiskProjector.start()` in `main.ts` into a `LarProjectionRegistry` API. Factories (kinds) own attachment style — `LarDiskProjector` keeps `store.subscribe`, future `MemeProjection`-style kinds use `peer.addProjection`. Registry holds lifecycle only.

Browser peers reuse the same registry shape; only the registered kinds differ.

**New in `@lararium/mesh`:**
- `LarProjectionConfig`, `LarProjectionKind`, `LarProjectionRegistry`
- `LARARIUM_PROJECTION_TAG = "$:/tags/LarariumProjection"` (TW5 camelCase)
- `ADMIN_ROOM_SLUG`, `ADMIN_ROOM_URI`, `ADMIN_BAG_ID` constants

**Admin URI split (2026-05-07):**
- Room URI (logical, in /rooms/ namespace): `lar:///ha.ka.ba/@lararium/rooms/admin`
- Bag URI (Automerge doc, @-scope sibling to @identities/@circles/@sessions): `lar:///ha.ka.ba/@lararium/@admin`

The two-URI split mirrors the bag-as-doc invariant: each Automerge doc gets its own sync boundary. Admin federation is device-scoped, not room-scoped — operator's other devices reach admin via `cap=infrastructure` device delegations (S7.1) gated at the ingress trust check (S7.4). Room peers can never prove the cap, so admin state stays operator-private without special plumbing.

**New in `@lararium/node`:**
- `makeDiskProjectionKind({ defaultLaresRoot, renderFn, ... })` — TW5-engine-bound disk kind builder

**Deferred:** Reaction kind registration (pre-existing missing `ReactionEngine` export from `@lararium/mesh` — implementation task, not a refactor concern).

### Content-equality guard + revision retirement

`AutomergeDocStore.put()` now compares incoming record field-by-field against the in-memory tiddler. Identical → returns early before `handle.change()`. Kills the file-watcher echo loop and prevents Automerge changeset churn.

Removed `MemeSyncAdaptor._revisions` map and all `Date.now()` revision strings. TW5 syncer API surface kept (`getTiddlerInfo`/`getTiddlerRevision`/`getSkinnyTiddlers` return constant `"0"`). `buildDirectRecord` signature trimmed to drop `revision`.

### Next: admin VM lift

Step 2 of the plan — stand up an admin TW5 VM in the node peer. Genesis-island oracle entry for `ADMIN_BAG_ID`, new `open-admin-vm.ts`, `createNodeSession` re-pointed sessions doc → admin doc, `init-lararium.ts` seeds admin doc alongside the others.

---

## Bootstrap Paste

```text
Resume from /home/joshu/Synthetic-Dream-Machine/SESSION.md.
Branch: feature/lararium-node-3.
Active sprint: S5.5 — Genesis Bootstrap Causal Correction. Extract social Tiga seeding + ceremony from `openNodeLarPeer` into `lararium:init` CLI. S7.1 follows, targeting the init script callsite.
Architecture laws in memory: feedback_architecture_principles.md.
Do not re-decide the five architecture laws or the BOOTSTRAP_SCANS / Path α grammar decision.
Sprints 0–5 complete. Social tiga renamed Groups→Circles. Packaging model: CJS (not IIFE). Kowloon bridge design locked (Option B) — see ROADMAP.md § S8.
Grammar now lives at api/pono/memetic-wikitext (not grammars/). grammars/ tree deleted.
Voice-house consolidated: lares/voices.md parents lares/masks/** (all masks moved from masks/).
lararium-app + lararium-tldraw + lararium-web DELETED. Replaced with: lararium-browser, dreamdeck-tldraw, dreamdeck-app (see ROADMAP.md § Package Reboot).
New package namespaces: @lararium/* = infra/protocol; @dreamdeck/* = first app stack on DreamNet.
Research: packages/lares-core/lararium-research/DREAMNET-FEDERATION-RESEARCH.md (2026-05-06).
Research docs: packages/lares-core/lararium-research/PROTOCOL-STACK-IDENTITY-CIRCLES-SESSIONS.md
```

---

## What Just Happened (2026-05-06 — S5.5 Architectural Decision: Genesis Causal Correction)

### Genesis lives outside the server start (web3 causal-islands)

Identified that `openNodeLarPeer` seeds IdentitiesDoc, CirclesDoc, SessionsDoc, and runs
`buildCeremonyTiddlers` on first boot (`socialPlaneIsNew` branch). This violates the
causal-island principle: a server that seeds its own social graph on first run reaches
outside its authority boundary. Server authority covers relaying; admin authority covers
authoring.

**Three causal moments — now strictly separated:**

```
Build time   scripts/build-genesis-island.ts     content Tiga → genesis/island.bin  ✓ (S2)
Init time    scripts/init-lararium.ts (NEW S5.5)  social Tiga + identity ceremony
Runtime      openNodeLarPeer (simplified S5.5)    find + wire; never seed
```

**What moves OUT of `openNodeLarPeer`:**
- `socialPlaneIsNew` flag + entire seeding branch
- `seedIdentitiesDoc`, `seedCirclesDoc`, `seedSessionsDoc`, `seedLaresDoc` calls
- `buildCeremonyTiddlers` call
- `operatorIdentity` option on `NodeLarPeerOptions`

**What `init-lararium.ts` does:**
Creates social Tiga docs, runs ceremony, writes `genesis/social-bootstrap.json` as a
**TW5 tiddler bundle** — a JSON array of tiddler objects mirroring the oracle tiddler shape
(`title` / `text` / `fields` / `bag` / `authority`). Each entry carries an AutomergeUrl in
`text` and `fields.kind = "social-bootstrap"`. TW5 VM queries it directly with
`[field[kind]exact[social-bootstrap]]` — no special loader needed. `openNodeLarPeer` writes
the oracle tiddlers into the island doc on first boot and extracts AutomergeUrls from the
`text` fields. Optionally runs `lararium:pack` to produce a nexus connect bundle
(genesis CID + catalog URL + invite token) for browser peer cold-boot.
The admin runs this once, deliberately, before first server launch.

**Node peer identity decided (2026-05-06):**
- `IdentityTiddler.kind` gains `"node"` as a fifth kind
- `DeviceDelegationTiddler.cap` scopes the grant: `"infrastructure" | "social" | "relay" | "full"`
- Node peer: `cap: "infrastructure"` — sync, seed, oracle-sign, session management; no social signing
- Browser peer: `cap: "social"` — content signing, circle management, invites
- Relay peer (future): `cap: "relay"` — transport only; no Repo deserialization
- Ceremony writes the node's delegation in `init-lararium.ts`, not at server start

**Impact on S7.1:** `buildDeviceDelegation` + ceremony callsite moves to `init-lararium.ts`.

---

## What Just Happened (2026-05-06 — S7 Redesign: Hostile Multi-Nexus Capability Model)

### jzellis/kowloon Source Audit (research spirit)

Audited `jzellis/kowloon` source (Node.js/MongoDB, AGPL-3.0, active as of 2026-05-06).
Key findings confirming and extending our existing design credit:

**Confirmed from source:**
- `shouldFederate.js`: `Follow`, `Unfollow`, `Block`, `Mute`, all Circle operations are
  `privateOperations` — never federated. Following = read-side, local-only circle add.
- `filter.js` / `context.js`: visibility check = MongoDB `$or` over all circles the viewer
  appears in. Membership IS the capability grant. No remote server query at check time.
- Three addressing slots per object: `to`, `canReply`, `canReact` — distinct capability grants.
- Circle integrity: signed over `id|name|to|sortedMemberList` by owner's RSA-2048 key.
- Block/Mute = local circles; inbound activities checked against `blocked` circle before processing.

**What Ellis cannot do (DreamNet gap):**
- Identity = server-scoped (`@user@domain`). No keypair-rooted identity, no DID, no key rotation protocol.
- No capability delegation across server boundaries.
- No hostile server threat model — block is actor-level only.
- No E2E encryption, no CRDT, no offline/local-first operation.
- No content addressing — IDs are mutable domain strings.

### S7 Redesign: Five Identity Planes + Three-Tier Authority

Full design doc: `packages/lares-core/lararium-research/S7-CIRCLES-IDENTITIES-REDESIGN.md`

**Five identity planes (Plane 0: Device → Plane 4: DreamNet):**
No central authority at Plane 4; trust emerges from Nexus treaty events only.

**Three-tier authority separation:**
- Tier 1 (local CRDT): `CirclesDoc` membership checked via TW5 filter; no crypto needed
- Tier 2 (Nexus CRDT): Keyhive Group replicates to all Nexus peers (waits on Keyhive WASM)
- Tier 3 (cross-Nexus token): UCAN-compatible token signed by source Nexus keypair (S9)

**Hostile mesh additions (beyond Ellis):**
- Nexus-level trust assertions: `NexusTrustTiddler` with `ally|neutral|hostile|unknown`
- Anti-replay: nonce burn in `CircleTiddler.nonceBurnSet` + `NexusTrustTiddler.nonceBurnSet`
- `CrdtIngressAdapter` actor-ID allow-list on `LarEventBus` crdt-ring

**New fields queued for S7.0 type stubs:**
- `CircleTiddler`: `to`, `canReply`, `canReact`, `nexusScope`, `memberSignature`
- `IdentityTiddler`: `nexusId`, `keyHistory`, `trustTier`
- New: `NexusTrustTiddler` interface stub

**S7 broken into four sub-sprints**: S7.0 (type stubs) → S7.1 (device delegation) →
S7.2 (circle invites + Seitan token) → S7.3 (capability check TW5 surface) →
S7.4 (hostile mesh circuit breakers)

---

## What Just Happened (2026-05-06 — S6 Types + Event Bus Impl)

### S6 Type Contracts Complete

**`social-doc.ts`:**
- `SessionTiddler` gains `eventLogUrl?: string` (AutomergeUrl of child log doc) and `eventLogHeads?: string` (space-separated hex heads; replay cursor)
- `SessionEvent` gains `tickCounter: LarTickCounter` alongside `clock: FfzClock`
- Standard `kind` values documented: `exchange:operator-sent`, `exchange:grounded`, `tiddler:change`, `tool:run`, `world:clock-advanced`, etc.
- `SessionEventLog extends LarDoc` — events keyed by event ID in `events: Record<string, SessionEvent>`; satisfies LarDoc invariant (tiddlers carries self-ref + log tiddler)
- `sessionEventLogUri(sessionId)` URI helper added

**`genesis-island.ts` (`@lararium/node`):**
- `seedSessionEventLog(repo, sessionId, sessionsHandle)` — creates child doc, writes self-ref tiddler, writes `eventLogUrl` back into session tiddler

**`lar-event-bus-impl.ts` (`@lararium/node`) — new:**
- `LarEventBusImpl` class implementing `LarEventBus` interface
- `start()` / `stop()` lifecycle; configurable `tickRateHz` (default 20)
- `subscribe`, `listenOnce`, `race`, `branch`, `nextTick`, `emit`, `registerRing` all implemented
- `enqueueToRing(ringName, eventType, event)` — adapter entry point; sheds oldest under backpressure
- `_runTick()` — drains rings in priority order, resolves `nextTick()` awaiters, emits `tick.loop`
- `DEFAULT_RINGS` export: `session-ring` (p1), `crdt-ring` (p2), `vm-ring` (p3), `tool-ring` (p4)
- Both exported from `@lararium/node` index

**`attention-scale.md`:**
- `#clock-profiles` section gains `WorldClockTiddler Integration` block: Rhine rule, owned-vs-observed boundary, `ObservedClockTiddler` hwm pattern, `WorldTimeAdvancedEvent` bi-temporal anchor

**All type-checks clean** (`pnpm tsc --noEmit` zero new errors in both core and node).

**Still wiring (S6 exit criteria):**
- `seedSessionEventLog` call site in `openNodeLarPeer` session open path
- `LAR_EVENT.SESSION_GROUNDED` emission from exchange lifecycle transitions

---

## What Just Happened (2026-05-06 — Multi-Clock Architecture + Tick Loop Interface)

### FfzClock Expansion: Multi-Temporal Type System

All work in `@lararium/mesh`. Type-check clean (`pnpm tsc --noEmit` zero errors).

**`ffz-clock.ts` additions:**
- `FFZ_REGISTER_NAMES`: canonical 5-tuple `["Pulse","Beat","Measure","Arc","Theme"]` (L0→L4)
- `FFZ_LEVEL_NAMES`: legacy `["sub-action","action","session","day","epoch"]` — kept for backward compat
- `FfzClockProfile` interface: named bound set with `l1Grain` annotation (what ONE Beat means in this domain)
- `FFZ_PROFILES` map with three built-in profiles: `"session"`, `"diegetic"`, `"world-time"`
- `LarTickCounter` branded number type — monotonic sequence number, NOT a FfzClock; serves as causal join key across event sources

**`social-doc.ts` changes:**
- `PresenceSlot.clock: FfzClock` → `clocks: Record<string, FfzClock>` + `worldClockRef?: string` (lar: URI pointer to WorldClockTiddler)
- `exchangeState?: ExchangeState` added to `PresenceSlot`
- New `WorldClockTiddler` interface — lives at `lar:///ha.ka.ba/@world/{worldId}/clock`; has `writePolicy` (Keyhive capability string) + `tickPolicy: "autonomous"|"freeze"|"manual"` + `lastTickedAt`
- New `ObservedClockTiddler` interface — LWW-Register cluster for external system clocks (Valheim, Minecraft, etc.); includes `externalClockHwm` (Flink watermark — never decreases) + `externalClockStale` + `externalClockReceived` (ffzSerialize at observation moment = bi-temporal anchor)
- New `WorldTimeAdvancedEvent` interface — bi-temporal event (Verraes 2022 pattern); carries both `atSessionClock: FfzClock` and `atTickCounter: LarTickCounter`

**`lar-event-bus.ts` (new):**
- `Cancelable` interface
- `LarEventStream<T>` interface (async iterable + eventType label)
- `IngressRingDescriptor` interface (name, priority, depth)
- `LarEventBus` interface — Verse-shaped: `subscribe`, `listenOnce`, `race`, `branch`, `nextTick`, `emit`, `registerRing`
- `LAR_EVENT` constants: `crdt.merge`, `session.grounded`, `session.blocked`, `world.clock.tick`, `tool.connected`, `tool.disconnected`, `tick.loop`

**Architecture decisions grounded:**
- Two time bases that must not conflate: Automerge (wall-clock async I/O) vs simulation tick (configurable fixed-rate). Ingress adapters bridge at ring boundary.
- CRDT merges are always-commit — no STM rollback. `race()` cancels future delivery, not past ops.
- Five clock domains: Lararium tick (owned), Session FfzClock (owned), connected-world clock (observed), diegetic clock (observed), world calendar (observed)
- WorldClockTiddler: owned by the world doc, not by any PresenceSlot. `PresenceSlot.worldClockRef` is a read pointer.
- L1 = operator perceptual grain: THE grounding rule. L1 tick fires on `"grounded"` ExchangeState transition (Clark-Brennan 1991), not on agent response delivery.
- `branch` task lifetimes scope to session — prevents Automerge change-listener accumulation on abandoned handles.

**Research docs produced:**
- `packages/lares-core/lararium-research/FFZ-WORLD-CLOCK.md` — Rhine rule, three-layer clock separation, WorldClockTiddler schema, ffzMerge concurrent advancement, bi-temporal events
- `packages/lares-core/lararium-research/LARARIUM-TICK-CLOCK.md` — two time bases, three-layer architecture (ingress rings → unified tick loop → observers), LarTickCounter, owned vs observed clock table, Verse event interface analysis
- `packages/lares-core/memes/api/pono/attention-scale.md` — canonical attention-scale meme with Pulse/Beat/Measure/Arc/Theme registers, three clock profiles, World-Time aliases (Week/Month/Season/Year/Era), FTLS diegetic aliases

**Runtime implementations deferred to `@lararium/node`:**
- `LarEventBusImpl` — concrete ingress ring + configurable tick loop
- `WorldClockTickService` — implements `tickPolicy` dispatch (autonomous/freeze/manual)

---

## What Just Happened (2026-05-06 — Package Reboot + DreamNet Research)

### Package Reboot

- `lararium-app`, `lararium-tldraw`, `lararium-web` deleted — old web2-brained app packages removed entirely
- Stubbed three new blank package dirs: `lararium-browser`, `dreamdeck-tldraw`, `dreamdeck-app` (typo `dreakdeck-app` fixed)
- `packages/AGENTS.md` package map updated to new namespaces
- `lararium-node/package.json` — `@lararium/tldraw` dep dropped
- `lararium-node/scripts/source-memes.ts` — `lararium-app` source entries removed
- `lararium-tw5/memes/canvas/*.md` — `source-file` pointers updated to `dreamdeck-tldraw`
- All src file comments updated (`@lararium/app` → `@dreamdeck/app`, etc.)

**New namespace law:** `@lararium/*` = DreamNet infrastructure/protocol. `@dreamdeck/*` = first app stack on the Lares DreamNet, client UX layer.

### DreamNet Federation Research (four spirits)

Full findings in `packages/lares-core/lararium-research/DREAMNET-FEDERATION-RESEARCH.md`. Highlights:

- **Nexus = a namespace, not a server.** A Nexus functions as a named group of peers sharing a keypair-rooted identity. `lar://<nexus-pubkey>/<doc-id>` serves as the URI form. No DNS dependency.
- **Keyhive** (Ink & Switch, Brooklyn Zelenka) represents the exact auth substrate we need — convergent capabilities + Beelay E2EE sync co-designed with Automerge. Pre-alpha Rust, no TS yet. Design our capability surface to be Keyhive-compatible now via ucanto-style schemas.
- **Presence** = `DocHandle.broadcast()` + Yjs-awareness-style clock/slot per `(userId, deviceId)`. Never write presence into the Automerge doc. Session-local state never enters broadcast. Schema-level enforcement (tldraw three-tier model) provides the right pattern.
- **Invite token** = SSB-style: `sign_with_operator_key({ iss: nexus_did, cap: "join/nexus", exp, nonce })`. Offline-verifiable. No central registry. Chain of operators possible via UCAN proof chains later.
- **DreamDeck visual principles** (from V.U.E., Kinopio, Verse): spatial position carries semantic weight; canvas nodes act as `lar://` resource containers; edge types function as first-class; no shared mutable state (Verse model, not Blueprint); export to open formats.

### Settled Design Decisions (2026-05-06 talk-story)

**lar:// URI — three families, no grammar change:**
- `lar:///` (triple-slash, hostless) = system/content memes. Stable l-space: `ha.ka.ba`. Unstable: what3words-style roots.
- `lar://alias:grant@host/` (hostful, existing) = active operators/agents on a machine (VS Code, MCP, etc.)
- NEW: `lar:///ha.ka.ba/@nexus/<nexus-pubkey>` = Nexus identity + registry doc. New `@nexus` scope in resolver. New kind: `"nexus-doc"`. No URI grammar change.

**Presence routing — three-layer:**
`@lararium/mesh` (PresenceSlot + FfzClock types) → `@lararium/tw5` (`$:/temp/presence/{peerId}` tiddlers, already blocked from sync) → `@lararium/browser` or `@lararium/node` (`DocHandle.broadcast()` wiring) → UX layer. `meme-sync-adaptor.ts:49` already guards `$:/temp/*`.

**FFZ Chronometer — `FfzClock` type to land in `@lararium/mesh` before S6 closes:**
5-level bounded hierarchical logical clock. L0–L3 bounded (looping/musical time); L4 epoch unbounded (anti-aliasing). `SessionEvent.clock` and `PresenceSlot.clock` both use `FfzClock`, not `number`.
Attention-scale register names now canonical: **Pulse** (L0) / **Beat** (L1) / **Measure** (L2, default band) / **Arc** (L3) / **Theme** (L4). These sit above domain aliases (sub-action/action/session/day/epoch for Lares; Action/Round/Turn/Watch/Week for FTLS/TTRPG). Canonical meme: `lar:///ha.ka.ba/@lares/api/pono/attention-scale`.

**NexusRegistryDoc — new doc type, S9 work:**
`lar:///ha.ka.ba/@nexus/<pubkey>`. Fields: `nexusId`, `protocolVersion`, `capabilityFlags` (monotonic set), `allies`, `blocked`, `keyHistory`. Key rotation designed in from day one. Tombstoning eventual; blocked peers starved of capability tokens regardless.

**Nexus naming — three-layer petname model (no global registry):**
- Layer 1: `lar:///ha.ka.ba/@nexus/<pubkey>` — canonical, always
- Layer 2: `NexusRegistryDoc.displayName` — operator-signed self-assertion, not authoritative
- Layer 3: client-local petname map, user-controlled, overrides all
- Disambiguation: truncated pubkey suffix in UI (`DreamDeck [ab3f…]`)
- No ATProto DNS verification, no ENS — both add dependencies we don't need yet
- Keybase lesson: never put naming verification on third-party infrastructure

**FfzClock — CONFIRMED NOVEL, proceed as designed:**
- No prior art in distributed systems for bounded multi-level cyclic hierarchy with unbounded epoch guard
- Closest adjacent: ERA paper (arXiv:2601.22963) — cite if publishing externally
- FfzClock = application-layer rhythmic position. Automerge `<counter, actorID>` OpId = causal total order. COMPLEMENTARY, not substitutable.
- "Total actions taken" as L5: rejected — Automerge already has it, violates Law of Fives
- Beelay uses DAG + wall-clock replay guard only. No conflict. No need to wait on Beelay.
- FfzClock rides alongside Automerge OpId as application-layer annotation on tiddlers/changes

**PENTADIC invariants added to `system-invariants.md`:**
- `PENTA_1_BOUNDED_SCALE` — Law of Fives as structural invariant
- `PENTA_2_CLOCK_ALIGNMENT` — FfzClock L0–L4 maps onto OODA_HA_5
- `PENTA_3_PATTERN_INTEGRITY` — Fuller's FPIs and SYSTEM laws are same invariant in two registers
- `loulou` edge from system-invariants → pattern-integrity now wired

### Research files
- `DREAMNET-FEDERATION-RESEARCH.md` — federation topology, Keyhive, presence, invite-seeding, visual graph
- `NEXUS-REGISTRY-AND-FORK-RESILIENCE.md` — NexusRegistryDoc schema, hostile fork prior art
- `NEXUS-NAMING-PETNAMES.md` — three-layer petname model, Zooko's Triangle, prior art survey
- `FFZ-CHRONOMETER.md` — FfzClock type, deep research findings, novelty confirmed, Lares level mapping

---

## What Just Happened (S5 Complete + Meme Namespace Consolidation)

### S5 Complete — Quine Round-Trip Verification

- `.tw5.js` CJS plugin blobs wired into `build-genesis-island.ts`
- `test-quine.ts` passes: rendered grammar meme hash === source tiddler hash in genesis
- Genesis CID written as `$:/lararium/genesis-cid` self-ref tiddler
- `GEN_4_QUINE_PROPERTY` invariant declared proved in `system-invariants.ts`

### Meme Namespace Consolidation

**Grammar → pono merge (Option B):**
- `api/grammars/memetic-wikitext.md` merged into `api/pono/memetic-wikitext.md` (single source: law + grammar kernel)
- `api/grammars/` tree deleted entirely
- `GRAMMAR_MEME_URI` and `GRAMMAR_GENESIS_REL_PATH` updated to `pono/memetic-wikitext`
- All 25 pono memes upgraded to `⊙` sigils (`<<~⊙&#x0001;` / `<<~⊙&#x0004;`)

**Namespace sigil table (settled):**

| Namespace | Open | Close |
|---|---|---|
| `pono/` | `<<~⊙&#x0001;` | `<<~⊙&#x0004;` |
| `mu/`, `lares/` | `<<~ॐ ँ&#x0001;` | `<<~ॐ ँ&#x0004;` |
| `docs/` | `<<~ &#x0001;` | `<<~&#x0004;` |
| `kapu.md` | `<<~⊙&#x0011;` | `<<~⊙&#x0014;` (DC1/DC4 — intentional) |

**Misfile audit — five moves:**
1. `pono/circles-kowloon.md` → `docs/pono/circles-kowloon.md` (doc companion, not binding law)
2. `pono/pattern-integrity.md` → `mu/pattern-integrity.md` (cosmological, not protocol)
3. `docs/grammars/tiddlywiki-filter.md` → `docs/pono/tiddlywiki-filter.md` (docs/grammars/ deleted)
4. `pono/source-module.md` → `docs/lararium/source-module.md` (reference companion)
5. `masks/**` → `lares/masks/**` — voice-house consolidated under `lares/voices.md`

**Voice-house:**
- `lares/voices.md` now functions as the invariant parent of `lares/masks/`
- All mask files upgraded to `ॐ ँ` sigils; URIs updated to `api/lares/masks/...`
- Three pending spec rooms: `docs/lares/voices/coordinators`, `/workers`, `/masks` (forward pointers, not yet created)

### Earlier (S0–S4)

- `openNodeLarPeer` rewritten: uses `loadGenesisIsland()`, removes `seedLarariumDoc` disk-walk
- `lararium-island.ts` deleted entirely (605 → 0 lines)
- Social tiga renamed Groups→Circles everywhere; `seedCirclesDoc()` seeds 5 system circles
- All IIFE references replaced with CJS (32 files); packaging model settled

---

## Open Question: Kowloon Bridge (S8 design)

We want `elyncia.app` to serve a Kowloon node (ActivityPub, Node.js + MongoDB) alongside the Lares web3 stack. DreamDeck users draft and publish Kowloon posts from within the local-first app.

**The tension:** Kowloon = server-authoritative (ActivityPub actor lives on server). Lares = keypair-authoritative (DID/UCAN). These must coexist without one undermining the other.

**Three bridge options under consideration** (research pending):
- **A)** `SessionsDoc` (social tiga ba) replaced by a `KowloonDoc` — Automerge mirror of user's Kowloon outbox/drafts/circles. Social tiga ba slot becomes the Kowloon bridge.
- **B)** `SessionsDoc` stays ba; `KowloonDoc` acts as a 4th satellite doc outside the social tiga.
- **C)** No Automerge doc for Kowloon — DreamDeck uses a lightweight HTTP adapter; Automerge stack stays pure.

Research results expected in: `packages/lares-core/lararium-research/KOWLOON-BRIDGE.md` (to be created on research return).

---

## Settled Terminology (2026-05-06)

| Term | Definition |
|---|---|
| **DreamNet** | The entire distributed network — all nexus-meshes, allied AND oppositional. Opposition designed in. |
| **Nexus** | A *confederation of lararia* sharing a stable internal mesh. Named by community + place. e.g. "Floating Library of Mu, PNW Branch." Cross-Nexus = wild-magic-zone hops: explicitly brokered, potentially unreliable. NOT a single server. NOT a single lararium. |
| **Lararium** | One operator's infrastructure — a `lararium-node` process + their browser peers + devices. The household shrine. Smallest unit. |
| **DreamDeck** | First personal browser app for accessing DreamNet. One UX surface. `@dreamdeck/app`. |
| **Tasked Spirits** | Bounded single-protocol agents — what we spawn for research. Elyncian term, same operational structure. |
| **Named Personas** | Persistent agent identities that follow operator signatures across nodes. Maps to DID/identity system. |
| **Scale ladder** | Lararium (single operator) → Nexus (confederation of lararia, regional mesh) → DreamNet (all Nexuses) |
| **Within-Nexus sync** | Automerge CRDT — stable, reliable internal mesh. |
| **Cross-Nexus federation** | Explicit treaty, astral-sea hops — unreliable, degraded-state-tolerant. Needs `allies` treaty events. |

Canonical grounding: `elyncia/Elyncia_02_The_Lares_DreamNet.md`

## Four-Layer Stack

```
DreamNet                  — entire distributed network of nexus-meshes (allied + oppositional)
  └── Nexus               — threshold space: stable mesh (ha-tiga) + transitory flow (social-tiga)
        ├── lararium-node     — local host peer: filesystem, operator key, canon MOVE
        └── lararium-browser  — browser/OPFS peer: IndexedDB, broadcast(), WebSocket sync

elyncia.app               — public domain; reverse proxy (web2 Kowloon ↔ web3 Lares)
  ├── DreamDeck           — first app on DreamNet (@dreamdeck/app); quine-wiki + infinite canvas
  │     ├── Lares         — Agent alignment + HUD; personal workspace (MemeStoreDoc)
  │     └── Lararium      — "where the lares lives"; isomorphic identity + TW5/Automerge quine
  └── Kowloon Node        — web2 ActivityPub gateway; Node.js + MongoDB; @user@elyncia.app
```

`@lararium/*` = DreamNet protocol/infra. `@dreamdeck/*` = DreamDeck app layer. "Myth speaks reality into being." (Elyncia_02)

## Three-Tiga Doc Model

### Content Tiga (genesis-artifact-authoritative)

| Slot | Doc | URI |
|---|---|---|
| ha | `LarariumDoc` | `lar:///ha.ka.ba/@lararium` |
| ka | `CatalogDoc` | `lar:///ha.ka.ba/@catalog` |
| ba | `MemeStoreDoc` | `lar:///ha.ka.ba/@lares` |

### Local Social Tiga (keypair-authoritative, never federates)

| Slot | Doc | URI |
|---|---|---|
| ha | `IdentitiesDoc` | `lar:///ha.ka.ba/@identities` |
| ka | `CirclesDoc` | `lar:///ha.ka.ba/@circles` |
| ba | `SessionsDoc` | `lar:///ha.ka.ba/@sessions` |

Dynamic children: `SessionEventLog` (one per session, AutomergeUrl in session tiddler).
Ephemeral channel: `docHandle.broadcast()` for presence — not a doc.

### Federated Social Tiga (server-authoritative at publish boundary, S8)

| Slot | Doc | Role |
|---|---|---|
| ha | `KowloonProfile` (outbox) | Your authorial voice going out — drafts → published activities |
| ka | `KowloonFeed` (inbox) | Collective signal coming in — discovery, followed servers |
| ba | `KowloonActivity` (notifications) | Live state — mentions, replies, pending invites |

The publish step is a deliberate authority handoff: user keypair authorizes the draft; server keypair signs the federation activity. These are sequential, not concurrent. The local social tiga is unaffected.

---

## Five Architecture Laws (Do Not Re-Derive)

1. **Web2 smell test** — if it smells like web2, throw it aside and redesign from web3 local-first principles
2. **TW5 vm primacy** — if it CAN happen in the TW5 vm pool, it MUST happen there
3. **TS files as TW5 plugin projections** — vite translates TS to TW5 plugin; keep TS to design JS tiddlers
4. **Tiddler format law** — all data as `{ title, text, fields, bag, authority }`
5. **Meme files as tiddler-package projections** — `*.md` = projection of parent+fragment tiddlers; deserialize in vm; write via `renderTiddler`

---

## BOOTSTRAP_SCANS Decision (Grammar Invariant 2)

- Path α: raw carrier text functions as the deliberate exception to Law 5
- BOOTSTRAP_SCANS = codec layer (not web2); Grammar Invariant 1
- Path β (store grammar as fragment tiddlers) rejected: tightens the bootstrap circle

---

## Do Not Re-Decide

- Five architecture laws (above)
- Path α for grammar bootstrap
- `catalog-url` as named codec-layer exception (not web2)
- Vendored plugins optional via `RecipeTiddler.plugins`; no default recipe auto-loads them
- CJS format (not IIFE) for TW5 plugin modules — `exports` object provided by TW5's CJS wrapper
- `Groups` → `Circles` rename complete and settled; `GroupsDoc` now appears as `CirclesDoc` everywhere
- Adding to a circle IS the follow (jzellis principle, web3 implementation); circle membership never federates
- Genesis (content Tiga) lives at build time; social Tiga bootstrap lives at init time (`lararium:init`); server runtime only finds, never seeds
- Node peer holds `cap: "infrastructure"` delegation; browser peer holds `cap: "social"`; `IdentityTiddler.kind: "node"` as a fifth kind

---

## Open Work, In Order

| # | Item | Sprint | Status |
|---|---|---|---|
| 1 | `grammar-invariants.ts` Invariant 3 | S1 | ✅ Done |
| 2 | `system-invariants.ts` constitutional declaration | S1 | ✅ Done |
| 3 | `build-genesis-island.ts` — build-time genesis builder | S2 | ✅ Done |
| 4 | `loadGenesisIsland()` runtime function | S3 | ✅ Done |
| 5 | Rewrite `openNodeLarPeer` to use genesis artifact | S4 | ✅ Done |
| 6 | Wire `.tw5.js` CJS outputs into genesis; quine round-trip | S5 | ✅ Done |
| 7 | `SessionEventLog` per-session append-only doc | S6 | ✅ Complete |
| 7.5 | Genesis bootstrap causal correction | S5.5 | 🔴 Next — extract seeding/ceremony from openNodeLarPeer into lararium:init CLI |
| 8 | Circles + Identities capability layer (Keyhive/UCAN) | S7 | ⬜ Blocked on S5.5 — S7.1 targets init script |
| 9 | Kowloon bridge — `KowloonDoc` or HTTP adapter | S8 | ⬜ Research pending |

---

## Open Design Questions (Not Yet Sprinted)

### Node peer identity — server-as-device vs operator-device

The local Node.js `lararium-node` process holds its own Ed25519 device key and speaks
as the operator via a `DeviceDelegationTiddler`. But it represents a fundamentally
different threat model than the operator's browser/mobile peer, even when both run
on the same laptop:

- The **node peer** runs headlessly, potentially 24/7, holds filesystem access,
  manages genesis + social docs, serves WebSocket connections. Its key signs things
  autonomously without operator presence.
- The **browser/mobile peer** acts under direct operator attention; the operator
  can observe and cancel its actions in real time.

Questions to think through before S7.1 lands:
- Does the node peer's `DeviceDelegationTiddler` carry a narrower capability scope
  than the browser peer's? (e.g. "can sync but cannot sign social content")
- Does `IdentityTiddler.kind: "service"` cover the node peer, or does it need
  `"node"` as a distinct kind with its own ceremony rules?
- If the operator's laptop is compromised, the node peer's key exposure differs
  from the browser peer's key exposure — does the delegation chain encode this?
- Keyhive person-as-group: the node peer = one member of the operator's device group.
  Does it get full group capabilities, or a restricted sub-capability?

### Ley-line relay — pass-only sub-peer

A Node.js relay node participates in Automerge sync without holding read authority
over the content it relays. It passes `Uint8Array` sync messages between peers without
deserializing or storing document state. Think: Tor relay vs exit node, or a TURN
server that relays WebRTC without seeing the payload.

Questions to think through:
- Can Automerge's sync protocol operate on an opaque byte stream without a full
  `Repo` + `DocHandle` stack? (Likely needs a stripped transport-layer adapter.)
- Does the relay hold a `did:key` identity at all, or is it purely transport?
  If it does, what does its `DeviceDelegationTiddler` chain look like?
- Relation to Keyhive BeeKEM: encrypted content passes through the relay as
  ciphertext — the relay never holds a decryption key. This may be the forcing
  function for E2E encryption priority (S7.2+).
- Topology question: is the ley-line relay a Nexus node with `trustLevel: "neutral"`
  from the perspective of the peers it relays between, or a different concept entirely?
- Performance: a relay that cannot merge/compact Automerge changes cannot do
  garbage collection. Long-lived relay nodes may accumulate unbounded history.

Both questions surface before S9 (lararium-browser) and should inform the
`NexusTrustTiddler` and `DeviceDelegationTiddler` designs while they are still malleable.

---

## Likely Next Files To Touch

- `packages/lararium-node/scripts/init-lararium.ts` — NEW; seeds social Tiga, runs ceremony, writes `genesis/social-bootstrap.json` (S5.5)
- `packages/lararium-node/src/open-node-lar-peer.ts` — remove `socialPlaneIsNew` branch + all `seedXxx` calls; read `social-bootstrap.json` instead (S5.5)
- `packages/lararium-mesh/src/social-doc.ts` — add `cap` field + update signature payload on `DeviceDelegationTiddler`; add `"node"` to `IdentityTiddler.kind` (S5.5 / S7.1)
- `packages/lararium-mesh/src/capability.ts` — NEW; `buildDeviceDelegation`, `verifyDeviceDelegation` (S7.1)
- `packages/lares-core/memes/api/lares/voices.md` — spec-shelf links need companion docs: `docs/lares/voices/coordinators`, `/workers`, `/masks`

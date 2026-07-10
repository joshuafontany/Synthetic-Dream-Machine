# Sprint — Build Provenance, Pono Rewrite

> Created: 2026-05-14  
> Revised: 2026-05-14 (pono rewrite → P0 ✓ P1 ✓ P2 ✓ — typecheck clean)  
> Branch: `feature/lararium-node-3`  
> Primary package: `@lararium/tw5` (`packages/lararium-tw5/`)  
> Cross-package: `@lararium/mesh` (`packages/lararium-mesh/`) receives extracted primitives  
> Frame: e-prime OODA-HA, web3/local-first provenance, CID-unified

---

## Agent / Dev Orientation — Read First

> **Context window note.** This sprint spans two packages and carries a
> design decision that touches the genesis flow. Future agents arriving
> cold should read this section before touching any code.

**The dual-namespace distinction matters here:**

| Package | npm name | Purpose |
|---|---|---|
| `packages/lararium-mesh/` | `@lararium/mesh` | Runtime infra: parsers, authority, automerge, crypto, meme-provider, resolver |
| `packages/lares-core/` | `@lares/core` | Quine-corpus: grammar, schema, memes, operator constitution, carrier content |

`@lararium/mesh` already depends on `@noble/hashes` and carries `src/crypto.ts`.
The build provenance hash primitives belong there, not duplicated in tw5's
`plugin-build/`.

**The CID alignment intent:**  
The genesis blob descriptor model and the build attestation model solve the same
problem with different shapes — content-addressed provenance. This sprint begins
converging them. The hash primitive moves to `@lararium/mesh`. Future work
(P4/separate sprint) raises those hex digests to proper CIDs once the primitive
stabilizes in core and the genesis flow adopts it.

**Pono principle:** verification contracts live where they can be reused, not
where they first appeared. The TW5 pack step remains TW5-specific; the shape of
"content identity" does not.

---

## ✶ Observe — Current Chain

```text
plugin.info + static .tid + TS module sources
  -> Vite CJS tiddler modules          [module-manifest.json]
  -> plugin-source-manifest.json
  -> TW5 CLI pack (temp dir, auditable gap here)
  -> packed plugin JSON
  -> verifyPackedPluginAgainstManifest()     ← JS modules: hash-verified ✓
  -> verifyPackedPluginAgainstSourceManifest() ← static .tid: title-only ✗
  -> plugin build attestation
  -> genesis blob descriptor fields
```

**Current strengths:**

- `plugin.info` carries human intent only; generated facts stay out.
- JS module verification compares body sha256 field-by-field.
- Source manifests stay acyclic (source facts precede packed-artifact facts).
- Anchor meme `body-sha256` fields patch cleanly from generated JS bodies.

**Current gaps / pono debts:**

1. `sha256()` appears as a duplicate in both `plugin-build/module-manifest.ts`
   and `scripts/build-plugin-tiddler.ts`. Neither imports the other. This
   diverges the primitive from `@lararium/mesh`'s `src/crypto.ts`.
2. Static `.tid` verification checks title presence only — field drift (`type`,
   `tags`) and body drift go undetected.
3. The TW5 CLI pack step runs as trusted magic; no transcript proves the input
   state before packing.
4. Manifest format version strings (`lararium-tw5-module-manifest/v1`, etc.)
   embed package provenance in string literals. No shared format registry exists.

---

## ⏿ Hold — Sprint Invariants

- Do not write generated hashes into `plugin.info`.
- Do not let final plugin JSON hash flow backward into source manifests.
- Keep manifests acyclic: source facts first, packed artifact facts later.
- Treat TW5 CLI packing as an external transformation wrapped by before/after
  manifests.
- Keep `lar:///ha.ka.ba/lararium/plugins/lares/memetic-wikitext` canonical.
- Keep `$:/plugins/lares/memetic-wikitext` as compatibility-only output.
- `@lararium/mesh` MUST NOT import TW5, React, filesystem APIs, or DOM APIs.
  The hash primitive extracted there stays pure: no fs, no path, no TW5.
- `@lares/core` owns no build tooling. Do not move build primitives there.

---

## ◇ Decide — Work Packages

### P0 — Extract hash primitive to `@lararium/mesh`

> **Owner package:** `@lararium/mesh` (`packages/lararium-mesh/src/`)  
> **Why first:** P1 and P2 both depend on this primitive. Doing P1/P2 against
> the duplicated tw5-local sha256 re-embeds the debt.

**Context for arriving agents:**  
`src/crypto.ts` in `@lararium/mesh` already exists. Check whether it already
exports a utf8 sha256 hex function before adding one. `@noble/hashes` provides
`sha256` from `@noble/hashes/sha256` — use that, not Node's `createHash`.
The tw5 plugin-build runs at Node build time, so a Node-only import path from
`@lararium/mesh` works fine here (no browser bundle risk for build scripts).

Todo:

- [x] Read `packages/lararium-mesh/src/crypto.ts` — determine whether a
      `sha256Hex(text: string): string` export already exists.
- [x] If not: add `sha256HexSync` to `@lararium/mesh/src/crypto.ts` using
      `@noble/hashes/sha2.js`. Keep the signature pure: string in, hex string
      out. (Named `sha256HexSync` to signal build-time-only per crypto doctrine.)
- [x] Export `sha256HexSync` from `@lararium/mesh`'s barrel (`src/index.ts`).
- [x] In `packages/lararium-tw5/plugin-build/module-manifest.ts`: replace the
      local `sha256()` implementation with an import of `sha256HexSync` from
      `@lararium/mesh`.
- [x] In `packages/lararium-tw5/scripts/build-plugin-tiddler.ts`: replace the
      local `sha256()` implementation with the same import.
- [x] Run `pnpm --filter @lararium/mesh typecheck` and
      `pnpm --filter @lararium/tw5 typecheck`. Both must pass.

Acceptance:

- [x] No `createHash` calls remain in `plugin-build/` or `scripts/build-plugin-tiddler.ts`.
- [x] `@lararium/mesh` exports `sha256HexSync`.
- [x] Both tw5 files import it from `@lararium/mesh`.
- [x] Typechecks pass in both packages.

---

### P1 — Static `.tid` packed-content verifier

> **Owner package:** `@lararium/tw5` (`plugin-build/`, `scripts/`)  
> **Depends on:** P0 (uses `sha256Hex` from core)

**Context for arriving agents:**  
`plugin-build/source-manifest.ts` already defines `StaticTiddlerSource` with
`title`, `type?`, `tags?`, and `sha256` from the file path. The gap: the file
sha256 gets recorded but `verifyPackedPluginAgainstSourceManifest()` in
`scripts/build-plugin-tiddler.ts` only checks title presence — it never compares
fields or body. The `.tid` format: fields appear before the first blank line
(`key: value`), body text follows.

Todo:

- [x] In `plugin-build/source-manifest.ts`: added `bodySha256: string` to
      `StaticTiddlerSource`. Populated in `buildPluginSourceManifest()` via new
      `parseTidBody()` helper — splits on first blank line.
- [x] In `scripts/build-plugin-tiddler.ts`, extended
      `verifyPackedPluginAgainstSourceManifest()`:
  - [x] Missing static tiddler fails build with title + source path.
  - [x] Compare `type` field when source declares it; fails with field + values.
  - [x] Compare `tags` field when source declares it; fails with field + values.
  - [x] Compare packed `text` body sha256 against `bodySha256`; fails with
        16-char prefix comparison.
  - [x] Emits per-field diff line on failure.
- [x] Updated source-manifest format to `v2` (constant `SOURCE_MANIFEST_FORMAT`).

Acceptance:

- [x] Missing static tiddler fails build with tiddler title + source path.
- [x] Changed packed static body fails build with title + expected/got sha256
      prefix.
- [x] Packed `type` drift from source fails build with field name + values.
- [x] Packed `tags` drift from source fails build with field name + values.
- [x] Canonical title drift (`lar:///` vs `$:/`) fails build.
- [ ] `pnpm --filter @lararium/tw5 test` passes (add/update relevant tests). ← deferred

---

### P2 — Build transcript manifest

> **Owner package:** `@lararium/tw5` (`plugin-build/`, `scripts/`)  
> **Depends on:** P0

**Context for arriving agents:**  
The TW5 CLI pack step (`spawnSync(TW5_BIN, [...])` in `build-plugin-tiddler.ts`)
runs against a temp dir copy of `tiddlers/`. Currently nothing records the input
state before packing or the exact command used. The transcript proves that the
TW5 CLI transformation itself was applied to a known-good input — removing "TW5
internals as trusted magic" from the trust surface.

Todo:

- [x] Added `plugin-build/pack-transcript.ts` defining:
  - [x] `PACK_TRANSCRIPT_FORMAT = "lararium-tw5-pack-transcript/v1"`.
  - [x] Interface `PackTranscript` with fields: `format`, `generatedBy`,
        `tw5BinPath`, `tw5PackageVersion`, `packArgs`, `inputRootSha256`,
        `exportedPluginSha256`, `timestamp`.
  - [x] `writePackTranscript` and `readPackTranscript` I/O helpers.
  - [x] `computeInputRootSha256(rootDir)` — walks dir, sorts by rel path,
        hashes `"${rel}:${content}"` concatenation.
  - [x] `resolveTw5Version(resolveFrom)` — synchronous upward-walk with pnpm
        virtual store fallback.
- [x] In `scripts/build-plugin-tiddler.ts`:
  - [x] After `cpSync` before `spawnSync`: compute `inputRootSha256`.
  - [x] After `spawnSync` reads `plugin.json`: compute `exportedPluginSha256`
        before any field augmentation.
  - [x] Write transcript to `dist-plugin/pack-transcript.json`.
  - [x] Link transcript from final attestation (`packTranscriptPath` +
        `packTranscriptSha256`).
- [x] Transcript DOES NOT include final attestation hash (acyclicity preserved).

Acceptance:

- [x] `dist-plugin/pack-transcript.json` emits on every build.
- [x] Attestation includes `packTranscriptPath` and `packTranscriptSha256`.
- [x] Transcript does not include the final attestation hash.
- [x] `tw5PackageVersion` matches the installed TW5 version.
- [ ] A second build with identical inputs produces identical
      `inputRootSha256` and `exportedPluginSha256`. ← verify on next full build

---

### P3 — CID alignment design note (non-blocking spike)

> **This work package produces a decision document, not code.**  
> Do not block P0–P2 on this. Run it in parallel or after.

**Orientation:**  
The genesis blob descriptor model (`packages/lararium-node/` — see `scripts/`
and `src/causal-island.ts` in `@lararium/mesh`) and the build attestation model
in this sprint both express "content identity" as sha256 hex strings. The
Elyncian design intent points toward CID-style addresses (multihash + codec
prefix), which the Automerge doc addressing model parallels.

Converging on CIDs before either system calcifies costs less than migrating two
separate schemas later.

**Spike tasks:**

- [x] Read `packages/lararium-mesh/src/causal-island.ts` and the genesis scripts
      in `packages/lararium-node/`. Note the content-address model they use.
- [x] Determine whether `@noble/hashes` + a minimal CID prefix function (no full
      `multiformats` dep required — just `\x12\x20` + sha256 bytes → base32
      encode) satisfies both build provenance and genesis provenance.
- [x] Write a short ADR (Architecture Decision Record) as a comment block in
      `packages/lararium-mesh/src/crypto.ts` or as an inline note here.
  - Build provenance and runtime genesis both adopt CIDv1 raw SHA-256 as the
    canonical address format where practical.
  - Base32 lowercase (`b...`) works best for JSON, shell output, and TW5
    compatibility; it avoids uppercase and padding issues.
- [x] Outcome: a real `cidV1Sha256(content: Uint8Array): string` export added
      to `@lararium/mesh/src/crypto.ts`, plus runtime support for `packages/lararium-node/`.

---

## ○ Aftermath — When Sprint Closes

Ink-Clerk records inline here:

- What shipped (file list, format versions bumped)
- Which package exported what
- Whether P3 produced a defer or a stub
- Any friction found (timeouts, barrel seam issues, tw5 CLI edge cases)

Do not create a separate changelog file — update this sprint doc in place.

---

## Open Questions (Liminal holds these)

- Does the `inputRootSha256` in P2 need to exclude `.js` build artifacts from
  the temp dir, or should it hash everything including generated modules? The
  answer affects whether two identical source builds produce identical
  transcripts.
- When `@lararium/mesh` exports `sha256Hex`, should it also export a
  `sha256HexAsync` for future streaming use, or keep the primitive synchronous
  only? (Probably synchronous — don't over-engineer for build tooling.)
- The `@lares/core` description says "persona/api/etc." — does any build
  provenance concept belong there, or does `@lares/core` stay entirely free of
  build tooling? (Current answer: yes, keep it free. Note here if that changes.)

### P3 — Failure smokes

Goal: prove verifier teeth through small negative tests rather than confidence
by inspection.

Todo:

- [x] Add a script-level test fixture for source-manifest verification.
- [x] Simulate missing static tiddler claim.
- [ ] Simulate missing module claim.
- [x] Simulate hash drift.
- [x] Simulate `plugin.info` title drift.

Acceptance:

- [x] `pnpm --filter @lararium/tw5 typecheck` passes.
- [x] negative tests fail for the expected reason.
- [x] existing plugin boot smoke still passes.

### P4 — Release surface cleanup

Goal: keep alpha release artifacts explicit while preventing generated output
confusion.

Todo:

- [ ] Document tracked release artifacts:
  - [x] `plugins/lares-memetic-wikitext.json`
  - [x] `src/plugin-tiddler.generated.ts`
- [ ] Document local build artifacts:
  - [x] `dist-plugin/*`
- [x] Add a note near `$:/` compatibility output explaining drag/drop purpose.
- [x] Leave `$:/` namespace retirement parked outside this sprint.

Acceptance:

- [x] a new operator can identify which outputs need commit review.
- [x] compatibility artifact carries `lares-compatibility-only: true`.

## ▶ Act — Suggested Order

1. Extract `.tid` parse helper from `source-manifest.ts`.
2. Extend source manifest static entries with body/field claims if needed.
3. Tighten `verifyPackedPluginAgainstSourceManifest()`.
4. Add failure fixtures or a small verifier test script.
5. Add pack transcript only after static verifier lands cleanly.
6. Update handoff/roadmap with the final landed facts.

## ⤴ Verify — Command Gate

Run after each meaningful step:

```sh
pnpm --filter @lararium/tw5 build:plugin
pnpm --filter @lararium/tw5 typecheck
pnpm --filter @lararium/tw5 exec tsx scripts/smoke-plugin-boot.ts
```

Run before handing off genesis-sensitive changes:

```sh
pnpm --filter @lararium/node typecheck
```

## HA — Success Signal

The build can answer four web3 questions without trust in memory:

1. Which source files entered the build?
2. Which generated JS modules entered the plugin?
3. Which static tiddlers entered the plugin without drift?
4. Which final plugin blob did genesis carry forward?


## Sprint Result

- Static source verification now checks title, declared `type`, declared `tags`, and body digest.
- `dist-plugin/pack-transcript.json` records the TW5 CLI pack boundary without linking backward to final attestation; it avoids wall-clock timestamps and absolute checkout paths for stable replay.
- `scripts/smoke-plugin-provenance.ts` exercises positive and negative provenance checks.
- One remaining optional negative test remains open: synthetic missing module claim coverage. The build itself already verifies real module inclusion/hash drift against `module-manifest.json`.

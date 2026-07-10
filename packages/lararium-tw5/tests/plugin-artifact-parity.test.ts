/**
 * plugin-artifact-parity — the local-first freshness gate for the two committed
 * plugin artifacts.
 *
 * `build-plugin-tiddler.ts` emits the same packed plugin to BOTH
 * `src/plugin-tiddler.generated.ts` (imported as a TS module — must stay
 * committed) and `plugins/lares-memetic-wikitext.json` (the automerge-docs
 * pickup). They are the same object; a fresh build keeps them byte-identical.
 *
 * The failure this catches: a generated artifact hand-edited (or one regenerated
 * while the other is forgotten) — exactly how 90bec796 left the `.json` lagging
 * the `.ts`'s namespace migration AND the self-attestation digests stale. This
 * test runs in `pnpm test`, so it cannot be "dropped or ignored" the way a build
 * flag or a forgotten hook can. The authoritative staleness gate (a fresh build
 * must produce no diff) rides CI; this is its always-on local-first companion.
 *
 * Meme: lar:///ha.ka.ba/lararium/tw5/meme-normalize  (sibling: build-attestation)
 */

import { describe, test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { LARES_MEMETIC_WIKITEXT_PLUGIN } from "../src/plugin-tiddler.generated.js";

const jsonPath = fileURLToPath(new URL("../plugins/lares-memetic-wikitext.json", import.meta.url));

describe("plugin artifact parity — generated .ts ≡ committed .json", () => {
  const json = JSON.parse(readFileSync(jsonPath, "utf8"));
  const ts = LARES_MEMETIC_WIKITEXT_PLUGIN as Record<string, unknown>;

  test("the committed .json deep-equals the generated .ts plugin object", () => {
    // A divergence means one artifact was regenerated (or hand-edited) without
    // the other — regenerate BOTH together: `pnpm --filter @lararium/tw5 build`.
    expect(json).toEqual(ts);
  });

  test("the self-attestation digests are present and agree across both artifacts", () => {
    for (const field of ["lares-module-manifest-sha256", "lares-source-manifest-sha256"]) {
      expect(ts[field], `${field} missing from generated .ts`).toMatch(/^[0-9a-f]{64}$/);
      expect(json[field], `${field} diverged between .json and .ts`).toBe(ts[field]);
    }
  });
});

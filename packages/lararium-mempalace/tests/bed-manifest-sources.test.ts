/**
 * bed-manifest-sources — every declared pour must point at ground that stands.
 *
 * WHY THIS EXISTS. Three manifests spent weeks sourcing `bags/@lares/…/library/…` after the library moved
 * home to `@crossroads` (2026-07-19 — the same day one of those manifests was authored). Nothing was lying
 * and nothing was checked, so a re-pour would have read ZERO sources and produced an empty bed that looks
 * exactly like a completed one. A pour that finds nothing and a pour that finds nothing to say generate
 * identically, which is the whole reason this guard reads paths rather than results.
 *
 * A HELD manifest declares itself held. `pidgin-sessions` sources a `_HELD_…` marker on purpose — an open
 * fork the operator has not seated — so the guard skips a source that NAMES itself held and fails any other
 * absence. A held fork is a decision; a stale path is a fault.
 */
import { describe, test, expect } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE       = dirname(fileURLToPath(import.meta.url));
const MANIFESTS  = resolve(HERE, "..", "manifests");
/** Sources are declared relative to the monorepo root — two levels above this package. */
const REPO_ROOT  = resolve(HERE, "..", "..", "..");
/** A source naming itself HELD marks an un-seated fork, never a stale path. */
const HELD = /^_HELD_/;

interface BedManifest { readonly flow?: { readonly sources?: readonly string[] } }

const manifests = readdirSync(MANIFESTS).filter((f) => f.endsWith(".bed.json")).sort();

describe("every bed manifest points at ground that stands", () => {
  test("the manifest directory carries beds at all — an empty sweep proves nothing", () => {
    expect(manifests.length).toBeGreaterThan(0);
  });

  for (const file of manifests) {
    test(`★ ${file} — every declared source resolves ★`, () => {
      const bed = JSON.parse(readFileSync(join(MANIFESTS, file), "utf8")) as BedManifest;
      const sources = bed.flow?.sources ?? [];
      expect(sources.length, `${file} declares no sources — a bed that pours nothing`).toBeGreaterThan(0);

      const missing = sources
        .filter((s) => !HELD.test(s))
        .filter((s) => !existsSync(resolve(REPO_ROOT, s)));
      expect(missing, `${file}: sources absent from disk — a pour would read them as EMPTY`).toEqual([]);
    });
  }
});

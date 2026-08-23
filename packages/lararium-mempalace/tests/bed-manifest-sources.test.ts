/**
 * bed-manifest-sources — every declared pour must point at ground that stands.
 *
 * WHY THIS EXISTS. Three manifests spent weeks sourcing `bags/lares/…/library/…` after the library moved
 * home to `@crossroads` (2026-07-19 — the same day one of those manifests was authored). Nothing was lying
 * and nothing was checked, so a re-pour would have read ZERO sources and produced an empty bed that looks
 * exactly like a completed one. A pour that finds nothing and a pour that finds nothing to say generate
 * identically, which is the whole reason this guard reads paths rather than results.
 *
 * A HELD manifest declares itself held. `pidgin-sessions` sources a `_HELD_…` marker on purpose — an open
 * fork the operator has not seated — so the guard skips a source that NAMES itself held and fails any other
 * absence. A held fork is a decision; a stale path is a fault.
 *
 * A `library:<collection>` source resolves against the vessel's OWN shelf, which no repository carries and no
 * checkout guarantees. The guard therefore checks its SHAPE rather than its presence: a reference that names
 * a valid collection passes here, and whether the bytes stand is the pour's own refusal to make (bed_manifest
 * REFUSES on zero records). Checking presence would fail every clone that has not fetched, turning a
 * portable reference back into a machine-local path — the exact property it exists to remove.
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
/** `library:<collection>` — a portable reference to the vessel's own shelf; shape-checked, never path-checked. */
const LIBRARY_REF = /^library:[a-z0-9][a-z0-9._-]*$/;

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

      // A malformed library reference IS a fault — it names no collection any vessel could resolve.
      const malformed = sources.filter((s) => s.startsWith("library:") && !LIBRARY_REF.test(s));
      expect(malformed, `${file}: library references that name no valid collection`).toEqual([]);

      const missing = sources
        .filter((s) => !HELD.test(s) && !s.startsWith("library:"))
        .filter((s) => !existsSync(resolve(REPO_ROOT, s)));
      expect(missing, `${file}: sources absent from disk — a pour would read them as EMPTY`).toEqual([]);
    });
  }
});

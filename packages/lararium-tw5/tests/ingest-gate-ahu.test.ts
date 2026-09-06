/**
 * ingest-gate-ahu — the ahu-drop regression lock.
 *
 * A slash-path ahu slot (`#a/b`, a directly-authored nested fragment) once
 * dropped whole from the recompose: `KAHEA_AHU_REF_RE` matched only `#[\w-]+`,
 * clipping the ref at the first `/`, so its child body never spliced back. When
 * the live records carry that same lossy shape, an edit INSIDE the slot renders
 * IDENTICALLY to the stale render — and the gate's canonical-equivalence NOOP
 * swallowed the edit (framing changes read as no-op → stale CRDT → the section
 * vanished on the next projection).
 *
 * Two locks:
 *   1. the shore round-trips a slash-path slot body whole (deserializer fix);
 *   2. an edit inside such a slot reads as CHANGED, never canonical-equivalent
 *      (the gate never no-ops a framing change).
 */

import { describe, test, expect } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { decideIngest } from "../src/ingest-gate.js";
import { memeticWikitextDeserializer, expandMemeRefs } from "../src/deserializer.js";

const REPO_ROOT = new URL("../../..", import.meta.url).pathname;
const BOOT = join(REPO_ROOT, "bags/lares/ha.ka.ba/lares/api/pono/cabal-realm.mem");
const URI  = "lar:///ha.ka.ba/lares/api/pono/cabal-realm";
const sha = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");

/** Canonical render of a carrier through the shore, records → text. */
function renderOf(text: string): string {
  const map = new Map(memeticWikitextDeserializer(text, { title: URI }).map((r) => [String(r.title), r] as const));
  return expandMemeRefs((t) => map.get(t), URI) ?? "";
}

const source = readFileSync(BOOT, "utf8");

/** A carrier carrying a directly-authored slash-path ahu slot with a body. */
function withSlashSlot(body: string): string {
  return source.replace(
    "<<~ ahu #the-seal>>",
    `<<~ ahu #nest/leaf>>\n\n${body}\n\n<<~/ahu>>\n\n<<~ ahu #the-seal>>`,
  );
}

describe("ingest-gate — the ahu-drop is sealed", () => {
  test("a slash-path slot body survives the recompose round-trip", () => {
    const carrier = withSlashSlot("the leaf body holds these bytes");
    const render = renderOf(carrier);
    expect(render).toContain("the leaf body holds these bytes");
    // and the slot frame itself re-emits (never clipped to `#nest`)
    expect(render).toContain("<<~ ahu #nest/leaf>>");
  });

  test("an edit INSIDE a slash-path slot reads CHANGED, never no-op", () => {
    const v1 = withSlashSlot("original leaf body");
    const v2 = withSlashSlot("edited leaf body");
    expect(v2).not.toBe(v1);
    // the live records = a prior ingest of v1; the synced tree holds v1's render
    const curRender = renderOf(v1);
    const d = decideIngest({
      uri: URI, diskText: v2, diskHash: sha(v2),
      syncedHash: sha(curRender), currentRenderHash: sha(curRender), hash: sha,
    });
    expect(d.kind).toBe("ingest");
    if (d.kind === "ingest") expect(d.canonicalText).toContain("edited leaf body");
  });

  test("adding a slash-path slot to a clean carrier reads CHANGED", () => {
    const added = withSlashSlot("a fresh nested section");
    const curRender = renderOf(source);
    const d = decideIngest({
      uri: URI, diskText: added, diskHash: sha(added),
      syncedHash: sha(curRender), currentRenderHash: sha(curRender), hash: sha,
    });
    expect(d.kind).toBe("ingest");
    if (d.kind === "ingest") expect(d.canonicalText).toContain("a fresh nested section");
  });

  // The guard must NOT over-fire on a genuinely cosmetic edit — a framing-only
  // change keeps its ahu slot-set intact, so the canonical-equivalence NOOP
  // still fires. `ingest-gate.test.ts` proves that leg against the boot meme
  // (`framing-only edit → noop canonical-equivalent`); it passes under this guard.
});

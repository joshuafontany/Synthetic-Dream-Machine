/**
 * ingest-gate — vectors for the three-way decision (§6 triangle), driven
 * by the live boot meme: real carrier, real membrane, no vessel.
 *
 * The five branches under proof:
 *   noop/disk-matches-synced · refuse · noop/canonical-equivalent ·
 *   ingest (clean + fresh-adoption) · conflict (both moved, surfaced).
 * Plus the gofmt-loop guard composed: a non-canonical edit converges in
 * ONE cycle (ingest → project → re-ingest reads noop).
 */

import { describe, test, expect } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { decideIngest } from "../src/ingest-gate.js";
import { memeticWikitextDeserializer, expandMemeRefs } from "../src/deserializer.js";

const REPO_ROOT = new URL("../../..", import.meta.url).pathname;
const BOOT = join(REPO_ROOT, "bags/@lares/ha.ka.ba/@lares/v0.1/api/lares/noosphere-boot.md");
const URI  = "lar:///ha.ka.ba/@lares/v0.1/api/lares/noosphere-boot";

const sha = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");

/** Canonical render of arbitrary carrier text through the membrane. */
function renderOf(text: string, uri: string): string {
  const records = memeticWikitextDeserializer(text, { title: uri });
  const map = new Map(records.map((r) => [String(r.title), r] as const));
  return expandMemeRefs((t) => map.get(t), uri) ?? "";
}

const source = readFileSync(BOOT, "utf8");          // corpus-canonical (the slate)
const canonical = renderOf(source, URI);

describe("ingest-gate — the §6 triangle decides", () => {
  test("disk == synced → noop (the echo gate)", () => {
    const d = decideIngest({
      uri: URI, diskText: source, diskHash: sha(source),
      syncedHash: sha(source), currentRenderHash: sha(canonical), hash: sha,
    });
    expect(d).toEqual({ kind: "noop", reason: "disk-matches-synced" });
  });

  test("framing-only edit → noop canonical-equivalent (gofmt-loop guard)", () => {
    // un-sort one iam line pair: swap two lines — parses to the same records
    const reframed = source.replace(
      'cacheable = true\nhydrate   = true',
      'hydrate   = true\ncacheable = true',
    );
    expect(reframed).not.toBe(source);
    const d = decideIngest({
      uri: URI, diskText: reframed, diskHash: sha(reframed),
      syncedHash: sha(source), currentRenderHash: sha(canonical), hash: sha,
    });
    expect(d).toEqual({ kind: "noop", reason: "canonical-equivalent" });
  });

  test("clean content edit, records unmoved → ingest", () => {
    const edited = source.replace("# Entry ~ Lararium Hearth", "# Entry ~ Lararium Hearth (edited)");
    expect(edited).not.toBe(source); // guard: heading drift must fail loud, not collapse to noop
    const d = decideIngest({
      uri: URI, diskText: edited, diskHash: sha(edited),
      syncedHash: sha(canonical), currentRenderHash: sha(canonical), hash: sha,
    });
    expect(d.kind).toBe("ingest");
    if (d.kind === "ingest") {
      expect(d.canonicalText).toContain("(edited)");
      // one-cycle convergence: re-ingesting the projected canonical reads noop
      const second = decideIngest({
        uri: URI, diskText: d.canonicalText, diskHash: sha(d.canonicalText),
        syncedHash: sha(d.canonicalText), currentRenderHash: sha(d.canonicalText), hash: sha,
      });
      expect(second).toEqual({ kind: "noop", reason: "disk-matches-synced" });
    }
  });

  test("never-projected carrier → fresh adoption ingest", () => {
    const d = decideIngest({
      uri: URI, diskText: source, diskHash: sha(source),
      syncedHash: null, currentRenderHash: sha("(unrelated records)"), hash: sha,
    });
    expect(d.kind).toBe("ingest");
  });

  test("both moved → conflict, surfaced never overwritten", () => {
    const diskEdit = source.replace("# Entry ~ Lararium Hearth", "# Entry (disk hand)");
    const recordsMovedRender = canonical.replace("# Entry ~ Lararium Hearth", "# Entry (record hand)");
    expect(diskEdit).not.toBe(source);
    expect(recordsMovedRender).not.toBe(canonical);
    const d = decideIngest({
      uri: URI, diskText: diskEdit, diskHash: sha(diskEdit),
      syncedHash: sha(canonical), currentRenderHash: sha(recordsMovedRender), hash: sha,
    });
    expect(d.kind).toBe("conflict");
  });

  test("unparseable carrier → refuse, loudly", () => {
    // a closer swallowed by a TRULY unclosed fence (opened at the tail,
    // nothing after it to close on) — the doubling hazard
    const broken = source.replace("\n<<~ &#x0003; >>", "\n```text\n<<~ &#x0003; >>");
    expect(broken).not.toBe(source);
    const d = decideIngest({
      uri: URI, diskText: broken, diskHash: sha(broken),
      syncedHash: sha(canonical), currentRenderHash: sha(canonical), hash: sha,
    });
    expect(d.kind).toBe("refuse");
    if (d.kind === "refuse") expect(d.warnings.join(" ")).toMatch(/fence|UNCLOSED/i);
  });
});

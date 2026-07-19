/**
 * agile-write — THE no-false-conflict canary (the identity flag-day go/no-go).
 *
 * Step 3 tags the three producers that feed the Confluence echo gate: `carrierHash`
 * (the disk `diskHash` + the projector's synced-tree `obsHash`) and the native
 * render-leg (`currentRenderHash`). If a producer tags while the gate's echo `===`
 * stays literal, every carrier reads `changed` against a bare STORED value → a mass
 * re-land + phantom conflicts. This canary holds the invariants that forbid that:
 *
 *   1. The producer NOW emits tagged (`sha256:hex`) — the flag-day landed.
 *   2. A byte-identical carrier still reads `noop`/`unchanged` across BOTH stores:
 *      a POST-agile store (the synced value already tagged) AND a PRE-agile store
 *      (the synced value still bare hex) — the dual-read via `digestsEqual`.
 *   3. The mirror: a genuinely changed carrier still reads `ingest`, so the tag
 *      never MASKS a real edit.
 *
 * The gate is driven by an IDENTITY-render congruence (the native-carrier shape the
 * action-handler uses): deserialize → the record, render → the disk join, ∅ structure,
 * never graded. That isolates the proof to the DIGEST tag behavior alone — the render
 * membrane never colors the result.
 */

import { describe, test, expect } from "vitest";
import { carrierHash, parseDigest, IMPLICIT_ALGO } from "@lararium/mesh";
import { decideIngest } from "../src/ingest-gate.js";
import type { IngestOps } from "../src/ingest-gate.js";

// A minimal carrier: a `.meta` sidecar + body, exactly the surface `carrierHash`
// folds (meta + blank line + body). Its render leg is byte-identical to the disk.
const META = "type: text/plain\ntags: canary";
const BODY = "the byte-identical carrier that must never phantom-conflict";
const URI  = "lar:///agile.write.canary";
const join = (meta: string, body: string) => `${meta}\n\n${body}`;

// The gate's injected candidate-render hash — the SAME tagged producer the projector
// and disk use, so `candidateHash === currentRenderHash` stays tag-consistent inside
// the gate. A native carrier folds its `.meta` into the render, so this hashes the
// whole `meta\n\nbody` join.
function carrierHashOf(text: string): string {
  const at = text.indexOf("\n\n");
  return at >= 0 ? carrierHash(text.slice(at + 2), text.slice(0, at)) : carrierHash(text);
}

// The identity congruence: the disk text IS the canonical render (native shape).
const identityOps: IngestOps<{ text: string }> = {
  deserialize: (_uri, text) => ({ records: [{ text }], diagnostics: [] }),
  render: (_uri, records) => records[0]!.text,
  declaredStructure: () => new Set<string>(),
  grade: () => "clean",
};

// The freshly-computed disk digest — post-step-3, this rides TAGGED.
const diskHash = carrierHash(BODY, META);
// What a store WRITTEN BEFORE step 3 holds for the same content: the bare hex, no tag.
const bareStored = parseDigest(diskHash).hex;
// What the projector's `obsHash` writes AFTER step 3: the same tagged value.
const taggedStored = diskHash;

describe("agile-write — the producer tags (flag-day landed)", () => {
  test("carrierHash emits an algorithm-tagged digest, not bare hex", () => {
    const p = parseDigest(diskHash);
    expect(p.algo).toBe(IMPLICIT_ALGO);       // sha256
    expect(diskHash).toBe(`${p.algo}:${p.hex}`);
    expect(diskHash).toContain(":");          // tagged, not bare
    expect(bareStored).not.toContain(":");    // the pre-agile stored form is bare
  });
});

describe("agile-write — no false conflict (the go/no-go canary)", () => {
  test("byte-identical carrier vs a POST-agile (tagged) store → noop echo", () => {
    const d = decideIngest({
      uri: URI, diskText: join(META, BODY),
      diskHash, syncedHash: taggedStored,
      currentRenderHash: diskHash, hash: carrierHashOf,
    }, identityOps);
    expect(d).toEqual({ kind: "noop", reason: "disk-matches-synced" });
  });

  test("byte-identical carrier vs a PRE-agile (bare) store → STILL noop (dual-read)", () => {
    // THE migration canary: the tree still holds a bare hex from before step 3, the
    // disk digest comes tagged. digestsEqual normalizes both → the echo gate reads
    // noop, so an all-bare store never mass-re-lands the day the producers tag.
    const d = decideIngest({
      uri: URI, diskText: join(META, BODY),
      diskHash, syncedHash: bareStored,
      currentRenderHash: diskHash, hash: carrierHashOf,
    }, identityOps);
    expect(d).toEqual({ kind: "noop", reason: "disk-matches-synced" });
  });

  test("clean-ingest leg (records unmoved) reads across the tag boundary too", () => {
    // An edited disk whose RECORDS still stand where the last projection left them:
    // the merge-base leg compares currentRenderHash (tagged) to a bare-stored
    // syncedHash → must normalize to a clean ingest, never a phantom conflict.
    const editedBody = `${BODY} (edited on disk)`;
    const d = decideIngest({
      uri: URI, diskText: join(META, editedBody),
      diskHash: carrierHash(editedBody, META), syncedHash: bareStored,  // bare pre-agile merge base
      currentRenderHash: diskHash, hash: carrierHashOf,                  // records unmoved (tagged)
    }, identityOps);
    expect(d.kind).toBe("ingest");
  });

  test("mirror invariant — a genuinely CHANGED carrier still ingests (tag never masks an edit)", () => {
    const changedBody = `${BODY} — a real content change`;
    const changedDisk = carrierHash(changedBody, META);
    expect(changedDisk).not.toBe(diskHash);
    const d = decideIngest({
      uri: URI, diskText: join(META, changedBody),
      diskHash: changedDisk, syncedHash: taggedStored,     // synced = the OLD content
      currentRenderHash: taggedStored, hash: carrierHashOf,
    }, identityOps);
    expect(d.kind).toBe("ingest");
  });
});

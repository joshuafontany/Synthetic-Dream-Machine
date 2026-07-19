/**
 * ingest-verb-reference.test.ts — a verb rides a REFERENCE, never a body.
 *
 * INGEST/LOAD carriers carry a corpus-CAS `textCid` (a skinny content-address), never
 * an inline body. The daemon-side handler resolves the ref via `resolveByCid` — the
 * fs-less worker's seam onto the process-shared byte plane — re-verifies cid==hash(bytes),
 * then runs the Confluence gate on the resolved body and lands it in the TARGET bag.
 *
 * This is what keeps an oversized carrier (a whole book) OUT of the @daemon command doc,
 * whose automerge scalar-string value overflows past ~2^24 chars. The summons stays lean;
 * the body lands per-carrier in the target. Bag-agnostic — any bag, any oversized carrier.
 *
 * Meme: lar:///ha.ka.ba/lares/api/lares/cas-stage
 */

import { describe, test, expect } from "vitest";
import { createHash } from "node:crypto";
import { CompositeStore } from "@lararium/mesh";
import type { ChangeOrigin, LarTiddlerRecord, VerbContext, Verb, CapabilityAccess, CapabilityVerifyResult } from "@lararium/mesh";
import { MemoryTiddlerStore } from "../../lararium-tw5/src/memory-store.js";
import { VerbTable } from "../../lararium-tw5/src/verb-dispatcher.js";
import { registerActionReactors } from "../../lararium-tw5/src/action-handler.js";

const BAG = "lar:///ha.ka.ba/bags/@crossroads";
const URI = "lar:///ha.ka.ba/bags/@crossroads/library/big-book";

/** Hash of a body's utf8 bytes — the exact content-address `stageBodyToCas` mints and the
 *  handler re-verifies (`sha256HexBytesSync(utf8Bytes(text))`). */
const cidOf = (s: string) => createHash("sha256").update(Buffer.from(s, "utf8")).digest("hex");
const sha   = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");

const allowCap = async (_a: CapabilityAccess, _b: string): Promise<CapabilityVerifyResult> => ({ ok: true });

function makeComposite(): CompositeStore {
  const c = new CompositeStore();
  c.addLayer({ bagId: BAG, store: new MemoryTiddlerStore(), writable: true });
  return c;
}

function ctx(composite: CompositeStore, args: Record<string, unknown>): VerbContext {
  const invocation: Verb = {
    requestId: "req-ref-1",
    title: "lar:///lararium.local.vm/verbs/req-ref-1",
    action: "INGEST", args, targets: [], batchMode: "best-effort",
    status: "pending", requestedBy: "operator-test", requestedAt: "2026-07-19T00:00:00Z",
  };
  return { daemon: composite, invocation, cap: allowCap };
}

/** A corpus-CAS resolver over an in-memory {cid → bytes} map (the process-shared fs face
 *  the worker reads; here the map stands in for the on-disk CAS dir). */
function casResolver(blobs: Map<string, Uint8Array>): (cid: string) => Promise<Uint8Array | null> {
  return async (cid) => blobs.get(cid) ?? null;
}

function ingestArgsByRef(cid: string, diskText: string): Record<string, unknown> {
  return {
    "source-uri": "file:///corpus/@crossroads/library/big-book.txt",
    "to-bag":     BAG,
    "change-id":  "chg-ref-1",
    carriers: [{ uri: URI, textCid: cid, diskHash: sha(diskText), syncedHash: null }],
  };
}

describe("INGEST by reference — summons lean, body resolved + landed", () => {
  test("a large carrier: the summons carries NO body inline, yet the body lands in the target bag", async () => {
    // A 4MB body — far past any tiddler-field norm; the point is that NONE of it rides
    // the verb args. (16MB would panic automerge as a scalar-string; MemoryTiddlerStore
    // here isolates the transport claim from that separate storage wall.)
    const body = "The Adventures of a very long corpus.\n".repeat(110_000);
    expect(body.length).toBeGreaterThan(4_000_000);
    const cid = cidOf(body);

    const args = ingestArgsByRef(cid, body);

    // THE TRANSPORT INVARIANT: the summons stays skinny — the 4MB body is NOWHERE in the
    // args. A reference (the cid) plus metadata only.
    const wire = JSON.stringify(args);
    expect(wire.length).toBeLessThan(4_096);
    expect(wire).not.toContain("very long corpus");
    expect(wire).toContain(cid);

    // The daemon resolves the ref from the corpus CAS and lands the body.
    const blobs = new Map<string, Uint8Array>([[cid, new TextEncoder().encode(body)]]);
    const composite = makeComposite();
    const table = new VerbTable();
    registerActionReactors(table, { composite, resolveByCid: casResolver(blobs) });

    const result = await table.get("INGEST")!(args, ctx(composite, args)) as Record<string, unknown>;
    const carriers = result["carriers"] as Array<Record<string, unknown>>;
    expect(carriers[0]!["decision"]).toBe("ingest");

    // The whole 4MB body transited the reference path and landed in the target bag's
    // per-carrier field (the membrane normalizes a trailing newline — a decompose
    // detail, not a transport loss): the landed record carries the full corpus.
    const landed = (await composite.resolveAll(URI)).find((e) => e.bagId === BAG)!.record;
    const landedText = String(landed.tiddler["text"] ?? "");
    expect(landedText.length).toBeGreaterThan(4_000_000);
    expect(landedText).toBe(body.replace(/\n$/, ""));
    expect(landed.meta?.["changeId"]).toBe("chg-ref-1");
  });

  test("integrity fault: resolved bytes whose hash ≠ textCid reject the carrier (content trust, not host trust)", async () => {
    const body = "authentic body";
    const cid  = cidOf(body);
    // The CAS hands back DIFFERENT bytes for this cid — a host that lies or a corrupt blob.
    const blobs = new Map<string, Uint8Array>([[cid, new TextEncoder().encode("tampered body")]]);

    const composite = makeComposite();
    const table = new VerbTable();
    registerActionReactors(table, { composite, resolveByCid: casResolver(blobs) });
    const args = ingestArgsByRef(cid, body);

    await expect(table.get("INGEST")!(args, ctx(composite, args)))
      .rejects.toThrow(/CAS integrity fault/);
  });

  test("absent resolver: a textCid carrier faults loud rather than landing a body-less record", async () => {
    const body = "needs the seam";
    const args = ingestArgsByRef(cidOf(body), body);
    const composite = makeComposite();
    const table = new VerbTable();
    registerActionReactors(table, { composite }); // no resolveByCid

    await expect(table.get("INGEST")!(args, ctx(composite, args)))
      .rejects.toThrow(/no resolveByCid/);
  });
});

/** A tombstone-safe origin marker mirroring the sibling suite (kept for parity if the
 *  landed-record assertions grow a seeded prior state). */
export const _origin: ChangeOrigin = { kind: "crdt-remote", edgeIsland: BAG };
export type _R = LarTiddlerRecord;

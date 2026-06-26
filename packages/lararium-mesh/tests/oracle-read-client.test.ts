/**
 * oracle-read-client — the consumer side of the Two-Faced Substrate.
 *
 * Proves the reader pulls + verifies + loads a peer's @oracle over an injected fetch,
 * and REFUSES a lying host: a tampered snapshot (hash mismatch), a rolled-back pointer,
 * and a wrong-publisher pointer all fail closed. The first cross-vessel read, in a test.
 */

import { describe, test, expect } from "vitest";
import * as A from "@automerge/automerge";
import { exportOracleSnapshot, buildOraclePointer, type OraclePointer, type OracleSnapshot } from "../src/oracle-substrate.js";
import { pullAndVerifyOracle } from "../src/oracle-read-client.js";

const SEED  = Uint8Array.from({ length: 32 }, (_, i) => i + 1);
const OTHER = Uint8Array.from({ length: 32 }, (_, i) => 200 - i);
const NOW   = 1_000_000;

async function serve(version = 1, seed = SEED): Promise<{ snap: OracleSnapshot; ptr: OraclePointer }> {
  const doc  = A.from({ tiddlers: { "@oracle": { text: "the constitution" }, beta: { text: "two" } } });
  const snap = await exportOracleSnapshot(doc);
  const ptr  = await buildOraclePointer({ snapshot: snap, version, prev: null, expiry: NOW + 60_000, signerSeed: seed });
  return { snap, ptr };
}

/** A fetch that serves a given pointer + snapshot from an in-memory "node". */
function mkFetch(ptr: OraclePointer, snap: OracleSnapshot, opts: { corruptBytes?: boolean } = {}): typeof fetch {
  return (async (input: RequestInfo | URL): Promise<Response> => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.endsWith("/oracle/pointer")) {
      return new Response(JSON.stringify(ptr), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (url.endsWith(`/oracle/${snap.cid}.bin`)) {
      const bytes = opts.corruptBytes ? new Uint8Array([...snap.bytes].map((b, i) => (i === 0 ? b ^ 0xff : b))) : snap.bytes;
      return new Response(bytes, { status: 200, headers: { "content-type": "application/octet-stream" } });
    }
    return new Response("not found", { status: 404 });
  }) as typeof fetch;
}

describe("oracle-read-client — pull, verify, load across the wire", () => {
  test("a healthy peer: pull verifies + loads the @oracle doc", async () => {
    const { snap, ptr } = await serve();
    const res = await pullAndVerifyOracle<{ tiddlers: Record<string, { text: string }> }>(
      "http://peer", { nowMs: NOW, fetchImpl: mkFetch(ptr, snap) },
    );
    expect(res.ok).toBe(true);
    expect(res.cid).toBe(snap.cid);
    expect(res.doc!.tiddlers["@oracle"]!.text).toBe("the constitution");
  });

  test("pinned publisher: a pointer from the wrong key is refused", async () => {
    const { snap, ptr } = await serve(1, OTHER);
    const honest = await serve(1, SEED);
    const res = await pullAndVerifyOracle("http://peer", {
      nowMs: NOW, verifyingKey: honest.ptr.pub, fetchImpl: mkFetch(ptr, snap),
    });
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/rejected|unpinned/);
  });

  test("anti-rollback: a pointer below the high-water is refused", async () => {
    const { snap, ptr } = await serve(2);
    const res = await pullAndVerifyOracle("http://peer", {
      nowMs: NOW, highWaterVersion: 5, fetchImpl: mkFetch(ptr, snap),
    });
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/rollback/);
  });

  test("a lying host: corrupted snapshot bytes fail the content-address check", async () => {
    const { snap, ptr } = await serve();
    const res = await pullAndVerifyOracle("http://peer", {
      nowMs: NOW, fetchImpl: mkFetch(ptr, snap, { corruptBytes: true }),
    });
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/hash mismatch/);
  });

  test("a dead peer (HTTP error) fails closed, never throws", async () => {
    const deadFetch = (async () => new Response("err", { status: 503 })) as typeof fetch;
    const res = await pullAndVerifyOracle("http://peer", { nowMs: NOW, fetchImpl: deadFetch });
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/HTTP 503/);
  });
});

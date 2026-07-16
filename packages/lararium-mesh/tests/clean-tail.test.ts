/**
 * L3 — the clean-tail partition owns the CUT LAW: split ordered records at the FIRST tear.
 * Everything ahead is the verified-loadable prefix; the torn record and all after it (cutoff,
 * not filter) form the tail to move aside. A torn base yields an empty prefix (unrecoverable).
 */
import { describe, expect, test } from "vitest";

import { from as automergeFrom, save } from "@automerge/automerge";
import { partitionCleanTail, type BlobRef } from "../src/store-integrity.js";

function real(): Uint8Array {
  return save(automergeFrom({ tiddlers: { a: { text: "hello" } } }));
}
function torn(): Uint8Array {
  return real().subarray(0, 6); // lopped contents — the disk-full torn write
}
function blob(name: string, data: Uint8Array): BlobRef {
  return { kind: name.startsWith("s") ? "snapshot" : "incremental", name, data };
}

describe("partitionCleanTail", () => {
  test("a torn incremental cuts the tail there — clean prefix kept, torn record + after moved", () => {
    const blobs = [blob("s0", real()), blob("i0", real()), blob("i1", torn()), blob("i2", real())];
    const { keep, tornTail } = partitionCleanTail(blobs);
    expect(keep.map((b) => b.name)).toEqual(["s0", "i0"]);      // ahead of the tear
    expect(tornTail.map((b) => b.name)).toEqual(["i1", "i2"]);  // the tear AND everything after (cutoff)
  });

  test("an all-clean store keeps every record, no tail", () => {
    const blobs = [blob("s0", real()), blob("i0", real())];
    const { keep, tornTail } = partitionCleanTail(blobs);
    expect(keep).toHaveLength(2);
    expect(tornTail).toHaveLength(0);
  });

  test("a torn BASE yields an empty prefix — unrecoverable", () => {
    const blobs = [blob("s0", torn()), blob("i0", real())];
    const { keep, tornTail } = partitionCleanTail(blobs);
    expect(keep).toHaveLength(0);            // no clean prefix to promote from
    expect(tornTail.map((b) => b.name)).toEqual(["s0", "i0"]);
  });

  test("an empty store partitions to two empties", () => {
    const { keep, tornTail } = partitionCleanTail([]);
    expect(keep).toHaveLength(0);
    expect(tornTail).toHaveLength(0);
  });
});

/**
 * verb-tiddler — task/receipt ontology SEED (2026-06-07).
 *
 * Covers the new content-addressed surface (taskUri / receiptUri / taskContentId)
 * and the provisional `aud` (audience/executor) field round-trip. The live
 * verb/signal/outcome path migrates onto this surface per
 * packages/EPIC-TASK-ONTOLOGY.md.
 */

import { describe, test, expect } from "vitest";
import {
  taskUri, receiptUri, taskContentId, TASK_KIND, RECEIPT_KIND,
  buildVerb, summon, parseVerb,
} from "../src/verb-tiddler.js";

const BAG = "lar:///ha.ka.ba/@daemon";

describe("task/receipt URI ontology (seed)", () => {
  test("taskUri / receiptUri compose bag + kind + id", () => {
    expect(taskUri(BAG, "abc")).toBe("lar:///ha.ka.ba/@daemon/task/abc");
    expect(receiptUri(BAG, "abc")).toBe("lar:///ha.ka.ba/@daemon/receipt/abc");
    expect(TASK_KIND).toBe("task");
    expect(RECEIPT_KIND).toBe("receipt");
  });

  test("taskContentId is deterministic over {subject,command,args,nonce}", async () => {
    const a = await taskContentId({ subject: BAG, command: "MOVE", args: { x: 1 } });
    const b = await taskContentId({ subject: BAG, command: "MOVE", args: { x: 1 } });
    expect(a).toBe(b);
    expect(a).toHaveLength(64); // sha256 hex
  });

  test("a fresh nonce yields a distinct task id (idempotent vs fresh dial)", async () => {
    const idem  = await taskContentId({ subject: BAG, command: "MOVE", args: {} });
    const fresh = await taskContentId({ subject: BAG, command: "MOVE", args: {}, nonce: "n1" });
    expect(fresh).not.toBe(idem);
  });

  test("aud round-trips through invocation build → parse", () => {
    const fields = buildVerb({ verb: "mint-invite", args: {}, requestedBy: "did:key:zOp", aud: "did:key:zVesselA" });
    expect(parseVerb(fields)?.aud).toBe("did:key:zVesselA");
  });

  test("aud round-trips through signal; absent stays undefined", () => {
    const sig = summon({ verb: "where", args: {}, requestedBy: "did:key:zOp", aud: "did:key:zVesselB" });
    expect(parseVerb(sig.tiddler as Record<string, unknown>)?.aud).toBe("did:key:zVesselB");
    const noAud = buildVerb({ verb: "where", args: {}, requestedBy: "did:key:zOp" });
    expect(parseVerb(noAud)?.aud).toBeUndefined();
  });
});

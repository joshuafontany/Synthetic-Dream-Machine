/**
 * uds-channel-routing — the co-located content bypass.
 *
 * The routing law (project_dreamnet_resolution_design, operator 2026-07-20): a
 * co-located `lares` invocation hands its carriers to the daemon worker over the
 * DIRECT channel (placeVerb → postMessage); the daemon Automerge doc receives
 * ONLY the durable outcome/receipt, NEVER the carrier content. This test drives a
 * real UDS socket with a spy placeVerb standing in for the worker (it lands the
 * carriers in a TARGET bag doc + writes the outcome to daemon, exactly as the
 * dispatcher does) and asserts the content never touches daemon.
 */

import { describe, test, expect } from "vitest";
import { mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createConnection } from "node:net";
import { Repo } from "@automerge/automerge-repo";
import {
  emptyLarDoc, mutableLarRecord, concludeVerb,
  SUMMONS_URI_PREFIX, OUTCOME_URI_PREFIX, type LarDoc,
} from "@lararium/mesh";
import { startUdsChannel } from "../src/uds-channel.js";

interface Placed { verb: string; args: Record<string, unknown>; requestedBy: string; requestId: string; }

function sendInvocation(socketPath: string, inv: unknown): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const sock = createConnection(socketPath);
    let buf = "";
    sock.setEncoding("utf8");
    sock.on("connect", () => sock.write(JSON.stringify(inv) + "\n"));
    sock.on("data", (chunk: string) => {
      buf += chunk;
      const nl = buf.indexOf("\n");
      if (nl !== -1) { const line = buf.slice(0, nl); sock.end(); resolve(JSON.parse(line)); }
    });
    sock.on("error", reject);
  });
}

async function waitForSocket(path: string): Promise<void> {
  for (let i = 0; i < 100; i++) {
    if (existsSync(path)) return;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error(`socket never appeared at ${path}`);
}

describe("uds-channel — carriers bypass the daemon doc (co-located routing)", () => {
  test("content rides placeVerb to the target bag; daemon holds only the outcome", async () => {
    const repo = new Repo({ sharePolicy: async () => true });
    const daemonHandle = repo.create<LarDoc>(emptyLarDoc());
    const targetHandle = repo.create<LarDoc>(emptyLarDoc());

    const dir = mkdtempSync(join(tmpdir(), "uds-routing-"));
    const socketPath = join(dir, "lares.sock");

    const CARRIER_URI = "lar:///ha.ka.ba/bags/target/doc/manifesto";
    const CARRIER_BODY = "THE-WHOLE-CARRIER-BODY-that-must-never-touch-daemon";
    const placed: Placed[] = [];

    const channel = startUdsChannel({
      daemonHandle,
      // Stand in for the daemon worker: land the carriers in the TARGET bag (as the
      // dispatcher's executeIngest does via access.write(destBag)), then write the
      // durable outcome into daemon — the ONLY thing daemon's doc ever sees.
      placeVerb: (o) => {
        placed.push(o as Placed);
        const carriers = (o.args["carriers"] as Array<{ uri: string; text: string }> | undefined) ?? [];
        targetHandle.change((doc) => {
          for (const c of carriers) {
            doc.tiddlers[c.uri] = mutableLarRecord(c.uri, { text: c.text }, "lares-verb");
          }
        });
        const outcome = concludeVerb({
          requestId: o.requestId, verb: o.verb, status: "done",
          requestedBy: o.requestedBy, cause: "test-worker", batchMode: "best-effort",
          results: { summary: { ok: true, output: { toBag: String(o.args["toBag"]) } } },
        });
        daemonHandle.change((doc) => { doc.tiddlers[outcome.tiddler.title] = outcome as unknown as LarDoc["tiddlers"][string]; });
      },
      socketPath,
    });

    try {
      await waitForSocket(socketPath);

      const outcome = await sendInvocation(socketPath, {
        verb: "act",
        args: { toBag: targetHandle.url, carriers: [{ uri: CARRIER_URI, text: CARRIER_BODY }] },
        requestedBy: "did:key:test-operator",
        requestId: "req-routing-1",
      });

      // The invocation completed via the durable outcome.
      expect(outcome["status"]).toBe("done");

      // The carrier CONTENT reached the worker channel (never serialized into a summons).
      expect(placed).toHaveLength(1);
      expect((placed[0].args["carriers"] as Array<{ text: string }>)[0].text).toBe(CARRIER_BODY);

      // daemon's doc carries the outcome/receipt — and NO summons.
      const daemonTitles = Object.keys(daemonHandle.doc().tiddlers);
      expect(daemonTitles.some((t) => t.startsWith(SUMMONS_URI_PREFIX))).toBe(false);
      expect(daemonTitles.some((t) => t.startsWith(OUTCOME_URI_PREFIX))).toBe(true);

      // The whole daemon doc — history included via the live doc — carries ZERO carrier content.
      expect(JSON.stringify(daemonHandle.doc())).not.toContain(CARRIER_BODY);

      // The carrier landed in the TARGET bag exactly.
      const landed = targetHandle.doc().tiddlers[CARRIER_URI] as { tiddler: { text?: string } } | undefined;
      expect(landed?.tiddler.text).toBe(CARRIER_BODY);
    } finally {
      channel.close();
    }
  });
});

/**
 * S3.1 — the LIVE capture-engine wired to CALLER-VECTOR, driven end-to-end: enqueue a turn → tick →
 * the mine-free base flush (embed cap → meta annotate → content-palace put) lands a STRUCTURED drawer
 * in the owned content plane. Proves the blocker cleared at the engine boundary (no vendored mine).
 * Pinned to minilm.
 */
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { defaultCryptoProvider, sha256Hex, utf8Bytes } from "@lararium/mesh";
import type { FlushGate } from "@lararium/mesh";
import { afterEach, beforeAll, describe, expect, test } from "vitest";

import { makeNodeCaptureEngine } from "../src/node-capture-engine.js";
import { makeContentPalace, type ContentPalace } from "../src/content-palace.js";

const TEST_TIMEOUT = 120_000;
const GATE: FlushGate = { depth: 1, maxWaitMs: 2000, maxDepth: 16, maxRetries: 5, backoffBaseMs: 100, backoffMaxMs: 5000 };

beforeAll(() => { process.env["MEMPALACE_EMBEDDING_MODEL"] = "minilm"; });

const closers: Array<() => void | Promise<void>> = [];
afterEach(async () => { for (const c of closers.splice(0)) await c(); });

describe("makeNodeCaptureEngine — caller-vector mode (S3.1, live)", () => {
  test("enqueue → tick lands a STRUCTURED caller-vector drawer in the owned plane (no mine)", async () => {
    const contentDir = await mkdtemp(join(tmpdir(), "cv-engine-"));
    const tmp = await mkdtemp(join(tmpdir(), "cv-wal-"));
    const engine = makeNodeCaptureEngine({
      palacePath: join(tmp, "unused"),        // unused in caller-vector mode
      spoolDir: join(tmp, "spool"),
      walPath: join(tmp, "wal.ndjson"),
      quarantinePath: join(tmp, "quarantine.ndjson"),
      annotate: () => ({}),                    // the in-VM annotate is a no-op here
      gate: GATE,
      callerVector: { contentDir },            // THE swap: mine-free, structured
    });
    closers.push(() => engine.dispose());

    const source = "sess/1";
    await engine.enqueue("Joshua and Bob built the Lares node. Joshua wrote the keel.", source, undefined, "uuid-1", 0);
    expect(await engine.tick(Date.now())).toBe(1);   // the caller-vector flush landed it

    // verify via a content palace on the SAME dir (composeHolder shares the one holder — no lock clash)
    const content: ContentPalace = makeContentPalace(contentDir);
    closers.push(() => content.close());
    const cid = `${await sha256Hex(utf8Bytes(source), defaultCryptoProvider)}_0`;
    const got = await content.get(cid);
    expect(got).not.toBeNull();
    expect(got!.document).toContain("Joshua");                         // landed caller-vector
    expect(typeof got!.metadata["entities"]).toBe("string");          // STRUCTURED (meta stamped)
    expect((got!.metadata["entities"] as string).toLowerCase()).toContain("joshua");
  }, TEST_TIMEOUT);
});

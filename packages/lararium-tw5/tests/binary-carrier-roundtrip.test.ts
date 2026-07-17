/**
 * binary-carrier-roundtrip — a binary tiddler projects to its native filetype.
 *
 * An image tiddler (type image/png, text = base64) exports as `.png` with
 * `encoding: "base64"` + a `.meta` sidecar; decoding the body yields the original
 * bytes. Re-ingest through the registry keeps the base64 text — a full circle.
 */

import { describe, test, expect, beforeAll } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { TW5Engine } from "../src/tw5-vm.js";
import { exportCarrierFile } from "../src/meme-write.js";
import { makeTw5Deserializer } from "../src/action-handler.js";
import LARES_MEMETIC_WIKITEXT_PLUGIN from "../plugins/lares-memetic-wikitext.json" with { type: "json" };
import { TW5_CORE_DIR, TW5_CORE_SCRIPT_FILENAME } from "../src/generated-tw5-version.js";

const CORE_PATH = path.join(TW5_CORE_DIR, TW5_CORE_SCRIPT_FILENAME);
const coreBlobPresent = existsSync(CORE_PATH);
const URI = "lar:///ha.ka.ba/lares/api/native/pic";
const RAW = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0xff, 0x00, 0xfe]);
const B64 = RAW.toString("base64");

describe.skipIf(!coreBlobPresent)("a binary carrier round-trips through its native filetype", () => {
  let engine: TW5Engine;

  beforeAll(async () => {
    engine = new TW5Engine();
    const coreBlob = new Uint8Array(readFileSync(CORE_PATH));
    await engine.boot(coreBlob, [LARES_MEMETIC_WIKITEXT_PLUGIN as unknown as Record<string, unknown>]);
    engine.setTiddler({ title: URI, type: "image/png", text: B64 });
  }, 60_000);

  test("exportCarrierFile marks base64 + the decoded body is byte-identical", () => {
    const file = exportCarrierFile(engine, URI);
    expect(file).not.toBeNull();
    expect(file!.ext).toBe(".png");
    expect(file!.encoding).toBe("base64");
    expect(file!.metaBody).toBeDefined();
    expect(file!.metaBody!).toContain("image/png");
    // decoding the base64 body yields the ORIGINAL bytes
    expect(Buffer.from(file!.body, "base64").equals(RAW)).toBe(true);
  });

  test("re-ingest through the registry keeps the base64 text", () => {
    const d = makeTw5Deserializer(engine);
    const records = d.deserialize(".png", B64, { title: URI, type: "image/png" });
    expect(records.length).toBeGreaterThan(0);
    expect(String(records[0]!["type"])).toContain("png");
    expect(Buffer.from(String(records[0]!["text"]), "base64").equals(RAW)).toBe(true);
  });
});

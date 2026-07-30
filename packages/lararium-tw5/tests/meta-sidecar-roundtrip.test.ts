/**
 * meta-sidecar-roundtrip — a content filetype keeps its fields across a body edit.
 *
 * The projector writes a `.md`/content carrier as `<body>` + a `.meta` sidecar
 * (fields). On re-ingest the island parses the sidecar (TW5's own field parser)
 * and seeds the deserialize, so the landed record recovers type/tags/custom
 * fields even when only the body file changed — no field loss.
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
/**
 * The vendored TW5 core is a GITIGNORED BUILD ARTIFACT, so a fresh clone — and CI's `test` job, which runs
 * `pnpm -r test` with no build step — sees it absent. An anonymous `skipIf` there drops this suite at exit 0,
 * indistinguishable from a green run. The skip now NAMES itself and its cure in the reporter line, following
 * `lararium-node/tests/blob-sovereignty.test.ts:35-44`.
 */
const coreBlobSkip = existsSync(CORE_PATH)
  ? false
  : `TW5 core blob absent at ${CORE_PATH} — run: pnpm --filter @lararium/tw5 build:tw5-vendor`;
const URI = "lar:///ha.ka.ba/lares/api/native/paired";

describe.skipIf(coreBlobSkip)(
  `the .meta sidecar round-trips a content carrier's fields${coreBlobSkip ? ` [SKIPPED: ${coreBlobSkip}]` : ""}`,
() => {
  let engine: TW5Engine;

  beforeAll(async () => {
    engine = new TW5Engine();
    const coreBlob = new Uint8Array(readFileSync(CORE_PATH));
    await engine.boot(coreBlob, [LARES_MEMETIC_WIKITEXT_PLUGIN as unknown as Record<string, unknown>]);
    engine.setTiddler({
      title:      URI,
      type:       "text/markdown",
      text:       "# original body\n",
      tags:       "api/native keep-me",
      "custom-x": "operator-authored",
    });
  }, 60_000);

  test("parseFields + deserialize recover the fields the sidecar carried", () => {
    const file = exportCarrierFile(engine, URI);
    expect(file).not.toBeNull();
    expect(file!.ext).toBe(".md");
    expect(file!.metaBody).toBeDefined();

    const d = makeTw5Deserializer(engine);
    const metaFields = d.parseFields(file!.metaBody!);
    // the sidecar carried the fields, never the text
    expect(metaFields["type"]).toBe("text/markdown");
    expect(metaFields["custom-x"]).toBe("operator-authored");

    // simulate a body-only edit re-ingest: NEW body bytes + the SAME sidecar
    const editedBody = "# edited body\n";
    const records = d.deserialize(".md", editedBody, { ...metaFields, title: URI });
    expect(records.length).toBeGreaterThan(0);
    const rec = records[0]!;
    // TW5's registry canonicalizes the `.md` type (text/markdown → text/x-markdown);
    // the point of the pairing is that the OPERATOR-AUTHORED fields survive the edit.
    expect(String(rec["type"])).toContain("markdown");
    expect(String(rec["tags"])).toContain("keep-me");
    expect(rec["custom-x"]).toBe("operator-authored");
    expect(String(rec["text"])).toContain("edited body");
  });

  test("without the sidecar, a body-only deserialize loses the fields (the gap the pairing closes)", () => {
    const d = makeTw5Deserializer(engine);
    const records = d.deserialize(".md", "# lonely body\n", { title: URI });
    const rec = records[0]!;
    // no custom-x, no operator tags — this is exactly why the pairing exists
    expect(rec["custom-x"]).toBeUndefined();
  });
});

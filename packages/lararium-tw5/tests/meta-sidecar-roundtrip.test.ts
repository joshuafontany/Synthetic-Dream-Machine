/**
 * meta-sidecar-roundtrip — a content filetype keeps its fields across a body edit.
 *
 * The projector writes a `.md`/content carrier as `<body>` + a `.meta` sidecar
 * (fields). On re-ingest the island parses the sidecar (TW5's own field parser)
 * and seeds the deserialize, so the landed record recovers type/tags/custom
 * fields even when only the body file changed — no field loss.
 *
 * The same floor the carrier grammar answers to applies here, one filetype over: a field an operator can
 * SEE on a tiddler must survive being edited, projected, and read back. A native file splits that journey
 * across two artifacts instead of one, which gives a field two ways to fall out rather than none.
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

/** What the operator authored. The engine writes fields and does not read them back, so the record the
 *  tests edit against lives here rather than being queried out of the VM. */
const SEEDED: Record<string, string> = {
  title:      URI,
  type:       "text/markdown",
  text:       "# original body\n",
  tags:       "api/native keep-me",
  "custom-x": "operator-authored",
};

describe.skipIf(coreBlobSkip)(
  `the .meta sidecar round-trips a content carrier's fields${coreBlobSkip ? ` [SKIPPED: ${coreBlobSkip}]` : ""}`,
() => {
  let engine: TW5Engine;

  beforeAll(async () => {
    engine = new TW5Engine();
    const coreBlob = new Uint8Array(readFileSync(CORE_PATH));
    await engine.boot(coreBlob, [LARES_MEMETIC_WIKITEXT_PLUGIN as unknown as Record<string, unknown>]);
    engine.setTiddler({ ...SEEDED });
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

  /**
   * THE WIKI-DIRECTION CYCLE.
   *
   * Every test above this one enters from DISK: bytes exist, ingest reads them. The live wiki writes the
   * other way — an operator edits a field in the browser and the projector puts it on disk — and the two
   * legs have only ever been proven apart. A field can round-trip perfectly on the disk leg and still be
   * dropped by the projector, and nothing composed the halves to notice.
   *
   * So: edit each field where the operator can reach it, project, read back, and ask what survived.
   * `title` and `type` sit outside the question for the reason the carrier floor names — the host reads
   * them to place and dispatch the record rather than storing them as content.
   */
  test("every field an operator edits in the wiki survives the projection", () => {
    const HOST_OWNED = new Set(["title", "type", "revision", "text"]);
    const d = makeTw5Deserializer(engine);
    const editable = Object.keys(SEEDED).filter((k) => !HOST_OWNED.has(k));
    expect(editable.length).toBeGreaterThan(0);

    const lost: string[] = [];
    for (const key of editable) {
      engine.setTiddler({ ...SEEDED, [key]: `EDITED-${key}` });
      const file = exportCarrierFile(engine, URI);
      if (file?.metaBody === undefined) lost.push(`${key}: projected without a sidecar`);
      else if (d.parseFields(file.metaBody)[key] !== `EDITED-${key}`) lost.push(key);
    }
    engine.setTiddler({ ...SEEDED });
    expect(lost).toEqual([]);
  });

  /**
   * PROJECTION SETTLES, AND TAKES ONE PASS TO DO IT.
   *
   * A projector that writes different bytes every pass turns each no-op sync into a diff, and on a mesh
   * where two vessels project one record that reads as a conflict neither operator caused. So the bytes
   * must reach a fixed point — and this pairing reaches it on the SECOND pass, not the first.
   *
   * The lag is TiddlyWiki's filetype registry canonicalizing a type it recognizes under another spelling:
   * an operator writes `text/markdown` and the registry lands `text/x-markdown`. Both name one filetype,
   * so the sidecar changes once and never again. A record ingested from disk therefore shows exactly one
   * rewrite on its first sync, which converges rather than oscillating — but it is a real diff, and a
   * reviewer who sees it should recognize it here rather than hunt it.
   */
  test("projection converges — one canonicalizing pass, then the same two artifacts forever", () => {
    const d = makeTw5Deserializer(engine);
    const readBack = (file: NonNullable<ReturnType<typeof exportCarrierFile>>) =>
      d.deserialize(file.ext, file.body as string, { ...d.parseFields(file.metaBody!), title: URI })[0]!;

    const first = exportCarrierFile(engine, URI);
    expect(first).not.toBeNull();
    engine.setTiddler(readBack(first!) as never);

    const second = exportCarrierFile(engine, URI);
    expect(second!.metaBody).toContain("text/x-markdown");   // the one canonicalization
    engine.setTiddler(readBack(second!) as never);

    const third = exportCarrierFile(engine, URI);            // and the fixed point holds
    expect(third!.body).toEqual(second!.body);
    expect(third!.metaBody).toEqual(second!.metaBody);

    engine.setTiddler({ ...SEEDED });
  });

  /**
   * YAML FRONT MATTER — the shape a SKILL.md arrives in.
   *
   * A skill file leads with a `---` block that IS its metadata: the name and description an author edits
   * in the file itself, beside the prose. Read as body text those become content that renders as a rule
   * and edits nowhere, and the fields the block declares live only in a sidecar the author never sees.
   *
   * The pairing already carries fields for a `.md` that has none of its own. This asks the narrower
   * question: when the FILE declares them, does the field surface as a field.
   */
  test.skip("a .md leading with YAML front matter surfaces its keys as fields, not as body text — DEFERRED: front matter is not one convention but a family (Jekyll/Hugo TOML, MDX, Obsidian, Quarto, Astro), and which of them this grammar answers to gets scouted before a handler lands; the answer may be a new deserializer here or a patch upstream to TiddlyWiki's own registry", () => {
    const d = makeTw5Deserializer(engine);
    const withFrontMatter = "---\nname: the-skill\ndescription: what it does\n---\n\n# body\n";
    const rec = d.deserialize(".md", withFrontMatter, { title: URI })[0]!;

    expect(rec["name"]).toBe("the-skill");
    expect(rec["description"]).toBe("what it does");
    expect(String(rec["text"])).not.toContain("name: the-skill");
  });
});

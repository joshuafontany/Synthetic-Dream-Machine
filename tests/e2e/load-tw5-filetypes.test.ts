/**
 * e2e/load-tw5-filetypes — the LOAD feed lands BOTH memetic-wikitext memes AND
 * every other legal TW5 filetype, by routing each carrier through TiddlyWiki5's
 * OWN deserializer registry (keyed by extension) — so an engine bump or a
 * hand-rolled deserializer just works, with no hardcoded filetype list.
 *
 * A throwaway source dir holds one of each shape:
 *   · memetic .md  (SOH heading)         → the memetic membrane (decomposes)
 *   · .tid         (own title field)     → application/x-tiddler (title wins)
 *   · .json        (tiddler array)       → application/json
 *   · plain .md    (headless)            → text/plain, titled by the loci law
 *   · .txt         (plain text)          → text/plain, titled by the loci law
 *
 * Witnessed via the LOAD's returned `titles` — projection-independent, so it
 * reads the routing law directly.
 */

import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { targetInstance, type LarInstance } from "../harness/instance.js";

const LARES_URI = "lar:///ha.ka.ba/bags/lares";

let lar: LarInstance;
let src = "";
let titles: string[] = [];
let loadOk = false;

beforeAll(async () => {
  lar = await targetInstance();
  if (lar.mode !== "staged") return;

  src = mkdtempSync(join(tmpdir(), "lares-load-types-"));
  // memetic carrier — SOH heading, decomposes at the membrane
  writeFileSync(join(src, "memetic.md"),
    "<<^ code=\"&#x0001;\" ? -> lar:///ha.ka.ba/lares/test/memetic-witness >>\n# Memetic Witness\n\nbody under the way.\n");
  // .tid — carries its own title field (must win)
  writeFileSync(join(src, "note.tid"),
    "title: TestTidTitle\ntype: text/vnd.tiddlywiki\n\nA .tid tiddler body.\n");
  // .json — a tiddler array
  writeFileSync(join(src, "data.json"),
    JSON.stringify([{ title: "JsonTiddler", text: "from json", type: "text/vnd.tiddlywiki" }]));
  // plain headless markdown — text/plain, loci-titled
  writeFileSync(join(src, "plain.md"), "Just plain markdown, no heading.\n");
  // plain text — text/plain, loci-titled
  writeFileSync(join(src, "notes.txt"), "raw notes, no structure.\n");

  const r = await lar.cli(["act", "LOAD", "--source-uri", src, "--to", LARES_URI, "--yes", "--json"]);
  loadOk = r.json?.["ok"] === true;
  titles = ((r.json?.["data"] as { titles?: string[] } | undefined)?.titles ?? []).map(String);
}, 180_000);

afterAll(async () => {
  if (src) rmSync(src, { recursive: true, force: true });
  await lar.stop();
});

describe("LOAD — memetic memes AND all legal TW5 filetypes (via TW5's registry)", () => {
  test("T1 — the mixed-filetype batch LOAD lands", () => {
    if (lar.mode !== "staged") return;
    expect(loadOk).toBe(true);
    expect(titles.length).toBeGreaterThanOrEqual(5);
  });

  test("T2 — a memetic .md decomposes at the membrane (heading-titled)", () => {
    if (lar.mode !== "staged") return;
    expect(titles.some((t) => t.includes("test/memetic-witness"))).toBe(true);
  });

  test("T3 — a .tid lands through application/x-tiddler, keeping its own title", () => {
    if (lar.mode !== "staged") return;
    expect(titles).toContain("TestTidTitle");
  });

  test("T4 — a .json lands through application/json", () => {
    if (lar.mode !== "staged") return;
    expect(titles).toContain("JsonTiddler");
  });

  test("T5 — headless plain files land as text/plain, titled by the loci law", () => {
    if (lar.mode !== "staged") return;
    // DERIVE from the target, never hardcode the address. The loci law titles a headless carrier
    // `<the --to bag>/<basename>`, so the expectation moves whenever the bag URI does — and a literal
    // here simply records where the bag USED to live, which is what it had come to record.
    expect(titles).toContain(`${LARES_URI}/plain`);
    expect(titles).toContain(`${LARES_URI}/notes`);
  });
});

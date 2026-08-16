/**
 * grammar-in-a-wiki — every grammar claim measured inside a live TW5 instance.
 *
 * ── ONE PARSER HOLDS THE TRUTH, AND IT RUNS INSIDE A WIKI ───────────────────────────────────────
 * A sigil's meaning lives in the tiddler that defines it; a procedure resolves through the host's own
 * dispatcher; a name that binds nothing renders as its own text. None of that is available to a reader
 * standing outside a wiki — so a grammar claim measured outside one measures a reader the system does
 * not trust, and a green run there proves only that the untrusted reader agrees with itself.
 *
 * ── MIRRORED FROM THE HOST'S OWN TEST EDITION ───────────────────────────────────────────────────
 * TiddlyWiki tests its own grammar exactly this way. `editions/test/quick-test.js` boots `$tw` from
 * `boot/boot.js`, disables the startup modules a test does not need, and every spec parses through
 * `wiki.parseText(type, text)` on a wiki that stands; the specs are tiddlers, the wiki is the
 * instrument, and nothing parses in the runner itself.
 *
 * This mirrors that shape: ONE engine for the file, booted once in `beforeAll`, and every claim below
 * asked of `wiki.deserializeTiddlers` or `wiki.parseText` — the same two doors the host's specs use.
 *
 * A HARNESS OUTSIDE THE RUNNER DOES NOT WORK, and the reason is worth recording: booting the vendored
 * core from a bare node script throws `$tw.preloadTiddlerArray is not a function`, because the engine
 * seeds its globals through the environment the runner provides. The mirror is the runner, not a
 * standalone script — which is what TiddlyWiki does too.
 *
 * ── WHAT STAYS OUTSIDE, AND WHY IT IS NOT AN EXCEPTION ──────────────────────────────────────────
 * The boot loader (`lar:///ha.ka.ba/lares/api/pono/boot-loader`) reads before a wiki exists: four frame
 * marks, one identity fence, one worksite boundary, nothing else. Its conformance CANNOT be tested in a
 * wiki, because the question only means anything before one stands.
 */

import { describe, test, expect, beforeAll } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import { TW5Engine } from "../src/tw5-vm.js";
import { CARRIER_TYPE } from "@lararium/mesh/carrier-type";
import LARES_MEMETIC_WIKITEXT_PLUGIN from "../plugins/lares-memetic-wikitext.json" with { type: "json" };
import { TW5_CORE_DIR, TW5_CORE_SCRIPT_FILENAME } from "../src/generated-tw5-version.js";

const REPO = new URL("../../..", import.meta.url).pathname;
const CORE_PATH = path.join(TW5_CORE_DIR, TW5_CORE_SCRIPT_FILENAME);

/** The vendored core is a gitignored build artifact; a silent skip would turn this file green by absence. */
const coreBlobSkip = existsSync(CORE_PATH)
  ? false
  : `TW5 core blob absent at ${CORE_PATH} — run: pnpm --filter @lararium/tw5 build:tw5-vendor`;

describe.skipIf(coreBlobSkip)(
  `★ the grammar, measured in a live wiki ★${coreBlobSkip ? ` [SKIPPED: ${coreBlobSkip}]` : ""}`,
() => {
  let engine: TW5Engine;
  /** One wiki for the file. Booting per-test would measure the boot, not the grammar. */
  beforeAll(async () => {
    engine = new TW5Engine();
    await engine.boot(new Uint8Array(readFileSync(CORE_PATH)),
      [LARES_MEMETIC_WIKITEXT_PLUGIN as unknown as Record<string, unknown>]);
  });

  const deserialize = (text: string, title: string) =>
    (engine.$tw.wiki.deserializeTiddlers(CARRIER_TYPE, text, { title }) ?? []) as Array<Record<string, unknown>>;

  test("the wiki dispatches a carrier by its type, under the name the corpus writes", () => {
    const src = readFileSync(path.join(REPO, "bags/@lares/ha.ka.ba/lares/api/pono/boot-loader.mem"), "utf8");
    const records = deserialize(src, "lar:///ha.ka.ba/lares/api/pono/boot-loader");
    // A type the wiki does not dispatch yields NOTHING — no throw, no records. So the count is the
    // claim: the deserializer registered, the filetype resolved, and the frame divided the carrier.
    expect(records.length).toBeGreaterThan(1);
    expect(records[0]!["type"]).toBe(CARRIER_TYPE);
  });

  test("a carrier stored under the earlier type name still dispatches", () => {
    // The read side stays wide permanently: a carrier authored before the suffix names the same syntax
    // and always did. This is the claim that rested on module exports COMPILING rather than on the host
    // RESOLVING them — the one an export-key transform could have dropped with nothing here to notice.
    const src = readFileSync(path.join(REPO, "bags/@lares/ha.ka.ba/lares/api/pono/boot-loader.mem"), "utf8")
      .replace(CARRIER_TYPE, "text/x-memetic-wikitext");
    const records = (engine.$tw.wiki.deserializeTiddlers(
      "text/x-memetic-wikitext", src, { title: "lar:///probe/legacy" },
    ) ?? []) as Array<Record<string, unknown>>;
    expect(records.length).toBeGreaterThan(1);
  });

  test("the corpus round-trips through the WIKI, not through a reader standing outside it", () => {
    const carriers = execSync("git ls-files 'bags/@lares/ha.ka.ba/lares/api/pono/*.mem'",
      { encoding: "utf8", cwd: REPO }).split("\n").filter(Boolean).slice(0, 40);
    const drift: string[] = [];
    for (const f of carriers) {
      const src = readFileSync(path.join(REPO, f), "utf8");
      const uri = /uri-path\s*=\s*"([^"]+)"/.exec(src)?.[1];
      if (!uri) continue;
      const records = deserialize(src, `lar:///${uri}`);
      if (records.length === 0) drift.push(`${f}: the wiki read no carrier`);
    }
    expect(drift).toEqual([]);
    expect(carriers.length).toBeGreaterThan(20);
  });

  test("a name that binds no procedure renders as its own text — the gradient's floor", () => {
    // The chat register stands 545 times in the corpus and no procedure binds `confidence`. The wiki
    // MUST leave it as text: a transcript that resolved what it quotes would lie about what was said.
    const tree = engine.$tw.wiki.parseText(CARRIER_TYPE, "<<~ confidence Canon 18/20 >>") as { tree: unknown[] };
    const flat = JSON.stringify(tree.tree);
    expect(flat).toContain("confidence");
    expect(flat).not.toContain("$:/plugins/lares/confidence");
  });
});

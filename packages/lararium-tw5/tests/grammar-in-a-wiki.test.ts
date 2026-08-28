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
import { bootTestWiki, wikiSkip, skipNote } from "./test-wiki.js";
import { expandMemeRefs, memeticWikitextDeserializer } from "../src/deserializer.js";
import { parseTaploFields } from "../src/toml-ast.js";
import { memeticIngestOps } from "../src/ingest-gate.js";
import { CARRIER_TYPE } from "@lararium/mesh/carrier-type";

const REPO = new URL("../../..", import.meta.url).pathname;

/** The vendored core is a gitignored build artifact; a silent skip would turn this file green by absence. */

describe.skipIf(wikiSkip)(
  `★ the grammar, measured in a live wiki ★${skipNote}`,
() => {
  let engine: TW5Engine;
  /** One wiki for the file. Booting per-test would measure the boot, not the grammar. */
  beforeAll(async () => {
    engine = await bootTestWiki();
  });

  const deserialize = (text: string, title: string) =>
    (engine.$tw.wiki.deserializeTiddlers(CARRIER_TYPE, text, { title }) ?? []) as Array<Record<string, unknown>>;

  /**
   * ONE BUILD ON BOTH SIDES OF A ROUND TRIP.
   *
   * The wiki reads the PACKED plugin; `expandMemeRefs` imports from `src/`. A test that asks whether
   * the wiki dispatches a carrier wants the packed reader, and takes it above. A test that compares
   * what the parse PRODUCES against what the emitter WRITES wants one build on both halves — read
   * through the bundle and written through source, it measures the distance between two builds and
   * reports it as a property of the corpus.
   *
   * That reading is not hypothetical: it once named 600 carriers as a corpus-wide meta rewrite that no
   * single build would ever perform, and the number moved whenever source moved while the bundle stood
   * still. `plugin-artifact-parity` holds the bundle-against-source line; a round-trip gate holds the
   * grammar's own.
   */
  const deserializeFromSource = (text: string, title: string) =>
    memeticWikitextDeserializer.call({ wiki: engine.$tw.wiki } as never, text, { title }, CARRIER_TYPE) as Array<Record<string, unknown>>;

  test("the wiki dispatches a carrier by its type, under the name the corpus writes", () => {
    const src = readFileSync(path.join(REPO, "bags/lares/ha.ka.ba/lares/api/pono/boot-loader.mem"), "utf8");
    const records = deserialize(src, "lar:///ha.ka.ba/lares/api/pono/boot-loader");
    // A type the wiki does not dispatch yields NOTHING — no throw, no records. So the count is the
    // claim: the deserializer registered, the filetype resolved, and the frame divided the carrier.
    expect(records.length).toBeGreaterThan(1);
    expect(records[0]!["type"]).toBe(CARRIER_TYPE);
  });


  /**
   * ROUND TRIP, THROUGH THE WIKI. `bags/` is canon and the ingest loop compares each carrier against
   * `render(parse(disk))`. When the two disagree the carrier reads "changed" on every scan forever: it
   * never converges, the merge seat never settles, and a write-back rewrites the operator's source.
   *
   * The META BLOCK IS EXEMPT — key realignment and added metadata are the renderer's business and the
   * operator has ruled them acceptable. Only BODY drift fails.
   */
  test("every carrier renders back to the bytes the WIKI parsed it from", () => {
    const carriers = execSync("git ls-files 'bags/**/*.mem'", { encoding: "utf8", cwd: REPO })
      .split("\n").filter(Boolean);
    const stripMeta = (t: string) => t.replace(/```toml meta\n[\s\S]*?\n```\n/g, "```toml meta\n<META>\n```\n");
    const drift: string[] = [];
    for (const f of carriers) {
      const disk = readFileSync(path.join(REPO, f), "utf8");
      const uri = /^uri-path\s*=\s*"([^"]+)"/m.exec(disk)?.[1];
      if (!uri) continue;
      const title = `lar:///${uri}`;
      const records = deserializeFromSource(disk, title);
      if (records.length === 0) { drift.push(`${f}: the wiki read no carrier`); continue; }
      const by = new Map(records.map((r) => [r["title"] as string, r]));
      const rendered = expandMemeRefs((u: string) => (by.get(u) ?? null) as never, title);
      if (rendered === null) { drift.push(`${f}: projected to nothing`); continue; }
      if (stripMeta(rendered) !== stripMeta(disk)) drift.push(`${f}: body does not render back`);
    }
    expect(carriers.length).toBeGreaterThan(500);
    expect(drift).toEqual([]);
  });

  /**
   * TWO FAULTS THAT VANISH RATHER THAN FAIL, and neither is body drift.
   *
   * · CONTENT PAST ETX. The text ends at ETX; the slot below it carries the block check alone. A carrier
   *   that wrote prose there loses it — the render never reproduces it and nothing says so. Two `#edges`
   *   blocks disappeared that way before anyone diffed a round trip.
   * · A RESIDENCY STAMP IN CANON. `origin-bag` is a READ-PATH annotation the engine writes onto records.
   *   Written into a carrier it fuses identity with residency, and a meme re-projected to another bag
   *   then carries its old home.
   */
  test("no carrier strands content past ETX, and none stamps its residency into canon", () => {
    const carriers = execSync("git ls-files 'bags/**/*.mem'", { encoding: "utf8", cwd: REPO })
      .split("\n").filter(Boolean);
    const stranded: string[] = [], stamped: string[] = [];
    for (const f of carriers) {
      const disk = readFileSync(path.join(REPO, f), "utf8");
      const uri = /^uri-path\s*=\s*"([^"]+)"/m.exec(disk)?.[1];
      if (!uri) continue;
      if (/^origin-bag\s*=/m.test(disk)) stamped.push(f);
      const { diagnostics } = memeticIngestOps.deserialize(`lar:///${uri}`, disk) as {
        diagnostics: Array<{ code?: string }>;
      };
      if (diagnostics.some((d) => d.code === "postamble-content")) stranded.push(f);
    }
    expect(stranded).toEqual([]);
    expect(stamped).toEqual([]);
  });

  /**
   * AUTHORING, THROUGH THE WIKI. `round-trip` proves canon stays canon over files already canonical
   * when they landed. This proves a HAND-AUTHORED file BECOMES canon — the shape an operator writes in
   * an editor, the shape a render surface hands the projector, the shape an older session emits.
   */
  test("every shape an operator writes mints a schema-correct carrier, and settles", () => {
    const URI = "lar:///ha.ka.ba/lares/docs/authoring-probe";
    const META = ['```toml meta', 'uri-path = "ha.ka.ba/lares/docs/authoring-probe"',
      `type     = "${CARRIER_TYPE}"`, "```"].join("\n");
    const META_NS = META.replace("type     =", 'namespace = "⊙"\ntype     =');
    const BODY = "! A New Thought\n\nThe operator writes a file and saves it.\n";
    const SLOT = ["<<~ ahu #inner >>", "", "```toml meta", 'register = "Provisional"', "```", "",
      "! Inner", "", "slot prose.", "", "<<~/ahu >>"].join("\n");
    const SHAPES: Array<[string, string, string]> = [
      ["bare prose, no frame and no meta", BODY, ""],
      ["meta only — identity without framing", `${META}\n\n${BODY}`, ""],
      ["meta declaring a namespace, unframed", `${META_NS}\n\n${BODY}`, "⊙"],
      ["a frame from before the named params",
        `<<^ ⊙&#x0001; ? -> ${URI} >>\n${META_NS}\n<<^ &#x0002; >>\n\n${BODY}\n<<^ &#x0003; >>\n\n<<^ &#x0004; -> ? >>\n`, "⊙"],
      ["an ahu slot carrying its own meta", `${META_NS}\n\n${BODY}\n${SLOT}\n`, "⊙"],
    ];
    const project = (src: string) => {
      const records = deserializeFromSource(src, URI);
      const by = new Map(records.map((r) => [r["title"] as string, r]));
      return { records, by, out: expandMemeRefs((u: string) => (by.get(u) ?? null) as never, URI) };
    };
    const faults: string[] = [];
    for (const [name, src, wantNs] of SHAPES) {
      const first = project(src);
      if (!first.out) { faults.push(`${name}: projected to nothing`); continue; }
      const head = first.out.split("\n");
      if (!/^<<!DOCTYPE memetic-wikitext\+tiddlywiki lar:\/\/\/\S+ >>$/.test(head[0] ?? "")) faults.push(`${name}: no declaration`);
      if (!/^<<\^ code="&#x(?:0001|0011);"[^>\n]*?\? -> \S+ >>/m.test(first.out)) faults.push(`${name}: SOH states no bearing`);
      for (const [claim, mark] of [["STX", "0002"], ["ETX", "0003"]] as const) {
        if (!first.out.includes(`<<^ code="&#x${mark};" >>`)) faults.push(`${name}: no ${claim}`);
      }
      if (!/^<<\^ code="&#x(?:0004|0014);"[^>\n]*?-> \? >>/m.test(first.out)) faults.push(`${name}: EOT releases nothing`);
      const gotNs = /^<<\^ code="&#x(?:0001|0011);" namespace="([^"]*)"/m.exec(first.out)?.[1] ?? "";
      if (gotNs !== wantNs) faults.push(`${name}: namespace "${gotNs}" where the meta declares "${wantNs}"`);
      const second = project(first.out);
      if (second.out !== first.out) faults.push(`${name}: projecting the projection changed it`);
    }
    expect(faults).toEqual([]);
  });

  test("a name that binds no procedure renders as its own text — the gradient's floor", () => {
    // The chat register stands 545 times in the corpus and no procedure binds `confidence`. The wiki
    // MUST leave it as text: a transcript that resolved what it quotes would lie about what was said.
    const tree = engine.$tw.wiki.parseText(CARRIER_TYPE, "<<~ confidence Canon 18/20 >>") as { tree: unknown[] };
    const flat = JSON.stringify(tree.tree);
    expect(flat).toContain("confidence");
    expect(flat).not.toContain("$:/plugins/lares/confidence");
  });

  /**
   * THE FLOOR, AND NOTHING BELOW IT.
   *
   * TiddlyWiki restricts no field name, and MultiWikiServer restricts exactly two — its resolver reads
   * `fields: { ...fields, title, revision: revision.toString() }`, overwriting those and leaving every
   * other name the author wrote untouched. `bag_id`, `created` and `updated` are COLUMNS beside the
   * field map, never injected into it.
   *
   * So this grammar restricts the same two, and asks one thing of everything else: SURVIVE AN EDIT.
   *
   * A field that is visible and cannot round-trip is a field the operator can change and lose — on
   * another machine, later, with nobody at the keyboard, because the browser authors and a different
   * vessel projects. There is no second class of field that "should not be visible": a fact the machine
   * derives simply is not written onto the record, and an author who later writes that name gets an
   * ordinary custom field like any other.
   */
  test("every field the parse produces survives an edit, but the two the host owns", () => {
    // `type` joins them for the same reason `title` does: the host reads it to CHOOSE a deserializer,
    // in this grammar exactly as in TiddlyWiki's own filetype registry, and never stores it in the bytes
    // — a carrier IS its type, so the value is re-derived on every read rather than carried.
    const HOST_OWNED = new Set(["title", "revision", "type"]);
    // `$…` NAMES THE HOST'S SHELF, NOT THE OPERATOR'S. TiddlyWiki hands that prefix to whatever stands
    // the wiki, so the grammar's own carriage lives there — the prologue, the preamble, the header
    // text, the slot a fragment fills, the bytes trailing the frame. Those rebuild from the frame on
    // every recompose and never reach the meta, which is what keeps `postamble` and `slot` available to
    // an author as ordinary custom fields.
    const isCarriage = (k: string) => k.charAt(0) === "$";
    const carrier = readFileSync(path.join(REPO, "bags/lares/ha.ka.ba/lares/api/pono/ahu.mem"), "utf8");
    const uri = `lar:///${/^uri-path\s*=\s*"([^"]+)"/m.exec(carrier)![1]!}`;
    const base = deserializeFromSource(carrier, uri);
    const produced = [...new Set(base.flatMap((r) => Object.keys(r)))].filter((k) => !HOST_OWNED.has(k) && !isCarriage(k));

    const lost: string[] = [];
    for (const key of produced) {
      const records = base.map((r) => ({ ...r }));
      const target  = records.find((r) => r[key] !== undefined) ?? records[0]!;
      const edited  = key === "text" ? `${String(target[key] ?? "")}\nEDITED` : `EDITED-${key}`;
      target[key] = edited;
      const by  = new Map(records.map((r) => [r["title"] as string, r]));
      const out = expandMemeRefs((u: string) => (by.get(u) ?? null) as never, uri);
      if (out === null) { lost.push(`${key}: projected to nothing`); continue; }
      const back = deserializeFromSource(out, uri);
      const got  = String((back.find((r) => r["title"] === target["title"]) ?? back[0])?.[key] ?? "");
      const survived = key === "text" ? got.includes("EDITED") : got === edited;
      if (!survived) lost.push(key);
    }
    expect(lost).toEqual([]);
  });

  /**
   * THE META BLOCK, COMPARED RAW.
   *
   * The corpus round-trip above masks the meta before comparing, and the sibling suite normalizes
   * through its own view, so every proof this repo holds about a carrier surviving projection is a
   * proof about its BODY. Nothing has ever compared a `.mem`'s declaration bytes to what the emitter
   * would write in their place.
   *
   * That matters because the projector writes through `exportCarrierFile`. Any difference between the
   * emitter's block and a carrier's own — key order, the `=` column, an omitted empty, a key inherited
   * from a parent — lands as a rewrite on the first sync of a live wiki, silently and corpus-wide.
   *
   * The canonical form states seven laws for this block. This is what asks whether the corpus keeps
   * them.
   */
  // A corpus-wide walk over 600+ carriers — its cost scales with the corpus and with machine load
  // (a parallel build once pushed it past the 5s default and flaked a green law red). The budget says
  // what the test is: thorough, never fast.
  test("a carrier's meta block already reads as the emitter would write it", { timeout: 30_000 }, () => {
    const carriers = execSync("git ls-files 'bags/**/*.mem'", { encoding: "utf8", cwd: REPO })
      .split("\n").filter(Boolean);
    const metaOf = (t: string) => /```toml meta\n([\s\S]*?)\n```/.exec(t)?.[1] ?? null;

    // WHAT `guarantee 2` FORGIVES, AND WHAT IT DOES NOT.
    //
    // `meme-roundtrip` licenses the meta's FRAMING to normalize: key order, the `=` column, the blank
    // lines around the fence. It licenses nothing about which keys stand or what they carry. So the
    // comparison runs twice — once over the raw block, once over the block read as a key-value set —
    // and the difference between those two counts sorts a rewrite from a loss.
    // READ AS DATA, NEVER AS LINES. A line-wise reading forgives whatever it cannot see: a multi-line
    // array whose elements merely re-indent hashes the same, and one whose elements REORDER hashes
    // differently only by accident of which line each fell on. The grammar already stands a TOML reader,
    // so the parity gate asks it rather than approximating it, and a value's TYPE carries into the
    // comparison the way it carries into a tiddler field.
    const asData = (block: string) => {
      const fields = parseTaploFields(block);
      return JSON.stringify(Object.keys(fields).sort().map((k) => [k, fields[k]]));
    };

    const layout: string[] = [], content: string[] = [];
    for (const f of carriers) {
      const disk = readFileSync(path.join(REPO, f), "utf8");
      const uri = /^uri-path\s*=\s*"([^"]+)"/m.exec(disk)?.[1];
      if (!uri) continue;
      const title = `lar:///${uri}`;
      const records = deserializeFromSource(disk, title);
      if (records.length === 0) continue;
      const by = new Map(records.map((r) => [r["title"] as string, r]));
      const rendered = expandMemeRefs((u: string) => (by.get(u) ?? null) as never, title);
      if (rendered === null) continue;
      const a = metaOf(disk), b = metaOf(rendered);
      if (a === null || b === null || a === b) continue;
      (asData(a) === asData(b) ? layout : content).push(f);
    }
    expect(carriers.length).toBeGreaterThan(500);
    // Layout drift is a rewrite the operator sees once. CONTENT drift is a key or a value the
    // projection would silently change, and no license covers it.
    expect(content, `${content.length} carriers whose meta CONTENT the projector would change ` +
      `(a further ${layout.length} differ in layout alone, which guarantee 2 licenses)`).toEqual([]);
  });
});

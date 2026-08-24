/**
 * child-name-blocks — the operator's names, at the grain where a fragment declares them.
 *
 * A carrier's own iam block is compared corpus-wide; a CHILD's is not, and cannot be: the emitter
 * writes a child block only where the child DIFFERS from its parent, and no carrier on disk currently
 * does. Every real child block this grammar will ever write gets written for the first time in a live
 * wiki, so the laws that govern it hold here or nowhere.
 *
 * Two laws meet on a fragment:
 *
 *   · `CHILD_IAM_DENY` extends `IAM_DENY` with the two DERIVED coordinates (`uri-path`, `file-path`) —
 *     a fragment's address follows from its parent and its slot, so re-stating it invites the two to
 *     disagree.
 *   · the grammar's carriage rides `$…`, which means an author may name a field `postamble` or `slot`
 *     on a fragment exactly as on a carrier. That freedom is worth a gate: the names were reserved for
 *     long enough that a future reader could re-reserve one without noticing what it costs.
 *
 * The iam-parity gate reads only the FIRST block in a file, so nothing below the parent's declaration
 * has ever been measured. This is that measurement, taken where the blocks actually exist.
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/memetic-wikitext
 */

import { describe, expect, test } from "vitest";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

import { expandMemeRefs, memeticWikitextDeserializer, type TiddlerFields } from "../src/deserializer.js";
import { parseTaploFields } from "../src/toml-ast.js";
import { fencedSpans, inMask } from "../src/meme-ast/fence-mask.js";
import { CARRIER_TYPE } from "@lararium/mesh/carrier-type";
import { REPO } from "./test-wiki.js";

const ROOT = "lar:///ha.ka.ba/x/child-names";
const KID  = `${ROOT}#kid`;

const reader = (map: Record<string, TiddlerFields>) => (t: string): TiddlerFields | undefined => map[t];
const project = (map: Record<string, TiddlerFields>) => expandMemeRefs(reader(map), ROOT)!;
const parse = (text: string) =>
  memeticWikitextDeserializer.call({ wiki: {} } as never, text, { title: ROOT }, CARRIER_TYPE) as TiddlerFields[];

/**
 * The child's iam block, located by REGION rather than by adjacency.
 *
 * A fragment's iam sits flush against its ahu sigil — except where the fragment carries a preamble,
 * which precedes it and restores the sigil-then-blank spacing. A reader keyed to the flush form finds
 * nothing on exactly the fragments that carry the most structure, and a test filtering an empty block
 * passes for the wrong reason. Measured: it did, and let a dropped `$` rule through.
 *
 * Null where the fragment declares nothing — a distinct fact from a block that declares badly.
 */
function childIamBlock(out: string): string | null {
  const start = out.indexOf("<<~ ahu #kid >>");
  if (start < 0) return null;
  const end = out.indexOf("<<~/ahu >>", start);
  const region = out.slice(start, end < 0 ? undefined : end);
  const m = /```toml iam\n([\s\S]*?)\n```/.exec(region);
  return m ? m[1]! : null;
}

/** The child's declaration as data — layout carries no meaning here. */
function childIam(out: string): TiddlerFields {
  const block = childIamBlock(out);
  return block === null ? {} : parseTaploFields(block);
}

const parent: TiddlerFields = {
  title: ROOT, type: CARRIER_TYPE, namespace: "ns", text: "<<~ kahea ahu #kid >>",
};

describe("child name blocks — what a fragment may declare", () => {
  /**
   * THE NAMES CAME BACK, AND A FRAGMENT HOLDS THEM TOO.
   *
   * TiddlyWiki restricts no field name; MultiWikiServer restricts two. The grammar's structure moved
   * to `$…` so these words belong to the author again — and an author writes fragments, not only
   * carriers. A denial re-introduced one level down would be invisible to every carrier-grain gate.
   */
  test("a name the grammar once reserved survives as an authored field on a child", () => {
    const authored = ["postamble", "prologue", "preamble", "header-text", "slot", "fragment-parent"];
    const kid: TiddlerFields = { title: KID, type: CARRIER_TYPE, text: "kid body" };
    for (const k of authored) kid[k] = `AUTHORED-${k}`;

    const out = project({ [ROOT]: parent, [KID]: kid });
    const declared = childIam(out);
    const missing = authored.filter((k) => declared[k] !== `AUTHORED-${k}`);
    expect(missing, `a fragment lost authored field(s) the host does not reserve`).toEqual([]);

    // And they survive the trip back — a field that renders but cannot be read again reads as loss
    // deferred, not loss avoided.
    const back = parse(out).find((r) => r["title"] === KID)!;
    expect(authored.filter((k) => back[k] !== `AUTHORED-${k}`)).toEqual([]);
  });

  /**
   * THE CARRIAGE STAYS OFF THE OPERATOR'S TOML, ON A CHILD AS ON A CARRIER.
   *
   * `emitIamToml` drops `$…` for every block it writes, parent and fragment alike. This states that as
   * a law rather than an implementation detail: the child block is assembled through a second deny-set,
   * and a future edit could hold the `$` rule in one and forget it in the other.
   */
  test("the grammar's own carriage never appears in a child's iam block", () => {
    const kid: TiddlerFields = {
      title: KID, type: CARRIER_TYPE, text: "kid body",
      "$preamble": "leading fragment prose\n", "$postamble": "trailing fragment prose\n",
      "$slot": "#kid", "$fragment-parent": ROOT, "$carrier-soh": "0011",
      register: "Synthesis",
    };
    const out = project({ [ROOT]: parent, [KID]: kid });
    // The fragment declares one ordinary field, so a block MUST stand — without it the filter below
    // would read an absent block as a clean one.
    const block = childIamBlock(out);
    // The fragment declares one ordinary field, so a block MUST stand — without it the check below
    // would read an absent block as a clean one.
    expect(block, "the fragment declared nothing; the check below would pass vacuously").not.toBeNull();
    // READ THE RAW LINES, NEVER THE PARSED KEYS. `$` cannot open a TOML bare key, so a lapsed rule
    // emits a block the reader cannot parse — and a check over parsed keys then reads that unparseable
    // block as a clean one. Measured: it did, and passed while the rule was removed. The exclusion
    // carries the operator's names AND the block's validity; both fail on the same line.
    expect(block!.split("\n").filter((l) => l.trimStart().startsWith("$")), "carriage in a child block")
      .toEqual([]);

    // The carriage still DOES its work — it rebuilds as structure, which is the whole reason it stopped
    // being a field the operator can see.
    expect(out).toContain("leading fragment prose");
    expect(out).toContain("trailing fragment prose");
  });

  /**
   * A FRAGMENT'S ADDRESS FOLLOWS FROM ITS PARENT, so re-stating it invites the two to disagree. This
   * repeats `child-iam-inheritance`'s guard on purpose: that suite proves the rule over one field pair,
   * and this one holds it beside the freedom above, where a careless widening would land.
   */
  test("the derived coordinates stay off a child even when the child carries them", () => {
    const kid: TiddlerFields = {
      title: KID, type: CARRIER_TYPE, text: "kid body",
      "uri-path": "ha.ka.ba/x/child-names#kid", "file-path": "bags/x/kid.mem",
    };
    const declared = childIam(project({ [ROOT]: parent, [KID]: kid }));
    expect(declared["uri-path"]).toBeUndefined();
    expect(declared["file-path"]).toBeUndefined();
  });

  /**
   * PARENT AND CHILD MAY HOLD ONE NAME WITH TWO VALUES. The parent-diff writes a child field only where
   * it differs — which is exactly what makes a shared authored name safe rather than ambiguous.
   */
  test("a name held by both parent and child re-emits on the child only where the values part", () => {
    const p: TiddlerFields = { ...parent, postamble: "SHARED", register: "Canon" };
    const same = childIam(project({ [ROOT]: p, [KID]: { title: KID, type: CARRIER_TYPE, text: "b", postamble: "SHARED" } }));
    expect(same["postamble"], "an inherited-and-matching value re-stamped on the fragment").toBeUndefined();

    const differs = childIam(project({ [ROOT]: p, [KID]: { title: KID, type: CARRIER_TYPE, text: "b", postamble: "OWN" } }));
    expect(differs["postamble"]).toBe("OWN");
  });

  /**
   * THE CORPUS, THROUGH THE FENCE MASK. The parity gate reads a carrier's FIRST iam block; six carriers
   * hold a second, and every one of those sits inside a quote fence as a teaching example. So this asks
   * the one question that survives masking: no block a carrier really declares names the carriage.
   *
   * Read unmasked, this would fail on documents that teach the grammar — the fault that once had a
   * reader verifying a block check written inside an example.
   */
  test("no iam block any carrier declares carries a `$` name", () => {
    const carriers = execSync("git ls-files 'bags/**/*.mem'", { encoding: "utf8", cwd: REPO })
      .split("\n").filter(Boolean);
    const offenders: string[] = [];
    for (const f of carriers) {
      const text = readFileSync(path.join(REPO, f), "utf8");
      const spans = fencedSpans(text);
      for (const m of text.matchAll(/```toml iam\n([\s\S]*?)\n```/g)) {
        if (inMask(m.index!, spans)) continue;
        const bad = Object.keys(parseTaploFields(m[1]!)).filter((k) => k.startsWith("$"));
        if (bad.length) offenders.push(`${f}: ${bad.join(" ")}`);
      }
    }
    expect(carriers.length).toBeGreaterThan(500);
    expect(offenders).toEqual([]);
  });

  /**
   * A FRAGMENT'S TRAILING BYTES RIDE POSITION, NOT A FIELD — and the round trip is whole in bytes
   * while lossy in fields, deliberately.
   *
   * The frame carries no mark inside an ahu block for "the body ended here", so the parse derives
   * `$postamble` as the bytes that follow a fragment's last inner ref, and the emitter puts them back
   * flush — faithful, because that is exactly where they stood. Re-read, they fold into `text` and the
   * field is gone; the bytes are all still there and the projection settles.
   *
   * This is pinned because the flush concatenation LOOKS like a missing separator on a hand-authored
   * record, where body and trailing prose never stood adjacent. Inserting one here would move real
   * carriers, and reserving a field for the boundary would put a derived fact back on the record.
   */
  test("a fragment's trailing bytes survive whole and fold into the body, and the projection settles", () => {
    const kid: TiddlerFields = { title: KID, type: CARRIER_TYPE, text: "kid body", "$postamble": "TRAILING" };
    const out = project({ [ROOT]: parent, [KID]: kid });
    const back = parse(out);
    const readKid = back.find((r) => r["title"] === KID)!;

    expect(String(readKid["text"])).toContain("TRAILING");
    expect(readKid["$postamble"], "the boundary is position, so no field survives to re-state it").toBeUndefined();

    const again = expandMemeRefs(reader(Object.fromEntries(back.map((r) => [String(r["title"]), r]))), ROOT)!;
    expect(again, "the fold must reach a fixed point on the first cycle, never keep folding").toBe(out);
  });

});

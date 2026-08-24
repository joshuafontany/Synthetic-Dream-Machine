/**
 * meme-corpus-roundtrip — the round-trip law swept across the WHOLE live
 * lares corpus, not just the boot meme. Born 2026-06-11 after the live
 * feed found what the single-carrier suite could not: fence-teaching docs
 * whose ambiguous fences masked their own closers (unbounded closer-doubling
 * per cycle), the Kapu SOH variant, plain-toml content swallowing.
 *
 * Three assertions per carrier (the lens laws, Foster–Pierce lineage —
 * parse/render as a bidirectional lens, these as its round-trip laws):
 *   1. single closer — the render emits exactly one ETX (doubling = the
 *      masked-closer degraded state; the shore also warns on it now);
 *   2. idempotent — render(parse(render(x))) === render(x);
 *   3. content-whole — outside iam framing, blank-line margins, and the
 *      law-mandated sigil normalizations (spacing; STX/ETX insertion per
 *      the glyph-ward ruling), every byte survives.
 *
 * Corpus files stay non-canonical at rest until a deliberate normalization
 * commit — so assertion 3 tolerates exactly the framing classes the
 * canonical-form law names, nothing more.
 */

import { describe, test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";
import {
  memeticWikitextDeserializer,
  expandMemeRefs,
  maskedExecAll,
  type TiddlerFields,
} from "../src/deserializer.js";

const REPO_ROOT = new URL("../../..", import.meta.url).pathname;
const CORPUS = join(REPO_ROOT, "bags/lares/ha.ka.ba/lares");

const IAM_FENCE_RE = /```toml iam\n[\s\S]*?```\n/g;
const contentView = (s: string) => s.replace(IAM_FENCE_RE, "IAM\n");
const squeeze = (s: string) =>
  s.replace(/\n{2,}/g, "\n").replace(/[ \t]+$/gm, "").replace(/\n+$/g, "\n");
/** Law-mandated normalizations the render MAY apply (glyph-ward ruling). */
const sigilNorm = (s: string) => s
  .replace(/<<~\s*/g, "<<~ ").replace(/\s*>>/g, " >>")
  .replace(/<<\^ code:"&#x(0001|0011);"[^>\n]*?( \?)/g, '<<^ code:"&#x$1;"$2')  // the namespace re-homes (framing)
  .replace(/<<\^ code:"&#x0002;" >>\n*/g, "").replace(/<<\^ code:"&#x0003;" >>[^\n]*\n*/g, "")
  .replace(/<<\^ code:"&#x0004;"[^\n]*>>\n*/g, "");
const lawView = (s: string) => squeeze(sigilNorm(contentView(s)));

function carriers(): Array<{ rel: string; src: string; uri: string }> {
  const files = execSync(`find ${CORPUS} -name '*.mem'`, { encoding: "utf8" }).trim().split("\n");
  const out: Array<{ rel: string; src: string; uri: string }> = [];
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    const sohs = maskedExecAll(src, /<<\^[^&\n]*&#x(?:0001|0011);[^>\n]*?\? -> (\S+) >>/g);
    if (sohs.length !== 1) continue;   // multi-meme carriers ride their own law
    out.push({ rel: f.slice(CORPUS.length + 1), src, uri: sohs[0]![1]! });
  }
  return out;
}

describe("corpus round-trip — the lens laws over every @lares carrier", () => {
  const all = carriers();

  test("the corpus presents carriers", () => {
    expect(all.length).toBeGreaterThan(150);
  });

  test("every carrier: single closer · idempotent · content-whole", () => {
    const failures: string[] = [];
    for (const { rel, src, uri } of all) {
      const records = memeticWikitextDeserializer(src, { title: uri });
      const map = new Map(records.map((r) => [String(r.title), r] as const));
      const reader = (t: string): TiddlerFields | undefined => map.get(t);
      const out = expandMemeRefs(reader, uri);
      if (out === null) { failures.push(`${rel}: render null`); continue; }

      // Quoted closer MENTIONS stay content — count only unmasked closers.
      const closers = maskedExecAll(out, /&#x0003;/g).length;
      if (closers !== 1) { failures.push(`${rel}: ${closers} closers (doubling)`); continue; }

      if (lawView(out) !== lawView(src)) { failures.push(`${rel}: content drift`); continue; }

      const records2 = memeticWikitextDeserializer(out, { title: uri });
      const map2 = new Map(records2.map((r) => [String(r.title), r] as const));
      const out2 = expandMemeRefs((t) => map2.get(t), uri);
      if (out2 !== out) { failures.push(`${rel}: not idempotent`); continue; }
    }
    expect(failures, failures.join("\n")).toEqual([]);
  });
});

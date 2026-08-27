/**
 * ahu-sections-address — every named `ahu` section becomes an addressable tiddler.
 *
 * A meme splits into one tiddler per `<<~ ahu #name >>` child, and the section's address
 * (`lar:///<uri-path>#name`) resolves to that tiddler. That is the whole premise of a fragment in a
 * `lar:` URI: the name points at a thing.
 *
 * NO OTHER INSTRUMENT SEES THIS. The block check verifies bytes and passes; round-trip verifies that a
 * carrier re-renders to what the wiki parsed and passes; the frame witness checks that marks are
 * declared and passes. All three stay green on a carrier whose sections collapsed into its root — the
 * bytes are intact, the render is faithful, and the names point at nothing.
 *
 * The two tests below split the fault by cause:
 *
 *   ① EVERY OPEN CLOSES.        A `<<~ ahu #x >>` with no `<<~/ahu >>` swallows the sections that
 *                               follow it, so they never open a tiddler of their own.
 *
 *                               A NESTED section is not that fault. Nesting is deliberate house
 *                               structure — an OODA-HA phase carries its ha/ka/ba triple — and it
 *                               addresses under a ROOTED path, `#/observe/observe-ha`. ② reads
 *                               the LEAF, so a nest passes and a swallowed section fails.
 *   ② EVERY OPEN ADDRESSES.     The stronger claim, and the one that catches the rest: whatever the
 *                               cause, an opened section resolves to a tiddler.
 *
 * ① is a subset of ②'s failures. Both run because a balance fault and an addressing fault want
 * different repairs, and a single red would hide which one a carrier has.
 */
import { describe, test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import { memeticWikitextDeserializer } from "../src/deserializer.js";

const REPO = new URL("../../..", import.meta.url).pathname;

/**
 * THE LIVE CORPUS. `lares-history/` holds research logs nobody addresses — they are kept as they were
 * written, and two of them carry structures this law would rewrite rather than repair: a `#meta`
 * section opening directly under STX with a lone toml fence, read as a second meta block; and a
 * `#body-close` buried in a template whose nesting predates the law. Gating the live corpus states
 * what the house holds itself to without editing its own record.
 */
const carriers = (): string[] =>
  execSync("git ls-files 'bags/**/*.mem'", { encoding: "utf8", cwd: REPO })
    .split("\n").filter(Boolean).filter((f) => !f.startsWith("bags/lares-history/"));

/** Section opens and closes, counted outside fenced blocks — a fence carries examples, never structure. */
function frame(text: string): { opens: string[]; closes: number } {
  const opens: string[] = [];
  let closes = 0, fenced = false;
  for (const line of text.split("\n")) {
    if (line.startsWith("```")) { fenced = !fenced; continue; }
    if (fenced) continue;
    const open = /^<<~ ahu #([a-z0-9-]+)/.exec(line);
    if (open) opens.push(open[1]!);
    if (/^<<~\/ahu/.test(line)) closes += 1;
  }
  return { opens, closes };
}

/** The section names the wiki actually addresses, read from the split the deserialiser performs. */
function addressed(file: string, disk: string): Set<string> | null {
  const uri = /^uri-path\s*=\s*"([^"]+)"/m.exec(disk)?.[1];
  if (!uri) return null;
  let records: Array<Record<string, unknown>>;
  try {
    records = memeticWikitextDeserializer(disk, { title: `lar:///${uri}` }, {} as never) as Array<Record<string, unknown>>;
  } catch {
    return null;
  }
  const out = new Set<string>();
  for (const r of records) {
    // A NESTED SECTION ADDRESSES UNDER A COMPOUND FRAGMENT — `#parent/child`. The leaf is the name
    // the `<<~ ahu #child >>` open wrote, so the leaf is what an open must be found under.
    const frag = /#\/?([a-z0-9-]+(?:\/[a-z0-9-]+)*)$/i.exec(String(r["title"] ?? ""));
    if (frag) { const leaf = frag[1]!.split("/").pop()!; if (!leaf.startsWith("$")) out.add(leaf); }
  }
  return out;
}

describe("★ every named ahu section addresses ★", () => {
  test("① every ahu open carries a close", () => {
    const drift: string[] = [];
    for (const f of carriers()) {
      const { opens, closes } = frame(readFileSync(path.join(REPO, f), "utf8"));
      if (opens.length !== closes) drift.push(`${f}: ${opens.length} open, ${closes} close`);
    }
    expect(drift).toEqual([]);
  });

  test("② every ahu open resolves to a tiddler", () => {
    const drift: string[] = [];
    for (const f of carriers()) {
      const disk = readFileSync(path.join(REPO, f), "utf8");
      const { opens } = frame(disk);
      if (opens.length === 0) continue;
      const have = addressed(f, disk);
      if (have === null) continue;
      const lost = opens.filter((n) => !have.has(n));
      if (lost.length) drift.push(`${f}: ${lost.length} unaddressable — ${lost.slice(0, 4).join(" ")}`);
    }
    expect(drift).toEqual([]);
  });
});

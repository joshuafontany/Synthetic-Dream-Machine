/**
 * A meme's status flag says what its own prose already says, or it says nothing at all.
 *
 * WHY THIS GUARD EXISTS. Twelve implementation memes carried one flag — "proposed" — across states that
 * differ completely: a design ledger with no code, a core built and revert-verified with one shore left
 * unlit, and a rite a person ENACTS where "built" is not a question that applies. The prose in each was
 * precise; the field had gone flat, so a reader scanning flags learned nothing and a reader trusting them
 * learned wrong.
 *
 * THREE STATES, DERIVED RATHER THAN IMPOSED — each read off what those twelve said about themselves:
 *   · designed — a ruling or design stands; no code stands behind it
 *   · standing — a substrate or core is built and live; any unlit shore is named in the meme's own prose
 *   · rite     — a procedure a person enacts, where build-state is not a property it could have
 *
 * AND EVERY FLAG CARRIES ITS REASON. `status-why` sits beside it so the field cannot drift from the prose
 * again without the drift being visible — a flag alone is exactly what went flat the first time.
 *
 * WHAT THIS GUARD DELIBERATELY DOES NOT ASSERT, AND WHY. Writing it surfaced that the field was never
 * flat so much as FRAGMENTED: seven further words already ride it across this bag — approved, canon,
 * draft, working-draft, enacting, active. Those authors chose their words, possibly for reasons the
 * three above cannot carry, and a guard that forced them into a taxonomy derived from twelve OTHER memes
 * would impose rather than describe. So this asserts only what it can defend: the one word three states
 * were wearing has gone, and any meme declaring one of the three carries its reason. The wider vocabulary
 * stands reported as a question rather than closed by a test.
 *
 * SCOPE: the `@lararium` implementation bag. The `@lares` pono canon carries `proposed` too and may mean
 * ratification rather than build-state by it — so this does not reach there. Naming a boundary beats
 * sweeping past one.
 */
import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const REPO = resolve(__dirname, "../../..");
const STATES = ["designed", "standing", "rite"] as const;

function lararumMemes(): string[] {
  const out = execFileSync("git", ["ls-files", "bags/@lararium"], {
    cwd: REPO, encoding: "utf8", maxBuffer: 16 * 1024 * 1024,
  });
  return out.split("\n").filter((f) => f.endsWith(".mem"));
}

function statusOf(src: string): { state?: string; why?: string } {
  return {
    state: /^status\s*=\s*"([^"]*)"/m.exec(src)?.[1],
    why: /^status-why\s*=\s*"([^"]*)"/m.exec(src)?.[1],
  };
}

describe("the status flag carries a state that differs, and its reason", () => {
  const files = lararumMemes();

  test("the walk finds memes to check", () => {
    expect(files.length).toBeGreaterThan(50);
  });

  test("no meme still wears the flat flag", () => {
    const flat: string[] = [];
    for (const rel of files) {
      let src: string;
      try { src = readFileSync(resolve(REPO, rel), "utf8"); } catch { continue; }
      if (statusOf(src).state === "proposed") flat.push(rel);
    }
    expect(flat, `these still read "proposed", a word three different states were wearing:\n  ${flat.join("\n  ")}`)
      .toEqual([]);
  });

  test("a meme declaring one of the three carries its reason beside it", () => {
    const bare: string[] = [];
    let declared = 0;
    for (const rel of files) {
      let src: string;
      try { src = readFileSync(resolve(REPO, rel), "utf8"); } catch { continue; }
      const { state, why } = statusOf(src);
      if (!state || !(STATES as readonly string[]).includes(state)) continue;
      declared++;
      if (!why || why.length < 8) bare.push(`${rel} → state "${state}" with no reason beside it`);
    }
    expect(bare, `\n  ${bare.join("\n  ")}`).toEqual([]);
    // An empty walk would pass vacuously — the same silence the flag itself fell into.
    expect(declared).toBeGreaterThan(8);
  });

  test("the wider vocabulary stands REPORTED, never silently closed", () => {
    // A test asserting one closed vocabulary would have quietly erased six other words their authors
    // chose. Counting them instead keeps the question visible until someone rules on it.
    const census = new Map<string, number>();
    for (const rel of files) {
      let src: string;
      try { src = readFileSync(resolve(REPO, rel), "utf8"); } catch { continue; }
      const { state } = statusOf(src);
      if (state) census.set(state, (census.get(state) ?? 0) + 1);
    }
    const others = [...census].filter(([k]) => !(STATES as readonly string[]).includes(k));
    if (others.length) {
      console.log(`\n[meme-status] words beyond the three, awaiting a ruling: ` +
        others.map(([k, n]) => `${k}×${n}`).join(" · "));
    }
    expect(census.size).toBeGreaterThan(0);
  });
});

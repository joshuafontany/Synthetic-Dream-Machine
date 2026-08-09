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
 * NINE WORDS COLLAPSED TO THREE, AND THE COLLAPSE IS THE POINT. Writing this guard surfaced that the
 * field was never flat so much as FRAGMENTED — approved, canon, draft, working-draft, enacting, active
 * and proposed all rode it, drifted in independently, and answered different questions at once:
 * has-it-been-ratified, how-finished-is-the-writing, is-something-in-motion. A reader had to know which
 * question a given word was answering before the answer meant anything.
 *
 * One axis now, the one a reader actually needs: WHAT MAY I RELY ON HERE. And every flag carries its
 * REASON beside it, so a wrong call stays findable rather than laundered into a bare word.
 *
 * SCOPE: the whole memegraph, both bags. The pono canon and the implementation bag answer the same
 * question about their own subjects, so they answer it in the same words.
 */
import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const REPO = resolve(__dirname, "../../..");
const STATES = ["designed", "standing", "rite"] as const;

function memegraph(): string[] {
  const out = execFileSync("git", ["ls-files", "bags"], {
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
  const files = memegraph();

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

  test("the vocabulary stays closed — a tenth word cannot drift back in", () => {
    // Nine words drifted in one at a time, each reasonable alone. This is what stops the tenth.
    const strays: string[] = [];
    const census = new Map<string, number>();
    for (const rel of files) {
      let src: string;
      try { src = readFileSync(resolve(REPO, rel), "utf8"); } catch { continue; }
      const { state } = statusOf(src);
      if (!state) continue;
      census.set(state, (census.get(state) ?? 0) + 1);
      if (!(STATES as readonly string[]).includes(state)) strays.push(`${rel} → "${state}"`);
    }
    expect(strays, `a word outside the three drifted in:\n  ${strays.join("\n  ")}`).toEqual([]);
    console.log(`\n[meme-status] ` + [...census].map(([k, n]) => `${k}×${n}`).join(" · "));
  });
});

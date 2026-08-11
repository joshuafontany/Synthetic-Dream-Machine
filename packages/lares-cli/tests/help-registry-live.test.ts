/**
 * THE HELP REGISTRY NAMES ONLY COMMANDS THAT EXIST.
 *
 * The registry is SPARSE by design — a command without an entry renders its dispatch summary — so a
 * missing entry is legal and silent. The reverse is not: an entry for a command nobody can run reaches
 * no reader, contradicts nothing, and fails no build. It simply rots, and the surface it describes is
 * the one an operator would have trusted.
 *
 * The vessel collapse left exactly two behind (`status`, `wake`), which is how this test came to exist.
 */
import { describe, test, expect } from "vitest";
import { COMMAND_HELP } from "../src/command-help.js";
import { COMMAND_NAMES } from "../src/bin/lares.js";

describe("the per-command help registry", () => {
  test("★ every entry names a command that answers ★", () => {
    const live = new Set(COMMAND_NAMES);
    const orphans = Object.keys(COMMAND_HELP).filter((k) => !live.has(k));
    expect(orphans).toEqual([]);
  });

  test("the registry stays SPARSE — a missing entry is legal, and this test never demands one", () => {
    // Stated so nobody later "fixes" the asymmetry by requiring an entry per command: the dispatch
    // summary is the fallback, and forcing a second description per verb is how two of them drift apart.
    expect(Object.keys(COMMAND_HELP).length).toBeLessThan(COMMAND_NAMES.length);
  });
});

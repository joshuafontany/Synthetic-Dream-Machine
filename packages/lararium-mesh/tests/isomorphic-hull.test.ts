/**
 * isomorphic-hull.test.ts — the barrel carries NO platform.
 *
 * `@lararium/mesh` is the surface both vessels import. A browser vessel loads its whole module graph, so
 * one `export *` of a host module puts `node:fs` into that graph — and the import never has to RUN to do
 * the damage: it resolves at load, and the hull is breached there. The browser tier used to keep itself
 * whole with `fs`/`path` stubs, which is a patch at the symptom: the stub makes the breach pass its tests.
 *
 * This walks the barrel's TRANSITIVE re-export graph and fails if any module in it reaches for a platform
 * builtin. The host implementations live behind `@lararium/mesh/node`, which this deliberately does not
 * walk — that door exists to be used.
 *
 * A convention holds until someone adds a line. This holds because a test says so.
 */
import { describe, test, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), "../src");

/** Every `node:*` / bare-builtin import a browser has no answer for. */
const PLATFORM_IMPORT = /\bfrom\s+["'](node:[a-z_/]+|fs|path|os|crypto|child_process|worker_threads|net|http|https|stream|url|util|zlib|tty|dns|cluster|v8|vm|perf_hooks|readline|repl|tls|dgram|events|assert|buffer|process)["']/;

/** Relative re-exports/imports a module pulls in (`export * from "./x.js"`, `import … from "./x.js"`). */
function relativeDeps(source: string): string[] {
  const out: string[] = [];
  for (const m of source.matchAll(/(?:from|import)\s+["'](\.[^"']+)["']/g)) {
    const spec = m[1];
    if (spec) out.push(spec);
  }
  return out;
}

/** Resolve a `./x.js` specifier back to the `.ts` that emits it. */
function toSource(fromFile: string, spec: string): string | null {
  const base = join(dirname(fromFile), spec).replace(/\.js$/, "");
  for (const cand of [`${base}.ts`, join(base, "index.ts")]) {
    if (existsSync(cand)) return cand;
  }
  return null;   // a .d.ts-only or package specifier — not ours to walk
}

/** Walk the barrel's transitive graph, collecting every module that reaches for a platform builtin. */
function platformBreaches(entry: string): Array<{ file: string; line: string }> {
  const seen = new Set<string>();
  const breaches: Array<{ file: string; line: string }> = [];
  const stack = [entry];

  while (stack.length) {
    const file = stack.pop() as string;
    if (seen.has(file)) continue;
    seen.add(file);

    const src = readFileSync(file, "utf8");
    for (const raw of src.split("\n")) {
      // A commented mention names the law; only a real import breaks it.
      const line = raw.trim();
      if (line.startsWith("//") || line.startsWith("*")) continue;
      if (PLATFORM_IMPORT.test(line)) breaches.push({ file: file.slice(SRC.length + 1), line });
    }
    for (const spec of relativeDeps(src)) {
      const next = toSource(file, spec);
      if (next) stack.push(next);
    }
  }
  return breaches;
}

describe("the isomorphic hull — @lararium/mesh carries no platform", () => {
  test("the barrel's transitive graph reaches for no node builtin", () => {
    const breaches = platformBreaches(join(SRC, "index.ts"));
    expect(
      breaches.map((b) => `${b.file}: ${b.line}`),
      "a platform import reached the ISOMORPHIC barrel. The browser vessel loads this whole graph, so it " +
      "breaches at load, not at call. Move the module behind `@lararium/mesh/node` and export it there.",
    ).toEqual([]);
  });

  test("the host door still holds the host code — the seam exists to be used", () => {
    // Guards the opposite failure: someone 'fixes' the test above by emptying node.ts, and the platform
    // code silently loses its home. The four transcript adapters read transcripts off a disk; they belong
    // here and nowhere else.
    const breaches = platformBreaches(join(SRC, "node.ts"));
    expect(breaches.length).toBeGreaterThan(0);
  });
});

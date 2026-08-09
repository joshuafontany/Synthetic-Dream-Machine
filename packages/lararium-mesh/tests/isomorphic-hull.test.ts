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
 *
 * ── AND AN IMPORT IS NOT THE ONLY WAY THROUGH ──────────────────────────────────────────────────
 * The walk above follows imports, so it sees nothing a module reaches for WITHOUT importing. A bare
 * `process.env[...]` imports nothing, resolves to a global, and passes the graph walk untouched — which
 * is how `carriage-caps.ts` came to read an environment variable from a module the main barrel exports.
 * That one sits latent rather than live (the browser calls the sibling function ten lines below), and a
 * latent breach reads exactly like no breach until the day a caller moves.
 *
 * So the second guard scans the SAME derived module set for platform GLOBALS. Two ways in, two guards,
 * one walk — and neither reads from a list, because a list of files would drift from the barrel it names.
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

/**
 * Host globals a browser has no answer for, reached WITHOUT an import.
 *
 * `crypto` stays off this list deliberately — a browser holds `globalThis.crypto`, so a mesh module using
 * WebCrypto reads isomorphic rather than host-bound. `process`, `Buffer`, `__dirname` and `require` name
 * node alone; `window`, `document`, `localStorage` and `indexedDB` name the browser alone. A module in an
 * ISOMORPHIC barrel may reach for neither side.
 */
const PLATFORM_GLOBAL = /(?:^|[^.\w$])(process\.(?:env|cwd|platform|argv|exit|version)|Buffer\.|__dirname|__filename|require\(|window\.|document\.|localStorage\.|sessionStorage\.|indexedDB\.)/;

/** Every module the barrel reaches, derived by the same walk the import guard uses. */
function barrelModules(entry: string): string[] {
  const seen = new Set<string>();
  const stack = [entry];
  while (stack.length) {
    const file = stack.pop() as string;
    if (seen.has(file)) continue;
    seen.add(file);
    for (const spec of relativeDeps(readFileSync(file, "utf8"))) {
      const next = toSource(file, spec);
      if (next) stack.push(next);
    }
  }
  return [...seen];
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

  test("no module in that graph reaches a platform GLOBAL either", () => {
    // The import walk cannot see this class at all: a global resolves at runtime and imports nothing.
    const breaches: string[] = [];
    for (const file of barrelModules(join(SRC, "index.ts"))) {
      const src = readFileSync(file, "utf8");
      // A LOCAL of the same name is not the global. `rank-te.ts` slides a `window` array through a
      // transfer-entropy calc; a matcher that cannot tell that from `globalThis.window` reports a breach
      // where there is none, and a guard that cries wolf gets muted rather than obeyed.
      const shadowed = new Set(
        [...src.matchAll(/\b(?:const|let|var|function)\s+(window|document|process|require)\b/g)].map((m) => m[1]!),
      );
      for (const raw of src.split("\n")) {
        const line = raw.trim();
        if (line.startsWith("//") || line.startsWith("*") || line.startsWith("/*")) continue;
        const m = PLATFORM_GLOBAL.exec(line);
        if (!m) continue;
        const token = (m[1] ?? "").replace(/[.(].*$/, "");
        if (shadowed.has(token)) continue;
        breaches.push(`${file.slice(SRC.length + 1)}: ${line.slice(0, 96)}`);
      }
    }
    expect(
      breaches,
      "a module on the ISOMORPHIC barrel reaches a platform global. It imports nothing, so the graph walk " +
      "above cannot see it — and it stays latent until a caller moves, at which point it throws on the " +
      "platform that lacks it. Take the value as a parameter, or move the module behind `@lararium/mesh/node`.",
    ).toEqual([]);
  });

  test("the walk actually reaches modules — an empty graph would pass both guards vacuously", () => {
    expect(barrelModules(join(SRC, "index.ts")).length).toBeGreaterThan(30);
  });

  test("the host door stays a separate door — the barrel never re-exports it", () => {
    // The cheapest way to undo all of this is one line: `export * from "./node.js"` in the barrel. It
    // would typecheck, it would ship, and every host module behind the door would pour straight back into
    // the browser's graph. The door only holds while it stays a door.
    const barrel = readFileSync(join(SRC, "index.ts"), "utf8");
    expect(barrel).not.toMatch(/(?:from|import)\s+["']\.\/node\.js["']/);
  });
});

/**
 * VM grammar boundary — pono tests for inversion of control.
 *
 * Grammar/parsing/projection work belongs to the TW5 VM. TypeScript in this
 * package may author JS tiddlers and host protocol shells, but tests must not
 * bless host-side parser calls as canonical behavior.
 */

import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { TW5Engine } from "../src/tw5-vm.js";

const ROOT = new URL("..", import.meta.url).pathname;

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

describe("pono grammar boundary", () => {
  test("package public API does not export host-sovereign meme parser entrypoints", () => {
    const index = read("src/index.ts");

    expect(index).not.toMatch(/parseMemeText|parseMemeNodes|parseMemeEdges/);
    expect(index).not.toMatch(/collectEvents|buildMemeAst|BOOTSTRAP_SCANS/);
  });

  test("meme AST implementation is authored as a TW5 library tiddler", () => {
    const entry = read("src/meme-ast-entry.ts");

    expect(entry).toContain("title: lar:///ha.ka.ba/@lararium/tw5/modules/meme-ast");
    expect(entry).toContain("module-type: library");
    expect(entry).toContain("inside the TW5 VM");
  });

  test("memetic-wikitext deserialization is a TW5 deserializer module", () => {
    const deserializer = read("src/deserializer.ts");

    expect(deserializer).toContain("module-type: tiddlerdeserializer");
    expect(deserializer).toContain("text/x-memetic-wikitext");
    expect(deserializer).toContain("Parsing MUST happen inside the TW5 VM");
  });

  test("host ingest delegates carrier decomposition to the VM wiki deserializer", () => {
    const engine = new TW5Engine();
    const calls: Array<{ type: string; text: string; fields: Record<string, unknown> }> = [];
    const tiddlers = new Map<string, { fields: Record<string, unknown> }>();

    class FakeTiddler {
      fields: Record<string, unknown>;
      constructor(fields: Record<string, unknown>) {
        this.fields = fields;
      }
    }

    const wiki = {
      deserializeTiddlers(type: string, text: string, fields: Record<string, unknown>) {
        calls.push({ type, text, fields });
        return [
          { title: "lar:///test", text: "body", tags: ["pono"] },
          { title: "$:/temp/internal", text: "must not cross host boundary" },
        ];
      },
      addTiddler(tiddler: FakeTiddler) {
        tiddlers.set(String(tiddler.fields.title), { fields: tiddler.fields });
      },
      getTiddler(title: string) {
        return tiddlers.get(title);
      },
      transact(fn: () => void) {
        fn();
      },
    };

    (engine as unknown as { _tw: unknown })._tw = { wiki, Tiddler: FakeTiddler };

    const records = engine.ingestCarrier("lar:///test", "<<~ meme text >>", { type: "text/x-memetic-wikitext" });

    expect(calls).toEqual([
      {
        type: "text/x-memetic-wikitext",
        text: "<<~ meme text >>",
        fields: { title: "lar:///test", type: "text/x-memetic-wikitext" },
      },
    ]);
    expect(records.map((r) => r.tiddler.title)).toEqual(["lar:///test"]);
  });

  test("tests do not import meme-ast internals as the canonical grammar surface", () => {
    const testDir = join(ROOT, "tests");
    const offenders = walk(testDir)
      .filter((f) => f.endsWith(".test.ts"))
      .filter((f) => !f.endsWith("vm-grammar-boundary.test.ts"))
      .filter((f) => /src\/meme-ast|collectEvents|buildMemeAst|parseMemeText/.test(readFileSync(f, "utf8")))
      .map((f) => relative(ROOT, f));

    expect(offenders).toEqual([]);
  });
});

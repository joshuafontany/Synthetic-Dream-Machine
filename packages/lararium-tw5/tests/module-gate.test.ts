/**
 * module-gate.test.ts — the kernel module gate's positive path.
 *
 * Post-nalu (2026-06-12): bootTrustedModules selects kernel-injectable
 * modules by WORN COMPONENT — `[all[tiddlers]stack:has[…/tw5/tw5-module]]`
 * — never by an implements field. The fake here covers only TW5 plumbing;
 * filterTiddlers delegates to the REAL stack operator, so selection,
 * relative-name qualification, the rating gate, and the sha256 body gate
 * all run live.
 *
 * Meme: lar:///ha.ka.ba/lararium/tw5/tw5-module-gate
 */

import { describe, test, expect } from "vitest";
import { createHash } from "crypto";
import { bootTrustedModules } from "../src/tw5-module-gate.js";
import { CARRIER_TYPE } from "@lararium/mesh/carrier-type";
import { stack } from "../src/filters/stack.js";
import type { TW5FilterOperator, TW5FilterSource } from "../src/types/tiddlywiki.js";

const MODULE_COMPONENT = "lar:///ha.ka.ba/lararium/tw5/tw5-module";
const AGGREGATE_URI    = "lar:///ha.ka.ba/lararium/tw5/modules/tw5-modules";

type Fields = Record<string, unknown>;

function sha256(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

/** Minimal TW5 stand-in: real stack filter, fake plumbing. */
function fakeTw(initial: Record<string, Fields>) {
  const tiddlers = new Map<string, Fields>(Object.entries(initial));
  const defined: string[] = [];

  const source: TW5FilterSource = (iter) => {
    for (const [title, fields] of tiddlers) {
      iter({ fields } as never, title);
    }
  };

  const wiki = {
    filterTiddlers: (expr: string): string[] => {
      const m = /^\[all\[tiddlers\]stack:has\[(.+)\]\]$/.exec(expr);
      if (!m) throw new Error(`fake wiki cannot run: ${expr}`);
      const op: TW5FilterOperator = { operator: "stack", suffix: "has", operand: m[1]! };
      return stack(source, op);
    },
    getTiddler: (title: string) => {
      const fields = tiddlers.get(title);
      return fields ? ({ fields } as never) : undefined;
    },
    addTiddler: (t: { fields?: Fields } & Fields) => {
      const fields = (t as { fields?: Fields }).fields ?? t;
      tiddlers.set(String(fields["title"]), fields);
    },
  };

  const tw = {
    wiki,
    Tiddler: class {
      fields: Fields;
      constructor(fields: Fields) { this.fields = fields; }
    },
    modules: { define: (_text: string, _type: string, name: string) => { defined.push(name); } },
  };

  return { tw: tw as never, tiddlers, defined };
}

function moduleMeme(title: string, body: string, overrides: Fields = {}): Fields {
  return {
    title,
    type:          CARRIER_TYPE,
    tags:          [MODULE_COMPONENT],
    mana:          "18", manao: "18", manaoio: "18", confidence: "18",
    "module-type": "library",
    "body-sha256": sha256(body),
    text:          body,
    ...overrides,
  };
}

describe("bootTrustedModules — selection by worn component", () => {
  test("a module wearing tw5/tw5-module at rating passes the gate and injects", async () => {
    const body = "exports.probe = 1;";
    const { tw, tiddlers, defined } = fakeTw({
      ["lar:///ha.ka.ba/bags/test/modules/probe"]: moduleMeme("lar:///ha.ka.ba/bags/test/modules/probe", body),
      [AGGREGATE_URI]: moduleMeme(AGGREGATE_URI, "exports.agg = 1;"),
    });

    await bootTrustedModules(tw);

    const injected = tiddlers.get("lar:///ha.ka.ba/bags/test/modules/probe")!;
    expect(injected["type"]).toBe("application/javascript");   // rewritten = injected
    expect(defined).toContain("lararium-tw5-modules");          // aggregate defined
  });

  test("low rating, missing hash, and unworn carriers all stay un-injected", async () => {
    const body = "exports.probe = 1;";
    const { tw, tiddlers } = fakeTw({
      ["lar:///ha.ka.ba/bags/test/modules/low"]:    moduleMeme("lar:///ha.ka.ba/bags/test/modules/low", body, { mana: "3" }),
      ["lar:///ha.ka.ba/bags/test/modules/nohash"]: moduleMeme("lar:///ha.ka.ba/bags/test/modules/nohash", body, { "body-sha256": "" }),
      ["lar:///ha.ka.ba/bags/test/modules/bare"]:   moduleMeme("lar:///ha.ka.ba/bags/test/modules/bare", body, { tags: [] }),
    });

    await bootTrustedModules(tw);

    for (const t of ["low", "nohash", "bare"]) {
      expect(tiddlers.get(`lar:///ha.ka.ba/bags/test/modules/${t}`)!["type"])
        .toBe(CARRIER_TYPE);
    }
  });
});

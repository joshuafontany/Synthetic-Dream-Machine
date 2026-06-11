/*\
title: lar:///ha.ka.ba/@lararium/tw5/macros/lar-iam-block
type: application/javascript
module-type: macro
\*/

"use strict";

export const name = "lar-iam-block";
export const params: unknown[] = [];

const DENY: Record<string, 1> = {
  title: 1, text: 1, type: 1, tags: 1, created: 1, modified: 1, revision: 1, bag: 1,
  slot: 1, "fragment-parent": 1, preamble: 1, postamble: 1, prologue: 1,
  "header-text": 1, namespace: 1,
  "source-file": 1, "synced-at": 1, "disk-projection": 1, "lar-generated": 1,
  "ahu-parent": 1, "ahu-slot": 1, "realm-origin": 1, "origin-bag": 1,
};

function fmt(v: unknown): string {
  if (Array.isArray(v)) {
    const items = (v as unknown[]).map((s) => {
      return '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n") + '"';
    });
    return "[" + items.join(", ") + "]";
  }
  const s = String(v);
  if (/^-?\d+$/.test(s) || s === "true" || s === "false") return s;
  return '"' + s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r") + '"';
}

export function run(this: { getVariable(name: string): string; wiki: { getTiddler(title: string): { fields: Record<string, unknown> } | undefined } }): string {
  const title = this.getVariable("currentTiddler");
  const tiddler = this.wiki.getTiddler(title);
  if (!tiddler) return "";
  const f = tiddler.fields;
  const lines: string[] = [];
  for (const k of Object.keys(f).sort()) {
    if (DENY[k] || k.charAt(0) === "$") continue;
    const v = f[k];
    if (v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)) continue;
    lines.push(k + " = " + fmt(v));
  }
  return lines.length ? lines.join("\n") + "\n" : "";
}

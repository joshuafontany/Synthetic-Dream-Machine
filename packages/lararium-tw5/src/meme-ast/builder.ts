/**
 * meme-ast/builder.ts — buildMemeAst(): ParseEvent[] → MemeAstNode[].
 *
 * Local-first, isomorphic: no fs/path/DOM imports.
 * Runs in Node, Deno, browser, and TW5-era JS environments.
 *
 * The push/pop scope stack converts the flat sorted ParseEvent stream into a
 * properly nested MemeAstNode tree. This forms the structural heart of the parser.
 *
 * Heleuma ka: sync-heleuma tracks this file.
 * Bundle entry: packages/lararium-tw5/src/meme-ast-entry.ts
 */

import type { GrammarRules } from "./types.js";
import type {
  MemeAstNode,
  AhuNode,
  PranalaNode,
  PranalaSugarNode,
  LeleNode,
  PaeNode,
  SigilNode,
  DynamicNode,
  TextNode,
  ErrorNode,
  ParseFailure,
} from "./types.js";
import type { ParseEvent } from "./scanner.js";

// ---------------------------------------------------------------------------
// Internal builder frame (scope stack entry)
// ---------------------------------------------------------------------------

interface Frame {
  sigilName: string;
  pos:       number;
  raw:       string;
  groups:    (string | undefined)[];
  children:  MemeAstNode[];
}

// ---------------------------------------------------------------------------
// Names that produce SigilNode (not DynamicNode).
// Grammar-meme sigils fall to DynamicNode when no grammar is loaded.
// ---------------------------------------------------------------------------

const CANONICAL_SIGILS = new Set([
  "ahu", "kahea-invoke", "pranala", "loulou", "aka", "kahea", "pono", "lele", "papalohe",
  "mukuwai", "kahawai", "huli", "kumu", "kau", "waiho", "kukali", "toml",
  "control-soh", "control-stx", "control-etx", "control-eot",
  "hana", "meme", "wehe", "helu", "kapu", "hui", "heihei", "puka", "ui",
]);

// ---------------------------------------------------------------------------
// attrsFromGroups — extract sigil-specific attrs from regex capture groups.
// ---------------------------------------------------------------------------

function attrsFromGroups(
  name:   string,
  groups: (string | undefined)[],
  scope:  "carrier" | "block" = "block",
): Record<string, string> {
  const g = (i: number) => (groups[i] ?? "").trim();
  switch (name) {
    case "heihei":
    case "kahawai": return { filter: g(1) };
    case "huli":    return { filter: g(1), binding: g(2) };
    case "hana":    return { grammarKey: g(1) };
    case "meme":    return { targetUri: g(1) };
    case "wehe":
    case "kumu":    return { name: g(1), params: g(2) };
    case "helu":    return { name: g(1), params: g(2), expression: g(3) };
    case "waiho":   return { name: g(1), value: g(2), scope };
    case "kau":     return { name: g(1), value: g(2), scope };
    case "kapu":    return { qualifier: g(1), inline: scope === "carrier" ? "true" : "false" };
    case "ui":      return { filter: g(1) };
    case "kukali":  return g(1) ? { trigger: g(1) } : {};
    case "toml":    return { profile: g(1), content: g(2) };
    // Turn/HUD-frame sigils — recognized so the tree carries a turn's own frame (not graded degraded).
    case "lares":   return { mode: g(1), from: g(2), to: g(3) };
    case "confidence": return { body: g(1) };
    case "hud":     return { body: g(1) };
    case "ward":    return { body: g(1) };
    case "oracle":  return { body: g(1) };
    case "syad":    return { body: g(1) };
    default:        return {};
  }
}

// ---------------------------------------------------------------------------
// kaheaInvokeNode — dispatch <<~ kahea <type> <args> >> to correct AST node
// ---------------------------------------------------------------------------

/**
 * One named attribute out of a sigil's trailing parameter list.
 *
 * TiddlyWiki takes `=` or `:` as the separator and a value either quoted or bare, so a reader keyed on one
 * spelling recovers a fraction of what the host parses. Across the lares bags this attribute stands written
 * all three ways.
 */
function attrOf(tail: string, name: string): string | null {
  const m = new RegExp(`\\b${name}\\s*[=:]\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>"']+))`).exec(tail);
  return m ? (m[1] ?? m[2] ?? m[3] ?? null) : null;
}

function kaheaInvokeNode(
  type:     string,
  args:     string,
  base:     { pos: number; raw: string },
  memeUri:  string,
  children: MemeAstNode[],
): MemeAstNode {
  if (type === "ahu") {
    const slot = args.trim();
    return { kind: "Ahu", ...base, slot, uri: memeUri + slot, delegate: null, body: children, invocation: true } as AhuNode;
  }
  return { kind: "Sigil", ...base, sigilName: type, attrs: { summon: "true", args }, body: children } as SigilNode;
}

// ---------------------------------------------------------------------------
// closeFrame — produce an AST node from a completed scope frame
// ---------------------------------------------------------------------------

function closeFrame(frame: Frame, memeUri: string, grammar?: GrammarRules): MemeAstNode {
  const { sigilName, pos, raw, groups, children } = frame;
  const base = { pos, raw };
  const g    = (i: number) => (groups[i] ?? "").trim();

  if (sigilName === "ahu") {
    return { kind: "Ahu", ...base, slot: g(1), uri: memeUri + g(1), delegate: g(2) || null, body: children } as AhuNode;
  }
  if (sigilName === "kahea-invoke") {
    return kaheaInvokeNode(g(1), g(2), base, memeUri, children);
  }
  if (sigilName === "pranala") {
    const tail   = groups[4] ?? "";
    const family = attrOf(tail, "family") ?? "relation";
    const role   = attrOf(tail, "role");
    return { kind: "Pranala", ...base, slot: g(1) || null, fromRaw: g(2), toRaw: g(3), family, role, body: children } as PranalaNode;
  }
  if (CANONICAL_SIGILS.has(sigilName)) {
    return { kind: "Sigil", ...base, sigilName, attrs: attrsFromGroups(sigilName, groups, "block"), body: children } as SigilNode;
  }
  const sigilKind = grammar?.sigils.find((s) => s.name === sigilName)?.kind ?? "unknown";
  return { kind: "Dynamic", ...base, sigilName, sigilKind, eventType: "open-close", body: children } as DynamicNode;
}

// ---------------------------------------------------------------------------
// makeLeaf — produce an AST leaf node from a leaf/pragma event
// ---------------------------------------------------------------------------

function makeLeaf(
  sigilName: string,
  eventType: "leaf" | "pragma",
  pos:       number,
  raw:       string,
  groups:    (string | undefined)[],
  memeUri:   string,
  ahuStack:  string[],
  grammar?:  GrammarRules,
): MemeAstNode {
  const base = { pos, raw };
  const g    = (i: number) => (groups[i] ?? "").trim();

  switch (sigilName) {
    case "pranala":
      return { kind: "Pranala", ...base, slot: g(1) || null, fromRaw: g(2), toRaw: g(3), family: attrOf(g(4), "family") ?? "relation", role: attrOf(g(4), "role"), body: [] } as PranalaNode;

    case "loulou":
      return { kind: "PranalaSugar", ...base, sigil: "loulou", slot: null, fromRaw: null, toRaw: g(1), family: "relation", role: null, listenable: null, subscribable: null } as PranalaSugarNode;

    case "aka": {
      // Two surface forms (per memetic-wikitext spec):
      //   child-slot: `<<~ aka ahu #slot >>`  → scanner regex with two
      //                                          groups: g(1)=sigil keyword,
      //                                          g(2)=`#slot` → AhuNode
      //                                          (projection).
      //   URI form:   `<<~ aka lar:///foo >>` → scanner regex with one
      //                                          group: g(1)=URI, g(2)=""
      //                                          → PranalaSugar (observe).
      // Discriminator: g(2) starting with `#` selects child-slot. Otherwise
      // route to URI / edge branch with toRaw = g(1) (URI lives in group 1
      // when group 2 is absent).
      const akaSlot = g(2);
      if (akaSlot.startsWith("#")) {
        return { kind: "Ahu", ...base, slot: akaSlot, uri: memeUri + akaSlot, delegate: null, body: [], projection: true } as AhuNode;
      }
      return { kind: "PranalaSugar", ...base, sigil: "aka", slot: null, fromRaw: null, toRaw: g(1), family: "observe", role: null, listenable: null, subscribable: null } as PranalaSugarNode;
    }

    case "kahea-invoke":
      return kaheaInvokeNode(g(1), g(2), base, memeUri, []);

    case "kahea":
      return { kind: "PranalaSugar", ...base, sigil: "kahea", slot: null, fromRaw: null, toRaw: g(1), family: "dataflow", role: null, listenable: null, subscribable: null } as PranalaSugarNode;

    case "kau": {
      const scope = eventType === "pragma" ? "carrier" : "block";
      if (raw.match(/<<~!?\s*kau\s+[\w-]+\s*=/)) {
        return { kind: "Sigil", ...base, sigilName: "kau", attrs: { name: g(1), value: g(2), scope }, body: [] } as SigilNode;
      }
      if (g(3) === "" && g(1) !== "" && !g(1).startsWith("#") && raw.includes("(")) {
        return { kind: "Sigil", ...base, sigilName: "kau", attrs: { name: g(1), args: g(2) }, body: [] } as SigilNode;
      }
      if (!g(1) && g(2) && g(3) === "") {
        return { kind: "Sigil", ...base, sigilName: "kau", attrs: { name: g(2), args: "" }, body: [] } as SigilNode;
      }
      const fragment = g(1).replace(/^#/, "").trim() || null;
      return { kind: "Sigil", ...base, sigilName: "kau", attrs: { fragment: fragment ?? "", name: g(2), propsRaw: g(3) }, body: [] } as SigilNode;
    }

    case "pono":
      return { kind: "PranalaSugar", ...base, sigil: "pono", slot: g(1) || null, fromRaw: g(2), toRaw: g(3), family: "constraint", role: g(4) || null, listenable: null, subscribable: null } as PranalaSugarNode;

    case "papalohe":
      return { kind: "PranalaSugar", ...base, sigil: "papalohe", slot: g(1) || null, fromRaw: g(2), toRaw: g(3), family: "reaction", role: null, listenable: g(4) || null, subscribable: g(5) || null } as PranalaSugarNode;

    case "lele":
      return { kind: "Lele", ...base, targetRaw: g(1), family: "message" } as LeleNode;

    case "toml":
      return { kind: "Sigil", ...base, sigilName: "toml",
        attrs: { profile: groups[2] !== undefined ? (groups[1] ?? "") : "", content: groups[2] ?? groups[1] ?? "" },
        body: [] } as SigilNode;

    case "control-soh": return { kind: "Pae", ...base, phase: "soh", toUri: g(1) || undefined } as PaeNode;
    case "control-stx": return { kind: "Pae", ...base, phase: "stx" } as PaeNode;
    case "control-etx": return { kind: "Pae", ...base, phase: "etx" } as PaeNode;
    case "control-eot": return { kind: "Pae", ...base, phase: "eot" } as PaeNode;

    default: {
      if (CANONICAL_SIGILS.has(sigilName)) {
        const scope = eventType === "pragma" ? "carrier" : "block";
        return { kind: "Sigil", ...base, sigilName, attrs: attrsFromGroups(sigilName, groups, scope), body: [] } as SigilNode;
      }
      const sigilKind = grammar?.sigils.find((s) => s.name === sigilName)?.kind ?? "unknown";
      return { kind: "Dynamic", ...base, sigilName, sigilKind, eventType: eventType === "pragma" ? "pragma" : "leaf", body: [] } as DynamicNode;
    }
  }
}

// ---------------------------------------------------------------------------
// buildMemeAst — main entry: ParseEvent[] → MemeAstNode[]
// ---------------------------------------------------------------------------

export function buildMemeAst(
  events:     ParseEvent[],
  memeUri:    string,
  grammar?:   GrammarRules,
  sourceText?: string,
  failures:   ParseFailure[] = [],
): MemeAstNode[] {
  const root:     MemeAstNode[] = [];
  const stack:    Frame[]       = [];
  const ahuStack: string[]      = [];
  let cursor = 0;

  const top = (): MemeAstNode[] => stack.length > 0 ? stack[stack.length - 1]!.children : root;

  const emitTextGap = (upTo: number) => {
    if (!sourceText || upTo <= cursor) return;
    const span = sourceText.slice(cursor, upTo);
    if (span.trim()) top().push({ kind: "Text", pos: cursor, raw: span, content: span } as TextNode);
  };

  // Resilient-recovery helpers (graceful-parsing#sigil-self-defined-gradient): the builder is the
  // DRIVER — at each failure site it CONTAINS the break (a graded Error node, or a marked force-close)
  // and records it out-of-band, instead of silently dropping or force-closing. Fires only AFTER a
  // failed match, so the clean parse is untouched (the soundness invariant).
  const errorNode = (
    pos: number, raw: string, content: string,
    reason: string, recoveredAs: "water" | "repaired" | "missing", standing: number,
  ): ErrorNode => {
    failures.push({ pos, raw, reason, recoveredAs });
    return { kind: "Error", pos, raw, content, reason, recoveredAs, standing };
  };
  const markRecovered = (
    node: MemeAstNode, recoveredAs: "water" | "repaired" | "missing",
    standing: number, reason: string, sigilName?: string,
  ): MemeAstNode => {
    node.recoveredAs = recoveredAs;
    node.standing    = standing;
    const f: ParseFailure = { pos: node.pos, raw: node.raw, reason, recoveredAs };
    if (sigilName !== undefined) f.sigilName = sigilName;
    failures.push(f);
    return node;
  };

  for (const evt of events) {
    const { sigilName, eventType, pos, end, raw, groups } = evt;
    emitTextGap(pos);

    if (eventType === "open") {
      stack.push({ sigilName, pos, raw, groups, children: [] });
      if (sigilName === "ahu") ahuStack.push(memeUri + (groups[1] ?? "").trim());
      cursor = end;
      continue;
    }

    if (eventType === "close") {
      let i = stack.length - 1;
      while (i >= 0 && stack[i]!.sigilName !== sigilName) i--;
      if (i < 0) {
        // RECOVER (water): an orphan close with no matching open — contain it as a graded Error node
        // carrying the verbatim span, instead of silently dropping it.
        top().push(errorNode(pos, raw, raw, "orphan-close:" + sigilName, "water", 2));
        cursor = end;
        continue;
      }
      // RECOVER (repaired): frames between the match and the top got force-closed by this close — a
      // mis-nest. Close them, but mark each recovered + record, never silently.
      while (stack.length - 1 > i) {
        top().push(markRecovered(closeFrame(stack.pop()!, memeUri, grammar), "repaired", 9, "mis-nest"));
      }
      const frame = stack.pop()!;
      if (sigilName === "ahu") ahuStack.pop();
      top().push(closeFrame(frame, memeUri, grammar));
      cursor = end;
      continue;
    }

    // leaf or pragma
    const leaf = makeLeaf(sigilName, eventType, pos, raw, groups, memeUri, ahuStack, grammar);
    // RECOVER (missing): the generic catch-all recognized an unmatched sharktooth — a known sigil in a
    // novel param shape (`<<~ aperture(0->20) >>`) or an unknown word. Grade it the PARTIAL rung
    // (recognized sigil, params best-effort) instead of dropping to water.
    if (evt.generic) markRecovered(leaf, "missing", 13, "partial-form:" + sigilName, sigilName);
    top().push(leaf);
    cursor = end;
  }

  if (sourceText && cursor < sourceText.length) {
    const span = sourceText.slice(cursor);
    if (span.trim()) top().push({ kind: "Text", pos: cursor, raw: span, content: span } as TextNode);
  }

  while (stack.length > 0) {
    const frame = stack.pop()!;
    if (frame.sigilName === "ahu") ahuStack.pop();
    // RECOVER: an unclosed frame at EOF — force-close it, but mark recovered + record (never the old
    // silent "confidently-incorrect tree"). The sigil MAY self-declare its posture via `recoverAs`:
    // "water" (inert, standing 2) vs the default "repaired" (recovered, standing 9). The structure never breaks.
    const declared = grammar?.sigils.find((s) => s.name === frame.sigilName)?.recoverAs;
    const recoveredAs = declared ?? "repaired";
    root.push(markRecovered(
      closeFrame(frame, memeUri, grammar), recoveredAs, recoveredAs === "water" ? 2 : 9,
      "unclosed-frame", frame.sigilName,
    ));
  }

  return root;
}

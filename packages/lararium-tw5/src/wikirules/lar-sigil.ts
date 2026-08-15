/*\
title: lar:///ha.ka.ba/lararium/tw5/wikirules/lar-sigil
type: application/javascript
module-type: wikirule
\*/
/**
 * lar-sigil — unified TW5 wikirule (block + inline) for all `<<~ … >>` sigil
 * forms. Block forms (container ahu, container pranala, generic-with-closer)
 * are claimed at block parse phase. Leaf inline forms (aka, kahea, loulou,
 * pranala-header, pranala-inline, ahu/kau invocation) are claimed at inline phase.
 *
 * Dispatch model:
 *   All compound + simple sigils → ~ dispatcher (name=SIGIL, p1=ARGS)
 *   pranala block/inline         → ~pranala directly (keyword args: from/to/slot/…)
 *   pranala-header               → ~ dispatcher (name="pranala-header", p1=uri)
 *   generic block-with-closer    → text literal pass-through
 *
 * Child-slot detection (ahu, kau, future) uses grammarChildSlotNames() —
 * no sigil names hardcoded here beyond what the grammar registry supplies.
 */

import { getGrammar } from "../grammar-cache.js";
import { severityOfRung } from "../meme-ast/diagnostics.js";
import type { RecoveryRung } from "../meme-ast/diagnostics.js";
import {
  ParseTreeNode,
  WikiParser,
  RuleInstance,
  matchCompoundSigilAt,
  indexOfSigilOpen,
  grammarChildSlotNames,
  matchPranalaHeaderAt,
  matchPranalaOpenAt,
  findCloseEnd,
  findGenericOpenAt,
  buildClosers,
  grammarInlineSigils,
  attrToTree,
} from "./lar-sigil-shared.js";

export const name  = "lar-sigil";
export const types = { block: true, inline: true };

export function init(this: RuleInstance, parser: WikiParser): void {
  this.parser = parser;
}

export function findNextMatch(this: RuleInstance, startPos: number): number | undefined {
  const source         = this.parser!.source;
  const grammar        = getGrammar();
  const closers        = buildClosers(grammar);
  const inlineSigils   = grammarInlineSigils(grammar);
  const childSlotNames = grammarChildSlotNames(grammar);
  let pos = indexOfSigilOpen(source, startPos);
  while (pos >= 0) {
    // pranala-header: permanent JS exception — <<~ ? -> uri >> uses a unique
    // self-reference token (?) that is not a sigil word. Cannot generalise into
    // compound without losing the ? semantic. Must precede compound to prevent
    // compound from misreading any stray <<~ ? ... >> as a sigil named "?".
    const pranalaHeader = matchPranalaHeaderAt(source, pos);
    if (pranalaHeader) {
      this.matchPos = pos;
      this.matchEnd = pranalaHeader.end;
      this.attrs    = { __sigil__: "pranala-header", uri: pranalaHeader.uri };
      return pos;
    }

    // pranala: permanent JS exception — <<~ pranala FROM -> TO >> arrow syntax with
    // keyword attrs (from/to/slot/family/role/body) is structurally distinct from
    // <<~ WORD ARGS >>. The ~ dispatcher's p1–p5 positional interface cannot carry
    // named keyword pairs without losing the readable HUD form.
    const pranala = matchPranalaOpenAt(source, pos);
    if (pranala) {
      const closeEnd = findCloseEnd(source, "pranala", pranala.end);
      if (closeEnd !== null) {
        const closeTagStart = source.lastIndexOf("<<~/pranala", closeEnd);
        const body = source.slice(pranala.end, closeTagStart);
        this.matchPos = pos;
        this.matchEnd = closeEnd;
        this.attrs    = {
          __pranala_block__: "true",
          ...(pranala.slot ? { slot: pranala.slot } : {}),
          from: pranala.from,
          to:   pranala.to,
          body,
          ...pranala.attrs,
        };
        return pos;
      }
      this.matchPos = pos;
      this.matchEnd = pranala.end;
      this.attrs    = {
        __sigil__: "pranala",
        ...(pranala.slot ? { slot: pranala.slot } : {}),
        from: pranala.from,
        to:   pranala.to,
        ...pranala.attrs,
      };
      return pos;
    }

    // Compound sigil: <<~ WORD1 [child-slot WORD2] ARGS >>
    // Handles: <<~ kahea ahu #slot >>, <<~ ahu #slot >>…<<~/ahu >>,
    //          <<~ kahea lar:///uri >>, <<~ loulou lar:///uri >>, <<~ kau … >>
    const compound = matchCompoundSigilAt(source, pos, childSlotNames);
    if (compound) {
      if (compound.closeKey) {
        const closeEnd = findCloseEnd(source, compound.closeKey, compound.end, closers);
        if (closeEnd !== null) {
          const closeTagStart = source.lastIndexOf(`<<~/${compound.closeKey}`, closeEnd);
          const body = source.slice(compound.end, closeTagStart);
          this.matchPos = pos;
          this.matchEnd = closeEnd;
          this.attrs    = { __compound__: compound.name, __body__: body, p1: compound.p1 };
          return pos;
        }
      }
      this.matchPos = pos;
      this.matchEnd = compound.end;
      this.attrs    = { __compound__: compound.name, p1: compound.p1 };
      return pos;
    }

    // Generic fallback: covers <<~WORD>> (no-space), control chars (<<^ code:"&#x0001;" >>),
    // and any form compound did not claim. Well-formed HUD sigils never reach here.
    // pranala guard: matchPranalaOpenAt already claimed pranala forms above; guard
    // prevents a bare <<~ pranala >> (no arrow) from silently becoming a literal block.
    const generic = findGenericOpenAt(source, pos);
    if (generic) {
      if (generic.sigil && closers[generic.sigil] && generic.sigil !== "pranala") {
        const closeEnd = findCloseEnd(source, generic.sigil, generic.end, closers);
        if (closeEnd !== null) {
          this.matchPos = pos;
          this.matchEnd = closeEnd;
          this.attrs    = { __literal__: source.slice(pos, closeEnd) };
          return pos;
        }
      }
      if (generic.sigil && inlineSigils.has(generic.sigil)) {
        this.matchPos = pos;
        this.matchEnd = generic.end;
        this.attrs    = { __sigil__: generic.sigil };
        return pos;
      }
      // GRADIENT (graceful-parsing): a sharktooth form no specific rule rendered. A sigil REGISTERED in
      // the grammar but not render-matched — the metadata/HUD-frame sigils (lares/confidence/hud/ward/
      // oracle/syad) — renders as PLAIN literal text ("just as it appears" in chat). Only a TRULY unknown
      // form degrades to a graded marker (partial = recognized word/novel shape · water = no word).
      this.matchPos = pos;
      this.matchEnd = generic.end;
      const known = !!generic.sigil && !!grammar?.sigils.some((s) => s.name === generic.sigil);
      this.attrs = known
        ? { __literal__: source.slice(pos, generic.end) }
        : { __literal__: source.slice(pos, generic.end), __degraded__: generic.sigil ? "partial" : "water" };
      return pos;
    }
    pos = indexOfSigilOpen(source, pos + 3);
  }
  return undefined;
}

export function parse(this: RuleInstance): ParseTreeNode[] {
  const parser = this.parser!;
  parser.pos = this.matchEnd!;
  const attrs = { ...(this.attrs ?? {}) };

  if ("__degraded__" in attrs) {
    // The gradient made VISIBLE in the live wiki: a degraded sigil renders as a marked span (partial /
    // water) carrying its verbatim text — never silently dropped, never a crash. Styled via
    // $:/tags/Stylesheet so a pasted-and-saved turn shows its parse grade instead of a silent literal.
    const grade   = attrs["__degraded__"]!;
    const literal = attrs["__literal__"] ?? "";
    const from    = this.matchPos ?? 0;
    const to      = this.matchEnd ?? from + literal.length;
    // The render plane showed the damage while the filter and the gate stayed blind to it, so the rule
    // leaves the same receipt every other recovery leaves: a span nobody has to look at the DOM to find.
    parser.addDiagnostic?.({
      from,
      to,
      severity: severityOfRung(grade as RecoveryRung),
      source:   "text/x-memetic-wikitext",
      code:     `unrecognized-sigil-${grade}`,
      message:  `The sigil form recovered as ${grade}, and its text stands verbatim`,
    });
    return [{
      type: "element",
      tag: "span",
      isRecovered: true,
      attributes: {
        class: { type: "string", value: `lar-sigil-degraded lar-sigil-${grade}` },
        title: { type: "string", value: `memetic-wikitext: ${grade} parse — unrecognized sigil form (verbatim preserved)` },
      },
      children: [{ type: "text", text: literal }],
    } as unknown as ParseTreeNode];
  }
  if ("__literal__" in attrs) {
    return [{ type: "text", text: attrs["__literal__"]! }];
  }

  // Compound sigil: <<~ WORD1 [child-slot WORD2] ARGS >>
  // Live wiki parent tiddlers hold <<~ kahea ahu #slot >> (space form, HUD-readable).
  // Deserializer splits block bodies into child tiddlers before TW5 parses carrier
  // text — block body drops here without data loss.
  if ("__compound__" in attrs) {
    const dispatchName = attrs["__compound__"]!;
    delete attrs["__compound__"];
    delete attrs["__body__"];
    return [{ type: "macrocall", attributes: {
      "$variable": { type: "string", value: "~" },
      "name":      { type: "string", value: dispatchName },
      "p1":        { type: "string", value: attrs["p1"] ?? "" },
    }, children: [] }];
  }

  if ("__pranala_block__" in attrs) {
    delete attrs["__pranala_block__"];
    const body = attrs["body"] ?? "";
    const macroAttrs: Record<string, { type: "string"; value: string }> = {
      "$variable": { type: "string", value: "~pranala" },
      "from":      { type: "string", value: attrs["from"] ?? "" },
      "to":        { type: "string", value: attrs["to"]   ?? "" },
      "body":      { type: "string", value: body },
    };
    if (attrs["slot"])   macroAttrs["slot"]   = { type: "string", value: attrs["slot"]! };
    if (attrs["family"]) macroAttrs["family"] = { type: "string", value: attrs["family"]! };
    if (attrs["role"])   macroAttrs["role"]   = { type: "string", value: attrs["role"]! };
    return [{ type: "macrocall", attributes: macroAttrs, children: [] }];
  }

  if ("__sigil__" in attrs) {
    const sigilType = attrs["__sigil__"]!;
    delete attrs["__sigil__"];

    if (sigilType === "pranala-header") {
      return [{ type: "macrocall", attributes: {
        "$variable": { type: "string", value: "~" },
        "name":      { type: "string", value: "pranala-header" },
        "p1":        { type: "string", value: attrs["uri"] ?? "" },
      }, children: [] }];
    }
    if (sigilType === "pranala") {
      const macroAttrs: Record<string, { type: "string"; value: string }> = {
        "$variable": { type: "string", value: "~pranala" },
        "from":      { type: "string", value: attrs["from"] ?? "" },
        "to":        { type: "string", value: attrs["to"]   ?? "" },
      };
      if (attrs["slot"])   macroAttrs["slot"]   = { type: "string", value: attrs["slot"]! };
      if (attrs["family"]) macroAttrs["family"] = { type: "string", value: attrs["family"]! };
      if (attrs["role"])   macroAttrs["role"]   = { type: "string", value: attrs["role"]! };
      return [{ type: "macrocall", attributes: macroAttrs, children: [] }];
    }
    // Grammar-registered inline sigil (edge/edge-sugar from operator tiddlers).
    return [{
      type:       sigilType,
      attributes: attrToTree(attrs),
      children:   [],
    }];
  }

  return [{ type: "text", text: "" }];
}

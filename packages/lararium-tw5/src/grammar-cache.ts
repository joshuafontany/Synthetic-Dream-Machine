/*\
title: lar:///ha.ka.ba/@lararium/tw5/modules/grammar-cache
type: application/javascript
module-type: startup
\*/
/**
 * grammar-cache — TW5 startup module: grammar loader + wiki-change invalidation.
 *
 * Grammar source — fully self-hosted via SharktoothSigil tiddlers:
 *   All tiddlers tagged `lar:///ha.ka.ba/tags/SharktoothSigil` contribute rules.
 *   Each tiddler's `lar-*` fields produce one SigilRule or FamilyRule.
 *   Adding a sigil = tagging a tiddler. No code change required.
 *   The `toml` data-fence sigil lives at:
 *     lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-toml
 *
 * Exported:
 *   name, platforms, after, startup  — TW5 startup lifecycle
 *   GRAMMAR_TAG                       — SharktoothSigil tag URI
 *   getGrammar()                      — lazy GrammarRules loader
 *   resetGrammar()                    — explicit cache invalidation (tests / emergency)
 */

import type { TW5Wiki } from "./types/tiddlywiki.js";
import type { GrammarRules, SigilRule, FamilyRule } from "./meme-ast/types.js";
import { GRAMMAR_TAG } from "@lararium/mesh/lar-uris";
export { GRAMMAR_TAG };

// ---------------------------------------------------------------------------
// TW5 startup lifecycle
// ---------------------------------------------------------------------------

export const name  = "lararium-grammar-cache";
export const after = ["startup"];

// TW5's evalGlobal injects $tw as a direct function parameter into module code.
// In the Node VM sandbox (vm.runInContext), globalThis is the empty VM context —
// $tw must be accessed as the injected variable, not via globalThis.$tw.
declare const $tw: { wiki?: TW5Wiki } | undefined;

export function startup(): void {
  const wiki = $tw?.wiki;
  if (!wiki) return;
  wiki.addEventListener("change", (changes) => {
    for (const title of Object.keys(changes)) {
      const tags = wiki.getTiddler(title)?.fields.tags ?? [];
      if (tags.includes(GRAMMAR_TAG)) { _cache = undefined; return; }
    }
  });
}

// ---------------------------------------------------------------------------
// Grammar cache
// ---------------------------------------------------------------------------

let _cache: { loaded: true; rules: GrammarRules | null } | undefined = undefined;

export function getGrammar(): GrammarRules | null {
  if (_cache) return _cache.rules;
  let rules: GrammarRules | null = null;
  try {
    const wiki = $tw?.wiki;
    if (wiki) rules = buildGrammarFromWiki(wiki);
  } catch { /* grammar unavailable — BOOTSTRAP_SCANS remain active */ }
  _cache = { loaded: true, rules };
  return rules;
}

export function resetGrammar(): void { _cache = undefined; }

// ---------------------------------------------------------------------------
// Grammar assembly
// ---------------------------------------------------------------------------

function str(v: unknown): string { return typeof v === "string" ? v : ""; }

/**
 * Derive sigil name from tiddler fields or title.
 * `lar-name` field takes precedence; otherwise strips the "sigil-" prefix
 * from the last path segment of the title (e.g. "…/sigil-ahu" → "ahu").
 */
function nameFromTitle(title: string, fields: Readonly<Record<string, unknown>>): string {
  if (fields["lar-name"]) return str(fields["lar-name"]);
  const last = title.split("/").pop() ?? title;
  return last.startsWith("sigil-") ? last.slice(6) : last;
}

/** Build SigilRule from a SharktoothSigil tiddler's fields. Returns null for family tiddlers. */
function sigilFromFields(title: string, fields: Readonly<Record<string, unknown>>): SigilRule | null {
  const kindRaw = str(fields["lar-kind"]);
  if (!kindRaw || kindRaw === "family") return null;
  const kind = kindRaw as SigilRule["kind"];
  const rule: SigilRule = { name: nameFromTitle(title, fields), kind };
  if (fields["lar-pattern"])         rule.pattern        = str(fields["lar-pattern"]);
  if (fields["lar-open-pattern"])    rule.openPattern    = str(fields["lar-open-pattern"]);
  if (fields["lar-close-pattern"])   rule.closePattern   = str(fields["lar-close-pattern"]);
  if (fields["lar-inline-pattern"])  rule.inlinePattern  = str(fields["lar-inline-pattern"]);
  if (fields["lar-block-pattern"])   rule.blockPattern   = str(fields["lar-block-pattern"]);
  if (fields["lar-alias-for"])       rule.aliasFor       = str(fields["lar-alias-for"]);
  if (fields["lar-default-family"])  rule.defaultFamily  = str(fields["lar-default-family"]);
  const layer = str(fields["lar-layer"]);
  if (layer === "compile" || layer === "render" || layer === "both") rule.layer = layer;
  // Self-defined failure-gradient: the sigil declares how it degrades when unclosed.
  const recoverAs = str(fields["lar-recover-as"]);
  if (recoverAs === "water" || recoverAs === "repaired") rule.recoverAs = recoverAs;
  return rule;
}

/** Build FamilyRule from a SharktoothSigil tiddler with lar-kind: family. */
function familyFromFields(title: string, fields: Readonly<Record<string, unknown>>): FamilyRule | null {
  if (str(fields["lar-kind"]) !== "family") return null;
  const name = nameFromTitle(title, fields);
  const familyName = name.startsWith("family-") ? name.slice(7) : name;
  return {
    name:               familyName,
    dagRequired:        str(fields["lar-dag-required"])        === "true",
    roleRecommended:    str(fields["lar-role-recommended"])    === "true",
    confidenceBounded:  str(fields["lar-confidence-bounded"])  === "true",
  };
}

/**
 * Assemble GrammarRules from all `[tag[lar:///ha.ka.ba/tags/SharktoothSigil]]` tiddlers.
 *   - lar-kind != "family" → SigilRule
 *   - lar-kind == "family" → FamilyRule
 *
 * Grammar fully self-hosted: every sigil and family rule carries as a tiddler.
 * The `toml` data-fence sigil lives at lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-toml.
 */
function buildGrammarFromWiki(wiki: TW5Wiki): GrammarRules | null {
  const titles = wiki.filterTiddlers(`[tag[${GRAMMAR_TAG}]]`);
  const sigils:   SigilRule[]   = [];
  const families: FamilyRule[]  = [];
  for (const title of titles) {
    const fields = wiki.getTiddler(title)?.fields ?? {};
    const family = familyFromFields(title, fields);
    if (family) { families.push(family); continue; }
    const rule = sigilFromFields(title, fields);
    if (rule) sigils.push(rule);
  }
  if (sigils.length === 0 && families.length === 0) return null;
  return { sigils, families };
}

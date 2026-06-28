/*\
title: lar:///ha.ka.ba/@lararium/tw5/parsers/memetic-parser
type: application/javascript
module-type: parser
\*/
/**
 * memetic-parser — WikiParser subclass for `text/x-memetic-wikitext`.
 *
 * Inherits the standard wikitext parser, then filters its rule arrays in
 * the constructor so the rules that mangle round-trip never instantiate
 * for memetic-typed tiddlers. Per Jermolene (TW5 GH discussion #6712):
 *
 *   "The `\rules` pragma scope does not propagate through `<$transclude>`.
 *    Transcluded content reparses under its own type's full ruleset."
 *
 * Pragma injection (`\rules except codeblock dash …`) only affects the
 * outer parse — when a meme template transcludes the parent's text via
 * `{{!!text}}`, the inner content reparses fresh, the pragma evaporates,
 * and the offending rules fire. Rule-array filtering at parser
 * construction is the only mechanism that scopes per-type. The filter
 * propagates because every memetic-typed tiddler instantiates THIS
 * parser, transclude or not.
 *
 * Deny list is now empty — T-1 landed. lar-sigil (block+inline) claims all
 * <<~ … >> forms; standard TW5 macro rules fire normally for <<macroname>>.
 *
 * Operator override: writing a space-separated rule-name list to
 * `lar:///ha.ka.ba/config/memetic-rules-except` replaces the default deny list.
 *
 * Schema: lar:///ha.ka.ba/@lares/api/lararium/schema/memetic-parser
 */

const RULES_CONFIG_TIDDLER = "lar:///ha.ka.ba/config/memetic-rules-except";

const DEFAULT_RULES_EXCEPT: ReadonlySet<string> = new Set<string>();

interface ParserCtor {
  (this: object, type: string, text: string, options: unknown): void;
  prototype: ParserPrototype;
  call(thisArg: object, type: string, text: string, options: unknown): void;
}

interface RuleClass {
  prototype: { name?: string };
}

interface RuleInstance {
  name?: string;
}

interface ParserInstance {
  pragmaRules?: RuleInstance[];
  blockRules?:  RuleInstance[];
  inlineRules?: RuleInstance[];
}

interface ParserPrototype {
  pragmaRuleClasses?:  Record<string, RuleClass>;
  blockRuleClasses?:   Record<string, RuleClass>;
  inlineRuleClasses?:  Record<string, RuleClass>;
}

interface WikiLike {
  getTiddlerText?: (title: string, fallback?: string) => string;
}

/**
 * MemeticParser — WikiParser subclass for `text/x-memetic-wikitext`.
 *
 * Module-type: parser. TW5's standard plugin loader registers parsers via
 * `$tw.Wiki.parsers[contentType] = exports[contentType]`, iterating the
 * exports object's keys. The arbitrary-module-namespace-identifier export
 * (`export { MemeticParser as "text/x-memetic-wikitext" }`) compiles to
 * `exports["text/x-memetic-wikitext"] = MemeticParser` in CJS — the shape
 * TW5's loader expects.
 *
 * The standard wikitext parser is `require`d at module-load time. Vite
 * externalizes `$:/` paths so the require survives the bundle — TW5's
 * runtime resolves it.
 */
declare const require: (id: string) => Record<string, ParserCtor>;
const stdParserModule = require("$:/core/modules/parsers/wikiparser/wikiparser.js");
const stdParser: ParserCtor = stdParserModule["text/vnd.tiddlywiki"]!;

function MemeticParser(this: ParserInstance, type: string, text: string, options: unknown): void {
  const wiki = (options as { wiki?: WikiLike } | undefined)?.wiki;
  const override = wiki?.getTiddlerText?.(RULES_CONFIG_TIDDLER, "")?.trim() ?? "";
  const denyList = override.length > 0
    ? new Set(override.split(/\s+/).filter(Boolean))
    : DEFAULT_RULES_EXCEPT;

  stdParser.call(this as object, type, text, options);

  if (Array.isArray(this.pragmaRules)) {
    this.pragmaRules = this.pragmaRules.filter((r) => !r.name || !denyList.has(r.name));
  }
  if (Array.isArray(this.blockRules)) {
    this.blockRules = this.blockRules.filter((r) => !r.name || !denyList.has(r.name));
  }
  if (Array.isArray(this.inlineRules)) {
    this.inlineRules = this.inlineRules.filter((r) => !r.name || !denyList.has(r.name));
  }
}
MemeticParser.prototype = Object.create(stdParser.prototype as object) as ParserPrototype;

export { MemeticParser as "text/x-memetic-wikitext" };

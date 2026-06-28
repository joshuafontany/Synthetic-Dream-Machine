/**
 * has-stack — the single-entity component-stack resolution core.
 *
 * The has-stack law: a carrier reads as a NAMELESS ENTITY; its `tags` field
 * carries the component stack; component definitions live as their own
 * memes at lar:/// addresses (one component, one entity — no shim/pointer
 * tiddlers at rest). Short tags read as RELATIVE addresses and qualify
 * against the carrier's own bag scope (`root/@bag`) by derivation.
 * lar:/// tags pass through already qualified. System (`$:/…`) and
 * free-form tags ride outside the stack. A relative tag whose definition
 * has not landed reads declared-unresolved — fertile, not broken.
 *
 * Platform-blind pure functions; the TW5 surface rides filters/stack.ts.
 *
 * Meme: lar:///ha.ka.ba/@lares/api/pono/has-stack
 */

/** One stack entry: the authored tag and its qualified lar:/// uri (null = outside the stack / unresolvable). */
export interface StackEntry {
  readonly tag: string;
  readonly uri: string | null;
}

/** Matches `lar:///<w.w.w>/<@bag>/…` and captures the scope (version-less). */
const SCOPE_RE = /^lar:\/\/\/(\w+\.\w+\.\w+\/@[\w-]+)\//;

/** A relative component path: word-ish segments joined by `/`. */
const RELATIVE_RE = /^[\w-]+(\/[\w-]+)*$/;

/**
 * Derive the bag scope (`root/@bag`) from a carrier title.
 * Returns null when the title carries no scoped lar:/// address —
 * relative tags on such a carrier stay unresolved.
 */
export function bagScopeOf(carrierTitle: string): string | null {
  const m = SCOPE_RE.exec(carrierTitle);
  return m ? m[1]! : null;
}

/**
 * Qualify one tag against a bag scope.
 * lar:/// → itself · relative path → `lar:///<scope>/<tag>` ·
 * system/free-form, or relative-without-scope → null.
 */
export function qualifyStackTag(tag: string, scope: string | null): string | null {
  if (tag.startsWith("lar:///")) return tag;
  if (!RELATIVE_RE.test(tag)) return null;
  if (!scope) return null;
  return `lar:///${scope}/${tag}`;
}

/** Resolve a carrier's whole tags field into stack entries, order preserved. */
export function stackOf(tags: readonly string[], carrierTitle: string): StackEntry[] {
  const scope = bagScopeOf(carrierTitle);
  return tags.map((tag) => ({ tag, uri: qualifyStackTag(tag, scope) }));
}

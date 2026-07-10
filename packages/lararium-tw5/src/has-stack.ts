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
 * Meme: lar:///ha.ka.ba/lares/api/pono/has-stack
 */

/** One stack entry: the authored tag and its qualified lar:/// uri (null = outside the stack / unresolvable). */
export interface StackEntry {
  readonly tag: string;
  readonly uri: string | null;
}

/** Matches `lar:///<w.w.w>/<namespace>/…` and captures the root + bare namespace. */
const SCOPE_RE = /^lar:\/\/\/(\w+\.\w+\.\w+)\/([\w-]+)\//;

/** The reserved kind-plane words — a namespace never equals one. */
const KIND_PLANES = new Set(["bags", "wikis", "cid"]);

/** A relative component path: word-ish segments joined by `/`. */
const RELATIVE_RE = /^[\w-]+(\/[\w-]+)*$/;

/**
 * Derive the bag scope (`<root>/bags/@<namespace>`) from a carrier title. A meme
 * addresses by its bare namespace (`lar:///ha.ka.ba/sdm/…`); its holding bag is
 * that namespace as a surface (`bags/@sdm`). Returns null when the title carries
 * no scoped meme address (a kind-plane surface, bad arity, or a system title) —
 * relative tags on such a carrier stay unresolved.
 */
export function bagScopeOf(carrierTitle: string): string | null {
  const m = SCOPE_RE.exec(carrierTitle);
  if (!m) return null;
  const root = m[1]!, ns = m[2]!;
  if (KIND_PLANES.has(ns)) return null;        // a surface (bags/@…), not a meme namespace
  return `${root}/bags/@${ns}`;
}

/**
 * Qualify one tag against a bag scope.
 * lar:/// → itself · relative path → the bare-namespace address under the scope ·
 * system/free-form, or relative-without-scope → null.
 */
export function qualifyStackTag(tag: string, scope: string | null): string | null {
  if (tag.startsWith("lar:///")) return tag;
  if (!RELATIVE_RE.test(tag)) return null;
  if (!scope) return null;
  // scope is `<root>/bags/@<ns>`; a meme addresses bare: `<root>/<ns>/<tag>`.
  const bare = scope.replace("/bags/@", "/");
  return `lar:///${bare}/${tag}`;
}

/** Resolve a carrier's whole tags field into stack entries, order preserved. */
export function stackOf(tags: readonly string[], carrierTitle: string): StackEntry[] {
  const scope = bagScopeOf(carrierTitle);
  return tags.map((tag) => ({ tag, uri: qualifyStackTag(tag, scope) }));
}

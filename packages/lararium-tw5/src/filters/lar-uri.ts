/*\
title: lar:///ha.ka.ba/lararium/tw5/filters/lar-uri
type: application/javascript
module-type: filteroperator
\*/
/**
 * lar-uri — read one part of an address, in the vocabulary the URI law already uses.
 *
 * ── WHY THE ADDRESS AND NOT A FIELD ─────────────────────────────────────────────────────────────
 * Belonging lives in the title. A child addressed `lar:///root#a/b` is enclosed by `lar:///root#a`,
 * and the whole relation reads from the name with no stored parent to go stale when a title moves.
 * The wiki still has to ASK, and TiddlyWiki's core here ships no `split` — that gap is the only
 * reason the relation was ever kept in a field.
 *
 * ── THE SUFFIX CARRIES THE PART ─────────────────────────────────────────────────────────────────
 * `[lar-uri:parent[]]`, matching `toml-field` and `wikisense`: the mode rides the suffix and the
 * operand stays free for a genuine parameter. The five law-named chunks read by their own names —
 * scheme · authority · root · path · fragment — so a reader of the filter learns the law and back.
 *
 * `root` holds the LAW's sense: the three-term `w1.w2.w3` heading.angle.dynamic that opens a path.
 * An address stripped of its fragment answers to `bare`, because two meanings under one word in a
 * vocabulary claiming to mirror the law is the collision this grammar keeps finding.
 *
 * ── WHAT THIS OPERATOR REFUSES, AND WHY IT MUST ─────────────────────────────────────────────────
 * An unregistered operator returns an EMPTY LIST in TiddlyWiki — a misspelled part reads exactly like
 * a part that found nothing. So an unknown suffix THROWS. A filter is read by an author who cannot
 * step through it, and silence is the one failure they cannot see.
 *
 * A title outside this grammar reports rather than refuses: it passes through under `parent`, and
 * reads empty under a part it does not carry. Graceful parsing is the deserializer's law and this
 * answers to it — a foreign title is not an error, it is simply not ours.
 */
import type { TW5FilterOperator, TW5FilterSource } from "../types/tiddlywiki.js";

interface Address {
  readonly lar: boolean;
  readonly authority: string;
  readonly root: string;
  readonly path: string;
  readonly fragment: string;
}

/**
 * Divide an address into the law's chunks.
 *
 * Local form opens `lar:///` and carries no authority; session form opens `lar://speaker/` and does.
 * The first path segment is the root, the rest is the path, and everything past the FIRST `#` is the
 * fragment — a later hash belongs to the fragment rather than dividing again.
 */
function divide(title: string): Address {
  if (!title.startsWith("lar://")) {
    return { lar: false, authority: "", root: "", path: "", fragment: "" };
  }
  const hash = title.indexOf("#");
  const beforeHash = hash < 0 ? title : title.slice(0, hash);
  const fragment = hash < 0 ? "" : title.slice(hash + 1);

  const afterScheme = beforeHash.slice("lar://".length);
  const local = afterScheme.startsWith("/");
  const body = local ? afterScheme.slice(1) : afterScheme;
  const firstSlash = local ? -1 : body.indexOf("/");
  const authority = local ? "" : (firstSlash < 0 ? body : body.slice(0, firstSlash));
  const rest = local ? body : (firstSlash < 0 ? "" : body.slice(firstSlash + 1));

  const cut = rest.indexOf("/");
  return {
    lar: true,
    authority,
    root: cut < 0 ? rest : rest.slice(0, cut),
    path: cut < 0 ? "" : rest.slice(cut + 1),
    fragment,
  };
}

/** Every part this operator answers to. An unknown suffix is a fault, never an empty result. */
const PARTS = new Set(["fragment", "parent", "bare", "depth", "root", "path", "authority", "scheme"]);

export function larUri(source: TW5FilterSource, operator: TW5FilterOperator): string[] {
  const part = (operator.suffix ?? "").trim() || "fragment";
  if (!PARTS.has(part)) {
    throw new Error(
      `[lar-uri] no such part "${part}" — this operator reads ${[...PARTS].sort().join(", ")}`,
    );
  }

  const results: string[] = [];
  source(function (_tiddler, title: string) {
    const a = divide(title);

    switch (part) {
      case "parent": {
        // A bare address reports ITSELF, so a template climbs without guarding and simply stops.
        // An empty result here would force every caller to test, and an omitted test drops a root.
        if (a.fragment === "") { results.push(title); return; }
        const cut = a.fragment.lastIndexOf("/");
        const bare = title.slice(0, title.indexOf("#"));
        results.push(cut < 0 ? bare : `${bare}#${a.fragment.slice(0, cut)}`);
        return;
      }
      case "bare":
        results.push(a.fragment === "" ? title : title.slice(0, title.indexOf("#")));
        return;
      case "depth":
        results.push(String(a.fragment === "" ? 0 : a.fragment.split("/").length));
        return;
      case "scheme":
        results.push(a.lar ? "lar" : "");
        return;
      case "authority": results.push(a.authority); return;
      case "root":      results.push(a.root);      return;
      case "path":      results.push(a.path);      return;
      default:          results.push(a.fragment);  return;
    }
  });

  return results;
}

/**
 * THE OPERATOR'S NAME IS ITS EXPORTED NAME, and this one cannot be an identifier.
 *
 * TW5 registers filter operators by walking a module's exports (`applyMethods("filteroperator", …)`),
 * so the binding name IS the name an author types in a filter. Every operator before this one — `toml`,
 * `wikisense`, `stack` — reads as a single word and never met the rule. `lar-uri` carries a hyphen, so
 * a plain `export function larUri` registers `larUri` and the filter an author writes resolves to
 * nothing: no throw, no warning, an empty result set that reads exactly like a filter matching nothing.
 *
 * The arbitrary-string export binds the name the grammar means. Any future operator whose name carries
 * a hyphen needs this line too.
 */
export { larUri as "lar-uri" };

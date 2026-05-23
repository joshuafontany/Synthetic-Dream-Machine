<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/modules/lar-promote >>
```toml iam
uri-path      = "ha.ka.ba/@lararium/v0.1/tw5/modules/lar-promote"
file-path     = "bags/@lararium/v0.1/tw5/modules/lar-promote.md"
type          = "text/x-memetic-wikitext"
register      = "CS"
confidence    = 0.90
mana          = 0.90
role          = "heleuma ka: wiki-internal bag promotion library"
status-date   = "2026-05-18"
heleuma       = "ka"
source-symbol = "*"
module-ref    = "lar:///ha.ka.ba/@lararium/v0.1/tw5/modules/lar-promote"
implements    = ["lar:///ha.ka.ba/@lares/v0.1/api/pono/heleuma/ka"]
body-sha256 = "8ad33a2a1e4af6793fd140d81a4ef2e088a0ce0e873e0a00f8b2df5e19af7ec0"
cacheable     = true
retain        = true
```

<<~&#x0002;>>

<<~ ahu #contract >>

## lar-promote — Contract

Wiki-internal bag promotion library. Runs inside a TW5 wiki VM.

Given a list of `lar:` URIs and a target bag ID, reads the target bag's oracle tiddler (title = bag URI), evaluates its `path-filter` filter to compute the mirror-relative path, writes each tiddler to the target bag with `bag` + `file-path` set, then tombstones the wiki-bag copy so the @lares copy surfaces through the recipe stack.

Design invariants:
- Oracle tiddler title = bag URI (e.g. `lar:///ha.ka.ba/@lares`).
- `path-filter` field = TW5 filter operator string (e.g. `lar-bag-path[lares]`).
- `mirror-root` field = repo-relative path (e.g. `bags/@lares/v0.1`).
- `file-path` = `mirror-root + "/" + relPath` (pure string concat).
- Promote writes target bag copy first, tombstones wiki-bag copy second.
- The @lares copy surfaces through the recipe stack once the wiki-bag copy is removed.

<<~/ahu >>

<<~ ahu #source >>

## Source

```typescript
// @heleuma:required
/**
 * lar-promote — wiki-internal bag promotion library.
 *
 * Runs inside a TW5 wiki VM. The wiki's recipe stack surfaces oracle tiddlers
 * (kind="oracle") from the @lararium bag; each oracle tiddler's title is the
 * bag's lar: URI and carries `path-filter` + `mirror-root` fields so this
 * module can compute the correct `file-path` entirely inside the wiki layer.
 *
 * module-type: library  →  require()able by widgets and actions.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/tw5/modules/lar-promote
 *
 * Design invariants:
 *   - Oracle tiddler title = bag URI (e.g. "lar:///ha.ka.ba/@lares").
 *   - `path-filter` field = TW5 filter operator string (e.g. "lar-bag-path[lares]").
 *   - `mirror-root` field = repo-relative path (e.g. "bags/@lares/v0.1").
 *   - file-path = mirror-root + "/" + relPath  (pure string concat, no path.join).
 *   - Promote = write target bag copy first, tombstone wiki-bag copy second.
 *   - Tombstone routes to the default writable bag (wiki bag) via MemeSyncAdaptor.
 *   - The @lares copy surfaces through the recipe stack once the wiki-bag copy
 *     is removed (wiki bag has HIGHER priority than @lares in recipe order).
 *
 * No external imports — self-contained, runs in browser + Node TW5 VM.
 */

/** Minimal TW5 wiki surface this module requires. */
export interface PromoteWiki {
  getTiddler(title: string): { fields: Record<string, string> } | undefined | null;
  filterTiddlers(filter: string): string[];
  addTiddler(tiddler: unknown): void;
  deleteTiddler(title: string): void;
}

export interface PromoteResult {
  promoted: string[];
  skipped:  string[];
  error?:   string;
}

/**
 * promoteUris — move tiddlers from the wiki bag into a canon bag.
 *
 * For each URI in `uris`:
 *   1. Read the target bag's oracle tiddler (title = targetBagId).
 *   2. Evaluate oracle's `path-filter` over [uri] to get the mirror-relative path.
 *   3. Set `bag` and `file-path` on the tiddler; write via wiki.addTiddler().
 *   4. Tombstone the wiki-bag copy via wiki.deleteTiddler() so @lares surfaces.
 *
 * @param tw     — the TW5 root object (provides Tiddler constructor)
 * @param wiki   — the TW5 wiki object ($tw.wiki)
 * @param uris   — lar: URIs to promote
 * @param targetBagId — e.g. "lar:///ha.ka.ba/@lares"
 */
export function promoteUris(
  tw:          { Tiddler: new (...args: unknown[]) => unknown },
  wiki:        PromoteWiki,
  uris:        string[],
  targetBagId: string,
): PromoteResult {
  const oracle = wiki.getTiddler(targetBagId);
  if (!oracle) {
    return { promoted: [], skipped: uris.slice(), error: "no oracle tiddler: " + targetBagId };
  }

  const pathFilter = oracle.fields["path-filter"];
  const mirrorRoot = oracle.fields["mirror-root"];
  if (!pathFilter || !mirrorRoot) {
    return {
      promoted: [],
      skipped:  uris.slice(),
      error:    "oracle missing path-filter/mirror-root: " + targetBagId,
    };
  }

  const promoted: string[] = [];
  const skipped:  string[] = [];

  for (const uri of uris) {
    const existing = wiki.getTiddler(uri);
    if (!existing) { skipped.push(uri); continue; }

    // Compose filter: put uri into the source set, then map through path-filter.
    // pathFilter = "lar-bag-path[lares]"  →  full filter = "[title[<uri>]lar-bag-path[lares]]"
    const filterExpr = "[title[" + uri + "]" + pathFilter + "]";
    const relPaths = wiki.filterTiddlers(filterExpr);
    if (!relPaths || relPaths.length === 0) { skipped.push(uri); continue; }

    const filePath = mirrorRoot + "/" + relPaths[0];

    // Write to target bag — MemeSyncAdaptor routes by bag field.
    wiki.addTiddler(new tw.Tiddler(existing, { bag: targetBagId, "file-path": filePath }));

    // Tombstone wiki-bag copy — routes to default writable bag (wiki bag).
    // The @lares copy then surfaces through the recipe stack.
    wiki.deleteTiddler(uri);

    promoted.push(uri);
  }

  return { promoted, skipped };
}
```
<<~/ahu >>

<<~ ahu #edges >>

<<~ pranala #to-module ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/modules/lar-promote family:control role:module >>

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>

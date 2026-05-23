/**
 * `lar:` URI resolution for the Lararium carrier spine.
 *
 * Resolution policy:
 * - ha.ka.ba/@lares/v0.1/{path} → packages/lares-core/memes/{path}.md  (primary lares corpus path)
 * - ha.ka.ba/@lararium/v0.1/{pkg}/{path} → packages/lararium-{pkg}/memes/{path}.md  (engine corpus)
 * - AGENTS, LARES, README → virtual until expressed under @lares/v0.1
 * - INDEXES/** and other ALL-CAPS roots → virtual namespace (caps-virtual)
 * - any other shape → virtual (no on-disk path; wiki-only)
 *
 * Removed (S5.7): chapelRelPath / @lares/chapel-perilous-opens — superseded by
 * the bag-mirror system. Unstable URIs that haven't earned a stable @-scope
 * resolve as virtual; promote into @lares or @lararium scope to gain disk.
 *
 * NOTE: `lararium-mesh` is isomorphic — no `fs`, `path`, or `process` imports.
 * File existence and reading are delegated to the host (lararium-node).
 */

export interface LarResolution {
  readonly uri: string;
  readonly root: string;
  readonly childPath: readonly string[];
  /** Composite resource path used for receipts and diagnostics. */
  readonly resourcePath: string;
  /** Relative path within packages/lares-core/memes/ — non-null only for @lares-scoped or caps-file URIs. */
  readonly laresRelPath: string | null;
  /** Relative path within packages/{pkg-slug}/memes/ — non-null only for engine corpus URIs (@lararium/* scope). */
  readonly engineRelPath: string | null;
  readonly kind: "caps-file" | "caps-virtual" | "tuple-file";
  readonly virtual: boolean;
}

/**
 * Parsed hostful lar authority: `lar://alias:tier@host/...`
 * Trust tier is separate from identity — the host speaks, not overrides.
 */
export interface LarAuthority {
  readonly alias: string;
  readonly tier: string;
  readonly host: string;
}

export interface LarHostfulResolution extends LarResolution {
  readonly authority: LarAuthority;
  /** Hostful records never resolve to lares/ files — they function as exchange records. */
  readonly kind: "caps-virtual";
  readonly virtual: true;
}

// Schema: lar:///ha.ka.ba/@lares/v0.1/api/lararium/lar-uri/uri-roots
const CAPS_FILE_ROOTS = new Set<string>();
const VIRTUAL_CAPS_ROOTS = new Set(["INDEXES"]);
const STABLE_TUPLE_ROOT = "ha.ka.ba";
const LARES_SCOPE   = "@lares";
const ENGINE_SCOPE  = "@lararium";

function splitLarUri(uri: string): { root: string; childPath: string[]; fragmentPath: string[] } {
  const url = new URL(uri);
  if (url.protocol !== "lar:") throw new Error(`expected lar URI, got ${uri}`);
  if (url.host) throw new Error(`expected triple-slash lar URI (hostless), got ${uri} — use parseHostfulLarUri for hostful`);
  const rawPath = decodeURIComponent(url.pathname);
  const parts = rawPath.replace(/^\/+/, "").split("/").filter(Boolean);
  if (parts.length === 0) throw new Error(`lar URI needs a root segment: ${uri}`);
  const [root, ...childPath] = parts as [string, ...string[]];
  // Fragment-path (`#parent/child/grandchild`) projects onto disk as nested
  // subdirectories — `lar:///foo#a/b` → `foo/a/b.md`. The single-hash + path
  // invariant comes from lar-uri.md §5.6 / memetic-wikitext.md §nested-ahu.
  const rawHash = decodeURIComponent(url.hash.replace(/^#/, ""));
  const fragmentPath = rawHash ? rawHash.split("/").filter(Boolean) : [];
  return { root, childPath, fragmentPath };
}

/**
 * Parse a hostful `lar://alias:tier@host/path` URI.
 * Returns the authority components and a virtual resolution.
 * Hostful records carry lower trust than hostless invariant memes.
 */
export function parseHostfulLarUri(uri: string): LarHostfulResolution {
  const url = new URL(uri);
  if (url.protocol !== "lar:") throw new Error(`expected lar URI, got ${uri}`);
  if (!url.host) throw new Error(`expected hostful lar URI (lar://alias:tier@host/...), got ${uri}`);

  // URL parser splits "alias:tier@host" as username=alias, password=tier, hostname=host
  const alias = decodeURIComponent(url.username);
  const tier = decodeURIComponent(url.password);
  const host = url.hostname;

  const rawPath = decodeURIComponent(url.pathname);
  const parts = rawPath.replace(/^\/+/, "").split("/").filter(Boolean);
  const [root = "", ...childPath] = parts;
  const resourcePath = [root, ...childPath].join("/");

  return Object.freeze({
    uri,
    root,
    childPath: Object.freeze(childPath),
    resourcePath,
    laresRelPath: null,
    engineRelPath: null,
    kind: "caps-virtual" as const,
    virtual: true as const,
    authority: Object.freeze({ alias, tier, host }),
  });
}

/**
 * Returns true if the URI qualifies as a hostful live exchange record.
 * Hostful records must not silently override hostless invariant memes.
 */
export function isHostfulLarUri(uri: string): boolean {
  try {
    const url = new URL(uri);
    return url.protocol === "lar:" && url.host.length > 0;
  } catch {
    return false;
  }
}

function isTupleRoot(root: string): boolean {
  const parts = root.split(".");
  return parts.length === 3 && parts.every((p) => p.length > 0);
}

function isCapsRoot(root: string): boolean {
  return root === root.toUpperCase() && /[A-Z]/.test(root);
}

function withMdSuffix(p: string): string {
  const lastSegment = p.slice(p.lastIndexOf("/") + 1);
  return lastSegment.includes(".") ? p : p + ".md";
}

/**
 * Resolve a `lar:///...` URI into a LarResolution.
 * Does not perform any I/O — existence checking is the caller's responsibility.
 */
export function resolveLarUri(uri: string): LarResolution {
  const { root, childPath, fragmentPath } = splitLarUri(uri);
  const resourcePath = [root, ...childPath].join("/");

  // `appendFragment` mounts fragment-path segments as nested subdirectories
  // on disk: `lar:///foo#a/b` → `foo/a/b.md`. Files materialize as
  // `<dir>/index.md` for the root + `<dir>/<segs>.md` for each tagged-on-
  // disk descendant. The disk-projector decides which fragment URIs become
  // file roots via `lar:///ha.ka.ba/tags/meme-root`; the path strategy here just
  // names where each URI WOULD project if it earns a file.
  const appendFragment = (basePath: string): string => {
    if (fragmentPath.length === 0) return basePath;
    const baseNoExt = basePath.replace(/\.md$/, "");
    return `${baseNoExt}/${fragmentPath.join("/")}.md`;
  };

  // Caps-file roots resolve only when expressed under @lares/v0.1.
  if (CAPS_FILE_ROOTS.has(root) && childPath.length === 0) {
    const laresRelPath = appendFragment(`${root}.md`);
    return { uri, root, childPath, resourcePath, laresRelPath, engineRelPath: null, kind: "caps-file", virtual: false };
  }

  if (VIRTUAL_CAPS_ROOTS.has(root) || isCapsRoot(root)) {
    return { uri, root, childPath, resourcePath, laresRelPath: null, engineRelPath: null, kind: "caps-virtual", virtual: true };
  }

  if (isTupleRoot(root) && root === STABLE_TUPLE_ROOT) {
    // lar:///ha.ka.ba/@lares/v0.1/{rest} → packages/lares-core/memes/{rest}.md
    if (childPath[0] === LARES_SCOPE) {
      const rest = childPath.slice(1);
      if (rest[0] !== "v0.1") {
        return { uri, root, childPath, resourcePath, laresRelPath: null, engineRelPath: null, kind: "caps-virtual", virtual: true };
      }
      const versionedRest = rest.slice(1);
      if (versionedRest.length === 1 && ["AGENTS", "LARES", "README"].includes(versionedRest[0]!)) {
        return { uri, root, childPath, resourcePath, laresRelPath: appendFragment(`${versionedRest[0]}.md`), engineRelPath: null, kind: "caps-file", virtual: false };
      }
      const joined = versionedRest.length > 0 ? versionedRest.join("/") : "";
      const laresRelPath = appendFragment(joined ? withMdSuffix(joined) : "index.md");
      return { uri, root, childPath, resourcePath, laresRelPath, engineRelPath: null, kind: "tuple-file", virtual: false };
    }

    // lar:///ha.ka.ba/@lararium/v0.1/{pkg}/{path} → packages/lararium-{pkg}/memes/{path}.md
    if (childPath[0] === ENGINE_SCOPE) {
      if (childPath[1] !== "v0.1" || !childPath[2]) {
        return { uri, root, childPath, resourcePath, laresRelPath: null, engineRelPath: null, kind: "caps-virtual", virtual: true };
      }
      const pkgSlug = `lararium-${childPath[2]}`;
      const pathParts = childPath.slice(3);
      const filePath = pathParts.length > 0 ? pathParts.join("/") : "index";
      const engineRelPath = appendFragment(withMdSuffix(`${pkgSlug}/memes/${filePath}`));
      return { uri, root, childPath, resourcePath, laresRelPath: null, engineRelPath, kind: "tuple-file", virtual: false };
    }

    // lar:///ha.ka.ba/@{root-doc}[/@{child-doc}][/{path}] — named doc oracle URI.
    //
    // URI grammar law (pos 0-indexed after lar:///):
    //   pos 1  @name  = root doc identity  (one of six reserved roots)
    //   pos 2  @name  = child doc under root  e.g. @catalog/@elyncia corpus
    //   pos 2+ plain  = leaf path under root  e.g. @lararium/wikis/altar-fire
    //   pos 3+ always plain, never @-prefixed
    //
    // Any @-prefixed segment at pos 1 that is not @lares or @lararium resolves
    // as virtual (doc identity, not a file path).
    // @catalog/@{slug} also resolves as virtual (corpus child-doc identity).
    if (childPath[0]?.startsWith("@")) {
      return { uri, root, childPath, resourcePath, laresRelPath: null, engineRelPath: null, kind: "caps-virtual", virtual: true };
    }

    // ha.ka.ba/{rest} with no @-scope — virtual (no on-disk path).
    // Promote into @lares or @lararium scope to gain a writable disk surface.
    return { uri, root, childPath, resourcePath, laresRelPath: null, engineRelPath: null, kind: "caps-virtual", virtual: true };
  }

  // Other three-segment tuple roots — virtual. Stabilize by promoting into
  // a recognized @-scope or by registering a custom bag mirror in the admin
  // wiki (S5.6+).
  if (isTupleRoot(root)) {
    return { uri, root, childPath, resourcePath, laresRelPath: null, engineRelPath: null, kind: "caps-virtual", virtual: true };
  }

  throw new Error(`unsupported lar root "${root}" in ${uri}`);
}

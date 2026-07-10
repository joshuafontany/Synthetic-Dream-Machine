/**
 * `lar:` URI resolution for the Lararium carrier spine.
 *
 * Resolution policy:
 * - ha.ka.ba/@lares/{path} → packages/lares-core/memes/{path}.mem  (primary lares corpus path)
 * - ha.ka.ba/@lararium/{pkg}/{path} → packages/lararium-{pkg}/memes/{path}.mem  (engine corpus)
 * - AGENTS, LARES, README → virtual until expressed under @lares
 * - INDEXES/** and other ALL-CAPS roots → virtual namespace (caps-virtual)
 * - any other shape → virtual (no on-disk path; wiki-only)
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
 * Parsed hostful lar authority: `lar://alias:grant@host/...`
 * Trust grant is separate from identity — the host speaks, not overrides.
 */
export interface LarAuthority {
  readonly alias: string;
  readonly grant: string;
  readonly host: string;
}

export interface LarHostfulResolution extends LarResolution {
  readonly authority: LarAuthority;
  /** Hostful records never resolve to lares/ files — they function as exchange records. */
  readonly kind: "caps-virtual";
  readonly virtual: true;
}

// Schema: lar:///ha.ka.ba/@lares/api/lararium/lar-uri/uri-roots
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
  // subdirectories — `lar:///foo#a/b` → `foo/a/b.mem`. The single-hash + path
  // invariant comes from lar-uri.md §5.6 / memetic-wikitext.md §nested-ahu.
  const rawHash = decodeURIComponent(url.hash.replace(/^#/, ""));
  const fragmentPath = rawHash ? rawHash.split("/").filter(Boolean) : [];
  return { root, childPath, fragmentPath };
}

/**
 * Parse a hostful `lar://alias:grant@host/path` URI.
 * Returns the authority components and a virtual resolution.
 * Hostful records carry lower trust than hostless invariant memes.
 */
export function parseHostfulLarUri(uri: string): LarHostfulResolution {
  const url = new URL(uri);
  if (url.protocol !== "lar:") throw new Error(`expected lar URI, got ${uri}`);
  if (!url.host) throw new Error(`expected hostful lar URI (lar://alias:grant@host/...), got ${uri}`);

  // URL parser splits "alias:grant@host" as username=alias, password=grant, hostname=host
  const alias = decodeURIComponent(url.username);
  const grant = decodeURIComponent(url.password);
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
    authority: Object.freeze({ alias, grant, host }),
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

/** Append the meme extension when the last segment carries no extension. */
function withMemeSuffix(p: string): string {
  const lastSegment = p.slice(p.lastIndexOf("/") + 1);
  return lastSegment.includes(".") ? p : p + ".mem";
}

/**
 * Resolve a `lar:///...` URI into a LarResolution.
 * Does not perform any I/O — existence checking is the caller's responsibility.
 */
export function resolveLarUri(uri: string): LarResolution {
  const { root, childPath, fragmentPath } = splitLarUri(uri);
  const resourcePath = [root, ...childPath].join("/");

  // `appendFragment` mounts fragment-path segments as nested subdirectories
  // on disk: `lar:///foo#a/b` → `foo/a/b.mem`. Files materialize as
  // `<dir>/index.mem` for the root + `<dir>/<segs>.mem` for each tagged-on-
  // disk descendant. It preserves the base's extension, so a caps-file adapter
  // (`.md`) keeps `.md` fragments while a meme (`.mem`) keeps `.mem`. The disk-
  // projector decides which fragment URIs become file roots via
  // `lar:///ha.ka.ba/tags/meme-root`; this just names where each URI WOULD project.
  const appendFragment = (basePath: string): string => {
    if (fragmentPath.length === 0) return basePath;
    const m = /(\.mem|\.md)$/.exec(basePath);
    const ext = m ? m[1]! : ".mem";
    const baseNoExt = m ? basePath.slice(0, -m[0].length) : basePath;
    return `${baseNoExt}/${fragmentPath.join("/")}${ext}`;
  };

  // Caps-file roots resolve only when expressed under @lares.
  if (CAPS_FILE_ROOTS.has(root) && childPath.length === 0) {
    const laresRelPath = appendFragment(`${root}.md`);
    return { uri, root, childPath, resourcePath, laresRelPath, engineRelPath: null, kind: "caps-file", virtual: false };
  }

  if (VIRTUAL_CAPS_ROOTS.has(root) || isCapsRoot(root)) {
    return { uri, root, childPath, resourcePath, laresRelPath: null, engineRelPath: null, kind: "caps-virtual", virtual: true };
  }

  if (isTupleRoot(root) && root === STABLE_TUPLE_ROOT) {
    // lar:///ha.ka.ba/@lares/{rest} → packages/lares-core/memes/{rest}.mem
    if (childPath[0] === LARES_SCOPE) {
      const rest = childPath.slice(1);
      if (rest.length === 1 && ["AGENTS", "LARES", "README"].includes(rest[0]!)) {
        return { uri, root, childPath, resourcePath, laresRelPath: appendFragment(`${rest[0]}.md`), engineRelPath: null, kind: "caps-file", virtual: false };
      }
      const joined = rest.length > 0 ? rest.join("/") : "";
      const laresRelPath = appendFragment(joined ? withMemeSuffix(joined) : "index.mem");
      return { uri, root, childPath, resourcePath, laresRelPath, engineRelPath: null, kind: "tuple-file", virtual: false };
    }

    // lar:///ha.ka.ba/@lararium/{pkg}/{path} → packages/lararium-{pkg}/memes/{path}.mem
    if (childPath[0] === ENGINE_SCOPE) {
      if (!childPath[1]) {
        return { uri, root, childPath, resourcePath, laresRelPath: null, engineRelPath: null, kind: "caps-virtual", virtual: true };
      }
      const pkgSlug = `lararium-${childPath[1]}`;
      const pathParts = childPath.slice(2);
      const filePath = pathParts.length > 0 ? pathParts.join("/") : "index";
      const engineRelPath = appendFragment(withMemeSuffix(`${pkgSlug}/memes/${filePath}`));
      return { uri, root, childPath, resourcePath, laresRelPath: null, engineRelPath, kind: "tuple-file", virtual: false };
    }

    // lar:///ha.ka.ba/@{bag}[/{path}] — bag-addressed URI.
    //
    // URI grammar law (pos 0-indexed after lar:///):
    //   pos 1  @name  = bag identity (one canonical address per bag)
    //   pos 2+ plain  = tiddler / path inside the bag (never @-prefixed)
    //
    // Any @-prefixed segment at pos 1 that is not @lares or @lararium resolves
    // as virtual (doc identity, not a file path).
    if (childPath[0]?.startsWith("@")) {
      return { uri, root, childPath, resourcePath, laresRelPath: null, engineRelPath: null, kind: "caps-virtual", virtual: true };
    }

    // ha.ka.ba/{rest} with no @-scope — virtual (no on-disk path).
    // Move into @lares or @lararium scope to gain a writable disk surface.
    return { uri, root, childPath, resourcePath, laresRelPath: null, engineRelPath: null, kind: "caps-virtual", virtual: true };
  }

  // Other three-segment tuple roots — virtual. Stabilize by moving into
  // a recognized @-scope or by registering a custom bag mirror in the daemon
  // wiki.
  if (isTupleRoot(root)) {
    return { uri, root, childPath, resourcePath, laresRelPath: null, engineRelPath: null, kind: "caps-virtual", virtual: true };
  }

  throw new Error(`unsupported lar root "${root}" in ${uri}`);
}

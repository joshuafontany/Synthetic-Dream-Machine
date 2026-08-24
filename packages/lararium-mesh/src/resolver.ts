/**
 * `lar:` URI resolution for the Lararium carrier spine — TOPOLOGY ONLY.
 *
 * It answers what a URI NAMES: its root, its child path, whether the shape carries a caps root, and
 * whether anything on disk could back it. It answers nothing about WHERE — and that separation follows
 * the scheme's own law, since `lar:` names and never fetches.
 *
 * ── WHY NO DISK MAPPING LIVES HERE ANY LONGER ───────────────────────────────────────────────────
 * An earlier shape carried one: `ha.ka.ba/lares/{path}` → `packages/lares-core/memes/{path}.mem`, and a
 * matching rule for the engine packages. The corpus then moved into `bags/`, those trees stopped
 * existing, and the mapping kept computing paths that named nothing. Nothing joined them — no production
 * caller ever read the fields — so the rot surfaced nowhere and the header went on instructing every
 * reader, human or agent, to look in a directory the repo had deleted.
 *
 * A mapping nobody joins cannot go stale LOUDLY; it can only mislead quietly. So it went, rather than
 * getting re-pointed at `bags/` and inviting the same silence next time the corpus moves.
 *
 * DISK RESOLUTION RIDES THE CARRIER WALK instead (`listCarriers` over a bag directory), where a wrong
 * path fails immediately and visibly against a real filesystem.
 *
 * NOTE: `lararium-mesh` stays isomorphic — no `fs`, `path`, or `process` imports. The host reads files.
 *
 * Resolution policy:
 * - AGENTS, LARES, README → virtual until expressed under the lares bag
 * - INDEXES/** and other ALL-CAPS roots → virtual namespace (caps-virtual)
 * - a stable-tuple root with a corpus scope → tuple-file (a carrier MAY back it; the host decides)
 * - any other shape → virtual (wiki-only)
 */

export interface LarResolution {
  readonly uri: string;
  readonly root: string;
  readonly childPath: readonly string[];
  /** Composite resource path used for receipts and diagnostics. */
  readonly resourcePath: string;
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

// Schema: lar:///ha.ka.ba/lares/api/lararium/lar-uri/uri-roots
const CAPS_FILE_ROOTS = new Set<string>();
const VIRTUAL_CAPS_ROOTS = new Set(["INDEXES"]);
const STABLE_TUPLE_ROOT = "ha.ka.ba";
const LARES_SCOPE   = "lares";
const ENGINE_SCOPE  = "lararium";

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

  // Caps-file roots resolve only when expressed under the lares bag.
  if (CAPS_FILE_ROOTS.has(root) && childPath.length === 0) {
    return { uri, root, childPath, resourcePath, kind: "caps-file", virtual: false };
  }

  if (VIRTUAL_CAPS_ROOTS.has(root) || isCapsRoot(root)) {
    return { uri, root, childPath, resourcePath, kind: "caps-virtual", virtual: true };
  }

  if (isTupleRoot(root) && root === STABLE_TUPLE_ROOT) {
    if (childPath[0] === LARES_SCOPE) {
      const rest = childPath.slice(1);
      if (rest.length === 1 && ["AGENTS", "LARES", "README"].includes(rest[0]!)) {
        return { uri, root, childPath, resourcePath, kind: "caps-file", virtual: false };
      }
      const joined = rest.length > 0 ? rest.join("/") : "";
      return { uri, root, childPath, resourcePath, kind: "tuple-file", virtual: false };
    }

    if (childPath[0] === ENGINE_SCOPE) {
      if (!childPath[1]) {
        return { uri, root, childPath, resourcePath, kind: "caps-virtual", virtual: true };
      }
      const pkgSlug = `lararium-${childPath[1]}`;
      const pathParts = childPath.slice(2);
      const filePath = pathParts.length > 0 ? pathParts.join("/") : "index";
      return { uri, root, childPath, resourcePath, kind: "tuple-file", virtual: false };
    }

    // lar:///ha.ka.ba/{bags|wikis}/{slug}[/{path}] — a CRDT surface addressed by
    // its kind-plane. The KIND SEGMENT names it; the slug that follows carries no marker and needs
    // none, because the segment above it already said which plane this is. Its interior is
    // doc/registry data, never a corpus file, so it resolves virtual — doc identity, not a disk path.
    //
    // A third arm here matched a bare leading `@`, from when the slug carried the marker instead of the
    // segment. Routing on it kept a retired address form REACHABLE: anything still minting one would
    // have resolved correctly and gone unnoticed, which is how a retired form outlives its retirement.
    if (childPath[0] === "bags" || childPath[0] === "wikis") {
      return { uri, root, childPath, resourcePath, kind: "caps-virtual", virtual: true };
    }

    // ha.ka.ba/{rest} — a bare meme namespace with no lares/lararium disk mapping;
    // virtual (its file lives in its holding bag on disk, resolved elsewhere).
    return { uri, root, childPath, resourcePath, kind: "caps-virtual", virtual: true };
  }

  // Other three-segment tuple roots — virtual. Stabilize by moving into
  // a recognized @-scope or by registering a custom bag mirror in the daemon
  // wiki.
  if (isTupleRoot(root)) {
    return { uri, root, childPath, resourcePath, kind: "caps-virtual", virtual: true };
  }

  throw new Error(`unsupported lar root "${root}" in ${uri}`);
}

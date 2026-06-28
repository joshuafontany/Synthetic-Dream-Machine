/**
 * tw5-file-info — the native-tiddler PROJECTION cascade, ported PURE and run
 * inside the island VM (the reciprocal of `Tw5Deserializer`, which runs LOAD's
 * deserialize). TW5's `core-server/filesystem.js` lives Node-only and is ABSENT
 * from the island's browser core blob — but every primitive the PURE path-cascade
 * needs IS present in-VM (`$tw.wiki.filterTiddlers`, `makeTiddlerIterator`,
 * `$tw.config.contentTypeInfo`, `getFileExtensionInfo`, `getTypeEncoding`,
 * `transliterate`, and `$tw.Tiddler`'s own field serializers). So we port the
 * pure control flow of `generateTiddlerFileInfo` + `generateTiddlerFilepath`
 * (filesystem.js:213-381) and DELEGATE field/byte serialization to `$tw.Tiddler`
 * — byte-identical to TW5's `saveTiddlerToFileSync` (filesystem.js:459-475).
 *
 * VM-authority: the path, the type-selection, and the exact bytes are all decided
 * HERE, in the VM. The Node disk-projector only resolves under the bag mirror root,
 * confines the path, and writes the bytes — it is never the authority.
 *
 * NOT ported (Node-only, the projector's job): the `fs.existsSync` uniquifier and
 * the `$tw.boot`/`th-make-tiddler-path` write-path encoding (filesystem.js:382-408).
 *
 * Meme: lar:///ha.ka.ba/@lararium/tw5/tw5-file-info
 */

import type { TW5Instance } from "./types/tiddlywiki.js";

/** The native file info the projector writes: a relative path + the exact bytes. */
export interface Tw5FileInfo {
  /** Path relative to the bag mirror root (forward slashes), extension included. */
  readonly relPath: string;
  /** The chosen extension (".tid" / ".json" / a content-type extension). */
  readonly ext: string;
  /** The FILE type (not the tiddler type): application/x-tiddler | application/json | a content-type. */
  readonly type: string;
  /** True when a companion `<relPath>.meta` sidecar carries the fields. */
  readonly hasMetaFile: boolean;
  /** Bytes for the main file. */
  readonly body: string;
  /** Bytes for the `.meta` sidecar, present only when hasMetaFile. */
  readonly metaBody?: string;
}

export interface Tw5FileInfoOptions {
  /** Filter cascade for the base path (the lar-native mirror of $:/config/FileSystemPaths). */
  readonly pathFilters?: readonly string[];
  /** Filter cascade for the extension override ($:/config/FileSystemExtensions). */
  readonly extFilters?: readonly string[];
}

/** Run a filter cascade over a single tiddler title; the first non-empty result wins. */
function firstFilterResult($tw: TW5Instance, title: string, filters: readonly string[] | undefined): string | undefined {
  if (!filters || filters.length === 0) return undefined;
  for (const filter of filters) {
    if (!filter) continue;
    const source = $tw.wiki.makeTiddlerIterator([title]);
    const result = $tw.wiki.filterTiddlers(filter, undefined, source);
    if (result.length > 0) return result[0];
  }
  return undefined;
}

/** Port of generateTiddlerFilepath's PURE sanitization (filesystem.js:317-381). */
function sanitizeFilepath($tw: TW5Instance, base: string): string {
  let filepath = base;
  // Windows reserved device names
  filepath = filepath.replace(/^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i, "_$1_");
  // Leading spaces → underscores
  filepath = filepath.replace(/^ +/, (u) => u.replace(/ /g, "_"));
  // Don't let the filename start with dots (invisible on *nix)
  if (!/^\.{1,2}[/\\]/g.test(filepath)) {
    filepath = filepath.replace(/^\.+/g, (u) => u.replace(/\./g, "_"));
  }
  // Unicode control codes
  filepath = filepath.replace(/[\x00-\x1f\x80-\x9f]/g, "_");
  // Cross-platform-illegal chars, then transliterate
  filepath = $tw.utils.transliterate(filepath.replace(/<|>|~|:|"|\||\?|\*|\^/g, "_"));
  return filepath;
}

/**
 * Compute the native file info for a tiddler — path (via the filter cascade),
 * type-selection (.tid / content+.meta / .json), and the exact bytes. Pure on
 * `$tw`; no `fs`, no Node imports. The `relPath` is mirror-root-relative; the
 * projector resolves + confines it.
 */
export function makeTw5FileInfo(
  $tw: TW5Instance,
  title: string,
  fields: Record<string, unknown>,
  opts: Tw5FileInfoOptions = {},
): Tw5FileInfo {
  const tiddler = new $tw.Tiddler(fields as Record<string, string>);

  // ── Type selection (filesystem.js:213-270) ──────────────────────────────
  let fileType: string;
  let hasMetaFile: boolean;
  // Unsafe fields → JSON (control chars, leading/trailing ws, or ':'/'#' in a name)
  let hasUnsafeFields = false;
  const fieldStrings = tiddler.getFieldStrings() as Record<string, string>;
  for (const fieldName of Object.keys(fieldStrings)) {
    const value = fieldStrings[fieldName]!;
    if (fieldName !== "text") {
      hasUnsafeFields = hasUnsafeFields || /[\x00-\x1F]/m.test(value);
      hasUnsafeFields = hasUnsafeFields || $tw.utils.trim(value) !== value;
    }
    hasUnsafeFields = hasUnsafeFields || /:|#/m.test(fieldName);
  }
  let extOverride: string | undefined;
  if (hasUnsafeFields) {
    fileType = "application/json";
    hasMetaFile = false;
  } else {
    const tiddlerType = (fields["type"] as string) || "text/vnd.tiddlywiki";
    if (tiddlerType === "text/vnd.tiddlywiki" || tiddlerType === "text/vnd.tiddlywiki-multiple" || tiddler.hasField("_canonical_uri")) {
      fileType = "application/x-tiddler"; // .tid
      hasMetaFile = false;
    } else {
      fileType = tiddlerType; // content file + .meta sidecar
      hasMetaFile = true;
    }
    // Extension-override cascade
    extOverride = firstFilterResult($tw, title, opts.extFilters);
    if (extOverride) {
      if (extOverride === ".tid") { fileType = "application/x-tiddler"; hasMetaFile = false; }
      else if (extOverride === ".json") { fileType = "application/json"; hasMetaFile = false; }
      else {
        const extInfo = $tw.utils.getFileExtensionInfo(extOverride);
        fileType = extInfo ? extInfo.type : fileType;
        hasMetaFile = true;
      }
    }
  }
  const contentTypeInfo = $tw.config.contentTypeInfo[fileType] || { extension: "" };
  const extRaw = extOverride || contentTypeInfo.extension || "";
  const ext: string = Array.isArray(extRaw) ? (extRaw[0] ?? "") : extRaw;

  // ── Path (filesystem.js:317-381, PURE part) ─────────────────────────────
  let base = firstFilterResult($tw, title, opts.pathFilters);
  if (!base) {
    base = title.replace(/\/|\\/g, "_"); // no path separators → no stray dirs
  }
  let filepath = sanitizeFilepath($tw, base);
  // Drop a trailing copy of the extension, then truncate
  if (ext && filepath.substring(filepath.length - ext.length) === ext) {
    filepath = filepath.substring(0, filepath.length - ext.length);
  }
  if (filepath.length > 200) filepath = filepath.substr(0, 200);
  if (!filepath || /^_+$/g.test(filepath)) {
    // All-punctuation title → char codes (filesystem.js:371-381)
    filepath = title.split("").map((c) => c.charCodeAt(0).toString()).join("-");
  }
  const relPath = filepath + ext;

  // ── Bytes — delegate to $tw.Tiddler (byte-identical to saveTiddlerToFileSync) ──
  let body: string;
  let metaBody: string | undefined;
  if (hasMetaFile) {
    body = String(fields["text"] ?? "");
    metaBody = tiddler.getFieldStringBlock({ exclude: ["text", "bag"] });
  } else if (fileType === "application/x-tiddler") {
    const block = tiddler.getFieldStringBlock({ exclude: ["text", "bag"] });
    const text = fields["text"] ? "\n\n" + String(fields["text"]) : "";
    body = block + text;
  } else {
    // application/json
    const jsonSpaces = $tw.config.preferences?.jsonSpaces ?? 4;
    body = JSON.stringify([tiddler.getFieldStrings({ exclude: ["bag"] })], null, jsonSpaces);
  }

  return { relPath, ext, type: fileType, hasMetaFile, body, ...(metaBody !== undefined ? { metaBody } : {}) };
}

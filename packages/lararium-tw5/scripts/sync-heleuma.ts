/**
 * sync-heleuma.ts — drift check, patch, and corpus-promotion scan.
 *
 * Modes (mutually exclusive flags):
 *   (none)            Dry-run: report drift/missing, write nothing.
 *   --commit          Patch #source slots in-place to match live TS source.
 *   --scan            Scan packages/ for exported symbols that lack a heleuma pair.
 *   --scan-promote    Scan packages/ for pure-data constants that should become
 *                     first-class corpus memes in lares/ (not heleuma anchors —
 *                     things that can MOVE to lares/ and be deleted from packages/).
 *   --scan-decorators Scan for convention-based decorator files (filter operators,
 *                     widgets) that lack heleuma memes. With --commit, scaffolds
 *                     missing memes automatically.
 *
 * heleuma modes:
 *   ha — body/structure anchor: permanent compiled-in territory, no promotion path.
 *   ka — soul/fire anchor: promotion-eligible; #source + body-sha256 track readiness; keyhive proof is layer 3 (planned).
 *   ba — psyche/path anchor: quine-only; #source slot sufficient for reconstruction.
 *
 * Decorator file conventions (--scan-decorators):
 *   <pkg>/src/filters/<name>.ts  → filter-operator memes → lararium-tw5/memes/filters/
 *   <pkg>/src/widgets/<name>.ts  → widget memes          → lararium-tw5/memes/widgets/
 *
 * Run:
 *   pnpm --filter @lararium/tw5 build:heleuma                       # dry-run (build gate)
 *   pnpm --filter @lararium/tw5 build:heleuma --commit              # patch #source slots
 *   pnpm --filter @lararium/tw5 build:heleuma --scan                # find heleuma candidates
 *   pnpm --filter @lararium/tw5 build:heleuma --scan-promote        # find corpus-promotion candidates
 *   pnpm --filter @lararium/tw5 build:heleuma --scan-decorators     # find decorator files lacking memes
 *   pnpm --filter @lararium/tw5 build:heleuma --scan-decorators --commit  # scaffold missing memes
 */

import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, existsSync } from "fs";
import { execSync } from "child_process";
import { createHash } from "crypto";
import { resolve, relative, dirname } from "path";
import { fileURLToPath } from "url";
import { repoRoot } from "@lararium/mesh/node";

const root     = repoRoot;
const pkgsRoot = resolve(root, "packages");
/** Canonical bag mirror for @lararium/tw5 memes. */
const tw5MemesRoot = resolve(root, "bags", "@lararium", "tw5");

const args             = process.argv.slice(2);
const COMMIT           = args.includes("--commit");
const SCAN             = args.includes("--scan");
const SCAN_PROMOTE     = args.includes("--scan-promote");
const SCAN_DECORATORS  = args.includes("--scan-decorators");
const SYNC_MODULES     = args.includes("--sync-modules");

// ---------------------------------------------------------------------------
// Regex patterns
// ---------------------------------------------------------------------------

const SOH_URI_RE     = /<<~[^>]*&#x0001;[^>]*\?\s*->\s*([^\s>]+)\s*>>/;
const TOML_RE        = /```toml([\s\S]*?)```/;
const SOURCE_SLOT_RE = /<<~ ahu #source >>([\s\S]*?)<<~\/ahu >>/;
const FENCE_RE       = /```[^\n]*\n([\s\S]*?)\n```/;

function parseToml(block: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of block.split("\n")) {
    const m = line.match(/^([\w-]+)\s*=\s*(.+)$/);
    if (!m) continue;
    out[m[1]!] = m[2]!.trim().replace(/^"|"$/g, "");
  }
  return out;
}

// ---------------------------------------------------------------------------
// File walkers
// ---------------------------------------------------------------------------

function walkExt(dir: string, ext: string): string[] {
  const results: string[] = [];
  try {
    for (const entry of readdirSync(dir)) {
      const full = resolve(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) results.push(...walkExt(full, ext));
      else if (entry.endsWith(ext)) results.push(full);
    }
  } catch { /* missing dir — return empty */ }
  return results;
}

// ---------------------------------------------------------------------------
// Symbol extractor
// ---------------------------------------------------------------------------

function extractSymbol(srcPath: string, symbol: string): string | null {
  const absPath = resolve(root, srcPath);
  if (!existsSync(absPath)) return null;
  const src = readFileSync(absPath, "utf8");

  // "*" = whole file — for small composable TS modules where the file IS the source.
  // build:heleuma places the full TS file in the #source ahu; small files are required.
  if (symbol === "*") return src;

  const lines = src.split("\n");
  const declRe = new RegExp(
    `^\\s*(export\\s+)?(const\\s+|private\\s+|public\\s+|protected\\s+|static\\s+|async\\s+|function\\s+)*${symbol}\\s*(?::[^=(]*)?\\s*(\\(|=)`
  );
  const startIdx = lines.findIndex(
    (l: string) => declRe.test(l) && !/^\s*(\/\/|\*)/.test(l)
  );
  if (startIdx === -1) return null;

  let depth = 0, started = false;
  const collected: string[] = [];
  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i]!;
    for (const ch of line) {
      if (ch === "{" || ch === "[") { depth++; started = true; }
      if (ch === "}" || ch === "]") depth--;
    }
    collected.push(line);
    if (started && depth === 0) break;
  }
  return collected.join("\n");
}

// ---------------------------------------------------------------------------
// Drift check
// ---------------------------------------------------------------------------

function checkDrift(memeSlot: string, liveSource: string): string | null {
  const fenceMatch = FENCE_RE.exec(memeSlot);
  const stripped   = fenceMatch ? fenceMatch[1]!.trim() : memeSlot.trim();
  const live       = liveSource.trim();
  if (stripped === live) return null;
  return `meme has ${stripped.split("\n").length} lines, live has ${live.split("\n").length} lines`;
}

// ---------------------------------------------------------------------------
// Commit: patch #source slot and/or body-sha256 in one write
// ---------------------------------------------------------------------------

// Returns patched content, or null if the #source slot is missing/unparseable.
function applySourcePatch(content: string, liveCode: string): string | null {
  const slotM = SOURCE_SLOT_RE.exec(content);
  if (!slotM) return null;
  const fenceM = FENCE_RE.exec(slotM[1]!);
  if (!fenceM) return null;

  const fenceStart = content.indexOf(fenceM[0], slotM.index);
  const fenceEnd   = fenceStart + fenceM[0].length;
  const lang       = fenceM[0].match(/^```([^\n]*)/)![1] ?? "typescript";
  const newFence   = "```" + lang + "\n" + liveCode + "\n```";
  return content.slice(0, fenceStart) + newFence + content.slice(fenceEnd);
}

// Patches body-sha256 in the first ```toml block (the root toml iam prelude).
// Adds the field if absent; replaces it if stale.
function applyBodySha256Patch(content: string, sha256: string): string {
  const SHA_FIELD = /^body-sha256\s*=\s*"[^"]*"/m;
  if (SHA_FIELD.test(content)) {
    return content.replace(SHA_FIELD, `body-sha256 = "${sha256}"`);
  }
  // Insert before the closing ``` of the first toml fence
  return content.replace(/(```toml[\s\S]*?)(\n```)/, `$1\nbody-sha256 = "${sha256}"$2`);
}

// ---------------------------------------------------------------------------
// --scan: find candidates in packages/ lacking a heleuma pair
// ---------------------------------------------------------------------------

function runScan(): void {
  // Collect all URIs that already have a heleuma API meme
  const existingUris = new Set<string>();
  for (const mdPath of walkExt(tw5MemesRoot, ".md")) {
    const content = readFileSync(mdPath, "utf8");
    const tomlM   = TOML_RE.exec(content);
    if (!tomlM) continue;
    const toml = parseToml(tomlM[1]!);
    if (toml["heleuma"]) {
      const sf = toml["source-file"] ?? "";
      const ss = toml["source-symbol"] ?? "";
      if (sf) existingUris.add(`${sf}::${ss}`);
    }
  }

  // Patterns that suggest a function is a good heleuma candidate
  // ha: config objects, constants, JSON shapes — structural territory
  // ka: standalone exported/private functions — promotion-eligible
  // ba: imperative registrations, side-effect-only calls — path markers
  const HA_RE = /^\s*export\s+const\s+\w+\s*[=:]/;
  const KA_RE = /^\s*(export\s+)?(private\s+static\s+|public\s+static\s+)?\s*(async\s+)?function\s+\w+\s*\(|^\s*(private|public|protected)\s+(static\s+)?(async\s+)?\w+\s*\(/;

  interface Candidate { file: string; symbol: string; line: number; mode: "ha" | "ka" | "ba" }
  const candidates: Candidate[] = [];

  // Only scan src/ dirs under packages/ (skip node_modules, dist, scripts)
  for (const tsPath of walkExt(pkgsRoot, ".ts")) {
    const rel = relative(root, tsPath);
    if (rel.includes("node_modules") || rel.includes("/dist/") || rel.includes("/scripts/")) continue;

    const src   = readFileSync(tsPath, "utf8");
    const lines = src.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      let mode: "ha" | "ka" | "ba" | null = null;
      let symbol = "";

      if (KA_RE.test(line) && !/^\s*(\/\/|\*)/.test(line)) {
        const m = line.match(/(?:function\s+|static\s+(?:async\s+)?)(\w+)\s*\(/) ??
                  line.match(/(?:private|public|protected)\s+(?:static\s+)?(?:async\s+)?(\w+)\s*\(/);
        if (m) { mode = "ka"; symbol = m[1]!; }
      } else if (HA_RE.test(line)) {
        const m = line.match(/export\s+const\s+(\w+)/);
        if (m) { mode = "ha"; symbol = m[1]!; }
      }

      if (!mode || !symbol) continue;
      const key = `${rel}::${symbol}`;
      if (existingUris.has(key)) continue;
      // Skip trivial/internal names
      if (/^_|^tmp|^i$|^j$|^k$|^n$/.test(symbol)) continue;

      candidates.push({ file: rel, symbol, line: i + 1, mode });
    }
  }

  if (candidates.length === 0) {
    console.log("[heleuma/scan] No new candidates found — all exportable symbols have pairs.");
    return;
  }

  const byMode: Record<string, Candidate[]> = { ha: [], ka: [], ba: [] };
  for (const c of candidates) byMode[c.mode]!.push(c);

  console.log(`[heleuma/scan] ${candidates.length} candidate(s) without heleuma pairs:\n`);

  for (const mode of ["ha", "ka", "ba"] as const) {
    const list = byMode[mode]!;
    if (list.length === 0) continue;
    console.log(`  ${mode.toUpperCase()} (${mode === "ha" ? "structural constants" : mode === "ka" ? "promotion-eligible functions" : "path markers"}):`);
    for (const c of list.slice(0, 20)) {
      console.log(`    ${c.file}:${c.line}  ${c.symbol}`);
    }
    if (list.length > 20) console.log(`    ... and ${list.length - 20} more`);
    console.log();
  }

  console.log("[heleuma/scan] For each candidate:");
  console.log("  ha — create API meme with heleuma=\"ha\", source-file, #source slot (no ceremony fields).");
  console.log("  ka — create API meme with heleuma=\"ka\", source-file, source-symbol, #source slot.");
  console.log("  ba — create API meme with heleuma=\"ba\", #source slot sufficient for reconstruction.");
}

// ---------------------------------------------------------------------------
// --scan-promote: find pure-data constants that should become corpus memes
//
// A constant is a corpus-promotion candidate when ALL of the following hold:
//   1. It is `export const NAME = <value>` (not a function, not a class)
//   2. Its value body contains only literals: strings, numbers, booleans,
//      arrays/objects composed of the above. No function calls, no `new`,
//      no identifier references that are not other plain literals or types.
//   3. It is NOT already present in lares/ as a meme (checked by name match).
//
// Three sub-categories surface in the output:
//   vocab    — string/number tuple arrays (AS CONST tuples); become TOML arrays
//   map      — Record<string, string|number> objects; become TOML tables
//   tiddler  — objects containing a `title:` field; these ARE tiddlers already
// ---------------------------------------------------------------------------

function runScanPromote(): void {
  // Collect names already present as corpus memes in lararium-tw5/memes/.
  // Checks: uri-path basename, source-symbol, and TOML keys in any #schema slot.
  const existingNames = new Set<string>();
  const VOCAB_SLOT_RE = /<<~ ahu #schema >>([\s\S]*?)<<~\/ahu >>/g;

  for (const mdPath of walkExt(tw5MemesRoot, ".md")) {
    const content = readFileSync(mdPath, "utf8");
    const tomlM   = TOML_RE.exec(content);
    if (!tomlM) continue;
    const toml = parseToml(tomlM[1]!);
    // Match by uri-path basename and by source-symbol
    const uriBase = (toml["uri-path"] ?? "").split("/").pop() ?? "";
    if (uriBase) existingNames.add(uriBase.toLowerCase());
    const ss = toml["source-symbol"] ?? "";
    if (ss)   existingNames.add(ss.toLowerCase());

    // Also extract TOML keys from #vocab slots — these are promoted constants
    let vm: RegExpExecArray | null;
    VOCAB_SLOT_RE.lastIndex = 0;
    while ((vm = VOCAB_SLOT_RE.exec(content)) !== null) {
      const fenceM = FENCE_RE.exec(vm[1]!);
      if (!fenceM) continue;
      for (const line of fenceM[1]!.split("\n")) {
        // Top-level key lines: "key = ..." or "[section]" — extract the key name
        const keyM = line.match(/^([a-z][a-z0-9-]*)\s*=/i) ?? line.match(/^\[([a-z][a-z0-9-]*)\]/i);
        if (keyM) {
          // Normalise: kebab-case → underscore + uppercase variants
          const k = keyM[1]!;
          existingNames.add(k.toLowerCase());
          existingNames.add(k.replace(/-/g, "_").toLowerCase());
          // Also match the SCREAMING_SNAKE form used in TS (e.g. ladder-5 → LADDER_5)
          existingNames.add(k.replace(/-/g, "_").toUpperCase().toLowerCase());
        }
      }
    }
  }

  interface Promote {
    file: string; line: number; name: string;
    subtype: "vocab" | "map" | "tiddler";
    note: string;
  }
  const found: Promote[] = [];

  // Heuristic: extract the value block of `export const NAME = <block>` and
  // classify it. We collect lines until the brace/bracket depth returns to 0.
  const CONST_DECL_RE = /^\s*export\s+const\s+([A-Z][A-Z0-9_]*)\s*(?::[^=]+)?\s*=\s*(.*)$/;

  for (const tsPath of walkExt(pkgsRoot, ".ts")) {
    const rel = relative(root, tsPath);
    if (rel.includes("node_modules") || rel.includes("/dist/") ||
        rel.includes("/scripts/")    || rel.includes("/tests/") ||
        rel.includes(".test.")       || rel.includes(".spec.")) continue;

    const src   = readFileSync(tsPath, "utf8");
    const lines = src.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      const dm = CONST_DECL_RE.exec(line);
      if (!dm) continue;

      const name    = dm[1]!;
      const opener  = dm[2]!.trim();

      // Skip if already in lares
      if (existingNames.has(name.toLowerCase())) continue;
      // Skip small utility constants (≤3 chars, or single underscore prefix)
      if (name.length <= 3 || name.startsWith("_")) continue;

      // Collect the full value block (multi-line)
      let depth = 0, body = "";
      for (let j = i; j < Math.min(i + 60, lines.length); j++) {
        const l = lines[j]!;
        body += (j === i ? opener : l) + "\n";
        for (const ch of l) {
          if (ch === "[" || ch === "{" || ch === "(") depth++;
          if (ch === "]" || ch === "}" || ch === ")") depth--;
        }
        if (j === i && depth === 0 && (opener.startsWith("[") || opener.startsWith("{"))) break;
        if (j > i && depth <= 0) break;
      }

      // Reject if body contains function calls, `new`, or arrow functions
      // (these are not pure data)
      if (/\bnew\b|\b=>\b/.test(body)) continue;
      // Allow known safe calls: `as const`, `pageId(` is a template helper —
      // flag tiddler-shaped objects containing these as "review"
      const hasCalls = /\b\w+\s*\(/.test(body.replace(/pageId\(/g, ""));
      if (hasCalls) continue;

      // Classify
      let subtype: "vocab" | "map" | "tiddler" = "vocab";
      if (/\btitle\s*:/.test(body))        subtype = "tiddler";
      else if (opener.startsWith("{"))     subtype = "map";
      else if (opener.startsWith("["))     subtype = "vocab";
      else continue; // scalar constant — not interesting for corpus migration

      const note =
        subtype === "tiddler" ? "has title: field — this IS a tiddler" :
        subtype === "map"     ? "string/number Record — becomes TOML table" :
                                "string tuple — becomes TOML array";

      found.push({ file: rel, line: i + 1, name, subtype, note });
    }
  }

  if (found.length === 0) {
    console.log("[promote] No pure-data constants found without corpus memes — fully promoted.");
    return;
  }

  const byType: Record<string, Promote[]> = { tiddler: [], vocab: [], map: [] };
  for (const f of found) byType[f.subtype]!.push(f);

  console.log(`[promote] ${found.length} constant(s) that can become first-class corpus memes:\n`);

  const labels: Record<string, string> = {
    tiddler: "TIDDLER-SHAPED (move to lares/ as .md, delete from packages/)",
    vocab:   "VOCABULARY TUPLES (move to lares/ as TOML array memes)",
    map:     "LOOKUP MAPS (move to lares/ as TOML table memes)",
  };

  for (const sub of ["tiddler", "vocab", "map"] as const) {
    const list = byType[sub]!;
    if (list.length === 0) continue;
    console.log(`  ${labels[sub]}:`);
    for (const c of list) {
      console.log(`    ${c.file}:${c.line}  ${c.name}`);
      console.log(`      → ${c.note}`);
    }
    console.log();
  }

  console.log("[promote] Next step: for each item above, create a corpus meme in lares/");
  console.log("  and replace the TS import with a corpus query or remove it entirely.");
}

// ---------------------------------------------------------------------------
// --sync-modules: walk lares/ for anchors with module-ref, verify/patch
//   body-sha256 against the actual module tiddler body (between STX and ETX).
//   In --commit mode: also re-extracts and strips TypeScript source from
//   source-file/source-symbol, injects into module tiddler body if drifted.
// ---------------------------------------------------------------------------

/** Extract the body text between <<~\x02>> and <<~\x03>> from a module tiddler. */
function extractModuleBody(content: string): string | null {
  // STX marker may be raw \x02 or the HTML entity form
  const stxRe = /<<~(?:&#x0002;|[\x02])>>/;
  const etxRe = /<<~(?:&#x0003;|[\x03])>>/;
  const stxM = stxRe.exec(content);
  const etxM = etxRe.exec(content);
  if (!stxM || !etxM) return null;
  const start = stxM.index + stxM[0].length;
  const end   = etxM.index;
  if (end <= start) return null;
  return content.slice(start, end);
}


function runSyncModules(): { drift: number; missing: number; patched: number } {
  let drift = 0, missing = 0, patched = 0;

  for (const mdPath of walkExt(tw5MemesRoot, ".md")) {
    const content = readFileSync(mdPath, "utf8");
    const tomlM   = TOML_RE.exec(content);
    if (!tomlM) continue;
    const toml = parseToml(tomlM[1]!);

    const moduleRef = toml["module-ref"];
    if (!moduleRef) continue;

    // Convert lar URI to file path: lar:///ha.ka.ba/@lararium/tw5/{rest} -> tw5MemesRoot/{rest}.md
    const uriTrimmed = moduleRef.replace(/^lar:\/\/\//, "");
    const parts      = uriTrimmed.split("/");
    // Strip ha.ka.ba/@lararium/tw5 prefix (4 segments)
    const rest       = (parts[0] === "ha.ka.ba" && parts[1] === "@lararium" && parts[2] === "tw5")
      ? parts.slice(3).join("/")
      : parts.slice(2).join("/"); // legacy fallback
    const modPath    = resolve(tw5MemesRoot, `${rest}.md`);

    let modContent: string;
    try {
      modContent = readFileSync(modPath, "utf8");
    } catch {
      console.warn(`[sync-modules] MISSING module tiddler  ${moduleRef}`);
      console.warn(`               expected at: ${modPath}`);
      missing++;
      continue;
    }

    const modBody = extractModuleBody(modContent);
    if (modBody === null) {
      console.warn(`[sync-modules] MISSING STX/ETX markers  ${moduleRef}`);
      missing++;
      continue;
    }

    const liveHash     = createHash("sha256").update(modBody, "utf8").digest("hex");
    const existingHash = toml["body-sha256"] ?? "";
    const hashDrift    = liveHash !== existingHash;

    const anchorUri = toml["uri-path"] ?? mdPath;

    if (COMMIT && hashDrift) {
      const patched_content = applyBodySha256Patch(content, liveHash);
      writeFileSync(mdPath, patched_content, "utf8");
      console.log(`[sync-modules] patched  ${anchorUri}  body-sha256 ${existingHash ? "updated" : "added"}`);
      patched++;
    } else if (!COMMIT && hashDrift) {
      console.warn(`[sync-modules] DRIFT  ${anchorUri}`);
      console.warn(`               anchor body-sha256: ${existingHash || "(missing)"}`);
      console.warn(`               module body sha256: ${liveHash}`);
      drift++;
    } else {
      console.log(`[sync-modules] ok   ${anchorUri}`);
    }
  }

  return { drift, missing, patched };
}

// ---------------------------------------------------------------------------
// --scan-decorators: convention-based decorator file discovery
//
// Detects files following the Lararium decorator convention:
//   <pkg>/src/filters/<name>.ts  — filter-operator files (exports register* fns)
//   <pkg>/src/widgets/<name>.ts  — widget files (exports *Widget fns)
//
// For each decorator file found, checks whether a heleuma meme already exists
// (by scanning lares/ for a meme with source-file pointing to this file).
//
// With --commit: scaffolds missing memes with correct TOML, source-file,
// source-symbol, body-sha256, and a #source slot containing verbatim source.
// ---------------------------------------------------------------------------

interface DecoratorFile {
  relPath:    string;
  absPath:    string;
  slug:       string;
  kind:       "filter-operator" | "widget";
  symbols:    string[];
  memeDir:    string;
  uriPrefix:  string;
  pkgName:    string;
}

function collectDecoratorFiles(): DecoratorFile[] {
  const results: DecoratorFile[] = [];

  for (const pkgDir of readdirSync(pkgsRoot)) {
    const pkgAbs = resolve(pkgsRoot, pkgDir);
    if (!statSync(pkgAbs).isDirectory()) continue;

    // Read package name from package.json
    let pkgName = pkgDir;
    try {
      const pj = JSON.parse(readFileSync(resolve(pkgAbs, "package.json"), "utf8") as string) as Record<string, unknown>;
      if (typeof pj["name"] === "string") pkgName = pj["name"];
    } catch { /* no package.json */ }

    for (const [subDir, kind, exportRe, memeSubDir, uriSub] of [
      ["src/filters", "filter-operator", /^export\s+function\s+(register\w+)/, "filters",  "filters"],
      ["src/widgets", "widget",           /^export\s+function\s+(\w+Widget)/,   "widgets",  "widgets"],
    ] as const) {
      const dirAbs = resolve(pkgAbs, subDir);
      let entries: string[] = [];
      try { entries = readdirSync(dirAbs); } catch { continue; }

      for (const entry of entries) {
        if (!entry.endsWith(".ts") || entry.includes(".web2.") || entry.includes(".test.")) continue;
        const absPath = resolve(dirAbs, entry);
        const relPath = relative(root, absPath);
        const slug    = entry.replace(/\.ts$/, "");
        const src     = readFileSync(absPath, "utf8");

        const symbols: string[] = [];
        for (const line of src.split("\n")) {
          const m = line.match(exportRe);
          if (m) symbols.push(m[1]!);
        }
        if (symbols.length === 0) continue;

        // Also collect non-exported helpers used by exports (heuristic: functions
        // declared before first export that appear in exported function bodies)
        const helperRe = /^function\s+(\w+)\s*\(/;
        for (const line of src.split("\n")) {
          const m = line.match(helperRe);
          if (m && !symbols.includes(m[1]!)) {
            // Include only if referenced by an exported symbol body
            const body = symbols.map(s => extractSymbol(relPath, s) ?? "").join("\n");
            if (body.includes(m[1]!)) symbols.unshift(m[1]!);
          }
        }

        const memeDir   = resolve(tw5MemesRoot, memeSubDir);
        const uriPrefix = `ha.ka.ba/@lararium/tw5/${uriSub}`;
        results.push({ relPath, absPath, slug, kind, symbols, memeDir, uriPrefix, pkgName });
      }
    }
  }
  return results;
}

function decoratorMemeExists(decoratorFile: DecoratorFile): string | null {
  // Returns the meme file path if a matching meme exists, null otherwise.
  // Matches by source-file field in meme TOML.
  let memeFiles: string[] = [];
  try { memeFiles = walkExt(decoratorFile.memeDir, ".md"); } catch { return null; }

  for (const mdPath of memeFiles) {
    const content = readFileSync(mdPath, "utf8");
    const tomlM   = TOML_RE.exec(content);
    if (!tomlM) continue;
    const toml = parseToml(tomlM[1]!);
    if (toml["source-file"] === decoratorFile.relPath) return mdPath;
  }
  return null;
}

function scaffoldDecoratorMeme(d: DecoratorFile): void {
  if (!existsSync(d.memeDir)) mkdirSync(d.memeDir, { recursive: true });

  const memePath  = resolve(d.memeDir, `${d.slug}.md`);
  if (existsSync(memePath)) return; // already exists — drift check handles it

  const uriPath   = `${d.uriPrefix}/${d.slug}`;
  const filePath  = relative(root, resolve(d.memeDir, `${d.slug}.md`));
  const srcSym    = d.symbols.join(" ");
  const bodies    = d.symbols.map(s => extractSymbol(d.relPath, s) ?? "").filter(Boolean);
  const joined    = bodies.join("\n\n");
  const bodyHash  = createHash("sha256").update(joined, "utf8").digest("hex");
  const kindLabel   = d.kind === "filter-operator" ? "TW5 filter operator" : "TW5 widget";
  // ka handles a single symbol; ba handles multiple space-separated symbols
  const heleumaMode = d.symbols.length === 1 ? "ka" : "ba";

  const meme = `<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///${uriPath} >>
\`\`\`toml iam
uri-path    = "${uriPath}"
file-path   = "${filePath}"
type        = "text/x-memetic-wikitext"
register    = "CS"
confidence  = 14
mana        = 14
manao       = 14
manaoio     = 13
l-space     = "lararium"
role        = "${kindLabel}: ${d.slug} — scaffolded by sync-heleuma --scan-decorators --commit"
heleuma     = "${heleumaMode}"
source-file = "${d.relPath}"
source-symbol = "${srcSym}"
body-sha256 = "${bodyHash}"
cacheable   = true
status-date = "${new Date().toISOString().slice(0, 10)}"
\`\`\`

<<~&#x0002;>>

<<~ ahu #head >>

# ${d.slug}

${kindLabel} from \`${d.pkgName}\`.

<<~/ahu >>

<<~ ahu #contract >>

Exported symbols: \`${d.symbols.join("`, `")}\`.

<<~/ahu >>

<<~ ahu #source >>

\`\`\`typescript
${joined}
\`\`\`

<<~/ahu >>

<<~ ahu #edges >>

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
`;

  writeFileSync(memePath, meme, "utf8");
  console.log(`[heleuma/decorators] scaffolded  ${uriPath}`);
}

function runScanDecorators(): void {
  const files = collectDecoratorFiles();
  if (files.length === 0) {
    console.log("[heleuma/decorators] No decorator files found.");
    return;
  }

  let found = 0, missing = 0, scaffolded = 0;
  for (const d of files) {
    found++;
    const existing = decoratorMemeExists(d);
    if (existing) {
      console.log(`[heleuma/decorators] ok       ${d.relPath}  →  ${relative(root, existing)}`);
    } else {
      missing++;
      console.warn(`[heleuma/decorators] MISSING  ${d.relPath}  (symbols: ${d.symbols.join(" ")})`);
      if (COMMIT) {
        scaffoldDecoratorMeme(d);
        scaffolded++;
      }
    }
  }
  console.log(`\n[heleuma/decorators] ${found} decorator file(s) — ${missing} missing`);
  if (COMMIT && scaffolded > 0) {
    console.log(`[heleuma/decorators] scaffolded ${scaffolded} meme(s) — run build:heleuma --commit to patch #source slots`);
  } else if (!COMMIT && missing > 0) {
    console.log(`[heleuma/decorators] run with --scan-decorators --commit to scaffold missing memes`);
  }
}

// ---------------------------------------------------------------------------
// Main — check/commit loop
// ---------------------------------------------------------------------------

if (SCAN_PROMOTE) {
  runScanPromote();
  process.exit(0);
}

if (SCAN) {
  runScan();
  process.exit(0);
}

if (SCAN_DECORATORS) {
  runScanDecorators();
  process.exit(0);
}

if (SYNC_MODULES) {
  console.log("[sync-modules] checking anchor body-sha256 against module tiddler bodies\n");
  const { drift, missing, patched } = runSyncModules();
  if (COMMIT) {
    console.log(`\n[sync-modules] patched ${patched}, missing ${missing}`);
  } else {
    console.log(`\n[sync-modules] ${drift} drift, ${missing} missing`);
    if (drift > 0 || missing > 0) {
      console.warn("[sync-modules] run with --sync-modules --commit to update body-sha256 fields");
    }
  }
  process.exit(drift > 0 || missing > 0 ? 1 : 0);
}

if (COMMIT) {
  // build:plugin owns TS → CJS plugin tiddler packaging and anchor hashes.
  // Run it before the #source drift check so generated bodies stay fresh.
  const scriptsDir = dirname(fileURLToPath(import.meta.url));
  console.log("[heleuma] --commit: building plugin CJS tiddlers and patching anchor hashes…\n");
  execSync(`tsx ${resolve(scriptsDir, "build-plugin-tiddler.ts")}`, { stdio: "inherit" });
  console.log("\n[heleuma] --commit: patching #source slots to match live TS source\n");
} else {
  console.log("[heleuma] dry-run (pass --commit to patch, --scan to find candidates, --scan-promote to find corpus candidates)\n");
}

let totalChecked = 0;
let totalDrift   = 0;
let totalMissing = 0;
let totalPatched = 0;

for (const mdPath of walkExt(tw5MemesRoot, ".md")) {
  const content = readFileSync(mdPath, "utf8");

  const tomlM = TOML_RE.exec(content);
  if (!tomlM) continue;
  const toml = parseToml(tomlM[1]!);

  const mode = toml["heleuma"];
  if (mode !== "ha" && mode !== "ka" && mode !== "ba") continue;

  const uriM = SOH_URI_RE.exec(content);
  const uri  = uriM?.[1] ?? mdPath;

  totalChecked++;

  // ba — quine-only: verify #source slot exists.
  // When source-symbol is declared, drift-check and hash exactly like ka.
  if (mode === "ba") {
    const slotM = SOURCE_SLOT_RE.exec(content);
    if (!slotM) {
      console.warn(`[heleuma/ba] MISSING #source slot  ${uri}`);
      totalMissing++;
      continue;
    }

    const baSrcFile = toml["source-file"];
    const baSrcSym  = toml["source-symbol"];

    if (!baSrcFile || !baSrcSym) {
      // No symbol — quine-only, no drift check needed
      console.log(`[heleuma/ba] ok   ${uri}`);
      continue;
    }

    // ba may declare multiple space-separated symbols; extract each and join
    const baSymbols = baSrcSym.trim().split(/\s+/);
    const baExtracted: string[] = [];
    for (const sym of baSymbols) {
      const extracted = extractSymbol(baSrcFile, sym);
      if (extracted) baExtracted.push(extracted.trim());
    }
    if (baExtracted.length === 0) {
      console.warn(`[heleuma/ba] SYMBOL NOT FOUND: ${baSrcSym} in ${baSrcFile}  (${uri})`);
      totalMissing++;
      continue;
    }

    const baLiveCode  = baExtracted.join("\n\n");
    const baDrift     = checkDrift(slotM[1]!, baLiveCode);
    const baLiveHash  = createHash("sha256").update(baLiveCode, "utf8").digest("hex");
    const baExistHash = toml["body-sha256"] ?? "";
    const baHashDrift = baExistHash !== baLiveHash;

    if (COMMIT && (baDrift || baHashDrift)) {
      let working: string = content;
      if (baDrift) {
        const patched = applySourcePatch(working, baLiveCode);
        if (patched) working = patched;
      }
      working = applyBodySha256Patch(working, baLiveHash);
      writeFileSync(mdPath, working, "utf8");

      const parts: string[] = [];
      if (baDrift)     parts.push(`source: ${baDrift}`);
      if (baHashDrift) parts.push(baExistHash ? "body-sha256 updated" : "body-sha256 added");
      console.log(`[heleuma/ba] patched  ${uri} (${baSrcSym}): ${parts.join("; ")}`);
      totalPatched++;
    } else if (!COMMIT && baDrift) {
      console.warn(`[heleuma/ba] DRIFT  ${uri} (${baSrcSym}): ${baDrift}`);
      console.warn(`           live: ${resolve(root, baSrcFile)}`);
      totalDrift++;
    } else {
      console.log(`[heleuma/ba] ok   ${uri} (${baSrcSym})`);
    }

    if (!COMMIT && baHashDrift) {
      console.log(`[heleuma/ba] body-sha256 ${baExistHash ? "stale" : "missing"}  ${uri}`);
    }
    continue;
  }

  // ha/ka — drift check against live source
  const srcFile = toml["source-file"];
  const srcSym  = toml["source-symbol"];

  if (!srcFile || !srcSym) {
    console.warn(`[heleuma/${mode}] MISSING source-file/source-symbol  ${uri}`);
    totalMissing++;
    continue;
  }

  const liveSource = extractSymbol(srcFile, srcSym);
  if (!liveSource) {
    console.warn(`[heleuma/${mode}] SYMBOL NOT FOUND: ${srcSym} in ${srcFile}  (${uri})`);
    totalMissing++;
    continue;
  }

  const slotM = SOURCE_SLOT_RE.exec(content);
  if (!slotM) {
    console.warn(`[heleuma/${mode}] MISSING #source slot  ${uri}`);
    if (COMMIT) {
      console.warn(`[heleuma/${mode}]   cannot patch — add <<~ ahu #source >> block first`);
    }
    totalMissing++;
    continue;
  }

  const liveCode  = liveSource.trim();
  const drift     = checkDrift(slotM[1]!, liveCode);

  // For ka memes: also track whether body-sha256 is current.
  // sha256(liveCode) is the quine integrity anchor for DreamNet cold-boot verification.
  const liveHash     = mode === "ka" ? createHash("sha256").update(liveCode, "utf8").digest("hex") : null;
  const existingHash = mode === "ka" ? (toml["body-sha256"] ?? "") : null;
  const hashDrift    = liveHash !== null && existingHash !== liveHash;

  if (COMMIT && (drift || hashDrift)) {
    let working: string = content;
    if (drift) {
      const patched = applySourcePatch(working, liveCode);
      if (patched) working = patched;
    }
    if (liveHash !== null) {
      working = applyBodySha256Patch(working, liveHash);
    }
    writeFileSync(mdPath, working, "utf8");

    const parts: string[] = [];
    if (drift)     parts.push(`source: ${drift}`);
    if (hashDrift) parts.push(existingHash ? "body-sha256 updated" : "body-sha256 added");
    console.log(`[heleuma/${mode}] patched  ${uri} (${srcSym}): ${parts.join("; ")}`);
    totalPatched++;
  } else if (!COMMIT && drift) {
    console.warn(`[heleuma/${mode}] DRIFT  ${uri} (${srcSym}): ${drift}`);
    console.warn(`           live: ${resolve(root, srcFile)}`);
    totalDrift++;
  } else {
    console.log(`[heleuma/${mode}] ok   ${uri} (${srcSym})`);
  }

  if (!COMMIT && mode === "ka" && hashDrift) {
    console.log(`[heleuma/ka] body-sha256 ${existingHash ? "stale" : "missing"}  ${uri}`);
  }
}

if (COMMIT) {
  console.log(`\n[heleuma] checked ${totalChecked} — patched ${totalPatched}, missing ${totalMissing}`);
} else {
  console.log(`\n[heleuma] checked ${totalChecked} — ${totalDrift} drift, ${totalMissing} missing`);
  if (totalDrift > 0 || totalMissing > 0) {
    console.warn("[heleuma] run with --commit to patch #source slots");
  }
}

// Always run module-sync check in dry-run pass (not in --commit, which only patches #source slots)
if (!COMMIT) {
  console.log("\n[sync-modules] checking anchor body-sha256 against module tiddler bodies");
  const modResult = runSyncModules();
  if (modResult.drift > 0 || modResult.missing > 0) {
    console.warn(`[sync-modules] run with --sync-modules --commit to update body-sha256 fields`);
  }
}

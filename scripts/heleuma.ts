/**
 * heleuma — anchor every load-bearing source file to a self-describing meme.
 *
 * Hawaiian: heleuma = "anchor". A heleuma meme anchors an off-bag artifact
 * (a TS source file, a config) to its in-bag identity at a stable lar: URI,
 * so the system can describe and discuss its own machinery from inside.
 *
 * Filter — a source file needs a heleuma when ANY of:
 *   1. It appears in its package's src/index.ts re-exports
 *   2. It carries a `// @heleuma:required` marker comment
 * Unless it carries `// @heleuma:exempt` (overrides 1; not 2).
 *
 * Modes:
 *   (default)        Audit only. Prints missing / drifted / orphaned memes.
 *                    Exits non-zero if any drift is found.
 *   --write          Scaffold missing memes. Update iam blocks where source
 *                    paths drifted. Idempotent — no-op if already aligned.
 *                    Does NOT touch orphans (memes whose source-file points
 *                    to a non-existent file) — operator decides.
 *
 * Run:  pnpm exec tsx scripts/heleuma.ts [--write]
 */

import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname, basename, relative, resolve } from "path";

const WORKSPACE = resolve(dirname(new URL(import.meta.url).pathname), "..");
const PACKAGES  = join(WORKSPACE, "packages");
const BAGS      = join(WORKSPACE, "bags");

// ---------------------------------------------------------------------------
// File walking
// ---------------------------------------------------------------------------

function walkTs(dir: string): string[] {
  const out: string[] = [];
  try {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name === "node_modules" || e.name === "dist" || e.name === "maybe") continue;
      const full = join(dir, e.name);
      if (e.isDirectory()) out.push(...walkTs(full));
      else if (e.isFile() && e.name.endsWith(".ts") && !e.name.endsWith(".d.ts") &&
               !e.name.endsWith(".test.ts") && !e.name.endsWith(".spec.ts")) {
        out.push(full);
      }
    }
  } catch { /* missing dir */ }
  return out.sort();
}

function walkMd(dir: string): string[] {
  const out: string[] = [];
  try {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, e.name);
      if (e.isDirectory()) out.push(...walkMd(full));
      else if (e.isFile() && e.name.endsWith(".md")) out.push(full);
    }
  } catch { /* missing dir */ }
  return out.sort();
}

// ---------------------------------------------------------------------------
// iam-block parsing — fenced ```toml iam ... ``` block, key = "value" lines
// ---------------------------------------------------------------------------

const IAM_FENCE_RE = /```toml\s+iam\s*\n([\s\S]*?)\n```/;

interface IamBlock {
  raw:        string;            // the full fenced block as found
  body:       string;            // contents between fences
  fields:     Record<string, string>;
}

function parseIam(text: string): IamBlock | null {
  const m = IAM_FENCE_RE.exec(text);
  if (!m) return null;
  const body = m[1] ?? "";
  const fields: Record<string, string> = {};
  for (const line of body.split("\n")) {
    const kv = /^([a-zA-Z0-9_-]+)\s*=\s*"([^"]*)"\s*$/.exec(line);
    if (kv) fields[kv[1]!] = kv[2]!;
  }
  return { raw: m[0], body, fields };
}

function setIamField(body: string, key: string, value: string): string {
  const lines = body.split("\n");
  const re = new RegExp(`^${key}\\s*=\\s*"`);
  const idx = lines.findIndex((l) => re.test(l));
  const newLine = `${key.padEnd(12, " ")} = "${value}"`;
  if (idx >= 0) lines[idx] = newLine;
  else lines.push(newLine);
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Filter — does this source file need a heleuma?
// ---------------------------------------------------------------------------

/** `"0.1.0"` → `"v0.1"`, `"1.2.3"` → `"v1.2"` */
function toUriVer(semver: string): string {
  const [major, minor] = semver.split(".").map(Number);
  return `v${major ?? 0}.${minor ?? 0}`;
}

interface PackageInfo {
  pkgDir:      string;       // absolute path to packages/{dir}
  pkgName:     string;       // package.json#name, e.g. "@lararium/mesh"
  uriScope:    string;       // URI segment, e.g. "@lararium/mesh"
  uriVersion:  string;       // version segment, e.g. "v0.1"
}

function readPackageInfo(pkgDir: string): PackageInfo | null {
  const pkgJson = join(pkgDir, "package.json");
  if (!existsSync(pkgJson)) return null;
  try {
    const data = JSON.parse(readFileSync(pkgJson, "utf8")) as { name?: string; version?: string };
    if (!data.name) return null;
    const uriVersion = data.version ? toUriVer(data.version) : "v0.1";
    return { pkgDir, pkgName: data.name, uriScope: data.name, uriVersion };
  } catch { return null; }
}

function readReExportedSlugs(indexPath: string): Set<string> {
  if (!existsSync(indexPath)) return new Set();
  const text = readFileSync(indexPath, "utf8");
  const out = new Set<string>();
  const re = /from\s+["']\.\/([^"']+)\.js["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.add(m[1]!);
  return out;
}

function fileHasMarker(text: string, marker: string): boolean {
  // Check first ~30 lines for the marker comment.
  const head = text.split("\n").slice(0, 30).join("\n");
  return head.includes(marker);
}

// ---------------------------------------------------------------------------
// Heleuma scaffolding
// ---------------------------------------------------------------------------

function uriFor(uriScope: string, uriVersion: string, slug: string): string {
  return `lar:///ha.ka.ba/${uriScope}/${uriVersion}/${slug}`;
}

function memePathFor(uriScope: string, uriVersion: string, slug: string): string {
  return join(BAGS, uriScope, uriVersion, `${slug}.md`);
}

function template(opts: {
  uriScope:   string;
  uriVersion: string;
  slug:       string;
  sourceFile: string;
  sourceBaseName: string;
}): string {
  const uriPath  = `ha.ka.ba/${opts.uriScope}/${opts.uriVersion}/${opts.slug}`;
  const memeRel  = relative(WORKSPACE, memePathFor(opts.uriScope, opts.uriVersion, opts.slug));
  const sourceRel = relative(WORKSPACE, opts.sourceFile);
  return `<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/lares/api/pono/memetic-wikitext >> -->

<<^ &#x0001; ? -> lar:///${uriPath} >>
\`\`\`toml iam
uri-path     = "${uriPath}"
file-path    = "${memeRel}"
source-file  = "${sourceRel}"
type         = "text/x-memetic-wikitext"
register     = "CS"
confidence   = 10
mana         = 10
role         = "self-documentation: TODO describe ${opts.sourceBaseName}"
l-space      = "lararium"
cacheable    = true
retain       = true
\`\`\`
<<^ &#x0002;>>

<<~ ahu #contract >>
TODO: describe the load-bearing surface this file owns.
<<~/ahu >>
`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

interface Issue {
  kind:   "missing" | "drifted" | "orphan";
  pkg:    string;
  detail: string;
}

function main(): number {
  const write = process.argv.includes("--write");
  const issues: Issue[] = [];
  let scaffolded = 0;
  let updated    = 0;

  for (const entry of readdirSync(PACKAGES, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const pkgDir = join(PACKAGES, entry.name);
    const info = readPackageInfo(pkgDir);
    if (!info) continue;

    // ── Scan source candidates ────────────────────────────────────────────
    const srcDir   = join(pkgDir, "src");
    if (!existsSync(srcDir)) continue;

    const reExported = readReExportedSlugs(join(srcDir, "index.ts"));
    const tsFiles    = walkTs(srcDir);

    const candidates = new Map<string, string>(); // slug → absolute source path
    for (const tsAbs of tsFiles) {
      const rel = relative(srcDir, tsAbs).replace(/\.ts$/, "").replace(/\/index$/, "");
      if (rel === "index") continue;
      const text = readFileSync(tsAbs, "utf8");
      const required = fileHasMarker(text, "@heleuma:required");
      const exempt   = fileHasMarker(text, "@heleuma:exempt");
      const inIndex  = reExported.has(rel);
      if (exempt && !required) continue;
      if (!required && !inIndex) continue;
      candidates.set(rel, tsAbs);
    }

    // ── Index existing memes by source-file ───────────────────────────────
    // source-file may carry multiple paths separated by whitespace — a single
    // meme may describe a coherent surface implemented across files. Each
    // path is indexed independently, but the meme is reported orphan only
    // when ALL its source-files are missing.
    const memesDir = join(BAGS, info.uriScope);
    const memeBySource = new Map<string, { path: string; iam: IamBlock; raw: string; sources: string[] }>();
    if (existsSync(memesDir)) {
      for (const memePath of walkMd(memesDir)) {
        const text = readFileSync(memePath, "utf8");
        const iam  = parseIam(text);
        if (!iam) continue;
        const sf = iam.fields["source-file"];
        if (!sf) continue;
        const sources = sf.split(/\s+/).filter(Boolean);
        const entry = { path: memePath, iam, raw: text, sources };
        for (const s of sources) memeBySource.set(s, entry);
      }
    }

    // ── Diff: candidates → memes ──────────────────────────────────────────
    for (const [slug, srcAbs] of candidates) {
      const sourceRel = relative(WORKSPACE, srcAbs);
      const existing  = memeBySource.get(sourceRel);
      if (!existing) {
        issues.push({ kind: "missing", pkg: info.pkgName, detail: sourceRel });
        if (write) {
          const target = memePathFor(info.uriScope, info.uriVersion, slug);
          mkdirSync(dirname(target), { recursive: true });
          writeFileSync(target, template({
            uriScope:       info.uriScope,
            uriVersion:     info.uriVersion,
            slug,
            sourceFile:     srcAbs,
            sourceBaseName: basename(srcAbs),
          }), "utf8");
          scaffolded++;
        }
      } else {
        // Check for iam drift — file-path field should match meme location.
        const memeRel = relative(WORKSPACE, existing.path);
        if (existing.iam.fields["file-path"] !== memeRel) {
          issues.push({ kind: "drifted", pkg: info.pkgName,
                        detail: `${memeRel}  file-path drifted (was: ${existing.iam.fields["file-path"]})` });
          if (write) {
            const newBody = setIamField(existing.iam.body, "file-path", memeRel);
            const newRaw  = existing.raw.replace(existing.iam.raw, "```toml iam\n" + newBody + "\n```");
            writeFileSync(existing.path, newRaw, "utf8");
            updated++;
          }
        }
        memeBySource.delete(sourceRel); // mark as visited
      }
    }

    // ── Memes whose source-files all gone → orphan ────────────────────────
    // Deduplicate by meme path (multi-source memes appear under each source).
    const seenMemePaths = new Set<string>();
    for (const m of memeBySource.values()) {
      if (seenMemePaths.has(m.path)) continue;
      seenMemePaths.add(m.path);
      const allGone = m.sources.every((s) => !existsSync(join(WORKSPACE, s)));
      if (!allGone) continue;
      issues.push({ kind: "orphan", pkg: info.pkgName,
                    detail: `${relative(WORKSPACE, m.path)}  source-file gone: ${m.sources.join(" ")}` });
    }
  }

  // ── Report ──────────────────────────────────────────────────────────────
  const missing = issues.filter((i) => i.kind === "missing");
  const drifted = issues.filter((i) => i.kind === "drifted");
  const orphan  = issues.filter((i) => i.kind === "orphan");

  if (missing.length) {
    console.log(`\n[heleuma] MISSING (${missing.length}) — load-bearing source without anchor meme:`);
    for (const i of missing) console.log(`  ${i.pkg.padEnd(28)} ${i.detail}`);
  }
  if (drifted.length) {
    console.log(`\n[heleuma] DRIFTED (${drifted.length}) — meme iam block out of sync with on-disk path:`);
    for (const i of drifted) console.log(`  ${i.pkg.padEnd(28)} ${i.detail}`);
  }
  if (orphan.length) {
    console.log(`\n[heleuma] ORPHAN (${orphan.length}) — meme references a source-file that no longer exists:`);
    console.log("           (review manually; --write does NOT delete orphans)");
    for (const i of orphan) console.log(`  ${i.pkg.padEnd(28)} ${i.detail}`);
  }
  if (!issues.length) {
    console.log("[heleuma] all aligned — every load-bearing source has a current heleuma meme.");
  }
  if (write) {
    console.log(`\n[heleuma] scaffolded=${scaffolded}  updated=${updated}  orphans-left=${orphan.length}`);
  } else if (issues.length) {
    console.log(`\n[heleuma] run with --write to scaffold missing + fix drifted (orphans require manual review)`);
  }

  return issues.length > 0 ? 1 : 0;
}

process.exit(main());

/**
 * check-sigil-alignment — verifies that every SharktoothSigil tiddler has
 * a corresponding pono law spec, and every pono spec that is a sigil definition
 * has a #tiddler pranala edge pointing back.
 *
 * Checks:
 *   1. Every sigil-*.tid has a lar-pono-uri field.
 *   2. The lar-pono-uri target file exists at bags/lares/ha.ka.ba/lares/api/pono/{slug}.md.
 *   3. Every sigil pono spec has a <<~ pranala #tiddler ? -> …/sigil-* …>> edge.
 *
 * Exit 1 if any check fails (for CI integration).
 */

import { readFileSync, existsSync, readdirSync } from "fs";
import { join, basename } from "path";

const ROOT = join(import.meta.dirname, "../../..");
const TIDDLERS_DIR = join(ROOT, "packages/lararium-tw5/tiddlers");
const PONO_DIR = join(ROOT, "bags/lares/ha.ka.ba/lares/api/pono");

interface CheckResult {
  tiddler: string;
  pass: boolean;
  issues: string[];
}

// ── helpers ──────────────────────────────────────────────────────────────────

function parseFrontmatterField(content: string, field: string): string | null {
  // Matches "field: value" in the tiddler frontmatter (before first blank line + body)
  const re = new RegExp(`^${field}:\\s*(.+)$`, "m");
  const m = content.match(re);
  return m ? m[1]!.trim() : null;
}

function ponoSlugFromUri(uri: string): string {
  // lar:///ha.ka.ba/lares/api/pono/slug → slug
  return uri.split("/").pop()!;
}

function ponoFilePath(slug: string): string {
  return join(PONO_DIR, `${slug}.md`);
}

function hasTiddlerEdge(ponoContent: string, tiddlerName: string): boolean {
  // Matches any <<~ pranala #tiddler* ? -> .../sigil-NAME …>> edge.
  // The slot name may be #tiddler (canonical) or #tiddler-sigil-X (alias entries).
  const tiddlerUri = `lar:///ha.ka.ba/lararium/tw5/tiddlers/${tiddlerName}`;
  const escapedUri = tiddlerUri.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`<<~\\s*pranala\\s+#tiddler[^\\s>]*\\s+\\?\\s*->\\s*${escapedUri}`);
  return re.test(ponoContent);
}

// ── main ─────────────────────────────────────────────────────────────────────

const results: CheckResult[] = [];
let totalIssues = 0;

// Check 1 + 2: every sigil tiddler has lar-pono-uri and target file exists
const tiddlerFiles = readdirSync(TIDDLERS_DIR)
  .filter(f => f.startsWith("sigil-") && f.endsWith(".tid"))
  .sort();

for (const filename of tiddlerFiles) {
  const filepath = join(TIDDLERS_DIR, filename);
  const content = readFileSync(filepath, "utf-8");
  const issues: string[] = [];

  const isSharktoothSigil = content.includes("lar:///ha.ka.ba/tags/SharktoothSigil");
  if (!isSharktoothSigil) {
    // Skip tiddlers not tagged as SharktoothSigil
    continue;
  }

  const ponoUri = parseFrontmatterField(content, "lar-pono-uri");
  if (!ponoUri) {
    issues.push("missing lar-pono-uri field");
  } else {
    const slug = ponoSlugFromUri(ponoUri);
    const ponoPath = ponoFilePath(slug);
    if (!existsSync(ponoPath)) {
      issues.push(`lar-pono-uri target not found: ${ponoPath}`);
    } else {
      // Check 3: pono spec has #tiddler edge back to this tiddler
      const ponoContent = readFileSync(ponoPath, "utf-8");
      const tiddlerName = basename(filename, ".tid"); // e.g. "sigil-aka"
      if (!hasTiddlerEdge(ponoContent, tiddlerName)) {
        issues.push(`pono/${slug}.md missing <<~ pranala #tiddler ? -> …/${tiddlerName} …>>`);
      }
    }
  }

  results.push({ tiddler: filename, pass: issues.length === 0, issues });
  totalIssues += issues.length;
}

// ── report ───────────────────────────────────────────────────────────────────

const passes = results.filter(r => r.pass).length;
const fails  = results.filter(r => !r.pass).length;

console.log(`\nSigil alignment check — ${tiddlerFiles.length} SharktoothSigil tiddlers\n`);

for (const r of results) {
  if (r.pass) {
    console.log(`  ✓  ${r.tiddler}`);
  } else {
    console.log(`  ✗  ${r.tiddler}`);
    for (const issue of r.issues) {
      console.log(`       → ${issue}`);
    }
  }
}

console.log(`\n${passes} pass  ${fails} fail  (${totalIssues} issue${totalIssues === 1 ? "" : "s"})`);

if (fails > 0) {
  process.exit(1);
}

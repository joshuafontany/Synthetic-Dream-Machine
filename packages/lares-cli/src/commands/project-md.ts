/**
 * `lares project-md <file.mem ...> [--out <dir>]`
 *
 * The submission projection — render a spec carrier to a markdown + meta pair a standards
 * reviewer reads with no grammar taught. One mouth serves two doors: this command and the
 * PROJECT-MD wiki verb both call `projectSubmission` (`@lararium/tw5/meme-markdown`), so a pair
 * projected from either door carries identical bytes.
 *
 * The pair lands beside the source (`<name>.md` + `<name>.md.meta`) or under `--out`. The meta
 * carries the source address and its block check — no clock rides it, so currency is proven by
 * re-projecting and comparing, never asserted by a stamp. A hand edit to a projected pair dies
 * at the next projection; the meta's `law:` line says so on its face.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { basename, join, dirname } from "node:path";
import { projectSubmission } from "@lararium/tw5/meme-markdown";
import type { ParsedArgs } from "../parse-args.js";

export async function cmdProjectMd(args: ParsedArgs): Promise<number> {
  const files = [...args.positional];
  const out = args.options["out"];
  if (files.length === 0) {
    console.error("usage: lares project-md <file.mem ...> [--out <dir>]");
    console.error("  render a carrier to its submission pair: <name>.md + <name>.md.meta");
    return 1;
  }
  if (out) mkdirSync(out, { recursive: true });
  let failures = 0;
  for (const f of files) {
    try {
      const text = readFileSync(f, "utf8");
      const p = projectSubmission(text);
      const base = basename(f).replace(/\.mem$/, "");
      const dir = out ?? dirname(f);
      const mdPath = join(dir, `${base}.md`);
      writeFileSync(mdPath, p.markdown);
      writeFileSync(`${mdPath}.meta`, p.meta);
      console.log(`projected ${p.uri} -> ${mdPath} (+.meta, source-check ${p.check})`);
    } catch (err) {
      failures += 1;
      console.error(`project-md: ${f}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return failures === 0 ? 0 : 1;
}

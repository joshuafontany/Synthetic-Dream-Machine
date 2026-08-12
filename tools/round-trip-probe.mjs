// Compute render(parse(disk)) for every .mem carrier — the canonical form the ingest gate compares
// against — WITHOUT a daemon, so the source tree is never written to.
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
const { memeticIngestOps } = await import(`${process.env.REPO}/packages/lararium-tw5/dist/ingest-gate.js`);

const files = execSync("git ls-files 'bags/**/*.mem'", { encoding: "utf8", cwd: process.env.REPO })
  .trim().split("\n").filter(Boolean);

/** The uri a carrier declares in its own iam block — the address the gate keys on. */
function uriOf(text) {
  const m = /^uri-path\s*=\s*"([^"]+)"/m.exec(text);
  return m ? `lar:///${m[1]}` : null;
}

const out = [];
for (const f of files) {
  const path = `${process.env.REPO}/${f}`;
  const disk = readFileSync(path, "utf8");
  const uri = uriOf(disk);
  if (!uri) { out.push({ f, skip: "no uri-path" }); continue; }
  try {
    const { records, diagnostics } = memeticIngestOps.deserialize(uri, disk);
    const canonical = memeticIngestOps.render(uri, records);
    out.push({ f, uri, same: canonical === disk, canonical, disk,
               grade: memeticIngestOps.grade(diagnostics),
               // Content stranded past ETX — the gate refuses on this; the witness names the file.
               strandedPastEtx: diagnostics.filter((d) => d.code === "postamble-content").length,
               // Residency stamped into the carrier. `uri-path` is what a meme IS; a bag is where it
               // LIVES, and a carrier that names its bag lies the moment residency moves.
               residencyStamp: /^origin-bag\s*=/m.test(disk) });
  } catch (e) { out.push({ f, uri, error: String(e).slice(0, 120) }); }
}
writeFileSync(process.env.OUT, JSON.stringify(out));
const drift = out.filter(o => o.same === false).length;
console.log(`${out.length} carriers · ${drift} whose canonical render differs from disk · ` +
            `${out.filter(o=>o.error).length} errored · ${out.filter(o=>o.skip).length} skipped`);

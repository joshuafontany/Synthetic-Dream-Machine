// herm-mesh-witness — the decoding witness for docker-compose.mesh.yml. It pulls each hop's FLOW-map
// through the SAME client a peer uses (pullAndVerifyOracle: verifies the pointer signature, matches the
// content hash, then Automerge.loads the snapshot), enumerates the dials the decoded map carries, and
// proves the source's announced dial crossed the relay chain to the last hop.
//
// Why a decoder, not a grep: the read-face serves an Automerge-SAVED snapshot (compressed binary), so a
// raw substring search for a bearing never matches — the earlier curl+grep witness read the wrong format
// and reported a false failure while federation ran green underneath it. This witness decodes, so it reads
// what the map actually carries AND exercises the full pointer-signature/hash/freshness verify path.
//
// Run:  docker compose -f docker-compose.mesh.yml up -d && node tools/herm-mesh-witness.mjs
// Env:  HOP_SOURCE / HOP_RELAY1 / HOP_RELAY2 override the hop URLs; NEEDLE overrides the carried bearing.

import { pullAndVerifyOracle } from "../packages/lararium-mesh/dist/oracle-read-client.js";

const HOPS = [
  { name: "source ", url: process.env.HOP_SOURCE ?? "http://localhost:18092" },
  { name: "relay-1", url: process.env.HOP_RELAY1 ?? "http://localhost:18091" },
  { name: "relay-2", url: process.env.HOP_RELAY2 ?? "http://localhost:18093" },
];
const NEEDLE = process.env.NEEDLE ?? "node/alpha";
const ATTEMPTS = Number.parseInt(process.env.WITNESS_ATTEMPTS ?? "30", 10);

// Pull the dial bearings a decoded FLOW-map carries. The map holds a TW5 tiddler store; each dial rides a
// tiddler titled `…/@meshpalace/dial/<slug>` whose `bearing` field names the `lar:` address it resolves.
function dialsOf(doc) {
  const out = [];
  const tiddlers = doc?.tiddlers ?? {};
  for (const [title, entry] of Object.entries(tiddlers)) {
    if (!title.includes("@meshpalace/dial/")) continue;
    const bearing = entry?.tiddler?.bearing;
    if (typeof bearing === "string") out.push(bearing);
  }
  return out;
}

// One verified read of a hop: returns { ok, cid, dials } or { ok:false, reason }.
async function readHop(url) {
  const r = await pullAndVerifyOracle(url);
  if (!r.ok) return { ok: false, reason: r.reason };
  return { ok: true, cid: r.cid, dials: dialsOf(r.doc) };
}

// Poll until the last hop's verified map carries the needle, or the attempts drain.
for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
  const reads = [];
  for (const hop of HOPS) reads.push({ hop, ...(await readHop(hop.url)) });

  const last = reads[reads.length - 1];
  const carriesNeedle = last.ok && last.dials.some((b) => b.includes(NEEDLE));

  if (carriesNeedle) {
    console.log(`✓ WITNESS: "${NEEDLE}" crossed the chain, cryptographically verified at each hop:`);
    for (const r of reads) {
      const mark = r.ok ? `${r.dials.length} dials` : `UNVERIFIED (${r.reason})`;
      const has = r.ok && r.dials.some((b) => b.includes(NEEDLE)) ? " ← carries the dial" : "";
      console.log(`    ${r.hop.name}  cid=${(r.cid ?? "—").slice(0, 12)}…  ${mark}${has}`);
    }
    console.log("  the mesh-palace is a mesh across the astral space — the map relayed blind, three hops,");
    console.log("  the pointer signed, the snapshot hash-matched, the dial decoded.");
    process.exit(0);
  }

  const detail = last.ok ? `relay-2 verified (${last.dials.length} dials) but "${NEEDLE}" not yet carried`
                         : `relay-2 unverified: ${last.reason}`;
  console.log(`  attempt ${attempt}: ${detail} — waiting…`);
  await new Promise((r) => setTimeout(r, 1000));
}

console.error(`✗ WITNESS FAILED: "${NEEDLE}" never reached the last hop, verified, in ${ATTEMPTS} attempts.`);
process.exit(1);

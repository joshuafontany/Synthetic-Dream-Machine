// herm-mesh-partition — the partition-resilience witness for docker-compose.mesh.yml. It tests the claim
// the compose file makes about herm-relay-2: that it SELF-PEERS the source transitively — it learns the
// source's endpoint from the dial it pulled through relay-1, then dials the source DIRECTLY, so federation
// rides carried dials, not a hardcoded peer list.
//
// The test that falsifies (or confirms) the claim: cut relay-1 out of the chain and watch relay-2.
//   · baseline — relay-2 carries the source's alpha dial (learned via relay-1), pointer at version V0.
//   · partition — stop relay-1. relay-2's only configured peer (LAR_PEERS) is now dead.
//   · verdict — if relay-2's pointer keeps ADVANCING past V0 while still carrying alpha, it pulls the source
//     directly through the learned dial (the claim holds). If the pointer FREEZES at V0, relay-2 only ever
//     relayed through relay-1 (stale cache, the claim fails) — the source re-publishes on a cadence, so a
//     live direct pull advances; a dead chain does not.
//   · restore — relay-1 comes back up, the full mesh returns.
//
// Run:  docker compose -f docker-compose.mesh.yml up -d && node tools/herm-mesh-partition.mjs

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { pullAndVerifyOracle } from "../packages/lararium-mesh/dist/oracle-read-client.js";

const run = promisify(execFile);
const COMPOSE = ["compose", "-f", "docker-compose.mesh.yml"];
const RELAY2 = process.env.HOP_RELAY2 ?? "http://localhost:18093";
const NEEDLE = process.env.NEEDLE ?? "node/alpha";
const dockerRelay1 = process.env.RELAY1_SERVICE ?? "herm-relay";  // compose SERVICE name (not the container name)

function dialsOf(doc) {
  const out = [];
  for (const [title, entry] of Object.entries(doc?.tiddlers ?? {})) {
    if (title.includes("bags/meshpalace/dial/") && typeof entry?.tiddler?.bearing === "string") out.push(entry.tiddler.bearing);
  }
  return out;
}

// One verified read of relay-2 → { version, carries } (or throws its reason on an unverified pull).
async function readRelay2() {
  const r = await pullAndVerifyOracle(RELAY2);
  if (!r.ok) throw new Error(`relay-2 unverified: ${r.reason}`);
  return { version: r.pointer?.version ?? -1, carries: dialsOf(r.doc).some((b) => b.includes(NEEDLE)) };
}

async function compose(...args) {
  try { await run("docker", [...COMPOSE, ...args]); return true; }
  catch (e) { console.error(`  docker ${args.join(" ")} failed: ${e.message}`); return false; }
}

// This witness STOPS a container mid-run; an interrupt between the stop and the restore would leave the
// mesh degraded. Track whether the relay stands down and restore it on any exit path — a signal (Ctrl-C),
// an uncaught throw, or normal completion — so an aborted run never orphans a stopped node.
let relay1Down = false;
async function restoreRelay1() {
  if (!relay1Down) return;
  relay1Down = false;
  console.log(`  restore: starting ${dockerRelay1} back up…`);
  await compose("start", dockerRelay1);
}
for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => { void restoreRelay1().finally(() => process.exit(130)); });
}

const fail = (msg) => { console.error(`✗ PARTITION WITNESS FAILED: ${msg}`); process.exitCode = 1; };

// ── baseline ──────────────────────────────────────────────────────────────────────────────────────
let base;
try { base = await readRelay2(); } catch (e) { fail(String(e.message)); process.exit(1); }
if (!base.carries) { fail(`relay-2 does not carry "${NEEDLE}" at baseline — bring the mesh up first`); process.exit(1); }
console.log(`  baseline: relay-2 carries "${NEEDLE}", pointer version=${base.version}`);

// ── partition: cut relay-1 out ──────────────────────────────────────────────────────────────────────
console.log(`  partition: stopping ${dockerRelay1} (relay-2's only configured peer)…`);
if (!(await compose("stop", dockerRelay1))) { fail("could not stop the relay — restore the mesh by hand"); process.exit(1); }
relay1Down = true;   // arm the restore-on-exit guard

// SETTLE past any in-flight relay-1 pull that was already in flight at the moment of the stop — record the
// version AFTER the chain has fully drained, so no single stale pull can masquerade as a live direct one.
console.log(`  settling 5s to drain any in-flight relay-1 pull…`);
await new Promise((r) => setTimeout(r, 5000));
let settledVersion = base.version;
try { const s = await readRelay2(); settledVersion = s.version; } catch { /* keep base.version */ }
console.log(`  settled: relay-2 version=${settledVersion} (advances PAST this prove a fresh direct source pull)`);

// ── watch relay-2 for a FRESH advance past the settled version (a direct source pull after the chain broke) ──
let advanced = false, stillCarries = base.carries, lastVersion = settledVersion, lastReason = "";
for (let i = 1; i <= 25 && !advanced; i++) {
  await new Promise((r) => setTimeout(r, 1000));
  try {
    const now = await readRelay2();
    lastVersion = now.version;
    stillCarries = now.carries;
    if (now.version > settledVersion && now.carries) advanced = true;
    console.log(`  attempt ${i}: relay-2 version=${now.version} carries=${now.carries}` + (advanced ? "  ← FRESH advance past settle, direct pull confirmed" : ""));
  } catch (e) { lastReason = String(e.message); console.log(`  attempt ${i}: ${lastReason}`); }
}

// ── restore relay-1 regardless of verdict (the exit guard also covers an interrupt before this point) ──
await restoreRelay1();

// ── verdict ───────────────────────────────────────────────────────────────────────────────────────
if (advanced) {
  console.log(`✓ PARTITION WITNESS: with relay-1 cut, relay-2's pointer advanced to version=${lastVersion}`);
  console.log(`  while still carrying "${NEEDLE}" — it dials the source DIRECTLY through the learned dial.`);
  console.log(`  federation rides carried dials: the chain broke, the reach held.`);
} else if (stillCarries) {
  fail(`relay-2 still carries "${NEEDLE}" but its pointer FROZE at version=${lastVersion} past the settled ` +
       `version=${settledVersion} after relay-1 died — it served stale cache, never re-dialed the source ` +
       `directly. The self-peer-transitively claim is UNPROVEN.`);
} else {
  fail(`relay-2 lost "${NEEDLE}" after relay-1 died${lastReason ? ` (${lastReason})` : ""} — no direct source reach.`);
}

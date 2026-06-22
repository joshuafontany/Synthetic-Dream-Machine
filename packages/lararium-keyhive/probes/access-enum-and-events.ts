/**
 * D.1.5 PROBE — enumerate Keyhive's Access string values + capture events.
 *
 * Two questions:
 *   A. What strings does Access.tryFromString accept? (no docs; brute-force.)
 *   B. What does the Keyhive.init() event_handler actually receive?
 *      Capture a sample during a delegate ceremony.
 *
 * Run: pnpm exec tsx packages/lararium-keyhive/probes/access-enum-and-events.ts
 */

import * as KH from "@keyhive/keyhive";

console.log("[probe] === A: Access string enumeration ===");

// Try every plausible UCAN-style + filesystem-style + role-style ability string.
const candidates = [
  // UCAN/our ABILITY_LADDER
  "pull", "read", "sync", "write", "propose", "move", "admin", "revoke",
  // Filesystem-style
  "none", "r", "rw", "rwx", "owner",
  // Role-style
  "viewer", "editor", "manager", "member", "guest",
  // Concap/Keyhive-specific guesses
  "control", "delegate", "share", "execute",
  // Caps-style
  "*", "all", "any",
  // Common single chars
  "a", "w",
];

const accepted: string[] = [];
const rejected: string[] = [];

for (const s of candidates) {
  const a = KH.Access.tryFromString(s);
  if (a) {
    accepted.push(`${s} → ${a.toString()}`);
  } else {
    rejected.push(s);
  }
}

console.log("[probe] accepted:");
for (const e of accepted) console.log(`  ${e}`);
console.log("");
console.log(`[probe] rejected (${rejected.length}): ${rejected.join(", ")}`);

console.log("");
console.log("[probe] === B: event_handler capture during a delegate ceremony ===");

interface CapturedEvent { idx: number; type: string; preview: string }
const events: CapturedEvent[] = [];

function captureHandler(event: unknown): void {
  // Event class exposes .variant + .toBytes() + isDelegated/isRevoked getters.
  const e = event as KH.Event;
  let preview = "(non-Event)";
  try {
    const variant   = e.variant;
    const bytesLen  = e.toBytes().length;
    const delegated = e.isDelegated;
    const revoked   = e.isRevoked;
    preview = `variant=${variant} bytes=${bytesLen} delegated=${delegated} revoked=${revoked}`;
  } catch (err) {
    preview = `(parse-fail: ${err instanceof Error ? err.message : String(err)})`;
  }
  events.push({
    idx:   events.length,
    type:  (event as { constructor?: { name: string } })?.constructor?.name ?? typeof event,
    preview,
  });
}

const seedA = new Uint8Array(32); seedA.fill(0x42);
const seedB = new Uint8Array(32); seedB.fill(0x99);

const operator = await KH.Keyhive.init(
  KH.Signer.memorySignerFromBytes(seedA),
  KH.CiphertextStore.newInMemory(),
  captureHandler,
  false,
);
console.log(`[probe] operator init done; events captured so far: ${events.length}`);

const device = await KH.Keyhive.init(
  KH.Signer.memorySignerFromBytes(seedB),
  KH.CiphertextStore.newInMemory(),
  captureHandler,
  false,
);
console.log(`[probe] device init done; events captured so far: ${events.length}`);

// Snapshot operator events count before ceremony
const baseline = events.length;

const operatorCard = await operator.contactCard();
const deviceCard   = await device.contactCard();
const deviceIndividual = await operator.receiveContactCard(deviceCard);
await device.receiveContactCard(operatorCard);

const cid = new KH.ChangeId(new Uint8Array(32));
const doc = await operator.generateDocument([], cid, []);
const deviceAgent = await operator.getAgent(deviceIndividual.id);
const access = KH.Access.tryFromString("admin");
if (access && deviceAgent) {
  await operator.addMember(deviceAgent, doc.toMembered(), access, []);
}

console.log(`[probe] events fired during ceremony: ${events.length - baseline}`);
const variantCounts = new Map<string, number>();
for (const e of events.slice(baseline)) {
  const v = e.preview.match(/variant=(\S+)/)?.[1] ?? "(unparsed)";
  variantCounts.set(v, (variantCounts.get(v) ?? 0) + 1);
}
console.log("[probe] variant distribution:");
for (const [v, n] of [...variantCounts.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${v}: ${n}`);
}
console.log("[probe] all ceremony events:");
for (const e of events.slice(baseline)) {
  console.log(`  #${e.idx} ${e.preview}`);
}

console.log("");
console.log(`[probe] === complete; total events: ${events.length} ===`);

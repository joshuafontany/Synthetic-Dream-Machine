/**
 * PREKEY-PERSIST-REBOOT PROBE — the device-persistence question.
 *
 * Scenario (the charge): a joinee generates its card, a founder admits it + encrypts content, the joinee
 * REBOOTS (fresh Keyhive.init with the SAME seed → NEW random prekeys), then must decrypt.
 *
 * Tests three readings against alpha.6 running code:
 *   (0) live joinee-A decrypts the content it was admitted to           → baseline (expect SUCCESS)
 *   (1) rebooted joinee-B (same seed, fresh prekeys) WITHOUT import      → expect "Key not found" (the gap)
 *   (2) rebooted joinee-B AFTER importPrekeySecrets(A's export)          → expect SUCCESS (the cure)
 *
 * Run: pnpm exec tsx packages/lararium-keyhive/probes/prekey-persist-reboot.ts
 */
import * as KH from "@keyhive/keyhive";

function seed(fill: number): Uint8Array {
  const s = new Uint8Array(32);
  for (let i = 0; i < 32; i++) s[i] = (fill + i) & 0xff;
  return s;
}
function changeId(fill: number): KH.ChangeId {
  const b = new Uint8Array(32);
  for (let i = 0; i < 32; i++) b[i] = (fill + i) & 0xff;
  return new KH.ChangeId(b);
}
async function init(label: string, fill: number): Promise<KH.Keyhive> {
  const kh = await KH.Keyhive.init(KH.Signer.memorySignerFromBytes(seed(fill)), KH.CiphertextStore.newInMemory(), () => {});
  console.log(`[probe] ${label} up; whoami=${kh.idString.slice(0, 20)}…`);
  return kh;
}
async function publicEventsFor(kh: KH.Keyhive, agent: KH.Agent): Promise<unknown[]> {
  const map = await kh.eventsForAgent(agent);
  return [...(map as Map<unknown, unknown>).values()];
}
async function tryDecrypt(kh: KH.Keyhive, docBytes: Uint8Array, encBytes: Uint8Array): Promise<string> {
  const doc = await kh.getDocument(new KH.DocumentId(docBytes));
  if (!doc) return "‹no-doc-resolved›";
  const out = await kh.tryDecrypt(doc, KH.Encrypted.fromBytes(encBytes));
  return new TextDecoder().decode(out);
}

async function main(): Promise<void> {
  const PLAINTEXT = "prekey-persist-holds — a secret only a persisted member may read";
  const founder = await init("founder", 1);
  const joineeA = await init("joinee-A", 100);

  // Card A generated ONCE. Compare its shareKey against a fresh same-seed init (reboot) to show prekeys are random.
  const cardA = await joineeA.contactCard();
  const cardAShareKey = cardA.toJson();
  console.log(`[probe] card-A json=${cardAShareKey.slice(0, 24)}…`);

  // Founder admits card-A, then encrypts (order load-bearing: add BEFORE encrypt).
  const indivA = await founder.receiveContactCard(cardA);
  await joineeA.receiveContactCard(await founder.contactCard());
  const doc = await founder.generateDocument([], changeId(0), []);
  const docBytes = doc.id.toBytes();
  const access = KH.Access.tryFromString("read")!;
  const agentA = await founder.getAgent(indivA.id);
  await founder.addMember(agentA!, doc.toMembered(), access, []);
  const encBytes = (await founder.tryEncrypt(doc, changeId(50), [], new TextEncoder().encode(PLAINTEXT))).encrypted_content().serialize();
  const pub = await publicEventsFor(founder, agentA!);
  console.log(`[probe] founder admitted card-A + encrypted; ${pub.length} public events captured`);

  // ── EXPORT A's prekey secrets BEFORE reboot (this is the material we claim must persist) ──
  const exported = await joineeA.exportPrekeySecrets();
  console.log(`[probe] exportPrekeySecrets → ${exported.length}B (BTreeMap<ShareKey,ShareSecretKey> per .d.ts)`);

  // ── READING 0: live joinee-A decrypts ──
  await joineeA.ingestEventsBytes(pub as unknown[]);
  let r0 = "‹threw›";
  try { r0 = await tryDecrypt(joineeA, docBytes, encBytes); } catch (e) { r0 = `THREW: ${(e as Error).message}`; }
  console.log(`[probe] READING 0 (live joinee-A): ${r0 === PLAINTEXT ? "SUCCESS" : "FAIL → " + r0}`);

  // ── REBOOT: fresh init, SAME seed 100, brand-new store → new random prekeys ──
  const joineeB = await init("joinee-B (reboot, same seed)", 100);
  const cardB = await joineeB.contactCard();
  const cardBShareKey = cardB.toJson();
  console.log(`[probe] reboot card json=${cardBShareKey.slice(0, 24)}…  ${cardBShareKey === cardAShareKey ? "SAME as A (seed-deterministic!)" : "DIFFERENT from A → prekeys are RANDOM per init"}`);

  // ── READING 1: rebooted B WITHOUT import ──
  await joineeB.receiveContactCard(await founder.contactCard());
  await joineeB.ingestEventsBytes(pub as unknown[]);
  let r1 = "‹threw›";
  try { r1 = await tryDecrypt(joineeB, docBytes, encBytes); } catch (e) { r1 = `THREW: ${(e as Error).message}`; }
  console.log(`[probe] READING 1 (reboot, NO import): ${r1 === PLAINTEXT ? "SUCCESS (unexpected!)" : "FAIL (expected the gap) → " + r1}`);

  // ── READING 2: rebooted B AFTER importPrekeySecrets(A's export) ──
  await joineeB.importPrekeySecrets(exported);
  // re-ingest is idempotent; keep it to ensure state is present post-import
  await joineeB.ingestEventsBytes(pub as unknown[]);
  let r2 = "‹threw›";
  try { r2 = await tryDecrypt(joineeB, docBytes, encBytes); } catch (e) { r2 = `THREW: ${(e as Error).message}`; }
  console.log(`[probe] READING 2 (reboot, AFTER importPrekeySecrets): ${r2 === PLAINTEXT ? "SUCCESS — the cure holds" : "FAIL → " + r2}`);

  // ── Q3: does the rebooted+imported device RE-EXPOSE the same contact card A advertised? ──
  const cardAJson = cardA.toJson();
  let existingJson = "‹threw›", freshJson = "‹threw›";
  try { existingJson = (await joineeB.getExistingContactCard()).toJson(); } catch (e) { existingJson = `THREW: ${(e as Error).message}`; }
  try { freshJson = (await joineeB.contactCard()).toJson(); } catch (e) { freshJson = `THREW: ${(e as Error).message}`; }
  console.log(`[probe] Q3 getExistingContactCard == card-A ? ${existingJson === cardAJson ? "YES (same card re-exposed)" : "NO"}`);
  console.log(`[probe] Q3 fresh contactCard()  == card-A ? ${freshJson === cardAJson ? "YES" : "NO (a fresh card differs — PR#205 gap)"}`);

  // ── Q1b: the ARCHIVE path — serialize the WHOLE identity, restore into a fresh Keyhive ──
  // NOTE: archive taken from the LIVE joineeA (after it ingested the founder's ops + card).
  let arcDecrypt = "‹threw›", arcCardSame = "n/a";
  try {
    const archive = await joineeA.intoArchive();
    const restored = await archive.tryToKeyhive(KH.CiphertextStore.newInMemory(), KH.Signer.memorySignerFromBytes(seed(100)), () => {});
    try { arcDecrypt = await tryDecrypt(restored, docBytes, encBytes); } catch (e) { arcDecrypt = `THREW: ${(e as Error).message}`; }
    try { arcCardSame = (await restored.getExistingContactCard()).toJson() === cardAJson ? "YES (same card re-exposed)" : "NO"; } catch (e) { arcCardSame = `THREW: ${(e as Error).message}`; }
  } catch (e) { arcDecrypt = `intoArchive/tryToKeyhive THREW: ${(e as Error).message}`; }
  console.log(`[probe] Q1b ARCHIVE restore decrypt: ${arcDecrypt === PLAINTEXT ? "SUCCESS" : "FAIL → " + arcDecrypt}`);
  console.log(`[probe] Q1b ARCHIVE restore card == card-A ? ${arcCardSame}`);

  const cured = r2 === PLAINTEXT && r1 !== PLAINTEXT;
  console.log(`[probe] VERDICT: export→import ${cured ? "MAKES the rebooted same-seed device DECRYPT membership minted to its earlier card." : "did NOT close the gap as expected — inspect readings."}`);
  process.exit(cured ? 0 : 1);
}
main().catch((e) => { console.error("[probe] FATAL:", e); process.exit(1); });

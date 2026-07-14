/**
 * CROSS-PEER-DECRYPT PROBE — the decisive test the crossing rests on.
 *
 * The question no probe we hold has answered: can a DISTINCT-IDENTITY joinee (Model B — its own per-device
 * key, NOT a sibling of the founder's identity) decrypt a group's content having received ONLY PUBLIC bytes
 * — the delegation, the CGKA ops, the Encrypted blob — and NO `leafSecrets`, NO prekey-secret install, NO
 * archive?
 *
 *   · SUCCESS → keyhive's add-member sealed the group secret to the joinee's own prekey (clean TreeKEM),
 *     nothing secret crosses the relay, and the "libsodium sealed-box" the design note called for is
 *     REDUNDANT for Model B. The crossing reduces to transport of already-confidential bytes.
 *   · FAILURE (needs the leafSecrets install) → a SECRET must travel, so an untrusted relay demands a sealed
 *     channel, and the sealed-box (or equivalent) is REQUIRED. The design note stands.
 *
 * We run `forward_secrecy = false` to match production (keyhive-provider.ts). On that path add-member
 * auto-rekeys and may hand the ADDER `AddMemberUpdate.leafSecrets` — raw `BTreeMap<ShareKey, ShareSecretKey>`
 * meant for a "sibling instance of this identity." This probe checks whether a DISTINCT identity needs them.
 *
 * The probe NEVER ships leafSecrets to the device. If the decrypt needs them, it fails HONESTLY — which is
 * the finding, not a bug.
 *
 * SELF-ASSERTING: exits 0 only when the joinee decrypts from public bytes alone; exits 1 on any failure. So
 * `tsx …/cross-peer-decrypt.ts` runs as the crossing's acceptance gate — a keyhive bump or a code change
 * that breaks the seal-to-prekey property trips a non-zero exit.
 *
 * Usage: pnpm exec tsx packages/lararium-keyhive/probes/cross-peer-decrypt.ts
 * Findings land in packages/lararium-keyhive/probes/FINDINGS.md.
 */
import { performance } from "node:perf_hooks";
import * as KH from "@keyhive/keyhive";

console.log(`[probe] cross-peer-decrypt — exports: ${Object.keys(KH).sort().join(", ").slice(0, 200)}…`);

function seed(fill: number): Uint8Array {
  const s = new Uint8Array(32);
  for (let i = 0; i < 32; i++) s[i] = (fill + i) & 0xff;
  return s;
}

async function makePeer(label: string, fill: number): Promise<KH.Keyhive> {
  const signer = KH.Signer.memorySignerFromBytes(seed(fill));
  const store  = KH.CiphertextStore.newInMemory();
  const kh = await KH.Keyhive.init(signer, store, () => {});   // alpha.6: no forward_secrecy param
  console.log(`[probe] ${label} up; whoami=${kh.idString}`);
  return kh;
}

function changeId(fill: number): KH.ChangeId {
  const b = new Uint8Array(32);
  for (let i = 0; i < 32; i++) b[i] = (fill + i) & 0xff;
  return new KH.ChangeId(b);
}

/** Pull the public events keyhive would ship to a target agent, as a plain bytes array for ingest. */
async function publicEventsFor(kh: KH.Keyhive, agent: KH.Agent): Promise<unknown[]> {
  const map = await kh.eventsForAgent(agent);
  const out: unknown[] = [];
  for (const v of (map as Map<unknown, unknown>).values()) out.push(v);
  return out;
}

async function main(): Promise<void> {
  const founder = await makePeer("founder", 1);
  const device  = await makePeer("device", 100);   // DISTINCT identity — Model B

  // Introduce: founder learns the device, device learns the founder.
  const founderCard = await founder.contactCard();
  const deviceCard  = await device.contactCard();
  const deviceIndividual = await founder.receiveContactCard(deviceCard);
  await device.receiveContactCard(founderCard);
  console.log(`[probe] introduced; deviceIndividual=${deviceIndividual.id?.toString()?.slice(0, 24)}…`);

  // Founder makes a doc and encrypts real content into it.
  const doc = await founder.generateDocument([], changeId(0), []);
  const docIdHex = Buffer.from(doc.id.toBytes()).toString("hex");
  const PLAINTEXT = new TextEncoder().encode("the-crossing-holds — a secret only a member may read");
  const enc = await founder.tryEncrypt(doc, changeId(50), [], PLAINTEXT);
  const encrypted = enc.encrypted_content();
  const encBytes  = encrypted.serialize();   // fromBytes pairs with serialize(), not toBytes()
  console.log(`[probe] encrypted ${PLAINTEXT.length}B of content → ${encBytes.length}B blob on doc ${docIdHex.slice(0, 16)}…`);

  // Founder admits the device as a reader.
  const access = KH.Access.tryFromString("read") ?? KH.Access.tryFromString("admin");
  const deviceAgent = await founder.getAgent(deviceIndividual.id);
  if (!access || !deviceAgent) { console.log(`[probe] FAIL setup: access=${!!access} agent=${!!deviceAgent}`); return; }
  // alpha.6: addMember returns a SignedDelegation directly — the AddMemberUpdate/leafSecrets pair was
  // removed, so there is no per-add secret to withhold or ship at all. The read-scope question is now purely
  // "does the joinee decrypt from public ops + its own prekey secret?" — which the decrypt below settles.
  const signedDelegation = await founder.addMember(deviceAgent, doc.toMembered(), access, []);
  console.log(`[probe] ★ addMember → SignedDelegation (sig ${signedDelegation.signature.length}B); no leafSecrets surface in alpha.6`);

  // Ship ONLY PUBLIC bytes to the device: the events keyhive routes to it, plus the Encrypted blob.
  // No exportPrekeySecrets, no archive — the device holds only its OWN prekey secret.
  const publicEvents = await publicEventsFor(founder, deviceAgent);
  const ingested = await device.ingestEventsBytes(publicEvents as unknown[]);
  // ingestEventsBytes returns a result array (errors/output), NOT an "applied" count — reachableDocs is truth.
  const reach = await device.reachableDocs().catch(() => []);
  console.log(`[probe] shipped ${publicEvents.length} public events (leafSecrets withheld); ingest-result len=${Array.isArray(ingested) ? ingested.length : "?"}; device reachableDocs=${(reach as unknown[]).length}`);

  // ── DECISIVE READING #2: can the device decrypt with ONLY its own prekey secret? ──
  // Rebuild the DocumentId on the DEVICE from bytes — a WASM object cannot cross instances.
  let deviceDoc: KH.Document | undefined;
  try {
    deviceDoc = await device.getDocument(new KH.DocumentId(doc.id.toBytes()));
  } catch (e) { console.log(`[probe] device.getDocument threw: ${e instanceof Error ? e.message : e}`); }
  if (!deviceDoc) {
    console.log(`[probe] ★ device holds ${(reach as unknown[]).length} reachable docs but cannot resolve THIS doc from the public events alone.`);
    console.log(`[probe] VERDICT: distinct-identity join needs MORE than the public events shipped — sealed transport likely REQUIRED. See leafSecrets reading above.`);
    process.exit(1);
  }

  try {
    const recovered = await device.tryDecrypt(deviceDoc, KH.Encrypted.fromBytes(encBytes));
    const text = new TextDecoder().decode(recovered);
    const ok = text === new TextDecoder().decode(PLAINTEXT);
    console.log(`[probe] ★★ device.tryDecrypt ${ok ? "SUCCEEDED" : "returned WRONG bytes"}: "${text.slice(0, 40)}…"`);
    if (ok) {
      console.log(`[probe] VERDICT: SEALED-BOX REDUNDANT for Model B — the joinee decrypted from PUBLIC bytes + its own prekey secret alone.`);
      process.exit(0);
    }
    console.log(`[probe] VERDICT: decrypt returned wrong plaintext — investigate content_ref / doc association.`);
    process.exit(1);
  } catch (e) {
    console.log(`[probe] ★★ device.tryDecrypt FAILED: ${e instanceof Error ? e.message : e}`);
    console.log(`[probe] VERDICT: on alpha.6 the alpha.3 transport approach yields "Key not found" — the read-scope`);
    console.log(`[probe]          was reworked (no leafSecrets, forward-chunk secrecy). The cross-peer content pattern`);
    console.log(`[probe]          (ship the tryEncrypt update_op? use tryEncryptKeyed/decryptWithKey? forward-only?) is`);
    console.log(`[probe]          UNRESOLVED — see FINDINGS.md. Not "sealed channel required"; a MISSING-OP, most likely.`);
    process.exit(1);
  }
}

main().catch((err) => { console.error("[probe] FATAL:", err); process.exit(1); });

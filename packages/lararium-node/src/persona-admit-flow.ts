/**
 * persona-admit-flow — the node orchestration of the airgapped 3-hop persona-admission, composing the ceremony
 * library (@lararium/mesh persona-admit) + the per-vessel multitude-view store + the QR transport.
 *
 * Each hop is a SEPARATE, offline invocation (a QR crosses the airgap between them), so the on-device secret
 * persists in the consume-once pending store between hops. These flow functions carry the WHOLE per-hop logic —
 * mint/seal/open/ack + the store reads/writes + the QR render — behind injected dependencies (signers, the KEL
 * head resolver, a store dir), so the `lares persona admit` CLI thin-wraps them and the flow stays testable with
 * two simulated vessels and no real vault / camera.
 *
 * INVARIANTS held here: per-vessel-multitude-view-NEVER-syncs (every write lands in the local store, never a
 * bag); no-global-now (every step reads a local clock against a carried expiry); type-blind (a PersonaRef is
 * prefix + key-material, no branch); wax-seals-only (the grant is the persona's own signature). The B side keeps
 * its ephemeral SECRET on-device (the store, 0o600) and drops it the instant an open consumes it.
 *
 * Meme: lar:///ha.ka.ba/lararium/node/persona-admit-flow
 */

import { Repo } from "@automerge/automerge-repo";
import { NodeFSStorageAdapter } from "@automerge/automerge-repo-storage-nodefs";
import {
  mintEnrollmentOffer, sealPersonaGrant, openPersonaGrant, mintJoinAck, verifyJoinAck,
  toEnrollmentCarriage, parseEnrollmentCarriage, toGrantCarriage, parseGrantCarriage,
  toAckCarriage, parseAckCarriage,
  headOpKey, personaKelChainForPrefix, personaKelBoardDocUrl, materializeSharedLarDoc,
  type PersonaRef, type AdmitSigner, type JoinRecord, type EnrollmentOffer, type SealedGrant, type JoinAck,
} from "@lararium/mesh";
import { loadVesselVerifyingKey } from "./node-vessel-identity.js";
import { larDataDir } from "./vessel-paths.js";
import {
  recordAdmittedPersona, stashEnrollmentSecret, peekEnrollmentSecrets, takeEnrollmentSecret,
  stashSentMemo, takeSentMemo,
} from "./node-persona-admit-store.js";
import { qrCarriageToTerminalResilient } from "./qr-transport.js";

/** A flow result carrying the hop's carriage + a terminal QR of it (a tabletop hand-off). */
export interface HopRender {
  readonly carriage:   string;
  /** The scannable terminal QR (empty when oversized — the carriage still travels as a paste / PNG). */
  readonly terminalQr: string;
  /** The ECC the QR fit at (H for small hops; degraded only if forced), or null when oversized. */
  readonly qrEcc:      "H" | "Q" | "M" | "L" | null;
  /** True when the carriage exceeds a single static QR even at ECC-L — the reserved bc-ur multi-part leg's cue. */
  readonly qrOversized: boolean;
}

async function render(carriage: string): Promise<HopRender> {
  const r = await qrCarriageToTerminalResilient(carriage);
  return { carriage, terminalQr: r.qr, qrEcc: r.ecc, qrOversized: r.oversized };
}

/**
 * Build the ruling-#3 head resolver off THIS vessel's LOCAL persona-KEL board replica: a prefix → its CURRENT
 * head op-key (verifying the KEL's structure + rotation quorums), or null when the prefix is unknown / unsynced
 * (fail-closed). A throwaway repo reads the flushed board without disturbing a running vessel. The open step
 * checks the grant's op-key IS this head (rotate-not-resurrect); a same-Nexus target already carries the
 * granter's persona-KEL (it federates once), a cross-Nexus one that lacks it draws the fail-closed refusal.
 */
export async function makeLocalPersonaKelHeadResolver(dir?: string): Promise<(prefix: string) => Promise<string | null>> {
  const dataDir = dir ?? larDataDir();
  const nexusPubkey = await loadVesselVerifyingKey(dataDir);
  const repo = new Repo({ storage: new NodeFSStorageAdapter(dataDir) });
  const board = await materializeSharedLarDoc(repo, personaKelBoardDocUrl(nexusPubkey), "@persona-kel-board");
  return async (prefix: string): Promise<string | null> => {
    const chain = personaKelChainForPrefix(board.doc(), prefix);
    if (!chain || chain.length === 0) return null;
    return headOpKey(chain, { verifyQuorums: true });
  };
}

/**
 * HOP 1 (B): mint an enrollment offer for this vessel's device key, STASH the on-device ephemeral secret
 * (consume-once), and render QR#1. The secret never leaves the store; only the offer travels.
 */
export async function offerAdmitFlow(args: {
  readonly deviceVerifyingKey: string;
  readonly dir?:               string;
  readonly expiryMs?:          number;
  readonly now?:               number;
}): Promise<{ offer: EnrollmentOffer } & HopRender> {
  const { offer, secret } = mintEnrollmentOffer({
    targetVesselId: args.deviceVerifyingKey,
    ...(args.expiryMs !== undefined ? { expiryMs: args.expiryMs } : {}),
    ...(args.now !== undefined ? { now: args.now } : {}),
  });
  stashEnrollmentSecret(offer.ephemeralPubkey, secret, args.dir);
  return { offer, ...(await render(toEnrollmentCarriage(offer))) };
}

/**
 * HOP 2 (A): read B's offer carriage, seal a persona→vessel grant signed by the persona-prefix op-key, STASH
 * the sent memo (to verify B's ACK later), and render QR#2. Refuses a torn / expired offer (fail-closed).
 */
export async function grantAdmitFlow(args: {
  readonly offerCarriage: string;
  readonly personaRef:    PersonaRef;
  readonly personaSigner: AdmitSigner;
  readonly dir?:          string;
  readonly expiryMs?:     number;
  readonly now?:          number;
}): Promise<({ sealed: SealedGrant } & HopRender) | { error: string }> {
  const offer = parseEnrollmentCarriage(args.offerCarriage);
  if (!offer) return { error: "not a valid enrollment offer carriage — the QR did not arrive" };
  let sealed: SealedGrant;
  let sent;
  try {
    ({ sealed, sent } = await sealPersonaGrant({
      offer, personaRef: args.personaRef, personaSigner: args.personaSigner,
      ...(args.expiryMs !== undefined ? { expiryMs: args.expiryMs } : {}),
      ...(args.now !== undefined ? { now: args.now } : {}),
    }));
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
  stashSentMemo(sent, args.dir);
  return { sealed, ...(await render(toGrantCarriage(sealed))) };
}

/**
 * HOP 3 (B): read A's sealed grant, try to open it against EACH pending enrollment (B cannot know which offer a
 * grant answers until one decrypts), verify against the persona PREFIX head, consume the matching secret, RECORD
 * the join into THIS vessel's multitude-view, mint + render the ACK (QR#3). Fail-closed at every seam.
 */
export async function openAdmitFlow(args: {
  readonly grantCarriage:    string;
  readonly resolveHeadOpKey: (prefix: string) => Promise<string | null> | string | null;
  readonly deviceSigner:     AdmitSigner;
  readonly dir?:             string;
  readonly now?:             number;
}): Promise<({ joinRecord: JoinRecord } & HopRender) | { error: string }> {
  const sealed = parseGrantCarriage(args.grantCarriage);
  if (!sealed) return { error: "not a valid sealed-grant carriage — the QR did not arrive" };

  const pending = peekEnrollmentSecrets(args.dir);
  if (pending.length === 0) return { error: "no pending enrollment on this vessel — run `persona admit offer` first" };

  let lastReason = "no pending enrollment matched this grant";
  for (const { ephemeralPubkey, secret } of pending) {
    const verdict = await openPersonaGrant({
      sealed, secret, resolveHeadOpKey: args.resolveHeadOpKey,
      ...(args.now !== undefined ? { now: args.now } : {}),
    });
    if (!verdict.ok) { lastReason = verdict.reason; continue; }
    // A matching enrollment: consume its secret (never re-usable) + record the join into the local view.
    takeEnrollmentSecret(ephemeralPubkey, args.dir);
    const { ack, joinRecord } = await mintJoinAck({ accepted: verdict.accepted, secret, deviceSigner: args.deviceSigner });
    recordAdmittedPersona(joinRecord, args.dir);
    return { joinRecord, ...(await render(toAckCarriage(ack))) };
  }
  return { error: lastReason };
}

/**
 * HOP 3-close (A): read B's ACK, look up the sent memo by nonce_A, verify the ACK against it + B's device key,
 * and RECORD the matching join into A's OWN multitude-view. Both vessels now hold the mutually-signed record.
 */
export async function acceptAdmitFlow(args: {
  readonly ackCarriage: string;
  readonly dir?:        string;
  readonly now?:        number;
}): Promise<{ joinRecord: JoinRecord } | { error: string }> {
  const ack: JoinAck | null = parseAckCarriage(args.ackCarriage);
  if (!ack) return { error: "not a valid ACK carriage — the QR did not arrive" };
  const memo = takeSentMemo(ack.joinRecord.nonceA, args.dir);
  if (!memo) return { error: "no sent grant matches this ACK's nonce — the grant was never issued from this vessel (or already accepted)" };
  const verdict = await verifyJoinAck({ ack, sent: memo, ...(args.now !== undefined ? { now: args.now } : {}) });
  if (!verdict.ok) {
    // Re-stash the memo: a transient bad ACK must not silently discard a legitimately-pending grant.
    stashSentMemo(memo, args.dir);
    return { error: verdict.reason };
  }
  recordAdmittedPersona(verdict.joinRecord, args.dir);
  return { joinRecord: verdict.joinRecord };
}


export {
  load as automergeLoad,
  save as automergeSave,
  init as automergeInit,
  change as automergeChange,
  getHeads,
} from "@automerge/automerge";
export type { Heads, Doc as AutomergeDoc } from "@automerge/automerge";
export * from "./base-doc.js";
export * from "./cas.js";
export * from "./resolver.js";
export * from "./bag-residency.js";
export * from "./vessel-identity-core.js";
export * from "./anchor-store.js";
export * from "./persona-vault.js";
export * from "./persona-petname.js";
export * from "./persona-glamour.js";
export * from "./recovery-keel-core.js";
export * from "./guardian-card.js";
export * from "./charter-reserve.js";
export * from "./capability.js";
export * from "./crypto.js";
export * from "./agile-digest.js";
export * from "./projection-registry.js";
export * from "./readiness.js";
export * from "./lar-uris.js";
export * from "./boot-resolver.js";
export * from "./build-patch.js";
export * from "./branch-frontier.js";
export * from "./gone-turns.js";
export * from "./stream-adapter.js";
export * from "./text-stream-adapter.js";
export * from "./sensorium-pc.js";
export * from "./aperture-selector.js";
export * from "./epoch-lease.js";
export * from "./device-delegation.js";
export * from "./oracle-substrate.js";
export * from "./oracle-read-client.js";
export * from "./mesh-palace.js";
export * from "./bearing-harvest.js";
export * from "./turn-harvest.js";
export * from "./stamp-filter.js";
export * from "./mirror-paths.js";
export * from "./tiddler-store.js";
export * from "./recipe.js";
export { bagStackFromRec } from "./bag-stack-from-rec.js";
export * from "./composite-store.js";
export * from "./sensorium-consistency.js";
export * from "./sensorium-contract.js";
export * from "./sensorium-fusion.js";
export * from "./sensorium-efe.js";
export * from "./itc.js";
export * from "./ffz-clock.js";
export * from "./ffz-project.js";
export * from "./worldline-clock.js";
export * from "./worldline-edge.js";
export * from "./worldline-trajectory.js";
export * from "./worldline-inject-detect.js";
export * from "./capture-nalu.js";
export * from "./capture-engine.js";
export * from "./projection-nalu.js";
export * from "./gate-tuning.js";
export * from "./pono-level.js";
export * from "./lar-event-bus.js";
export { LarEventBusImpl, DEFAULT_RINGS } from "./lar-event-bus-impl.js";
export * from "./social-tiddlers.js";
export * from "./automerge-doc-store.js";
export * from "./lar-vessel.js";
export * from "./lararium-vessel.js";
export type { IdentitySlot, CapabilityToken, ActorId } from "./identity-slot.js";
export { OpenIdentitySlot } from "./identity-slot.js";
export type { FederationGate } from "./federation-gate.js";
export { DeterministicFederationGate, federationShareDecision, identityShareDecision } from "./federation-gate.js";
export type { IdentityRing } from "./federation-gate.js";
export type { AntigenRing } from "./federation-gate.js";
export { presenterIsKapaed, carryContractShareDecision, classifyCrossOperatorAdmission } from "./federation-gate.js";
export type { CrossOperatorAdmission } from "./federation-gate.js";
export { memberCarryShareDecision, capTierShareDecision } from "./federation-gate.js";
export type { NexusMembership, PlaneSeal } from "./federation-gate.js";
// The bag's sharing-posture as SELF-DESCRIBING DATA — the 4-tier total order + the tighten-only keystone.
export type { CapTier, TierFloorOracle, DeclaredTierSource, CapTierRing } from "./cap-tier.js";
export {
  CAP_TIER_ORDER, DEFAULT_CAP_TIER, capTierRank, parseCapTier, meetCapTier, resolveTier,
  refineBagTierWithTiddlers, mayDeclareTier, mayDeclassify, structuralFloorFor, resolveTierForDoc,
  tierPermitsRelayPeer,
} from "./cap-tier.js";
// The @cad ENCRYPT-ON-CAS primitive — cid = BLAKE3(ciphertext), verify-cap ⊥ read-cap, per-Nexus message-lock.
export {
  ciphertextCid, verifyCiphertextCid, deriveMessageKey, sealBodyOnCas, openBodyOnCas,
  CIPHERTEXT_CID_ALGO, CONVERGENCE_SECRET_LEN, require32,
} from "./ciphertext-cas.js";
export type { SealedBody } from "./ciphertext-cas.js";
// The @cad REMOTE TRANSIT leg — DHT-free discovery + secret-free BLAKE3(bytes)==cid verify (verify-cap ⊥ read-cap).
export {
  wantHave, have, dontHave, wantBlock, block,
  fetchCidOverTransit, makeCidResolver,
} from "./cas-transit.js";
export type {
  CasHolder, CasTransitMessage, CasTransitTransport, LocalCasRead, LocalCasCache,
} from "./cas-transit.js";
// The open-beta federation POSTURE — the outer gate over cross-operator admission (private/open, default private).
export type { FederationPosture } from "./federation-gate.js";
export { DEFAULT_FEDERATION_POSTURE, postureGatesCrossOperator, admitCrossOperatorUnderPosture } from "./federation-gate.js";
export * from "./quorum-entry.js";
export * from "./sealed-box.js";
export * from "./kapae-antigen.js";
export { antigenEntriesFromBoard, writeAntigenEntry, antigenEntryKey, ANTIGEN_ENTRY_PREFIX } from "./antigen-board.js";
// The operator MEMBERS-registry — the Kapae-antigen's ALLOW-twin (members{} ⊥ blocked{}); contracts, never identities.
export * from "./membership-registry.js";
export { membershipEntriesFromBoard, writeMembershipEntry, membershipEntryKey, MEMBERS_ENTRY_PREFIX } from "./members-board.js";
// The TRACELESS boot-invite — a sealed single-use capability spent-on-boot; no voucher, no board record.
export * from "./boot-invite.js";
export {
  personaKelEventsFromBoard, personaKelChainsFromBoard, personaKelChainForPrefix,
  writePersonaKelEvent, personaKelEntryKey, PERSONA_KEL_ENTRY_PREFIX,
} from "./persona-kel-board.js";
export * from "./mu-void.js";
export * from "./nexus-charter-seed.js";
export * from "./meme-provider.js";
export * from "./reaction-graph.js";
export * from "./wiki-recipe.js";
export * from "./verb-tiddler.js";
export * from "./residency-actions.js";
export * from "./content-handle.js";
export * from "./effect-record.js";
export * from "./kumu-device.js";
export * from "./genesis-doc.js";
export * from "./genesis-intake.js";
export * from "./island-protocol.js";
export * from "./conformance-verb-breathing.js";
export * from "./social-seed.js";
export { didKeyFromVerifyingKey, buildCeremonyTiddlers } from "./cold-boot-ceremony.js";
export type { CeremonyTiddler } from "./cold-boot-ceremony.js";
export type { Repo, DocHandle, AutomergeUrl, StorageAdapterInterface } from "@automerge/automerge-repo";
export { makeIslandRepo, attachMessageChannelSync } from "./island-repo.js";
export type { IslandRepoConfig } from "./island-repo.js";
export { assembleVessel, mountWikiSlot } from "./open-vessel-core.js";
export type { VesselRecipe, VesselBootstrap, VesselCoreAssembly } from "./open-vessel-core.js";
export { awaitIslandMsg } from "./vessel-host.js";
export type { AwaitIslandMsgOpts, VesselWorkerHandle, VesselIslandHost } from "./vessel-host.js";
export { VesselIslandPoolCore } from "./vessel-island-pool-core.js";
export { makeWikiActivationCap } from "./wiki-activation.js";
export type { WikiActivationCap, WikiActivationGrant, ActivationResidency, ActivationPool, ResolveWikiSpec } from "./wiki-activation.js";
export { makeDurableMailbox, type DurableMailbox, type MailboxVerb } from "./vessel-mailbox.js";
export type { VesselIslandPoolCoreOptions, DiskMirrorGrant } from "./vessel-island-pool-core.js";
export {
  AUTH_WIRE_VERSION, AUTH_PROOF_TTL_MS,
  mkLarChallenge, mkLarAuth, mkLarAuthOk, mkLarAuthDenied,
  isLarChallengeMsg, isLarAuthMsg, isLarAuthOkMsg, isLarAuthDeniedMsg,
  authProofBytes, buildAuthResponse, verifyAuthProof, runPeerHandshake,
  ed25519SignerFromSeed,
} from "./auth-wire.js";
export type {
  AuthWireVersion,
  LarChallengeMsg, LarAuthMsg, LarAuthOkMsg, LarAuthDeniedMsg, LarAuthWireMsg,
  AuthProofWire, PeerHandshake, LeafIdentity,
} from "./auth-wire.js";
export { LarWSClientAdapter } from "./lar-ws-client-adapter.js";
export type { LarWSClientOptions } from "./lar-ws-client-adapter.js";
export * from "./cap-compose.js";
export * from "./carriage-caps.js";
export * from "./persona-hd.js";
export * from "./persona-identity.js";
export * from "./cabal-place.js";
export * from "./cabal-invite.js";
export * from "./lineage-rank.js";
export * from "./admission-price.js";
export * from "./vouch-dag.js";
export * from "./dreamnet-admission.js";
export * from "./handle-card.js";
export * from "./handle-book.js";
// The card-arrival front door — decode a carried (paste / QR / URL-fragment) HandleCard so a follow can admit
// an unmet nym WITHOUT the CLI's `--card <file>` (the card arrives as data, boot-invite posture).
export * from "./handle-carriage.js";
// The type-blind PERSONA-ADMISSION ceremony (airgapped device-to-device persona handoff) — the 3-hop ECDH-sealed
// choreography + its carried QR envelopes. A photographed tabletop stays inert; the join writes per-vessel only.
export * from "./persona-admit.js";
export * from "./persona-admit-carriage.js";
// STAGE 2 (A1-①): the per-Nexus convergence keyring delivered to a joinee at admission via a sealed envelope
// (the persona-admit sealed-box shape). An admitted device opens it + reads sealed bodies; a carry-only peer cannot.
export * from "./keyring-envelope.js";
// The IoC follow — composeFollow braids the three LOCAL stores (handle-book · petname · circle) into one
// gesture; the CircleStore seam is local-only, so a follow leaves NO central trace (membership-doctrine).
export * from "./compose-follow.js";
export * from "./handle-announce.js";
export * from "./who-face.js";
export * from "./who-face-cap.js";
export * from "./deterministic-doc.js";
export * from "./cabal-place-charter.js";
export * from "./cabal-place-clock.js";
export * from "./me-circle.js";
export * from "./fork-place.js";
export * from "./veil-crossing.js";
export * from "./veil-vouch.js";
export * from "./veil-ladder.js";
export * from "./immune-read.js";
export * from "./shamir-gf256.js";
export * from "./recovery-share.js";
export * from "./holder-continuity.js";
export * from "./anergy-ledger.js";
export * from "./recovery-seat.js";
export * from "./wax-stamp.js";
export * from "./persona-kel.js";
export * from "./conviction-dial.js";
export * from "./capture-reading.js";
export * from "./transfer-entropy.js";
export * from "./edge-kind.js";
export * from "./nucleation-gate.js";
export * from "./temporal-rigidity.js";
export * from "./clock-recovery.js";
export * from "./sink.js";
export * from "./sink-class.js";
export * from "./commit-dial.js";
export * from "./purple-minter.js";
export * from "./spectral-keel.js";
export * from "./spectral-keel-cap.js";
export * from "./null-harness.js";
export * from "./numerics.js";
export * from "./arl-dial.js";
export * from "./subspace-track.js";
export * from "./synthetic-drift.js";
export * from "./sink-flow.js";
export * from "./partition-monitor.js";
export * from "./self-coupling.js";
export * from "./mesh-coupling.js";
export * from "./te-hodge.js";
export * from "./who-sensory-seam.js";
export * from "./sensory-seam.js";
export * from "./gaussian-cmi.js";
export * from "./bures-metric.js";
export * from "./fisher-rao.js";
export * from "./mesh-coupling-mv.js";
export * from "./cmi-significance.js";
export * from "./signed-innovation.js";
export * from "./mesh-couple.js";
export * from "./change-point.js";
export * from "./windowed-coupling.js";
export * from "./linearity-gate.js";
export * from "./rank-te.js";
export * from "./rank-consensus.js";
export * from "./membership-channel.js";


export * from "./persistence-keel.js";

export * from "./capture-drain.js";

export * from "./concurrency-dial.js";

export * from "./parallel-ingest.js";

export * from "./credit-gate.js";

export * from "./merge-gate.js";

export * from "./store-integrity.js";
export * from "./archive-envelope.js";
export * from "./ingest-tolerant.js";

export * from "./doc-load-probe-contract.js";

export * from "./doctor-sweep.js";
export * from "./pack-provenance.js";

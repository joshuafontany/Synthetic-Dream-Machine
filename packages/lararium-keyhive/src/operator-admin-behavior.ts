/**
 * operator-admin-behavior — the keyhive-wired admin island behavior, shared.
 *
 * The node and browser admin entry points were byte-identical except for which
 * platform run-function they called. The keyhive wiring — boot keyhive in-worker
 * from `manifest.adminAuth`, then supply makeAdminBehavior's three callbacks
 * (verifierFactory, verifyPeer, resolveBinding) — lives here ONCE. Each entry
 * now only picks its platform kernel and passes this factory.
 *
 * Home: keyhive (it owns the keyhive wiring) composes tw5's keyhive-free
 * makeAdminBehavior. tw5 stays keyhive-free; keyhive → tw5 is acyclic.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/keyhive/operator-admin-behavior
 */

import { makeAdminBehavior } from "@lararium/tw5";
import type { IslandBehavior, IslandContext } from "@lararium/tw5";
import type { IslandMsg_Manifest, AuthProofWire } from "@lararium/mesh";
import { PERSONAL_BINDINGS_PREFIX, DRAFT_BINDINGS_PREFIX, verifyAuthProof } from "@lararium/mesh";
import { bootAdminKeyhive } from "./boot-admin-keyhive.js";
import { AdminEventStore } from "./admin-event-store.js";
import { resolveOrMintBinding } from "./resolve-binding.js";
import type { KeyhiveProvider } from "./keyhive-provider.js";

/**
 * Build the operator's admin-island behavior from a manifest. With no auth
 * material, falls back to the verifier-less behavior (delegated-verb path only);
 * admin manifests always carry adminAuth, so that path guards tests.
 */
export function makeOperatorAdminBehavior(manifest: IslandMsg_Manifest): IslandBehavior {
  const adminAuth = manifest.adminAuth;
  if (!adminAuth) return makeAdminBehavior();

  let kh: KeyhiveProvider | null = null;
  let mintedByHex = adminAuth.operatorVerifyingKey;

  return makeAdminBehavior({
    verifierFactory: async (ctx: IslandContext) => {
      const { keyhive, did } = await bootAdminKeyhive({
        seed:                  adminAuth.seed,
        eventStore:            new AdminEventStore({ admin: ctx.composite }),
        operatorVerifyingKey:  adminAuth.operatorVerifyingKey,
        personGroupDocIdHex:   adminAuth.personGroupDocIdHex,
        personGroupAgentIdHex: adminAuth.personGroupAgentIdHex,
        meshCabalDocIdHex:     adminAuth.meshCabalDocIdHex,
        registerBags:          adminAuth.registerBags,
      });
      kh = keyhive;
      mintedByHex = did;
      return keyhive;
    },

    verifyPeer: async (cardBytes: Uint8Array, bagUrl: string, access: "read" | "admin", proof?: AuthProofWire) => {
      if (!kh) return { ok: false, reason: "keyhive not booted" };
      const { id } = await kh.receiveContactCard(cardBytes);
      const verdict = await kh.verify({ presenter: id, bagUrl, access });

      // V3 proof-of-possession (project_verification_placement): the keyholder
      // worker — the only place that holds BOTH the gate's own key and the peer's
      // real key — checks the relayed signature. Conservative-caller law: derive
      // both pubkeys from TRUSTED sources, never the wire.
      //   gatePubKey = this gate's OWN verifying key (operatorVerifyingKey) — so a
      //     proof signed for a different gate fails here (anti-relay).
      //   peerPubKey = the raw ed25519 key, the suffix of the card-derived
      //     Identifier hex (the same relationship bootAdminKeyhive Gate A relies on:
      //     did.endsWith(verifyingKey)).
      // proofVerified rides back ADVISORY-ONLY for now. ENFORCEMENT FLIP (V3 step D):
      // change `ok` below to `verdict.ok && proofVerified` once every peer transport
      // (C) sources a real proof — until then a flip would brick all sync.
      let proofVerified: boolean | undefined;
      if (proof) {
        const peerPubKey = id.slice(-64); // raw 32-byte ed25519 verifying key (hex)
        const r = await verifyAuthProof({
          nonce:      proof.nonce,
          gatePubKey: mintedByHex.slice(-64),
          peerPubKey,
          aud:        bagUrl,
          ts:         proof.ts,
          sig:        proof.sig,
          now:        Date.now(),
        });
        proofVerified = r.ok;
      }

      return {
        ...verdict,
        identifier: id,
        ...(proofVerified !== undefined ? { proofVerified } : {}),
      };
    },

    resolveBinding: async (ctx: IslandContext, fingerprint: string, recipeTrace: { wikiDocId: string; canonBagDocIds: readonly string[] }) => {
      if (!kh) throw new Error("keyhive not booted");
      const common = {
        fingerprint, repo: ctx.repo, adminStore: ctx.composite, keyhive: kh,
        personGroupAgentIdHex: adminAuth.personGroupAgentIdHex, mintedByHex, recipeTrace,
      } as const;
      const personal = await resolveOrMintBinding({ ...common, kind: "personal-binding", prefix: PERSONAL_BINDINGS_PREFIX });
      const draft    = await resolveOrMintBinding({ ...common, kind: "draft-binding",    prefix: DRAFT_BINDINGS_PREFIX });
      return { personalUrl: personal.url, draftUrl: draft.url };
    },
  });
}

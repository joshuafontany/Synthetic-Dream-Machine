/**
 * lar-admin-island — Node.js admin island entry point.
 *
 * Sovereign admin island AND the operator's authn/z home (isomorphic-vessel
 * Stage 1). Runs the shared sovereign-island-model lifecycle with the isomorphic
 * makeAdminBehavior. The thin factory below is the platform seam where the
 * shared pieces wire together: it boots keyhive IN this worker (the seed arrives
 * via `manifest.adminAuth`), then supplies makeAdminBehavior's three opaque
 * callbacks — verifierFactory (verb-dispatch verifier), verifyPeer (inbound-peer
 * proxy for the host WS gate), resolveBinding (@personal/@draft mint). Keeping
 * keyhive here, not in @lararium/tw5, lets makeAdminBehavior stay keyhive-free.
 *
 * VerbDispatcher subscribes to TW5 wiki change events — the kumu device law.
 * Wiki-scope verbs delegate to vessel via AdminMsg_DelegateVerb / VerbResult.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/node/lar-admin-island
 */

import { runSovereignWorker } from "./sovereign-island-model.js";
import { makeAdminBehavior }  from "@lararium/tw5";
import {
  bootAdminKeyhive, AdminEventStore, resolveOrMintBinding,
  KeyhiveProvider,
} from "@lararium/keyhive";
import { PERSONAL_BINDINGS_PREFIX, DRAFT_BINDINGS_PREFIX } from "@lararium/mesh";

runSovereignWorker((manifest) => {
  const adminAuth = manifest.adminAuth;
  // No auth material → fall back to the verifier-less behavior (delegated-verb
  // path only). Admin manifests always carry adminAuth, so this guards tests.
  if (!adminAuth) return makeAdminBehavior();

  let kh: KeyhiveProvider | null = null;
  let mintedByHex = adminAuth.operatorVerifyingKey;

  return makeAdminBehavior({
    verifierFactory: async (ctx) => {
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

    verifyPeer: async (cardBytes, bagUrl, access) => {
      if (!kh) return { ok: false, reason: "keyhive not booted" };
      const { id } = await kh.receiveContactCard(cardBytes);
      const verdict = await kh.verify({ presenter: id, bagUrl, access });
      return { ...verdict, identifier: id };
    },

    resolveBinding: async (ctx, fingerprint, recipeTrace) => {
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
});

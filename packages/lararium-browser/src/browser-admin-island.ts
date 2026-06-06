/**
 * browser-admin-island — browser Web Worker entry point for the admin island.
 *
 * Sovereign admin island AND the operator's authn/z home (isomorphic-vessel
 * Stage 1). Platform counterpart of lar-admin-island.ts (Node) — the SAME shared
 * pieces (makeAdminBehavior, bootAdminKeyhive, resolveOrMintBinding) wire here
 * through the browser sovereign kernel. The thin factory boots keyhive in this
 * Worker (seed via manifest.adminAuth) and supplies makeAdminBehavior's three
 * opaque callbacks. New-operator first boot founds on the host before this Worker
 * spawns; the worker always gates an already-founded operator.
 *
 * Island Sovereignty Law §9: TW5 boots here, inside a sovereign Worker.
 * DOM types do not appear in this file (BA-1). `self` is the sole platform surface.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/browser/browser-admin-island
 */

import { runBrowserSovereignWorker } from "./browser-sovereign-island-model.js";
import { makeAdminBehavior }          from "@lararium/tw5";
import {
  bootAdminKeyhive, AdminEventStore, resolveOrMintBinding,
  KeyhiveProvider,
} from "@lararium/keyhive";
import { PERSONAL_BINDINGS_PREFIX, DRAFT_BINDINGS_PREFIX } from "@lararium/mesh";

runBrowserSovereignWorker((manifest) => {
  const adminAuth = manifest.adminAuth;
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

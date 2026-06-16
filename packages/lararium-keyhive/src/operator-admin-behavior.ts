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

import {
  makeAdminBehavior, makeWhereReactor, makeResolveReactor, makeListWikisReactor,
  makePinReactor, makeUnpinReactor, makeRegisterColdReactor, registerActionReactors,
  makeWikiPinReactor, makeWikiUnpinReactor,
  makeCatalogAccessor,
  makeInitWikiReactor, makeOpenWikiReactor, makeDraftReactor, makePruneStaleReactor,
  makeWardAlertReactor,
  makeAddBagReactor, makeRemoveBagReactor, makeEpochBagReactor, makeRotateRecipeReactor,
} from "@lararium/tw5";
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
    // Sovereign-worker data-plane: register the read-only reactors in-worker over the
    // IslandContext composite (verify-then-delegate gate inherited). The first slice
    // off the old main-thread jobRegistry; pool-touching residency reactors follow.
    wireWorkerVerbs: (registry, ctx: IslandContext) => {
      // `where` reaches every registered bag across both oracle planes by ACCESS
      // (access≠load) — the admin queries all bags, mounts none (reopened hoike
      // #oracle-planes-verb-execution, 2026-06-16). resolve stays cascade-scoped.
      registry.register("where",      makeWhereReactor(ctx.composite, { repo: ctx.repo, catalogUrl: ctx.catalogUrl, oracleUrl: ctx.oracleUrl }));
      registry.register("resolve",    makeResolveReactor(ctx.composite));
      // Residency ACTION verbs (ADD/COPY/MOVE/CLEAR/DROP/LOAD) — composite-only, now
      // in every vessel's worker, verify-then-delegate gated. The `lares act` front door.
      registerActionReactors(registry, { composite: ctx.composite });
      // Residency mutators (pin/unpin/register-cold) — gated in-worker; they command the
      // main-resident BagResidencyManager via admin:residency-op (ctx.post). `residency`
      // stats (a read) stays main pending the askMain research.
      registry.register("pin",           makePinReactor(ctx.post));
      registry.register("unpin",         makeUnpinReactor(ctx.post));
      registry.register("register-cold", makeRegisterColdReactor(ctx.post));

      // draft needs no catalog — register it regardless of slot.
      registry.register("draft", makeDraftReactor({ composite: ctx.composite }));

      // Disk-ward refusals (wiki-island projector → worker.event bridge) — audit
      // in @admin + $:/tags/Alert into the operator's pinned VM.
      registry.register("ward-alert", makeWardAlertReactor(ctx.composite, ctx.post));

      // Every other admin verb reaches USER registry data in @catalog (wiki oracles,
      // recipes) via the accessor over ctx.repo/ctx.catalogUrl — access≠load. The admin
      // recipe NEVER loads @catalog as tiddlers. All ride the verify-then-delegate gate.
      // operatorDid matches the old main reactors exactly ("0x"+operatorVerifyingKey) so
      // draft keys never drift.
      if (ctx.catalogUrl) {
        const catalog = makeCatalogAccessor(ctx.repo, ctx.catalogUrl);
        const wikiMintOpts = {
          composite:   ctx.composite,
          repo:        ctx.repo,
          catalog,
          rootDir:     "",
          operatorDid: async () => "0x" + adminAuth.operatorVerifyingKey,
        };
        registry.register("init-wiki",   makeInitWikiReactor(wikiMintOpts));
        registry.register("open-wiki",   makeOpenWikiReactor({ composite: ctx.composite, catalog, post: ctx.post }));
        registry.register("prune-stale", makePruneStaleReactor(wikiMintOpts));
        registry.register("list-wikis",  makeListWikisReactor(catalog));
        // Whole-wiki residency policy — read the @catalog recipe, command main's manager
        // per bag via admin:residency-op. Pure policy, no live-layer mechanism.
        registry.register("pin-wiki",      makeWikiPinReactor(catalog, ctx.post));
        registry.register("unpin-wiki",    makeWikiUnpinReactor(catalog, ctx.post));
        // Recipe composition — write the @catalog recipe, command residency via op. NO
        // live-layer mount/unmount: the recipe syncs, islands reconcile their own stacks.
        registry.register("add-bag",       makeAddBagReactor({ catalog, post: ctx.post }));
        registry.register("remove-bag",    makeRemoveBagReactor({ catalog, post: ctx.post }));
        // Catalog-writing residency verbs — mint/oracle via accessor + repo, command
        // residency via post. No live-layer swap (oracle/recipe sync; islands reconcile).
        registry.register("bag-epoch",     makeEpochBagReactor({ repo: ctx.repo, catalog, post: ctx.post }));
        registry.register("rotate-recipe", makeRotateRecipeReactor({ repo: ctx.repo, catalog, post: ctx.post }));
      }
    },
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
      let proofVerified = false;
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

      // ENFORCEMENT FLIP (V3 step D): admission requires BOTH a satisfied
      // capability (`verdict.ok`) AND a verified proof-of-possession. Every live
      // peer transport now sources a real proof (the CLI via LarWSClientAdapter;
      // the browser stays passive). ESCAPE HATCH: a node operator MAY set
      // LAR_V3_ALLOW_UNPROVEN=1 to fall back to capability-only admission (the
      // prior advisory posture) if a live handshake regression surfaces — guarded
      // for browser-safety (no `process` there; the browser holds no inbound peer).
      const enforce = !(typeof process !== "undefined" && process.env?.["LAR_V3_ALLOW_UNPROVEN"] === "1");
      if (enforce && !proofVerified) {
        return { ok: false, identifier: id, proofVerified, reason: proof ? "V3 proof verification failed" : "V3 proof required" };
      }

      return { ...verdict, identifier: id, proofVerified };
    },

    resolveBinding: async (ctx: IslandContext, fingerprint: string, recipeTrace: { wikiDocId: string; libraryBagDocIds: readonly string[] }) => {
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

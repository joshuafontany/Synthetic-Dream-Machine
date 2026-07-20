/**
 * operator-daemon-behavior — the keyhive-wired daemon island behavior, shared.
 *
 * The node and browser daemon entry points were byte-identical except for which
 * platform run-function they called. The keyhive wiring — boot keyhive in-worker
 * from `manifest.daemonAuth`, then supply makeDaemonBehavior's three callbacks
 * (verifierFactory, verifyPeer, resolveBinding) — lives here ONCE. Each entry
 * now only picks its platform kernel and passes this factory.
 *
 * Home: keyhive (it owns the keyhive wiring) composes tw5's keyhive-free
 * makeDaemonBehavior. tw5 stays keyhive-free; keyhive → tw5 is acyclic.
 *
 * Meme: lar:///ha.ka.ba/lararium/keyhive/operator-daemon-behavior
 */

import {
  makeDaemonBehavior, makeWhereReactor, makeResolveReactor, makeListWikisReactor,
  makePinReactor, makeUnpinReactor, makeRegisterColdReactor, registerActionReactors, makeTw5Deserializer,
  makeWikiPinReactor, makeWikiUnpinReactor,
  makeCatalogAccessor,
  makeInitWikiReactor, makeOpenWikiReactor, makeDraftReactor, makePruneStaleReactor,
  makeWardAlertReactor,
  makeAddBagReactor, makeRemoveBagReactor, makeEpochBagReactor, makeRotateRecipeReactor,
  makeSwitcherStateReactor,
} from "@lararium/tw5";
import type { IslandBehavior, IslandContext, DaemonBehaviorOptions } from "@lararium/tw5";
import type { IslandMsg_Manifest, AuthProofWire, DeviceDelegationTiddler } from "@lararium/mesh";

/** Vessel-injected daemon seam the platform entry supplies (node folds the telemetry capture SINK here; a
 *  browser/node entry folds the projection `onBoot` mount so the @daemon inherits the wiki render cap).
 *  Forwarded straight to makeDaemonBehavior — the @daemon always carries the caps; this makes them live.
 *  Absent → the cap stays inert (sink not wired / no projection mount).
 *
 *  `persistArchive` — the Boundary-1 inversion: keyhive stays fs-blind, so NODE injects the writer that
 *  lands `keyhive.exportArchive()` bytes in the sovereign identity home. Consumed HERE (never forwarded to
 *  makeDaemonBehavior). Absent (a browser vessel with no fs) → the archive floor simply never persists. */
type DaemonExtra = Pick<DaemonBehaviorOptions, "makeCaptureEngine" | "captureTickMs" | "onBoot"> & {
  persistArchive?: (bytes: Uint8Array) => void | Promise<void>;
  /** `vault` — the SAME Boundary-1 inversion for the at-rest seal LIFECYCLE (#60): keyhive stays
   *  fs-blind, so NODE injects the handler that seals/rotates/exports the identity-home carriers and
   *  updates the worker's own in-memory seal policy (no un-rotate). Registered as the `vault-*` worker
   *  verbs below. Absent (a browser vessel with no fs) → the vault verbs simply never register. The
   *  passphrase rides the verb args over the owner-only 0600 UDS — the same trust boundary as a CLI arg. */
  vault?: (verb: string, args: Record<string, unknown>) => Promise<Record<string, unknown>>;
};
import { PERSONAL_BINDINGS_PREFIX, DRAFT_BINDINGS_PREFIX, WORKING_BINDINGS_PREFIX, verifyAuthProof, verifyDeviceDelegation } from "@lararium/mesh";
import { bootDaemonKeyhive } from "./boot-daemon-keyhive.js";
import { DaemonEventStore } from "./daemon-event-store.js";
import { resolveOrMintBinding } from "./resolve-binding.js";
import type { KeyhiveProvider } from "./keyhive-provider.js";

/**
 * Build the operator's daemon-island behavior from a manifest. With no auth
 * material, falls back to the verifier-less behavior (delegated-verb path only);
 * daemon manifests always carry daemonAuth, so that path guards tests.
 */
export function makeOperatorDaemonBehavior(manifest: IslandMsg_Manifest, extra: DaemonExtra = {}): IslandBehavior {
  // persistArchive + vault ride node-only; keep them OUT of the makeDaemonBehavior spread (not DaemonBehaviorOptions).
  const { persistArchive, vault, ...daemonExtra } = extra;
  const daemonAuth = manifest.daemonAuth;
  if (!daemonAuth) return makeDaemonBehavior({ ...daemonExtra });

  let kh: KeyhiveProvider | null = null;
  let mintedByHex = daemonAuth.operatorVerifyingKey;

  return makeDaemonBehavior({
    ...daemonExtra, // the vessel-injected telemetry capture SINK flows through (idempotent cap → live)
    // Sovereign-worker data-plane: register the read-only reactors in-worker over the
    // IslandContext composite (verify-then-delegate gate inherited); the residency
    // ACTION reactors register alongside them below.
    wireWorkerVerbs: (registry, ctx: IslandContext) => {
      // `where` reaches every registered bag across both oracle planes by ACCESS
      // (access≠load) — the daemon queries all bags, mounts none. resolve stays
      // cascade-scoped.
      registry.register("where",      makeWhereReactor(ctx.composite, { repo: ctx.repo, catalogUrl: ctx.catalogUrl, oracleUrl: ctx.oracleUrl }));
      registry.register("resolve",    makeResolveReactor(ctx.composite));
      // Residency ACTION verbs (ADD/COPY/MOVE/CLEAR/DROP/LOAD) — verify-then-delegate
      // gated, the `lares act` front door. The daemon reaches a deep target bag by
      // ACCESS (ephemeral mount, released after — no standing system-bag mount; the
      // edit/action split, wiki-layer-ontology#write-law).
      // A new bag is born WITH its cap: register its Keyhive Document + delegate
      // admin to the operator's PersonaGroup, in the same act as the mint (the
      // resolveOrMintBinding sequence). Shared by CREATE and wiki init — a mint
      // that only writes a catalog entry leaves the bag cap-denied until restart.
      // `kh` binds late — booted before dispatch.
      const registerBagCap = async (bagUrl: string): Promise<void> => {
        if (!kh) throw new Error("mint: keyhive unbooted — cannot register the new bag's cap");
        // bagUrl = the lar: bag URL — the key registerBag/delegate/verify all share,
        // the same string boot-registration registers (never the automerge doc url).
        await kh.registerBag(bagUrl);
        await kh.delegate({ bagUrl, audience: daemonAuth.personaGroupAgentIdHex, access: "admin" });
      };
      registerActionReactors(registry, {
        composite: ctx.composite,
        reach: { repo: ctx.repo, catalogUrl: ctx.catalogUrl, oracleUrl: ctx.oracleUrl },
        registerBag: registerBagCap,
        // LOAD lands every legal TW5 filetype via TW5's own deserializer registry,
        // resolved lazily through the daemon island's live $tw at action time.
        tw5: makeTw5Deserializer(ctx.tw5),
        // Resolve a carrier body a LOAD/INGEST verb rode BY REFERENCE (never inline) —
        // the fs-less worker pulls it from the corpus CAS by content-address.
        ...(ctx.resolveByCid ? { resolveByCid: ctx.resolveByCid } : {}),
      });
      // Residency mutators (pin/unpin/register-cold) — gated in-worker; they command the
      // main-resident BagResidencyManager via daemon:residency-op (ctx.post). `residency`
      // stats (a read) stays main pending the askMain research.
      registry.register("pin",           makePinReactor(ctx.post));
      registry.register("unpin",         makeUnpinReactor(ctx.post));
      registry.register("register-cold", makeRegisterColdReactor(ctx.post));

      // draft needs no catalog — register it regardless of slot.
      registry.register("draft", makeDraftReactor({ composite: ctx.composite }));

      // switcher-state — the @daemon UX widget's IN path: main pushes the live
      // activation state and this writes the LOCAL, volatile $:/temp/lares/switcher
      // tiddler so the projected switcher re-renders (reactive, never a poll).
      registry.register("switcher-state", makeSwitcherStateReactor(ctx.tw5));

      // Disk-ward refusals (wiki-island projector → worker.event bridge) — audit
      // in @daemon + $:/tags/Alert into the operator's pinned VM.
      registry.register("ward-alert", makeWardAlertReactor(ctx.composite, ctx.post));

      // The at-rest seal LIFECYCLE (#60) — DAEMON-FIRST: seal/rotate/export/repair/status route THROUGH
      // this worker (which owns the M3 archive re-seal), so the daemon updates its OWN in-memory seal
      // policy in the same act it re-persists the carriers — no un-rotate. The node-injected `vault`
      // handler does the fs + policy work (keyhive stays fs-blind). The passphrase rides the args over
      // the owner-only 0600 UDS. Absent injection (no fs) → the verbs never register.
      if (vault) {
        for (const v of ["vault-status", "vault-seal", "vault-rotate", "vault-export", "vault-repair"] as const) {
          registry.register(v, async (args) => vault(v, args));
        }
      }

      // Every other daemon verb reaches USER registry data in @catalog (wiki oracles,
      // recipes) via the accessor over ctx.repo/ctx.catalogUrl — access≠load. The daemon
      // recipe NEVER loads @catalog as tiddlers. All ride the verify-then-delegate gate.
      // operatorDid matches the old main reactors exactly ("0x"+operatorVerifyingKey) so
      // draft keys never drift.
      if (ctx.catalogUrl) {
        const catalog = makeCatalogAccessor(ctx.repo, ctx.catalogUrl);
        // System plane (@oracle) accessor — list-wikis reads system wiki-recipes
        // (@lares/@lararium) from here, user recipes from @catalog (two-plane).
        const sysPlane = ctx.oracleUrl ? makeCatalogAccessor(ctx.repo, ctx.oracleUrl) : undefined;
        const wikiMintOpts = {
          composite:   ctx.composite,
          repo:        ctx.repo,
          catalog,
          rootDir:     "",
          operatorDid: async () => "0x" + daemonAuth.operatorVerifyingKey,
          registerBag: registerBagCap,
        };
        registry.register("init-wiki",   makeInitWikiReactor(wikiMintOpts));
        registry.register("open-wiki",   makeOpenWikiReactor({ composite: ctx.composite, catalog, post: ctx.post }));
        registry.register("prune-stale", makePruneStaleReactor(wikiMintOpts));
        registry.register("list-wikis",  makeListWikisReactor(catalog, sysPlane));
        // Whole-wiki residency policy — read the @catalog recipe, command main's manager
        // per bag via daemon:residency-op. Pure policy, no live-layer mechanism.
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
      const { keyhive, did } = await bootDaemonKeyhive({
        seed:                  daemonAuth.seed,
        eventStore:            new DaemonEventStore({ daemon: ctx.composite }),
        operatorVerifyingKey:  daemonAuth.operatorVerifyingKey,
        personaGroupDocIdHex:   daemonAuth.personaGroupDocIdHex,
        personaGroupAgentIdHex: daemonAuth.personaGroupAgentIdHex,
        meshCabalDocIdHex:     daemonAuth.meshCabalDocIdHex,
        registerBags:          daemonAuth.registerBags,
        signerDid:       daemonAuth.signerDid,
        deviceEdge:            daemonAuth.deviceEdge,
        ...(daemonAuth.archiveBytes ? { archiveBytes: daemonAuth.archiveBytes } : {}),
      });
      kh = keyhive;
      mintedByHex = did;
      // M3 — seed the on-disk archive FLOOR every boot: exportArchive() captures the founding +
      // hydrated membership/capability DAG (+ prekey secrets) so a later torn @daemon restores from
      // here instead of orphaning the veiled Handle. Best-effort — a failed export never blocks boot.
      if (persistArchive) {
        try { await persistArchive(await keyhive.exportArchive()); }
        catch (err) { console.warn(`[daemon] keyhive archive export skipped: ${(err as Error)?.message ?? err}`); }
      }
      return keyhive;
    },

    verifyPeer: async (cardBytes: Uint8Array, bagUrl: string, access: "read" | "admin", proof?: AuthProofWire, edge?: DeviceDelegationTiddler) => {
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
      //     Identifier hex (the same relationship bootDaemonKeyhive Gate A relies on:
      //     did.endsWith(verifyingKey)).
      let proofVerified = false;
      let proofReason: string | undefined;   // the SPECIFIC cause — never swallowed into a generic verdict
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
        proofReason   = r.reason;
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
        // Carry the SPECIFIC cause. "V3 proof verification failed" alone cannot tell a bad signature from a
        // stale timestamp from a malformed field, and a gate that hides which one refused makes every
        // handshake regression a guess. The narrow reason (bad-sig · expired · not-32-byte-hex) rides out.
        const why = proof ? `V3 proof rejected: ${proofReason ?? "unverified"}` : "V3 proof required";
        return { ok: false, identifier: id, proofVerified, reason: why };
      }

      // ADMIN-CAP PATH (unchanged): a satisfied capability admits directly. Under `enforce`
      // the early return above already guaranteed proofVerified, so this admits on cap + a
      // verified proof-of-possession exactly as before.
      if (verdict.ok) {
        return { ...verdict, identifier: id, proofVerified };
      }

      // SEAM B — OPERATOR DEVICE-DELEGATION PATH (additive). The peer holds NO cap=admin, but a
      // device the operator admitted carries the signed root→device edge. Admit it at the
      // operator's-own-device tier IFF the edge verifies AND binds to THIS proven identity.
      //
      // MANDATORY PIN (confused-deputy cure): the edge MUST chain to signerDid — the hearth's
      // pinned PersonaGroup root (daemonAuth.signerDid, the same root the Binding Gate pins in
      // bootDaemonKeyhive). An unpinned edge NEVER admits; an absent signerDid is a HARD ERROR,
      // not a skip. The presenter binding (`edge.deviceDid === id`) ties the operator's grant to
      // the exact identity that just proved possession of its key (proofVerified, above) — a
      // device-admitted peer STILL proves it holds its key; the edge only adds the operator's
      // delegation, it never weakens the V3 proof.
      if (edge) {
        const signerDid = daemonAuth.signerDid;
        if (typeof signerDid !== "string" || signerDid.length === 0) {
          return { ok: false, identifier: id, proofVerified, reason: "device-delegation: no pinned signerDid in scope — refusing to admit on an unpinned edge" };
        }
        const delegation    = await verifyDeviceDelegation(edge, signerDid, { now: Date.now() });
        const deviceMatches = edge.deviceDid === id;
        if (delegation.ok && deviceMatches && proofVerified) {
          // Admitted at the operator's-own-device tier — equivalent flow to admin (it IS the
          // operator's delegated device). `reason` carries the provenance (survives the worker→host
          // boundary; the gate ignores it on an ok verdict but it aids audit).
          return { ok: true, identifier: id, proofVerified, reason: "admitted via operator device-delegation" };
        }
        return {
          ok: false, identifier: id, proofVerified,
          reason: !delegation.ok  ? `device-delegation rejected: ${delegation.reason ?? "(no reason)"}`
                : !deviceMatches  ? "device-delegation edge not bound to the presented identity"
                :                   "device-delegation requires a verified proof-of-possession",
        };
      }

      // Neither admin-cap nor a valid edge → the existing denial stands.
      return { ...verdict, identifier: id, proofVerified };
    },

    resolveBinding: async (ctx: IslandContext, fingerprint: string, recipeTrace: { wikiDocId: string; libraryBagDocIds: readonly string[] }) => {
      if (!kh) throw new Error("keyhive not booted");
      const common = {
        fingerprint, repo: ctx.repo, daemonStore: ctx.composite, keyhive: kh,
        personaGroupAgentIdHex: daemonAuth.personaGroupAgentIdHex, mintedByHex, recipeTrace,
      } as const;
      const personal = await resolveOrMintBinding({ ...common, kind: "personal-binding", prefix: PERSONAL_BINDINGS_PREFIX });
      const draft    = await resolveOrMintBinding({ ...common, kind: "draft-binding",    prefix: DRAFT_BINDINGS_PREFIX });
      const working  = await resolveOrMintBinding({ ...common, kind: "working-binding",  prefix: WORKING_BINDINGS_PREFIX });
      return { personalUrl: personal.url, draftUrl: draft.url, workingUrl: working.url };
    },
  });
}

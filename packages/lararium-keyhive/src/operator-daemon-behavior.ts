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
  makeAddBagReactor, makeRemoveBagReactor, makeCompactBagReactor, makeRotateRecipeReactor,
  makeSwitcherStateReactor,
  makePersonaStateReactor,
  makeCircleStateReactor,
  makeCircleReactors,
  makePersonaSelvesReactors,
  makeCabalRealmReactors,
} from "@lararium/tw5";
import { DAEMON_BAG_ID, personaBagIdFor, personaSiblingBagIds, leaseEpochPrefix, effectiveLeaseEpoch } from "@lararium/mesh";
import type { IslandBehavior, IslandContext, DaemonBehaviorOptions, VerbReactor } from "@lararium/tw5";
import type { IslandMsg_Manifest, AuthProofWire, DeviceDelegationTiddler } from "@lararium/mesh";

/** Vessel-injected daemon shore the platform entry supplies (node folds the telemetry capture SINK here; a
 *  browser/node entry folds the projection `onBoot` mount so the daemon inherits the wiki render cap).
 *  Forwarded straight to makeDaemonBehavior — the daemon always carries the caps; this makes them live.
 *  Absent → the cap stays inert (sink not wired / no projection mount).
 *
 *  `persistArchive` — the Boundary-1 inversion: keyhive stays fs-blind, so NODE injects the writer that
 *  lands `keyhive.exportArchive()` bytes in the sovereign identity home. Consumed HERE (never forwarded to
 *  makeDaemonBehavior). Absent (a browser vessel with no fs) → the archive floor simply never persists. */
type DaemonExtra = Pick<DaemonBehaviorOptions, "makeCaptureEngine" | "captureTickMs" | "onBoot" | "runnableHulls"> & {
  persistArchive?: (bytes: Uint8Array) => void | Promise<void>;
  /** `vault` — the SAME Boundary-1 inversion for the at-rest seal LIFECYCLE (#60): keyhive stays
   *  fs-blind, so NODE injects the handler that seals/rotates/exports the identity-home carriers and
   *  updates the worker's own in-memory seal policy (no un-rotate). Registered as the `vault-*` worker
   *  verbs below. Absent (a browser vessel with no fs) → the vault verbs simply never register. The
   *  passphrase rides the verb args over the owner-only 0600 UDS — the same trust boundary as a CLI arg. */
  vault?: (verb: string, args: Record<string, unknown>) => Promise<Record<string, unknown>>;
};
import { PERSONAL_BINDINGS_PREFIX, DRAFT_BINDINGS_PREFIX, WORKING_BINDINGS_PREFIX, verifyAuthProof, verifyEdgeAgainstPersonaKel, classifyCrossOperatorAdmission } from "@lararium/mesh";
import { bootDaemonKeyhive } from "./boot-daemon-keyhive.js";
import { DaemonEventStore } from "./daemon-event-store.js";
import { resolveOrMintBinding } from "./resolve-binding.js";
import { runFaceJoin, type FaceJoinSummons } from "./face-join.js";
import type { KeyhiveProvider } from "./keyhive-provider.js";

/**
 * Build the operator's daemon-island behavior from a manifest. With no auth
 * material, falls back to the verifier-less behavior (delegated-verb path only);
 * daemon manifests always carry daemonAuth, so that path guards tests.
 */
export function operatorDaemonOptions(manifest: IslandMsg_Manifest, extra: DaemonExtra = {}): DaemonBehaviorOptions {
  // persistArchive + vault ride node-only; keep them OUT of the makeDaemonBehavior spread (not DaemonBehaviorOptions).
  const { persistArchive, vault, ...daemonExtra } = extra;
  const daemonAuth = manifest.daemonAuth;
  if (!daemonAuth) return { ...daemonExtra };

  let kh: KeyhiveProvider | null = null;
  let mintedByHex = daemonAuth.vesselVerifyingKey;

  // ── PERSONA-SCOPED ACTS NEED A FACE, AND SAY SO ────────────────────────────────────────────────
  // A vessel at the WAKING FLOOR carries and serves; it holds no persona plane, no bindings, nobody to
  // delegate a bag TO. Reaching for the face here refuses LOUDLY rather than resolving `undefined` into
  // a cap check — an audience that reads undefined would delegate to nobody and look like it worked.
  const faceAgent = (): string => {
    const id = daemonAuth.personaGroupAgentIdHex;
    if (!id) throw new Error("[daemon] this vessel stands at the waking floor and holds no face — light one with `lares persona new 0 --name '<label>'` before any persona-scoped act.");
    return id;
  };
  const faceGroup = (): string => {
    const id = daemonAuth.personaGroupDocIdHex;
    if (!id) throw new Error("[daemon] this vessel stands at the waking floor and holds no PersonaGroup plane — light a face with `lares persona new 0 --name '<label>'`.");
    return id;
  };

  return {
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
      // A new bag is born WITH its cap: register its Keyhive Document + hand the
      // operator's PersonaGroup the reach below, in the same act as the mint (the
      // resolveOrMintBinding sequence). Shared by CREATE and wiki init — a mint
      // that only writes a catalog entry leaves the bag cap-denied until restart.
      // `kh` binds late — booted before dispatch.
      // THE REACH this vessel hands its OWN face over every bag it mints.
      //
      // The string stays keyhive's, because the wire speaks keyhive's vocabulary; the NAME says what the grant
      // does here. Keyhive's `admin` names one precise power — "the ability to revoke any members of a group,
      // not just those that they have causal seniority over" — never the web2 administrator its spelling
      // suggests, and never a tier of person. A face that mints a bag may seat and unseat within it; that is
      // the whole of what crosses.
      //
      // The mint and the join's re-grant read this ONE name, so a re-grant can never hand the group more than
      // the mint did — the two cannot drift into a silent promotion, because nothing stands for them to drift
      // apart FROM.
      const FACE_SEATS_AND_UNSEATS = "admin" as const;
      const registerBagCap = async (bagUrl: string): Promise<void> => {
        if (!kh) throw new Error("mint: keyhive unbooted — cannot register the new bag's cap");
        // bagUrl = the lar: bag URL — the key registerBag/delegate/verify all share,
        // the same string boot-registration registers (never the automerge doc url).
        await kh.registerBag(bagUrl);
        await kh.delegate({ bagUrl, audience: faceAgent(), access: FACE_SEATS_AND_UNSEATS });
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
      // main-resident BagStowage via daemon:residency-op (ctx.post). `residency`
      // stats (a read) stays main pending the askMain research.
      registry.register("pin",           makePinReactor(ctx.post));
      registry.register("unpin",         makeUnpinReactor(ctx.post));
      registry.register("register-cold", makeRegisterColdReactor(ctx.post));

      // draft needs no catalog — register it regardless of slot.
      registry.register("draft", makeDraftReactor({ composite: ctx.composite }));

      // switcher-state — the daemon UX widget's IN path: main pushes the live
      // activation state and this writes the LOCAL, volatile $:/temp/lares/switcher
      // tiddler so the projected switcher re-renders (reactive, never a poll).
      registry.register("switcher-state", makeSwitcherStateReactor(ctx.tw5));

      // persona-state — the daemon persona surface's IN path: main (which holds the IDB
      // persona vault) pushes the live multitude-view and this writes the LOCAL, volatile
      // $:/temp/lares/personas tiddler so the projected surface re-renders. The tiddler
      // carries the PRIVATE pet-names — it stays in the temp slot, syncing to no bag. A
      // headless node daemon registers this verb but never receives a push (browser-only).
      registry.register("persona-state", makePersonaStateReactor(ctx.tw5));

      // circle-state — the daemon follow surface's IN path: main (which holds the IDB
      // follow-graph) pushes the live follow-view for a circle and this writes the LOCAL,
      // volatile $:/temp/lares/circles tiddler so the projected surface re-renders. The
      // tiddler carries the PRIVATE follow-graph + petnames — it stays in the temp slot,
      // syncing to no bag (the never-federates wall). A headless node daemon registers this
      // verb but never receives a push (browser-only).
      registry.register("circle-state", makeCircleStateReactor(ctx.tw5));

      // The FOLLOW-GRAPH verbs — the SOURCE OF TRUTH over the sovereign circles doc. "Adding to a circle IS
      // the follow"; circle-add/circle-remove write circles.memberDids, circle-list reads it back. The daemon
      // reaches this face's `circles-<tag>` by ACCESS off the catalog registry — access≠load, write-
      // then-sync. The circles doc rides the PRIVATE tier: the self-slot FLEET-syncs it same-operator (so a follow
      // lands on ALL the operator's own devices) and the DeterministicFederationGate NEVER volunteers it to a
      // cross-operator (the circles doc sits outside its federatable set). A follow writes ONLY the circles doc — no board shore
      // is reachable here, the never-federates wall made structural. `ctx.tw5` lets a mutation/list re-render
      // the daemon follow surface (a browser paints it; a headless node daemon rests the temp tiddler).
      if (ctx.oracleUrl) {
        const sysPlane = makeCatalogAccessor(ctx.repo, ctx.oracleUrl);
        // The registry a FACE's planes answer to — the persona, circles, identities and sessions planes all share one
        // tag and one home. Built once so the two verb families below cannot drift onto different planes.
        const facePlane = ctx.catalogUrl ? makeCatalogAccessor(ctx.repo, ctx.catalogUrl) : null;
        // THE FOLLOW GRAPH BELONGS TO THE FACE THAT IS WORN, AND A FACE'S PLANES ARE USER BAGS.
        //
        // `circles-<tag>` names this PersonaGroup's own circles, derived off the same tag as its persona
        // plane, so a vessel holding a multitude reads the circles of the face it stands in and never
        // another's. The tag comes from the plane id itself — the name is the index — so nothing here holds
        // a second copy to drift from.
        //
        // It resolves from the catalog registry, beside the persona plane it shares a tag with: the oracle plane names the SYSTEM
        // bags, the universal floor every vessel carries, and a person's relations are not universal. Which
        // registry a face's planes answer to reads as an OWNERSHIP question rather than a measured one — the
        // pair matches wherever both halves are written, so evidence alone never settled it (canon:
        // wiki-layer-ontology, ruled by the operator).
        const resolveCirclesStore = async () => {
          const face = personaSiblingBagIds(personaBagIdFor(faceGroup()));
          if (!face) throw new Error("circle-verb: this vessel's PersonaGroup plane names no face");
          if (!facePlane) throw new Error("circle-verb: this island carries no catalog plane — a user bag has no registry to resolve from");
          const store = await facePlane.storeOf(face.circles);
          if (!store) throw new Error(`circle-verb: ${face.circles} unresolved — the catalog registry names no such plane for the face this vessel wears`);
          return store;
        };
        const circleReactors = makeCircleReactors({ resolveStore: resolveCirclesStore, tw5: ctx.tw5 });

        // A FACELESS FLOOR NAMES THE LIFT — the one refusal every face-scoped verb hands back.
        //
        // The floor is a state a vessel LIFTS out of, so a refusal there carries the act that lifts it
        // (the law `holdings-witness` keeps for its own corrections: a refusal says what would change the
        // answer). The closure reaches for no face, so standing it costs the boot nothing.
        const lightAFace = (verb: string): VerbReactor => async () => {
          throw new Error(
            `[daemon] ${verb}: this vessel stands at the WAKING FLOOR and holds no face — ` +
            "light one with `lares persona new 0 --name '<label>'`, then stand the vessel again.",
          );
        };

        // The OWN-PERSONA name verbs over the sovereign persona doc — the human's labels for their OWN faces
        // (the private pet-name + the declared Handle), riding the same PRIVATE tier one plane over: the
        // self-slot FLEET-syncs the persona plane same-operator so a rename lands on ALL the operator's own devices,
        // and the DeterministicFederationGate never volunteers it to a cross-operator. The `seat` claim does
        // NOT ride — a Kahu chair names a seat on a PARTICULAR node, so each node keeps its own. No board
        // shore is reachable here: only a publicly announced Handle binds a persona to a public glamour.
        // The plane is reached by the name its own PersonaGroup derives — the same string the registry
        // entry, the composite layer and the capability ring use. `daemonAuth` already carries the group's
        // doc id, so the resolution happens here rather than travelling as a second parameter.
        // A FACELESS PLACE OFFERS NO PERSONA VERBS.
        //
        // A founding stands a PLACE first — carrying, serving the public shelf — and lights a FACE after. In
        // that window `faceGroup()` names nothing, and reaching for it HERE would throw during the wiring pass
        // itself, taking the whole boot with it. So these register only where they can act, the gate the vault
        // verbs already keep: absent the thing they need, they never register at all. A caller then meets an
        // unknown verb rather than a verb that throws, which is the honest answer to "this place holds no face".
        if (daemonAuth.personaGroupDocIdHex) {
          // THE FOLLOW-GRAPH RIDES THE FACE, so it registers on the same fact the persona verbs do.
          // Founding writes the circles doc in the same breath as the PersonaGroup plane and its sentinel — a
          // PLACE bootstrap carries the daemon bag alone — and the boot refuses a partial set outright, so the
          // two stand or fall together. Registering the follow verbs on a faceless floor would answer a
          // human "circles-<tag> unresolved: the oracle registry names no such plane" — a true sentence
          // that reads as a broken registry, when the honest answer is that no face has been lit yet.
          registry.register("circle-add",    circleReactors.add);
          registry.register("circle-remove", circleReactors.remove);
          registry.register("circle-list",   circleReactors.list);

          // A PERSONA PLANE IS A USER BAG, SO IT RESOLVES FROM THE CATALOG REGISTRY.
          //
          // Three registries stand and each answers its own question. the oracle plane names the SYSTEM bags — the
          // universal floor every vessel carries. the catalog registry names the operator's own bags under their OCAP
          // grants. the crossroads plane names what a stranger may mount. A PersonaGroup's plane belongs to a person,
          // so it lives in the middle one; reaching for it on the system floor asks the wrong plane a
          // question it was never given to answer, and the refusal reads as a missing document.
          const personaBagId = personaBagIdFor(faceGroup());
          const resolvePersonaStore = async () => {
            if (!facePlane) throw new Error("persona-selves-verb: this island carries no catalog plane — a user bag has no registry to resolve from");
            const store = await facePlane.storeOf(personaBagId);
            if (!store) throw new Error(`persona-selves-verb: the PersonaGroup plane is unresolved — the catalog registry names no ${personaBagId}`);
            return store;
          };
          const selvesReactors = makePersonaSelvesReactors({ resolveStore: resolvePersonaStore });
          registry.register("persona-label",  selvesReactors.label);
          registry.register("persona-handle", selvesReactors.handle);
          registry.register("persona-selves", selvesReactors.selves);
        } else {
          // Leaving these unregistered answers a caller "no handler registered for persona-selves" — true,
          // and it hands a human nothing to act on. Every verb that needs a face answers with the lift.
          registry.register("persona-label",  lightAFace("persona-label"));
          registry.register("persona-handle", lightAFace("persona-handle"));
          registry.register("persona-selves", lightAFace("persona-selves"));
          registry.register("circle-add",     lightAFace("circle-add"));
          registry.register("circle-remove",  lightAFace("circle-remove"));
          registry.register("circle-list",    lightAFace("circle-list"));
        }

        // The CABAL-REALM verbs over the daemon bag, where the per-writer lease slots live. `realm-feed` rolls THIS
        // writer's own slot — the offering a realm lives by; `realm-clock` reads every slot back and reports
        // who feeds and how deep, VERDICT-FREE (what spread counts as capture stays the operator's
        // calibration, and mechanizing it here would recreate the root a realm exists without).
        const resolveDaemonStore = async () => {
          const store = await sysPlane.storeOf(DAEMON_BAG_ID);
          if (!store) throw new Error("cabal-realm-verb: daemon bag unresolved — the oracle registry names no DAEMON_BAG_ID");
          return store;
        };
        const realmReactors = makeCabalRealmReactors({ resolveStore: resolveDaemonStore });
        registry.register("realm-feed",  realmReactors.feed);
        registry.register("realm-clock", realmReactors.clock);

        // `face-join` — the CAPABILITY half of joining this operator's own face, run where the booted
        // provider already lives. A device-admit confers STANDING (a signed edge the joinee pins); keyhive
        // still knows no such member, so the joinee reaches the plaintext planes and decrypts nothing sealed.
        // A joinee summons here with its ContactCard + the edge that licenses it, and leaves holding the
        // group key. The human confers standing once, by hand; the machine completes the capability.
        //
        // The gate reads THIS vessel's own edge for its two anchors: the root that signed us is the only root
        // whose edges seat anyone here, and the hearth we bind to is the hearth a joinee must bind to.
        //
        // FRESHNESS TAKES THE LEASE, NEVER THE CLOCK ALONE. The PersonaGroup's per-writer slots fold by
        // max-register — monotone, read locally, no shared now — and a grant bound below that reads stale.
        // Rolling those slots re-admits the WHOLE fleet (the epoch leases, it never revokes one device;
        // a single device leaves by `revokeSentinelMember`).
        // The capability half of a join is persona-scoped too — a hearth with no face seats nobody.
        if (daemonAuth.personaGroupDocIdHex) {
          registry.register("face-join", async (args) => {
            if (!kh) throw new Error("[daemon] face-join: keyhive unbooted");
            const ownEdge = daemonAuth.deviceEdge;
            if (!ownEdge) {
              throw new Error(
                "[daemon] face-join: this vessel carries no device edge of its own, so it can name no root to " +
                "verify a joinee against — light a face with `lares persona new 0 --name '<label>'`.",
              );
            }
            const summons = args["summons"] as FaceJoinSummons | undefined;
            if (!summons || typeof summons !== "object") {
              throw new Error("[daemon] face-join: no summons in args — carry {contactCard, deviceEdge}.");
            }
            // A HEARTH NEVER SEATS ITSELF.
            //
            // A summons rides the daemon doc, and the daemon doc fleet-syncs across the operator's own devices — so every
            // seated vessel sees it, and every one of them runs this verb over the SAME PersonaGroup under the
            // SAME root. The joinee's own island would pass its own gate (the edge it presents was signed by the
            // root its boot pins) and seat itself, while the hearth seats it too: two writers, one group, one
            // seat, racing to re-key. The joinee is exactly the vessel that must not answer, and it knows itself
            // by the key it just presented.
            if (summons.deviceEdge?.deviceVerifyingKey?.toLowerCase() === daemonAuth.vesselVerifyingKey.toLowerCase()) {
              return {
                verb: "face-join", admitted: false, self: true,
                reason: "this vessel IS the joinee — a summons is answered by the hearth that holds the face, never by the device asking to join it.",
              };
            }
            // The lease read, off the live daemon replica: every slot under this group's prefix, folded by max.
            const store = await resolveDaemonStore();
            const prefix = leaseEpochPrefix(faceGroup());
            const slots: string[] = [];
            for (const title of await store.listVisible()) {
              if (!title.startsWith(prefix)) continue;
              const record = await store.get(title);
              const text = (record as { tiddler?: { text?: unknown } } | undefined)?.tiddler?.text;
              if (typeof text === "string") slots.push(text);
            }

            const outcome = await runFaceJoin(kh, summons, {
              personaRootDid:         ownEdge.personaRootDid,
              hearthTrueName:         ownEdge.hearthTrueName,
              personaGroupDocIdHex:   faceGroup(),
              personaGroupAgentIdHex: faceAgent(),
              leaseEpoch:             effectiveLeaseEpoch(slots),
              now:                    Date.now(),
              // The bags this vessel ALREADY delegated to its own face, re-granted so a fresh seat reaches them.
              // Naming only what we granted, at the access we granted, widens nobody's reach — it refreshes the
              // epoch on grants that already stand. `registerBags` IS that set, and `FACE_SEATS_AND_UNSEATS` IS the
              // access every one of them carries, because the mint above reads the same name.
              regrant: daemonAuth.registerBags.map((bagUrl) => ({ bagUrl, access: FACE_SEATS_AND_UNSEATS })),
            });
            // A refusal RETURNS — an unlicensed summons names an absent contract, never an attack, and the
            // reason rides the outcome so the joinee's panel can paint why rather than showing a silence.
            return outcome.ok
              ? { verb: "face-join", admitted: true,  ...outcome.grant }
              : { verb: "face-join", admitted: false, reason: outcome.reason };
          });
        }
      }

      // Disk-ward refusals (wiki-island projector → worker.event bridge) — audit
      // in the daemon bag + $:/tags/Alert into the operator's pinned VM.
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

      // Every other daemon verb reaches USER registry data in the catalog plane (wiki oracles,
      // recipes) via the accessor over ctx.repo/ctx.catalogUrl — access≠load. The daemon
      // recipe NEVER loads the catalog registry as tiddlers. All ride the verify-then-delegate gate.
      // vesselDid reads "0x"+vesselVerifyingKey wherever a draft key derives, so those keys never drift —
      // the PLACE is what asks, never the persona root.
      if (ctx.catalogUrl) {
        const catalog = makeCatalogAccessor(ctx.repo, ctx.catalogUrl);
        // System plane (oracle) accessor — list-wikis reads system wiki-recipes
        // (the lares and lararium bags) from here, user recipes from the catalog registry (two-plane).
        const sysPlane = ctx.oracleUrl ? makeCatalogAccessor(ctx.repo, ctx.oracleUrl) : undefined;
        const wikiMintOpts = {
          composite:   ctx.composite,
          repo:        ctx.repo,
          catalog,
          rootDir:     "",
          vesselDid: async () => "0x" + daemonAuth.vesselVerifyingKey,
          registerBag: registerBagCap,
        };
        registry.register("init-wiki",   makeInitWikiReactor(wikiMintOpts));
        registry.register("open-wiki",   makeOpenWikiReactor({ composite: ctx.composite, catalog, post: ctx.post }));
        registry.register("prune-stale", makePruneStaleReactor(wikiMintOpts));
        registry.register("list-wikis",  makeListWikisReactor(catalog, sysPlane));
        // Whole-wiki residency policy — read the catalog recipe, command main's manager
        // per bag via daemon:residency-op. Pure policy, no live-layer mechanism.
        registry.register("pin-wiki",      makeWikiPinReactor(catalog, ctx.post));
        registry.register("unpin-wiki",    makeWikiUnpinReactor(catalog, ctx.post));
        // Recipe composition — write the catalog recipe, command residency via op. NO
        // live-layer mount/unmount: the recipe syncs, islands reconcile their own stacks.
        registry.register("add-bag",       makeAddBagReactor({ catalog, post: ctx.post }));
        registry.register("remove-bag",    makeRemoveBagReactor({ catalog, post: ctx.post }));
        // Catalog-writing residency verbs — mint/oracle via accessor + repo, command
        // residency via post. No live-layer swap (oracle/recipe sync; islands reconcile).
        registry.register("bag-compact", makeCompactBagReactor({ repo: ctx.repo, catalog, post: ctx.post }));
        registry.register("rotate-recipe", makeRotateRecipeReactor({ repo: ctx.repo, catalog, post: ctx.post }));
      }
    },
    verifierFactory: async (ctx: IslandContext) => {
      const { keyhive, did } = await bootDaemonKeyhive({
        seed:                  daemonAuth.seed,
        eventStore:            new DaemonEventStore({ daemon: ctx.composite }),
        vesselVerifyingKey:  daemonAuth.vesselVerifyingKey,
        // The face pins ride CONDITIONALLY — the gate runs in full or grants no persona caps at all.
        ...(daemonAuth.personaGroupDocIdHex   ? { personaGroupDocIdHex:   daemonAuth.personaGroupDocIdHex }   : {}),
        ...(daemonAuth.personaGroupAgentIdHex ? { personaGroupAgentIdHex: daemonAuth.personaGroupAgentIdHex } : {}),
        ...(daemonAuth.meshCabalDocIdHex      ? { meshCabalDocIdHex:      daemonAuth.meshCabalDocIdHex }      : {}),
        registerBags:          daemonAuth.registerBags,
        ...(daemonAuth.signerDid  ? { signerDid:  daemonAuth.signerDid }  : {}),
        ...(daemonAuth.personaKel ? { personaKel: daemonAuth.personaKel } : {}),
        ...(daemonAuth.deviceEdge ? { deviceEdge: daemonAuth.deviceEdge } : {}),
        ...(daemonAuth.archiveBytes ? { archiveBytes: daemonAuth.archiveBytes } : {}),
      });
      kh = keyhive;
      mintedByHex = did;
      // M3 — seed the on-disk archive FLOOR every boot: exportArchive() captures the founding +
      // hydrated membership/capability DAG (+ prekey secrets) so a later torn daemon doc restores from
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
      //   gatePubKey = this gate's OWN verifying key (vesselVerifyingKey) — so a
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
      //
      // SELF-SLOT CLASS: cap=admin on the daemon bag is held ONLY by this operator's own PersonaGroup (the
      // founding delegates admin to personaGroupAgentIdHex; no foreign operator ever earns it). So an
      // admin admit PROVES same-operator — the peer keeps full device sync. This is an UNFORGEABLE
      // signal: a cross-operator cannot manufacture an admin@daemon grant it was never delegated.
      if (verdict.ok) {
        return { ...verdict, identifier: id, proofVerified, peerClass: "same-operator" as const };
      }

      // OPERATOR DEVICE-DELEGATION PATH (additive). The peer holds NO cap=admin, but a
      // device the operator admitted carries the signed root→device edge. Admit it at the
      // operator's-own-device tier IFF the edge verifies AND binds to THIS proven identity.
      //
      // MANDATORY PIN (confused-deputy cure), now on the PERSONA-KEL: the operator's own device edge MUST
      // chain to the CURRENT head op-key the hearth's pinned identifier (`daemonAuth.personaKel.prefix`)
      // resolves to — the same continuity anchor the Binding Gate walks in bootDaemonKeyhive. Walking the
      // KEL (not a frozen op-key) means a device re-issued under a rotated head still admits, and a device
      // edge signed by a SUPERSEDED op-key rejects. An absent / mis-pinned KEL is a HARD ERROR, not a skip.
      // The presenter binding (`edge.deviceDid === id`) ties the operator's grant to the exact identity that
      // just proved possession of its key (proofVerified, above) — a device-admitted peer STILL proves it
      // holds its key; the edge only adds the operator's delegation, it never weakens the V3 proof.
      if (edge) {
        const kel = daemonAuth.personaKel;
        if (!kel || kel.chain.length === 0 || kel.chain[0]!.prefix !== kel.prefix) {
          return { ok: false, identifier: id, proofVerified, reason: "device-delegation: no pinned persona-KEL in scope — refusing to admit on an unpinned edge" };
        }
        const delegation    = await verifyEdgeAgainstPersonaKel(edge, kel.chain, { now: Date.now() });
        const deviceMatches = edge.deviceDid === id;
        if (delegation.ok && deviceMatches && proofVerified) {
          // Admitted at the operator's-own-device tier — equivalent flow to admin (it IS the
          // operator's delegated device). `reason` carries the provenance (survives the worker→host
          // boundary; the gate ignores it on an ok verdict but it aids audit).
          //
          // SELF-SLOT CLASS: the edge chains to the persona-KEL head op-key — THIS hearth's pinned
          // identifier's current authority — and binds to the exact identity that proved key-possession. A
          // cross-operator cannot forge an edge chaining to a KEL it never heads, so a verified head-chained
          // edge PROVES same-operator (the operator's own device fleet, a distinct device key under one identity).
          return { ok: true, identifier: id, proofVerified, reason: "admitted via operator device-delegation", peerClass: "same-operator" as const };
        }
        return {
          ok: false, identifier: id, proofVerified,
          reason: !delegation.ok  ? `device-delegation rejected: ${delegation.reason ?? "(no reason)"}`
                : !deviceMatches  ? "device-delegation edge not bound to the presented identity"
                :                   "device-delegation requires a verified proof-of-possession",
        };
      }

      // GATE-WIDENING — CROSS-OPERATOR bounded carriage (carry-contract MANDATORY tier). The peer holds
      // NEITHER cap=admin@daemon NOR a valid pinned-root device-edge, yet it proved a valid self-certifying
      // identity (receiveContactCard) and, under enforcement, key-possession (proofVerified — the early
      // return above already guaranteed it). A DIFFERENT operator identity (a cabal-mate / another kahu)
      // earns the BOUNDED "cross-operator" class: the node sharePolicy grants it ONLY the deterministically-
      // federatable public/infra planes (crossroads/WHO/kapae-antigen), NEVER a private-own plane, NEVER
      // admin. FAIL-CLOSED on the widened surface — a foreign identity that cannot prove possession draws a
      // DENY (the classifier gates on proofVerified; the LAR_V3_ALLOW_UNPROVEN escape hatch relaxes the
      // operator's OWN device fleet above, never a foreign presenter). The #59 antigen draws Mu on a Kapae'd
      // cross-operator AHEAD, at the sharePolicy.
      const cross = classifyCrossOperatorAdmission(proofVerified);
      if (cross.ok) {
        return { ok: true, identifier: id, proofVerified, reason: cross.reason, peerClass: cross.peerClass };
      }
      // No proven possession → the existing capability denial stands (fail-closed).
      return { ...verdict, identifier: id, proofVerified, reason: verdict.reason ?? cross.reason };
    },

    ...(daemonAuth.personaGroupAgentIdHex ? {
    // A HERM RESOLVES NO PERSONA-SEALED BINDINGS.
    //
    // These name a wiki's personal/draft/working layers, each keyed under a PERSONA. The floor of the cap
    // stack carries its daemon bag and no operator bag a human decrypts locally — that plane reads OPEN to its
    // founding operator rather than sealed to a group — so there is nothing here to key, and nothing to
    // resolve. Supplied only where a face stands, the gate the vault verbs already keep; a floor that offered
    // this callback would throw reaching for a face DURING BOOT and take its own standing with it.
      resolveBinding: async (ctx: IslandContext, fingerprint: string, recipeTrace: { wikiDocId: string; libraryBagDocIds: readonly string[] }) => {
        if (!kh) throw new Error("keyhive not booted");
        const common = {
          fingerprint, repo: ctx.repo, daemonStore: ctx.composite, keyhive: kh,
          personaGroupAgentIdHex: faceAgent(), mintedByHex, recipeTrace,
        } as const;
        const personal = await resolveOrMintBinding({ ...common, kind: "personal-binding", prefix: PERSONAL_BINDINGS_PREFIX });
        const draft    = await resolveOrMintBinding({ ...common, kind: "draft-binding",    prefix: DRAFT_BINDINGS_PREFIX });
        const working  = await resolveOrMintBinding({ ...common, kind: "working-binding",  prefix: WORKING_BINDINGS_PREFIX });
        return { personalUrl: personal.url, draftUrl: draft.url, workingUrl: working.url };
      },
    } : {}),

  };
}

/**
 * The operator's daemon-island behavior — `operatorDaemonOptions` stood up.
 *
 * The options ride their own door because the wiring pass they carry decides WHICH VERBS A VESSEL OFFERS,
 * and that decision had no witness: `wireWorkerVerbs` is called deep inside `makeDaemonBehavior`'s onEa over
 * a live VerbTable, so nothing could read it without standing a whole daemon. A pass that shapes a vessel's
 * surface deserves to be readable on its own.
 */
export function makeOperatorDaemonBehavior(manifest: IslandMsg_Manifest, extra: DaemonExtra = {}): IslandBehavior {
  return makeDaemonBehavior(operatorDaemonOptions(manifest, extra));
}

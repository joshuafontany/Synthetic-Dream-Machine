/**
 * Lararium Node Vessel — local-first relay + TW5 engine entrypoint.
 *
 * Boots one LarVessel per configured wiki, wires a WebSocket relay for
 * browser vessels to sync through, and attaches a LarDiskProjector so
 * the bags/ tree stays in sync with the Automerge store.
 *
 * Three surfaces mount here, not one:
 *   ws://localhost:{port}/ws     → Automerge sync protocol (browser + remote mesh peers)
 *   {storage}/lares.sock         → UDS verb channel (co-located CLI fast path)
 *   http://localhost:{port}/…    → oracle read-face; federation pulls + verifies through it
 *
 * Usage:
 *   node dist/main.js [--port 8080] [--wiki lares] [--root /alt/root]
 *
 * Environment:
 *   LAR_PORT     — server port (default 8080; docker-compose.yml overrides to 4321)
 *   LAR_WIKI     — wiki id (default lares — the @lares-as-wiki quine)
 *   LAR_CATALOG  — existing catalog automerge URL to join (optional)
 *   LAR_ROOT     — alternate repo root for all mirror paths (default: monorepo root).
 *                  Set to an isolated test dir so promote/sync writes never touch
 *                  canonical packages/ or wikis/ paths.
 *
 * Bootstrap:
 *   The boot prints the catalog Automerge URL to stdout.
 *   Browser vessels read it from location.hash on first visit, cache to
 *   localStorage for offline return visits.
 */

import { createServer }  from "http";
import { networkInterfaces }             from "os";
import WebSocket                         from "isomorphic-ws";
import { resolve }                       from "path";
import { deriveReachFaces, wsUrlForOrigin, crossingUrl, appOriginForFace, type InterfaceTable } from "./lan-address.js";
import { openNodeVessel, openNodeHerm, type AskedStanding } from "./open-node-vessel.js";
import { standAs } from "@lararium/mesh";
import { randomBytes } from "node:crypto";
import {
  standRaiseDoor, effectiveLeaseEpochOnBoard, nexusMemberNyms, verifyNymSignature,
} from "./vessel-raise.js";
import { loadVesselVerifyingKey } from "./node-vessel-identity.js";
import { archiveOpens } from "./archive-passphrase.js";
import { faceStands } from "./commands/init.js";
import { ARCHIVE_PASSPHRASE_ENV } from "./archive-seal.js";
import { deriveMeshSelf } from "./node-caps.js";
import { startUdsChannel }              from "./uds-channel.js";
import { rendezvousPath, rendezvousDir } from "@lararium/mesh/rendezvous-path";
import { mountOracleReadFace }          from "./oracle-read-face.js";
import { loadVesselSigningSeed, generateOrLoadVesselIdentity } from "./node-vessel-identity.js";
import { getMempalaceClient }           from "@lararium/mempalace";
import { larDataDir }                   from "./vessel-paths.js";
import type { AutomergeUrl }            from "@automerge/automerge-repo";
import { join } from "path";
import { mkdirSync } from "fs";
import { REPO_ROOT }   from "./node-host.js";
import { loadLaresConfig } from "./lares-config.js";


// ---------------------------------------------------------------------------
// CLI / env config
// ---------------------------------------------------------------------------

function parseArgs(): { port: number; storageDir: string; genesisDir: string; wikiId: string; rootDir: string; catalogUrl: string | null; askedStanding: AskedStanding } {
  const args = process.argv.slice(2);
  const get  = (flag: string, env: string, fallback: string) => {
    const i = args.indexOf(flag);
    return (i !== -1 ? args[i + 1] : undefined) ?? process.env[env] ?? fallback;
  };
  const cfg        = loadLaresConfig();   // per-@daemon resource overrides (~/.lares/config.json)
  const rootDir    = resolve(get("--root", "LAR_ROOT", REPO_ROOT));   // corpus root (genesis)
  // ONE SUBSTRATE DIR, DERIVED THE SAME WAY ON BOTH SIDES. An override here moved the daemon's dir and
  // not its client's — and since the rendezvous derives FROM this dir, a caller who used it stranded the
  // daemon at a socket the CLI could not compute. `LAR_ROOT` remains the way to move a whole vessel,
  // because it moves BOTH sides at once.
  const storageDir = larDataDir();   // the vessel substrate → <lares>/vessel
  // The composable genesis cap: --genesis flag → LAR_GENESIS env → ~/.lares/config.json → repo-relative
  // <rootDir>/genesis. Genesis stays checked-in by default, so a no-config boot lands on the repo's
  // tracked seed exactly as before; an operator sites it under ~ via config.resources.genesis.
  const genesisDir = resolve(get("--genesis", "LAR_GENESIS", cfg.resources?.genesis ?? join(rootDir, "genesis")));
  // `--recipe` names the operator-facing flag; what it carries is a STANDING this vessel asks to
  // stand as, never a kind it is. "Recipe" belongs to the pinned wiki's composition alone.
  const askedStanding = (get("--recipe", "LAR_RECIPE", "lararium") === "herm" ? "herm" : "lararium") as AskedStanding;
  return {
    port:       Number(get("--port", "LAR_PORT", "8080")),
    storageDir,
    genesisDir,
    wikiId:     get("--wiki", "LAR_WIKI", "lares"),
    rootDir,
    catalogUrl: process.env["LAR_CATALOG"] ?? null,
    askedStanding,
  };
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const { port, storageDir, genesisDir, wikiId, rootDir, catalogUrl, askedStanding } = parseArgs();

  // Mesh standing — derived ONCE for either cap-stack, shared by the herm + lararium
  // branches. Every vessel stands a node on the routing chart: LAR_PUBLIC_URL = its REACHABLE http
  // read-face (the self-peering key, advertised in its dial), LAR_PEERS = bootstrap base URLs,
  // LAR_SEED = its dial label (else hash-derived); LAR_RADIUS = its carriage standing r.
  const publicUrl = process.env["LAR_PUBLIC_URL"] ?? `http://localhost:${port}`;
  const peers = (process.env["LAR_PEERS"] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const seedLabel = process.env["LAR_SEED"];
  // The radius reads from the host HERE, where a host environment exists. Passing it inward keeps the
  // mesh module isomorphic — it can hold no opinion about which platform it woke on.
  const radius = Number(process.env["LAR_RADIUS"] ?? 1);
  const meshSelf = deriveMeshSelf(publicUrl, peers, { radius, ...(seedLabel ? { label: seedLabel } : {}) });

  // The reach-faces this vessel answers on. The listen below binds 0.0.0.0, so the vessel answers on
  // every interface the host holds; the banner names them all. A phone on the house network reads a
  // LAN line and types it; `localhost` on that phone names the phone. LAR_APP_PORT names where the
  // static app answers (the vite dev server by default) — the app and the relay ride the SAME host.
  const appPort = Number.parseInt(process.env["LAR_APP_PORT"] ?? "5173", 10);
  const reachFaces = deriveReachFaces({
    port,
    declaredUrl: process.env["LAR_PUBLIC_URL"] ?? null,
    interfaces:  networkInterfaces() as unknown as InterfaceTable,
  });

  // WS server — path-scoped to /ws only. Non-WS requests get no handler (socket destroyed
  // by the upgrade gate below). No HTTP surface — catalog URL advertised via stdout.
  const httpServer = createServer();
  const wss = new WebSocket.Server({ noServer: true });

  httpServer.on("upgrade", (req, socket, head) => {
    const pathname = new URL(req.url ?? "/", "http://localhost").pathname;
    if (pathname === "/ws") {
      wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
    } else {
      socket.destroy();
    }
  });

  // Fail-fast on a busy port — the supervised vessel never manages its siblings
  // (12-factor / island sovereignty). A clean message, not an unhandled 'error'
  // crash; `lares vessel stand --restart` stops the incumbent.
  httpServer.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(`[lararium] port ${port} is already in use — a vessel is already running. Use \`lares vessel stand --restart\` to restart it, or free the port.`);
      process.exit(1);
    }
    throw err;
  });
  httpServer.listen(port, () => {
    console.log(`[lararium] WS relay on :${port} — every interface answers:`);
    for (const f of reachFaces) console.log(`[lararium]   ${wsUrlForOrigin(f.origin)}   (${f.kind})`);
  });

  // ── THE BASE COURSE — every vessel stands as a Herm, and the hearth is what it LIFTS to ──────────────
  // The Herm cap-stack (@daemon immune core + a served @meshpalace FLOW-map, no wiki, no pool) is the FLOOR
  // of this stack rather than a sibling of it. A lararium is a herm with its hearth fire lit, so the lift
  // reads off what actually stands here, and every vessel reaches `live` through the floor first.
  //
  // TWO FACTS LIFT IT, and they answer different questions. A FACE lit — `lares persona new 0` landed a
  // PersonaGroup onto this place — names what the vessel HOLDS; a place founded and no face yet holds a
  // crossroads, and composing a hearth over it reaches for a face during boot and takes its own standing
  // with it. The ARCHIVE opening names what the vessel can OPEN right now; a hearth whose archive holds
  // shut carries, serves the public shelf, and holds every sovereign act closed until a key arrives.
  //
  // `--recipe herm` DECLINES the lift — a public crossroads an operator means to keep faceless — rather
  // than selecting a different kind of thing. Nothing is ever lowered here: a vessel that cannot open
  // simply never rose (canon: lar:///ha.ka.ba/lares/api/pono/waking-floor).
  //
  // The class stays orthogonal to the CEILING. `personaSlotCeiling("herm") === 0` bars a SEATED persona
  // root on a crossroads; standing at the floor for want of a face bars nothing — `lares persona new`
  // reads its own ceiling and lights the face that lifts the next boot. MAY-HOLD-A-FACE ⊥ HOLDS-ONE-NOW.
  const sealShut = !archiveOpens();
  const faceLit  = faceStands();
  const standing = standAs(askedStanding !== "herm" && faceLit ? "hearth" : "herm", !sealShut);
  if (standing === "herm" && !sealShut && askedStanding !== "herm" && !faceLit) {
    console.log("[lararium] the PLACE stands and no face is lit — standing at the WAKING FLOOR.");
    console.log("[lararium]   carrying and serving the public shelf; every sovereign act waits.");
    console.log("[lararium]   light the hearth fire:  lares persona new 0 --name '<label>'   (then stand again)");
  }
  if (sealShut) {
    console.log("[lararium] the archive holds shut — standing at the WAKING FLOOR, faceless by class.");
    console.log("[lararium]   carrying and serving the public shelf; every sovereign act waits.");
    console.log(`[lararium]   light the hearth fire: set ${ARCHIVE_PASSPHRASE_ENV} and boot again.`);
    // NAME NO VERB THAT DOES NOT STAND. The raise DOOR stands (vessel-raise, wired below on the Herm
    // branch); the CLI ceremony that carries a challenge out and a grant back does not. A line naming
    // `lares raise` here would spend the reader's trust the first time they typed it — the same law
    // `holdings-witness` already carries for its own corrections.
    console.log("[lararium]   a recognised operator may also raise it for a visit; the door answers, the CLI verb waits.");
  }

  if (standing === "herm") {
    const pullMs = process.env["LAR_PULL_MS"];   // carriage cadence — tuning, kept separate from membership
    const herm = await openNodeHerm({
      // The name follows what STANDS, never which branch reached here. A vessel the operator asked to keep
      // faceless IS Lares Viales, gods of the crossroads; a hearth waiting on its face stands on the same
      // floor under its own name, and calling it a wayfarer would tell its operator they built the wrong thing.
      hostId:     askedStanding === "herm" ? "lares-viales" : "lararium-node",
      wikiId,
      storageDir,
      genesisDir,
      rootDir,
      wss,
      catalogUrl,
      httpServer,
      meshSelf,
      ...(pullMs ? { pullIntervalMs: Number.parseInt(pullMs, 10) } : {}),
      onPhase:    (phase) => console.log(`[herm] phase → ${phase}`),
    });
    console.log(`[herm] live — wiki-less wayfarer | storage: ${storageDir}`);
    console.log(`[herm] catalog:   ${herm.catalogHandleUrl}`);
    console.log(`[herm] oracle:    ${herm.oracleDocUrl}`);
    console.log(`[herm] daemon:    ${herm.daemon.daemonHandle.url}`);
    console.log(`[herm] FLOW-map read-face: GET /oracle/pointer · /oracle/<cid>.bin`);

    // ── THE RAISE DOOR — the third path onto caps, beside the archive and the asked standing ────────
    // `standAs` above answers what this vessel stands as ALONE. A recognised operator may raise it for the
    // length of their visit, and those caps ride THEIR key: nothing seats a persona root here, and
    // `personaSlotCeiling("herm") === 0` keeps that true whatever stands.
    //
    // It stands HERE rather than beside `standAs` because the fence lives on a board, and the board opens
    // with the vessel. The door reads the lease epoch off the live @daemon doc every time it is asked —
    // a remembered epoch would hold a vessel raised past the roll that should have dropped it.
    //
    // Nothing here touches disk. A reboot drops this vessel back to its floor with nothing to resume,
    // which is what keeps SEATED ⊥ RAISED true at rest (waking-floor#the-raise-is-a-vessel-layer-act).
    // The vessel's OWN verifying key names both sides here: it is the vessel a grant must answer for, and
    // the Nexus whose members board it reads. A Herm carrying a foreign Nexus names that Nexus instead.
    const selfKey = await loadVesselVerifyingKey(storageDir);
    const raiseDoor = standRaiseDoor({
      vesselId:   selfKey,
      nexus:      selfKey,
      floor:      standing,
      leaseEpoch: () => effectiveLeaseEpochOnBoard(herm.daemon.daemonHandle, selfKey),
      // Recognition BORROWS the membership fold that already stands — quorum-signed, contract-in
      // verified. A vessel carrying no members recognises nobody, which is the fail-closed reading.
      recognises: async (nym) => (await nexusMemberNyms(storageDir)).has(nym.toLowerCase()),
      verify:     verifyNymSignature,
      nonce:      () => randomBytes(32).toString("hex"),
    });
    console.log(`[herm] standing:  ${await raiseDoor.standing()} — the raise door answers at the crossroads`);

    // THE VESSEL EMITS ITS OWN CHALLENGE, and emitting it costs nothing. It names what is being raised —
    // vessel, Nexus, epoch, nonce — and carries nothing of what this vessel holds. A forged challenge buys
    // an attacker nothing either: a grant answers only the exact nonce the asking vessel still holds, and
    // an attacker holds no such vessel. One boot, one nonce, until the ask/answer verbs stand.
    const invitation = await raiseDoor.ask();
    console.log(`[herm] raise challenge (hand to a recognised operator; they run \`lares raise sign\`):`);
    console.log(`[herm]   ${JSON.stringify(invitation)}`);
    for (const f of reachFaces) console.log(`[herm] ws:        ${wsUrlForOrigin(f.origin)}   (${f.kind})`);

    // The CARRIAGE CROSSROADS (Socket B) — announced when a relay port rode the config (LAR_HERM_RELAY_PORT).
    // The operator hands a family hearth the `ws://` URL + the gate key to dial this crossroads. Absent → no line.
    // The relay binds its OWN port (SEPARATE from the /ws read-face port) on the same host every face names.
    if (herm.carriageRelayPort !== null) {
      const relayPort = herm.carriageRelayPort;
      console.log(`[herm] carriage crossroads (Socket B) — hearths dial this to carry sealed @cad bodies:`);
      console.log(`[herm]   gate key: ${herm.carriageRelayGatePubKey}`);
      for (const f of reachFaces) {
        const scheme = f.origin.startsWith("https") ? "wss" : "ws";
        const bareHost = f.host.replace(/:\d+$/, "");
        console.log(`[herm]   dial → ${scheme}://${bareHost}:${relayPort}   (${f.kind})`);
      }
    }

    // Co-located UDS verb-channel for the local `lares` CLI (the @daemon answers).
    // THE RENDEZVOUS SITS APART FROM THE DATA. A socket answers "where do two processes meet" under a
    // ~104-byte cap the data home has never heard of; siting it beside the substrate made it inherit the
    // substrate's depth, and a deep root then refused to bind while everything else stood. Both sides
    // derive from the SAME resolved dir, so the client finds what this bound.
    const hermSocketPath = rendezvousPath({ root: storageDir, uid: process.getuid?.() ?? 0 });
    mkdirSync(rendezvousDir(process.getuid?.() ?? 0), { recursive: true, mode: 0o700 });
    const hermUds = startUdsChannel({
      daemonHandle: herm.daemon.daemonHandle,
      placeVerb:    (o) => herm.daemon.placeVerb(o),
      socketPath:   hermSocketPath,
      onLog: (line) => console.log(`[herm] ${line}`),
    });

    let hermShuttingDown = false;
    const hermShutdown = async (sig: string): Promise<void> => {
      if (hermShuttingDown) return;
      hermShuttingDown = true;
      console.log(`[herm] ${sig} — graceful shutdown`);
      try {
        hermUds.close();
        httpServer.close();
        await herm.dispose();          // read-face + daemon island flush, then the composed vessel
        await herm.repo.flush();
        console.log("[herm] shutdown complete — state flushed durably");
      } catch (e) {
        console.error("[herm] shutdown error:", e instanceof Error ? e.message : String(e));
      } finally {
        process.exit(0);
      }
    };
    process.on("SIGINT",  () => void hermShutdown("SIGINT"));
    process.on("SIGTERM", () => void hermShutdown("SIGTERM"));
    return;
  }

  // A Lararium also stands a first-class mesh-node: it carries the FLOW-map (meshpalace+carriage) from the SAME
  // derived meshSelf — a hearth that navigates the mesh, not a destination beside the roads.
  const result = await openNodeVessel({
    hostId:     "lararium-node",
    wikiId,
    storageDir,
    genesisDir,
    rootDir,
    wss,
    catalogUrl,
    meshSelf,
    onPhase: (phase) => {
      console.log(`[lararium] phase → ${phase}`);
    },
  });
  if (result.activeWikiSource === "daemon-marker" && result.activeWikiId !== wikiId) {
    console.log(`[lararium] active wiki marker: ${wikiId} → ${result.activeWikiId}`);
  }
  console.log(`[lararium] live — wiki: ${result.activeWikiId} | storage: ${storageDir} | root: ${rootDir}`);
  console.log(`[lararium] catalog:  ${result.catalogHandleUrl ?? "(none)"}`);
  console.log(`[lararium] oracle:   ${result.oracleDocUrl ?? "(none)"}`);
  console.log(`[lararium] lararium: ${result.larariumDocUrl ?? "(none)"}`);
  console.log(`[lararium] daemon:   ${result.daemon.daemonHandle.url}`);
  const bootDocFragment = result.oracleDocUrl ?? result.catalogHandleUrl ?? "";
  for (const f of reachFaces) console.log(`[lararium] ws:       ${wsUrlForOrigin(f.origin)}#${bootDocFragment}   (${f.kind})`);

  // THE CROSSING, spoken aloud. A leaf's V3 proof commits to the GATE'S key, and the leaf must hold that
  // key OUT-OF-BAND — the challenge carries it on the wire, but trusting it there would let any relay
  // impersonate the gate (the anti-relay guarantee), so the wire copy sources nothing. A leaf that never
  // received the key binds its proof to its OWN did, the gate recomputes against its own, and the proof
  // fails closed. That refusal reads correct, and it looks exactly like a broken socket: dial, deny, re-dial.
  //
  // The gate arms with this vessel's operator verifying key, so this vessel already HOLDS the one thing a
  // crossing leaf cannot obtain for itself. Printing it turns an unperformable ritual into an instruction.
  // The load runs idempotent — the same identity the gate armed with, read back, never a second one.
  const gateIdentity = await generateOrLoadVesselIdentity(storageDir);
  console.log(`[lararium] gate key: ${gateIdentity.verifyingKey}`);
  console.log("[lararium] browser crossing — open one of these on the device that crosses:");
  for (const f of reachFaces) {
    console.log(`[lararium]   ${crossingUrl({ appOrigin: appOriginForFace(f, appPort), wsUrl: wsUrlForOrigin(f.origin), gateKey: gateIdentity.verifyingKey })}   (${f.kind})`);
  }
  console.log("[lararium]   (a leaf still needs an ADMIT — the leaf's page shows its own key + the `lares device-admit` line to run here)");

  // The CLIENT dial-out (Socket A) — announced when a peer sync URL rides the config (the same-operator device
  // breath: this vessel DIALS a peer node's /ws carrying the operator's own identity). Read inside the vessel;
  // announced here so the operator sees it. Absent → no dial, no line.
  const joinSync = process.env["LAR_JOIN_SYNC"];
  if (joinSync) {
    const joinGate = process.env["LAR_JOIN_GATE"];
    console.log(`[lararium] nexus dial-out → ${joinSync}${joinGate ? "" : "   (no LAR_JOIN_GATE — fail-closed to inert; a gate-less dial cannot bind the anti-relay proof)"}`);
  }

  // The @oracle read-only PUBLIC substrate (the Two-Faced Substrate's content-addressed
  // floor) — served over THIS http server: GET /oracle/pointer · /oracle/<cid>.bin.
  // Write-refusing by construction (GET-only, hash-named, no sync). Best-effort: a
  // read-face failure logs and never crashes boot. lar:///…/lararium-identity#the-oracle-plane.
  let oracleReadFace: { dispose: () => void } | null = null;
  if (result.oracleDocUrl) {
    try {
      const oracleHandle = await result.repo.find(result.oracleDocUrl as AutomergeUrl);
      const signerSeed   = await loadVesselSigningSeed(storageDir);
      oracleReadFace = await mountOracleReadFace({
        httpServer, oracleHandle, signerSeed, storageDir,
        onLog: (line) => console.log(`[lararium] ${line}`),
      });
      console.log(`[lararium] oracle read-face: GET /oracle/pointer · /oracle/<cid>.bin`);
    } catch (e) {
      console.log(`[lararium] oracle read-face skipped: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Co-located fast path: a Unix-domain verb-channel for the local `lares` CLI —
  // no per-command leaf replica / WS handshake. The WS relay above stays the path
  // for remote mesh peers. (lar:///…/api/lares-lararium-binding)
  // Same rendezvous law as the herm branch above: derived from the resolved substrate dir, sited where a
  // logout cannot reach it (operator ruling — a lararium serves as civic infrastructure).
  const socketPath = rendezvousPath({ root: storageDir, uid: process.getuid?.() ?? 0 });
  mkdirSync(rendezvousDir(process.getuid?.() ?? 0), { recursive: true, mode: 0o700 });
  const uds = startUdsChannel({
    daemonHandle: result.daemon.daemonHandle,
    placeVerb:    (o) => result.daemon.placeVerb(o),
    socketPath,
    onLog: (line) => console.log(`[lararium] ${line}`),
  });

  // Pre-warm the mempalace read holder so the FIRST recall / recall-into-wake skips
  // the ~8s cold chromadb start (the pool then stays warm for the daemon's life).
  // Background + best-effort: never blocks boot, never fails it when mempalace stands absent.
  void getMempalaceClient().then(
    () => console.log("[lararium] mempalace holder pre-warmed"),
    (e) => console.log(`[lararium] mempalace pre-warm skipped: ${e instanceof Error ? e.message : String(e)}`),
  );

  // ── Graceful, DURABLE shutdown (flush-then-force) ────────────────────────────
  // A bare process.exit() (or a SIGKILL escalation when the handler runs too slow)
  // while an island writes DESYNCS the actively-written doc — the recurring
  // "@working never arrived over syncPort" gap. The reliable path:
  //   1. stop new inbound work (uds + http + read-face),
  //   2. flush the MAIN replica FIRST — the guaranteed durable floor for every doc
  //      that has already synced (this completes before any force-exit),
  //   3. tear down the wiki islands (disposeAll → each island flushes its OWN
  //      partition, incl. @working, before it acks),
  //   4. tear down the daemon island gracefully (it flushes its docs + capture WAL),
  //   5. flush MAIN again to capture anything that synced during teardown.
  // A hard budget guards the whole sequence: if a worker jams in keyhive WASM
  // and never acks, the force-timer fires — but ONLY after step 2 has already made
  // the synced state durable (flush-then-force, never force-before-flush).
  //
  // The budget MUST beat the incumbent-stopper's grace window: `lares vessel stand --restart`
  // (port-control.stopIncumbent) sends SIGTERM, polls for ~8s, then SIGKILLs. So
  // the whole graceful sequence has to FLUSH AND EXIT under 8s, else the SIGKILL it
  // exists to avoid lands anyway. Default 6s leaves margin; the per-island
  // handshakes resolve in <1s when responsive, and the force-timer caps a jam.
  const SHUTDOWN_BUDGET_MS  = Number(process.env["LAR_SHUTDOWN_BUDGET_MS"] ?? 6_000);
  const DAEMON_SHUTDOWN_MS  = Math.max(1_000, Math.floor(SHUTDOWN_BUDGET_MS / 2));
  let shuttingDown = false;
  const shutdown = async (sig: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[lararium] ${sig} — graceful shutdown (durable flush, budget ${SHUTDOWN_BUDGET_MS}ms)`);
    const force = setTimeout(() => {
      console.error("[lararium] shutdown budget exceeded — forcing exit (main replica already flushed)");
      process.exit(0);
    }, SHUTDOWN_BUDGET_MS);
    force.unref?.();
    try {
      oracleReadFace?.dispose();
      uds.close();
      httpServer.close();
      await result.repo.flush();                       // floor: durable NOW, before any worker handshake
      await result.pool.disposeAll();                  // wiki islands flush their partitions + ack
      await result.daemon.shutdown(DAEMON_SHUTDOWN_MS); // daemon island flushes docs + capture, then acks
      await result.repo.flush();                       // catch what synced during teardown
      console.log("[lararium] shutdown complete — state flushed durably");
    } catch (e) {
      console.error("[lararium] shutdown flush error:", e instanceof Error ? e.message : String(e));
    } finally {
      clearTimeout(force);
      process.exit(0);
    }
  };
  process.on("SIGINT",  () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

/**
 * Serde-skew detector — a dependency bump (keyhive / automerge / beelay / TW5) can
 * leave the on-disk genesis engine serialized in a format the new deserializer cannot
 * read; the vessel-host then faults with a Rust enum-tag error. Rather than a bare
 * boot-loop `fatal:`, name the condition and point at the identity-safe cure.
 */
function isSerdeSkewFault(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  // Match the SYMPTOM (a Rust deserializer error), never the wrapper: matching any
  // `[vessel-host] fault` / `manifest handler threw` painted every island fault
  // (e.g. a slot-sync timeout) with the "run lares vessel rite rebuild" cure — a wrong cure
  // banner that costs real diagnosis time.
  return /tag for enum is not valid|failed to deserialize|invalid type:|serde/i.test(msg);
}

main().catch((err) => {
  if (isSerdeSkewFault(err)) {
    console.error("[lararium] STORED-BYTES SERDE SKEW — the vessel could not deserialize the stored genesis engine.");
    console.error("[lararium]   Cause: stored bytes predate a dependency bump (keyhive / automerge / beelay / TW5).");
    console.error("[lararium]   Cure (identity-safe, no data loss): run `lares vessel rite rebuild`");
    console.error("[lararium]         — rebuilds the genesis engine under current deps; your operator key/card are untouched.");
    console.error("[lararium]   underlying:", err instanceof Error ? err.message : String(err));
    process.exit(75);  // EX_TEMPFAIL — recoverable, distinct from a generic fatal(1)
  }
  console.error("[lararium] fatal:", err);
  process.exit(1);
});

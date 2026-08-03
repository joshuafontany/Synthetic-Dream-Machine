/**
 * two-vessel-mesh.test.ts — integration test: two node vessels boot and join the same mesh.
 *
 * Scenario:
 *   Vessel A = founding operator node (runs lares init, becomes Gate A/B/C passing)
 *   Vessel B = second vessel admitted via device-admit payload (same operator, second machine)
 *
 * Assertions:
 *   1. Vessel A: runInit produces sentinel oracle tiddlers in daemon doc + bootstrap
 *   2. Vessel A: daemon doc cap events carry lar URI tags (not $:/tags/CapEvent)
 *   3. Vessel A: runDeviceAdmit self-verifies B/C and emits admit.json
 *   4. Vessel B: runInit --admit writes oracle tiddlers + cap events matching Vessel A
 *   5. Vessel B: cap events in daemon doc parse cleanly as Keyhive event records
 *
 * Same-operator seed note: in production, both vessels share the same operator
 * keypair seed (the operator IS the same person on two devices). Here we let
 * runInit generate a fresh keypair per storageDir — the structural assertions
 * (oracle hex values, event counts, tag correctness) hold regardless of which
 * Individual the founding keyhive produced. Live Gate B/C verification with the
 * actual founding seed is covered by sentinel-durability.ts.
 *
 * Excluded from default `pnpm test`; opt-in with:
 *   pnpm vitest run --config vitest.e2e.config.ts
 *
 * Meme: lar:///ha.ka.ba/lararium/node/two-vessel-mesh
 */

import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { mkdirSync, rmSync, existsSync, readFileSync, cpSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { Repo } from "@automerge/automerge-repo";
import { NodeFSStorageAdapter } from "@automerge/automerge-repo-storage-nodefs";
import type { AutomergeUrl } from "@automerge/automerge-repo";
import {
  DAEMON_BAG_ID,
  PERSONA_GROUP_DOC_ID_TIDDLER, PERSONA_GROUP_AGENT_ID_TIDDLER, MESH_CABAL_DOC_ID_TIDDLER,
  CAP_EVENT_TAG,
} from "@lararium/mesh";
import { InMemoryEventStore } from "@lararium/keyhive";
import { runInit, runDeviceAdmit } from "../../src/index.js";
import { generateOrLoadVesselIdentity } from "../../src/node-vessel-identity.js";

// ---------------------------------------------------------------------------
// Test isolation directories
// ---------------------------------------------------------------------------

const TEST_ROOT  = join(tmpdir(), `lar-two-vessel-${Date.now()}`);
const VESSEL_A   = { storage: join(TEST_ROOT, "a", ".lararium"), genesis: join(TEST_ROOT, "a", "genesis") };
const VESSEL_B   = { storage: join(TEST_ROOT, "b", ".lararium"), genesis: join(TEST_ROOT, "b", "genesis") };
const ADMIT_FILE = join(TEST_ROOT, "admit.json");

// The built hearth artifact, which `pnpm --filter @lararium/node build:genesis` produces.
const BUILT_GENESIS = join(new URL("../../", import.meta.url).pathname, "..", "..", "genesis");

/** Ship the built hearth engine into a fresh vessel's genesis dir.
 *
 * A founding does not MAKE its engine — it receives one and founds a hearth around it, which is why
 * `runInit` refuses to found without the engine content-CID (the hearth's true-name) already on disk.
 * A vessel handed an empty genesis dir is not a vessel with a missing file; it is a vessel with no
 * hearth to be the true-name OF. So each temp vessel gets the same artifact a real one ships with.
 *
 * `social-bootstrap.json` stays behind deliberately — `runInit` writes it, and it names THIS founding.
 */
function shipHearthEngine(genesisDir: string): void {
  mkdirSync(genesisDir, { recursive: true });
  cpSync(BUILT_GENESIS, genesisDir, {
    recursive: true,
    filter: (src) => !src.endsWith("social-bootstrap.json"),
  });
}

mkdirSync(VESSEL_A.storage, { recursive: true });
mkdirSync(VESSEL_B.storage, { recursive: true });

// Fail here, naming the build, rather than three imports deep inside the founding ceremony.
if (!existsSync(join(BUILT_GENESIS, "island.cid-engine"))) {
  throw new Error(
    `[two-vessel-mesh] no hearth engine at ${BUILT_GENESIS} — ` +
      "run `pnpm --filter @lararium/node build:genesis` first (CI's `pnpm -r build` covers it).",
  );
}
shipHearthEngine(VESSEL_A.genesis);
shipHearthEngine(VESSEL_B.genesis);

afterAll(() => {
  try { rmSync(TEST_ROOT, { recursive: true, force: true }); } catch { /* cleanup best-effort */ }
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type BootstrapTiddlers = Record<string, { text?: string; title?: string; kind?: string }>;

function readBootstrap(genesisDir: string): BootstrapTiddlers {
  const raw = JSON.parse(readFileSync(join(genesisDir, "social-bootstrap.json"), "utf8")) as { text?: string };
  return (JSON.parse(raw.text ?? "{}") as { tiddlers?: BootstrapTiddlers }).tiddlers ?? {};
}

async function openDaemonDocTiddlers(storageDir: string, daemonUrl: string): Promise<Record<string, unknown>> {
  const repo     = new Repo({ storage: new NodeFSStorageAdapter(storageDir) });
  const progress = repo.findWithProgress(daemonUrl as AutomergeUrl);
  const handle   = progress.handle;
  await Promise.race([
    handle.whenReady(),
    new Promise<void>((_, reject) => setTimeout(() => reject(new Error(`daemon doc not ready in 8s: ${daemonUrl}`)), 8000)),
  ]);
  const doc = handle.doc() as Record<string, unknown> | null;
  const tiddlers = (doc?.["tiddlers"] ?? {}) as Record<string, unknown>;
  await repo.flush();
  return tiddlers;
}

function daemonTiddlerText(tiddlers: Record<string, unknown>, key: string): string | null {
  const entry = tiddlers[key] as Record<string,unknown> | undefined;
  return (entry?.["tiddler"] as Record<string,unknown> | undefined)?.["text"] as string ?? null;
}

const HEX_RE = /^(0x)?[0-9a-f]{60,}$/;

// ---------------------------------------------------------------------------
// Sequential setup: A must complete before B
// ---------------------------------------------------------------------------

let vesselADaemonTiddlers: Record<string, unknown> = {};
let admitPayload: Record<string, unknown> = {};
let vesselBDaemonTiddlers: Record<string, unknown> = {};

beforeAll(async () => {
  // Step 1 — founding ceremony
  await runInit({ storageDir: VESSEL_A.storage, genesisDir: VESSEL_A.genesis });

  const bootstrapA  = readBootstrap(VESSEL_A.genesis);
  const daemonUrlA   = bootstrapA[DAEMON_BAG_ID]?.text;
  if (!daemonUrlA) throw new Error("Vessel A: daemon URL missing from bootstrap");
  vesselADaemonTiddlers = await openDaemonDocTiddlers(VESSEL_A.storage, daemonUrlA);

  // Step 2 — B mints its OWN vessel key, before anyone admits it.
  //
  // Admission SIGNS a key the joinee already holds; it never issues one. B's private seed is born on
  // B and stays there, and only the public verifying key crosses to A — which is what lets the QR
  // ceremony stay photograph-inert, and why `runDeviceAdmit` refuses to run without that key.
  // `generateOrLoadVesselIdentity` reads through on a second call, so B's `runInit` below loads this
  // same identity rather than minting a second one.
  const vesselB = await generateOrLoadVesselIdentity(VESSEL_B.storage);

  // Step 3 — A's PersonaGroup root signs B's edge
  await runDeviceAdmit({
    storageDir:         VESSEL_A.storage,
    genesisDir:         VESSEL_A.genesis,
    outPath:            ADMIT_FILE,
    syncUrl:            "ws://localhost:3000/automerge",
    joineeVerifyingKey: vesselB.verifyingKey,
  });
  admitPayload = JSON.parse(readFileSync(ADMIT_FILE, "utf8"));

  // Step 4 — Vessel B founds against the signed payload
  await runInit({ storageDir: VESSEL_B.storage, genesisDir: VESSEL_B.genesis, admitPayloadPath: ADMIT_FILE });

  const bootstrapB = readBootstrap(VESSEL_B.genesis);
  const daemonUrlB  = bootstrapB[DAEMON_BAG_ID]?.text;
  if (!daemonUrlB) throw new Error("Vessel B: daemon URL missing from bootstrap");
  vesselBDaemonTiddlers = await openDaemonDocTiddlers(VESSEL_B.storage, daemonUrlB);
}, 120_000);

// ---------------------------------------------------------------------------
// Vessel A assertions
// ---------------------------------------------------------------------------

describe("Vessel A — founding ceremony", () => {
  test("social-bootstrap.json exists and carries PersonaGroup + MeshCabal oracle IDs", () => {
    const bootstrap = readBootstrap(VESSEL_A.genesis);
    expect(bootstrap[PERSONA_GROUP_DOC_ID_TIDDLER]?.text).toMatch(HEX_RE);
    expect(bootstrap[MESH_CABAL_DOC_ID_TIDDLER]?.text).toMatch(HEX_RE);
  });

  test("daemon doc carries all three sentinel oracle tiddlers", () => {
    expect(daemonTiddlerText(vesselADaemonTiddlers, PERSONA_GROUP_DOC_ID_TIDDLER)).toMatch(HEX_RE);
    expect(daemonTiddlerText(vesselADaemonTiddlers, PERSONA_GROUP_AGENT_ID_TIDDLER)).toMatch(HEX_RE);
    expect(daemonTiddlerText(vesselADaemonTiddlers, MESH_CABAL_DOC_ID_TIDDLER)).toMatch(HEX_RE);
  });

  test("daemon doc cap events use lar URI tag — never $:/tags/CapEvent", () => {
    const capEntries = Object.entries(vesselADaemonTiddlers).filter(([title]) =>
      title.startsWith(`${DAEMON_BAG_ID}/cap/`),
    );
    expect(capEntries.length).toBeGreaterThan(0);

    for (const [, entry] of capEntries) {
      const t    = (entry as Record<string,unknown>)?.["tiddler"] as Record<string,unknown>;
      const tags = String(t?.["tags"] ?? "");
      expect(tags).not.toContain("$:/tags/CapEvent");
      expect(tags).toContain(CAP_EVENT_TAG);
    }
  });
});

// ---------------------------------------------------------------------------
// device-admit payload assertions
// ---------------------------------------------------------------------------

describe("device-admit payload", () => {
  test("payload carries kind, sentinel IDs, cap events, and syncUrl", () => {
    expect(admitPayload["kind"]).toBe("device-admit/v1");
    expect(String(admitPayload["personaGroupDocIdHex"])).toMatch(HEX_RE);
    expect(String(admitPayload["personaGroupAgentIdHex"])).toMatch(HEX_RE);
    expect(String(admitPayload["meshCabalDocIdHex"])).toMatch(HEX_RE);
    expect(Array.isArray(admitPayload["capEvents"])).toBe(true);
    expect((admitPayload["capEvents"] as unknown[]).length).toBeGreaterThan(0);
    expect(admitPayload["syncUrl"]).toBe("ws://localhost:3000/automerge");
  });

  test("sentinel IDs in payload match Vessel A daemon doc", () => {
    expect(admitPayload["personaGroupDocIdHex"])
      .toBe(daemonTiddlerText(vesselADaemonTiddlers, PERSONA_GROUP_DOC_ID_TIDDLER));
    expect(admitPayload["personaGroupAgentIdHex"])
      .toBe(daemonTiddlerText(vesselADaemonTiddlers, PERSONA_GROUP_AGENT_ID_TIDDLER));
    expect(admitPayload["meshCabalDocIdHex"])
      .toBe(daemonTiddlerText(vesselADaemonTiddlers, MESH_CABAL_DOC_ID_TIDDLER));
  });
});

// ---------------------------------------------------------------------------
// Vessel B assertions
// ---------------------------------------------------------------------------

describe("Vessel B — admitted vessel", () => {
  test("bootstrap carries sentinel IDs matching the admit payload", () => {
    const bootstrap = readBootstrap(VESSEL_B.genesis);
    expect(bootstrap[PERSONA_GROUP_DOC_ID_TIDDLER]?.text).toBe(admitPayload["personaGroupDocIdHex"]);
    expect(bootstrap[MESH_CABAL_DOC_ID_TIDDLER]?.text).toBe(admitPayload["meshCabalDocIdHex"]);
  });

  test("Vessel B daemon doc oracle tiddlers match Vessel A sentinel IDs", () => {
    expect(daemonTiddlerText(vesselBDaemonTiddlers, PERSONA_GROUP_DOC_ID_TIDDLER))
      .toBe(daemonTiddlerText(vesselADaemonTiddlers, PERSONA_GROUP_DOC_ID_TIDDLER));
    expect(daemonTiddlerText(vesselBDaemonTiddlers, PERSONA_GROUP_AGENT_ID_TIDDLER))
      .toBe(daemonTiddlerText(vesselADaemonTiddlers, PERSONA_GROUP_AGENT_ID_TIDDLER));
    expect(daemonTiddlerText(vesselBDaemonTiddlers, MESH_CABAL_DOC_ID_TIDDLER))
      .toBe(daemonTiddlerText(vesselADaemonTiddlers, MESH_CABAL_DOC_ID_TIDDLER));
  });

  test("Vessel B daemon doc cap events parse as valid Keyhive event records", async () => {
    const store     = new InMemoryEventStore();
    const capPrefix = `${DAEMON_BAG_ID}/cap/`;

    for (const [title, entry] of Object.entries(vesselBDaemonTiddlers)) {
      if (!title.startsWith(capPrefix)) continue;
      const t       = (entry as Record<string,unknown>)?.["tiddler"] as Record<string,unknown>;
      const variant = t?.["variant"] as string | undefined;
      const text    = t?.["text"]    as string | undefined;
      if (!variant || !text) continue;
      const bytes = new Uint8Array(Buffer.from(text, "base64"));
      await store.put({ hash: title, variant, bytes });
    }

    const events = await store.list();
    expect(events.length).toBeGreaterThan(0);

    for (const evt of events) {
      expect(evt.variant).toMatch(/^(PREKEY_ROTATED|CGKA_OPERATION|DELEGATED|REVOKED)$/);
      expect(evt.bytes.length).toBeGreaterThan(0);
    }
  });

  test("Vessel B cap event count matches payload cap event count", () => {
    const capCount = Object.keys(vesselBDaemonTiddlers).filter(t =>
      t.startsWith(`${DAEMON_BAG_ID}/cap/`),
    ).length;
    const payloadCount = (admitPayload["capEvents"] as unknown[]).length;
    expect(capCount).toBe(payloadCount);
  });
});

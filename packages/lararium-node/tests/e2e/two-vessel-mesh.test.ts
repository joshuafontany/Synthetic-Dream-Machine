/**
 * two-vessel-mesh.test.ts — integration test: two node vessels boot and join the same mesh.
 *
 * Scenario:
 *   Vessel A = founding operator node (runs lares init, becomes Gate A/B/C passing)
 *   Vessel B = second vessel admitted via device-admit payload (same operator, second machine)
 *
 * Assertions:
 *   1. Vessel A: runInit produces sentinel oracle tiddlers in admin doc + bootstrap
 *   2. Vessel A: admin doc cap events carry lar URI tags (not $:/tags/CapEvent)
 *   3. Vessel A: runDeviceAdmit self-verifies B/C and emits admit.json
 *   4. Vessel B: runInit --admit writes oracle tiddlers + cap events matching Vessel A
 *   5. Vessel B: cap events in admin doc parse cleanly as Keyhive event records
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
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/node/two-vessel-mesh
 */

import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { mkdirSync, rmSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { Repo } from "@automerge/automerge-repo";
import { NodeFSStorageAdapter } from "@automerge/automerge-repo-storage-nodefs";
import type { AutomergeUrl } from "@automerge/automerge-repo";
import {
  ADMIN_BAG_ID,
  PERSONA_GROUP_DOC_ID_TIDDLER, PERSONA_GROUP_AGENT_ID_TIDDLER, MESH_CABAL_DOC_ID_TIDDLER,
  CAP_EVENT_TAG,
} from "@lararium/mesh";
import { InMemoryEventStore } from "@lararium/keyhive";
import { runInit, runDeviceAdmit } from "../../src/index.js";

// ---------------------------------------------------------------------------
// Test isolation directories
// ---------------------------------------------------------------------------

const TEST_ROOT  = join(tmpdir(), `lar-two-vessel-${Date.now()}`);
const VESSEL_A   = { storage: join(TEST_ROOT, "a", ".lararium"), genesis: join(TEST_ROOT, "a", "genesis") };
const VESSEL_B   = { storage: join(TEST_ROOT, "b", ".lararium"), genesis: join(TEST_ROOT, "b", "genesis") };
const ADMIT_FILE = join(TEST_ROOT, "admit.json");

mkdirSync(VESSEL_A.storage, { recursive: true });
mkdirSync(VESSEL_A.genesis, { recursive: true });
mkdirSync(VESSEL_B.storage, { recursive: true });
mkdirSync(VESSEL_B.genesis, { recursive: true });

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

async function openAdminDocTiddlers(storageDir: string, adminUrl: string): Promise<Record<string, unknown>> {
  const repo     = new Repo({ storage: new NodeFSStorageAdapter(storageDir) });
  const progress = repo.findWithProgress(adminUrl as AutomergeUrl);
  const handle   = progress.handle;
  await Promise.race([
    handle.whenReady(),
    new Promise<void>((_, reject) => setTimeout(() => reject(new Error(`admin doc not ready in 8s: ${adminUrl}`)), 8000)),
  ]);
  const doc = handle.doc() as Record<string, unknown> | null;
  const tiddlers = (doc?.["tiddlers"] ?? {}) as Record<string, unknown>;
  await repo.flush();
  return tiddlers;
}

function adminTiddlerText(tiddlers: Record<string, unknown>, key: string): string | null {
  const entry = tiddlers[key] as Record<string,unknown> | undefined;
  return (entry?.["tiddler"] as Record<string,unknown> | undefined)?.["text"] as string ?? null;
}

const HEX_RE = /^(0x)?[0-9a-f]{60,}$/;

// ---------------------------------------------------------------------------
// Sequential setup: A must complete before B
// ---------------------------------------------------------------------------

let vesselAAdminTiddlers: Record<string, unknown> = {};
let admitPayload: Record<string, unknown> = {};
let vesselBAdminTiddlers: Record<string, unknown> = {};

beforeAll(async () => {
  // Step 1 — founding ceremony
  await runInit({ storageDir: VESSEL_A.storage, genesisDir: VESSEL_A.genesis });

  const bootstrapA  = readBootstrap(VESSEL_A.genesis);
  const adminUrlA   = bootstrapA[ADMIN_BAG_ID]?.text;
  if (!adminUrlA) throw new Error("Vessel A: admin URL missing from bootstrap");
  vesselAAdminTiddlers = await openAdminDocTiddlers(VESSEL_A.storage, adminUrlA);

  // Step 2 — device-admit payload
  await runDeviceAdmit({
    storageDir: VESSEL_A.storage,
    genesisDir: VESSEL_A.genesis,
    outPath:    ADMIT_FILE,
    syncUrl:    "ws://localhost:3000/automerge",
  });
  admitPayload = JSON.parse(readFileSync(ADMIT_FILE, "utf8"));

  // Step 3 — Vessel B admission
  await runInit({ storageDir: VESSEL_B.storage, genesisDir: VESSEL_B.genesis, admitPayloadPath: ADMIT_FILE });

  const bootstrapB = readBootstrap(VESSEL_B.genesis);
  const adminUrlB  = bootstrapB[ADMIN_BAG_ID]?.text;
  if (!adminUrlB) throw new Error("Vessel B: admin URL missing from bootstrap");
  vesselBAdminTiddlers = await openAdminDocTiddlers(VESSEL_B.storage, adminUrlB);
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

  test("admin doc carries all three sentinel oracle tiddlers", () => {
    expect(adminTiddlerText(vesselAAdminTiddlers, PERSONA_GROUP_DOC_ID_TIDDLER)).toMatch(HEX_RE);
    expect(adminTiddlerText(vesselAAdminTiddlers, PERSONA_GROUP_AGENT_ID_TIDDLER)).toMatch(HEX_RE);
    expect(adminTiddlerText(vesselAAdminTiddlers, MESH_CABAL_DOC_ID_TIDDLER)).toMatch(HEX_RE);
  });

  test("admin doc cap events use lar URI tag — never $:/tags/CapEvent", () => {
    const capEntries = Object.entries(vesselAAdminTiddlers).filter(([title]) =>
      title.startsWith(`${ADMIN_BAG_ID}/cap/`),
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

  test("sentinel IDs in payload match Vessel A admin doc", () => {
    expect(admitPayload["personaGroupDocIdHex"])
      .toBe(adminTiddlerText(vesselAAdminTiddlers, PERSONA_GROUP_DOC_ID_TIDDLER));
    expect(admitPayload["personaGroupAgentIdHex"])
      .toBe(adminTiddlerText(vesselAAdminTiddlers, PERSONA_GROUP_AGENT_ID_TIDDLER));
    expect(admitPayload["meshCabalDocIdHex"])
      .toBe(adminTiddlerText(vesselAAdminTiddlers, MESH_CABAL_DOC_ID_TIDDLER));
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

  test("Vessel B admin doc oracle tiddlers match Vessel A sentinel IDs", () => {
    expect(adminTiddlerText(vesselBAdminTiddlers, PERSONA_GROUP_DOC_ID_TIDDLER))
      .toBe(adminTiddlerText(vesselAAdminTiddlers, PERSONA_GROUP_DOC_ID_TIDDLER));
    expect(adminTiddlerText(vesselBAdminTiddlers, PERSONA_GROUP_AGENT_ID_TIDDLER))
      .toBe(adminTiddlerText(vesselAAdminTiddlers, PERSONA_GROUP_AGENT_ID_TIDDLER));
    expect(adminTiddlerText(vesselBAdminTiddlers, MESH_CABAL_DOC_ID_TIDDLER))
      .toBe(adminTiddlerText(vesselAAdminTiddlers, MESH_CABAL_DOC_ID_TIDDLER));
  });

  test("Vessel B admin doc cap events parse as valid Keyhive event records", async () => {
    const store     = new InMemoryEventStore();
    const capPrefix = `${ADMIN_BAG_ID}/cap/`;

    for (const [title, entry] of Object.entries(vesselBAdminTiddlers)) {
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
    const capCount = Object.keys(vesselBAdminTiddlers).filter(t =>
      t.startsWith(`${ADMIN_BAG_ID}/cap/`),
    ).length;
    const payloadCount = (admitPayload["capEvents"] as unknown[]).length;
    expect(capCount).toBe(payloadCount);
  });
});

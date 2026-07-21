/**
 * browser-boot-invite.test.ts — the TRACELESS boot-invite on the browser (island-of-one), over REAL
 * IndexedDB + REAL @noble/ed25519.
 *
 * Proven (the traceless proof):
 *   · a valid sealed invite ADMITS and BURNS its id LOCALLY (spend-on-boot) — the burn lands in this island's
 *     OWN IndexedDB, nowhere else,
 *   · SINGLE-USE — a re-present of the burned invite WITHHOLDS (`already-spent`), never a throw,
 *   · a GARBLED / ABSENT / EXPIRED / WRONG-NEXUS invite WITHHOLDS (founds own group at the anon floor) and
 *     BURNS NOTHING — the burn-set stays empty (NO record written on the withhold path),
 *   · the OPEN policy admits with no invite (no burn, no record).
 */
import { describe, test, expect, afterEach } from "vitest";
import { signBootInvite, bootInviteId, hex, type BootInvite } from "@lararium/mesh";
import * as ed from "@noble/ed25519";
import {
  runBrowserBootInviteSpend, isBootInviteBurned, readBootInviteBurnSet,
} from "../src/browser-boot-invite-burn.js";

const NEXUS_SEED = new Uint8Array(32).fill(9);
const nexusSign  = (bytes: Uint8Array) => ed.signAsync(bytes, NEXUS_SEED).then(hex);
let NEXUS = "";
async function nexusPub(): Promise<string> {
  return NEXUS || (NEXUS = await ed.getPublicKeyAsync(NEXUS_SEED).then(hex));
}
async function invite(over: Partial<Omit<BootInvite, "kind" | "sig">> = {}): Promise<BootInvite> {
  return signBootInvite({
    nexusPubkey: over.nexusPubkey ?? (await nexusPub()),
    nonce:       over.nonce       ?? "a1b2c3d4e5f60718",
    expiresAt:   over.expiresAt   ?? new Date(Date.now() + 86_400_000).toISOString(),
  }, nexusSign);
}

let created = 0;
const opened = new Set<string>();
function idb(): string { const n = `lares:test-boot-invite:${Date.now()}:${created++}`; opened.add(n); return n; }
function deleteIdb(name: string): Promise<void> {
  return new Promise((resolve) => {
    const req = indexedDB.deleteDatabase(name);
    req.onsuccess = req.onerror = req.onblocked = () => resolve();
  });
}
afterEach(async () => { for (const n of opened) await deleteIdb(n); opened.clear(); });

describe("runBrowserBootInviteSpend — sealed, single-use, traceless (real IDB)", () => {
  test("a valid sealed invite ADMITS and BURNS its id in the LOCAL IndexedDB", async () => {
    const name = idb();
    const inv  = await invite();
    const v = await runBrowserBootInviteSpend({ idbName: name, nexusPubkey: await nexusPub(), invite: inv });
    expect(v.admitted).toBe(true);
    expect(v.burnId).toBe(bootInviteId(inv));
    expect(await isBootInviteBurned(name, bootInviteId(inv))).toBe(true);   // the burn is a LOCAL fact
    expect([...await readBootInviteBurnSet(name)]).toEqual([bootInviteId(inv)]);
  });

  test("SINGLE-USE — a re-present of the burned invite WITHHOLDS (already-spent, not a throw)", async () => {
    const name = idb();
    const inv  = await invite();
    await runBrowserBootInviteSpend({ idbName: name, nexusPubkey: await nexusPub(), invite: inv });
    const again = await runBrowserBootInviteSpend({ idbName: name, nexusPubkey: await nexusPub(), invite: inv });
    expect(again.admitted).toBe(false);
    expect(again.refusal).toBe("already-spent");
  });

  test("a GARBLED / ABSENT invite WITHHOLDS and BURNS NOTHING (anon floor, no record)", async () => {
    const name = idb();
    const v = await runBrowserBootInviteSpend({ idbName: name, nexusPubkey: await nexusPub(), invite: null });
    expect(v.admitted).toBe(false);
    expect(v.refusal).toBe("no-invite");
    expect([...await readBootInviteBurnSet(name)]).toEqual([]);   // the traceless proof: no record written
  });

  test("an EXPIRED / WRONG-NEXUS invite WITHHOLDS and writes no record", async () => {
    const nameA = idb();
    const expired = await invite({ expiresAt: new Date(Date.now() - 1000).toISOString() });
    const ve = await runBrowserBootInviteSpend({ idbName: nameA, nexusPubkey: await nexusPub(), invite: expired });
    expect(ve.admitted).toBe(false);
    expect(ve.refusal).toBe("expired");
    expect([...await readBootInviteBurnSet(nameA)]).toEqual([]);

    const nameB = idb();
    const wrong = await invite({ nexusPubkey: "ff".repeat(32) });
    const vw = await runBrowserBootInviteSpend({ idbName: nameB, nexusPubkey: await nexusPub(), invite: wrong });
    expect(vw.admitted).toBe(false);
    expect(vw.refusal).toBe("wrong-nexus");
    expect([...await readBootInviteBurnSet(nameB)]).toEqual([]);
  });

  test("the OPEN policy admits with no invite (no burn, no record)", async () => {
    const name = idb();
    const v = await runBrowserBootInviteSpend({ idbName: name, nexusPubkey: await nexusPub(), invite: null, policy: { kind: "open" } });
    expect(v.admitted).toBe(true);
    expect(v.burnId).toBeUndefined();
    expect([...await readBootInviteBurnSet(name)]).toEqual([]);
  });
});

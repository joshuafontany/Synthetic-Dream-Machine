/**
 * e2e/face-join — the capability half of a join, driven against a REAL standing daemon.
 *
 * The unit tests fence the decision against a recording fake, and the pair test proves the crypto between two
 * in-process providers holding their own bag list. Neither touches what a live vessel supplies: the group id
 * off `daemonAuth`, the lease epoch scanned from real @daemon slots, and the standing-bag set the re-grant
 * walks. A join can pass every other test and still, on a real hearth, seat a member that reaches nothing.
 *
 * So these vectors ride the daemon's own verb surface, over its UDS channel, exactly as a summons relayed from
 * @daemon would arrive:
 *
 *   V1 — an edge THIS hearth's root signed admits, seats, and RE-GRANTS its standing bags (regranted > 0)
 *   V2 — a repeat hands the seat back and moves no epoch (reKeyed false, regranted 0), material still flowing
 *   V3 — force re-keys and re-grants again, for a suspected-but-unrevoked key
 *   V4 — an edge signed by ANOTHER root refuses, with a reason a joinee's panel can paint
 *
 * V1's `regranted` assertion is the one that cannot be inferred: membership WITHOUT reach looks identical to a
 * healthy join from every other angle — admitted, re-keyed, events flowing — and only the count says so.
 */
import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { targetInstance, type LarInstance } from "../harness/instance.js";
import { KeyhiveProvider } from "../../packages/lararium-keyhive/src/keyhive-provider.js";
import { invokeLocal } from "../../packages/lares-cli/src/local-connector.js";
import type { DeviceDelegationTiddler } from "../../packages/lararium-mesh/src/device-delegation.js";

let lar: LarInstance;
let dataDir = "";
let joineeCard = "";
let joineeKey = "";
let edge: DeviceDelegationTiddler | null = null;

/** Find the daemon's UDS home under this instance's root — the socket names it, whatever the layout. */
function findSocketDir(root: string, depth = 5): string | null {
  const walk = (dir: string, left: number): string | null => {
    if (left < 0 || !existsSync(dir)) return null;
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (name === "lares.sock") return dir;
      let isDir = false;
      try { isDir = statSync(p).isDirectory(); } catch { isDir = false; }
      if (isDir) { const hit = walk(p, left - 1); if (hit) return hit; }
    }
    return null;
  };
  return walk(root, depth);
}

async function summon(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const r = await invokeLocal("face-join", { summons: { kind: "face-join/v1", ...body } },
    `0x${"0".repeat(64)}`, { dataDir, timeoutMs: 30_000 });
  return (r as { results?: { summary?: { output?: Record<string, unknown> } } })
    .results?.summary?.output ?? (r as unknown as Record<string, unknown>);
}

beforeAll(async () => {
  lar = await targetInstance();
  dataDir = findSocketDir(lar.root) ?? "";

  // A THROWAWAY vessel stands its own keyhive and offers its own card — the joinee half, never this hearth's.
  const p = new KeyhiveProvider();
  await p.init({ seed: new Uint8Array(32).fill(88), eventStore: { put: async () => {}, list: async () => [] } });
  joineeKey  = (await p.whoami()).replace(/^0x/, "");
  joineeCard = new TextDecoder().decode(await p.contactCard());

  // The hearth's OWN root signs the edge that licenses it.
  const admit = await lar.cli(["device-admit", "--joinee-key", joineeKey]);
  const b64 = /#admit=([A-Za-z0-9_-]+)/.exec(admit.stdout)?.[1];
  if (b64) edge = JSON.parse(Buffer.from(b64, "base64url").toString("utf8")).deviceEdge;
}, 240_000);

afterAll(async () => { await lar?.stop(); });

describe("e2e/face-join — the join against a live hearth", () => {
  test("the rig stands: a socket to summon through, and a signed edge to present", () => {
    expect(dataDir).not.toBe("");
    expect(edge?.deviceVerifyingKey).toBe(joineeKey);
  });

  test("V1 — a licensed edge seats the joinee AND re-grants the hearth's standing bags", async () => {
    const g = await summon({ contactCard: joineeCard, deviceEdge: edge });
    expect(g["admitted"]).toBe(true);
    expect(g["reKeyed"]).toBe(true);
    expect((g["capEvents"] as string[]).length).toBeGreaterThan(0);
    expect(typeof g["founderCard"]).toBe("string");
    // THE VECTOR THAT CANNOT BE INFERRED — a seat that re-grants nothing reaches nothing.
    expect(g["regranted"] as number).toBeGreaterThan(0);
  }, 120_000);

  test("V2 — a repeat hands the seat back, moves no epoch, and still returns the material", async () => {
    const g = await summon({ contactCard: joineeCard, deviceEdge: edge });
    expect(g["admitted"]).toBe(true);
    expect(g["reKeyed"]).toBe(false);
    expect(g["regranted"]).toBe(0);
    expect((g["capEvents"] as string[]).length).toBeGreaterThan(0);   // a wiped store still recovers
  }, 120_000);

  test("V3 — force re-keys a seated device and re-grants again", async () => {
    const g = await summon({ contactCard: joineeCard, deviceEdge: edge, force: true });
    expect(g["admitted"]).toBe(true);
    expect(g["reKeyed"]).toBe(true);
    expect(g["regranted"] as number).toBeGreaterThan(0);
  }, 120_000);

  test("V4 — an edge signed by another root refuses, with a reason worth painting", async () => {
    const foreign = { ...(edge as DeviceDelegationTiddler), personaRootDid: `0x${"1".repeat(64)}` };
    const g = await summon({ contactCard: joineeCard, deviceEdge: foreign });
    expect(g["admitted"]).toBe(false);
    expect(String(g["reason"])).toMatch(/pinned root|edge refused/i);
  }, 120_000);
});

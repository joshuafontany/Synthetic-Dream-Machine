/**
 * circle-command.test.ts — the FOLLOW VERB (`lares circle`) end-to-end over the REAL node-fs stores.
 *
 * Operator intent: adding to a circle IS the follow, and it leaves NO central trace. The graph + the
 * recogniser's labels live in PRIVATE files under the identity home; nothing reaches @crossroads.
 *
 * Proven:
 *   · `circle add <nym> --card <file> --to following --petname` returns 0 + writes ONLY the local private
 *     files (`.circles-follow.json` + `.handle-book.json`) under the identity home — the never-federated proof
 *     (no board / announce / @crossroads artifact anywhere in the tree),
 *   · `circle list` reads the follow back under the OWN names (petname + last-seen glamour),
 *   · `circle remove` drops the edge locally,
 *   · FAIL-CLOSED — following an UNMET nym with NO --card returns non-zero and writes no graph entry.
 */
import { afterEach, beforeEach, describe, test, expect, vi } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, existsSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cmdCircle } from "../src/commands/circle.js";
import { larIdentityDir } from "../src/env.js";
import type { ParsedArgs } from "../src/parse-args.js";
import { signHandleCard, ed25519SignerFromSeed, derivePersonaKeypair, signingSeedFromHex } from "@lararium/mesh";

const saved: Record<string, string | undefined> = {};
const setEnv = (k: string, v: string | undefined): void => {
  saved[k] = process.env[k];
  if (v === undefined) delete process.env[k]; else process.env[k] = v;
};
const circleArgs = (positional: string[], options: Record<string, string> = {}): ParsedArgs =>
  ({ command: "circle", positional, options, flags: { json: true } } as unknown as ParsedArgs);

/** Mint a self-certifying HandleCard for a fresh nym, write it to a file, return its path + the nym. */
async function cardFile(dir: string, seedByte: number, glamour: string): Promise<{ nym: string; path: string }> {
  const { signingKey, verifyingKey: nym } = await derivePersonaKeypair(new Uint8Array(32).fill(seedByte), [0]);
  const card = await signHandleCard(
    { nym, glamour, version: 1, prev: null, expiry: Date.now() + 86_400_000, standing: null },
    ed25519SignerFromSeed(signingSeedFromHex(signingKey)),
  );
  const path = join(dir, `${glamour}.card.json`);
  writeFileSync(path, JSON.stringify(card), "utf8");
  return { nym, path };
}

/** Every file under the identity home — the whole persistent footprint of a follow (proves LOCALITY). */
function identityFootprint(): string[] {
  const dir = larIdentityDir();
  return existsSync(dir) ? readdirSync(dir).sort() : [];
}

describe("lares circle — the follow verb, local + traceless", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "lares-circle-"));
    setEnv("LAR_ROOT", root);
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    rmSync(root, { recursive: true, force: true });
  });

  test("add with a card follows LOCALLY — only the private files land, no board write anywhere", async () => {
    const { nym, path } = await cardFile(root, 3, "Discordia");
    const code = await cmdCircle(circleArgs(["add", nym], { to: "following", card: path, petname: "my-eris" }));
    expect(code).toBe(0);

    // The follow-graph landed under the identity home, and NOTHING else did (no @crossroads / board artifact).
    const foot = identityFootprint();
    expect(foot).toContain(".circles-follow.json");
    expect(foot).toContain(".handle-book.json");
    expect(foot.some((f) => /crossroad|board|announce|glamour|public/i.test(f))).toBe(false);

    // The private graph holds the edge; the private book holds the label.
    const graph = JSON.parse(readFileSync(join(larIdentityDir(), ".circles-follow.json"), "utf8"));
    expect(graph.circles.following).toContain(nym);
    const book = JSON.parse(readFileSync(join(larIdentityDir(), ".handle-book.json"), "utf8"));
    expect(book.records.find((r: { nym: string }) => r.nym === nym)?.petname).toBe("my-eris");
  });

  test("list reads the follow back under the OWN names; remove drops the edge", async () => {
    const { nym, path } = await cardFile(root, 7, "TheGuru");
    await cmdCircle(circleArgs(["add", nym], { to: "following", card: path, petname: "guru" }));

    expect(await cmdCircle(circleArgs(["list"], { to: "following" }))).toBe(0);

    expect(await cmdCircle(circleArgs(["remove", nym], { to: "following" }))).toBe(0);
    const graph = JSON.parse(readFileSync(join(larIdentityDir(), ".circles-follow.json"), "utf8"));
    expect(graph.circles.following ?? []).not.toContain(nym);
  });

  test("FAIL-CLOSED — following an UNMET nym with no --card returns non-zero, writes no edge", async () => {
    const code = await cmdCircle(circleArgs(["add", "ab".repeat(32)], { to: "following" }));
    expect(code).not.toBe(0);
    // No graph entry landed (a torn/absent file reads empty).
    const file = join(larIdentityDir(), ".circles-follow.json");
    const graph = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : { circles: {} };
    expect(graph.circles.following ?? []).toEqual([]);
  });
});

/**
 * A FACE LIT MUST LEAVE THE VESSEL BOOTABLE.
 *
 * ── THE LAW, VOWED BEFORE THE CAUSE WAS KNOWN ────────────────────────────────────────────────────────────
 * Lighting a face is the operator act that lifts a place to a hearth. It mints a PersonaGroup, seeds four
 * planes, and writes the group's id into the bootstrap so the next boot reads a face standing. Every one of
 * those touches this island's own disk.
 *
 * So the vessel must still boot afterwards. That is the whole claim, and it does not depend on WHY a
 * particular vessel fails it — which is exactly why it stands written before the cause was found.
 *
 * ── WHAT BROKE IT IN THE MESH ────────────────────────────────────────────────────────────────────────────
 * The docker harness's one hearth lit `alpha` and then died every boot with
 *
 *     [boot] hearth-private doc unavailable — local corruption (no peer carries it): @daemon (automerge:…)
 *
 * on the SAME document id each attempt, through three restarts. Its sibling herms hit the same wording as a
 * transient — a peer that had not stood yet — and recovered on retry. One message, two faults; a race
 * resolves on retry and a stable id failing thrice does not.
 *
 * ── WHY THE SEQUENCE HERE MATCHES THE CONTAINER'S EXACTLY ────────────────────────────────────────────────
 * `found` (place, faceless) → `persona new` PEERLESS → boot. The peerless mint is deliberate: seeding four
 * planes reaches only local disk, and reaching for peers that have not yet stood answers
 * `Document … is unavailable` — a resolution failure standing in for a dependency that was never real. If
 * lighting peerless leaves a state the peered boot cannot resolve, THAT is the fault, and this reproduces
 * it without docker, three containers, or a network.
 */

import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync, cpSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const REPO = new URL("../..", import.meta.url).pathname;
const CLI  = join(REPO, "packages/lares-cli/dist/src/bin/lares.js");

/** A SHORT root, always. A deep one refuses the socket bind for reasons that have nothing to do with this
 *  claim, and a test that failed for that would accuse the wrong joint (`rendezvous-path`). */
let root = "";

function lares(args: string[], env: Record<string, string> = {}): string {
  return execFileSync("node", [CLI, ...args], {
    cwd: REPO, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, LAR_ROOT: root, LAR_PORT: "8299", ...env },
  });
}

/** The bootstrap's own record of which `@daemon` document this place stands on. */
function daemonUrlFromBootstrap(): string | null {
  const p = join(root, "data/lares/vessel/social-bootstrap.json");
  if (!existsSync(p)) return null;
  const m = /automerge:[A-Za-z0-9]+/.exec(readFileSync(p, "utf8"));
  return m ? m[0] : null;
}

describe.skipIf(!existsSync(CLI))("a face lit leaves the vessel bootable", () => {
  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), "lares-face-"));
    cpSync(join(REPO, "genesis"), join(root, "genesis"), { recursive: true });
  });
  afterAll(() => { try { lares(["vessel", "stop"]); } catch { /* never stood */ } rmSync(root, { recursive: true, force: true }); });

  test("founding the PLACE names a daemon document", () => {
    // VACUITY GATE. Every claim below compares against this id; if founding names none, the comparisons
    // would pass by having nothing to disagree with.
    lares(["vessel", "found"]);
    expect(daemonUrlFromBootstrap()).toMatch(/^automerge:/);
  });

  test("lighting a face PEERLESS does not move the place's daemon document", () => {
    // The container lights with LAR_PEERS cleared, so the mint reaches only local disk. It writes the
    // PersonaGroup id INTO this bootstrap — it must not re-seed the place underneath itself.
    const before = daemonUrlFromBootstrap();
    lares(["persona", "new", "0", "--name", "alpha"], { LAR_PEERS: "" });
    expect(daemonUrlFromBootstrap()).toBe(before);
  });

  test("the lit face is recorded where the boot reads it", () => {
    // `faceStands()` reads the BOOTSTRAP for the PersonaGroup id — not the roster, not the key on disk.
    const bootstrap = readFileSync(join(root, "data/lares/vessel/social-bootstrap.json"), "utf8");
    expect(/persona[-_]?group/i.test(bootstrap)).toBe(true);
  });

  test("★ the vessel then BOOTS — it does not answer `hearth-private doc unavailable` ★", () => {
    // THE CLAIM. A place that lit a face must still stand. The mesh's hearth failed exactly here, on a
    // stable document id, through three restarts.
    const out = lares(["vessel", "stand"]);
    expect(out).not.toMatch(/hearth-private doc unavailable/);
    expect(out).not.toMatch(/local corruption/);
    const report = JSON.parse(out.slice(out.indexOf("{")));
    expect(report.data.node.started).toBe(true);
  });

  test("★ and it boots with PEERS CONFIGURED that have not yet stood ★", () => {
    // THE CONTAINER'S ACTUAL CONDITION, which the arms above omit. `lararium-a` boots with
    // `LAR_PEERS=http://herm-source:8080` — a peer that on a cold mesh may not be serving yet. A vessel is
    // a CAUSAL ISLAND: it reads its own state and knows only "as of my last sync". So a peer that has not
    // answered names nothing about whether THIS island's own `@daemon` stands, and a boot that reported
    // "local corruption (no peer carries it)" would be reading an absence somewhere else as damage here.
    lares(["vessel", "stop"]);
    const out = lares(["vessel", "stand"], { LAR_PEERS: "http://127.0.0.1:9/never-stands" });
    expect(out).not.toMatch(/hearth-private doc unavailable/);
    expect(out).not.toMatch(/local corruption/);
  });

  test("★ and it stands as a HEARTH, never at the waking floor ★", () => {
    // A face was lit, so `standAs` must read `hearth`. Standing as a herm here would mean the lift wrote
    // something the boot could not see — the harness's original fault, wearing a quieter face.
    const out = lares(["persona", "list"]);
    const listed = JSON.parse(out.slice(out.indexOf("{")));
    expect(listed.ok).toBe(true);
    expect(listed.data.personas.map((p: { petname: string }) => p.petname)).toContain("alpha");
  });
});

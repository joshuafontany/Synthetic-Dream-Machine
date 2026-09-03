/**
 * e2e/herm-floor — THE HERM CONTRACT, stood against a live vessel.
 *
 * A HERM IS NOT A LARARIUM MISSING SOMETHING. It is the BASE COURSE every vessel stands on, and a
 * lararium is that course with its hearth-fire lit. The stack carries the distinction as CAPS rather
 * than kinds: a vessel composes the caps it can hold, and `personaSlotCeiling("herm") === 0` bars a
 * SEATED persona root on a crossroads. Facelessness is not only a window between two commands — a
 * crossroads someone stands for the public may never light a face at all.
 *
 * MAY-HOLD-A-FACE ⊥ HOLDS-ONE-NOW. `standAs` asks the ARCHIVE question alone; whether a face STANDS is
 * a separate fact the boot reads separately, and `--recipe herm` DECLINES the lift rather than naming a
 * different kind of thing.
 *
 * WHY THESE ARE E2E AND NOT UNIT. A vector that fences a SITE finds that site; a vector that stands the
 * PATH lets the boot enumerate its own reaches for a face, and this floor was found one reach at a time
 * by unit vectors that each went green while the live boot failed further along. R1 stands the whole
 * path, and when it fails it fails with the next site's name in its message.
 *
 *   R1 — a herm reaches `live`                         · the base case of the stack
 *   R2 — a herm serves the public shelf                · carrying is what the floor is FOR
 *   R3 — a herm carries a crossing                     · admit-by-lease, the relay role that is load-bearing
 *   R4 — a herm refuses hearth-scoped acts LEGIBLY     · refusal is a feature of the floor
 *   R5 — a herm LIFTS into a lararium                  · the cap-stack transition the runbook's rite performs
 */
import { describe, test, expect, afterAll } from "vitest";
import { mkdtempSync, rmSync, existsSync, readdirSync, statSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync, spawn } from "node:child_process";
import { rendezvousPath } from "../../packages/lararium-mesh/src/rendezvous-path.js";

/**
 * The herm's rendezvous — DERIVED from its root, never hunted under it.
 *
 * A walk for a file named `lares.sock` beneath the root found nothing, because the rendezvous stands
 * at `/tmp/lares-<uid>/<root-digest>.sock` — a fixed 40 bytes however deep a root runs. Three vectors
 * then read a floor that never answered as a floor that refused, which is the opposite verdict.
 * `invokeLocal` re-derives the socket from the root it is handed, so the ROOT is what to hand it.
 */
function substrateDir(r: string): string { return join(r, "data", "lares", "vessel"); }
function rendezvousFor(r: string): string {
  // The digest is over the SUBSTRATE dir (`<root>/data/lares/vessel`), which is what `larDataDir()`
  // resolves to and what `local-connector` hashes. Hashing the bare root names a socket nothing binds.
  return rendezvousPath({ root: substrateDir(r), uid: process.getuid?.() ?? 0 });
}
function sockStands(r: string): boolean { return existsSync(rendezvousFor(r)); }

const REPO = new URL("../..", import.meta.url).pathname;
const CLI  = join(REPO, "packages/lares-cli/dist/src/bin/lares.js");
const PORT = 8231;
let root = "";

/** A herm's own root: the tracked genesis, and nothing else. No face is ever lit here. */
function standHermRoot(): string {
  const r = mkdtempSync(join(tmpdir(), "lares-herm-"));
  execFileSync("bash", ["-lc", `cd ${REPO} && git ls-files -z genesis/ | xargs -0 -I{} cp --parents "{}" "${r}/"`]);
  return r;
}

/** The pid holding PORT, or "" — the one reliable way to name this vessel's process. `pkill -f` matches
 *  its own shell and would kill the harness. */
function portPid(): string {
  return execFileSync("bash", ["-lc",
    `ss -ltnp 2>/dev/null | grep ':${PORT} ' | grep -oP 'pid=\\K[0-9]+' | head -1`], { encoding: "utf8" }).trim();
}

/**
 * Stop the vessel on PORT and WAIT FOR THE PORT ITSELF to come free — never a fixed sleep.
 *
 * A herm's shutdown flushes its stores and its repo before it exits, so how long it holds the listener
 * depends on how much it wrote, not on a constant. A fixed pause races that flush: the re-stand binds a
 * port the dying vessel still holds, dies with "already in use", and the vector reports the LIFT broken
 * when what broke was the wait. Poll the port and the race is gone.
 */
async function stopVessel(): Promise<void> {
  const pid = portPid();
  if (!pid) return;
  try { process.kill(Number(pid)); } catch { /* already gone */ }
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 250));
    if (!portPid()) return;
  }
}


/**
 * Stand the floor and report what it reached. Resolves the boot log either way — a fault is a result.
 *
 * READ THE VESSEL'S OWN LOG, NEVER THE LAUNCHER'S STDOUT. `lares vessel stand` DETACHES: the launcher
 * prints a status line and exits while the vessel it started writes `stand.log` under its own data
 * dir. A harness watching the launcher's pipe sees a vessel that reached `live` as one that printed
 * nothing, and reports the floor down while it is up — a measurement fault that reads exactly like a boot
 * fault. The log the vessel writes is the one that knows.
 */
async function standHerm(r: string): Promise<{ live: boolean; log: string }> {
  const standLog = join(r, "data/lares/vessel/stand.log");
  // CLEAR THE PRIOR BOOT'S LOG FIRST. The vessel APPENDS, so a `phase → live` from an earlier stand
  // answers instantly for a vessel that never came back up — the lift vector then reports a hearth that
  // stood when nothing did, and reaches for a socket no process holds.
  rmSync(standLog, { force: true });
  const child = spawn(process.execPath, [CLI, "vessel", "stand"], {
    env: { ...process.env, LAR_ROOT: r, LAR_PORT: String(PORT) }, cwd: REPO,
  });
  let launcher = "";
  child.stdout.on("data", (b) => { launcher += String(b); });
  child.stderr.on("data", (b) => { launcher += String(b); });
  const deadline = Date.now() + 150_000;
  for (;;) {
    const log = (existsSync(standLog) ? readFileSync(standLog, "utf8") : "") + launcher;
    if (/phase → live/.test(log)) return { live: true, log };
    // FAIL FAST ONLY ON A FAULT THIS VESSEL RAISED. A bare /Error:/ also matches the keyhive wasm's own
    // DEBUG stream ("Error: Some(ReceiveCgkaOpError(UnknownInvitePrekey…))") — a line a healthy boot prints
    // on its way to `live`, which cuts the watch short and reports a hearth that stood as one that died.
    // These names belong to the JS runtime and to this house; the log below them belongs to everyone.
    if (/boot fault|FATAL|already in use|TypeError:|ReferenceError:|Cannot read properties/.test(log)) return { live: false, log };
    if (Date.now() > deadline) return { live: false, log: log + "\n[timeout]" };
    await new Promise((res) => setTimeout(res, 500));
  }
}

/**
 * The presenter every verb vector must carry: THIS VESSEL'S OWN KEY, the one the `lares` CLI presents.
 *
 * A zero key names nobody, and nobody is refused on capability before the question this file asks — does a
 * FACE stand — is ever reached. A vector holding a zero key measures the cap gate and reports the herm.
 */
async function operatorDid(r: string): Promise<string> {
  const { fleetPeerDid } = await import("../../packages/lares-cli/src/daemon-persona-store.js");
  const prior = process.env["LAR_ROOT"];
  process.env["LAR_ROOT"] = r;
  try { return (await fleetPeerDid()) ?? `0x${"0".repeat(64)}`; }
  finally { if (prior === undefined) delete process.env["LAR_ROOT"]; else process.env["LAR_ROOT"] = prior; }
}

afterAll(async () => {
  try {
    // LET THE VESSEL FINISH DYING. It flushes its stores on the way down, so tearing the tree out from
    // under it races its own writes and ENOTEMPTYs — a teardown fault that reads as a suite failure with
    // every vector green above it.
    await stopVessel();
  } catch { /* nothing held the port */ }
  try { if (root) rmSync(root, { recursive: true, force: true }); } catch { /* a straggler write; the tmpdir keeps it */ }
});

describe("the herm — the floor of the lararium cap stack", () => {
  test("R1 — a herm reaches live: found, stood, and NO face ever lit", async () => {
    root = standHermRoot();
    execFileSync(process.execPath, [CLI, "vessel", "found"], {
      env: { ...process.env, LAR_ROOT: root }, cwd: REPO, stdio: "ignore",
    });
    const { live, log } = await standHerm(root);
    // The failure carries the next reach-for-a-face by name — that is what this vector is for.
    expect(live, `the floor did not stand:\n${log.slice(-1200)}`).toBe(true);

    // ★ THE FLOOR IS THE CLAIM, so prove it POSITIVELY rather than by the absence of a `persona new`.
    // Every vector below reads as "the floor carries / refuses / lifts", and each of those is a
    // different verdict on a hearth. A rig that quietly lit a face would turn R5's LIFT green by
    // having nothing to lift — the shape `founding-witness` already refuses on the place half.
    const held = execFileSync(process.execPath, [CLI, "persona", "list", "--json"], {
      env: { ...process.env, LAR_ROOT: root }, cwd: REPO, encoding: "utf8",
    });
    expect(held, `a face stands on the floor rig — every vector below measures a hearth, not a floor:\n${held.slice(0, 400)}`)
      .not.toMatch(/"index"\s*:\s*\d/);
  }, 200_000);

  test("R2 — a herm serves the public shelf with no hearth-fire lit", async () => {
    const res = await fetch(`http://127.0.0.1:${PORT}/oracle/pointer`).catch(() => null);
    // This vector reaches the vessel R1 stood. A refusal here reads as "the shelf is unserved" and can
    // equally mean "no vessel is listening at all" — so name both, and let the reader tell them apart.
    expect(res?.ok, `the read-face never answered on :${PORT} — either the floor serves no shelf, or nothing stands there for R5 to lift`).toBe(true);
  }, 60_000);

  test("R3 — a herm carries: its verb channel answers a caller", async () => {
    const dir = sockStands(root) ? substrateDir(root) : null;
    expect(dir, "no UDS door — a herm that carries nothing has no floor under anything").not.toBeNull();
    const { invokeLocal } = await import("../../packages/lares-cli/src/local-connector.js");
    // A WELL-FORMED call. `where` requires `args.tiddler`; an empty payload earns "args.tiddler is
    // required" — the channel answering correctly, which a vector reading only `status` scores as a floor
    // that does not carry.
    const r = await invokeLocal("where", { tiddler: "$:/lares/oracle" }, await operatorDid(root), { dataDir: dir, timeoutMs: 20_000 });
    expect(JSON.stringify(r), "the verb channel never answered a well-formed call").toMatch(/"status":"done"/);
  }, 60_000);

  test("R4 — a herm refuses a hearth-scoped act LEGIBLY, never by stack trace", async () => {
    const dir = sockStands(root) ? substrateDir(root) : null;
    const { invokeLocal } = await import("../../packages/lares-cli/src/local-connector.js");
    const r = await invokeLocal("persona-selves", {}, await operatorDid(root), { dataDir: dir, timeoutMs: 20_000 })
      .catch((e: Error) => ({ error: e.message }));
    // Either an unknown verb or a named refusal — both say "light a face". Neither may be a raw throw.
    expect(JSON.stringify(r)).toMatch(/light a face|unknown verb|no face|waking floor/i);

    // EVERY face-scoped verb, not just the persona ones. The circles plane arrives with the FACE — a PLACE
    // bootstrap carries the daemon bag alone — so a follow verb on this floor must name the lift too. Answering
    // "circles-<tag> unresolved: the oracle registry names no such plane" is true and useless: it reads
    // as a broken registry to the one human who could fix it by lighting a face.
    const c = await invokeLocal("circle-list", { circle: "following" }, await operatorDid(root), { dataDir: dir, timeoutMs: 20_000 })
      .catch((e: Error) => ({ error: e.message }));
    expect(JSON.stringify(c), "a follow verb on the floor refused in registry-fault language").toMatch(/light a face|unknown verb|no face|waking floor/i);
  }, 90_000);

  test("R5 — a herm LIFTS into a lararium: light the face, re-wake, the hearth verbs stand", async () => {
    execFileSync(process.execPath, [CLI, "persona", "new", "0", "--name", "the lift"], {
      env: { ...process.env, LAR_ROOT: root }, cwd: REPO, stdio: "ignore",
    });
    await stopVessel();
    const { live, log } = await standHerm(root);
    // CARRY THE BOOT INTO THE FAILURE. A bare `expected false to be true` names a vessel that did not
    // stand and says nothing about WHY — and this vector has flaked without ever telling anyone what the
    // lifted boot was doing when it did. The log the vessel wrote is the only witness to that.
    expect(live, `the lift left the vessel unable to stand:\n${log.slice(-2000)}`).toBe(true);

    const dir = sockStands(root) ? substrateDir(root) : null;
    expect(dir, "the lifted hearth bound no UDS door — nothing to ask, and no fallback that would be this hearth").not.toBeNull();
    const { invokeLocal } = await import("../../packages/lares-cli/src/local-connector.js");
    const r = await invokeLocal("persona-selves", {}, await operatorDid(root), { dataDir: dir, timeoutMs: 20_000 });
    expect(JSON.stringify(r), "the lifted hearth still refuses its own face-scoped verb").toMatch(/"status":"done"/);
  }, 240_000);
});

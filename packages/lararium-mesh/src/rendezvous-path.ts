/**
 * rendezvous-path — where a daemon and its clients meet, inside the budget the kernel sets.
 *
 * NODE-ONLY, AND REACHED BY SUBPATH ALONE (`@lararium/mesh/rendezvous-path`). This reads `node:crypto`
 * and the process uid, and a Unix-domain rendezvous names nothing a browser holds — so it stays OFF the
 * isomorphic barrel, which the browser vessel loads entire and would therefore breach at LOAD rather
 * than at call. The hull guard enforces this; it caught this module's first siting.
 *
 * ── A RENDEZVOUS IS NOT A RESIDENCE ──────────────────────────────────────────────────────────────────────
 * The data homes answer WHOSE IT IS: the spirits' substrate under `lares`, the house's shelf under
 * `lararium`, split so a wipe reaches exactly one and never the other. A socket answers a different
 * question — WHERE DO TWO PROCESSES MEET — and answers it under a hard limit the other question has never
 * heard of: `sockaddr_un.sun_path` caps near 104 bytes.
 *
 * Siting the socket beside the data made the second question inherit the first's depth. A root three
 * directories deeper than expected then takes the rendezvous down while everything else about the vessel
 * stands: measured as `listen EINVAL` on a scratch root, with the daemon serving throughout and the CLI
 * spending a 120-second deadline against a bind that had already refused.
 *
 * ── WHY NOT `$XDG_RUNTIME_DIR` — OPERATOR RULING, 2026-08-23 ─────────────────────────────────────────────
 * "Herms/larariums at all scales serve as civic infrastructure": a lararium daemon MUST survive its
 * operator logging out. `/run/user/$UID` is destroyed at logout by contract, so a rendezvous that must be
 * found alive tomorrow cannot live there — whatever its length advantage. The practice in the field splits
 * along precisely this axis rather than along modern-vs-legacy, and this house has answered it.
 *
 * ── WHY THE NAME DERIVES FROM THE ROOT ───────────────────────────────────────────────────────────────────
 * A shared short directory would be WORSE than a deep one: two throwaway roots would collide on a single
 * socket, and a rehearsal would reach the real machine's daemon while believing itself isolated — the exact
 * failure the mempalace installer already carries a warning about. Deriving the name from the root keeps
 * one root answering to one socket, and two roots never meeting.
 *
 * The derived name reads opaque, and that costs nothing a printed path does not repay: gpg answers the same
 * problem with `gpgconf --list-dirs` rather than a guessable name, and a resolved path a tool PRINTS beats
 * any naming scheme a human has to reconstruct.
 */

import { createHash } from "node:crypto";

/**
 * The bytes a Unix socket path may occupy.
 *
 * Platforms differ (Linux 108, macOS/BSD 104), so the smaller governs. The remainder past our own path is
 * deliberate headroom: lima reserves 25 characters because OpenSSH's ControlMaster appends 16 random bytes
 * to a socket name it is handed, and a budget that measured only its own path would underestimate by
 * exactly what somebody else appends.
 */
export const SUN_PATH_BUDGET = 104;

/** Whether a path fits — a READING, offered before anything binds rather than raised after. */
export function rendezvousFits(path: string): boolean {
  return Buffer.byteLength(path, "utf8") < SUN_PATH_BUDGET;
}

/**
 * Where this root's daemon and its clients meet.
 *
 * `/tmp/lares-<uid>/<root-digest>.sock` — the uid keeps two operators on one machine apart, the digest
 * keeps two roots apart, and the whole path stays a fixed 40 bytes however deep the root runs.
 *
 */
export function rendezvousPath(opts: { root: string; uid: number }): string {
  const digest = createHash("sha256").update(opts.root).digest("hex").slice(0, 12);
  return `/tmp/lares-${opts.uid}/${digest}.sock`;
}

/** The directory a rendezvous stands in — minted 0700, so presence itself gates who may reach it. */
export function rendezvousDir(uid: number): string {
  return `/tmp/lares-${uid}`;
}

/**
 * Where a standing vessel publishes WHAT IT STANDS AS, beside its own socket.
 *
 * A vessel decides its standing ONCE, at boot, from the face it finds. Without this a caller cannot
 * tell a live hearth from one still at the waking floor, and attaches to both alike — which leaves the
 * floor's own cure ("light a face, then stand again") naming an act that lifts nothing.
 *
 * {@link standingVerdict} reads this against the face on disk.
 *
 * Written AFTER the standing is real, never before: a marker that outlives what it names is the same
 * fault as a pointer that outlives its document.
 */
export function standingPath(opts: { root: string; uid: number }): string {
  return rendezvousPath(opts).replace(/\.sock$/, ".standing");
}

/** What a caller should do with a vessel that already answers. */
export interface StandingVerdict {
  readonly act: "attach" | "restand";
  /** Why — so a caller can say what it is about to do, and never act silently. */
  readonly reason: string;
}

/**
 * Read a running vessel's published standing against the face on disk.
 *
 * ABSENCE NEVER LICENSES A RESTART. Re-standing kills a live daemon, so every unknown — no marker, an
 * unreadable one, a writer that is gone — resolves to `attach`. Only a marker this process can read,
 * whose writer still runs, and which names a floor a face has since lifted, earns the other verdict.
 */
export function standingVerdict(args: {
  readonly marker:     string | null;
  readonly faceOnDisk: boolean;
  /** A vessel asked to stand faceless holds a CLASS, never a floor — its operator chose it. */
  readonly askedHerm?: boolean;
  /** Injected so a test can drive a writer that is gone without borrowing a real pid. */
  readonly alive?:     (pid: number) => boolean;
}): StandingVerdict {
  if (args.marker === null) {
    return { act: "attach", reason: "this vessel publishes no standing — unknown, so nothing is disturbed" };
  }
  let held: { standing?: unknown; faceLit?: unknown; pid?: unknown };
  try {
    held = JSON.parse(args.marker) as typeof held;
  } catch {
    return { act: "attach", reason: "the published standing reads unreadable — unknown, so nothing is disturbed" };
  }
  const pid = typeof held.pid === "number" ? held.pid : null;
  const alive = args.alive ?? ((p: number) => {
    // Signal 0 tests for a live process without touching it.
    try { process.kill(p, 0); return true; } catch { return false; }
  });
  if (pid === null || !alive(pid)) {
    return { act: "attach", reason: `the vessel that published this standing is gone (pid ${pid ?? "unnamed"})` };
  }
  if (args.askedHerm === true) {
    return { act: "attach", reason: "this vessel stands faceless by class, never by want of a face" };
  }
  if (held.standing === "herm" && held.faceLit !== true && args.faceOnDisk) {
    return { act: "restand", reason: "a face stands on disk that this vessel booted without — the floor lifts on a re-stand" };
  }
  return { act: "attach", reason: "the standing still reads as this vessel's own state implies" };
}

/**
 * Whether a published standing is this process's to remove.
 *
 * THE MARKER PATH DERIVES FROM THE ROOT, so two vessels standing at one root in sequence share a
 * single file. A departing daemon that deletes unconditionally removes whatever stands there — and a
 * successor that published while the old one was still shutting down loses its own standing to a
 * process that no longer describes it.
 *
 * Measured on the founding rehearsal: the outgoing daemon's exit handler fired after the incoming
 * one had published, the lift then read an absent standing, correctly declined to disturb an unknown
 * state, and left the vessel at the waking floor beneath a step reporting success.
 *
 * Only an exact pid match answers true. Absent, unreadable, and foreign all read false — a marker
 * this process cannot prove is its own stays where it is, because a wrong delete is the whole fault.
 */
export function markerIsOurs(marker: string | null, pid: number): boolean {
  if (marker === null) return false;
  try {
    const held = JSON.parse(marker) as { pid?: unknown };
    return typeof held.pid === "number" && held.pid === pid;
  } catch { return false; }
}

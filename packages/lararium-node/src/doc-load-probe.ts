/**
 * doc-load-probe (node) — the child_process implementation of the isomorphic
 * `DocLoadProbe` contract. It spawns the disposable boundary (`doc-load-probe-child`) to
 * materialize one doc, classifies how the child exited, and offers the
 * quarantine-not-delete recovery L2 (degraded boot) and L6 (doctor/repair) both call. It
 * runs the L5b framing gate FIRST: a torn framing gets caught cheaply, and only an
 * ambiguous-but-present doc pays the child-process round-trip.
 *
 * The classification carries the weight. A clean exit(0) reads `ok`. A catchable child
 * throw (exit 2, JSON reason) reads `load-error` — malformed, yet the runtime held. Any
 * OTHER exit — a signal, a non-zero-non-2 code, or a timeout kill — reads `aborted`: the
 * uncatchable WASM poison the whole design survives. `aborted` and `torn` (the pre-check
 * verdict) both condemn the doc; `load-error` condemns it too while staying distinct in
 * the ledger.
 */

import { spawn } from "node:child_process";
import { mkdirSync, renameSync, writeFileSync, existsSync } from "node:fs";
import { join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import {
  isCondemned,
  type DocLoadProbe,
  type ProbeOptions,
  type ProbeResult,
  type ProbeStatus,
  type QuarantineManifest,
  type StoreIntegrityReport,
} from "@lararium/mesh";
import { docStorePath, precheckDocStore } from "./store-integrity.js";

export { isCondemned };
export type { DocLoadProbe, ProbeOptions, ProbeResult, ProbeStatus };

const CHILD_URL = new URL("./doc-load-probe-child.js", import.meta.url);
const DEFAULT_TIMEOUT_MS = 30_000;

interface ChildLine {
  ok?: boolean;
  heads?: string[];
  chunks?: number;
  reason?: string;
  /** L3 --clean-tail: the torn tail files the child excluded from the clean prefix. */
  tornTail?: string[];
}

/** Build a ProbeResult, omitting undefined optionals (exactOptionalPropertyTypes). */
function result(
  documentId: string,
  status: ProbeStatus,
  extra: { heads?: readonly string[]; chunks?: number; reason?: string; integrity?: StoreIntegrityReport; cleanTail?: ProbeResult["cleanTail"] },
): ProbeResult {
  return {
    documentId,
    status,
    ...(extra.heads !== undefined ? { heads: extra.heads } : {}),
    ...(extra.chunks !== undefined ? { chunks: extra.chunks } : {}),
    ...(extra.reason !== undefined ? { reason: extra.reason } : {}),
    ...(extra.integrity !== undefined ? { integrity: extra.integrity } : {}),
    ...(extra.cleanTail !== undefined ? { cleanTail: extra.cleanTail } : {}),
  };
}

/**
 * Probe one doc for a safe load. Runs the cheap L5b framing gate first; a torn framing
 * condemns WITHOUT spawning (the abort gets prevented, not merely contained). An intact
 * framing still pays the isolated child load, because a chunk parses well yet may still
 * drive automerge's op-set index to overflow when the incrementals assemble.
 */
export async function probeDocLoad(
  storageDir: string,
  documentId: string,
  opts: ProbeOptions = {},
): Promise<ProbeResult> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  let integrity: StoreIntegrityReport | undefined;
  if (!opts.skipPrecheck) {
    integrity = precheckDocStore(storageDir, documentId);
    if (!integrity.ok) {
      return result(documentId, "torn", {
        chunks: integrity.snapshots + integrity.incrementals,
        reason: integrity.torn.map((t) => `${t.kind}: ${t.reason}`).join("; "),
        integrity,
      });
    }
  }

  const childPath = fileURLToPath(CHILD_URL);
  return await new Promise<ProbeResult>((resolve) => {
    const child = spawn(process.execPath, [childPath, storageDir, documentId], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    let err = "";
    let settled = false;
    const finish = (r: ProbeResult) => { if (!settled) { settled = true; resolve(r); } };

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish(result(documentId, "timeout", { reason: `load exceeded ${timeoutMs}ms`, ...(integrity ? { integrity } : {}) }));
    }, timeoutMs);
    timer.unref?.();

    child.stdout.on("data", (d) => { out += d.toString(); });
    child.stderr.on("data", (d) => { err += d.toString(); });

    child.on("error", (e) => {
      clearTimeout(timer);
      finish(result(documentId, "aborted", { reason: `spawn failed: ${e.message}`, ...(integrity ? { integrity } : {}) }));
    });

    child.on("close", (code, signal) => {
      clearTimeout(timer);
      if (settled) return; // the timeout path already fired
      let line: ChildLine | null = null;
      const trimmed = out.trim();
      if (trimmed) { try { line = JSON.parse(trimmed.split("\n").pop() ?? "{}"); } catch { line = null; } }

      if (code === 0 && line?.ok) {
        finish(result(documentId, "ok", { heads: line.heads ?? [], ...(line.chunks !== undefined ? { chunks: line.chunks } : {}), ...(integrity ? { integrity } : {}) }));
      } else if (code === 2 && line && line.ok === false) {
        finish(result(documentId, "load-error", { ...(line.chunks !== undefined ? { chunks: line.chunks } : {}), ...(line.reason !== undefined ? { reason: line.reason } : {}), ...(integrity ? { integrity } : {}) }));
      } else {
        // A signal, a non-zero-non-2 code, or no parseable line → the uncatchable abort.
        const how = signal ? `signal ${signal}` : `exit ${code}`;
        finish(result(documentId, "aborted", {
          reason: `WASM abort on load (${how})${err.trim() ? ` — ${err.trim().split("\n").pop()}` : ""}`,
          ...(integrity ? { integrity } : {}),
        }));
      }
    });
  });
}

/** The node child_process boundary, packaged as the isomorphic `DocLoadProbe`. */
export function makeChildProcessDocLoadProbe(storageDir: string): DocLoadProbe {
  return { probe: (documentId, o) => probeDocLoad(storageDir, documentId, o ?? {}) };
}

/**
 * Spawn the disposable child in --clean-tail mode. Returns its parsed line, or null on any
 * abort / timeout / non-parseable exit — recovery fails SAFE to null, and the caller
 * quarantines the whole doc as before. The child loads only framing-clean records, so this
 * spawn is abort-resistant; the child_process bulkhead still contains any residual poison.
 */
function runCleanTailChild(storageDir: string, documentId: string, timeoutMs: number): Promise<ChildLine | null> {
  const childPath = fileURLToPath(CHILD_URL);
  return new Promise<ChildLine | null>((resolve) => {
    const child = spawn(process.execPath, [childPath, storageDir, documentId, "--clean-tail"], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    let settled = false;
    const finish = (r: ChildLine | null) => { if (!settled) { settled = true; resolve(r); } };
    const timer = setTimeout(() => { child.kill("SIGKILL"); finish(null); }, timeoutMs);
    timer.unref?.();
    child.stdout.on("data", (d) => { out += d.toString(); });
    child.on("error", () => { clearTimeout(timer); finish(null); });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (settled || code !== 0) return finish(null);
      const trimmed = out.trim();
      if (!trimmed) return finish(null);
      try { finish(JSON.parse(trimmed.split("\n").pop() ?? "{}") as ChildLine); } catch { finish(null); }
    });
  });
}

/**
 * L3 — clean-tail recovery of a condemned doc. Verifies the doc's clean record-PREFIX loads
 * in the disposable boundary (the child gates each record through the L5b framing check and
 * loads only the clean ones), then MOVES the torn tail files aside — a rename into a dated
 * `quarantine-torn-tail-<day>/` folder, never a delete, so the poisoned records stay for
 * forensics. With the tail gone, the on-disk store equals the verified prefix and the plane
 * mounts writable (PROMOTED). Returns a `status:"ok"` verdict carrying the cleanTail summary,
 * or null when the base record is torn / the prefix rejects (unrecoverable → whole-doc
 * quarantine). Isomorphic peer to `quarantineDoc` — the node atom behind the mesh recipe hook.
 */
export async function recoverCleanTail(
  storageDir: string,
  condemned: ProbeResult,
  opts: ProbeOptions = {},
): Promise<ProbeResult | null> {
  const documentId = condemned.documentId;
  const line = await runCleanTailChild(storageDir, documentId, opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  if (!line || line.ok !== true || !Array.isArray(line.tornTail)) return null;

  const moved = moveTornTailAside(storageDir, documentId, line.tornTail);
  const kept = line.chunks ?? 0;
  return result(documentId, "ok", {
    heads: line.heads ?? [],
    chunks: kept,
    reason: `clean-tail: kept ${kept} record(s), moved ${moved.length} torn aside`,
    cleanTail: { kept, movedAside: moved },
  });
}

/**
 * Relocate a doc's torn tail files into a dated `quarantine-torn-tail-<day>/` folder beside
 * the store — a rename (never a delete), so the poisoned records survive for forensics while
 * the store keeps only the verified clean prefix. Returns the destination paths actually
 * moved. Idempotent-ish: a file already gone (moved by a prior pass) is skipped, and a name
 * collision suffixes. Pure fs — the tail-move actuator, testable without the spawned child.
 */
export function moveTornTailAside(storageDir: string, documentId: string, tornPaths: readonly string[]): string[] {
  const day = new Date().toISOString().slice(0, 10);
  const qroot = join(storageDir, `quarantine-torn-tail-${day}`);
  const moved: string[] = [];
  for (const src of tornPaths) {
    try {
      if (!existsSync(src)) continue;
      mkdirSync(qroot, { recursive: true });
      const flat = documentId.slice(0, 2) + "__" + documentId.slice(2) + "__" + basename(src);
      let dest = join(qroot, flat);
      let n = 1;
      while (existsSync(dest)) dest = join(qroot, `${flat}.${n++}`);
      renameSync(src, dest);
      moved.push(dest);
    } catch { /* a tail file that vanished mid-recovery is already gone — fine */ }
  }
  return moved;
}

/**
 * Quarantine a condemned doc — MOVE (never delete) its store dir into a dated quarantine
 * folder beside the store, with a manifest recording the verdict. The moved-aside bytes
 * stay for forensics (git fsck --lost-found discipline) and for L4 regenesis to reconcile
 * against. A second call for the same doc/day suffixes the destination.
 */
export function quarantineDoc(
  storageDir: string,
  probe: ProbeResult,
  quarantineDir?: string,
): string | null {
  const src = docStorePath(storageDir, probe.documentId);
  if (!existsSync(src)) return null;

  const day = new Date().toISOString().slice(0, 10);
  const qroot = quarantineDir ?? join(storageDir, `quarantine-torn-snapshots-${day}`);
  mkdirSync(qroot, { recursive: true });

  const flat = probe.documentId.slice(0, 2) + "__" + probe.documentId.slice(2);
  let dest = join(qroot, flat);
  let n = 1;
  while (existsSync(dest)) dest = join(qroot, `${flat}.${n++}`);

  renameSync(src, dest);
  const manifest: QuarantineManifest = {
    documentId: probe.documentId,
    status: probe.status,
    quarantinedAt: new Date().toISOString(),
    movedTo: dest,
    ...(probe.reason !== undefined ? { reason: probe.reason } : {}),
    ...(probe.chunks !== undefined ? { chunks: probe.chunks } : {}),
    ...(probe.integrity !== undefined ? { integrity: probe.integrity } : {}),
  };
  try {
    writeFileSync(join(qroot, `${flat}.manifest.json`), JSON.stringify(manifest, null, 2), "utf8");
  } catch { /* the manifest stays best-effort — the move carries the durable act */ }
  return dest;
}

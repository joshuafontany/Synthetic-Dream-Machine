/**
 * `lares pin <url> [--reason <text>]`
 * `lares unpin <url>`
 * `lares residency`
 *
 * Operator-driven residency control. Pin guarantees a bag stays hot;
 * unpin demotes (the LRU may then evict if pressure rises). residency
 * prints the current pinned / wela / anu snapshot.
 *
 * Phase 1 (C.1): instrumentation only — no eviction yet, so unpin is
 * essentially a no-op outside of stats reporting until C.2 lands.
 */

import { operatorDid } from "../env.js";
import { connectAdminVessel, submitVerb, summaryOutput } from "../admin-connector.js";
import type { ParsedArgs } from "../parse-args.js";

export async function cmdPin(args: ParsedArgs): Promise<number> {
  const url    = args.positional[0];
  const reason = args.options["reason"];
  if (!url) {
    console.error("usage: lares pin <bag-url> [--reason <text>]");
    return 2;
  }
  return await runResidencyCommand("pin", { url, ...(reason && { reason }) });
}

export async function cmdUnpin(args: ParsedArgs): Promise<number> {
  const url = args.positional[0];
  if (!url) {
    console.error("usage: lares unpin <bag-url>");
    return 2;
  }
  return await runResidencyCommand("unpin", { url });
}

/**
 * `lares register-cold <bag-url>` — mark a URL as known-but-not-loaded.
 * Oracle traversal calls this for URLs it discovers but doesn't need to
 * fetch yet. C.4 will wire hydrate-on-read so the first read through the
 * URL via composite triggers repo.find().
 */
export async function cmdRegisterCold(args: ParsedArgs): Promise<number> {
  const url = args.positional[0];
  if (!url) {
    console.error("usage: lares register-cold <bag-url>");
    return 2;
  }
  return await runResidencyCommand("register-cold", { url });
}

export async function cmdResidency(_args: ParsedArgs): Promise<number> {
  const vessel = await tryConnect();
  if (!vessel) return 3;
  try {
    const r = await submitVerb(vessel, "residency", {}, await operatorDid());
    if (r.status === "error") {
      console.error(`residency query failed: ${r.errorMessage ?? "unknown"}`);
      return 4;
    }
    const stats = summaryOutput(r) ?? {};
    const pinned = (stats["pinned"] ?? []) as string[];
    const wela   = (stats["wela"]   ?? []) as Array<{ url: string; lastTouched: number; syncActive?: boolean }>;
    const anuCount = stats["anuCount"] as number;
    const hotCap   = stats["hotCap"]   as number;

    console.log("");
    console.log(`pinned (${pinned.length}):`);
    for (const u of pinned) console.log(`  ${u}`);
    console.log("");
    console.log(`wela (${wela.length}/${hotCap}):`);
    for (const e of wela) {
      const age   = Date.now() - e.lastTouched;
      const human = age < 60_000 ? `${Math.round(age/1000)}s ago` : `${Math.round(age/60_000)}m ago`;
      const sync  = e.syncActive ? "  (syncing)" : "";
      console.log(`  ${e.url}  — touched ${human}${sync}`);
    }
    console.log("");
    console.log(`anu count: ${anuCount}`);
    console.log("");
    return 0;
  } finally {
    await vessel.disconnect();
  }
}

async function runResidencyCommand(name: string, args: Record<string, unknown>): Promise<number> {
  const vessel = await tryConnect();
  if (!vessel) return 3;
  try {
    const r = await submitVerb(vessel, name, args, await operatorDid());
    if (r.status === "error") {
      console.error(`${name} failed: ${r.errorMessage ?? "unknown"}`);
      return 4;
    }
    console.log(`${name}: ${JSON.stringify(summaryOutput(r) ?? {}, null, 2)}`);
    return 0;
  } finally {
    await vessel.disconnect();
  }
}

async function tryConnect() {
  try {
    return await connectAdminVessel({});
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`lares: ${msg}`);
    console.error("  Start the daemon with `lares serve` and try again.");
    return null;
  }
}

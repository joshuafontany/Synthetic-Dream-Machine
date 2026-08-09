/**
 * `lares regenesis` — CRDT-layer rebirth from bags/ (alpha ritual).
 *
 * SCOPE: the CRDT/wiki-bags layers + the CID'd genesis
 * blobs ONLY. The mempalace nuke-and-pave runs at its own cadence as the Sensorium
 * implementations refine — reach for `lares sense teardown --confirm` +
 * `lares sense pour --all` when that tide comes; this verb never touches the palace.
 *
 * A thin composer over the standing entities, ordered (invents nothing structural):
 *
 *   1. stop the incumbent  — port-control, graceful → force
 *   2. reset --force       — CRDT store + genesis artifacts + projection watermark
 *                            wiped; genesis re-baked; init re-founds (identity
 *                            preserved, `<data>/identity` out of every wipe)
 *   3. wake                — boot detached, vessel-ready attested from the log
 *   4. seed --apply        — plant every bags/@* holding back into the fresh docs;
 *                            the conductor OWNS the zero-new refusal here: right
 *                            after a reset the Synced tree MUST read virgin — a tree
 *                            with entries names a poisoned watermark, fail loud
 *
 * IDEMPOTENT from any prior state (running / stale / half-torn): every step is itself
 * idempotent, so a failed ceremony re-runs from the top and converges. Preview by
 * default; `--force` pulls the lever.
 */

import type { ParsedArgs } from "../parse-args.js";
import { larPort, larRoot, larIdentityDir } from "../env.js";
import { cmdReset } from "./scripted.js";
import { cmdWake } from "./wake.js";
import { seedRun, seedHolding, discoverHoldings } from "./seed.js";
import { cmdAct } from "./act.js";
import { isPersonaPlaneSlug } from "@lararium/mesh";

const STEPS = [
  "stop incumbent", "reset --force (store + genesis + projection watermark)",
  "wake (vessel-ready attested)", "seed --apply (zero-new wave = FAIL, post-reset law)",
] as const;

function step(n: number): string { return `[regenesis ${n + 1}/${STEPS.length}] ${STEPS[n]}`; }

/**
 * The bags a single-bag regenesis MUST NOT target — the social/registry plane the boot
 * contract stands on. `discoverHoldings` only ever returns `bags/@*` dirs (@daemon,
 * @identities, @persona, @groups, @sessions, @catalog/@oracle live on the social plane
 * with no `bags/` dir), so a name lookup already fences them out; this set is the
 * belt-and-braces refusal that names WHY, never the primary gate.
 */
const PROTECTED_BAGS = new Set([
  "@daemon", "@identities", "@persona", "@groups", "@sessions", "@catalog", "@oracle",
]);

/** A PersonaGroup plane answers to a DERIVED slug, so the refusal matches the family by shape — from
 *  `persona-scope`, the one place that rule lives, never a second spelling of it here. */
function isProtectedBag(slug: string): boolean {
  return PROTECTED_BAGS.has(slug) || isPersonaPlaneSlug(slug);
}

/** Resolve `--bag @slug` (or a full `bags/@slug` URI) to the discovered holding it names. */
function resolveHolding(
  bagArg: string,
  holdings: ReturnType<typeof discoverHoldings>,
): (typeof holdings)[number] | null {
  const slug = bagArg.startsWith("@") ? bagArg : (bagArg.replace(/\/+$/, "").split("/").pop() ?? bagArg);
  return holdings.find((h) => h.holding === slug || h.toBag === bagArg) ?? null;
}

/**
 * L4 — targeted single-bag regenesis: rebirth ONE bag's doc from its `bags/@slug` disk
 * canon WITHOUT a full-store wipe and WITHOUT stopping the vessel. The scalpel to
 * `regenesis`'s sledgehammer: it reaches @daemon / sibling bags / identity / genesis /
 * the mempalace NOT AT ALL. Three scoped steps, mirroring reset+seed for one holding:
 *
 *   1. CLEAR the bag doc   — daemon-side, cap-verified, tombstone-in-place (the doc
 *                            SURVIVES; no registry repoint, no fresh mint — the re-mint
 *                            path would rewrite the @catalog/@oracle pointer tiddler and
 *                            reach the boot contract, out of L4-v1 scope).
 *   2. clear the watermark — forget just this bag's projection observations (the CLI owns
 *                            the synced-tree), then ASSERT virgin per-bag (regenesis's
 *                            zero-check, scoped): a surviving watermark would read every
 *                            carrier "unchanged" and leave the cleared doc empty.
 *   3. re-seed one holding — the existing kind-routed seed primitive, this bag only.
 *
 * Preview by default; `--force` enacts — the same posture as the whole-store ritual.
 */
export async function cmdRegenesisBag(args: ParsedArgs, bagArg: string): Promise<number> {
  const holdings = discoverHoldings(larRoot());
  const h = resolveHolding(bagArg, holdings);
  if (!h) {
    console.error(`[regenesis --bag] "${bagArg}" names no @holding under ${larRoot()}/bags`);
    console.error(`  known: ${holdings.map((x) => x.holding).join(" · ") || "(none found)"}`);
    return 3;
  }
  if (isProtectedBag(h.holding)) {
    console.error(`[regenesis --bag] REFUSED: ${h.holding} rides the social/registry plane (the boot contract) — L4 targets bags/@* content bags only.`);
    return 2;
  }

  const scopedSteps = [
    "CLEAR the bag doc (act CLEAR — tombstone-in-place; the doc survives)",
    "clear the per-bag projection watermark (+ virgin assert)",
    `re-seed ${h.holding} from ${h.source} (kind-routed)`,
  ];

  if (!args.flags["force"]) {
    console.log(`lares regenesis --bag ${h.holding} — targeted single-bag rebirth (preview; pass --force to enact)`);
    for (let i = 0; i < scopedSteps.length; i++) console.log(`  [L4 ${i + 1}/${scopedSteps.length}] ${scopedSteps[i]}`);
    console.log(`  UNTOUCHED: @daemon · sibling bags (${holdings.filter((x) => x.holding !== h.holding).map((x) => x.holding).join(" · ") || "(none)"}) · ${larIdentityDir()} (keys) · genesis · the mempalace · the running vessel (never stopped)`);
    return 0;
  }

  // ── Enact — the vessel STAYS UP (no stop/wake): every gesture rides the live daemon sock ──

  // 1. CLEAR the bag doc (daemon-side, cap-verified). A daemon-unreachable / cap-denied
  //    fault surfaces through cmdAct's exit code — re-run once the fault clears (idempotent).
  console.log(`[L4 1/3] CLEAR ${h.toBag}`);
  const clearCode = await cmdAct({
    command: "act", positional: ["CLEAR"],
    options: { ...args.options, bag: h.toBag },
    flags: { ...args.flags, yes: true },
  });
  if (clearCode !== 0) { console.error("[regenesis --bag] CLEAR failed (daemon down? cap-denied?) — nothing re-seeded; re-run after the fault clears"); return clearCode; }

  // 2. Forget this bag's projection observations, then assert virgin for the bag. The
  //    CLI owns the synced-tree file; the vessel's projector reacts to the CLEAR by
  //    dropping the same keys, so this is a backstop + a fail-loud guard against a stale
  //    watermark that would silently starve the re-feed.
  console.log(`[L4 2/3] clear watermark for ${h.toBag}`);
  const { SyncedTree, larProjectionDir } = await import("@lararium/node");
  const { join } = await import("node:path");
  const tree = new SyncedTree(join(larProjectionDir(), "synced-tree.json"));
  const removed = tree.deleteBag(h.toBag);
  tree.flush();
  const residual = tree.countForBag(h.toBag);
  if (residual > 0) {
    console.error(`[regenesis --bag] REFUSED: ${residual} watermark entr(y/ies) for ${h.toBag} survived the clear — a stale watermark would starve the re-feed. Re-run (the projector settles), or clear projection/synced-tree.json.`);
    return 1;
  }
  console.log(`  forgot ${removed} carrier observation(s); the bag reads virgin`);

  // 3. Re-seed ONE holding — the shared kind-routed primitive, applied.
  console.log(`[L4 3/3] re-seed ${h.holding}`);
  const row = await seedHolding({ ...args, flags: { ...args.flags, apply: true, yes: true } }, h);
  if (row.exitCode !== 0) { console.error(`[regenesis --bag] re-seed ${h.holding} (${row.gesture}) → exit ${row.exitCode}; the doc may sit part-fed — re-run (idempotent)`); return 1; }

  console.log(`[regenesis --bag] ${h.holding} reborn from disk canon — @daemon, siblings, identity, genesis, the mempalace untouched. Witness: \`lares status\`, the bag through the wiki.`);
  return 0;
}

export async function cmdRegenesis(args: ParsedArgs): Promise<number> {
  // The scalpel forks off the sledgehammer on `--bag`: one holding, no stop, no store wipe.
  const bagArg = args.options["bag"];
  if (bagArg) return cmdRegenesisBag(args, bagArg);

  if (!args.flags["force"]) {
    console.log("lares regenesis — CRDT-layer rebirth from bags/ (preview; pass --force to enact)");
    for (let i = 0; i < STEPS.length; i++) console.log(`  ${step(i)}`);
    const holdings = discoverHoldings(larRoot());
    console.log(`  holdings to re-seed: ${holdings.map((h) => h.holding).join(" · ") || "(none found!)"}`);
    console.log(`  preserved: ${larIdentityDir()} (keys) · bags/ (read-only source) · the mempalace (its own cadence — palace-teardown + harvest --all)`);
    return 0;
  }

  const port = larPort();

  console.log(step(0));
  const { stopIncumbent } = await import("../port-control.js");
  const r = await stopIncumbent(port);
  console.log(r.stopped ? `  stopped incumbent on :${port} (${r.forced ? "forced" : "graceful"})` : `  :${port} already free`);

  console.log(step(1));
  const resetCode = await cmdReset({ ...args, flags: { ...args.flags, force: true } });
  if (resetCode !== 0) { console.error("[regenesis] reset failed — re-run after the fault clears"); return resetCode; }

  console.log(step(2));
  const wakeCode = await cmdWake({ ...args, positional: [], flags: { ...args.flags, force: false } });
  if (wakeCode !== 0) { console.error("[regenesis] wake did not attest vessel-ready — read the wake-serve.log, then re-run (the ceremony resumes idempotently)"); return wakeCode; }

  console.log(step(3));
  // The post-reset law, owned HERE (flow, not flag): the seeding must start from a
  // virgin Synced tree — reset wiped it; a tree with entries at this moment means a
  // stale watermark survived and would silently read every carrier "unchanged",
  // leaving the fresh docs empty. Fail loud before feeding.
  {
    const { existsSync, readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const { larProjectionDir } = await import("../env.js");
    const treePath = join(larProjectionDir(), "synced-tree.json");
    if (existsSync(treePath)) {
      let entries = 0;
      try { entries = Object.keys(JSON.parse(readFileSync(treePath, "utf8"))).length; } catch { /* corrupt = fresh-adoption, fine */ }
      if (entries > 0) {
        console.error(`[regenesis] REFUSED: ${treePath} holds ${entries} entries after reset — a stale projection watermark would poison the re-feed (every carrier reads "unchanged"). Remove it and re-run.`);
        return 1;
      }
    }
  }
  const ledger = await seedRun({ ...args, flags: { ...args.flags, apply: true, yes: true } });
  const failed = ledger.filter((h) => h.exitCode !== 0);
  for (const h of failed) console.error(`[regenesis] seed ${h.holding} (${h.gesture}) → exit ${h.exitCode}`);
  if (failed.length > 0) { console.error("[regenesis] seeding failed — the docs may sit part-fed; re-run seed/regenesis (idempotent)"); return 1; }

  console.log("[regenesis] rebirth complete — witness: `lares status`, one meme through the wiki, chunk census on the vessel store (larDataDir — <data>/vessel)");
  return 0;
}

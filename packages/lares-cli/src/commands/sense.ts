/**
 * `lares sense` — THE SENSORIUM'S DOOR: four universal verbs, the plane as a parameter.
 *
 *   lares sense search <query>   --lens content       # hybrid recall over a plane
 *   lares sense relate <entity>  --lens structure     # the plane's bitemporal KG
 *   lares sense structure <wing> --lens form          # the plane's entity-pair hallways
 *   lares sense status           --lens persistence   # wings · rooms · entities · total
 *
 * WHY FOUR VERBS AND NOT TWENTY. A verb multiplied per plane (`recall_content`, `recall_structure`,
 * `recall_form`, …) grows as 4 caps x N planes, and every new plane re-opens the whole surface. The lens
 * takes the plane instead, so the surface stays four verbs wide however many planes stand — and
 * `persistence` needs no new verb to come online, because a palace IS its composed caps.
 *
 * WHY THIS ROUTE AND NOT A DIRECT STORE OPEN. The palace serve-holders speak NDJSON on raw stdin, and a
 * per-palace flock makes a SECOND holder exit rather than pile up. So a process that opens a plane
 * directly cannot share the vessel's holder — it opens its own beside it, and N sessions become N
 * unsynchronized clients on one index. No lock cures that; only ONE OWNER does. Every verb here rides
 * the daemon's composed caps, and nothing behind it opens a store.
 */

import { openMemorySensorium, sensoriumLenses, sensoriumNames, sensoriumDir, memorySensoriumDir } from "@lararium/node";
import { emit, exitFor } from "../render.js";
import type { ParsedArgs } from "../parse-args.js";
import { cmdHarvest, cmdCapture, cmdSweep } from "./harvest.js";
import { cmdWorldline } from "./worldline.js";
import { cmdTelemetry } from "./telemetry.js";
import { cmdPalaceTeardown } from "./palace-teardown.js";
import { cmdRecall } from "./recall.js";
import { cmdRefresh } from "./refresh.js";
import { cmdFlow } from "./flow.js";
import { cmdMeta } from "./meta.js";
import { cmdRejim } from "./rejim.js";
import { cmdAnalyze } from "./analyze.js";
import { cmdKi } from "./ki.js";
import { cmdLi } from "./li.js";
import { cmdJing } from "./jing.js";
import { cmdCoupleR } from "./couple-r.js";
import { cmdPlaneRecord } from "./plane-record.js";
import { cmdForecast } from "./forecast.js";
import { cmdMismatch } from "./mismatch.js";
import { runQuiesce, runResume, runTopology, type DoorScope } from "./mempalace.js";
import {
  cmdSenseRoster, cmdSenseInspect, cmdSenseReconcile, cmdSenseBuild,
  cmdSensePromote, cmdSenseRetire, cmdSenseUnRetire, cmdSensePurge,
} from "./sense-lifecycle.js";
import { setupSensorium } from "../setup-sensorium.js";

/**
 * The SOVEREIGN door onto a sensorium island's lifecycle — the parallel of the guest
 * `lares mempalace` door, so `lares sense quiesce/resume/holders` control ONLY the
 * sovereign sensorium's holders, never the guest comparator. `sensorium-root` (threaded
 * by the addressing layer, default = the memory sensorium) is the scope holders must sit
 * under. Only the MEMORY sensorium owns the daemon-minting hook legs (they mint the
 * memory capture) and the shared hook marker; a NON-memory sensorium address scopes to
 * its own holders and leaves both the legs and the marker to memory.
 */
function senseDoor(args: ParsedArgs): DoorScope {
  const root = args.options["sensorium-root"] ?? memorySensoriumDir();
  const isMemory = root === memorySensoriumDir();
  return { scope: root, spawners: isMemory, manageHooks: isMemory, label: "lares sense" };
}

function cmdSenseQuiesce(args: ParsedArgs): Promise<number> {
  return runQuiesce(args, senseDoor(args), args.flags["hold"] === true);
}
function cmdSenseResume(args: ParsedArgs): number {
  return runResume(args, senseDoor(args));
}
function cmdSenseHolders(args: ParsedArgs): number {
  return runTopology(args, senseDoor(args), "holders");
}

const VERBS = ["search", "relate", "structure", "status"] as const;
type Verb = (typeof VERBS)[number];

/**
 * The SOVEREIGN sensorium's LIFECYCLE + verbatim verbs — the tend/write/read-verbatim half of the one
 * door, beside the four plane-READ verbs above. Each OWNS its handler outright — no top-level twin.
 * `sense` tends the sovereign lar_* planes; `mempalace` tends the guest comparator: one island per
 * namespace. `pour` = the sovereign harvest (content + planes + worldline in one pass), NOT the guest miner.
 * `recall` reads the verbatim drawers (the rich stamp-filter reader) over the SOVEREIGN content plane —
 * the SAME dir `sense search --lens content` opens (both derive memorySensoriumContentDir() through
 * mempalace-pool; the daemon recall verb NAMES it, never the guest). Guest-shaped recall output means a
 * stale daemon dist or a dirty sovereign store, never a wrong-store read.
 */
const LIFECYCLE: Readonly<Record<string, (a: ParsedArgs) => Promise<number> | number>> = {
  // `setup` STANDS the sovereign organs, and founding never reaches it (operator ruling, 2026-08-08).
  // A vessel founds and serves without a single sensorium, so standing one rides its own act — on the
  // door that already owns every other thing done to a sensorium. Folding it into `wake --install`
  // would make the memory tooling read as part of the base install.
  setup:     cmdSenseSetup,
  recall:    cmdRecall,
  refresh:   cmdRefresh,
  capture:   cmdCapture,
  pour:      cmdHarvest,
  sweep:     cmdSweep,       // the BULK backfill on the ONE spine — CLI twin of the MCP `sweep` tool
  teardown:  cmdPalaceTeardown,
  worldline: cmdWorldline,
  telemetry: cmdTelemetry,
  flow:      cmdFlow,
  meta:      cmdMeta,
  // The human-query INSTRUMENTS over the poured sensorium — rhythm (rejim), change-points (analyze), and
  // the Ki coupling verdict (ki/couple) and the Li gluing verdict (li/cohere) — the cosheaf ⊥ sheaf
  // dual. rejim + analyze read/compute; ki + li read TS-native (no daemon; the H¹ hull lives in @mesh).
  rejim:     cmdRejim,
  analyze:   cmdAnalyze,
  ki:        cmdKi,
  couple:    cmdKi,       // alias — the coupling verdict reads the same H¹ gate
  li:        cmdLi,
  cohere:    cmdLi,       // alias — the gluing verdict reads the li-radius + the same H¹ gate
  jing:      cmdJing,     // 勁 — the li∘ki square: does a child-host's grain round-trip with its flow?
  square:    cmdJing,     // alias — the joint read, neither li nor ki
  // The cross-plane witness — the last MCP tool that had no CLI door (surface-parity).
  "plane-record": cmdPlaneRecord,
  "couple-r": cmdCoupleR, // the R effective-TE coupling reference (coupling.R) — the py/R twin of ki, the
                          // machine-code plane behind the causal-island boundary; compare vs ki for a mismatch
  forecast:  cmdForecast, // the R early-warning plane (ews.R) — a critical-slowing-down bifurcation forecast
  mismatch:  cmdMismatch, // the ki↔R comparator — TS-hull Gaussian-CMI ⋈ R effective-TE, "is the coupling honest?"
  // Holder lifecycle — the SOVEREIGN parallel of `lares mempalace`, each door scoped to its own island.
  // `status` is already a plane-READ verb (the persistence lens), so the holder TOPOLOGY rides as `holders`.
  quiesce:   cmdSenseQuiesce,
  resume:    cmdSenseResume,
  holders:   cmdSenseHolders,
  // The DURABLE sensorium lifecycle door (E1.2·E2.*·E5) — run DIRECT over manifest.json (no store holder,
  // no daemon). Reads + the reversible re-settle run HOTL; promote/retire/purge seat HITL (need --approve,
  // the TS mirror of the approval cap). The MCP three-way mirror is a deferred ahead-of-surface allowance.
  roster:      cmdSenseRoster,
  inspect:     cmdSenseInspect,
  reconcile:   cmdSenseReconcile,
  build:       cmdSenseBuild,
  promote:     cmdSensePromote,
  retire:      cmdSenseRetire,
  "un-retire": cmdSenseUnRetire,
  purge:       cmdSensePurge,
};

export async function cmdSense(args: ParsedArgs): Promise<number> {
  // SENSORIUM ADDRESSING — `lares sense <sensorium> <verb>`: a leading KNOWN sensorium name (resolved
  // against the on-disk registry/manifest) selects the TARGET; the rest is the verb. `lares sense <verb>`
  // keeps the `memory` default. So `lares sense memory pour --all` addresses memory by manifest, and the
  // SAME door opens any stream sensorium (the root threads to the capture/refresh holder). Verb names and
  // sensorium names never collide, so a leading token resolves unambiguously.
  let positional = args.positional;
  let sensoriumRoot: string | undefined;
  const first = positional[0];
  if (first && LIFECYCLE[first] === undefined && !VERBS.includes(first as Verb) && sensoriumNames().includes(first)) {
    sensoriumRoot = sensoriumDir(first);
    positional = positional.slice(1);
  }
  // Thread the resolved root to the verb (absent → the verb keeps its memory default).
  const withRoot = (a: ParsedArgs): ParsedArgs =>
    sensoriumRoot ? { ...a, options: { ...a.options, "sensorium-root": sensoriumRoot } } : a;

  // A lifecycle verb tends the plane; drop it from the positional and hand the rest to its owner.
  const head = positional[0];
  const lifecycle = head ? LIFECYCLE[head] : undefined;
  if (lifecycle) {
    return await lifecycle(withRoot({ ...args, positional: positional.slice(1) }));
  }

  // `--key value` lands in `options`; `--key` alone lands in `flags`. The lens carries a VALUE.
  const [verb, ...rest] = positional;
  const lens = args.options["lens"] ?? "content";
  // `crossplane` is a search MODE, not a plane-dir (it widens content hits across form+structure by the
  // cid-join), so it rides the lens slot beside the real planes without a dir of its own.
  const known = [...Object.keys(sensoriumLenses()), "crossplane"];

  if (!verb || !VERBS.includes(verb as Verb)) {
    emit(args, {
      ok: false,
      error: { code: "usage", message: `name a verb: read (${VERBS.join(" · ")}) or lifecycle (${Object.keys(LIFECYCLE).join(" · ")})`,
               hint: `lares sense search "<query>" --lens <${known.join("|")}>` },
      human: () => {
        console.error("lares sense — the SOVEREIGN sensorium's one door (the guest lives at `lares mempalace`)\n");
        console.error("  read (plane as a parameter):");
        for (const v of VERBS) console.error(`    lares sense ${v.padEnd(10)} --lens <plane>`);
        console.error("\n  lifecycle (tend the planes):");
        for (const v of Object.keys(LIFECYCLE)) console.error(`    lares sense ${v}`);
        console.error(`\n  planes: ${known.join(" · ")}`);
      },
    });
    return exitFor("usage");
  }
  if (!known.includes(lens)) {
    emit(args, {
      ok: false,
      error: { code: "verb-error", message: `unknown lens '${lens}'`, hint: `planes: ${known.join(" · ")}` },
      human: () => console.error(`lares sense — no plane named '${lens}'. Planes: ${known.join(" · ")}`),
    });
    return exitFor("verb-error");
  }

  const q = openMemorySensorium();
  try {
    const arg = rest.join(" ").trim();
    const k = Number(args.options["k"] ?? 5);
    let data: unknown;
    switch (verb as Verb) {
      case "search": {
        if (!arg) throw new Error("search wants a query");
        // --not-root <handle> DROPS the caller's OWN session from recall (env LARES_SESSION_ROOT sets it
        // once, for a hook). Recall exists to fetch what the caller does NOT already hold, and a live
        // session's turns ARE its context: the capture engine files them as they happen, so on any question
        // about what was just discussed they outrank every older memory and crowd out the thing actually
        // reached for. Measured on this store, one session held 34% of the corpus and answered every query
        // in its own voice — which comes back FAST and CONFIDENT, and reads as health.
        const notRoot = args.options["not-root"] ?? process.env["LARES_SESSION_ROOT"];
        // --self-weight <0..1> DISCOUNTS the caller's own stream rather than cutting it. Default 0.25: a
        // same-session memory must be four times as relevant as a foreign one to outrank it — enough to
        // stop the live stream crowding recall out, and not so much that a COMPACTED early turn, which has
        // genuinely left the caller's window, gets thrown away with it.
        const selfWeight = args.options["self-weight"] !== undefined
          ? Number(args.options["self-weight"])
          : 0.25;
        data = await q.search(lens, arg, {
          k,
          ...(args.options["wing"] ? { wing: args.options["wing"] } : {}),
          ...(args.options["room"] ? { room: args.options["room"] } : {}),
          ...(notRoot ? { notRoot, selfWeight } : {}),
        });
        break;
      }
      case "relate":
        if (!arg) throw new Error("relate wants an entity");
        data = await q.relate(lens, arg, {
          ...(args.options["as-of"] ? { asOf: args.options["as-of"] } : {}),
        });
        break;
      case "structure":
        if (!arg) throw new Error("structure wants a wing");
        data = await q.structure(lens, arg, { minCount: Number(args.options["min-count"] ?? 2) });
        break;
      case "status":
        data = await q.status(lens);
        break;
    }
    emit(args, {
      ok: true,
      data: { lens, verb, result: data },
      human: () => {
        console.log(`lares sense ${verb} · lens ${lens}\n`);
        console.log(JSON.stringify(data, null, 1));
      },
    });
    return 0;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    emit(args, {
      ok: false,
      error: { code: "verb-error", message, hint: `is the plane populated? \`lares sense status --lens ${lens}\`` },
      human: () => console.error(`lares sense ${verb} --lens ${lens} — ${message}`),
    });
    return exitFor("verb-error");
  } finally {
    await q.close();
  }
}

/**
 * `lares sense setup` — stand the SOVEREIGN sensorium organs (content · structure · form · persistence ·
 * mesh), idempotently.
 *
 * SOVEREIGN ONLY, and the boundary is old: the guest `~/.mempalace` stands in its own lane, raised by a
 * deliberate act, because the boot must never write the comparator it measures against. What changed is
 * that FOUNDING no longer stands these either — a vessel founds and serves carrying no sensorium at all,
 * and the memory tooling arrives when the operator asks for it.
 *
 * The py organs import the mempalace library as code, so a machine wanting these wants
 * `lares mempalace install` first; this reports rather than assumes.
 */
function cmdSenseSetup(args: ParsedArgs): number {
  const steps = setupSensorium();
  const failed = steps.filter((s) => s.ran && !s.ok);
  emit(args, {
    ok: failed.length === 0,
    ...(failed.length > 0 ? { error: { code: "error", message: `${failed.length} organ(s) failed to stand` } } : {}),
    data: { steps },
    human: () => {
      console.log("sovereign sensorium organs");
      for (const s of steps) console.log(`  ${(s.ran ? (s.ok ? "ran" : "FAIL") : "skip").padEnd(6)} ${s.step}: ${s.detail}`);
      if (failed.length > 0) console.log("  the py organs import the mempalace library — try: lares mempalace install");
    },
  });
  return failed.length === 0 ? 0 : 1;
}

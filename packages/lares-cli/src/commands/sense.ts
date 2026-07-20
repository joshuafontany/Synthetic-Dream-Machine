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
 * the @daemon's composed caps, and nothing behind it opens a store.
 */

import { openMemorySensorium, sensoriumLenses, sensoriumNames, sensoriumDir } from "@lararium/node";
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

const VERBS = ["search", "relate", "structure", "status"] as const;
type Verb = (typeof VERBS)[number];

/**
 * The SOVEREIGN sensorium's LIFECYCLE + verbatim verbs — the tend/write/read-verbatim half of the one
 * door, beside the four plane-READ verbs above. Each OWNS its handler outright — no top-level twin.
 * `sense` tends the sovereign lar_* planes; `mempalace` tends the guest comparator: one island per
 * namespace. `pour` = the sovereign harvest (content + planes + worldline in one pass), NOT the guest miner.
 * `recall` reads the verbatim drawers (the rich stamp-filter reader) over the SOVEREIGN content plane —
 * the SAME dir `sense search --lens content` opens (both derive memorySensoriumContentDir() through
 * mempalace-pool; the @daemon recall verb NAMES it, never the guest). Guest-shaped recall output means a
 * stale daemon dist or a dirty sovereign store, never a wrong-store read.
 */
const LIFECYCLE: Readonly<Record<string, (a: ParsedArgs) => Promise<number> | number>> = {
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
  const known = Object.keys(sensoriumLenses());

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

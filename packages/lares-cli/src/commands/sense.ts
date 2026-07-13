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

import { openMemorySensorium, memorySensoriumLenses } from "@lararium/node";
import { emit, exitFor } from "../render.js";
import type { ParsedArgs } from "../parse-args.js";

const VERBS = ["search", "relate", "structure", "status"] as const;
type Verb = (typeof VERBS)[number];

export async function cmdSense(args: ParsedArgs): Promise<number> {
  // `--key value` lands in `options`; `--key` alone lands in `flags`. The lens carries a VALUE.
  const [verb, ...rest] = args.positional;
  const lens = args.options["lens"] ?? "content";
  const known = Object.keys(memorySensoriumLenses());

  if (!verb || !VERBS.includes(verb as Verb)) {
    emit(args, {
      ok: false,
      error: { code: "usage", message: `name a verb: ${VERBS.join(" · ")}`,
               hint: `lares sense search "<query>" --lens <${known.join("|")}>` },
      human: () => {
        console.error("lares sense — four verbs, the plane as a parameter\n");
        for (const v of VERBS) console.error(`  lares sense ${v.padEnd(10)} --lens <plane>`);
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
      case "search":
        if (!arg) throw new Error("search wants a query");
        data = await q.search(lens, arg, {
          k,
          ...(args.options["wing"] ? { wing: args.options["wing"] } : {}),
          ...(args.options["room"] ? { room: args.options["room"] } : {}),
        });
        break;
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

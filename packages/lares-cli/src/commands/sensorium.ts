/**
 * `lares sensorium` — the ephemeral astral MULTIPALACE (the `docker run --rm` of memory).
 *
 * A noun-verb tree over scratch mempalace instances under `<cache>/scratch/sensoriums/<id>/`: open a sensorium,
 * ingest a path, query it, then let it DISSOLVE — or retain it through `sensorium keep`. `run` is ephemeral-DEFAULT
 * (open → ingest → analyze → dissolve on exit, success OR error); the deep ingest (bands · structure
 * · form) is the documented S1–S3 seam, the lifecycle + store + commands are wired solid in S0.
 *
 * The lifecycle logic lives ONCE in @lararium/node (sense-sensorium.ts); this command is a thin
 * dispatch + render shim. The examples-first help strings here are the SINGLE SOURCE the design meme
 * mirrors (the heleuma docs⇄help drift gate reads this anchor).
 *
 * Meme: lar:///ha.ka.ba/lares/api/lares/sensorium
 */

import {
  runSensorium, openSensorium, querySensorium, listSensoria, keepSensorium,
  dissolveSensorium, dissolveAllSensoria, reapOrphans, listOrphans,
  acceptPetName, attachPetName, listPetNames, migrateManifest, proposePetName, sensoriumDir, sensoriumNames,
} from "@lararium/node";
import { emit } from "../render.js";
import { renderCommandHelp } from "../command-help.js";
import type { ParsedArgs } from "../parse-args.js";

/** `sensorium run <path> [-- <analysis>] [--keep] [--name <n>]` — ephemeral-default open/ingest/dissolve. */
async function runVerb(args: ParsedArgs): Promise<number> {
  const path = args.positional[1];
  if (!path) { console.error("usage: lares sensorium run <path> [-- <analysis>] [--keep]"); return 2; }
  const analysis = args.positional.slice(2).join(" ").trim() || undefined;
  const keep = args.flags["keep"] === true;
  const res = await runSensorium({ sourcePath: path, ...(args.options["name"] ? { name: args.options["name"] } : {}), ...(analysis ? { analysis } : {}), keep });
  emit(args, {
    ok: true,
    data: { mode: "run", ...res },
    human: () => {
      console.log(`lares sensorium run — ${res.dissolved ? "DISSOLVED on exit (--rm)" : "RETAINED"}`);
      console.log(`  id:        ${res.id}`);
      console.log(`  drawers:   ${res.drawers}${res.note ? `  (${res.note})` : ""}`);
      console.log(`  structure: ${res.structures} vector(s)`);
      console.log(`  bands:     ${res.bands} lar_ffz cell(s)`);
      console.log(`  form:      ${res.forms} construction(s)`);
      if (res.analysis) {
        console.log(`  analysis: ${res.analysis.hits.length} hit(s)${res.analysis.note ? `  (${res.analysis.note})` : ""}`);
        for (const h of res.analysis.hits.slice(0, 5)) console.log(`    · ${preview(h["text"])}`);
      }
      if (!res.dissolved) console.log(`\n  → query it:  lares sensorium query ${res.id} <keywords>`);
    },
  });
  return 0;
}

/** `sensorium open <path> [--name <n>]` — spin up + ingest, leave LIVE, print the sensorium id. */
function openVerb(args: ParsedArgs): number {
  const path = args.positional[1];
  if (!path) { console.error("usage: lares sensorium open <path> [--name <n>]"); return 2; }
  const { id, dir, manifest } = openSensorium({ sourcePath: path, ...(args.options["name"] ? { name: args.options["name"] } : {}) });
  emit(args, {
    ok: true,
    data: { mode: "open", id, dir, manifest },
    human: () => {
      console.log(`lares sensorium open — LIVE`);
      console.log(`  id:        ${id}`);
      console.log(`  name:      ${manifest.name}`);
      console.log(`  drawers:   ${manifest.drawers ?? 0}${manifest.note ? `  (${manifest.note})` : ""}`);
      console.log(`  structure: ${manifest.structures ?? 0} vector(s)`);
      console.log(`  bands:     ${manifest.bands ?? 0} lar_ffz cell(s)`);
      console.log(`  form:      ${manifest.forms ?? 0} construction(s)`);
      console.log(`\n  → query:    lares sensorium query ${id} <keywords>`);
      console.log(`  → dissolve: lares sensorium dissolve ${id}`);
    },
  });
  return 0;
}

/** `sensorium query <id> <kw...>` — search one live sensorium. */
async function queryVerb(args: ParsedArgs): Promise<number> {
  const id = args.positional[1];
  const kw = args.positional.slice(2).join(" ").trim();
  if (!id || !kw) { console.error("usage: lares sensorium query <id> <keywords...>"); return 2; }
  const res = await querySensorium(id, kw);
  emit(args, {
    ok: res.found,
    ...(res.found ? {} : { error: { code: "not-found", message: `no live sensorium "${id}"`, hint: "run `lares sensorium ls`" } }),
    data: { mode: "query", ...res },
    human: () => {
      if (!res.found) { console.error(`lares sensorium query: no live sensorium "${id}" — run \`lares sensorium ls\``); return; }
      console.log(`lares sensorium query ${id} — ${res.hits.length} hit(s)${res.note ? `  (${res.note})` : ""}`);
      for (const h of res.hits) console.log(`  · ${preview(h["text"])}`);
    },
  });
  return res.found ? 0 : 3;
}

/** `sensorium ls` — the live sensorium sensoria. */
function lsVerb(args: ParsedArgs): number {
  const rows = listSensoria();
  const orphans = listOrphans();
  emit(args, {
    ok: true,
    data: { mode: "ls", corpora: rows, orphans: orphans.length },
    human: () => {
      if (!rows.length) { console.log("lares sensorium ls — (no live sensoria)"); }
      else {
        console.log(`lares sensorium ls — ${rows.length} live`);
        for (const m of rows) console.log(`  ${m.id}  ${m.ephemeral ? "[ephemeral]" : "[durable]  "}  ${m.name}  (${m.drawers ?? 0} drawers)`);
      }
      if (orphans.length) console.log(`\n  ⚠ ${orphans.length} leaked scratch — reap with: lares sensorium dissolve --orphans`);
    },
  });
  return 0;
}

/** `sensorium dissolve <id|--all|--orphans>` — idempotent removal (already-gone = ok). */
function dissolveVerb(args: ParsedArgs): number {
  if (args.flags["orphans"] === true) {
    const reaped = reapOrphans();
    emit(args, { ok: true, data: { mode: "dissolve", scope: "orphans", reaped: reaped.length }, human: () => console.log(`lares sensorium dissolve --orphans — reaped ${reaped.length} leaked scratch instance(s)`) });
    return 0;
  }
  if (args.flags["all"] === true) {
    const ids = dissolveAllSensoria();
    emit(args, { ok: true, data: { mode: "dissolve", scope: "all", dissolved: ids }, human: () => console.log(`lares sensorium dissolve --all — dissolved ${ids.length} sensorium instance(s)`) });
    return 0;
  }
  const id = args.positional[1];
  if (!id) { console.error("usage: lares sensorium dissolve <id> | --all | --orphans"); return 2; }
  const res = dissolveSensorium(id);
  // Idempotent: an already-gone instance is a no-op success (ok:true).
  emit(args, {
    ok: true,
    data: { mode: "dissolve", scope: "one", ...res },
    human: () => console.log(res.existed ? `lares sensorium dissolve — ${id} dissolved` : `lares sensorium dissolve — ${id} already gone (no-op)`),
  });
  return 0;
}

/** One-line preview of a hit body. */
function preview(text: unknown, n = 160): string {
  if (typeof text !== "string") return "";
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > n ? flat.slice(0, n) + "…" : flat;
}

function rootFor(name: string): string | null {
  return sensoriumNames().includes(name) ? sensoriumDir(name) : null;
}

function keepVerb(args: ParsedArgs): number {
  const id = args.positional[1];
  if (!id) { console.error("usage: lares sensorium keep <id>"); return 2; }
  const result = keepSensorium(id);
  emit(args, { ok: result.existed, data: { mode: "keep", ...result }, human: () => console.log(result.existed ? `lares sensorium keep — ${id} is now retained` : `lares sensorium keep: no live sensorium "${id}"`) });
  return result.existed ? 0 : 3;
}

function nameVerb(args: ParsedArgs): number {
  const [sensorium, subject, ...label] = args.positional.slice(1);
  const root = sensorium ? rootFor(sensorium) : null;
  if (!root || !subject || !label.length) { console.error("usage: lares sensorium name <sensorium> <subject> <label...>"); return 2; }
  const entry = attachPetName(root, { subject, label: label.join(" ") });
  emit(args, { ok: true, data: { entry }, human: () => console.log(`lares sensorium name — ${entry.label} ↦ ${entry.subject}`) });
  return 0;
}

function proposeNameVerb(args: ParsedArgs): number {
  const [sensorium, subject, ...label] = args.positional.slice(1);
  const root = sensorium ? rootFor(sensorium) : null;
  const projection = typeof args.options["projection"] === "string" ? args.options["projection"] : "";
  const evidence = typeof args.options["evidence"] === "string" ? args.options["evidence"].split(",").filter(Boolean) : [];
  if (!root || !subject || !label.length || !projection) { console.error("usage: lares sensorium propose-name <sensorium> <subject> <label...> --projection <handle> [--evidence ref,ref]"); return 2; }
  const entry = proposePetName(root, { subject, label: label.join(" "), projection, evidence });
  emit(args, { ok: true, data: { entry }, human: () => console.log(`lares sensorium propose-name — ${entry.label} awaits acceptance (${entry.id})`) });
  return 0;
}

function namesVerb(args: ParsedArgs): number {
  const root = args.positional[1] ? rootFor(args.positional[1]) : null;
  if (!root) { console.error("usage: lares sensorium names <sensorium>"); return 2; }
  const entries = listPetNames(root);
  emit(args, { ok: true, data: { names: entries }, human: () => entries.length ? entries.forEach((entry) => console.log(`${entry.id}  [${entry.status}]  ${entry.subject}  ${entry.label}`)) : console.log("lares sensorium names — (none)") });
  return 0;
}

function acceptNameVerb(args: ParsedArgs): number {
  const [sensorium, id] = args.positional.slice(1);
  const root = sensorium ? rootFor(sensorium) : null;
  if (!root || !id) { console.error("usage: lares sensorium accept-name <sensorium> <proposal-id>"); return 2; }
  const entry = acceptPetName(root, id);
  emit(args, { ok: entry !== null, data: { entry }, human: () => console.log(entry ? `lares sensorium accept-name — ${entry.label}` : `lares sensorium accept-name: no proposal "${id}"`) });
  return entry ? 0 : 3;
}

function migrateVerb(args: ParsedArgs): number {
  const name = args.positional[1];
  const root = name ? rootFor(name) : null;
  if (!root) { console.error("usage: lares sensorium migrate <sensorium>"); return 2; }
  const manifest = migrateManifest(root);
  emit(args, { ok: manifest !== null, data: { manifest }, human: () => console.log(manifest ? `lares sensorium migrate — ${name} stands at schema ${manifest.schema}` : `lares sensorium migrate: no manifest for "${name}"`) });
  return manifest ? 0 : 3;
}

export async function cmdSensorium(args: ParsedArgs): Promise<number> {
  const sub = args.positional[0];
  if (!sub || sub === "help" || args.flags["help"]) { renderCommandHelp("sensorium"); return sub ? 0 : 1; }
  switch (sub) {
    case "run":      return await runVerb(args);
    case "open":     return openVerb(args);
    case "query":    return await queryVerb(args);
    case "ls":       return lsVerb(args);
    case "keep":     return keepVerb(args);
    case "dissolve": return dissolveVerb(args);
    case "name": return nameVerb(args);
    case "propose-name": return proposeNameVerb(args);
    case "names": return namesVerb(args);
    case "accept-name": return acceptNameVerb(args);
    case "migrate": return migrateVerb(args);
    default:
      console.error(`lares sensorium: unknown subcommand "${sub}".  Run \`lares sensorium help\`.`);
      return 2;
  }
}

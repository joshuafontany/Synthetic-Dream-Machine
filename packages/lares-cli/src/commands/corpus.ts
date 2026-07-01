/**
 * `lares corpus` — the ephemeral astral MULTIPALACE (the `docker run --rm` of memory).
 *
 * A noun-verb tree over scratch mempalace instances under `~/.lares/.corpus/<id>/`: open a corpus,
 * ingest a path, query it, then let it DISSOLVE — or `keep` it durable. `run` is ephemeral-DEFAULT
 * (open → ingest → analyze → dissolve on exit, success OR error); the deep ingest (bands · structure
 * · form) is the documented S1–S3 seam, the lifecycle + store + commands are wired solid in S0.
 *
 * The lifecycle logic lives ONCE in @lararium/node (corpus-palace.ts); this command is a thin
 * dispatch + render shim. The examples-first help strings here are the SINGLE SOURCE the design meme
 * mirrors (the heleuma docs⇄help drift gate reads this anchor).
 *
 * Meme: lar:///ha.ka.ba/@lares/api/lares/corpus
 */

import {
  runCorpus, openCorpus, queryCorpus, listCorpora, keepCorpus,
  dissolveCorpus, dissolveAll, reapOrphans, listOrphans,
} from "@lararium/node";
import { emit } from "../render.js";
import { renderCommandHelp } from "../command-help.js";
import type { ParsedArgs } from "../parse-args.js";

/** `corpus run <path> [-- <analysis>] [--keep] [--name <n>]` — ephemeral-default open/ingest/dissolve. */
async function runVerb(args: ParsedArgs): Promise<number> {
  const path = args.positional[1];
  if (!path) { console.error("usage: lares corpus run <path> [-- <analysis>] [--keep]"); return 2; }
  const analysis = args.positional.slice(2).join(" ").trim() || undefined;
  const keep = args.flags["keep"] === true;
  const res = await runCorpus({ sourcePath: path, ...(args.options["name"] ? { name: args.options["name"] } : {}), ...(analysis ? { analysis } : {}), keep });
  emit(args, {
    ok: true,
    data: { mode: "run", ...res },
    human: () => {
      console.log(`lares corpus run — ${res.dissolved ? "DISSOLVED on exit (--rm)" : "KEPT (durable)"}`);
      console.log(`  id:        ${res.id}`);
      console.log(`  drawers:   ${res.drawers}${res.note ? `  (${res.note})` : ""}`);
      console.log(`  structure: ${res.structures} vector(s)`);
      if (res.analysis) {
        console.log(`  analysis: ${res.analysis.hits.length} hit(s)${res.analysis.note ? `  (${res.analysis.note})` : ""}`);
        for (const h of res.analysis.hits.slice(0, 5)) console.log(`    · ${preview(h["text"])}`);
      }
      if (!res.dissolved) console.log(`\n  → query it:  lares corpus query ${res.id} <keywords>`);
    },
  });
  return 0;
}

/** `corpus open <path> [--name <n>]` — spin up + ingest, leave LIVE, print the corpus-id. */
function openVerb(args: ParsedArgs): number {
  const path = args.positional[1];
  if (!path) { console.error("usage: lares corpus open <path> [--name <n>]"); return 2; }
  const { id, dir, manifest } = openCorpus({ sourcePath: path, ...(args.options["name"] ? { name: args.options["name"] } : {}) });
  emit(args, {
    ok: true,
    data: { mode: "open", id, dir, manifest },
    human: () => {
      console.log(`lares corpus open — LIVE`);
      console.log(`  id:        ${id}`);
      console.log(`  name:      ${manifest.name}`);
      console.log(`  drawers:   ${manifest.drawers ?? 0}${manifest.note ? `  (${manifest.note})` : ""}`);
      console.log(`  structure: ${manifest.structures ?? 0} vector(s)`);
      console.log(`\n  → query:    lares corpus query ${id} <keywords>`);
      console.log(`  → dissolve: lares corpus dissolve ${id}`);
    },
  });
  return 0;
}

/** `corpus query <id> <kw...>` — search one live corpus. */
async function queryVerb(args: ParsedArgs): Promise<number> {
  const id = args.positional[1];
  const kw = args.positional.slice(2).join(" ").trim();
  if (!id || !kw) { console.error("usage: lares corpus query <id> <keywords...>"); return 2; }
  const res = await queryCorpus(id, kw);
  emit(args, {
    ok: res.found,
    ...(res.found ? {} : { error: { code: "not-found", message: `no live corpus "${id}"`, hint: "run `lares corpus ls`" } }),
    data: { mode: "query", ...res },
    human: () => {
      if (!res.found) { console.error(`lares corpus query: no live corpus "${id}" — run \`lares corpus ls\``); return; }
      console.log(`lares corpus query ${id} — ${res.hits.length} hit(s)${res.note ? `  (${res.note})` : ""}`);
      for (const h of res.hits) console.log(`  · ${preview(h["text"])}`);
    },
  });
  return res.found ? 0 : 3;
}

/** `corpus ls` — the live corpus-palaces. */
function lsVerb(args: ParsedArgs): number {
  const rows = listCorpora();
  const orphans = listOrphans();
  emit(args, {
    ok: true,
    data: { mode: "ls", corpora: rows, orphans: orphans.length },
    human: () => {
      if (!rows.length) { console.log("lares corpus ls — (no live corpora)"); }
      else {
        console.log(`lares corpus ls — ${rows.length} live`);
        for (const m of rows) console.log(`  ${m.id}  ${m.ephemeral ? "[ephemeral]" : "[durable]  "}  ${m.name}  (${m.drawers ?? 0} drawers)`);
      }
      if (orphans.length) console.log(`\n  ⚠ ${orphans.length} leaked scratch — reap with: lares corpus dissolve --orphans`);
    },
  });
  return 0;
}

/** `corpus keep <id>` — promote an ephemeral corpus to durable. */
function keepVerb(args: ParsedArgs): number {
  const id = args.positional[1];
  if (!id) { console.error("usage: lares corpus keep <id>"); return 2; }
  const res = keepCorpus(id);
  emit(args, {
    ok: res.existed,
    ...(res.existed ? {} : { error: { code: "not-found", message: `no corpus "${id}"` } }),
    data: { mode: "keep", ...res },
    human: () => console.log(res.existed ? `lares corpus keep — ${id} is now durable` : `lares corpus keep: no corpus "${id}"`),
  });
  return res.existed ? 0 : 3;
}

/** `corpus dissolve <id|--all|--orphans>` — idempotent removal (already-gone = ok). */
function dissolveVerb(args: ParsedArgs): number {
  if (args.flags["orphans"] === true) {
    const reaped = reapOrphans();
    emit(args, { ok: true, data: { mode: "dissolve", scope: "orphans", reaped: reaped.length }, human: () => console.log(`lares corpus dissolve --orphans — reaped ${reaped.length} leaked scratch instance(s)`) });
    return 0;
  }
  if (args.flags["all"] === true) {
    const ids = dissolveAll();
    emit(args, { ok: true, data: { mode: "dissolve", scope: "all", dissolved: ids }, human: () => console.log(`lares corpus dissolve --all — dissolved ${ids.length} corpus instance(s)`) });
    return 0;
  }
  const id = args.positional[1];
  if (!id) { console.error("usage: lares corpus dissolve <id> | --all | --orphans"); return 2; }
  const res = dissolveCorpus(id);
  // Idempotent: an already-gone instance is a no-op success (ok:true).
  emit(args, {
    ok: true,
    data: { mode: "dissolve", scope: "one", ...res },
    human: () => console.log(res.existed ? `lares corpus dissolve — ${id} dissolved` : `lares corpus dissolve — ${id} already gone (no-op)`),
  });
  return 0;
}

/** One-line preview of a hit body. */
function preview(text: unknown, n = 160): string {
  if (typeof text !== "string") return "";
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > n ? flat.slice(0, n) + "…" : flat;
}

export async function cmdCorpus(args: ParsedArgs): Promise<number> {
  const sub = args.positional[0];
  if (!sub || sub === "help" || args.flags["help"]) { renderCommandHelp("corpus"); return sub ? 0 : 1; }
  switch (sub) {
    case "run":      return await runVerb(args);
    case "open":     return openVerb(args);
    case "query":    return await queryVerb(args);
    case "ls":       return lsVerb(args);
    case "keep":     return keepVerb(args);
    case "dissolve": return dissolveVerb(args);
    default:
      console.error(`lares corpus: unknown subcommand "${sub}".  Run \`lares corpus help\`.`);
      return 2;
  }
}

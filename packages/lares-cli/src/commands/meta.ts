/**
 * `lares sense meta` — VIEW and TUNE the sensorium's ingest meta-schema: which annotator capabilities
 * the meta-model composes (entities · hall · room) and the room topic taxonomy the `room` cap scores
 * against.
 *
 * CLI-LOCAL by design. It reads and writes `<config-home>/meta.json` directly — the SAME file
 * `meta_io.py` reads — and routes through no daemon, opens no store, takes no lock (a JSON file is not
 * a palace, so the single-owner law does not bind it). That keeps the whole CLI↔MCP↔VM verb-isomorphism
 * untouched: `meta` rides as a `sense` sub-verb, so `COMMAND_NAMES` never moves and the parity fixture
 * never regenerates. The wiki-native authoring surface lands later atop this same file.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from "node:fs";
import { join } from "node:path";
import { larConfigHome } from "@lararium/node";
import { emit, exitFor } from "../render.js";
import type { ParsedArgs } from "../parse-args.js";

const KNOWN_ANNOTATORS = ["entities", "hall", "room"] as const;

// The full set the memory sensorium composes; a restricted sensorium narrows it.
const SEED_ANNOTATORS: readonly string[] = ["entities", "hall", "room"];

// The seed room taxonomy — a MIRROR of the proven convo topic-detector (mempalace convo_miner's
// TOPIC_KEYWORDS), the operator's editable starting point. `sense meta seed` materializes it; edits
// diverge from here. A reference table, not live logic — meta_io.py owns the runtime scoring.
const SEED_ROOM_TAXONOMY: Readonly<Record<string, string[]>> = {
  technical: ["code", "python", "function", "bug", "error", "api", "database", "server", "deploy", "git", "test", "debug", "refactor"],
  architecture: ["architecture", "design", "pattern", "structure", "schema", "interface", "module", "component", "service", "layer"],
  planning: ["plan", "roadmap", "milestone", "deadline", "priority", "sprint", "backlog", "scope", "requirement", "spec"],
  decisions: ["decided", "chose", "picked", "switched", "migrated", "replaced", "trade-off", "alternative", "option", "approach"],
  problems: ["problem", "issue", "broken", "failed", "crash", "stuck", "workaround", "fix", "solved", "resolved"],
};

interface MetaSchema {
  annotators?: string[];
  room_taxonomy?: Record<string, string[]>;
}

function metaPath(): string {
  return join(larConfigHome(), "meta.json");
}

function readSchema(): MetaSchema {
  const p = metaPath();
  if (!existsSync(p)) return {};
  try {
    const parsed: unknown = JSON.parse(readFileSync(p, "utf8"));
    return parsed && typeof parsed === "object" ? (parsed as MetaSchema) : {};
  } catch {
    return {}; // a hand-broken file reads as "no overrides" — the seed carries, never a crash
  }
}

function writeSchema(schema: MetaSchema): void {
  mkdirSync(larConfigHome(), { recursive: true });
  const p = metaPath();
  const tmp = `${p}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(schema, null, 2)}\n`, "utf8");
  renameSync(tmp, p); // atomic swap — a torn read never sees half a schema
}

function hasList<T>(v: T[] | undefined): v is T[] {
  return Array.isArray(v) && v.length > 0;
}
function hasMap(v: Record<string, string[]> | undefined): v is Record<string, string[]> {
  return !!v && Object.keys(v).length > 0;
}

/** The effective schema the holder would apply — overrides where present, else the seed. */
function effective(schema: MetaSchema) {
  return {
    annotators: hasList(schema.annotators) ? schema.annotators : [...SEED_ANNOTATORS],
    room_taxonomy: hasMap(schema.room_taxonomy) ? schema.room_taxonomy : SEED_ROOM_TAXONOMY,
    seeded: { annotators: !hasList(schema.annotators), taxonomy: !hasMap(schema.room_taxonomy) },
  };
}

/** The taxonomy a room-* edit starts from — the operator's own if present, else a copy of the seed. */
function baseTaxonomy(schema: MetaSchema): Record<string, string[]> {
  return hasMap(schema.room_taxonomy) ? { ...schema.room_taxonomy } : { ...SEED_ROOM_TAXONOMY };
}

function usage(args: ParsedArgs, message: string, hint: string): number {
  emit(args, { ok: false, error: { code: "usage", message, hint }, human: () => console.error(`lares sense meta — ${message}\n  ${hint}`) });
  return exitFor("usage");
}

export async function cmdMeta(args: ParsedArgs): Promise<number> {
  const sub = args.positional[0] ?? "show";
  const schema = readSchema();

  if (sub === "show") {
    const eff = effective(schema);
    emit(args, {
      ok: true,
      data: { path: metaPath(), ...eff },
      human: () => {
        console.log(`lares sense meta — the ingest meta-schema (${metaPath()})\n`);
        console.log(`  annotators:  ${eff.annotators.join(" · ")}${eff.seeded.annotators ? "   (seed — the full set)" : ""}`);
        console.log(`  room taxonomy${eff.seeded.taxonomy ? " (seed — edit to override)" : ""}:`);
        for (const [room, kws] of Object.entries(eff.room_taxonomy)) {
          console.log(`    ${room.padEnd(14)} ${kws.slice(0, 6).join(", ")}${kws.length > 6 ? " …" : ""}`);
        }
        console.log(`\n  tune:  annotators <csv> · room-add <topic> <kw,..> · room-rm <topic> · seed`);
      },
    });
    return 0;
  }

  if (sub === "seed") {
    writeSchema({ annotators: [...SEED_ANNOTATORS], room_taxonomy: { ...SEED_ROOM_TAXONOMY } });
    emit(args, { ok: true, data: { path: metaPath(), seeded: true, rooms: Object.keys(SEED_ROOM_TAXONOMY) },
      human: () => console.log(`lares sense meta — seed materialized to ${metaPath()}  (edit it, or use annotators / room-add / room-rm)`) });
    return 0;
  }

  if (sub === "annotators") {
    const csv = args.positional[1];
    if (!csv) {
      const eff = effective(schema);
      emit(args, { ok: true, data: { annotators: eff.annotators, seeded: eff.seeded.annotators }, human: () => console.log(`annotators: ${eff.annotators.join(" · ")}`) });
      return 0;
    }
    const names = csv.split(",").map((s) => s.trim()).filter(Boolean);
    const unknown = names.filter((n) => !(KNOWN_ANNOTATORS as readonly string[]).includes(n));
    if (unknown.length) return usage(args, `unknown annotator(s): ${unknown.join(", ")}`, `known: ${KNOWN_ANNOTATORS.join(" · ")}`);
    if (!names.length) return usage(args, "annotators wants at least one name", `known: ${KNOWN_ANNOTATORS.join(" · ")}`);
    writeSchema({ ...schema, annotators: names });
    emit(args, { ok: true, data: { annotators: names }, human: () => console.log(`annotators set: ${names.join(" · ")}`) });
    return 0;
  }

  if (sub === "room-add") {
    const topic = args.positional[1];
    const kws = (args.positional[2] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    if (!topic || !kws.length) return usage(args, "room-add wants <topic> <kw,kw,...>", "e.g. lares sense meta room-add liturgy shrine,incense,libation");
    const next = { ...baseTaxonomy(schema), [topic]: kws };
    writeSchema({ ...schema, room_taxonomy: next });
    emit(args, { ok: true, data: { room: topic, keywords: kws, rooms: Object.keys(next) },
      human: () => console.log(`room '${topic}' set (${kws.length} keywords) · taxonomy: ${Object.keys(next).join(" · ")}`) });
    return 0;
  }

  if (sub === "room-rm") {
    const topic = args.positional[1];
    if (!topic) return usage(args, "room-rm wants <topic>", "e.g. lares sense meta room-rm planning");
    const base = baseTaxonomy(schema);
    if (!(topic in base)) return usage(args, `no room '${topic}'`, `rooms: ${Object.keys(base).join(" · ")}`);
    delete base[topic];
    writeSchema({ ...schema, room_taxonomy: base });
    emit(args, { ok: true, data: { removed: topic, rooms: Object.keys(base) },
      human: () => console.log(`room '${topic}' removed · taxonomy: ${Object.keys(base).join(" · ")}`) });
    return 0;
  }

  return usage(args, `unknown sub-verb '${sub}'`, "show · seed · annotators <csv> · room-add <topic> <kw,..> · room-rm <topic>");
}

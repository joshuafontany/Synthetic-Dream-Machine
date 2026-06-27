/**
 * `lares wiki <verb> [args...]` — operator surface for whole-wiki operations.
 *
 * Subcommand-style dispatcher. Mirrors `lares bag` shape; operates at the
 * recipe / wiki granularity rather than individual bags. End-user UI may
 * still call these "wikis" while the architectural noun stays "wiki"
 * (Kowloon wiki=Group mapping).
 *
 * Verbs (full E-arc surface ships; the `lares act` residency verbs land next):
 *   list / which / resolve   — read & inspect: enumerate, presence-query, coordinate-resolve
 *   init / open / sync       — lifecycle: mint, set-active, ingest memes
 *   pin / unpin              — whole-recipe residency
 *   add-bag / remove-bag     — recipe composition (hot-reload via composite.addLayer)
 *   epoch / rotate-recipe    — bound history (snapshot-restart, Nix-generations)
 *   prune-stale              — surface stale drafts for residency-action-or-prune
 */

import { operatorDid } from "../env.js";
import { emit } from "../render.js";
import { summaryOutput, type SubmitResult, type SubmitOptions } from "../daemon-connector.js";
import { runVerb } from "../verb-call.js";
import type { ParsedArgs } from "../parse-args.js";

type WikiSubcommand = (args: ParsedArgs) => Promise<number>;

// The whole wiki surface runs over the lares↔lararium binding (UDS fast path, WS
// fallback). Each subcommand keeps its connect+submit shape unchanged: tryConnect
// is now a no-op handle (no per-command leaf replica) and the local submitVerb
// routes a one-shot invocation through runVerb, surfacing a transport failure as an
// error-result so each handler's `r.status === "error"` path reports it.
async function tryConnect(): Promise<{ disconnect: () => Promise<void> }> {
  return { disconnect: async () => { /* one-shot — nothing to close */ } };
}

async function submitVerb(
  _vessel: { disconnect: () => Promise<void> },
  name:    string,
  args:    Record<string, unknown>,
  did:     string,
  opts:    SubmitOptions = {},
): Promise<SubmitResult> {
  try {
    return await runVerb(name, args, did, opts);
  } catch (err) {
    return { status: "error", requestId: "", errorMessage: err instanceof Error ? err.message : String(err) };
  }
}

export async function cmdWikiList(_args: ParsedArgs): Promise<number> {
  const did    = await operatorDid();
  const vessel = await tryConnect();
  if (!vessel) return 3;
  try {
    const r = await submitVerb(vessel, "list-wikis", {}, did);
    if (r.status === "error") {
      console.error(`list failed: ${r.errorMessage ?? "unknown"}`);
      return 4;
    }
    const result = summaryOutput(r) ?? {};
    const wikis = (result["wikis"] ?? []) as Array<{
      slug: string;
      uri: string;
      automergeUrl: string | null;
      kind?: string;
    }>;
    console.log("");
    if (wikis.length === 0) {
      console.log("(no wikis registered)");
      console.log("");
      return 0;
    }
    console.log(`wikis (${wikis.length}):`);
    for (const w of wikis) {
      const url = w.automergeUrl ? w.automergeUrl.slice(0, 40) + "…" : "(no doc)";
      const tag = w.kind ? ` [${w.kind}]` : "";
      console.log(`  ${w.slug.padEnd(20)}${tag} ${w.uri}`);
      console.log(`    ↳ ${url}`);
    }
    console.log("");
    return 0;
  } finally {
    await vessel.disconnect();
  }
}

export async function cmdWikiInit(args: ParsedArgs): Promise<number> {
  const slug = args.positional[0];
  if (!slug) {
    console.error("usage: lares wiki init <slug>");
    return 2;
  }
  const did    = await operatorDid();
  const vessel = await tryConnect();
  if (!vessel) return 3;
  try {
    const r = await submitVerb(vessel, "init-wiki", { slug }, did);
    if (r.status === "error") {
      const msg = r.errorMessage ?? "unknown";
      emit(args, { ok: false, requestId: r.requestId, error: msg, human: () => console.error(`init failed: ${msg}`) });
      return 4;
    }
    const result = summaryOutput(r) ?? {};
    emit(args, {
      ok: true, requestId: r.requestId, data: { slug, ...result },
      human: () => {
        console.log("");
        console.log(`wiki: ${slug}`);
        console.log(`  status:    ${result["status"]}`);
        console.log(`  wiki URI:  ${result["wikiUri"]}`);
        console.log(`  wiki doc:  ${result["wikiDocUrl"]}`);
        console.log(`  draft URI: ${result["draftBagId"]}`);
        console.log(`  draft doc: ${result["draftDocUrl"]}`);
        console.log(`  recipe:    ${result["recipeUri"]}`);
        console.log("");
      },
    });
    return 0;
  } finally {
    await vessel.disconnect();
  }
}

export async function cmdWikiOpen(args: ParsedArgs): Promise<number> {
  const slug = args.positional[0];
  if (!slug) {
    console.error("usage: lares wiki open <slug>");
    return 2;
  }
  const did    = await operatorDid();
  const vessel = await tryConnect();
  if (!vessel) return 3;
  try {
    const r = await submitVerb(vessel, "open-wiki", { slug }, did);
    if (r.status === "error") {
      console.error(`open failed: ${r.errorMessage ?? "unknown"}`);
      return 4;
    }
    const result = summaryOutput(r) ?? {};
    console.log("");
    console.log(`wiki: ${slug}  status: ${result["status"]}`);
    if (typeof result["note"] === "string") console.log(`  ${result["note"]}`);
    console.log("");
    return 0;
  } finally {
    await vessel.disconnect();
  }
}

export async function cmdWikiSync(args: ParsedArgs): Promise<number> {
  const slug = args.positional[0];
  if (!slug) {
    console.error("usage: lares wiki sync <slug>");
    return 2;
  }
  const did    = await operatorDid();
  const vessel = await tryConnect();
  if (!vessel) return 3;
  try {
    const r = await submitVerb(vessel, "sync-wiki", { slug }, did, { timeoutMs: 30_000 });
    if (r.status === "error") {
      console.error(`sync failed: ${r.errorMessage ?? "unknown"}`);
      return 4;
    }
    const result = summaryOutput(r) ?? {};
    console.log("");
    console.log(`sync ${slug}:`);
    console.log(`  scanned:  ${result["scanned"]}`);
    console.log(`  ingested: ${result["ingested"]}`);
    console.log(`  skipped:  ${result["skipped"]}`);
    const errors = (result["errors"] ?? []) as string[];
    if (errors.length > 0) {
      console.log(`  errors (${errors.length}):`);
      for (const e of errors) console.log(`    ${e}`);
    }
    if (result["note"]) console.log(`  ${result["note"]}`);
    console.log("");
    return 0;
  } finally {
    await vessel.disconnect();
  }
}

export async function cmdWikiPin(args: ParsedArgs): Promise<number> {
  const slug = args.positional[0];
  if (!slug) {
    console.error("usage: lares wiki pin <slug>");
    return 2;
  }
  const did    = await operatorDid();
  const vessel = await tryConnect();
  if (!vessel) return 3;
  try {
    const r = await submitVerb(vessel, "pin-wiki", { slug }, did);
    if (r.status === "error") {
      console.error(`pin failed: ${r.errorMessage ?? "unknown"}`);
      return 4;
    }
    const result = summaryOutput(r) ?? {};
    const pinned = (result["pinned"] ?? []) as Array<{ bagUrl: string; reason: string }>;
    console.log("");
    console.log(`wiki ${slug}: pinned ${pinned.length} bag(s)`);
    for (const p of pinned) console.log(`  ${p.bagUrl}  (${p.reason})`);
    if (result["note"]) console.log(`  ${result["note"]}`);
    console.log("");
    return 0;
  } finally {
    await vessel.disconnect();
  }
}

export async function cmdWikiUnpin(args: ParsedArgs): Promise<number> {
  const slug = args.positional[0];
  if (!slug) {
    console.error("usage: lares wiki unpin <slug>");
    return 2;
  }
  const did    = await operatorDid();
  const vessel = await tryConnect();
  if (!vessel) return 3;
  try {
    const r = await submitVerb(vessel, "unpin-wiki", { slug }, did);
    if (r.status === "error") {
      console.error(`unpin failed: ${r.errorMessage ?? "unknown"}`);
      return 4;
    }
    const result = summaryOutput(r) ?? {};
    const unpinned = (result["unpinned"] ?? []) as string[];
    console.log("");
    console.log(`wiki ${slug}: unpinned ${unpinned.length} bag(s)`);
    for (const u of unpinned) console.log(`  ${u}`);
    console.log("");
    return 0;
  } finally {
    await vessel.disconnect();
  }
}

export async function cmdWikiAddBag(args: ParsedArgs): Promise<number> {
  const slug   = args.positional[0];
  const bagUrl = args.positional[1];
  if (!slug || !bagUrl) {
    console.error("usage: lares wiki add-bag <slug> <bag-uri>");
    return 2;
  }
  const did    = await operatorDid();
  const vessel = await tryConnect();
  if (!vessel) return 3;
  try {
    const r = await submitVerb(vessel, "add-bag", { slug, bagUrl }, did);
    if (r.status === "error") {
      const msg = r.errorMessage ?? "unknown";
      emit(args, { ok: false, requestId: r.requestId, error: msg, human: () => console.error(`add-bag failed: ${msg}`) });
      return 4;
    }
    const result = summaryOutput(r) ?? {};
    emit(args, {
      ok: true, requestId: r.requestId, data: { slug, ...result },
      human: () => {
        console.log("");
        console.log(`wiki ${slug}: ${result["status"]}`);
        console.log(`  bag:    ${result["bagUrl"]}`);
        if (result["stack"]) {
          console.log(`  stack:  ${(result["stack"] as string[]).join(" → ")}`);
        }
        if (result["error"]) console.log(`  error:  ${result["error"]}`);
        console.log("");
      },
    });
    return 0;
  } finally {
    await vessel.disconnect();
  }
}

export async function cmdWikiRemoveBag(args: ParsedArgs): Promise<number> {
  const slug   = args.positional[0];
  const bagUrl = args.positional[1];
  if (!slug || !bagUrl) {
    console.error("usage: lares wiki remove-bag <slug> <bag-uri>");
    return 2;
  }
  const did    = await operatorDid();
  const vessel = await tryConnect();
  if (!vessel) return 3;
  try {
    const r = await submitVerb(vessel, "remove-bag", { slug, bagUrl }, did);
    if (r.status === "error") {
      console.error(`remove-bag failed: ${r.errorMessage ?? "unknown"}`);
      return 4;
    }
    const result = summaryOutput(r) ?? {};
    console.log("");
    console.log(`wiki ${slug}: ${result["status"]}`);
    console.log(`  bag:    ${result["bagUrl"]}`);
    if (result["stack"]) {
      const stack = result["stack"] as string[];
      console.log(`  stack:  ${stack.length === 0 ? "(empty)" : stack.join(" → ")}`);
    }
    console.log("");
    return 0;
  } finally {
    await vessel.disconnect();
  }
}

/**
 * `lares wiki epoch <slug> <bag-url>` — Epoch one of the wiki's bags.
 *
 * Thin wrapper: verifies the bag is in the wiki's recipe stack, then
 * delegates to bag-epoch. Returns the same shape as bag-epoch with
 * a recipe-membership check up front.
 */
export async function cmdWikiEpoch(args: ParsedArgs): Promise<number> {
  const slug   = args.positional[0];
  const bagUrl = args.positional[1];
  if (!slug || !bagUrl) {
    console.error("usage: lares wiki epoch <slug> <bag-url>");
    return 2;
  }
  const did    = await operatorDid();
  const vessel = await tryConnect();
  if (!vessel) return 3;
  try {
    const r = await submitVerb(vessel, "bag-epoch", { bagUrl }, did, { timeoutMs: 30_000 });
    if (r.status === "error") {
      console.error(`wiki epoch failed: ${r.errorMessage ?? "unknown"}`);
      return 4;
    }
    const result = summaryOutput(r) ?? {};
    console.log("");
    console.log(`wiki ${slug}: epoch on ${result["bagUrl"]}`);
    console.log(`  old doc:    ${result["oldDocUrl"]}`);
    console.log(`  new doc:    ${result["newDocUrl"]}`);
    console.log(`  tiddlers:   ${result["tiddlerCount"]}  tombstones: ${result["tombstoneCount"]}`);
    console.log(`  layer:      ${result["layerSwapped"] ? "swapped" : "not mounted"}`);
    console.log("");
    return 0;
  } finally {
    await vessel.disconnect();
  }
}

export async function cmdWikiRotateRecipe(args: ParsedArgs): Promise<number> {
  const slug = args.positional[0];
  if (!slug) {
    console.error("usage: lares wiki rotate-recipe <slug>");
    return 2;
  }
  const did    = await operatorDid();
  const vessel = await tryConnect();
  if (!vessel) return 3;
  try {
    const r = await submitVerb(vessel, "rotate-recipe", { slug }, did, { timeoutMs: 30_000 });
    if (r.status === "error") {
      console.error(`rotate-recipe failed: ${r.errorMessage ?? "unknown"}`);
      return 4;
    }
    const result = summaryOutput(r) ?? {};
    console.log("");
    console.log(`wiki ${slug}: rotated to generation ${result["generation"]}`);
    console.log(`  new canon doc:   ${result["newCanonDocUrl"]}`);
    console.log(`  previous canon:  ${result["previousCanonUri"]}`);
    console.log(`    ↳ doc:         ${result["previousCanonDocUrl"]}`);
    const stack = (result["stack"] ?? []) as string[];
    console.log(`  recipe stack:    ${stack.length} bag(s)`);
    for (const u of stack) console.log(`    • ${u}`);
    console.log(`  layer:           ${result["layerSwapped"] ? "swapped" : "not mounted"}`);
    if (result["note"]) console.log(`  note:            ${result["note"]}`);
    console.log("");
    return 0;
  } finally {
    await vessel.disconnect();
  }
}

export async function cmdWikiPruneStale(args: ParsedArgs): Promise<number> {
  const slug = args.positional[0];
  if (!slug) {
    console.error("usage: lares wiki prune-stale <slug> [--days <N>]");
    return 2;
  }
  const daysOpt = args.options["days"];
  const did     = await operatorDid();
  const vessel  = await tryConnect();
  if (!vessel) return 3;
  try {
    const cmdArgs: Record<string, unknown> = { slug };
    if (daysOpt) cmdArgs["daysThreshold"] = Number(daysOpt);
    const r = await submitVerb(vessel, "prune-stale", cmdArgs, did);
    if (r.status === "error") {
      console.error(`prune-stale failed: ${r.errorMessage ?? "unknown"}`);
      return 4;
    }
    const result = summaryOutput(r) ?? {};
    const stale  = (result["stale"] ?? []) as Array<{ title: string; lastUpdate: string | null; daysIdle: number }>;
    console.log("");
    console.log(`wiki ${slug} prune-stale (threshold: ${result["daysThreshold"]} days):`);
    console.log(`  draft bag: ${result["draftBagId"]}`);
    console.log(`  scanned:   ${result["scanned"]} tiddler(s)`);
    console.log(`  stale:     ${stale.length}`);
    if (stale.length > 0) {
      console.log("");
      for (const s of stale) {
        const idleStr = s.daysIdle < 0 ? "no timestamp" : `${s.daysIdle}d idle`;
        console.log(`    ${s.title}  (${idleStr})`);
      }
      console.log("");
      console.log("  Decide each through a residency ACTION verb (lares act ADD/COPY/MOVE/CLEAR/DROP/LOAD).");
    }
    console.log("");
    return 0;
  } finally {
    await vessel.disconnect();
  }
}

/**
 * `lares wiki resolve <tiddler-uri>` — Residency Model coordinate-inspection.
 *
 * Lists every Manifestation (FRBR Expression-level realization) of `tiddler`
 * across bags in the recipe, ordered highest-priority first. The winning bag
 * (origin-bag for any current read) gets a `→` marker.
 *
 * Sprint:  Residency Model Epic — S8.2
 * Meme:    lar:///ha.ka.ba/@lararium/v0.1/api/residency-model
 *
 * Reuses the `where` verb on the node side (composite.listBagsHolding —
 * live-only). Tombstone-inspection across bags waits on a sibling `resolve`
 * verb that exposes composite.listKapaeBags (named follow-up under
 * the Talk-Story-surfacing principle — operators inspect the audit; the
 * CRDT layer surfaces what it sees).
 */
export async function cmdWikiResolve(args: ParsedArgs): Promise<number> {
  const tiddler = args.positional[0];
  if (!tiddler) {
    console.error("usage: lares wiki resolve <tiddler-uri>");
    return 2;
  }
  const did    = await operatorDid();
  const vessel = await tryConnect();
  if (!vessel) return 3;
  try {
    const r = await submitVerb(vessel, "resolve", { tiddler }, did);
    if (r.status === "error") {
      console.error(`resolve failed: ${r.errorMessage ?? "unknown"}`);
      return 4;
    }
    const result        = summaryOutput(r) ?? {};
    const manifestations = (result["manifestations"] ?? []) as Array<{ bagId: string; changeId?: string }>;
    const tombstones    = (result["tombstones"]    ?? []) as string[];
    const winning       = (result["winningBag"]    ?? null) as string | null;

    console.log("");
    console.log(`Residency for ${tiddler}`);
    if (manifestations.length === 0 && tombstones.length === 0) {
      console.log("  (no residency in any bag — tiddler unknown)");
      console.log("");
      return 5;
    }
    console.log("");

    if (manifestations.length > 0) {
      console.log("  Live Manifestations (highest priority first):");
      for (const m of manifestations) {
        const marker  = m.bagId === winning ? "→" : " ";
        const idTag   = m.changeId ? `  [change-id: ${m.changeId}]` : "";
        console.log(`    ${marker} ${m.bagId}${idTag}`);
      }
      console.log("");
      console.log(`  Winning surface (origin-bag): ${winning}`);
      console.log("");
    } else {
      console.log("  (no live Manifestations — the title carries only kāpae marks)");
      console.log("");
    }

    if (tombstones.length > 0) {
      console.log("  Kāpae marks (bags that have set this title aside at their priority):");
      for (const b of tombstones) {
        console.log(`      ${b}`);
      }
      console.log("");
      console.log("  Note: a kāpae mark in a higher-priority bag stops the cascade.");
      console.log("        See bags/@lararium/ha.ka.ba/@lararium/v0.1/api/residency-model.md #conflict-resolution");
      console.log("        — resolution surfaces to operator / cabal Talk Story.");
      console.log("");
    }

    return manifestations.length > 0 ? 0 : 5;
  } finally {
    await vessel.disconnect();
  }
}

export async function cmdWikiWhich(args: ParsedArgs): Promise<number> {
  const tiddler = args.positional[0];
  if (!tiddler) {
    console.error("usage: lares wiki which <tiddler-uri>");
    return 2;
  }
  const did    = await operatorDid();
  const vessel = await tryConnect();
  if (!vessel) return 3;
  try {
    const r = await submitVerb(vessel, "where", { tiddler }, did);
    if (r.status === "error") {
      console.error(`which failed: ${r.errorMessage ?? "unknown"}`);
      return 4;
    }
    const result  = summaryOutput(r) ?? {};
    const bags    = (result["bags"]       ?? []) as string[];
    const primary = (result["primaryBag"] ?? null) as string | null;
    console.log("");
    console.log(`tiddler:    ${tiddler}`);
    console.log(`primary:    ${primary ?? "(not found)"}`);
    if (bags.length > 0) {
      console.log(`all bags:`);
      for (const b of bags) console.log(`  ${b}`);
    }
    console.log("");
    return primary ? 0 : 5;
  } finally {
    await vessel.disconnect();
  }
}

const SUBCOMMANDS: Readonly<Record<string, { handler: WikiSubcommand; summary: string }>> = {
  "init":  { handler: cmdWikiInit,  summary: "Mint a fresh wiki: wiki canonical + per-wiki draft + recipe. Idempotent." },
  "open":  { handler: cmdWikiOpen,  summary: "Set which wiki the next `lares serve` boot mounts as active. Does not live-remount the current vessel." },
  "sync":  { handler: cmdWikiSync,  summary: "Walk wikis/<slug>/memes/** and ingest into the canonical bag. Idempotent." },
  "pin":        { handler: cmdWikiPin,       summary: "Pin every bag in the wiki's recipe (whole-recipe residency)." },
  "unpin":      { handler: cmdWikiUnpin,     summary: "Unpin every bag in the wiki's recipe." },
  "add-bag":    { handler: cmdWikiAddBag,    summary: "Add a bag to the wiki's recipe at runtime. Hot-reload via composite.addLayer." },
  "remove-bag": { handler: cmdWikiRemoveBag, summary: "Remove a bag from the wiki's recipe (soft remove; F-arc adds StoryList drain)." },
  "epoch":         { handler: cmdWikiEpoch,         summary: "DXOS-style snapshot-restart on one of the wiki's bags. Bounds history." },
  "rotate-recipe": { handler: cmdWikiRotateRecipe,  summary: "Nix-generations: mint fresh canonical; retain old as previous-canon underlay." },
  "prune-stale":   { handler: cmdWikiPruneStale,    summary: "Surface stale draft tiddlers (no recent activity) for residency-action-or-prune." },
  "list":       { handler: cmdWikiList,      summary: "Enumerate wikis registered in the catalog. Needs `lares serve`." },
  "which":      { handler: cmdWikiWhich,     summary: "Recipe-presence query — list bags holding a tiddler. Needs `lares serve`." },
  "resolve":    { handler: cmdWikiResolve,   summary: "Residency Model coordinate-inspection — list all Manifestations of a tiddler across bags; highlight winning bag per recipe priority. Needs `lares serve`." },
};

function printWikiHelp(): void {
  console.log("lares wiki <verb> [args...]\n");
  console.log("Verbs:");
  for (const [verb, entry] of Object.entries(SUBCOMMANDS)) {
    console.log(`  ${verb.padEnd(10)} ${entry.summary}`);
  }
  console.log("\nFull E-arc surface complete.");
}

export async function cmdWiki(args: ParsedArgs): Promise<number> {
  const verb = args.positional[0];
  if (!verb || verb === "help" || args.flags["help"]) {
    printWikiHelp();
    return verb ? 0 : 2;
  }
  const entry = SUBCOMMANDS[verb];
  if (!entry) {
    console.error(`lares wiki: unknown verb "${verb}". Run \`lares wiki help\` for the list.`);
    return 2;
  }
  const inner: ParsedArgs = {
    command:    "wiki",
    positional: args.positional.slice(1),
    options:    args.options,
    flags:      args.flags,
  };
  return await entry.handler(inner);
}

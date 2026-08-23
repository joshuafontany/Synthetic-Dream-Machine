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

import { vesselDid } from "../env.js";
import { emit } from "../render.js";
import { summaryOutput, type SubmitResult, type SubmitOptions } from "../verb-result.js";
import { runVerb } from "../verb-call.js";
import type { ParsedArgs } from "../parse-args.js";

type WikiSubcommand = (args: ParsedArgs) => Promise<number>;

// The whole wiki surface runs over the lares↔lararium binding: one line over the
// daemon's sock. `call` surfaces a transport failure as an error-result so each
// handler's `r.status === "error"` path reports it.
async function call(
  name: string,
  args: Record<string, unknown>,
  did:  string,
  opts: SubmitOptions = {},
): Promise<SubmitResult> {
  try {
    return await runVerb(name, args, did, opts);
  } catch (err) {
    return { status: "error", requestId: "", errorMessage: err instanceof Error ? err.message : String(err) };
  }
}

export async function cmdWikiList(_args: ParsedArgs): Promise<number> {
  const did    = await vesselDid();
  const r = await call("list-wikis", {}, did);
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
}

export async function cmdWikiInit(args: ParsedArgs): Promise<number> {
  const slug = args.positional[0];
  if (!slug) {
    console.error("usage: lares wiki init <slug>");
    return 2;
  }
  const did    = await vesselDid();
  const r = await call("init-wiki", { slug }, did);
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
}

export async function cmdWikiOpen(args: ParsedArgs): Promise<number> {
  const slug = args.positional[0];
  if (!slug) {
    console.error("usage: lares wiki open <slug>");
    return 2;
  }
  const did    = await vesselDid();
  const r = await call("open-wiki", { slug }, did);
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
}

export async function cmdWikiSync(args: ParsedArgs): Promise<number> {
  const slug = args.positional[0];
  if (!slug) {
    console.error("usage: lares wiki sync <slug>");
    return 2;
  }
  const did    = await vesselDid();
  const r = await call("sync-wiki", { slug }, did, { timeoutMs: 30_000 });
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
}

export async function cmdWikiPin(args: ParsedArgs): Promise<number> {
  const slug = args.positional[0];
  if (!slug) {
    console.error("usage: lares wiki pin <slug>");
    return 2;
  }
  const did    = await vesselDid();
  const r = await call("pin-wiki", { slug }, did);
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
}

export async function cmdWikiUnpin(args: ParsedArgs): Promise<number> {
  const slug = args.positional[0];
  if (!slug) {
    console.error("usage: lares wiki unpin <slug>");
    return 2;
  }
  const did    = await vesselDid();
  const r = await call("unpin-wiki", { slug }, did);
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
}

/** `lares wiki switch <slug>` — LIVE-activate a wiki (no reboot; the true swap).
 *  Distinct from `open`, which sets the next-boot pointer. On the browser this also
 *  flips the #projection surface to the newly-live wiki. */
export async function cmdWikiSwitch(args: ParsedArgs): Promise<number> {
  const slug = args.positional[0];
  if (!slug) {
    console.error("usage: lares wiki switch <slug>");
    return 2;
  }
  const did = await vesselDid();
  const r = await call("wiki-switch", { slug }, did, { timeoutMs: 30_000 });
  if (r.status === "error") {
    console.error(`switch failed: ${r.errorMessage ?? "unknown"}`);
    return 4;
  }
  const result = summaryOutput(r) ?? {};
  const active = result["active"] === true;
  const held   = (result["held"] ?? []) as string[];
  console.log("");
  if (active) {
    console.log(`switched → ${slug} (live)`);
  } else {
    console.log(`switch ${slug}: NOT activatable (unregistered wiki, or grant exhausted) — parked`);
  }
  if (held.length > 0) console.log(`  held: ${held.join(", ")}`);
  console.log("");
  return active ? 0 : 5;
}

/** `lares wiki hold <slug>` — pin a wiki as a rotatable active pin (budget-enforced:
 *  @daemon always + N rotatable; a hold past the budget releases the least-recently-held). */
export async function cmdWikiHold(args: ParsedArgs): Promise<number> {
  const slug = args.positional[0];
  if (!slug) {
    console.error("usage: lares wiki hold <slug>");
    return 2;
  }
  const did = await vesselDid();
  const r = await call("wiki-hold", { slug }, did, { timeoutMs: 30_000 });
  if (r.status === "error") {
    console.error(`hold failed: ${r.errorMessage ?? "unknown"}`);
    return 4;
  }
  const result = summaryOutput(r) ?? {};
  const held   = result["held"] === true;
  const holds  = (result["holds"] ?? []) as string[];
  console.log("");
  console.log(held ? `held → ${slug}` : `hold ${slug}: not activatable — not held`);
  console.log(`  rotatable pins (${holds.length}/${result["budget"] ?? "?"}): ${holds.join(", ") || "(none)"}`);
  console.log("");
  return held ? 0 : 5;
}

/** `lares wiki release <slug>` — drop a wiki's rotatable pin (it stays live, just becomes a cooling candidate). */
export async function cmdWikiRelease(args: ParsedArgs): Promise<number> {
  const slug = args.positional[0];
  if (!slug) {
    console.error("usage: lares wiki release <slug>");
    return 2;
  }
  const did = await vesselDid();
  const r = await call("wiki-release", { slug }, did);
  if (r.status === "error") {
    console.error(`release failed: ${r.errorMessage ?? "unknown"}`);
    return 4;
  }
  const result = summaryOutput(r) ?? {};
  const holds  = (result["holds"] ?? []) as string[];
  console.log("");
  console.log(`released ${slug}`);
  console.log(`  rotatable pins (${holds.length}): ${holds.join(", ") || "(none)"}`);
  console.log("");
  return 0;
}

/** `lares wiki active` — the live switcher state: which wikis run now + which are held. */
export async function cmdWikiActive(args: ParsedArgs): Promise<number> {
  const did = await vesselDid();
  const r = await call("wiki-active", {}, did);
  if (r.status === "error") {
    console.error(`active failed: ${r.errorMessage ?? "unknown"}`);
    return 4;
  }
  const result  = summaryOutput(r) ?? {};
  const active  = (result["active"] ?? []) as string[];
  const held    = new Set((result["held"] ?? []) as string[]);
  const surface = result["activeSurface"];
  console.log("");
  console.log(`active wikis (${active.length}/${result["activationCap"] ?? "?"}):`);
  if (active.length === 0) console.log("  (none live)");
  for (const w of active) {
    const marks = [held.has(w) ? "📌" : "  ", surface === w ? "◀ surface" : ""].filter(Boolean).join(" ");
    console.log(`  ${marks} ${w}`);
  }
  console.log(`  rotatable pin budget: ${result["pinBudget"] ?? "?"}`);
  console.log("");
  return 0;
}

export async function cmdWikiAddBag(args: ParsedArgs): Promise<number> {
  const slug   = args.positional[0];
  const bagUrl = args.positional[1];
  if (!slug || !bagUrl) {
    console.error("usage: lares wiki add-bag <slug> <bag-uri>");
    return 2;
  }
  const did    = await vesselDid();
  const r = await call("add-bag", { slug, bagUrl }, did);
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
}

export async function cmdWikiRemoveBag(args: ParsedArgs): Promise<number> {
  const slug   = args.positional[0];
  const bagUrl = args.positional[1];
  if (!slug || !bagUrl) {
    console.error("usage: lares wiki remove-bag <slug> <bag-uri>");
    return 2;
  }
  const did    = await vesselDid();
  const r = await call("remove-bag", { slug, bagUrl }, did);
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
}

/**
 * `lares wiki compact <slug> <bag-url>` — compact one of the wiki's bags.
 *
 * Thin wrapper: verifies the bag is in the wiki's recipe stack, then
 * delegates to bag-compact. Returns the same shape as bag-compact with
 * a recipe-membership check up front.
 */
export async function cmdWikiCompact(args: ParsedArgs): Promise<number> {
  const slug   = args.positional[0];
  const bagUrl = args.positional[1];
  if (!slug || !bagUrl) {
    console.error("usage: lares wiki compact <slug> <bag-url>");
    return 2;
  }
  const did    = await vesselDid();
  const r = await call("bag-compact", { bagUrl }, did, { timeoutMs: 30_000 });
  if (r.status === "error") {
    console.error(`wiki compact failed: ${r.errorMessage ?? "unknown"}`);
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
}

export async function cmdWikiRotateRecipe(args: ParsedArgs): Promise<number> {
  const slug = args.positional[0];
  if (!slug) {
    console.error("usage: lares wiki rotate-recipe <slug>");
    return 2;
  }
  const did    = await vesselDid();
  const r = await call("rotate-recipe", { slug }, did, { timeoutMs: 30_000 });
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
}

export async function cmdWikiPruneStale(args: ParsedArgs): Promise<number> {
  const slug = args.positional[0];
  if (!slug) {
    console.error("usage: lares wiki prune-stale <slug> [--days <N>]");
    return 2;
  }
  const daysOpt = args.options["days"];
  const did     = await vesselDid();
  const cmdArgs: Record<string, unknown> = { slug };
  if (daysOpt) cmdArgs["daysThreshold"] = Number(daysOpt);
  const r = await call("prune-stale", cmdArgs, did);
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
}

/**
 * `lares wiki resolve <tiddler-uri>` — Residency Model coordinate-inspection.
 *
 * Lists every Manifestation (FRBR Expression-level realization) of `tiddler`
 * across bags in the recipe, ordered highest-priority first. The winning bag
 * (origin-bag for any current read) gets a `→` marker.
 *
 * Meme: lar:///ha.ka.ba/lararium/api/residency-model
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
  const did    = await vesselDid();
  const r = await call("resolve", { tiddler }, did);
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
    console.log("        See bags/lararium/ha.ka.ba/lararium/api/residency-model.md #conflict-resolution");
    console.log("        — resolution surfaces to operator / cabal Talk Story.");
    console.log("");
  }

  return manifestations.length > 0 ? 0 : 5;
}

export async function cmdWikiWhich(args: ParsedArgs): Promise<number> {
  const tiddler = args.positional[0];
  if (!tiddler) {
    console.error("usage: lares wiki which <tiddler-uri>");
    return 2;
  }
  const did    = await vesselDid();
  const r = await call("where", { tiddler }, did);
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
}

const SUBCOMMANDS: Readonly<Record<string, { handler: WikiSubcommand; summary: string }>> = {
  "init":  { handler: cmdWikiInit,  summary: "Mint a fresh wiki: wiki canonical + per-wiki draft + recipe. Idempotent." },
  "open":  { handler: cmdWikiOpen,  summary: "Set which wiki the next `lares vessel stand --foreground` boot mounts as active. Does not live-remount the current vessel." },
  "switch": { handler: cmdWikiSwitch, summary: "LIVE-activate a wiki (no reboot — the true swap; wakes it cold from its recipe). Browser flips the projection surface." },
  "hold":    { handler: cmdWikiHold,    summary: "Pin a wiki as a rotatable active pin (@daemon always + N rotatable; a hold past budget releases the least-recently-held)." },
  "release": { handler: cmdWikiRelease, summary: "Drop a wiki's rotatable pin (it stays live, becomes a cooling candidate)." },
  "active":  { handler: cmdWikiActive,  summary: "Show the live switcher state: which wikis run now + which are held + the projection surface." },
  "sync":  { handler: cmdWikiSync,  summary: "Walk wikis/<slug>/memes/** and ingest into the canonical bag. Idempotent." },
  "pin":        { handler: cmdWikiPin,       summary: "Pin every bag in the wiki's recipe (whole-recipe residency)." },
  "unpin":      { handler: cmdWikiUnpin,     summary: "Unpin every bag in the wiki's recipe." },
  "add-bag":    { handler: cmdWikiAddBag,    summary: "Add a bag to the wiki's recipe at runtime. Hot-reload via composite.addLayer." },
  "remove-bag": { handler: cmdWikiRemoveBag, summary: "Remove a bag from the wiki's recipe (soft remove; F-arc adds StoryList drain)." },
  "compact":       { handler: cmdWikiCompact,         summary: "DXOS-style snapshot-restart on one of the wiki's bags. Bounds history." },
  "rotate-recipe": { handler: cmdWikiRotateRecipe,  summary: "Nix-generations: mint fresh canonical; retain old as previous-canon underlay." },
  "prune-stale":   { handler: cmdWikiPruneStale,    summary: "Surface stale draft tiddlers (no recent activity) for residency-action-or-prune." },
  "list":       { handler: cmdWikiList,      summary: "Enumerate wikis registered in the catalog. Needs `lares vessel stand --foreground`." },
  "which":      { handler: cmdWikiWhich,     summary: "Recipe-presence query — list bags holding a tiddler. Needs `lares vessel stand --foreground`." },
  "resolve":    { handler: cmdWikiResolve,   summary: "Residency Model coordinate-inspection — list all Manifestations of a tiddler across bags; highlight winning bag per recipe priority. Needs `lares vessel stand --foreground`." },
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

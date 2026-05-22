import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { bagScopedStore, wikiLarUri } from "@lararium/mesh";
import { openVmCarrierSyncSession } from "@lararium/tw5";
import type { JobHandler } from "./job-dispatcher.js";
import { stringArg } from "./handler-args.js";
import type { WikiMintHandlerOptions } from "./wiki-handlers.js";

/**
 * `lares wiki sync <slug>` — disk → CRDT ingest.
 *
 * Walks `wikis/@<slug>/memes/**` for `.md` files. For each file, derives a
 * tiddler title from the iam `uri-path` field (or falls back to a path-
 * based URI), then hands the full carrier text to the target TW5 VM via
 * its normal deserializer ingestion path. The registered TW5
 * text/x-memetic-wikitext deserializer decomposes the carrier into parent
 * + `#fragment` children inside the VM. This handler then routes those
 * materialized VM tiddlers through the IslandAdaptor save path so every bag
 * mutation travels through the same VM-owned boundary as UI edits.
 *
 * Returns { slug, scanned, ingested, skipped, recordsIngested, errors[] }.
 */
export function createSyncWikiHandler(opts: WikiMintHandlerOptions): JobHandler {
  return async (args) => {
    const slug = stringArg(args, "slug");
    if (!slug) throw new Error("args.slug is required");

    const wikiKey = wikiLarUri(slug);
    const wikiRec = await opts.composite.get(wikiKey);
    if (!wikiRec || typeof wikiRec.tiddler.text !== "string") {
      throw new Error(`wiki "${slug}" not registered — run \`lares wiki init ${slug}\` first`);
    }

    const memesRoot = join(opts.rootDir, "wikis", `@${slug}`, "memes");
    if (!existsSync(memesRoot)) {
      return { slug, scanned: 0, ingested: 0, skipped: 0, errors: [], note: "no wikis/@<slug>/memes/ directory" };
    }

    const files: string[] = [];
    walkMemes(memesRoot, files);

    if (!opts.composite.hasWritableBag(wikiKey)) {
      throw new Error(`wiki "${slug}" is not mounted in this daemon — open it before sync`);
    }

    const vm = opts.getPrimaryEngine();
    const syncSession = openVmCarrierSyncSession({
      vm,
      store: bagScopedStore(opts.composite, wikiKey),
      instanceId: `wiki-sync:${slug}`,
      targetBag: wikiKey,
    });

    const errors: string[] = [];
    let ingested = 0;
    let skipped = 0;
    let recordsIngested = 0;

    try {
      for (const file of files) {
        try {
          const text = readFileSync(file, "utf8");
          const uri = extractIamUri(text) ?? deriveUriFromPath(slug, memesRoot, file);
          const sourceFile = file.startsWith(opts.rootDir) ? file.slice(opts.rootDir.length + 1) : file;
          const syncedAt = new Date().toISOString();

          const result = await syncSession.syncCarrier({
            uri,
            text,
            sourceFile,
            syncedAt,
          });
          if (!result.changed) {
            skipped++;
            continue;
          }

          recordsIngested += result.recordWrites;
          ingested++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`${file}: ${msg}`);
        }
      }
    } finally {
      syncSession.stop();
    }

    return { slug, scanned: files.length, ingested, skipped, recordsIngested, errors };
  };
}

function walkMemes(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walkMemes(full, out);
    } else if (entry.endsWith(".md")) {
      out.push(full);
    }
  }
}

function extractIamUri(text: string): string | null {
  const iamMatch = text.match(/```toml iam\s*\n([\s\S]*?)\n```/);
  if (!iamMatch) return null;
  const block = iamMatch[1] ?? "";
  const uriPathMatch = block.match(/^uri-path\s*=\s*["']([^"']+)["']/m);
  if (!uriPathMatch) return null;
  const raw = uriPathMatch[1]!;
  return raw.startsWith("lar:///") ? raw : `lar:///${raw}`;
}

function deriveUriFromPath(slug: string, memesRoot: string, file: string): string {
  const rel = file.slice(memesRoot.length + 1).replace(/\.md$/, "").replace(/\\/g, "/");
  return `${wikiLarUri(slug)}/memes/${rel}`;
}
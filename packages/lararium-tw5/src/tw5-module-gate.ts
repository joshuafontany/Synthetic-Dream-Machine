import { parsePonoLevel } from "@lararium/mesh";
import type { TW5Instance } from "./types/tiddlywiki.js";

// Preserves the old 0.00–1.00 gate pressure as SDM+ 0–20 Levels:
// 0.90 → 18, 0.85 → 17.
const MODULE_MANA_THRESHOLD = 18;
const MODULE_MANAO_THRESHOLD = 17;
const MODULE_MANAOIO_THRESHOLD = 17;
const MODULE_CONFIDENCE_THRESHOLD = 18;
// The has-stack model (2026-06-12): a kernel-injectable module WEARS the
// tw5-module component in its stack (tags), never "implements an interface".
const MODULE_COMPONENT_URI = "lar:///ha.ka.ba/@lararium/v0.1/tw5/tw5-module";
const MODULE_AGGREGATE_URI = "lar:///ha.ka.ba/@lararium/v0.1/tw5/modules/tw5-modules";

export async function bootTrustedModules(tw: TW5Instance): Promise<void> {
  const wiki = tw.wiki;

  let injected = 0;
  try {
    const titles: string[] = wiki.filterTiddlers(`[all[tiddlers]stack:has[${MODULE_COMPONENT_URI}]]`) ?? [];
    for (const title of titles) {
      const t = wiki.getTiddler(title);
      if (!t) continue;
      const f = t.fields as Record<string, string>;

      const mana       = parsePonoLevel(f["mana"]);
      const manao      = parsePonoLevel(f["manao"]);
      const manaoio    = parsePonoLevel(f["manaoio"]);
      const confidence = parsePonoLevel(f["confidence"]);
      if (
        mana === null ||
        manao === null ||
        manaoio === null ||
        confidence === null ||
        mana < MODULE_MANA_THRESHOLD ||
        manao < MODULE_MANAO_THRESHOLD ||
        manaoio < MODULE_MANAOIO_THRESHOLD ||
        confidence < MODULE_CONFIDENCE_THRESHOLD
      ) continue;

      const body = f["text"] ?? "";
      if (!body.trim() || body.startsWith("// Body injected")) continue;

      const claimedHash = f["body-sha256"] ?? "";
      if (!claimedHash || !(await verifySha256(body, claimedHash))) continue;

      wiki.addTiddler(new tw.Tiddler({
        title,
        type:          "application/javascript",
        "module-type": f["module-type"] ?? "library",
        text:          body,
        tags:          [],
      }));
      injected++;
    }
  } catch {
    /* filter unavailable — fall through */
  }

  if (injected > 0) {
    try {
      const moduleText = wiki.getTiddler(MODULE_AGGREGATE_URI)?.fields?.["text"] ?? "";
      if (typeof moduleText === "string") {
        tw.modules.define(moduleText, "library", "lararium-tw5-modules");
      }
    } catch {
      /* no-op */
    }
  }
}

async function verifySha256(body: string, claimedHex: string): Promise<boolean> {
  try {
    const subtle = globalThis.crypto?.subtle;
    if (!subtle) return false;
    const buf = await subtle.digest("SHA-256", new TextEncoder().encode(body));
    const actual = Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return actual === claimedHex;
  } catch {
    return false;
  }
}
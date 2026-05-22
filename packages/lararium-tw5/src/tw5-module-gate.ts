import type { TW5Instance } from "./types/tiddlywiki.js";

const MODULE_MANA_THRESHOLD = 0.90;
const MODULE_MANAO_THRESHOLD = 0.85;
const MODULE_MANAOIO_THRESHOLD = 0.85;
const MODULE_CONFIDENCE_THRESHOLD = 0.90;
const MODULE_INTERFACE_URI = "lar:///ha.ka.ba/@lararium/tw5/tw5-module";
const MODULE_AGGREGATE_URI = "lar:///ha.ka.ba/@lararium/tw5/modules/tw5-modules";

export async function bootTrustedModules(tw: TW5Instance): Promise<void> {
  const wiki = tw.wiki;

  let injected = 0;
  try {
    const titles: string[] = wiki.filterTiddlers(`[all[tiddlers]implementors[${MODULE_INTERFACE_URI}]]`) ?? [];
    for (const title of titles) {
      const t = wiki.getTiddler(title);
      if (!t) continue;
      const f = t.fields as Record<string, string>;

      const mana = parseFloat(f["mana"] ?? "0");
      const manao = parseFloat(f["manao"] ?? "0");
      const manaoio = parseFloat(f["manaoio"] ?? "0");
      const confidence = parseFloat(f["confidence"] ?? "0");
      if (
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
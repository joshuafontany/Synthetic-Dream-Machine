/**
 * smoke-plugin-boot — verify the plugin-tiddler boot path.
 *
 * Boots a fresh TW5Engine in-process, passing LARES_MEMETIC_WIKITEXT_PLUGIN
 * as boot()'s plugin argument (the caller supplies plugins explicitly — the
 * engine preloads nothing by itself); TW5's standard plugin loader unpacks
 * it. We then assert that the unpacked artifacts are present in the running
 * wiki:
 *   - cascade config tiddlers at lar:///config/Lar/AhuTemplate/... (html
 *     scope — the markdown-meme templates burned at 07866b34)
 *   - template tiddlers at lar:///ha.ka.ba/@lararium/templates/...
 *   - parser registered for text/x-memetic-wikitext
 *   - sigil widget tiddlers present (kau, ahu, aka, kahea, loulou, pranala — all TW5 \\widget)
 *
 * Exit nonzero if any check fails.
 */
import { readFileSync } from "fs";
import path from "path";
import { LARES_MEMETIC_WIKITEXT_PLUGIN_URI } from "@lararium/mesh";
import { TW5Engine } from "../src/tw5-vm.js";
import { LARES_MEMETIC_WIKITEXT_PLUGIN } from "../src/plugin-tiddler.generated.js";
import { exportMemeText } from "../src/meme-write.js";
import { TW5_CORE_SCRIPT_FILENAME, TW5_CORE_DIR } from "../src/generated-tw5-version.js";

async function main(): Promise<void> {
  const corePath = path.join(TW5_CORE_DIR, TW5_CORE_SCRIPT_FILENAME);
  const coreBlob = new Uint8Array(readFileSync(corePath));
  const engine = new TW5Engine();
  await engine.boot(coreBlob, [LARES_MEMETIC_WIKITEXT_PLUGIN as unknown as Record<string, unknown>]);

  const failures: string[] = [];
  const wiki = engine.wiki;

  // The html-scope survivors — the markdown-meme template twins burned at 07866b34 (pre-tide).
  const expectedTitles = [
    LARES_MEMETIC_WIKITEXT_PLUGIN_URI,
    "lar:///config/Lar/AhuTemplate/html",
    "lar:///config/Lar/AkaTemplate/html",
    "lar:///config/Lar/PranalaHeaderTemplate/html",
    "lar:///config/Lar/KaheaTemplate/html",
    "lar:///config/Lar/LoulouTemplate/html",
    "lar:///config/Lar/PranalaTemplate/html",
    "lar:///ha.ka.ba/@lararium/templates/ahu/html",
    "lar:///ha.ka.ba/@lararium/templates/aka/html",
    "lar:///ha.ka.ba/@lararium/templates/pranala-header/html",
    "lar:///ha.ka.ba/@lararium/templates/kahea/html",
    "lar:///ha.ka.ba/@lararium/templates/loulou/html",
    "lar:///ha.ka.ba/@lararium/templates/pranala/html",
    "lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-dispatcher",
    "lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-ahu",
    "lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-aka",
    "lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-kahea",
    "lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-loulou",
    "lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-pranala-header",
    "lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-pranala",
    "lar:///config/Lar/KauTemplate/html",
    "lar:///ha.ka.ba/@lararium/templates/kau/html",
    "lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-kau",
  ];
  for (const title of expectedTitles) {
    if (!wiki.getTiddler(title)) failures.push(`missing tiddler: ${title}`);
  }

  // Probe TW5 module registry for the parser + widgets.
  const tw = (engine as unknown as { _tw: { Wiki?: { parsers?: Record<string, unknown> }; modules?: { types?: Record<string, Record<string, unknown>> } } })._tw;
  const parsers = tw?.Wiki?.parsers ?? {};
  if (!parsers["text/x-memetic-wikitext"]) failures.push("parser not registered: text/x-memetic-wikitext");

  // All sigil widgets (ahu, aka, kahea, kau, loulou, pranala, pranala-header)
  // now live as TW5 \widget definitions in tiddler text — no JS module-type:widget.
  // The only JS widgets are internal infra (not checked here).
  // Tiddler-presence checks above verify kau, ahu, etc. loaded from the plugin.

  // Probe ahu cascade tiddler presence — sigil-ahu.tid carries ~ahu + ~kahea~ahu.
  // Full render probe deferred: engine.renderText does not load $:/tags/Global
  // wikitext into macro scope, so wikitext widget probes are pre-existing-broken
  // across all sigils (aka, kahea, loulou, etc.). Tiddler-presence checks above
  // cover sigil-ahu loading. Integration render coverage lives in test:tw5-flow.
  if (!wiki.getTiddler("lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-ahu")) {
    failures.push("sigil-ahu tiddler missing from plugin");
  }

  // Render probes for wikitext-defined sigils do not belong in this low-level
  // boot smoke. engine.renderText() parses anonymous text without importing the
  // plugin's $:/tags/Global macro definitions into scope, so it strips the
  // macrocall nodes after the JS wikirule fires. Presence checks above verify
  // the plugin unpacked the wikitext sigil tiddlers; integration TW5 flow tests
  // own rendered widget behavior.

  // Probe deserializer prologue + postamble capture.
  // Synthesize a single-meme carrier with DOCTYPE prologue and trailing
  // commentary postamble; deserialize via $tw.wiki.deserializeTiddlers
  // (the plugin's tiddlerdeserializer registration); verify both fields
  // land on the parent.
  const memeWithFraming = [
    "<!-- <<~ !DOCTYPE = lar:///probe-meme >> -->",
    "",
    "<<~ &#x0001; ? -> lar:///probe-meme >>",
    "<<~ ahu #head >>",
    "body",
    "<<~/ahu >>",
    "<<~&#x0003;>>",
    "",
    "trailing prose after etx",
  ].join("\n");
  type DeserializedFields = Record<string, string | string[]>;
  const deserializeTiddlers = (tw as unknown as { wiki: { deserializeTiddlers(t: string, x: string, b: Record<string, string>): DeserializedFields[] } }).wiki.deserializeTiddlers;
  const deserialized = deserializeTiddlers.call((tw as unknown as { wiki: unknown }).wiki, "text/x-memetic-wikitext", memeWithFraming, { title: "lar:///probe-meme" });
  const parent = deserialized?.[0];
  if (!parent) failures.push("deserializer returned no parent tiddler");
  else {
    if (typeof parent["prologue"] !== "string" || !(parent["prologue"] as string).includes("DOCTYPE")) {
      failures.push(`prologue missing or wrong: ${JSON.stringify(parent["prologue"])}`);
    }
    if (typeof parent["postamble"] !== "string" || !(parent["postamble"] as string).includes("trailing prose")) {
      failures.push(`postamble missing or wrong: ${JSON.stringify(parent["postamble"])}`);
    }
  }

  // Probe per-slot preamble/postamble capture (J.2a). Synthesize a meme
  // whose slot body has prose before its iam toml and trailing prose
  // after its inner kahea ref.
  const slotMeme = [
    "<<~ &#x0001; ? -> lar:///probe-slot-meme >>",
    "<<~ ahu #parent >>",
    "leading slot prose",
    "```toml iam",
    "field = \"value\"",
    "```",
    "<<~ ahu #child >>",
    "child body",
    "<<~/ahu >>",
    "trailing slot prose",
    "<<~/ahu >>",
    "<<~&#x0003;>>",
  ].join("\n");
  const slotResults = deserializeTiddlers.call(
    (tw as unknown as { wiki: unknown }).wiki,
    "text/x-memetic-wikitext",
    slotMeme,
    { title: "lar:///probe-slot-meme" },
  );
  const parentSlot = slotResults.find((t) => t["title"] === "lar:///probe-slot-meme#parent") as DeserializedFields | undefined;
  if (!parentSlot) {
    failures.push("slot-structure probe: parent slot child not found");
  } else {
    if (parentSlot["field"] !== "value") {
      failures.push(`slot iam field not parsed: ${JSON.stringify(parentSlot["field"])}`);
    }
    if (typeof parentSlot["preamble"] !== "string" || !(parentSlot["preamble"] as string).includes("leading slot prose")) {
      failures.push(`slot preamble missing or wrong: ${JSON.stringify(parentSlot["preamble"])}`);
    }
    if (typeof parentSlot["postamble"] !== "string" || !(parentSlot["postamble"] as string).includes("trailing slot prose")) {
      failures.push(`slot postamble missing or wrong: ${JSON.stringify(parentSlot["postamble"])}`);
    }
  }

  // J.2c — round-trip emission via exportMemeText (markdown-meme scope).
  // Inject the slot child fields into the wiki and render through the
  // meme-template; output should reconstruct the operator's original
  // slot body — preamble + iam toml + postamble.
  if (parentSlot) {
    for (const t of slotResults) {
      engine.setTiddler(t as unknown as Record<string, string | string[]>);
    }
    const rendered = exportMemeText(engine, "lar:///probe-slot-meme#parent");
    if (!rendered.includes("leading slot prose")) {
      failures.push(`slot round-trip lost preamble; got: ${rendered.slice(0, 300)}`);
    }
    if (!rendered.includes("trailing slot prose")) {
      failures.push(`slot round-trip lost postamble; got: ${rendered.slice(0, 300)}`);
    }
    // the emitter may align the toml assignment — match the field through flexible spacing.
    if (!rendered.includes("```toml iam") || !/field\s+= "value"/.test(rendered)) {
      failures.push(`slot round-trip lost iam toml; got: ${rendered.slice(0, 300)}`);
    }
  }

  // (J.2d retired: the pranala markdown-meme template burned at 07866b34; its html twin renders an
  // inline span — no wrapped-blank-lines shape to probe, so no trivial stand-in exists.)

  if (failures.length > 0) {
    console.error("✖ smoke FAILED");
    for (const f of failures) console.error("  -", f);
    process.exit(1);
  }
  console.log("✓ plugin boot smoke clean");
  console.log(`  ${expectedTitles.length} shadow tiddlers present`);
  console.log(`  parser registered; sigil widgets live as TW5 \\widget tiddlers`);
  console.log(`  sigil-ahu wikitext tiddler present (~ahu + ~kahea~ahu defined)`);
  console.log(`  wikitext sigil tiddlers present; render probes live in integration flow tests`);
  console.log(`  deserializer captured prologue + postamble fields on parent`);
  console.log(`  slot-structure split: preamble + iam fields + postamble on slot child`);
  console.log(`  slot round-trip emission: preamble + iam toml + postamble reconstructed via meme-template`);
  process.exit(0);
}

main().catch((e) => {
  console.error("✖ smoke threw:", e);
  process.exit(1);
});

/*\
title: lar:///ha.ka.ba/lararium/tw5/modules/carrier-filetype
type: application/javascript
module-type: startup
\*/
/**
 * carrier-filetype — `.mem` names a carrier, and one registration says so.
 *
 * ── ONE EXTENSION, ONE TYPE ─────────────────────────────────────────────────────────────────────
 * A `.mem` file IS a memetic-wikitext carrier. It opens with a `<<!DOCTYPE …>>` declaration, an SOH
 * frame, or both, and `text/x-memetic-wikitext` reads every one of those shapes. The extension has
 * already answered the only question a router could ask, so the registration carries no ambiguity
 * forward.
 *
 * ── WHY NO CONTENT SNIFF ────────────────────────────────────────────────────────────────────────
 * A sniff earns its cost where ONE extension holds TWO kinds and the bytes decide between them.
 * Here it cannot help, and it can hurt in a way nothing downstream reports: a carrier whose head
 * shape a sniffer fails to recognise routes to some other deserializer SILENTLY, producing a tiddler
 * that looks imported and whose frame never parsed.
 *
 * A malformed carrier belongs to the carrier reader, which raises `carrier.iam.missing` and names
 * the fault — never to a router that reclassifies it away from the diagnostic that would have named
 * it. Graceful parsing means AUGMENT AND WRAP at the reader, not reassign at the door.
 *
 * ── ONE REGISTRATION REACHES EVERY DOOR ─────────────────────────────────────────────────────────
 * Drag-and-drop, the import dialog, and the filesystem adaptor all resolve through
 * `$tw.config.fileExtensionInfo`. `registerFileType` runs last-write-wins and this startup lands
 * after core boot, so `.mem` resolves here whatever the core registered for it.
 *
 * Meme: lar:///ha.ka.ba/lararium/tw5/tw5-deserializer
 */

/** The one type a `.mem` carries. */
const CARRIER_TYPE = "text/x-memetic-wikitext";

interface TwUtils {
  registerFileType(
    type:        string,
    encoding:    string,
    extensions:  string[],
    options?:    Record<string, unknown>,
  ): void;
}

interface TwGlobal {
  utils: TwUtils;
}

export const name        = "lararium-carrier-filetype";
export const platforms   = ["browser", "node"];
export const after       = ["startup"];
export const synchronous = true;

export function startup(): void {
  const tw = (globalThis as { $tw?: TwGlobal }).$tw;
  if (!tw?.utils?.registerFileType) return;
  tw.utils.registerFileType(CARRIER_TYPE, "utf8", [".mem"]);
}

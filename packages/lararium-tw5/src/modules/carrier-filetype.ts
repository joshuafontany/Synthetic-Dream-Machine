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
 * ── A MALFORMED CARRIER STAYS A CARRIER ─────────────────────────────────────────────────────────
 * A `.mem` whose frame does not parse reaches the carrier reader anyway, which raises
 * `carrier.iam.missing` and names the fault. That keeps the diagnostic reachable: a door that
 * re-types unrecognised bytes hands them to a reader with no opinion about frames, and the file
 * imports looking whole while nothing checked it.
 *
 * Twenty carriers in the corpus stand on an SOH frame with no declaration line, so head shapes vary
 * legitimately and a shape-based decision at the door would strand them. Graceful parsing means
 * AUGMENT AND WRAP at the reader — the reader holds the grammar, the door holds only the extension.
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

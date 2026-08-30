/**
 * floor-cure — correcting the waking floor's advice where the daemon cannot see far enough.
 *
 * ── WHY THE DAEMON'S OWN CURE GOES WRONG ────────────────────────────────────────────────────────
 * A vessel decides its standing ONCE, at boot, from the face it finds. Mint a face afterward and the
 * running daemon knows nothing of it: it refuses every persona-scoped act and counsels the operator
 * to light a face — which is sound advice from inside an island that can see its own boot and no
 * disk at all, and wrong advice for the person holding three faces already.
 *
 * Measured on the founding rehearsal: the vessel stood faceless, three kahu were minted, and the
 * seed refused with `lares persona new 0`. Following that counsel mints a fourth face and changes
 * nothing, because the standing is what has to move.
 *
 * The CLI holds what the island lacks — the faces are on its disk — so the correction lands here.
 * It stays NARROW: only this refusal, only when a face actually stands. A surface that re-worded
 * every error would bury the daemon's own reading under a guess.
 *
 * Meme: lar:///ha.ka.ba/lares/cli/vessel-door
 */

import { readFileSync } from "node:fs";

/**
 * Whether a PersonaGroup stands in the bootstrap on disk — the same sentinel the daemon reads at boot.
 *
 * ONE READING SERVES BOTH USES. The lift decides whether to re-stand from it and this correction
 * decides what to advise from it; two derivations would let the door lift a vessel while the cure
 * still told its operator to mint.
 */
export function faceStandsOnDisk(bootstrap: string): boolean {
  try {
    const packed = JSON.parse(readFileSync(bootstrap, "utf8")) as { text?: string };
    const inner = JSON.parse(packed.text ?? "{}") as { tiddlers?: Record<string, { text?: string }> };
    const tiddlers = inner.tiddlers ?? (inner as unknown as Record<string, { text?: string }>);
    return Object.entries(tiddlers).some(([k, v]) => k.includes("persona-group/doc-id") && Boolean(v?.text));
  } catch { return false; }
}

/** The floor's two spellings — one for the face, one for the plane it hangs on. */
const FLOOR_MARKS = ["stands at the waking floor and holds no face",
                     "stands at the waking floor and holds no PersonaGroup plane"] as const;

/**
 * The cure this refusal should carry, or `null` to leave the daemon's own words standing.
 *
 * `null` is the common answer and the safe one: an unrecognised refusal, or a floor with nothing on
 * disk to lift to, keeps exactly what the daemon said.
 */
export function floorCure(message: string, disk: { readonly faceOnDisk: boolean }): string | null {
  if (!FLOOR_MARKS.some((m) => message.includes(m))) return null;
  if (!disk.faceOnDisk) return null;
  return "a face stands on disk that this daemon booted without — it decided its standing before the "
       + "mint, and holds to it. Stand the vessel again and the floor lifts: `lares vessel stand`.";
}

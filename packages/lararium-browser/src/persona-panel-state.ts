/**
 * persona-panel-state — shape a persona multitude-view into the @daemon panel's push args.
 *
 * The vessel HOLDS the persona vault (main-thread IDB); the @daemon persona surface RENDERS in
 * the worker. This pure function turns a {@link PersonaMultitudeEntry} list + the worn index into
 * the flat, string-only field bag the `persona-state` worker verb writes onto
 * $:/temp/lares/personas (the surface iterates `[list[…]]` and reads `petname-<idx>` by
 * interpolated field name). Keeping it pure gives the panel's data contract a unit boundary the
 * browser test drives without a worker+projection boot.
 *
 * PRIVATE-all default: the caller passes a multitude-view built with NO public-handle view, so
 * every persona reads private-only and no `glamour` field crosses. Publishing a public face stays
 * a SEPARATE explicit act — this shaping never federates a face.
 *
 * Meme: lar:///ha.ka.ba/lararium/browser/persona-panel-state
 */

import type { PersonaMultitudeEntry } from "@lararium/mesh";

/**
 * Shape the panel push args. `list` = the indices (the TW5 list field), `active` = the worn index
 * (empty when none worn — no inference), `held` = the founder-held indices (enlist+match gates the
 * WEAR button, so a joinee row without a held root offers no wear), and one `petname-<idx>` per
 * named persona (the PRIVATE label, blank when unnamed).
 */
export function personaPanelStateArgs(
  view: readonly PersonaMultitudeEntry[],
  active: number | undefined,
): Record<string, string> {
  const args: Record<string, string> = {
    list:   view.map((e) => String(e.handleIndex)).join(" "),
    active: active !== undefined ? String(active) : "",
    held:   view.filter((e) => e.heldHere).map((e) => String(e.handleIndex)).join(" "),
  };
  for (const e of view) {
    args[`petname-${e.handleIndex}`] = e.petname ?? "";
  }
  return args;
}

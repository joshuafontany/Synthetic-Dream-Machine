/**
 * browser-caps — the browser vessel's #has-cap-stack, wired by the composable-keel engine.
 *
 * composeBrowser — the browser vessel composed over the SHARED granular keel: it runs
 * `composeCoreVessel` (the one keel both node + browser walk), so the browser becomes a REAL
 * #has-cap-stack — substrate → wikislot → daemon → wiki → pool → mount — not a delegating wrapper.
 * The mirror of node-caps' composeLararium; with this, all three vessel-KINDS (Lararium · Herm ·
 * browser) compose over the one composeVessel, and the wiki-slot tail unifies (no fork of the boot).
 *
 * Canon: lar:///ha.ka.ba/@lararium/api/composable-keel
 */

import { composeCoreVessel } from "@lararium/tw5";

/**
 * composeBrowser — the browser #has-cap-stack: the shared granular `composeCoreVessel`. Returns the
 * VesselCoreResult directly (the old `{vessel,core}` wrapper dropped; the caller used only `.core`).
 */
export const composeBrowser = composeCoreVessel;

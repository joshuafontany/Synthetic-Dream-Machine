/**
 * capture-annotate — the default forward annotate pass the telemetry-VM injects into the
 * capture-engine: a raw turn → its `lar_*` gradient metadata (harvestTurnGradient → buildPatch).
 *
 * Kept in its own module (NOT re-exported from the package index) so the engine and its unit
 * tests never pull the mempalace barrel — only the daemon, which has the full build, imports
 * this. The engine takes the annotate injected (see CaptureAnnotate).
 */

import { harvestTurnGradient } from "@lararium/mesh";
import { buildPatch } from "@lararium/mempalace";

import type { CaptureAnnotate } from "./capture-engine.js";

/** harvestTurnGradient (the gradient parse) → buildPatch (the lar_* projection). */
export const defaultAnnotate: CaptureAnnotate = (turnText, sourceFile) =>
  buildPatch(harvestTurnGradient(turnText), sourceFile);

/**
 * subagent-mine — the tasked-spirit (sub-agent) capture-ROUTING helpers: the naming
 * convention that files a spirit's turns DISTINCT from the main agent's memory.
 *
 * A spirit's transcript lives at `<session>/subagents/agent-<id>.jsonl` and holds BOTH
 * sides of the exchange — the handoff the main Lares authored (user) and the spirit's
 * work (assistant). These pure builders name where a spirit's turns land:
 *
 *   - DISTINCT: each spirit files into `wing_<project>__spirits` (spiritsWing), never
 *     the parent's wing.
 *   - IDENTIFIED BY UUID: identity rides the worldline handle `<run>.<agentId>`
 *     (`lar_agent_handle`); the staged basename (spiritStageBasename) only carries the
 *     provenance tokens buildPatch reads.
 *
 * The `source_file` a spirit turn rides under (spiritCaptureSourceFile) fuses the wing
 * PREFIX (routing) with the staged basename (provenance) in one string.
 *
 * The EDGE-DERIVATION crunch (listSpiritFiles / agentIdOf / runIdOf) + the direct-mine
 * spool (mineSubagentsForSession) moved to python (worldline_observe.py, beside the
 * transcript data); the worldline-compare edge feed reads the capture holder's
 * `subagent-edges` serve-op. These builders stay TS — the node capture leg names its
 * source_file from them.
 *
 * Meme: lar:///ha.ka.ba/lararium/api/lar-telemetry
 */

/**
 * The staged spirit BASENAME — the source_file provenance token:
 * `<surface>__<name>__agent-<id>__run-<run>.jsonl`. The leading `<surface>__` token
 * follows the main-transcript law (`${surface}__…`, runHarvestAll) so `lar_surface`
 * stamps by token instead of defaulting; buildPatch skips it before deriving
 * `lar_agent`, and `lar_agent_handle` reads off the end-anchored `__agent-…__run-…`
 * segment — the handle law holds unshifted.
 */
export function spiritStageBasename(name: string, agentId: string, runId: string, surface = "claude"): string {
  return `${surface}__${name}__agent-${agentId}__run-${runId}.jsonl`;
}

/**
 * The `source_file` a spirit turn rides through the daemon `capture` verb under. Two channels
 * fuse in one string: a `<wing>/` PREFIX (the routing — `spiritsWing(wing)`, decoded to
 * `metadata.wing` at the node flush) and the `spiritStageBasename` (the provenance —
 * buildPatch reads `lar_surface` / `lar_agent` / `lar_sidechain` / `lar_agent_handle` off it,
 * exactly the convention the direct-mine leg stages). The capture path takes the basename, the
 * wing-stamp takes the prefix, so one record lands BOTH the `__spirits` wing AND the AST keyed
 * to the spirit.
 */
export function spiritCaptureSourceFile(wing: string, name: string, agentId: string, runId: string, surface = "claude"): string {
  return `${spiritsWing(wing)}/${spiritStageBasename(name, agentId, runId, surface)}`;
}

/** The spirits wing derived from a project wing (distinct, never the parent's). */
export function spiritsWing(wing: string): string {
  return `${wing}__spirits`;
}

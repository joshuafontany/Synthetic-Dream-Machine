/**
 * pinned-doc — load plain data into an Automerge doc whose bytes carry NO ambient state.
 *
 * A content address earns its name only when the bytes behind it depend on the content alone. Automerge writes
 * two ambient fields into every change: the ACTOR (random unless pinned) and the TIME (wall-clock seconds).
 * Pinning the actor alone leaves the clock in the bytes, and the clock moves — so two peers materializing the
 * same content a second apart produce two DIFFERENT seq-1 changes under ONE actor. Automerge reconciles
 * divergent actors freely and that shape not at all; it rejects the merge outright:
 *
 *     RangeError: error applying changes: duplicate seq 1 found for actor 000…000
 *
 * That fires exactly where the pinned actor was supposed to help most — a deterministic doc id two islands both
 * materialize (deterministic-doc), and a read-face cid that must ratchet only when its content moves
 * (mesh-palace FLOW-map, realm-glamour charter). Pinning BOTH fields makes the seq-1 change a pure function of
 * the content, so racing peers converge byte-identical and a re-export of unchanged content keeps its cid.
 *
 * The oracle-doc genesis path (genesis-doc `materializeGenesisDoc`) states this contract and carries it; this
 * module holds the same discipline for every other pinned-actor site so one fix serves them all.
 *
 * RESIDUAL — key order rides in the bytes too. `materializeGenesisDoc` sorts its keys explicitly because it
 * assembles its map from many sources. The callers here hand over a projection built by one local function, so
 * their key order already stands fixed by that function; this helper preserves the caller's order rather than
 * imposing one. A caller that begins merging maps from several sources MUST sort, as genesis-doc does.
 */
import { init as automergeInit, change as automergeChange, type Doc } from "@automerge/automerge";

/** The shared pinned actor. Every ambient-free doc rides one actor so their seq-1 changes may coincide. */
export const PINNED_ACTOR = "00000000000000000000000000000000" as const;

/**
 * Load plain data into an Automerge doc with the actor and the clock both pinned, so `save()` yields bytes that
 * depend on the content alone.
 *
 * Subsequent LOCAL writes take their own actor (a `repo.import`ed handle mints one), so two peers that both
 * materialize this doc and then each write their own content still merge — only the shared seed change coincides.
 */
export function pinnedDoc<T extends Record<string, unknown>>(content: T, actor: string = PINNED_ACTOR): Doc<T> {
  return automergeChange(automergeInit<T>({ actor }), { time: 0 }, (d) => {
    Object.assign(d as Record<string, unknown>, content);
  });
}

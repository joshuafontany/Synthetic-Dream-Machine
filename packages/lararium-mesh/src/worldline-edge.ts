/**
 * worldline-edge — the PURE edge-DAG triple builders. The reified happened-before the
 * in-memory ITC registry (worldline-clock.ts) carries live, projected as durable
 * bi-temporal triples for the mempalace knowledge graph (the chat-session store).
 *
 * The edge-DAG IS the worldline's happened-before (agent-worldline #attribution): a
 * `prov:Delegation` edge (parent → child) records the SPAWN; a `prov:Communication` edge
 * (injector → target) records a mid-flight INJECTION (the rhizome leg, merge-where-messages-
 * land). HANDBACK closes the spawn edge's valid-interval (the twin-reunion). Each triple
 * carries the TURN-DAG key (the C-cut: handoffs key to the turn-DAG node, so the edge
 * survives rewind/fork) and a valid_from.
 *
 * These functions build the triple DESCRIPTORS only — pure, bundle-able, no IO. The node-side
 * seam (lararium-mempalace/worldline-kg.ts) writes them through the mempalace KG API
 * (`kg_add` / `kg_invalidate`). The in-memory ITC verdict stays the live causal read; the KG
 * is the durable, re-derivable projection (nuke-and-pave + re-harvest, #time).
 *
 * Meme: lar:///ha.ka.ba/lararium/api/agent-worldline#attribution
 */

/** The spawn edge — `actedOnBehalfOf` ⇄ prov:Delegation (PROV-AGENT, arXiv 2508.02866). */
export const PRED_DELEGATION = "prov:Delegation";

/** The mid-flight injection edge — `wasInformedBy` ⇄ prov:Communication (the rhizome leg). */
export const PRED_COMMUNICATION = "prov:Communication";

/** The adapter identity stamped on every worldline edge (declared, not smuggled). */
export const WORLDLINE_ADAPTER = "lares-worldline";

/**
 * One edge-DAG triple descriptor — the row a `kg_add` writes. `turnKey` rides the KG's
 * `source_drawer_id` provenance slot (the turn-DAG node the edge keys to); kapae (rewind)
 * closes every triple sharing a `turnKey` (worldline-kg.ts).
 */
export interface WorldlineEdgeTriple {
  /** The source worldline HANDLE (the parent on a Delegation, the injector on a Communication). */
  readonly subject: string;
  /** prov:Delegation | prov:Communication. */
  readonly predicate: string;
  /** The target worldline HANDLE (the child / the injected target). */
  readonly object: string;
  /** When the edge became true (ISO) — the worldline's epistemic "as of" point. */
  readonly valid_from?: string;
  /** The turn-DAG key this edge keys to (→ KG source_drawer_id; the kapae filter). */
  readonly turnKey?: string;
}

/** A descriptor for closing an edge's valid-interval (the handback / kapae move). */
export interface WorldlineEdgeClose {
  readonly subject: string;
  readonly predicate: string;
  readonly object: string;
  /** When the edge stopped being true (ISO); the KG defaults to today when omitted. */
  readonly ended?: string;
}

export interface EdgeOpts {
  /** ISO valid_from; defaults applied by the caller/seam, never fabricated here. */
  readonly validFrom?: string;
  /** The turn-DAG key (the C-cut handoff key). */
  readonly turnKey?: string;
}

/** SPAWN → the prov:Delegation triple (parent happened-before child). */
export function delegationEdge(parent: string, child: string, opts: EdgeOpts = {}): WorldlineEdgeTriple {
  if (!parent || !child) throw new Error("delegationEdge: parent and child handles required");
  return {
    subject: parent,
    predicate: PRED_DELEGATION,
    object: child,
    ...(opts.validFrom !== undefined ? { valid_from: opts.validFrom } : {}),
    ...(opts.turnKey !== undefined ? { turnKey: opts.turnKey } : {}),
  };
}

/** INJECT → the prov:Communication triple (injector reached a running target mid-flight). */
export function communicationEdge(injector: string, target: string, opts: EdgeOpts = {}): WorldlineEdgeTriple {
  if (!injector || !target) throw new Error("communicationEdge: injector and target handles required");
  return {
    subject: injector,
    predicate: PRED_COMMUNICATION,
    object: target,
    ...(opts.validFrom !== undefined ? { valid_from: opts.validFrom } : {}),
    ...(opts.turnKey !== undefined ? { turnKey: opts.turnKey } : {}),
  };
}

/** HANDBACK → the close descriptor for the spawn edge (the twin-reunion interval-close). */
export function handbackClose(parent: string, child: string, ended?: string): WorldlineEdgeClose {
  if (!parent || !child) throw new Error("handbackClose: parent and child handles required");
  return {
    subject: parent,
    predicate: PRED_DELEGATION,
    object: child,
    ...(ended !== undefined ? { ended } : {}),
  };
}

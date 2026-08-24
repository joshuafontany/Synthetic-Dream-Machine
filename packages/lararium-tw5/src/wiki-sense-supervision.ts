/**
 * wiki-sense-supervision — the daemon's supervision READ-verbs over its wiki islands + the
 * local proof-hold. The daemon asks a SUPERVISED island for `cohere` / `recall` by RIDING the
 * wiki-sensorium cap's signal surface ({@link SENSORIUM_SIGNAL} in, {@link SENSORIUM_FRAME} back) — this module
 * re-implements no perceiver verb; it correlates asks with answers across the worker wire.
 *
 * THE CONFUSED-DEPUTY WARD (house law, the recurring bug): every ask NAMES its target island and
 * the authority RIDES THE DESIGNATION — the supervisor resolves the name ONLY through the shores the
 * vessel granted it (the island channels the daemon legitimately supervises), never through ambient
 * or default resolution. A request naming an island outside that grant FAILS LOUD, and a frame
 * arriving from an island other than the one asked never settles the ask.
 *
 * PROOF-HOLD (local, self-sovereign): a completed cohere read MAY leave a compact proof record in
 * the daemon's OWN store — "serialize the PROOF, never the carrier": the record carries the island's
 * designation, the as-of heads, the radius/glue verdict, the H¹ gate, R*_sem, and the obstruction
 * LOCI (titles) — never tiddler text, corpus bytes, or embeddings. The record wears the
 * effect-record ledger idiom (a tagged tiddler under `<bag>/ledger/proof/<event-id>`); its "when"
 * rides the causal heads alone (no wall clock; no global now).
 *
 * PROOF-FEDERATE stays UNBUILT: crossing the disclosure shore (mesh-palace) reads as a
 * federation Act the OPERATOR gates — {@link WikiSenseFederateRefusal} answers honestly, typed,
 * mirroring the wiki-sensorium cap's couple() refusal.
 *
 * Meme: lar:///ha.ka.ba/lares/api/wiki-sense-supervision
 */

import { DAEMON_BAG_ID, stableTagUri, newEventId } from "@lararium/mesh";
import type {
  LarTiddlerRecord,
  LarTiddlerStore,
  ChangeOrigin,
  SensoriumSignalType,
} from "@lararium/mesh";
import { SENSORIUM_SIGNAL } from "./wiki-sensorium-cap.js";
import type { WikiCoherenceVerdict, WikiRecallQuery, WikiRecallResult } from "./wiki-sensorium-cap.js";
import { capLoci } from "./wiki-sense-fold.js";
import type { VerbTable } from "./verb-dispatcher.js";

// ── the supervision verbs (the daemon-facing names) ─────────────────────────────────────────────────

/** The three wiki-sense verbs the daemon speaks — reads ride; federate refuses (operator-gated). */
export const WIKI_SENSE_VERB = {
  cohere:   "wiki-sense:cohere",
  recall:   "wiki-sense:recall",
  federate: "wiki-sense:federate",
} as const;

/** Per-ask reply budget — mirrors the pool's wiki:place-verb handshake budget. */
const ASK_TIMEOUT_MS = 10_000;

/** Proof-ledger ring size — the ledger keeps the last N proof records per island designation;
 *  older records delete forward on write (the ledger stays a bounded ring, never a landfill). */
const PROOF_RING = 32;

// ── the shores (the vessel's grant — designation carries the authority) ──────────────────────────────

/**
 * What the vessel grants the supervisor: the ONLY way it reaches an island. `supervises` answers the
 * designation check; `sendSignal` posts into the designated island and MUST itself fail loud when the
 * designation names no live supervised island (the pool's placeSensoriumSignal does). No shore here
 * resolves a default island — an ask without a legitimate designation goes nowhere.
 */
export interface WikiSenseShores {
  supervises(designation: string): boolean;
  sendSignal(
    designation: string,
    msg: { signal: SensoriumSignalType; requestId: string; args?: Record<string, unknown> },
  ): void;
}

export interface WikiSenseSupervisorOptions {
  /** The daemon's OWN store the proof-hold writes into. A hold asked without a store fails loud. */
  proofStore?: LarTiddlerStore;
  /** The bag the proof ledger lives in (routes composite writes). Default {@link DAEMON_BAG_ID}. */
  proofBag?: string;
  /** Per-ask reply budget in ms (tests tighten it). Default {@link ASK_TIMEOUT_MS}. */
  timeoutMs?: number;
  /** Override the proof event-id mint (tests). Defaults to the mesh {@link newEventId}. */
  newId?: () => string;
  /** Proof-ledger ring size per island (tests tighten it). Default {@link PROOF_RING}. */
  proofRing?: number;
}

// ── the proof record (the effect-record ledger idiom, proof plane) ──────────────────────────────────

/** Tag carried by every proof-record tiddler in the daemon's proof ledger. */
export const LARES_PROOF_RECORD_TAG = stableTagUri("lares-proof-record");

/** `lar:///ha.ka.ba/bags/daemon/ledger/proof/` — the proof-ledger prefix for one bag. */
export function proofLedgerPrefix(bagUri: string): string {
  return `${bagUri}/ledger/proof/`;
}

/** `lar:///ha.ka.ba/bags/daemon/ledger/proof/<event-id>` — one proof-record tiddler. */
export function proofRecordUri(bagUri: string, eventId: string): string {
  return `${proofLedgerPrefix(bagUri)}${eventId}`;
}

/** True when a title sits in a bag's proof ledger. Pass the bag to pin the check to ONE ledger
 *  ({@link proofLedgerPrefix}); absent, the bag-agnostic shape test answers — so a non-default
 *  proofBag round-trips through build → parse unchanged. */
export function isProofRecordUri(title: string, bagUri?: string): boolean {
  if (bagUri !== undefined) {
    const prefix = proofLedgerPrefix(bagUri);
    return title.startsWith(prefix) && title.length > prefix.length;
  }
  return /^lar:\/\/\/.+\/ledger\/proof\/.+$/.test(title);
}

/**
 * The local proof-hold record — the PROOF a cohere read left, never the carrier it read. Every field
 * names a verdict coordinate or a designation; none carries tiddler text, corpus bytes, or vectors.
 * The as-of heads stamp the read causally ("as of my last sync") — the record holds NO wall clock.
 */
export interface WikiSenseProofRecord {
  readonly eventId:         string;
  /** The island DESIGNATION the daemon asked — the supervised channel the authority rode. */
  readonly island:          string;
  /** The requestId of the cohere ask this proof answers (the audit link back to the exchange). */
  readonly requestId:       string;
  /** The island snapshot's Automerge heads at the read — the causal as-of stamp. */
  readonly asOf:            readonly string[];
  /** The Robinson li-radius the verdict carried. */
  readonly radius:          number;
  readonly glues:           boolean;
  readonly vacuous:         boolean;
  /** The H¹ gate — which no-global-now stood (reconcilable ⊥ ontological). */
  readonly gateKind:        "reconcilable" | "ontological";
  readonly dimH1:           number;
  /** R*_sem = log₂ dim H¹ (0 when reconcilable). */
  readonly cost:            number;
  /** The union obstruction locus — tiddler TITLES only (where to look, never what it said);
   *  capped at the boundary loci budget; `lociTotal` carries the uncapped count. */
  readonly obstructionLoci: readonly string[];
  readonly lociTotal:       number;
  readonly corpusSize:      number;
}

/** Build the LarTiddlerRecord a proof-hold writes — kebab fields, arrays as JSON (the ledger idiom). */
export function buildProofRecordTiddler(proof: WikiSenseProofRecord, bagUri: string): LarTiddlerRecord {
  return {
    tiddler: {
      title:              proofRecordUri(bagUri, proof.eventId),
      tags:               LARES_PROOF_RECORD_TAG,
      "event-id":         proof.eventId,
      island:             proof.island,
      "request-id":       proof.requestId,
      "as-of":            JSON.stringify(proof.asOf),
      radius:             String(proof.radius),
      glues:              String(proof.glues),
      vacuous:            String(proof.vacuous),
      "gate-kind":        proof.gateKind,
      "dim-h1":           String(proof.dimH1),
      cost:               String(proof.cost),
      "obstruction-loci": JSON.stringify(capLoci(proof.obstructionLoci)),
      "loci-total":       String(proof.lociTotal),
      "corpus-size":      String(proof.corpusSize),
    },
    meta: { authority: "lares-proof-holder" },
  };
}

/** Parse a flat tiddler field bag back into a proof record. Returns null when the shape mismatches. */
export function parseProofRecord(fields: Record<string, unknown>): WikiSenseProofRecord | null {
  const title = typeof fields["title"] === "string" ? fields["title"] : "";
  if (!isProofRecordUri(title)) return null;

  const str = (k: string): string | null => {
    const v = fields[k];
    return typeof v === "string" && v.length > 0 ? v : null;
  };
  const eventId   = str("event-id");
  const island    = str("island");
  const requestId = str("request-id");
  const gateKind  = str("gate-kind");
  if (!eventId || !island || !requestId || (gateKind !== "reconcilable" && gateKind !== "ontological")) return null;

  const jsonArr = (k: string): readonly string[] => {
    try {
      const v = JSON.parse(str(k) ?? "[]") as unknown;
      return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
    } catch { return []; }
  };
  // a poisoned numeric (NaN/Infinity) fails the WHOLE parse — a proof record never carries dead numbers.
  const num = (k: string): number | null => {
    const n = Number(str(k) ?? "0");
    return Number.isFinite(n) ? n : null;
  };
  const radius     = num("radius");
  const dimH1      = num("dim-h1");
  const cost       = num("cost");
  const corpusSize = num("corpus-size");
  const lociTotal  = num("loci-total");
  if (radius === null || dimH1 === null || cost === null || corpusSize === null || lociTotal === null) return null;

  const obstructionLoci = jsonArr("obstruction-loci");
  return {
    eventId,
    island,
    requestId,
    asOf:            jsonArr("as-of"),
    radius,
    glues:           str("glues") === "true",
    vacuous:         str("vacuous") === "true",
    gateKind,
    dimH1,
    cost,
    obstructionLoci,
    // pre-ring records carry no loci-total field — the capped list's length answers honestly.
    lociTotal:       lociTotal > 0 ? lociTotal : obstructionLoci.length,
    corpusSize,
  };
}

// ── the federate refusal (the shore stays closed until the operator turns it) ────────────────────

/**
 * The proof-federate answer while the crossing stays operator-gated — a typed refusal naming the
 * shore Act it awaits. Local proof-hold reads self-sovereign; letting a proof CROSS to peers
 * rides the disclosure shore (mesh-palace crossesShore), a federation Act the operator gates.
 */
export interface WikiSenseFederateRefusal {
  readonly status: "operator-gated";
  readonly awaits: "shore-Act";
  /** The crossing this refusal holds shut: the daemon's local proof ledger -> the peer FLOW-map. */
  readonly crossing: "proof-hold(local daemon ledger) -> proof-federate(disclosure shore)";
  /** The island the un-granted ask named (the designation echoes back for the audit trail). */
  readonly island: string;
}

// ── the cohere reading (verdict + the proof it may have held) ────────────────────────────────────────

export interface WikiSenseCohereReading {
  readonly island:  string;
  readonly verdict: WikiCoherenceVerdict;
  /** Present when the ask held the proof — the record as written (re-readable via parseProofRecord). */
  readonly proof?:  WikiSenseProofRecord;
}

// ── the supervisor ──────────────────────────────────────────────────────────────────────────────────

/** The daemon-side supervision surface — read-verbs over supervised islands + the honest refusal. */
export interface WikiSenseSupervisor {
  /** Ask the DESIGNATED island for its coherence verdict; `hold: true` writes the proof locally. */
  cohere(island: string, opts?: { hold?: boolean }): Promise<WikiSenseCohereReading>;
  /** Ask the DESIGNATED island for a recall read (all the wiki-sensorium cap's tiers ride unchanged). */
  recall(island: string, query: WikiRecallQuery): Promise<WikiRecallResult>;
  /** The federation crossing, refused typed — never built here, never faked. */
  proofFederate(island: string): WikiSenseFederateRefusal;
  /** Feed one SENSORIUM_FRAME event payload back in (the vessel's onWorkerEvent return leg).
   *  Returns true when it settled a pending ask; a frame from the wrong island settles nothing. */
  acceptFrame(island: string, payload: Record<string, string | number | boolean>): boolean;
  /** Reject every pending ask and stop the timers. */
  dispose(): void;
}

interface PendingAsk {
  island:  string;
  resolve: (result: unknown) => void;
  reject:  (e: Error) => void;
  timer:   ReturnType<typeof setTimeout>;
}

/**
 * Stand the supervisor over the vessel's shores. Read-only end to end: it sends only the wiki-sensorium
 * cap's read signals and consumes only the frames they answer with; the sole write it ever performs lands the
 * proof record in the daemon's OWN store (local, self-sovereign — nothing crosses the shore).
 */
export function createWikiSenseSupervisor(
  shores: WikiSenseShores,
  opts: WikiSenseSupervisorOptions = {},
): WikiSenseSupervisor {
  const timeoutMs = opts.timeoutMs ?? ASK_TIMEOUT_MS;
  const proofBag  = opts.proofBag ?? DAEMON_BAG_ID;
  const newId     = opts.newId ?? newEventId;
  const proofRing = Math.max(1, opts.proofRing ?? PROOF_RING);
  const pending   = new Map<string, PendingAsk>();

  /** The ledger ring — keep the last `proofRing` records for one island; older ones delete forward.
   *  Event-ids sort by their fixed-width ms prefix, so title order reads as write order. */
  async function pruneProofLedger(store: LarTiddlerStore, island: string, requestId: string): Promise<void> {
    const prefix = proofLedgerPrefix(proofBag);
    const titles = (await store.listVisible()).filter((t) => t.startsWith(prefix));
    const mine: Array<{ title: string; eventId: string }> = [];
    for (const title of titles) {
      const rec = await store.get(title);
      const parsed = rec ? parseProofRecord(rec.tiddler as Record<string, unknown>) : null;
      if (parsed && parsed.island === island) mine.push({ title, eventId: parsed.eventId });
    }
    if (mine.length <= proofRing) return;
    mine.sort((a, b) => (a.eventId < b.eventId ? -1 : a.eventId > b.eventId ? 1 : 0));
    const origin: ChangeOrigin = { kind: "lares-verb", requestId };
    for (const old of mine.slice(0, mine.length - proofRing)) {
      await store.remove(old.title, origin);
    }
  }

  /** The one ask primitive — ward the designation, send the signal, await the correlated frame. */
  function ask(
    island: string, signal: SensoriumSignalType, args: Record<string, unknown> | undefined, requestId: string,
  ): Promise<unknown> {
    // THE WARD: the designation must sit inside the daemon's supervision grant — no ambient
    // resolution, no default island, and the miss surfaces NAMED (fail loud, never fall through).
    if (!shores.supervises(island)) {
      return Promise.reject(new Error(
        `[wiki-sense] ${signal} names "${island}" — an island this daemon does not supervise; ` +
        `the designation carries the authority (no ambient resolution, fail loud)`,
      ));
    }
    return new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(requestId);
        reject(new Error(`[wiki-sense] ${signal} to "${island}" timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      pending.set(requestId, {
        island,
        resolve: (r) => { clearTimeout(timer); pending.delete(requestId); resolve(r); },
        reject:  (e) => { clearTimeout(timer); pending.delete(requestId); reject(e); },
        timer,
      });
      try {
        // the shore re-wards at the mechanism (a live-island check races the mount/unmount log —
        // both ends fail loud, never silently reroute).
        shores.sendSignal(island, { signal, requestId, ...(args ? { args } : {}) });
      } catch (err) {
        const p = pending.get(requestId);
        p?.reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }

  return {
    async cohere(island: string, coOpts: { hold?: boolean } = {}): Promise<WikiSenseCohereReading> {
      const requestId = `sense-${newId()}`;
      const verdict = await ask(island, SENSORIUM_SIGNAL.cohere, undefined, requestId) as WikiCoherenceVerdict;
      if (!coOpts.hold) return { island, verdict };

      // proof-hold: the daemon keeps the PROOF in its own ledger — a hold without a store fails
      // loud rather than silently dropping the record the caller asked for.
      if (!opts.proofStore) {
        throw new Error(
          `[wiki-sense] proof-hold asked for "${island}" but no proofStore rides the supervisor — ` +
          `the daemon's own store must carry the ledger (no silent drop)`,
        );
      }
      const proof: WikiSenseProofRecord = {
        eventId:         newId(),
        island,
        requestId,
        asOf:            verdict.asOf,
        radius:          verdict.consistency.radius,
        glues:           verdict.consistency.glues,
        vacuous:         verdict.consistency.vacuous,
        gateKind:        verdict.gate.kind,
        dimH1:           verdict.gate.dimH1,
        cost:            verdict.gate.cost,
        // the record carries the CAPPED locus (the boundary budget); lociTotal keeps the true count.
        obstructionLoci: capLoci(verdict.consistency.obstructionLocus),
        lociTotal:       verdict.consistency.obstructionLocus.length,
        corpusSize:      verdict.corpusSize,
      };
      const origin: ChangeOrigin = { kind: "lares-verb", requestId };
      await opts.proofStore.put(buildProofRecordTiddler(proof, proofBag), origin, { bag: proofBag });
      // delete-forward: the ledger stays a bounded ring per island designation.
      await pruneProofLedger(opts.proofStore, island, requestId);
      return { island, verdict, proof };
    },

    recall(island: string, query: WikiRecallQuery): Promise<WikiRecallResult> {
      return ask(island, SENSORIUM_SIGNAL.recall, { ...query }, `sense-${newId()}`) as Promise<WikiRecallResult>;
    },

    proofFederate(island: string): WikiSenseFederateRefusal {
      // the honest refusal: crossing the disclosure shore reads as a federation Act the
      // OPERATOR gates — this surface never builds it, never fakes it (the cap's couple() discipline).
      return {
        status:   "operator-gated",
        awaits:   "shore-Act",
        crossing: "proof-hold(local daemon ledger) -> proof-federate(disclosure shore)",
        island,
      };
    },

    acceptFrame(island: string, payload: Record<string, string | number | boolean>): boolean {
      const requestId = typeof payload["requestId"] === "string" ? payload["requestId"] : "";
      const p = pending.get(requestId);
      if (!p) return false;
      // THE RETURN-LEG WARD: a frame carrying our requestId but arriving from an island OTHER than
      // the one asked never settles the ask — the exchange stays pinned to its designation.
      if (p.island !== island) return false;
      // an ERROR frame (the island's fail-loud answer) rejects the ask with the island's own words.
      const wireError = typeof payload["error"] === "string" && payload["error"].length > 0
        ? payload["error"] : null;
      if (wireError !== null) {
        p.reject(new Error(`[wiki-sense] frame from "${island}" answered with an error — ${wireError}`));
        return true;
      }
      let result: unknown;
      try {
        result = JSON.parse(String(payload["result"] ?? "null"));
      } catch (err) {
        p.reject(new Error(`[wiki-sense] frame from "${island}" carried unparseable result — ${String(err)}`));
        return true;
      }
      // a null/non-object result never resolves silently — every verb answers an object shape.
      if (result === null || typeof result !== "object") {
        p.reject(new Error(`[wiki-sense] frame from "${island}" carried a null/non-object result — the ask rejects, never resolves silently-null`));
        return true;
      }
      p.resolve(result);
      return true;
    },

    dispose(): void {
      for (const p of pending.values()) {
        clearTimeout(p.timer);
        p.reject(new Error("[wiki-sense] supervisor disposed"));
      }
      pending.clear();
    },
  };
}

// ── the daemon verb surface (wire once per vessel) ──────────────────────────────────────────────────

/**
 * Register the three wiki-sense verbs on the vessel's main VerbTable. The daemon WORKER reaches them
 * over its existing delegate loop (daemon:delegate-verb → runLocalVerb) — no new protocol; the verb
 * args MUST name the target island (`island`), and the supervisor wards the designation.
 */
export function registerWikiSenseVerbs(registry: VerbTable, supervisor: WikiSenseSupervisor): void {
  const namedIsland = (args: Readonly<Record<string, unknown>>, verb: string): string => {
    const island = args["island"];
    if (typeof island !== "string" || island.length === 0) {
      // an unnamed target NEVER resolves ambiently — the request must carry its designation.
      throw new Error(`[wiki-sense] ${verb} requires args.island — the request must NAME its target island`);
    }
    return island;
  };

  registry.register(WIKI_SENSE_VERB.cohere, async (args) => {
    const island = namedIsland(args, WIKI_SENSE_VERB.cohere);
    const reading = await supervisor.cohere(island, { hold: args["hold"] === true });
    return {
      island,
      verdict: reading.verdict as unknown as Record<string, unknown>,
      ...(reading.proof ? { proof: reading.proof as unknown as Record<string, unknown> } : {}),
    };
  });

  registry.register(WIKI_SENSE_VERB.recall, async (args) => {
    const island = namedIsland(args, WIKI_SENSE_VERB.recall);
    const query: WikiRecallQuery = {
      ...(typeof args["text"] === "string" ? { text: args["text"] } : {}),
      ...(typeof args["sigilHead"] === "string" ? { sigilHead: args["sigilHead"] } : {}),
      ...(typeof args["likeTitle"] === "string" ? { likeTitle: args["likeTitle"] } : {}),
      ...(typeof args["limit"] === "number" ? { limit: args["limit"] } : {}),
    };
    const result = await supervisor.recall(island, query);
    return { island, result: result as unknown as Record<string, unknown> };
  });

  registry.register(WIKI_SENSE_VERB.federate, async (args) => {
    const island = namedIsland(args, WIKI_SENSE_VERB.federate);
    return supervisor.proofFederate(island) as unknown as Record<string, unknown>;
  });
}

/**
 * verb-dispatcher — daemon-VM verb dispatcher for the lararium causal island.
 *
 * Subscription model (dual-path):
 *
 *   LOCAL path  — in-process callers use placeVerb(wiki, opts) to write a
 *                 volatile invocation tiddler at lararium.local.vm/verbs/<id>
 *                 directly to the daemon TW5 wiki. The dispatcher watches wiki
 *                 change events and picks these up immediately.
 *
 *   REMOTE path — external vessels write a verb-summons tiddler at
 *                 @daemon/summons/<id> to the Automerge doc. IslandAdaptor flows
 *                 it into the TW5 wiki. The dispatcher's Automerge subscriber
 *                 sees the summons, calls placeVerb() to create the volatile
 *                 invocation, then tombstones the summons tiddler.
 *                 The summons carries edge transport, not durable coordination state.
 *
 * Outcome flow: handler result → concludeVerb → daemon composite store
 *   → IslandAdaptor.saveTiddler → @daemon/outcomes/<id> in Automerge → syncs.
 *   Durable shared meaning begins at the outcome, not at the summons.
 *
 * Daemon-only law: ONLY the daemon VM runs a VerbDispatcher. Pinned wiki and
 *   warm/cold wikis are content surfaces — they do not dispatch.
 *
 * Federation model: every lararium vessel runs its own daemon VM + VerbDispatcher.
 *   Invocations are vessel-local scratch. Outcomes sync to all vessels via Automerge.
 *   Vessels coordinate through shared outcome space, not shared invocation queues.
 *
 * Reaction Engine note (UEFN / kumu):
 *   When the Verse-inspired ReactionEngine matures, this dispatcher pattern
 *   federates across causal-island bounds. VerbReactor signatures are pure
 *   (args, context) → result — already ReactionEngine-compatible.
 *
 * Architecture laws:
 *   - TW5 vm primacy: handlers may invoke vm action-widgets.
 *   - Web3 law: no HTTP/RPC control plane. Coordination is TW5 wiki events + CRDT sync.
 *   - Capability hooks: ctx.cap is bound per-invocation to requestedBy DID.
 *
 * Isomorphic: no Node or browser platform APIs. Runs in any sovereign Worker.
 *
 * Meme: lar:///ha.ka.ba/lararium/tw5/verb-dispatcher
 */

import {
  type Verb,
  type CompositeStore,
  type CapabilityVerifier,
  parseVerb,
  VERB_URI_PREFIX,
  OUTCOME_URI_PREFIX,
} from "@lararium/mesh";
import { dispatchVerb, placeVerb } from "./verb-vm.js";
import type { TW5Engine } from "./tw5-vm.js";
import { heedSummons } from "./verb-summons.js";
import type { SummonsRequest } from "./verb-summons.js";
import { runLocalVerb, deriveRoutedCap } from "./verb-local-dispatch.js";

export interface VerbContext {
  readonly daemon: CompositeStore;
  readonly invocation: Verb;
  readonly cap:   (access: import("@lararium/mesh").CapabilityAccess, bagUrl: string) => Promise<import("@lararium/mesh").CapabilityVerifyResult>;
}

export type VerbReactor = (
  args:    Readonly<Record<string, unknown>>,
  context: VerbContext,
) => Promise<Record<string, unknown>>;

/**
 * What a verb tells the SURFACES about itself — the metadata a projection needs, held beside the handler
 * rather than in a second list somewhere.
 *
 * A surface that keeps its own catalogue drifts from the plane it claims to expose, and drift of that kind
 * never announces itself: it shows up as a verb an agent can reach and a human cannot, or the reverse. So a
 * verb declares its surfaces HERE, once, and every projection reads that declaration.
 */
export interface VerbSpec {
  /** One line, shown by whichever surface renders it. */
  readonly summary: string;
  /**
   * Which projections MAY expose this verb. Held open-ended on purpose — a CLI and an agent surface are the
   * two standing today, and a wiki face or a remote face costs a string rather than a redesign.
   */
  readonly surfaces: readonly string[];
  /**
   * TRUE when performing this verb HOLDS A KEY.
   *
   * An agent surface may COMPOSE such an act into a presentable artifact and MUST NEVER execute it: the
   * signing hand stays the human's. The pattern already runs twice in this house — `nexus accept-carriage`
   * mints a token a human carries to a kahu, and a persona grant stays inert until a live human opens it.
   * Marking it here turns that convention into something a projection can enforce.
   */
  readonly signs?: boolean;
}

/** The surfaces standing today. A projection names its own; nothing here forbids a third. */
export const VERB_SURFACE = { cli: "cli", agent: "agent" } as const;

/** What any table's entry must tell a projection about itself. */
export interface SurfaceDeclared {
  readonly surfaces?: readonly string[];
  readonly signs?:    boolean;
}

/**
 * PROJECT any declaring table onto one surface — the four decisions, held in ONE place.
 *
 * Two tables stand (the CLI's commands run in-process at a terminal; the daemon's verbs route through the
 * VM into a vessel) and they must not merge — but the RULES for reading them must, or the two projections
 * drift on exactly the questions that matter: what an undeclared entry defaults to, whether a key-holding
 * act may execute, and what order a face renders in. Written twice, those answers diverge silently.
 *
 *   · an entry declaring nothing reaches `cli` alone — nothing reaches an agent until a hand declares it
 *   · `executableOnly` drops key-holding acts, so an agent face cannot reach one by accident
 *   · the result sorts by name, so a consuming face renders without re-deriving an order
 */
export function projectOntoSurface<T>(
  items: readonly T[],
  read: (item: T) => (SurfaceDeclared & { readonly name: string }) | undefined,
  surface: string,
  executableOnly = false,
): readonly T[] {
  return items
    .map((item) => ({ item, d: read(item) }))
    .filter((e): e is { item: T; d: SurfaceDeclared & { name: string } } => e.d !== undefined)
    .filter((e) => (e.d.surfaces ?? [VERB_SURFACE.cli]).includes(surface))
    .filter((e) => !(executableOnly && e.d.signs === true))
    .sort((a, b) => a.d.name.localeCompare(b.d.name))
    .map((e) => e.item);
}

export class VerbTable {
  private readonly handlers = new Map<string, VerbReactor>();
  private readonly specs    = new Map<string, VerbSpec>();

  /**
   * Register a verb, optionally declaring what the surfaces should know about it.
   *
   * The spec stays OPTIONAL so a verb may exist without reaching any surface — an internally-routed act is
   * a legitimate thing, and forcing every one of them to declare a summary would invite meaningless ones.
   * An undeclared verb simply projects nowhere, which reads as the honest default: a surface exposes what
   * asked to be exposed, never everything it can see.
   */
  register(verbName: string, handler: VerbReactor, spec?: VerbSpec): void {
    if (this.handlers.has(verbName)) {
      throw new Error(`[verb-dispatcher] duplicate handler for "${verbName}"`);
    }
    this.handlers.set(verbName, handler);
    if (spec) this.specs.set(verbName, spec);
  }

  get(verbName: string): VerbReactor | undefined { return this.handlers.get(verbName); }
  has(verbName: string): boolean { return this.handlers.has(verbName); }
  list(): readonly string[] { return [...this.handlers.keys()].sort(); }

  /** What a verb declared, or undefined when it declared nothing. */
  spec(verbName: string): VerbSpec | undefined { return this.specs.get(verbName); }

  /**
   * PROJECT the plane onto one surface — the verbs that declared it, in a stable order.
   *
   * This reads over what the vessel actually COMPOSED. A verb whose provider cap never composed never
   * registered, so it cannot project — capability-degradation reaching the surface for free, with no
   * per-vessel allowlist to maintain and none to fall out of date. A Herm exposes less than a hearth
   * because it composed less, and nobody wrote that down anywhere.
   */
  project(surface: string, executableOnly = false): readonly { readonly verb: string; readonly spec: VerbSpec }[] {
    const rows = this.list().map((verb) => ({ verb, spec: this.specs.get(verb) }));
    return projectOntoSurface(rows, (r) => r.spec ? { ...r.spec, name: r.verb } : undefined, surface, executableOnly)
      .filter((r): r is { verb: string; spec: VerbSpec } => r.spec !== undefined);
  }

  /**
   * The verbs a surface may EXECUTE, as against merely compose. Identical to `project` except that
   * key-holding acts drop out — so an agent surface built from this cannot reach a signing verb even by
   * accident, and reaching one takes a deliberate call to `project` plus a deliberate compose-only path.
   */
  projectExecutable(surface: string): readonly { readonly verb: string; readonly spec: VerbSpec }[] {
    return this.project(surface, true);
  }
}

export interface VerbDispatcherOptions {
  readonly daemonVm:   TW5Engine;
  readonly daemon:    CompositeStore;
  readonly registry:  VerbTable;
  readonly verifier?: CapabilityVerifier;
  readonly routeFn?:  (invocation: Verb) => Promise<Record<string, unknown>>;
}

export class VerbDispatcher {
  private unsubWiki:      (() => void) | null = null;
  private unsubAutomerge: (() => void) | null = null;
  private readonly inFlight = new Set<string>();

  constructor(private readonly opts: VerbDispatcherOptions) {}

  start(): void {
    if (this.unsubWiki) return;

    const wiki = this.opts.daemonVm.$tw.wiki;
    const onWikiChange = (changedTiddlers: Record<string, { deleted?: boolean }>) => {
      for (const title of Object.keys(changedTiddlers)) {
        if (!title.startsWith(VERB_URI_PREFIX)) continue;
        if (changedTiddlers[title]?.deleted) continue;
        const tw5Tiddler = wiki.getTiddler(title) as { fields: Record<string, unknown> } | undefined;
        if (!tw5Tiddler) continue;
        const invocation = parseVerb(tw5Tiddler.fields);
        if (!invocation || invocation.status !== "pending" || this.inFlight.has(invocation.requestId)) continue;
        this.inFlight.add(invocation.requestId);
        void this.opts.daemon.getLive(OUTCOME_URI_PREFIX + invocation.requestId).then((prior) => {
          // Durable idempotency — the CRDT is the dedup store: a verb whose
          // outcome already landed has already taken effect, so skip re-execution
          // (exactly-once EFFECT, not delivery). See project_asymmetric_peer_handoff.
          if (prior) return undefined;
          return dispatchVerb(
          this.opts.daemonVm,
          this.opts.daemon,
          invocation,
          async () => {
            if (this.opts.registry.has(invocation.action)) {
              return runLocalVerb(invocation, {
                daemon:   this.opts.daemon,
                registry: this.opts.registry,
                ...(this.opts.verifier ? { verifier: this.opts.verifier } : {}),
              });
            }
            if (this.opts.routeFn) {
              // Verify-then-delegate: the keyholder worker gates the cap BEFORE
              // routing to main; main then trusts the worker→main channel as the
              // capability (project_verification_placement). Enforced only when a
              // real verifier exists; a pre-sovereign/test island (no verifier)
              // routes as before.
              if (this.opts.verifier) {
                const { access, bagUrl } = deriveRoutedCap(invocation);
                const proof = await this.opts.verifier.verify({ presenter: invocation.requestedBy, bagUrl, access });
                if (!proof.ok) {
                  throw new Error(`[verb-dispatcher] capability denied for routed verb "${invocation.action}" (bag=${bagUrl}, access=${access}): ${proof.reason ?? "no grant"}`);
                }
              }
              return this.opts.routeFn(invocation);
            }
            throw new Error(`no handler registered for "${invocation.action}"`);
          },
          );
        }).catch((err) => {
          console.error("[verb-dispatcher] verb dispatch crashed:", err);
        }).finally(() => this.inFlight.delete(invocation.requestId));
      }
    };
    wiki.addEventListener("change", onWikiChange);
    this.unsubWiki = () => wiki.removeEventListener("change", onWikiChange);

    this.unsubAutomerge = this.opts.daemon.subscribe((change) => {
      heedSummons(change, {
        daemon:     this.opts.daemon,
        isInFlight: (requestId) => this.inFlight.has(requestId),
        placeVerb:  (invocation) => { this.placeVerb(invocation); },
      }).catch((err) => {
        console.error("[verb-dispatcher] summons relay crashed:", err);
      });
    });

    console.log(`[verb-dispatcher] live — handlers: ${this.opts.registry.list().join(", ") || "(none)"}`);
  }

  stop(): void {
    this.unsubWiki?.(); this.unsubWiki = null;
    this.unsubAutomerge?.(); this.unsubAutomerge = null;
  }

  placeVerb(opts: SummonsRequest): string {
    return placeVerb(this.opts.daemonVm, opts);
  }
}


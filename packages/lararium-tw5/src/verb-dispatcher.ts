/**
 * verb-dispatcher — admin-VM verb dispatcher for the lararium causal island.
 *
 * Subscription model (dual-path):
 *
 *   LOCAL path  — in-process callers use placeVerb(wiki, opts) to write a
 *                 volatile invocation tiddler at lararium.local.vm/verbs/<id>
 *                 directly to the admin TW5 wiki. The dispatcher watches wiki
 *                 change events and picks these up immediately.
 *
 *   REMOTE path — external vessels write a verb-signal tiddler at
 *                 @admin/signals/<id> to the Automerge doc. IslandAdaptor flows
 *                 it into the TW5 wiki. The dispatcher's Automerge subscriber
 *                 sees the signal, calls placeVerb() to create the volatile
 *                 invocation, then tombstones the signal tiddler.
 *                 The signal is edge transport, not durable coordination state.
 *
 * Outcome flow: handler result → buildVerbOutcome → admin composite store
 *   → IslandAdaptor.saveTiddler → @admin/outcomes/<id> in Automerge → syncs.
 *   Durable shared meaning begins at the outcome, not at the signal.
 *
 * Admin-only law: ONLY the admin VM runs a VerbDispatcher. Pinned wiki and
 *   warm/cold wikis are content surfaces — they do not dispatch.
 *
 * Federation model: every lararium vessel runs its own admin VM + VerbDispatcher.
 *   Invocations are vessel-local scratch. Outcomes sync to all vessels via Automerge.
 *   Vessels coordinate through shared outcome space, not shared invocation queues.
 *
 * Reaction Engine note (UEFN / kumu):
 *   When the Verse-inspired ReactionEngine matures, this dispatcher pattern
 *   federates across causal-island bounds. VerbReactor signatures are pure
 *   (args, context) → result — already ReactionEngine-compatible.
 *
 * Architecture laws:
 *   - TW5 vm primacy: handlers may invoke vm action-widgets (B.4).
 *   - Web3 law: no HTTP/RPC control plane. Coordination is TW5 wiki events + CRDT sync.
 *   - Capability hooks: ctx.cap is bound per-invocation to requestedBy DID.
 *
 * Isomorphic: no Node or browser platform APIs. Runs in any sovereign Worker.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/tw5/verb-dispatcher
 */

import {
  type VerbInvocation,
  type CompositeStore,
  type CapabilityVerifier,
  parseVerbInvocation,
  VERB_URI_PREFIX,
} from "@lararium/mesh";
import { dispatchVerbLifecycle, placeVerbInvocation } from "./verb-vm.js";
import type { TW5Engine } from "./tw5-vm.js";
import { emitVerbSignal } from "./verb-signal.js";
import type { VerbSignalRequest } from "./verb-signal.js";
import { runLocalVerb } from "./verb-local-dispatch.js";

export interface VerbContext {
  readonly admin: CompositeStore;
  readonly invocation: VerbInvocation;
  readonly cap:   (access: import("@lararium/mesh").CapabilityAccess, bagUrl: string) => Promise<import("@lararium/mesh").CapabilityVerifyResult>;
}

export type VerbReactor = (
  args:    Readonly<Record<string, unknown>>,
  context: VerbContext,
) => Promise<Record<string, unknown>>;

export class VerbTable {
  private readonly handlers = new Map<string, VerbReactor>();

  register(verbName: string, handler: VerbReactor): void {
    if (this.handlers.has(verbName)) {
      throw new Error(`[verb-dispatcher] duplicate handler for "${verbName}"`);
    }
    this.handlers.set(verbName, handler);
  }

  get(verbName: string): VerbReactor | undefined { return this.handlers.get(verbName); }
  has(verbName: string): boolean { return this.handlers.has(verbName); }
  list(): readonly string[] { return [...this.handlers.keys()].sort(); }
}

export interface VerbDispatcherOptions {
  readonly adminVm:   TW5Engine;
  readonly admin:     CompositeStore;
  readonly registry:  VerbTable;
  readonly verifier?: CapabilityVerifier;
  readonly routeFn?:  (invocation: VerbInvocation) => Promise<Record<string, unknown>>;
}

export class VerbDispatcher {
  private unsubWiki:      (() => void) | null = null;
  private unsubAutomerge: (() => void) | null = null;
  private readonly inFlight = new Set<string>();

  constructor(private readonly opts: VerbDispatcherOptions) {}

  start(): void {
    if (this.unsubWiki) return;

    const wiki = this.opts.adminVm.$tw.wiki;
    const onWikiChange = (changedTiddlers: Record<string, { deleted?: boolean }>) => {
      for (const title of Object.keys(changedTiddlers)) {
        if (!title.startsWith(VERB_URI_PREFIX)) continue;
        if (changedTiddlers[title]?.deleted) continue;
        const tw5Tiddler = wiki.getTiddler(title) as { fields: Record<string, unknown> } | undefined;
        if (!tw5Tiddler) continue;
        const invocation = parseVerbInvocation(tw5Tiddler.fields);
        if (!invocation || invocation.status !== "pending" || this.inFlight.has(invocation.requestId)) continue;
        this.inFlight.add(invocation.requestId);
        dispatchVerbLifecycle(
          this.opts.adminVm,
          this.opts.admin,
          invocation,
          () => {
            if (this.opts.registry.has(invocation.verb)) {
              return runLocalVerb(invocation, {
                admin:    this.opts.admin,
                registry: this.opts.registry,
                ...(this.opts.verifier ? { verifier: this.opts.verifier } : {}),
              });
            }
            if (this.opts.routeFn) return this.opts.routeFn(invocation);
            return Promise.reject(new Error(`no handler registered for "${invocation.verb}"`));
          },
        ).catch((err) => {
          console.error("[verb-dispatcher] local handler crashed:", err);
        }).finally(() => this.inFlight.delete(invocation.requestId));
      }
    };
    wiki.addEventListener("change", onWikiChange);
    this.unsubWiki = () => wiki.removeEventListener("change", onWikiChange);

    this.unsubAutomerge = this.opts.admin.subscribe((change) => {
      emitVerbSignal(change, {
        admin:      this.opts.admin,
        isInFlight: (requestId) => this.inFlight.has(requestId),
        placeVerb:  (invocation) => { this.placeVerb(invocation); },
      }).catch((err) => {
        console.error("[verb-dispatcher] signal relay crashed:", err);
      });
    });

    console.log(`[verb-dispatcher] live — handlers: ${this.opts.registry.list().join(", ") || "(none)"}`);
  }

  stop(): void {
    this.unsubWiki?.(); this.unsubWiki = null;
    this.unsubAutomerge?.(); this.unsubAutomerge = null;
  }

  placeVerb(opts: VerbSignalRequest): string {
    return placeVerbInvocation(this.opts.adminVm, opts);
  }
}


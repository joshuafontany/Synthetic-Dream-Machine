/**
 * resolve-binding — resolver/minter for the `@personal` and `@draft` recipe
 * slots, keyed by (PersonGroup × recipe-fingerprint).
 *
 * Isomorphic + island-side (isomorphic-vessel epic). Lives in @lararium/keyhive
 * — the cap layer both platforms depend on — because the mint sequence needs
 * keyhive (`registerBag` + `delegate`), which lives only in the admin island
 * after Stage 1. Both platform admin-island entries call it from their
 * `resolveBinding` callback with the island Repo + admin composite + booted
 * keyhive. (It also still runs host-inline in `open-node-vessel` until the flip
 * removes the host keyhive.)
 *
 * Mint sequence (Q7 — orphan-tolerant idempotent mint): `repo.create()` →
 * `registerBag()` → `delegate()` → write binding tiddler. Not atomic; a crash
 * mid-sequence orphans a docUrl. Next boot recomputes the same fingerprint,
 * finds no binding, re-mints; the orphan stays unreferenced.
 *
 * Admin reads/writes go through the admin-bag CompositeStore (`get` /
 * `put({bag: ADMIN_BAG_ID})`) — host: `adminVm.composite`; island: `ctx.composite`.
 *
 * Canon: lar:///ha.ka.ba/@lararium/v0.1/api/personal-slot
 */

import {
  type LarDoc,
  type CompositeStore,
  type ChangeOrigin,
  ADMIN_BAG_ID,
  emptyLarDoc,
  mutableLarRecord,
  tiddlerText,
  canonicalJson,
} from "@lararium/mesh";
import type { CapabilityProvider } from "./capability-provider.js";

/**
 * Minimal Automerge-repo surface the minter needs — just `create`. Both the
 * node and browser `Repo` satisfy it structurally, so @lararium/keyhive avoids a
 * direct `@automerge/automerge-repo` dependency.
 */
export interface DocMinter {
  create<T = LarDoc>(initialValue: T): { readonly url: string };
}

/** The two binding kinds — one tiddler `kind` field per slot. */
export type BindingKind = "personal-binding" | "draft-binding";

export interface ResolveBindingArgs {
  /** Tiddler `kind` field value — distinguishes @personal from @draft bindings. */
  readonly kind: BindingKind;
  /** Admin tiddler-title prefix (PERSONAL_BINDINGS_PREFIX | DRAFT_BINDINGS_PREFIX). */
  readonly prefix: string;
  /** SHA-256 hex from computeRecipeFingerprint — the per-recipe binding key. */
  readonly fingerprint: string;
  /** Automerge repo that mints the bound doc on absent (host relay or island Repo). */
  readonly repo: DocMinter;
  /**
   * Admin-bag composite — reads existing bindings + writes new binding tiddlers.
   * Host-side: `adminVm.composite`; island-side: the worker's `ctx.composite`.
   */
  readonly adminStore: CompositeStore;
  /** Keyhive provider — registers the minted bag + delegates it to the PersonGroup. */
  readonly keyhive: CapabilityProvider;
  /**
   * PersonGroup AGENT Identifier hex (getAgent-resolvable) — the delegation
   * audience. NOT the group's DocumentId (that is the membership-check target).
   */
  readonly personGroupAgentIdHex: string;
  /** Vessel Individual hex — the binding tiddler's `minted-by` audit field. */
  readonly mintedByHex: string;
  /** Fingerprint inputs, stored verbatim as the `recipe-trace` audit field (Q5: keep). */
  readonly recipeTrace: { readonly wikiDocId: string; readonly libraryBagDocIds: readonly string[] };
}

export interface ResolveBindingResult {
  /** The bound `@personal` / `@draft` Automerge doc URL. */
  readonly url: string;
  /** true when this call minted a fresh doc; false on reuse-on-present. */
  readonly minted: boolean;
}

/**
 * Resolve the bound doc URL for a (PersonGroup × recipe-fingerprint) slot, or
 * mint + delegate + record it when absent.
 *
 * Reuse-on-present returns the stored URL WITHOUT minting or delegating — the
 * binding (and its delegation) already federated to this device through the
 * admin-doc keyhive layer. Reuse MUST NOT block boot on a doc not yet
 * decryptable on this device (the two-phase Keyhive window): the caller mounts
 * the URL and the island surfaces it when sync delivers the BeeKEM key. See
 * personal-slot#lifecycle "authorized-but-undecryptable window".
 */
export async function resolveOrMintBinding(args: ResolveBindingArgs): Promise<ResolveBindingResult> {
  const key = `${args.prefix}/${args.fingerprint}`;

  // Reuse-on-present — the binding tiddler already replicated to this device.
  const existing = tiddlerText(await args.adminStore.get(key));
  if (existing) return { url: existing, minted: false };

  // Mint-on-absent — Q7 idempotent sequence: create → registerBag → delegate → put.
  const handle = args.repo.create<LarDoc>(emptyLarDoc());

  // delegate() throws unless the bag's Keyhive Document already exists, so
  // registerBag mints it first. The minting device becomes implicit admin.
  await args.keyhive.registerBag(handle.url);

  // Bind to the STABLE agent-id. access: "admin" — POLA-correct grain for
  // co-edited view-state is "edit", but the live Keyhive gate exposes only
  // read | admin, so edit-intent rounds UP to admin as documented interim debt
  // (marginal authority ≈ 0; every PersonGroup device already holds admin on
  // @admin). Adopt "edit" the moment the gate accepts it. Debt: causal-islands.md.
  await args.keyhive.delegate({
    bagUrl:   handle.url,
    audience: args.personGroupAgentIdHex,
    access:   "admin",
  });

  // Record the binding in the admin doc — replicates to the operator's other
  // devices, where reuse-on-present finds it next boot.
  const origin: ChangeOrigin = { kind: "lares-verb", requestId: `binding-${args.fingerprint.slice(0, 8)}` };
  await args.adminStore.put(mutableLarRecord(key, {
    text:          handle.url,
    kind:          args.kind,
    fingerprint:   args.fingerprint,
    "recipe-trace": canonicalJson(args.recipeTrace),
    "minted-on":   new Date().toISOString(),
    "minted-by":   args.mintedByHex,
  }, "personal-bindings"), origin, { bag: ADMIN_BAG_ID });

  return { url: handle.url, minted: true };
}

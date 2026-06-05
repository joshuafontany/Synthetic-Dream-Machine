/**
 * resolve-binding — host-layer resolver/minter for the `@personal` and `@draft`
 * recipe slots, keyed by (PersonGroup × recipe-fingerprint).
 *
 * This is the composition-root helper Sprint 7 (S7.5 + S7.6) wires into
 * `open-node-vessel.ts` between `await adminVm.workerEa` and the primary
 * `vmManager.mountWiki(...)` call. It runs AFTER a real PersonGroup proves
 * verified (boot Gates B/C) and BEFORE the mount that needs the bound doc URLs.
 *
 * Layering law (personal-slot#vessel-boot-flow): binding-resolution MUST run at
 * the host / composition layer, NEVER inside `VesselIslandPool` — the pool stays
 * envelope-only and holds no repo/keyhive/admin-doc references. The host resolves
 * the URLs and passes them THROUGH `WikiBootContext` into the pool, which merely
 * adds them to the manifest `resolver` map.
 *
 * Mint sequence (Q7 — orphan-tolerant idempotent mint): `repo.create()` →
 * `registerBag()` → `delegate()` → write binding tiddler. Not atomic; a crash
 * mid-sequence orphans a docUrl. Next boot recomputes the same fingerprint,
 * finds no binding, re-mints; the orphan stays unreferenced. Acceptable until a
 * transactional store API exists.
 *
 * Admin reads/writes go through `adminHandle` directly (the ceremony-core grain),
 * NOT through `CompositeStore` — the boot composite carries no `@admin` layer and
 * `CompositeStore.get` accepts no bag option.
 *
 * Canon: lar:///ha.ka.ba/@lares/v0.1/api/lararium/personal-slot
 */

import type { Repo, DocHandle } from "@automerge/automerge-repo";
import {
  type LarDoc,
  emptyLarDoc,
  mutableLarRecord,
  tiddlerText,
  canonicalJson,
} from "@lararium/mesh";
import type { CapabilityProvider } from "@lararium/keyhive";

/** The two binding kinds — one tiddler `kind` field per slot. */
export type BindingKind = "personal-binding" | "draft-binding";

export interface ResolveBindingArgs {
  /** Tiddler `kind` field value — distinguishes @personal from @draft bindings. */
  readonly kind: BindingKind;
  /** Admin tiddler-title prefix (PERSONAL_BINDINGS_PREFIX | DRAFT_BINDINGS_PREFIX). */
  readonly prefix: string;
  /** SHA-256 hex from computeRecipeFingerprint — the per-recipe binding key. */
  readonly fingerprint: string;
  /** Vessel Automerge repo — mints the bound doc on absent. */
  readonly repo: Repo;
  /** Admin doc handle — reads existing bindings, writes new binding tiddlers. */
  readonly adminHandle: DocHandle<LarDoc>;
  /** Keyhive provider — registers the minted bag + delegates it to the PersonGroup. */
  readonly keyhive: CapabilityProvider;
  /**
   * PersonGroup AGENT Identifier hex (getAgent-resolvable) — the delegation
   * audience. NOT the group's DocumentId (that is the membership-check target).
   * The boot reads this from PERSON_GROUP_AGENT_ID_TIDDLER and HALTs at Gate B/C
   * if absent, so at this call site a real, membership-verified PersonGroup is
   * already present — never a phantom.
   */
  readonly personGroupAgentIdHex: string;
  /** Vessel Individual hex — the binding tiddler's `minted-by` audit field. */
  readonly mintedByHex: string;
  /** Fingerprint inputs, stored verbatim as the `recipe-trace` audit field (Q5: keep). */
  readonly recipeTrace: { readonly wikiDocId: string; readonly canonBagDocIds: readonly string[] };
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
 * admin-doc keyhive layer. Reuse MUST NOT block boot on a doc that is not yet
 * decryptable on this device (the two-phase Keyhive window): the caller mounts
 * the URL and the island surfaces it when sync delivers the BeeKEM key. See
 * personal-slot#lifecycle "authorized-but-undecryptable window".
 */
export async function resolveOrMintBinding(args: ResolveBindingArgs): Promise<ResolveBindingResult> {
  const key = `${args.prefix}/${args.fingerprint}`;

  // Reuse-on-present — the binding tiddler already replicated to this device.
  const existing = tiddlerText(args.adminHandle.doc()?.tiddlers?.[key]);
  if (existing) return { url: existing, minted: false };

  // Mint-on-absent — Q7 idempotent sequence: create → registerBag → delegate → put.
  const handle = args.repo.create<LarDoc>(emptyLarDoc());

  // delegate() throws unless the bag's Keyhive Document already exists, so
  // registerBag mints it first (keyhive-provider.ts:146). The minting device
  // becomes implicit admin via generateDocument semantics.
  await args.keyhive.registerBag(handle.url);

  // First non-probe delegate() caller in the repo. Bind to the STABLE agent-id
  // (never rotating key material). access: "admin" — POLA-correct grain for
  // co-edited view-state is "edit", but the live Keyhive gate exposes only
  // read | admin (keyhive-provider.ts:150), so edit-intent rounds UP to admin as
  // documented interim debt — marginal authority ≈ 0 since every PersonGroup
  // device already holds admin on @admin. Adopt "edit" the moment the gate
  // accepts it. Grain debt homed in causal-islands.md.
  await args.keyhive.delegate({
    bagUrl:   handle.url,
    audience: args.personGroupAgentIdHex,
    access:   "admin",
  });
  // The DELEGATED event lands in the EventStore and federates to the operator's
  // other devices via the admin-doc keyhive layer — no manual byte-shipping.

  // Record the binding in the admin doc — replicates to the operator's other
  // devices, where reuse-on-present finds it next boot.
  args.adminHandle.change((doc) => {
    doc.tiddlers[key] = mutableLarRecord(key, {
      text:          handle.url,
      kind:          args.kind,
      fingerprint:   args.fingerprint,
      "recipe-trace": canonicalJson(args.recipeTrace),
      "minted-on":   new Date().toISOString(),
      "minted-by":   args.mintedByHex,
    }, "personal-bindings");
  });

  return { url: handle.url, minted: true };
}

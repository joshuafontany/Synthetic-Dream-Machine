/**
 * resolve-binding.test.ts — S7.5/S7.6 @personal/@draft binding resolver.
 *
 * Proves the host-layer mint/reuse contract for the (PersonGroup ×
 * recipe-fingerprint) → docUrl bindings:
 *
 *   - mint-on-absent: create → registerBag → delegate → write binding tiddler
 *   - delegation binds to the PersonGroup AGENT id with access "admin"
 *     (edit-intent rounds up — grain debt, keyhive-provider.ts:150)
 *   - the binding tiddler carries the audit fields (kind/fingerprint/trace/by)
 *   - reuse-on-present: returns the stored url, mints/delegates nothing
 *
 * The cross-device + eventual-consistency matrix (S7.7) needs a two-vessel
 * harness and lives separately; this suite locks the single-vessel contract.
 *
 * Canon: lar:///ha.ka.ba/@lares/v0.1/api/lararium/personal-slot
 */

import { describe, test, expect } from "vitest";
import { Repo } from "@automerge/automerge-repo";
import {
  type LarDoc,
  emptyLarDoc,
  mutableLarRecord,
  tiddlerText,
  PERSONAL_BINDINGS_PREFIX,
  DRAFT_BINDINGS_PREFIX,
} from "@lararium/mesh";
import type { CapabilityProvider, DelegateArgs } from "@lararium/keyhive";
import { resolveOrMintBinding } from "../src/resolve-binding.js";

const AGENT_HEX  = "0xfeedface";
const MINTED_BY  = "0xdeadbeef";
const FINGERPRINT = "abc123fingerprint";

/** Recording fake — only the two methods resolveOrMintBinding touches. */
function makeFakeKeyhive() {
  const registered: string[] = [];
  const delegations: DelegateArgs[] = [];
  const provider = {
    async registerBag(bagUrl: string) {
      registered.push(bagUrl);
      return { docId: `doc-${bagUrl}` };
    },
    async delegate(args: DelegateArgs) {
      delegations.push(args);
      return { delegationId: "del-1", bytes: new Uint8Array() };
    },
  } as unknown as CapabilityProvider;
  return { provider, registered, delegations };
}

function commonArgs(repo: Repo, adminHandle: ReturnType<Repo["create"]>, keyhive: CapabilityProvider) {
  return {
    fingerprint:           FINGERPRINT,
    repo,
    adminHandle:           adminHandle as unknown as Parameters<typeof resolveOrMintBinding>[0]["adminHandle"],
    keyhive,
    personGroupAgentIdHex: AGENT_HEX,
    mintedByHex:           MINTED_BY,
    recipeTrace:           { wikiDocId: "automerge:wiki", canonBagDocIds: [] as readonly string[] },
  } as const;
}

describe("resolveOrMintBinding", () => {
  test("mint-on-absent: creates a doc, registers, delegates to PersonGroup admin, records the binding", async () => {
    const repo = new Repo();
    const adminHandle = repo.create<LarDoc>(emptyLarDoc());
    const { provider, registered, delegations } = makeFakeKeyhive();

    const result = await resolveOrMintBinding({
      ...commonArgs(repo, adminHandle, provider),
      kind: "personal-binding", prefix: PERSONAL_BINDINGS_PREFIX,
    });

    expect(result.minted).toBe(true);
    expect(result.url).toMatch(/^automerge:/);

    // registerBag THEN delegate, both targeting the minted doc url.
    expect(registered).toEqual([result.url]);
    expect(delegations).toHaveLength(1);
    expect(delegations[0]).toEqual({
      bagUrl:   result.url,
      audience: AGENT_HEX,    // stable PersonGroup agent id
      access:   "admin",      // edit-intent rounds up to admin (grain debt)
    });

    // Binding tiddler recorded in the admin doc under the personal prefix.
    const key = `${PERSONAL_BINDINGS_PREFIX}/${FINGERPRINT}`;
    const rec = adminHandle.doc()?.tiddlers?.[key];
    expect(tiddlerText(rec)).toBe(result.url);
    expect(rec?.tiddler.kind).toBe("personal-binding");
    expect(rec?.tiddler.fingerprint).toBe(FINGERPRINT);
    expect(rec?.tiddler["minted-by"]).toBe(MINTED_BY);
    expect(typeof rec?.tiddler["recipe-trace"]).toBe("string");
  });

  test("reuse-on-present: returns the stored url, mints/delegates nothing", async () => {
    const repo = new Repo();
    const adminHandle = repo.create<LarDoc>(emptyLarDoc());
    const { provider, registered, delegations } = makeFakeKeyhive();

    // Pre-seed an existing binding tiddler.
    const key = `${DRAFT_BINDINGS_PREFIX}/${FINGERPRINT}`;
    const existingUrl = "automerge:already-bound";
    adminHandle.change((doc) => {
      doc.tiddlers[key] = mutableLarRecord(key, { text: existingUrl }, "test-seed");
    });

    const result = await resolveOrMintBinding({
      ...commonArgs(repo, adminHandle, provider),
      kind: "draft-binding", prefix: DRAFT_BINDINGS_PREFIX,
    });

    expect(result).toEqual({ url: existingUrl, minted: false });
    expect(registered).toEqual([]);     // no mint
    expect(delegations).toEqual([]);    // no delegation
  });

  test("@personal and @draft bind under parallel prefixes for the same fingerprint", async () => {
    const repo = new Repo();
    const adminHandle = repo.create<LarDoc>(emptyLarDoc());
    const { provider } = makeFakeKeyhive();

    const personal = await resolveOrMintBinding({
      ...commonArgs(repo, adminHandle, provider),
      kind: "personal-binding", prefix: PERSONAL_BINDINGS_PREFIX,
    });
    const draft = await resolveOrMintBinding({
      ...commonArgs(repo, adminHandle, provider),
      kind: "draft-binding", prefix: DRAFT_BINDINGS_PREFIX,
    });

    expect(personal.url).not.toBe(draft.url);   // two distinct docs
    const doc = adminHandle.doc();
    expect(tiddlerText(doc?.tiddlers?.[`${PERSONAL_BINDINGS_PREFIX}/${FINGERPRINT}`])).toBe(personal.url);
    expect(tiddlerText(doc?.tiddlers?.[`${DRAFT_BINDINGS_PREFIX}/${FINGERPRINT}`])).toBe(draft.url);
  });
});

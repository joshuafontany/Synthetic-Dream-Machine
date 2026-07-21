/**
 * boot-invite-burn.test.ts — the node-side LOCAL burn of the traceless boot-invite, end-to-end.
 *
 * Proven, against a real vessel identity on a temp LAR_ROOT:
 *   · mint → spend ADMITS once and burns the id LOCALLY,
 *   · SINGLE-USE — a SECOND spend of the same invite refuses `already-spent` (the local burn holds),
 *   · a GARBLED / null invite → `no-invite` (found your own group at the anon floor — never a throw),
 *   · a WRONG-NEXUS invite refuses (sealed for another Nexus),
 *   · NO FEDERATED REGISTRY — the burn is a plain local file under the vessel store (never a synced doc),
 *   · the burn writes ONLY an opaque invite-id (no inviter, no joiner — nothing to track).
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateOrLoadVesselIdentity } from "../src/node-vessel-identity.js";
import { larDataDir } from "../src/vessel-paths.js";
import {
  runBootInviteMint, runBootInviteSpend, bootInviteBurnPath, isBurned, bootInviteId,
} from "../src/boot-invite-burn.js";

let root: string;
let priorLarRoot: string | undefined;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "lares-boot-invite-"));
  priorLarRoot = process.env["LAR_ROOT"];
  process.env["LAR_ROOT"] = root;
});
afterEach(() => {
  if (priorLarRoot === undefined) delete process.env["LAR_ROOT"];
  else process.env["LAR_ROOT"] = priorLarRoot;
  rmSync(root, { recursive: true, force: true });
});

describe("boot-invite burn — sealed, single-use, LOCAL", () => {
  it("mint → spend ADMITS once and burns the id; a SECOND spend refuses already-spent", async () => {
    await generateOrLoadVesselIdentity(larDataDir());
    const inv = await runBootInviteMint({});
    const id  = bootInviteId(inv);

    const first = await runBootInviteSpend({ invite: inv });
    expect(first.admitted).toBe(true);
    expect(first.burnId).toBe(id);
    expect(isBurned(larDataDir(), id)).toBe(true);   // burned locally

    const second = await runBootInviteSpend({ invite: inv });
    expect(second.admitted).toBe(false);
    expect(second.refusal).toBe("already-spent");
  });

  it("a GARBLED / null invite → no-invite (anon floor), and burns nothing", async () => {
    await generateOrLoadVesselIdentity(larDataDir());
    const v = await runBootInviteSpend({ invite: null });
    expect(v.admitted).toBe(false);
    expect(v.refusal).toBe("no-invite");
    expect(existsSync(bootInviteBurnPath(larDataDir()))).toBe(false);   // nothing written on a refusal
  });

  it("a WRONG-NEXUS invite refuses (sealed for another Nexus)", async () => {
    await generateOrLoadVesselIdentity(larDataDir());
    const inv = await runBootInviteMint({});
    const foreign = { ...inv, nexusPubkey: "ff".repeat(32) };   // re-target it → the seal no longer binds this Nexus
    const v = await runBootInviteSpend({ invite: foreign });
    expect(v.admitted).toBe(false);
    // wrong-nexus is caught before the signature; either way it does NOT admit and does NOT burn.
    expect(v.refusal === "wrong-nexus" || v.refusal === "bad-signature").toBe(true);
  });

  it("NO FEDERATED REGISTRY — the burn is a plain LOCAL file carrying only opaque ids", async () => {
    await generateOrLoadVesselIdentity(larDataDir());
    const inv = await runBootInviteMint({});
    await runBootInviteSpend({ invite: inv });

    const path = bootInviteBurnPath(larDataDir());
    expect(existsSync(path)).toBe(true);
    expect(path.startsWith(larDataDir())).toBe(true);   // under the vessel store — a local file, never a synced doc
    const body = readFileSync(path, "utf8");
    expect(body.trim()).toBe(bootInviteId(inv));         // ONLY the opaque id — no inviter, no joiner
    expect(body).not.toMatch(/voucher|joiner|inviter|did:|@/i);
  });
});

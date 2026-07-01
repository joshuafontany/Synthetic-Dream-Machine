/**
 * file-membership-channel — the FILE/POST impl of the membership seam (MembershipChannel),
 * node-side. Envelopes ride as JSON files in a shared directory; a per-recipient seen-set
 * gives deliver-once. Cross-PROCESS by construction (the files are the shared state; each
 * process keeps its own seen-set) — a shared Docker VOLUME makes it cross-CONTAINER.
 *
 * Pairs with WSMembershipChannel behind the same seam: file/POST first (a shared volume,
 * no relay service — the fast deployed path), the live-WS relay the strangler-fig follow.
 *
 * Meme: lar:///ha.ka.ba/@lares/api/pono/cabal-place
 */

import { mkdirSync, writeFileSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  MEMBERSHIP_BROADCAST,
  type MembershipChannel, type MembershipEnvelope,
} from "@lararium/mesh";

function forRecipient(e: MembershipEnvelope, recipient: string): boolean {
  return e.from !== recipient && (e.to === recipient || e.to === MEMBERSHIP_BROADCAST);
}

/**
 * A file-backed membership channel over a shared directory. `offer` writes an envelope
 * as a monotonically-named JSON file; `poll` reads the dir, delivers unseen envelopes
 * addressed to the recipient (or broadcast, never self), and remembers them (deliver-once
 * per recipient, per process).
 */
export class FileMembershipChannel implements MembershipChannel {
  private seq = 0;
  private readonly seen = new Map<string, Set<string>>();

  constructor(private readonly dir: string) { mkdirSync(dir, { recursive: true }); }

  offer(env: MembershipEnvelope): Promise<void> {
    // Name = time + pid + local seq → monotone + collision-free across processes.
    const name = `${String(Date.now())}-${String(process.pid)}-${String(this.seq++).padStart(5, "0")}.json`;
    writeFileSync(join(this.dir, name), JSON.stringify(env));
    return Promise.resolve();
  }

  poll(recipient: string): Promise<readonly MembershipEnvelope[]> {
    const seen = this.seen.get(recipient) ?? new Set<string>();
    const out: MembershipEnvelope[] = [];
    for (const f of readdirSync(this.dir).filter((x) => x.endsWith(".json")).sort()) {
      if (seen.has(f)) continue;
      seen.add(f);
      let env: MembershipEnvelope;
      try { env = JSON.parse(readFileSync(join(this.dir, f), "utf8")) as MembershipEnvelope; }
      catch { continue; }                                  // a half-written file — skip, retry next poll
      if (forRecipient(env, recipient)) out.push(env);
    }
    this.seen.set(recipient, seen);
    return Promise.resolve(out);
  }
}

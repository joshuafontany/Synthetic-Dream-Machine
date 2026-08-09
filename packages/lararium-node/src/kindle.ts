/**
 * kindle — the cold path: pull a Herm's HELD bulb and kindle a NEW SOVEREIGN hearth, headless.
 *
 * `lares kindle <herm-url>` runs this: PULL the all-public bulb off the Herm's public floor → VALIDATE the genesis
 * bytes → MATERIALIZE the @oracle island → the DEVICE mints its OWN Ed25519 → build the cold-boot ceremony tiddlers
 * on THAT key → seed the fresh social docs. The kindled hearth stands SOVEREIGN from first breath: it certifies
 * itself with a key IT minted, never one the Herm supplied.
 *
 * SERVE FIRE, NEVER KEY (load-bearing, by PLACEMENT). The bulb carries genesis + engine + grammar — NEVER a signing
 * key. `generateOrLoadVesselIdentity` mints the device's OWN Ed25519 HERE, on the cold device; `buildCeremonyTiddlers`
 * runs on THAT verifying key. The Herm's process never mints, holds, or touches the kindled identity — placement
 * forbids it (no key rides the bulb to supply). So two devices kindling the SAME bulb become two DISTINCT sovereigns
 * (distinct did:keys), never one conscripted identity.
 *
 * OPEN PATH (bulb ⊥ stolon). Kindle births a STRANGER's own sovereign hearth (permissionless growth) — distinct from
 * the stolon, which invites a device into YOUR fleet (the closed path). Kindle joins no fleet: it seeds a FRESH
 * social plane (its own @identities/@circles), never the Herm's.
 *
 * SCOPE. `kindleFromBulb` runs the LIGHT cold-boot ceremony — @oracle island + the device's own key + the identity/
 * circle tiddlers. A top-level `lares kindle <herm-url>` command that yields a directly `lares serve`-able hearth
 * additionally bridges `runFoundingCeremony` (the @daemon + keyhive + sentinel seeding), writes the device's own
 * the social bootstrap (the vessel's own doc-url map), and guards a fresh device (refuse when an identity already
 * stands). That command touches the lares-cli CLI↔MCP↔VERB_SEATS parity fixture — a gated follow, not this keel.
 *
 * Meme: lar:///ha.ka.ba/lararium/node/kindle
 */

import type { Repo, DocHandle } from "@automerge/automerge-repo";
import {
  materializeGenesisDoc, materializeGenesisIsland, validateGenesisBytes,
  buildCeremonyTiddlers, didKeyFromVerifyingKey,
  emptyLarDoc, IDENTITIES_DOC_URI,
  type LarDoc,
} from "@lararium/mesh";
import { assembleBulb, type BulbArtifact, type BulbManifest } from "./bulb.js";
import { generateOrLoadVesselIdentity } from "./node-vessel-identity.js";
import { writeCasEntriesFs, casDirForStorage } from "./node-cas.js";

/** The HTTP transport a pull rides — injected so a test drives it in-process (no real socket needed). */
export interface BulbPullTransport {
  /** GET a JSON body at a path under the Herm base (e.g. `/bulb/manifest`). */
  getJson(path: string): Promise<unknown>;
  /** GET raw bytes at a path (e.g. `/bulb/<cid>.bin`). */
  getBytes(path: string): Promise<Uint8Array>;
}

/**
 * PULL a bulb over a transport: fetch the manifest, then every named blob, then `assembleBulb` (which re-verifies
 * `sha256(bytes) == cid` on each — a tampered/absent blob throws, never a partial bulb). Secret-free, content-address
 * integrity only. Returns the reconstructed bulb, ready to kindle.
 */
export async function pullBulb(transport: BulbPullTransport): Promise<BulbArtifact> {
  const manifest = await transport.getJson("/bulb/manifest") as BulbManifest;
  const cids = [manifest.seedCid, manifest.bootstrapCid, manifest.casManifestCid, ...manifest.casCids];
  const cache = new Map<string, Uint8Array>();
  for (const cid of cids) {
    if (cache.has(cid)) continue;
    cache.set(cid, await transport.getBytes(`/bulb/${cid}.bin`));
  }
  return assembleBulb(manifest, (cid) => cache.get(cid) ?? null);
}

/** A real-HTTP transport over a Herm base url (`http://host:port`). Uses the runtime `fetch`. */
export function httpBulbTransport(baseUrl: string): BulbPullTransport {
  const base = baseUrl.replace(/\/+$/, "");
  return {
    async getJson(path: string): Promise<unknown> {
      const res = await fetch(base + path);
      if (!res.ok) throw new Error(`[kindle] GET ${path} → ${res.status}`);
      return res.json();
    },
    async getBytes(path: string): Promise<Uint8Array> {
      const res = await fetch(base + path);
      if (!res.ok) throw new Error(`[kindle] GET ${path} → ${res.status}`);
      return new Uint8Array(await res.arrayBuffer());
    },
  };
}

/** What a kindle produces — the sovereign hearth's OWN identity + the materialized island/social handles. */
export interface KindleResult {
  /** The kindled hearth's did:key — derived from the DEVICE's OWN verifying key (never the Herm's). */
  readonly did:                string;
  /** The device's own Ed25519 verifying key hex — minted on THIS device, never supplied by the Herm. */
  readonly deviceVerifyingKey: string;
  /** The materialized @oracle island url (the engine + genesis the bulb carried). */
  readonly oracleUrl:          string;
  /** The fresh @identities doc url the ceremony seeded (a SOVEREIGN social plane, not the Herm's). */
  readonly identitiesUrl:      string;
  /** The fresh @circles doc url the ceremony seeded. */
  readonly circlesUrl:         string;
}

/**
 * Kindle a sovereign hearth from a pulled bulb, headless. Validates the genesis, mirrors the FIRE bytes into the
 * device's runtime CAS, materializes the @oracle island, MINTS the device's OWN Ed25519 (never the Herm's), builds
 * the cold-boot ceremony on that key, and seeds fresh social docs. Returns the sovereign's own identity + handles.
 *
 * @param repo             the cold device's OWN repo (its OWN storage — the Herm's repo never touches this).
 * @param storageDir       the device's storage root (the runtime CAS + the identity home both site under it).
 */
export async function kindleFromBulb(args: {
  readonly bulb:        BulbArtifact;
  readonly repo:        Repo;
  readonly storageDir:  string;
  readonly displayName?: string;
}): Promise<KindleResult> {
  const { bulb, repo, storageDir } = args;

  // 1. VALIDATE the genesis the bulb carries (Automerge-loadable, TW5 core + packed Lares plugin present).
  const bytes = materializeGenesisDoc(bulb.seed);
  validateGenesisBytes(bytes, "kindle");

  // Mirror the FIRE bytes (engine + plugins) into the device's runtime CAS so its island boots on them.
  writeCasEntriesFs(bulb.casEntries, casDirForStorage(storageDir));

  // 2. MATERIALIZE the @oracle island fresh from the seed, under its deterministic id (the engine + genesis).
  const island = await materializeGenesisIsland(repo, bulb.seed, "kindle");

  // 3. the DEVICE mints its OWN Ed25519 — HERE, on the cold device. The Herm never sees this key (serve fire, never
  //    key). A fresh storageDir → a fresh keypair → a NEW sovereign; the bulb supplies NO key to source it from.
  const identity = await generateOrLoadVesselIdentity(storageDir);

  // 4. build the cold-boot ceremony ON the device's own verifying key — the identity did:key derives from IT.
  const ceremony = buildCeremonyTiddlers(identity.verifyingKey, args.displayName);

  // 5. seed FRESH social docs (a SOVEREIGN plane — not the Herm's fleet) and write the ceremony tiddlers in.
  const identitiesHandle: DocHandle<LarDoc> = repo.create<LarDoc>(emptyLarDoc());
  const circlesHandle:    DocHandle<LarDoc> = repo.create<LarDoc>(emptyLarDoc());
  for (const t of ceremony) {
    const handle = t.bag === IDENTITIES_DOC_URI ? identitiesHandle : circlesHandle;
    handle.change((doc) => {
      if (!doc.tiddlers[t.title]) {
        doc.tiddlers[t.title] = { tiddler: { title: t.title, ...t.fields }, meta: { authority: t.authority } };
      }
    });
  }

  return {
    did:                didKeyFromVerifyingKey(identity.verifyingKey),
    deviceVerifyingKey: identity.verifyingKey,
    oracleUrl:          island.url,
    identitiesUrl:      identitiesHandle.url,
    circlesUrl:         circlesHandle.url,
  };
}

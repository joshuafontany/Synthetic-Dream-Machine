/**
 * kahu-blind-node (S1 — the civic-custody crown) — a KAHU node running public infrastructure HOLDS a
 * citizen's sealed content, yet CANNOT read it. Custody ⊥ materialization; the node is an MLS Delivery
 * Service, never an Auth root. The difference between "runs the temple" and "reads the confession", made
 * a container exit code — a key the kahu structurally never held, not a policy a subpoena breaks.
 *
 * The CITIZEN seals private content into its OWN bag and reads it back (it holds the key); the KAHU is
 * handed the ciphertext AND the bag's doc-id (full store access, it relays the bytes) and MUST FAIL to
 * decrypt — it was never a member, so no key exists for it. The KAHU carries the verdict.
 *
 * Env: LAR_KAHU_ROLE (citizen|kahu) · LAR_KAHU_SHARED (req, shared volume)
 * Meme: lar:///ha.ka.ba/lares/api/pono/cabal-realm#the-seal · project_civic_scale_capability_models
 */

import { KeyhiveProvider, InMemoryEventStore } from "@lararium/keyhive";
import { envOf, ProbeVolume, runProbeRole } from "./probe-ceremony.js";

const SHARED = envOf("LAR_KAHU_SHARED");
const ROLE   = envOf("LAR_KAHU_ROLE", "kahu");
const CITIZEN_BAG = "lar:///ha.ka.ba/bags/@catalog/a-citizens-private-note";
const SECRET = "a citizen's secret the custodian must never read";
const seedOf = (n: number): Uint8Array => new Uint8Array(32).fill(n);

async function runCitizen(vol: ProbeVolume): Promise<void> {
  const citizen = new KeyhiveProvider();
  await citizen.init({ seed: seedOf(5), eventStore: new InMemoryEventStore() });

  // Seal private content into the citizen's OWN bag — its own key, no group, the anon floor.
  const { docId } = await citizen.registerBag(CITIZEN_BAG);
  const ciphertext = await citizen.encryptContent(CITIZEN_BAG, new TextEncoder().encode(SECRET));
  const own = new TextDecoder().decode(await citizen.decryptContent(CITIZEN_BAG, ciphertext));
  if (own !== SECRET) { console.log(`[kahu-blind] CITIZEN ✗ could not read its own content`); process.exit(1); }
  console.log(`[kahu-blind] CITIZEN ✓ sealed + read its own private content`);

  // Hand the KAHU everything a relaying custodian holds: the ciphertext bytes AND the bag's doc-id.
  vol.putBytes("ciphertext", ciphertext);
  vol.putText("doc-id", docId);
  vol.mark("citizen-sealed");

  await vol.waitFor("kahu-done", "the kahu's verdict");
  console.log(`[kahu-blind] CITIZEN done`);
  await citizen.dispose();
}

async function runKahu(vol: ProbeVolume): Promise<void> {
  const kahu = new KeyhiveProvider();
  await kahu.init({ seed: seedOf(200), eventStore: new InMemoryEventStore() });

  // The kahu holds + relays the citizen's bytes (full store access), and knows the doc-id.
  await vol.waitFor("citizen-sealed", "the citizen to seal");
  const ciphertext = vol.readBytes("ciphertext");
  const docId = vol.readText("doc-id");
  kahu.adoptBag(CITIZEN_BAG, docId);   // the custodian KNOWS the bag — it relays it
  console.log(`[kahu-blind] KAHU holds the ciphertext (${String(ciphertext.length)}B) + doc ${docId.slice(0, 16)}…`);

  // The custodian attempts to open what it holds. It was NEVER a member — no key exists for it.
  let blind = false;
  try {
    const got = new TextDecoder().decode(await kahu.decryptContent(CITIZEN_BAG, ciphertext));
    console.log(`[kahu-blind] KAHU ✗ CUSTODY BREACH — read the citizen's content: "${got}"`);
  } catch { blind = true; }
  vol.mark("kahu-done");
  await kahu.dispose();

  if (!blind) { console.log(`[kahu-blind] KAHU ✗ SECURITY FAILURE — a custodian read a citizen's secret`); process.exit(1); }
  console.log(`[kahu-blind] KAHU ✓ holds the bytes, cannot open them — Delivery-Service, never Auth-Root`);
  console.log(`[kahu-blind] KAHU ✓ CUSTODY ⊥ MATERIALIZATION — the temple-keeper cannot read the confession`);
  process.exit(0);
}

if (!SHARED) throw new Error("LAR_KAHU_SHARED required");
const vol = new ProbeVolume(SHARED, ROLE);
await runProbeRole("LAR_KAHU_ROLE", { citizen: () => runCitizen(vol), kahu: () => runKahu(vol) });
if (ROLE === "citizen") process.exit(0);

/**
 * kahu-blind-node (S1 — the civic-custody crown) — proves the whole civic vow as a container exit code:
 * a KAHU node running public infrastructure HOLDS a citizen's sealed content, yet CANNOT read it. Custody
 * ⊥ materialization; the node is an MLS Delivery Service, never an Auth root. This is the difference
 * between "runs the temple" and "reads the confession", made cryptographic — no policy promise a
 * subpoena breaks, a key the kahu structurally never held.
 *
 * Two roles over a shared volume: the CITIZEN seals private content into its OWN PersonaGroup bag and
 * reads it back (it holds the key); the KAHU is handed the ciphertext AND the bag's doc-id (it holds +
 * relays the bytes, full "disk access" to its own store) and MUST FAIL to decrypt — it was never a
 * member, so no key exists for it. The KAHU carries the verdict (exit 0 = the custodian is blind).
 *
 * Env: LAR_KAHU_ROLE (citizen|kahu) · LAR_KAHU_SHARED (req, shared volume)
 * Meme: lar:///ha.ka.ba/lares/api/pono/cabal-place#the-seal · project_civic_scale_capability_models
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { KeyhiveProvider, InMemoryEventStore } from "@lararium/keyhive";

const envOf = (k: string, d = ""): string => process.env[k] ?? d;
const ROLE   = envOf("LAR_KAHU_ROLE", "kahu");
const SHARED = envOf("LAR_KAHU_SHARED");
const CITIZEN_BAG = "lar:///ha.ka.ba/bags/@catalog/a-citizens-private-note";
const SECRET = "a citizen's secret the custodian must never read";
const seedOf = (n: number): Uint8Array => new Uint8Array(32).fill(n);
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const b64 = (u: Uint8Array): string => Buffer.from(u).toString("base64");
const unb64 = (s: string): Uint8Array => new Uint8Array(Buffer.from(s, "base64"));
const P = (name: string): string => join(SHARED, name);

async function waitFor(name: string, label: string): Promise<string> {
  for (let i = 0; i < 240; i++) {
    if (existsSync(P(name))) return readFileSync(P(name), "utf8");
    if (i === 0) console.log(`[kahu-blind] (${ROLE}) awaiting ${label}…`);
    await sleep(500);
  }
  throw new Error(`timeout awaiting ${label}`);
}

async function runCitizen(citizen: KeyhiveProvider): Promise<void> {
  // The citizen seals private content into its OWN bag — its own key, no group, the anon floor.
  const { docId } = await citizen.registerBag(CITIZEN_BAG);
  const ciphertext = await citizen.encryptContent(CITIZEN_BAG, new TextEncoder().encode(SECRET));

  // The citizen reads its OWN content — it holds the key.
  const own = new TextDecoder().decode(await citizen.decryptContent(CITIZEN_BAG, ciphertext));
  if (own !== SECRET) { console.log(`[kahu-blind] CITIZEN ✗ could not read its own content`); process.exit(1); }
  console.log(`[kahu-blind] CITIZEN ✓ sealed + read its own private content`);

  // Hand the KAHU everything a relaying custodian holds: the ciphertext bytes AND the bag's doc-id.
  writeFileSync(P("ciphertext"), b64(ciphertext));
  writeFileSync(P("doc-id"), docId);
  writeFileSync(P("citizen-sealed"), "ok");

  await waitFor("kahu-done", "the kahu's verdict");
  console.log(`[kahu-blind] CITIZEN done`);
}

async function runKahu(kahu: KeyhiveProvider): Promise<void> {
  // The kahu holds + relays the citizen's bytes (full access to its OWN store), and knows the doc-id.
  await waitFor("citizen-sealed", "the citizen to seal");
  const ciphertext = unb64(readFileSync(P("ciphertext"), "utf8"));
  const docId = readFileSync(P("doc-id"), "utf8");
  kahu.adoptBag(CITIZEN_BAG, docId);   // the custodian KNOWS the bag — it relays it
  console.log(`[kahu-blind] KAHU holds the ciphertext (${String(ciphertext.length)}B) + doc ${docId.slice(0, 16)}…`);

  // The custodian attempts to open what it holds. It was NEVER a member — no key exists for it.
  let blind = false;
  try {
    const got = new TextDecoder().decode(await kahu.decryptContent(CITIZEN_BAG, ciphertext));
    console.log(`[kahu-blind] KAHU ✗ CUSTODY BREACH — read the citizen's content: "${got}"`);
  } catch {
    blind = true;
  }
  writeFileSync(P("kahu-done"), "ok");

  if (!blind) { console.log(`[kahu-blind] KAHU ✗ SECURITY FAILURE — a custodian read a citizen's secret`); process.exit(1); }
  console.log(`[kahu-blind] KAHU ✓ holds the bytes, cannot open them — Delivery-Service, never Auth-Root`);
  console.log(`[kahu-blind] KAHU ✓ CUSTODY ⊥ MATERIALIZATION — the temple-keeper cannot read the confession`);
  process.exit(0);
}

async function main(): Promise<void> {
  if (!SHARED) throw new Error("LAR_KAHU_SHARED required");
  mkdirSync(SHARED, { recursive: true });
  const provider = new KeyhiveProvider();
  await provider.init({ seed: seedOf(ROLE === "citizen" ? 5 : 200), eventStore: new InMemoryEventStore() });
  if (ROLE === "citizen") await runCitizen(provider);
  else await runKahu(provider);
  await provider.dispose();
  if (ROLE === "citizen") process.exit(0);
}

main().catch((e) => { console.error(`[kahu-blind] (${ROLE}) ✗ FATAL:`, e); process.exit(1); });

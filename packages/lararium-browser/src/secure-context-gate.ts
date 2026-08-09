/**
 * secure-context-gate — refuse to mint an identity where the browser will not give one, and SAY WHY.
 *
 * ── THE FAILURE THIS EXISTS TO STOP ──────────────────────────────────────────────────────────────
 * A browser grants `crypto.subtle` and OPFS only in a secure context: `https://` with a trusted cert, or
 * `localhost`. A family phone reaching a home node at `http://192.168.1.x` gets neither, so the vessel
 * cannot mint its key and never boots.
 *
 * That much the design already knows. What makes it worth a gate is HOW it fails without one. Reaching
 * `crypto.subtle.generateKey` off a secure context throws a TypeError about reading a property of
 * undefined — a message that names neither the cause nor the cure, arriving on a phone, to a person who
 * did nothing wrong. And the WASM signer beside it fails worse: when its WebCrypto path throws it falls
 * back to an in-memory keypair that IS extractable, surfaced only through a variant getter nobody reads.
 * A quiet degrade toward LESS safety, on the exact path a household takes.
 *
 * So the gate reads the context BEFORE any key work, and answers with the reason and the cure rather than
 * with a stack trace. A refusal a person can act on beats a failure they can only photograph.
 *
 * ── AND THE SECOND SILENCE: STORAGE THAT VANISHES ───────────────────────────────────────────────
 * A minted key lives in IndexedDB, and browsers evict it. WebKit deletes ALL script-writable storage for
 * an origin after seven days of browser use without interaction there — which is an occasionally-opened
 * vessel disappearing, with no event and no warning. Home-screen web apps are exempt, which turns
 * "install this" from a nicety into part of the identity's durability story.
 *
 * `navigator.storage.persist()` asks for the eviction-resistant class. It costs one call, it answers
 * honestly, and nothing in this tree was asking. The probe below asks and reports, so a vessel can say
 * what its own storage is worth rather than assuming.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/secure-context
 */

export type SecureContextVerdict = "ready" | "insecure-origin" | "no-subtle" | "no-ed25519";

export interface SecureContextReading {
  readonly verdict: SecureContextVerdict;
  /** True only when a key may actually be minted here. */
  readonly canMint: boolean;
  /** What holds, and what would change it — written for a person, not a log. */
  readonly reason: string;
}

/** The host surfaces the gate reads. Injected so every branch drives from a test. */
export interface SecureContextHost {
  readonly isSecureContext: boolean;
  readonly hasSubtle: boolean;
  /** Origin as the browser sees it, for a message that names the actual address. */
  readonly origin: string;
}

/** Read the live browser. Absent globals read as absent capability rather than throwing. */
export function ambientHost(): SecureContextHost {
  const g = globalThis as unknown as {
    isSecureContext?: boolean;
    crypto?: { subtle?: unknown };
    location?: { origin?: string };
  };
  return {
    isSecureContext: g.isSecureContext === true,
    hasSubtle: typeof g.crypto?.subtle === "object" && g.crypto?.subtle !== null,
    origin: g.location?.origin ?? "(unknown origin)",
  };
}

/**
 * May this context mint a vessel identity?
 *
 * Ordered so the reason names the ROOT cause: an insecure origin is why `crypto.subtle` is missing, so
 * reporting the missing API first would send a reader after the symptom.
 */
export function readSecureContext(host: SecureContextHost = ambientHost()): SecureContextReading {
  if (!host.isSecureContext) {
    return {
      verdict: "insecure-origin",
      canMint: false,
      reason:
        `${host.origin} is not a secure context, so this browser withholds crypto.subtle and no key can ` +
        `be minted here. Reach this vessel over https with a trusted certificate, or over localhost.`,
    };
  }
  if (!host.hasSubtle) {
    return {
      verdict: "no-subtle",
      canMint: false,
      reason:
        `${host.origin} reads as a secure context, yet crypto.subtle is absent — an unusual pairing that ` +
        `points at a stripped or sandboxed environment rather than at the address.`,
    };
  }
  return {
    verdict: "ready",
    canMint: true,
    reason: `${host.origin} is a secure context and offers crypto.subtle`,
  };
}

/**
 * Throw PRECISELY when a context cannot mint, naming the cause and the cure.
 *
 * Called before any key work, so the failure a household meets says what to do instead of naming a
 * property of undefined. Never a silent degrade: refusing to mint keeps a vessel honest about having no
 * identity, where falling back to a weaker key would give it one nobody chose.
 */
export function assertCanMint(host: SecureContextHost = ambientHost()): void {
  const reading = readSecureContext(host);
  if (!reading.canMint) {
    throw new Error(`[vessel] cannot mint an identity here — ${reading.reason}`);
  }
}

export type StoragePersistence = "persistent" | "best-effort" | "unknown";

export interface StorageReading {
  readonly persistence: StoragePersistence;
  readonly reason: string;
}

/** The storage surface the probe reads — injected so a test drives a browser that has none. */
export interface StorageHost {
  persist?(): Promise<boolean>;
  persisted?(): Promise<boolean>;
}

/** Read `navigator.storage`, or nothing where the browser offers none. */
export function ambientStorage(): StorageHost | undefined {
  return (globalThis as unknown as { navigator?: { storage?: StorageHost } }).navigator?.storage;
}

/**
 * Ask for the eviction-resistant storage class and report what was granted.
 *
 * Firefox prompts the user; Chrome and Safari decide from interaction history without asking. So a
 * refusal reads as a fact about this origin's standing rather than as an error, and the vessel reports it
 * instead of assuming durability it does not hold.
 *
 * BEST-EFFORT IS NOT NOTHING — it means eviction under storage pressure, all-or-nothing per origin, and
 * on WebKit a hard seven-day cap without interaction. A vessel that knows it sits there can say so; one
 * that never asked cannot.
 */
export async function requestDurableStorage(store: StorageHost | undefined = ambientStorage()): Promise<StorageReading> {
  if (!store || typeof store.persisted !== "function") {
    return {
      persistence: "unknown",
      reason: "this browser exposes no storage-persistence API, so eviction class cannot be read",
    };
  }
  try {
    if (await store.persisted()) {
      return { persistence: "persistent", reason: "storage is persistent — eviction under pressure skips this origin" };
    }
    if (typeof store.persist === "function" && (await store.persist())) {
      return { persistence: "persistent", reason: "storage persistence granted on request" };
    }
    return {
      persistence: "best-effort",
      reason:
        "storage is best-effort — this origin may be evicted under pressure, and WebKit clears it after " +
        "seven days without interaction. Installing to the home screen exempts it from that clock.",
    };
  } catch {
    return { persistence: "unknown", reason: "the storage-persistence probe threw; eviction class stays unread" };
  }
}

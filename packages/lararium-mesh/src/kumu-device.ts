/**
 * kumu-device.ts — KumuDeviceSpec, KumuListenable, KumuSubscribable, KumuInstanceRef.
 *
 * Type-level device contract. Spec layer only — no runtime dispatch.
 * Runtime reaction dispatch: reaction-router.ts (nalu-driven TW5 startup module).
 * Runtime routing table: ReactionGraph (reaction-graph.ts).
 *
 * ## Verse 5.6+ device model
 *
 * A kumu device meme is the Lararium creative_device equivalent.
 *   `@editable` property  → ahu slot URI in KumuDeviceSpec.slots
 *   listenable(T) field   → KumuListenable (verseKind: "listenable"; awaitable + subscribable)
 *   event(T) field        → KumuListenable (verseKind: "event"; signalable + awaitable only)
 *   public input method   → KumuSubscribable (INPUT fn pin)
 *   class(P)              → control:has edge → KumuDeviceSpec.componentTypes
 *   class(P, I, J)        → control:has edges → KumuDeviceSpec.componentTypes
 *   DEB editor wire       → papalohe pranala edge (instance-level ReactionBinding)
 *   Await(event)<suspends>→ ReactionGraph.subscribeOnce() (kukali primitive)
 *   `using { /Path }`     → module namespace import — NOT trait composition
 *
 * Verse concurrency sigil map:
 *   branch → lele  — structured fire-and-continue
 *   sync   → hui   — await-all
 *   race   → holo  — first wins, losers cancel
 *   rush   → puka  — first wins, losers continue
 *
 * ## Three semantic layers (do not conflate)
 *
 *   Ahu-slot tree (document structure) — fragment-parent + slot tiddler fields.
 *   control:has (N edges) — Verse class composition: parent class and interfaces alike,
 *   every URI in class(...) → componentTypes. No privileged is-a parent.
 *
 * KumuDeviceSpec derives from pranala edges, not from a TS class hierarchy.
 * No separate registration step — authoring a type meme with reaction edges IS registration.
 *
 * Isomorphic: no Node/browser APIs.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/mesh/kumu-device
 */


// ---------------------------------------------------------------------------
// KumuListenable / KumuSubscribable — UEFN Verse 5.6+ pin vocabulary
// ---------------------------------------------------------------------------

/**
 * A named output event this kumu device EMITS (Verse OUTPUT pin).
 *
 * `verseKind` distinguishes the two Verse event types:
 *   "listenable" — implements awaitable + subscribable; DEB-wireable in UEFN editor
 *   "event"      — implements signalable + awaitable only; NOT subscribable via Subscribe();
 *                  custom user-declared events (`MyEvent : event() = event(){}`) land here
 *
 * When absent, treat as "listenable" (built-in device events, the common case).
 *
 * Declared via `reaction:listenable` pranala edges on the kumu type meme.
 * e.g. "OnActivated", "OnDamaged", "OnExploded"
 */
export interface KumuListenable {
  /** Event name — e.g. "OnActivated", "OnDamaged", "OnReset". */
  readonly name: string;
  readonly description?: string;
  /** Verse event type: "listenable" supports Subscribe(); "event" supports Await()/Signal() only. */
  readonly verseKind?: "listenable" | "event";
  /** Verse payload type string (e.g. "agent", "int", "[]void"). Absent = void payload. */
  readonly payloadType?: string;
}

/**
 * A named input function this kumu device EXPOSES (Verse INPUT function pin).
 *
 * In Verse: a public method on the device class whose signature matches the wired listenable's
 * payload type. `@subscribes` decorator appears in older docs but current UEFN uses public
 * method matching by signature — any public method of matching arity serves as an input pin.
 *
 * Declared via `reaction:subscribable` pranala edges on the kumu type meme.
 * e.g. "Enable", "Disable", "SetDamage"
 */
export interface KumuSubscribable {
  /** Handler name — e.g. "Enable", "Disable", "SetDamage". */
  readonly name: string;
  readonly description?: string;
  /** Verse parameter type string matching the connected listenable's payload. Absent = void. */
  readonly payloadType?: string;
  /** Verse effect specifiers on this function (e.g. ["suspends"], ["decides", "transacts"]). */
  readonly effects?: readonly string[];
}

// ---------------------------------------------------------------------------
// KumuDeviceSpec — type-level device description
// ---------------------------------------------------------------------------

/**
 * Describes a kumu device type (Verse 5.6+ composition model).
 *
 * Derived from the type meme's pranala edge list — not from a class hierarchy.
 *
 *   listenables   ← `reaction:listenable` edges where `fromUri === typeUri`
 *                  payload.listenable = event name; payload.verseKind = "listenable"|"event";
 *                  payload.payloadType = Verse type string
 *   subscribables ← `reaction:subscribable` edges where `fromUri === typeUri`
 *                  payload.subscribable = handler name; payload.payloadType = Verse type string;
 *                  payload.effects = space-separated Verse effect specifiers
 *   slots        ← ahu socket URIs declared within the type meme (Verse `@editable` fields)
 *   componentTypes   ← `control:has` edges (every URI in the Verse `class(...)` list — parent
 *                      and interfaces alike; no privileged is-a parent; web3 composition)
 */
export interface KumuDeviceSpec {
  /** Canonical type URI (no fragment). e.g. `lar:///sdm/devices/button` */
  readonly typeUri: string;
  /** Listenable events this device type emits — OUTPUT pins (Verse `listenable`). */
  readonly listenables: readonly KumuListenable[];
  /** Subscribable functions this device type exposes — INPUT pins (Verse public methods). */
  readonly subscribables: readonly KumuSubscribable[];
  /** Ahu slot URIs declared on this type (Verse `@editable` attributes). */
  readonly slots: readonly string[];
  /** Component type URIs (`control:has` edges) — every URI in the Verse `class(...)` list,
   *  parent class and interfaces alike. Composition only; no is-a parent. */
  readonly componentTypes: readonly string[];
}

// ---------------------------------------------------------------------------
// KumuInstanceRef — runtime device instance address
// ---------------------------------------------------------------------------

/**
 * Identifies a live kumu device instance.
 *
 * Both fragments produce tiddler addresses in the wiki Automerge doc:
 *   lar:///type-path#nameFragment  — human-readable wiki-local label
 *   lar:///type-path#uuidFragment  — stable UUID address for wiring
 */
export interface KumuInstanceRef {
  readonly typeUri: string;
  /** User-selected friendly name fragment (e.g. "player-spawn-a"). */
  readonly nameFragment: string;
  /** crypto.randomUUID() — stable wiring address. */
  readonly uuidFragment: string;
}

/** Derive both tiddler title URIs from a KumuInstanceRef. */
export function kumuInstanceUris(ref: KumuInstanceRef): { named: string; uuid: string } {
  return {
    named: `${ref.typeUri}#${ref.nameFragment}`,
    uuid:  `${ref.typeUri}#${ref.uuidFragment}`,
  };
}

// ---------------------------------------------------------------------------
// kumuDeviceSpecFromEdges — derive KumuDeviceSpec from a flat edge list
// ---------------------------------------------------------------------------

/**
 * Minimal edge shape required by `kumuDeviceSpecFromEdges`.
 * Matches the `PranalaEdge` interface from `@lararium/mesh/ast`.
 */
interface EdgeLike {
  fromUri: string;
  toUri:   string;
  family:  string;
  role:    string | null;
  payload: Record<string, unknown>;
}

/**
 * Derive a `KumuDeviceSpec` from the flat edge list for a type meme.
 *
 * Pass the result of `parseMemeEdges(typeUri, text)` directly — `PranalaEdge`
 * satisfies the `EdgeLike` shape.
 *
 * listenables  ← `reaction:listenable` edges with `fromUri === typeUri`; name = payload.listenable
 * subscribables← `reaction:subscribable` edges with `fromUri === typeUri`; name = payload.subscribable
 * slots        ← caller must supply (no AST field for ahu socket URIs yet)
 * componentTypes  ← `control:has` edges; toUri = component URI (every item in the Verse
 *                   `class(...)` list — parent and interfaces alike; no is-a parent)
 */
export function kumuDeviceSpecFromEdges(
  typeUri: string,
  edges:   readonly EdgeLike[],
  slots:   readonly string[] = [],
): KumuDeviceSpec {
  const listenables:      KumuListenable[]   = [];
  const subscribables:    KumuSubscribable[] = [];
  const componentTypes:   string[]           = [];

  for (const e of edges) {
    if (e.fromUri !== typeUri) continue;

    if (e.family === "reaction") {
      const s = (k: string) => (typeof e.payload[k] === "string" ? e.payload[k] as string : undefined);

      if (e.role === "listenable") {
        const name = s("listenable");
        if (name) {
          const vk = s("verseKind");
          const desc = s("description"); const pt = s("payloadType");
          const entry: KumuListenable = { name };
          if (desc) (entry as { description?: string }).description = desc;
          if (vk === "event" || vk === "listenable") (entry as { verseKind?: "listenable" | "event" }).verseKind = vk;
          if (pt)   (entry as { payloadType?: string }).payloadType = pt;
          listenables.push(entry);
        }
      } else if (e.role === "subscribable") {
        const name = s("subscribable");
        if (name) {
          const efxRaw = s("effects");
          const effects = efxRaw ? efxRaw.split(/\s+/).filter(Boolean) : undefined;
          const desc = s("description"); const pt = s("payloadType");
          const entry: KumuSubscribable = { name };
          if (desc)           (entry as { description?: string }).description = desc;
          if (pt)             (entry as { payloadType?: string }).payloadType = pt;
          if (effects?.length)(entry as unknown as { effects?: string[] }).effects = effects;
          subscribables.push(entry);
        }
      }
      // roles: observes, throttles, debounces — not reflected in spec
    }

    if (e.family === "control") {
      if (e.role === "has" && e.toUri && e.toUri !== typeUri) {
        componentTypes.push(e.toUri); // Verse class composition — parent + interfaces, N edges
      }
    }
  }

  return { typeUri, listenables, subscribables, slots, componentTypes };
}

// ReactionEngine removed — collapsed into reaction-router.ts TW5 startup module.
// Nalu-driven dispatch now: wiki.addEventListener("change") → tm-verse-event.
// See packages/lararium-tw5/src/modules/reaction-router.ts.

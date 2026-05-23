/**
 * kumu-device.ts — KumuDeviceSpec + ReactionEngine.
 *
 * ## Verse 5.6+ device model (NOT Blueprint)
 *
 * UEFN Verse 5.6+ uses single-inheritance class composition. A `creative_device` subclass
 * gains behavior by:
 *   - Declaring `listenable(payload)` fields as OUTPUT event pins (built-in devices only;
 *     custom device listenable fields not yet DEB-bindable in UEFN editor as of 2025)
 *   - Declaring public methods matching the payload signature as INPUT function pins
 *   - `using { /Path }` is a MODULE IMPORT directive (namespace scope), NOT trait composition
 *   - Class hierarchy: `my_device := class(creative_device)` — single inheritance only
 *
 * Verse event type hierarchy:
 *   `event(T)`      — implements signalable + awaitable; NOT subscribable
 *   `listenable(T)` — implements awaitable + subscribable; built-in device events use this
 *   `Subscribe()`   → returns `cancelable` (our `() => void` unsubscribe)
 *   `Await()<suspends>` → single-shot coroutine (our `subscribeOnce()`)
 *
 * Verse concurrency:
 *   `branch` → lele / \branch: structured fire-and-continue, bounded by enclosing async context
 *   `sync`   → hui / \sync: await-all
 *   `race`   → holo / \race: first wins, losers CANCEL
 *   `rush`   → puka / \rush: first wins, losers CONTINUE until the enclosing async context completes
 *   `spawn`  → unstructured escape hatch; no pono sigil until the runtime needs it
 *
 * ## Lararium vocabulary mapping
 *
 *   Verse `listenable(T)` field  → `KumuListenable`     (OUTPUT pin; `reaction:listenable` role)
 *   Verse `event(T)` field       → `KumuListenable`     (verseKind: "event"; Await-only, not Subscribe)
 *   Verse public input method    → `KumuSubscribable`   (INPUT fn pin; `reaction:subscribable` role)
 *   Verse class parent (`class(P)`)    → `control:extends` pranala edge → `KumuDeviceSpec.extendsType`
 *   Verse interface (`class(P, I, J)`) → `control:implements` pranala edges → `KumuDeviceSpec.implementsTypes`
 *   UEFN editor DEB wire               → `papalohe` pranala edge (instance-level binding)
 *   `Await(event)<suspends>`     → `ReactionGraph.subscribeOnce()`
 *   UEFN game-loop actor tick    → `ReactionEngine.onChangeset()` — Scale-3 synchronous tick
 *
 * ## KumuDeviceSpec
 *   Isomorphic type describing a kumu device type. Derived from the type meme's
 *   pranala edge list — three semantic layers:
 *
 *   ## Three semantic layers (do not conflate)
 *
 *   **Ahu-slot tree** (document structure) — `fragment-parent` + `slot` tiddler fields.
 *   One `.md` file decomposes into a root tiddler and N slot fragment tiddlers.
 *   This is the meme parent/child/grandchild tree. NOT a pranala edge.
 *
 *   **`control:extends`** (one edge) — the single Verse parent class.
 *   `my_device := class(creative_device)` → one `control:extends` edge, `toUri = creative_device URI`.
 *   Maps to `KumuDeviceSpec.extendsType`.
 *
 *   **`control:implements`** (N edges) — Verse interface composition.
 *   `my_device := class(creative_device, challengeable, listenable_t)` → one `control:extends` +
 *   two `control:implements` edges, one per interface URI.
 *   Maps to `KumuDeviceSpec.implementsTypes`.
 *
 *   Two identity layers per instance (both tiddlers in the wiki doc):
 *     lar:///type-path#name-fragment  — user-selected friendly name (human label)
 *     lar:///type-path#uuid-fragment  — crypto.randomUUID() stable wiring address
 *   Declared in the type meme body via <<~ kahea kau #fragment >> sigils.
 *
 * Reaction routing collapsed into reaction-router.ts (TW5 startup module, nalu-driven).
 *
 * Isomorphic: no Node/browser APIs. Works in Node, browser, and TW5-era environments.
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
 *   extendsType      ← `control:extends` edge (single parent class URI; Verse single inheritance)
 *   implementsTypes  ← `control:implements` edges (interface URIs; Verse interface composition)
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
  /** Single parent class URI (`control:extends` edge). Absent = no explicit parent declaration. */
  readonly extendsType?: string;
  /** Interface URIs this device implements (`control:implements` edges — Verse interface composition). */
  readonly implementsTypes: readonly string[];
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
 * extendsType     ← `control:extends` edge; toUri = parent class URI (Verse single inheritance)
 * implementsTypes ← `control:implements` edges; toUri = interface URI (Verse interface composition)
 */
export function kumuDeviceSpecFromEdges(
  typeUri: string,
  edges:   readonly EdgeLike[],
  slots:   readonly string[] = [],
): KumuDeviceSpec {
  const listenables:      KumuListenable[]   = [];
  const subscribables:    KumuSubscribable[] = [];
  const implementsTypes:  string[]           = [];
  let   extendsType:      string | undefined;

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
      if (e.role === "extends" && e.toUri && e.toUri !== typeUri) {
        extendsType = e.toUri; // single parent class (last edge wins if multiple declared)
      } else if (e.role === "implements" && e.toUri && e.toUri !== typeUri) {
        implementsTypes.push(e.toUri); // interface composition — N edges allowed
      }
    }
  }

  const spec: KumuDeviceSpec = { typeUri, listenables, subscribables, slots, implementsTypes };
  if (extendsType) (spec as { extendsType?: string }).extendsType = extendsType;
  return spec;
}

// ReactionEngine removed — collapsed into reaction-router.ts TW5 startup module.
// Nalu-driven dispatch now: wiki.addEventListener("change") → tm-verse-event.
// See packages/lararium-tw5/src/modules/reaction-router.ts.

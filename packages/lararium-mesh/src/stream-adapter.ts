/**
 * stream-adapter — the per-MODALITY intake abstraction that generalizes the sensorium-for-FORM
 * (the corpus-machina, corpus.md) to ANY input stream (pure, dependency-free).
 *
 * The sensorium is ~90% modality-INVARIANT. Its planes — content=embed · structure=shape-vector ·
 * bands=MODWT+ecp · form=induction · coupling=RTransferEntropy — read numeric vectors, nested shape
 * trees, and text; NONE of them know "this came from a text corpus". Only the INTAKE (text →
 * tree-sitter / stanza) is text-specific. This module lifts that shore: a {@link StreamAdapter}
 * supplies ONLY the intake (raw → {@link StreamFrame}s); the shared CORE ({@link composePalace})
 * routes each frame's populated slots to the matching plane.
 *
 * ## Composition-thin
 *
 * An adapter carries ONLY what is genuinely app-specific; every shared behavior lives in a free
 * function the CORE applies. Give an adapter a slot each one fills identically and that slot becomes
 * a field nobody reads; give it a body each one copies and the copies drift apart. So the surface
 * here stays EXACTLY `modality · mode · ingest`, plane behavior lives in the injected
 * {@link PlaneSink} the shared driver applies, and a new modality adds an `ingest` and nothing else.
 *
 * ## The two doors (why the frame carries three slots)
 *
 * A stream feeds the planes through the slots its modality affords — no adapter fills all three:
 *   · a NATIVELY-NUMERIC on-box stream (sensor · market · audio · EEG · CI/CD tick) fills `signal`
 *     directly → the bands + coupling planes read it verbatim (the `--signal` NDJSON door);
 *   · TEXT fills `content` (+ `structure` when a parse is wired) → the content plane embeds it, and
 *     the bands plane DERIVES the cohesion signal from those embeddings downstream (the `--palace`
 *     door). Text's `signal` stays empty at ingest — cohesion is a CROSS-frame property of the
 *     embeddings, not producible from one chunk (see {@link composePalace}, the derived-bands door).
 *
 * Meme: lar:///ha.ka.ba/lares/api/lares/corpus#the-caps
 */

// ── The frame — the modality-invariant carrier the planes consume ────────────────────────────────

/**
 * A content-FREE nested shape tree — node TYPES + nesting only, never the source words. The exact
 * shape the structurepalace structure-encoder eats (`{"type", "children":[…]}`, structure_router.py's ONE
 * return shape). Optional on a frame: only structure-bearing modalities fill it.
 */
export interface NestedTree {
  /** The node type label (the encoder keys the shape vector by this). */
  readonly type: string;
  /** The ordered child subtrees (absent / empty ⇒ a leaf). */
  readonly children?: readonly NestedTree[];
}

/**
 * One frame of a stream — the normalized unit ANY adapter emits. Carries a PER-STREAM ordering key
 * (`seq`) — there is NO global now (causal-islands): a frame orders only within its own stream. Each
 * frame carries the subset of {signal, structure, content} its modality affords; the CORE routes the
 * POPULATED slots to their planes.
 */
export interface StreamFrame {
  /** Per-stream ordering key (a monotone index or a source-native ordinal) — never a global clock. */
  readonly seq: number | string;
  /**
   * The numeric vector the bands + coupling planes consume DIRECTLY (a natively-numeric modality's
   * sample; a multivariate row → the coupling lead-lag matrix). Empty ⇒ a derived-signal modality
   * (text): bands derive the cohesion signal from the content plane downstream.
   */
  readonly signal: readonly number[];
  /** The content-free shape tree the structure + form planes consume (absent ⇒ no structure plane). */
  readonly structure?: NestedTree;
  /** The text the content-embed plane consumes (absent ⇒ no content plane). */
  readonly content?: string;
}

// ── The adapter — the ONLY per-modality surface ──────────────────────────────────────────────────

/**
 * A per-modality STREAM ADAPTER. Supplies ONLY the intake: `ingest(raw) → frames`. Everything else —
 * the planes — lives in the shared {@link composePalace} + the injected {@link PlaneSink}. No plane
 * method appears here; a new modality is one `ingest` and its `modality` / `mode` tags.
 *
 * @typeParam Raw — the adapter's native input (a text source, a numeric buffer, a socket batch, …).
 */
export interface StreamAdapter<Raw = unknown> {
  /** The modality tag (`text`, `audio`, `market`, `sensor`, `ci-cd`, …) — for the composition note. */
  readonly modality: string;
  /** BATCH (a finite corpus, all frames at once) vs LIVE (an online stream, frames arrive over time). */
  readonly mode: "batch" | "live";
  /** Turn one raw source into its ordered frames (per-stream `seq`; NO global now). */
  ingest(raw: Raw): StreamFrame[];
}

// ── The plane bank — the injected impurity boundary (the holders live behind it) ────────────────

/**
 * The PLANE BANK — the injected appliers the CORE routes frames to. This is the impurity boundary
 * (the caller injects `hash` the same way): the node/CLI caller wires the real python holders (content
 * embed · structurepalace encoder · bands MODWT+ecp · RTransferEntropy coupling); a test wires a fake.
 * Each leg is OPTIONAL — an absent leg means that plane is skipped (graceful, like the corpus caps).
 * Each returns the count it filed (drawers · structure vectors · bands cells · coupling edges).
 *
 * A leg NEVER re-declares routing — it receives exactly the frames carrying its slot, already
 * partitioned by the driver. The bands leg additionally learns whether its signal is DERIVED from
 * content (the text door) or read DIRECT from `signal` (the numeric door).
 */
export interface PlaneSink {
  /** The CONTENT plane — embed each frame's `content` (nomic). Returns drawers filed. */
  content?(frames: readonly StreamFrame[]): number;
  /** The STRUCTURE plane — encode each frame's `structure` (structurepalace) + form induction downstream. */
  structure?(frames: readonly StreamFrame[]): number;
  /**
   * The BANDS plane — MODWT-MRA spine + ecp quorum. Reads the frames' `signal` DIRECT (numeric door)
   * or, when none carry signal, DERIVES it from the content plane (`derivedFromContent`, text door).
   */
  bands?(frames: readonly StreamFrame[], ctx: { readonly derivedFromContent: boolean }): number;
  /** The COUPLING plane — RTransferEntropy lead-lag over a MULTIVARIATE signal (≥2 columns). */
  coupling?(frames: readonly StreamFrame[]): number;
}

/** The tally {@link composePalace} returns — the planes' fill counts + a provenance note. */
export interface PalaceComposition {
  readonly modality: string;
  readonly mode: "batch" | "live";
  /** Frames the adapter emitted. */
  readonly frames: number;
  /** Content-plane drawers filed (0 ⇒ content-skipped). */
  readonly content: number;
  /** Structure-plane shape vectors filed (0 ⇒ structure-skipped). */
  readonly structure: number;
  /** Bands-plane lar_ffz cells filed (0 ⇒ bands-skipped). */
  readonly bands: number;
  /** Coupling-plane directed edges filed (0 ⇒ coupling-skipped / univariate). */
  readonly coupling: number;
  /** True ⇒ the bands signal was DERIVED from the content plane (text), not read direct from `signal`. */
  readonly bandsDerived: boolean;
  /** A human-readable provenance line. */
  readonly note: string;
  /**
   * The PREDICTIVE read (sensorium-machina.md #the-py-r-web), attached over a numeric
   * stream by the sensing wire (sense-stream) using the native {@link freeEnergy} / {@link forecastEws}
   * core — absent when the modality carries no direct `signal` (a text corpus). The sensorium's
   * per-frame objective F = Σ π·ε² + complexity, exposed here at the composition level.
   */
  readonly freeEnergy?: { readonly F: number; readonly accuracy: number; readonly complexity: number };
  /** The critical-slowing-down forecast over the stream's signal (the EWS-predictive bands leg). */
  readonly forecast?: {
    readonly fired: boolean;
    readonly state: "FORECAST" | "WATCH" | "QUIET";
    readonly ar1Tau: number;
    readonly ar1P: number;
    readonly note: string;
  };
}

// ── The shared CORE — route frames' populated slots to the planes ────────────────────────────────

const hasContent = (f: StreamFrame): boolean => f.content != null && f.content.length > 0;
const hasStructure = (f: StreamFrame): boolean => f.structure != null;
const hasSignal = (f: StreamFrame): boolean => f.signal.length > 0;

/**
 * Refuse an ambiguous local sequence before any plane reads it. An adapter
 * carries one stream, so this compares only its own frames; it never invents
 * an order across causal islands. Numeric and string source ordinals each
 * remain lawful, but one stream cannot mix their order domains.
 */
export function requireOrderedFrames(frames: readonly StreamFrame[]): void {
  let prior: number | string | undefined;
  let kind: "number" | "string" | undefined;
  for (const [index, frame] of frames.entries()) {
    const seq = frame.seq;
    const nextKind = typeof seq;
    if (nextKind !== "number" && nextKind !== "string") {
      throw new Error(`stream frames: frame ${index} needs a numeric or string sequence`);
    }
    if ((typeof seq === "number" && !Number.isFinite(seq)) ||
        (typeof seq === "string" && seq.length === 0)) {
      throw new Error(`stream frames: frame ${index} carries an invalid sequence`);
    }
    if (kind !== undefined && nextKind !== kind) {
      throw new Error("stream frames: one stream cannot mix sequence domains");
    }
    if (prior !== undefined && !(seq > prior)) {
      throw new Error("stream frames: sequence must rise strictly within one stream");
    }
    prior = seq;
    kind = nextKind;
  }
}

/** The widest `signal` vector across the frames — coupling needs ≥2 columns for a lead-lag matrix. */
function signalWidth(frames: readonly StreamFrame[]): number {
  let w = 0;
  for (const f of frames) if (f.signal.length > w) w = f.signal.length;
  return w;
}

/**
 * compose_palace generalized — run the sensorium planes over ANY adapter's frames. The ONE shared
 * move (corpus.md's role line): ingest → partition each frame's populated slots → dispatch to the
 * injected planes → tally. Composition-thin: the adapter contributed ONLY `ingest`; every plane
 * behavior rode the sink.
 *
 * Routing:
 *   · content-bearing frames  → the content plane
 *   · structure-bearing frames → the structure plane (form induction rides downstream, sink's business)
 *   · bands: the DIRECT signal frames when any carry `signal` (numeric door); else DERIVE from the
 *     content frames (text door — bands reads the content embeddings the content plane just filed)
 *   · coupling: only a MULTIVARIATE signal (≥2 columns) affords a directional lead-lag matrix
 *
 * Pure + synchronous (the plane holders run `execFileSync` behind the sink, matching corpus sensing);
 * an absent sink leg skips its plane gracefully.
 */
export function composePalace<Raw>(
  adapter: StreamAdapter<Raw>,
  raw: Raw,
  sink: PlaneSink,
): PalaceComposition {
  const frames = adapter.ingest(raw);
  requireOrderedFrames(frames);
  const contentFrames = frames.filter(hasContent);
  const structureFrames = frames.filter(hasStructure);
  const signalFrames = frames.filter(hasSignal);

  const content = sink.content ? sink.content(contentFrames) : 0;
  const structure = sink.structure ? sink.structure(structureFrames) : 0;

  // The bands door: DIRECT signal when the modality is natively numeric; else DERIVE from content.
  const bandsDerived = signalFrames.length === 0 && contentFrames.length > 0;
  const bandFrames = signalFrames.length > 0 ? signalFrames : contentFrames;
  const bands = sink.bands && bandFrames.length > 0 ? sink.bands(bandFrames, { derivedFromContent: bandsDerived }) : 0;

  // The coupling door: a lead-lag matrix needs ≥2 signal columns (a univariate stream has no cross-edge).
  const coupling = sink.coupling && signalWidth(signalFrames) >= 2 ? sink.coupling(signalFrames) : 0;

  const note =
    `${adapter.modality}/${adapter.mode}: ${frames.length} frames → ` +
    `content ${content} · structure ${structure} · ` +
    `bands ${bands}${bandsDerived ? " (derived from content)" : ""} · coupling ${coupling}`;

  return {
    modality: adapter.modality,
    mode: adapter.mode,
    frames: frames.length,
    content,
    structure,
    bands,
    coupling,
    bandsDerived,
    note,
  };
}

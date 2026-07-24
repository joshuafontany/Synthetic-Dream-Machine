/**
 * form-layer — the @daemon-side living-grammar form-capture (P0·P1).
 * Meme: lar:///ha.ka.ba/lararium/api/living-grammar-palace
 *
 * The DISCRETE plane of the two-planes form-capture: P0 pins the constructicon
 * basis (the grammar-SEED axes); P1 emits the move-skeleton (the linear marker
 * stream + the placeholdered graph). Both pure — they meet the store at a later
 * phase. The form-vector encoder (P2, the Python sidecar) plugs in downstream of
 * {@link emitMoveSkeleton}, indexing its tokens against {@link buildConstructiconBasis}.
 */

export type {
  GrammarLayer,
  AxisCategory,
  ConstructiconAxis,
  ConstructiconBasis,
  PhaseDef,
  WardStateDef,
} from "./constructicon-basis.js";
export {
  GRAMMAR_LAYERS,
  VOICE_ROLES,
  VOICE_HANDLE_TO_ROLE,
  OODA_HA_PHASES,
  WARD_STATES,
  CATEGORY_ORDER,
  resolveVoiceRole,
  phaseForGlyph,
  wardStateForGlyph,
  buildConstructiconBasis,
} from "./constructicon-basis.js";

export type {
  MoveTokenKind,
  MoveToken,
  PlaceholderNode,
  MoveSkeletonCounts,
  MoveSkeleton,
  SkeletonBearing,
} from "./move-skeleton.js";
export { emitMoveSkeleton, placeholderTree } from "./move-skeleton.js";

// The bearing-vector AST — the OUR-OWN licensed lar: URI parser (the RED URI,
// descended into its 5 chunks) + its queryable facets. Pure + isomorphic; runs
// in the @daemon sovereign-island TW5 worker VM (lar-uri).
export type {
  BearingAuthority,
  BearingRoot,
  BearingGrade,
  BearingVector,
  BearingFacets,
} from "./bearing-ast.js";
export {
  BEARING_GRADE_STANDING,
  parseBearing,
  parseBearingPayload,
  linearizeBearing,
  bearingFacets,
} from "./bearing-ast.js";

// The teleodynamic-probe — a PROVISIONAL-HYPOTHESIS probe (NOT Canon) for the
// eigenform-motor claim. Instruments a teleodynamic triple (aftermath-rate ·
// structural-change-rate · freeze) over the machina's OWN self-read sequence.
// Pure + isomorphic. Every reading it emits carries `provisional: true`.
export type {
  SelfRead,
  TeleodynamicGauge,
  ApertureBand,
  TeleodynamicReading,
  MotorSignal,
  ProbeOptions,
} from "./teleodynamic-probe.js";
export { teleodynamicProbe, apertureBandFor } from "./teleodynamic-probe.js";

// The self-read-harvester — the ONE sensorium that reads the house reading itself
// (research a478d788). Folds the gradient harvest into the teleodynamic SelfRead
// (structuralChange BOUND to an out-of-band persisted-write channel, NEVER prose)
// + the Voice register-amplitudes, then wires BOTH North-Stars: buresDistance and
// the teleodynamic register-band. Pure + isomorphic.
export type {
  RegisterBandDef,
  PersistedEffect,
  VoiceRegisterReading,
  TurnSensorium,
  RegisterBandReading,
  TurnInput,
} from "./self-read-harvester.js";
export {
  REGISTER_BANDS,
  REGISTER_COUNT,
  STRUCTURAL_WRITE_KINDS,
  NON_STRUCTURAL_READ_KINDS,
  registerBandForWord,
  registerBandForValue,
  bandForConfidence,
  firedStructuralWrite,
  aftermathClosedFromHuds,
  harvestVoiceReadings,
  harvestTurn,
  turnDensity,
  buresDrift,
  turnRegisterBand,
  harvestSequence,
  probeTurnSequence,
} from "./self-read-harvester.js";

// Re-export the shared grammar + AST shapes the basis/emitter index against, so
// consumers (and tests) take them from the form-layer surface — never reaching
// into the VM-sovereign meme-ast internals directly (vm-grammar-boundary).
export type {
  GrammarRules,
  SigilRule,
  FamilyRule,
  MemeAstNode,
  MemeAstKind,
  AhuNode,
  SigilNode,
  PranalaSugarNode,
  TextNode,
} from "../meme-ast/types.js";

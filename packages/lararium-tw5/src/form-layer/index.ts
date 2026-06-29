/**
 * form-layer — the @daemon-side living-grammar form-capture (P0·P1).
 * Meme: lar:///ha.ka.ba/@lararium/api/living-grammar-palace
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
  BEARING_GRADE_CONFIDENCE,
  parseBearing,
  parseBearingPayload,
  linearizeBearing,
  bearingFacets,
} from "./bearing-ast.js";

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

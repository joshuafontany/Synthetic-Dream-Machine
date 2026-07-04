/**
 * directed-boundary — TRANSITIONAL STRANGLER SHIM. The operator-construction + eigenbasis guts moved into
 * spectral-keel.ts (the collapse keystone); this re-exports its former public surface so consumers stay
 * green through the transition. R2b repoints every consumer to spectral-keel.js and DELETES this file — no
 * shim survives (full strangler-fig, no crud).
 *
 * Meme: lar:///ha.ka.ba/@lares/api/pono/mesh/flow
 */
export {
  departureFromNormality,
  chungDirectedLaplacian,
  symmetricNormalizedLaplacian,
  boundaryEigenbasis,
  couplingBoundary,
  type BoundaryEigenbasis,
  type BoundaryOpts,
} from "./spectral-keel.js";

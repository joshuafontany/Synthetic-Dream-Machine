/**
 * meme-ast/index.ts — barrel for @lararium/tw5 meme-ast sub-module.
 *
 * Public API for isomorphic memetic-wikitext parsing.
 * Import via: import { parseMemeText } from "@lararium/tw5/meme-ast"
 * (the tw5 main barrel stays parser-free — the pono grammar boundary)
 *
 * Composable files (each tracked by sync-heleuma):
 *   types.ts   — MemeAstNode union types + MemeNode root
 *   scanner.ts — SigilScan patterns + collectEvents()
 *   builder.ts — buildMemeAst(): ParseEvent[] → MemeAstNode[]
 *   edges.ts   — edgesFromMemeAst(): MemeAstNode[] → PranalaEdge[]
 *   parse.ts   — parseMemeText() top-level entry (all three tiers)
 */

export type {
  MemeAstKind,
  MemeAstBase,
  MemeNode,
  MemeAstNode,
  AhuNode,
  PranalaNode,
  PranalaSugarNode,
  LeleNode,
  PaeNode,
  PaePhase,
  TextNode,
  SigilNode,
  DynamicNode,
} from "./types.js";

// Re-export PranalaEdge from the shared edge-vocabulary module for convenience.
export type { PranalaEdge, PranalaEdgeViolation, GrammarRules, SigilRule } from "./types.js";

export type { SigilScan, ParseEvent } from "./scanner.js";
export { BOOTSTRAP_SCANS, buildScansFromGrammar, collectEvents } from "./scanner.js";

export { buildMemeAst } from "./builder.js";

export { edgesFromMemeAst } from "./edges.js";

export type { ParseMemeResult } from "./parse.js";
export { parseMemeText, parseMemeNodes, parseMemeEdges } from "./parse.js";

export type { AhuBlock } from "./ahu-scan.js";
export { AHU_OPEN_RE, AHU_CLOSE_RE, CONTROL_SLOTS, findTopLevelAhuBlocks, composeSlotPath } from "./ahu-scan.js";

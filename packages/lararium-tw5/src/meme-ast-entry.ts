/*\
title: lar:///ha.ka.ba/@lararium/tw5/modules/meme-ast
type: application/javascript
module-type: library
\*/
/**
 * meme-ast-entry.ts — CJS entry point for the meme-ast TW5 library module.
 *
 * Compiled by vite.plugin.config.ts → packages/lararium-tw5/tiddlers/src/meme-ast.js
 * as a native TW5 CJS tiddler with a comment-block header.
 *
 * module-type: library — accessible via require("lar:///ha.ka.ba/@lararium/tw5/modules/meme-ast")
 * inside the TW5 VM. The deserializer and other TW5 modules use parseMemeText() from here.
 */

export {
  parseMemeText,
  parseMemeNodes,
  parseMemeEdges,
  collectEvents,
  buildMemeAst,
  edgesFromMemeAst,
  BOOTSTRAP_SCANS,
} from "./meme-ast/index.js";

// the ahu slot grammar — the deserializer requires these off the library in-VM.
export {
  AHU_OPEN_RE,
  AHU_CLOSE_RE,
  CONTROL_SLOTS,
  findTopLevelAhuBlocks,
  composeSlotPath,
} from "./meme-ast/index.js";

// the fence-mask law — the deserializer + meme-stream require these off the library in-VM
// (the barrel keeps them internal; the LIBRARY surface carries them for its VM consumers).
export {
  fencedSpans,
  inMask,
  maskedExec,
  maskedExecAll,
} from "./meme-ast/fence-mask.js";

export type {
  MemeAstNode,
  MemeNode,
  PranalaEdge,
  ParseMemeResult,
} from "./meme-ast/index.js";

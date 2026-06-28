/**
 * meme-ast/types.ts — parse-time AST node types for memetic-wikitext.
 *
 * Local-first, isomorphic: no fs/path/DOM imports.
 * Runs in Node, Deno, browser, and TW5-era JS environments.
 *
 * PranalaEdge, GrammarRules, and SigilRule live in @lararium/mesh/ast.ts (shared
 * vocabulary). This file owns ONLY the parse-tree node shapes.
 *
 * Heleuma ka: sync-heleuma tracks this file.
 * Bundle entry: packages/lararium-tw5/src/meme-ast-entry.ts
 */

// ---------------------------------------------------------------------------
// PranalaEdge — compiled edge record (output of edgesFromAst / parsePranalaEdges)
// ---------------------------------------------------------------------------

export interface PranalaEdge {
  readonly fromUri: string;
  readonly fromSocket: string;
  readonly fromSlot: string | null;
  readonly toUri: string;
  readonly toSocket: string;
  readonly family: string;
  readonly lifecycle: string;
  readonly role: string | null;
  readonly traversal: string;
  readonly propagation: string;
  readonly label: string;
  readonly payload: Record<string, unknown>;
  readonly cardinality: string | null;
  readonly polarity: string | null;
  readonly status: string;
  readonly confidence: number | null;
  readonly renderMode: string | null;
}

export type PranalaViolationSeverity = "error" | "warning";

export interface PranalaEdgeViolation {
  readonly fromUri: string;
  readonly toUri: string;
  readonly family: string;
  readonly severity: PranalaViolationSeverity;
  readonly rule: string;
  readonly message: string;
}

// ---------------------------------------------------------------------------
// GrammarRules — external grammar interface
// ---------------------------------------------------------------------------

export interface SigilRule {
  name: string;
  kind: "worksite" | "edge" | "edge-sugar" | "metadata" | "header" | "concurrency" | "query" | "guest-grammar" | "guest-grammar-alias" | "query-alias" | "pragma" | "conditional" | "conditional-else" | "conditional-branch" | "iteration" | "context" | "concurrency-alias" | "edge-alias" | "pragma-alias" | "iteration-alias" | "conditional-alias";
  layer?: "compile" | "render" | "both";
  inlinePattern?: string;
  blockPattern?: string;
  openPattern?: string;
  closePattern?: string;
  pattern?: string;
  pragmaPattern?: string;
  aliasFor?: string;
  defaultFamily?: string;
  defaultPropagation?: string;
  // Self-defined failure-gradient (graceful-parsing#sigil-self-defined-gradient): how THIS sigil
  // declares it degrades when left unclosed — "water" (inert, low confidence — don't fabricate a
  // frame) vs the default "repaired" (force-close marked, recovered). The resilient driver reads it;
  // the structure still never breaks. (First rung of the #has recovery cap-stack.)
  recoverAs?: "water" | "repaired";
}

export interface FamilyRule {
  name: string;
  dagRequired: boolean;
  roleRecommended: boolean;
  confidenceBounded: boolean;
}

export interface GrammarRules {
  sigils: SigilRule[];
  families: FamilyRule[];
}

// ---------------------------------------------------------------------------
// MemeAstKind — discriminator for every node in the parse tree
// ---------------------------------------------------------------------------

export type MemeAstKind =
  | "Meme"          // root document node  (replaces CarrierNode)
  | "Ahu"           // addressable scope socket  <<~ ahu #slot >>
  | "Pranala"       // explicit edge  (block or inline)
  | "PranalaSugar"  // sugared forms: loulou / aka / kahea / pono / papalohe
  | "Lele"          // fire-and-forget dispatch
  | "Pae"           // phase boundary: soh/stx/etx/eot
  | "Text"          // raw wikitext prose span
  | "Sigil"         // canonical sigil (incl. toml)
  | "Dynamic"       // grammar-meme-registered extension
  | "Error";        // resilient-recovery node — a span the driver could not parse cleanly, contained

// ---------------------------------------------------------------------------
// Base
// ---------------------------------------------------------------------------

export interface MemeAstBase {
  kind:  MemeAstKind;
  pos:   number;
  raw:   string;
  // Resilient-parsing gradient (graceful-parsing#sigil-self-defined-gradient): set ONLY on a node the
  // driver recovered — a clean parse omits both (full confidence, no recovery). `confidence` rides the
  // 0..20 aperture ladder; `recoveredAs` names the rung the cascade reached.
  confidence?:  number;
  recoveredAs?: "water" | "repaired" | "missing";
}

// ---------------------------------------------------------------------------
// MemeNode — root document node (replaces CarrierNode / CarrierNode.kind=Carrier)
// ---------------------------------------------------------------------------

export interface MemeNode {
  readonly kind: "Meme";
  readonly uri:  string;
  readonly body: readonly MemeAstNode[];
}

// ---------------------------------------------------------------------------
// AhuNode — addressable scope socket
// ---------------------------------------------------------------------------

export interface AhuNode extends MemeAstBase {
  kind:        "Ahu";
  slot:        string;            // e.g. "#section-name"
  uri:         string;            // memeUri + slot
  delegate:    string | null;
  body:        MemeAstNode[];
  invocation?: boolean;           // <<~ kahea ahu #slot >>
  projection?: boolean;           // <<~ aka ahu #slot >>
}

// ---------------------------------------------------------------------------
// PranalaNode — explicit edge
// ---------------------------------------------------------------------------

export interface PranalaNode extends MemeAstBase {
  kind:    "Pranala";
  slot:    string | null;
  fromRaw: string;
  toRaw:   string;
  family:  string;
  role:    string | null;
  body:    MemeAstNode[];         // non-empty for block-form only
}

// ---------------------------------------------------------------------------
// PranalaSugarNode — sugared edge vocabulary
// ---------------------------------------------------------------------------

export interface PranalaSugarNode extends MemeAstBase {
  kind:     "PranalaSugar";
  sigil:    "loulou" | "aka" | "kahea" | "pono" | "papalohe";
  slot:     string | null;
  fromRaw:  string | null;
  toRaw:    string;
  family:   string;
  role:     string | null;
  listenable:  string | null;        // papalohe: source listenable name (UEFN OUTPUT pin)
  subscribable: string | null;       // papalohe: target subscribable fn name (UEFN INPUT pin)
}

// ---------------------------------------------------------------------------
// LeleNode — fire-and-forget dispatch
// ---------------------------------------------------------------------------

export interface LeleNode extends MemeAstBase {
  kind:      "Lele";
  targetRaw: string;
  family:    "message";
}

// ---------------------------------------------------------------------------
// PaeNode — phase boundary (SOH/STX/ETX/EOT)
//
//   soh — Start Of Heading  (self-declaration, meme URI)
//   stx — Start of Text     (identity done, content begins)
//   etx — End of Text       (content done, trailer begins)
//   eot — End of Transmission (transmission complete)
// ---------------------------------------------------------------------------

export type PaePhase = "soh" | "stx" | "etx" | "eot";

export interface PaeNode extends MemeAstBase {
  kind:   "Pae";
  phase:  PaePhase;
  toUri?: string;   // present on soh (declared URI) and eot (return-to-caller)
}

// ---------------------------------------------------------------------------
// TextNode — raw prose span
// ---------------------------------------------------------------------------

export interface TextNode extends MemeAstBase {
  kind:    "Text";
  content: string;
}

// ---------------------------------------------------------------------------
// SigilNode — canonical sigil (collapsed)
//
// attrs carries sigil-specific named captures (all strings).
// Conventional keys per sigilName:
//   wai / kahawai / ui → { filter }
//   huli               → { filter, binding }
//   hana               → { grammarKey }
//   meme               → { targetUri }
//   wehe / kumu        → { name, params }
//   helu               → { name, params, expression }
//   kau                → { name, value, scope }
//   kapu               → { qualifier, inline: "true"|"false" }
//   toml               → { profile, content }
// ---------------------------------------------------------------------------

export interface SigilNode extends MemeAstBase {
  kind:      "Sigil";
  sigilName: string;
  attrs:     Record<string, string>;
  body:      MemeAstNode[];
}

// ---------------------------------------------------------------------------
// DynamicNode — grammar-meme-registered extension
// ---------------------------------------------------------------------------

export interface DynamicNode extends MemeAstBase {
  kind:      "Dynamic";
  sigilName: string;
  sigilKind: string;
  eventType: "open-close" | "leaf" | "pragma";
  body:      MemeAstNode[];
}

// ---------------------------------------------------------------------------
// ErrorNode — resilient-recovery node (graceful-parsing)
//
// The driver emits this when a span cannot parse cleanly, INSTEAD of silently
// dropping or force-closing it. It carries the verbatim span (lossless — the tree
// stays full-fidelity); `recoveredAs` names the rung (water/repaired/missing) and
// `confidence` (0..20) grades how cleanly the construct manifested.
// ---------------------------------------------------------------------------

export interface ErrorNode extends MemeAstBase {
  kind:    "Error";
  content: string;   // the verbatim span (lossless)
  reason:  string;   // why recovery fired (e.g. "orphan-close", "unclosed-frame", "mis-nest")
}

// ---------------------------------------------------------------------------
// ParseFailure — out-of-band recovery record. Errors ride BESIDE the tree
// (rust-analyzer style), span-keyed, so the tree itself stays a clean best-effort.
// ---------------------------------------------------------------------------

export interface ParseFailure {
  pos:         number;
  raw:         string;
  reason:      string;
  recoveredAs: "water" | "repaired" | "missing";
  sigilName?:  string;
}

// ---------------------------------------------------------------------------
// Union
// ---------------------------------------------------------------------------

export type MemeAstNode =
  | AhuNode
  | PranalaNode
  | PranalaSugarNode
  | LeleNode
  | PaeNode
  | TextNode
  | SigilNode
  | DynamicNode
  | ErrorNode;

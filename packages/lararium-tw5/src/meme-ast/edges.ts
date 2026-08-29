/**
 * meme-ast/edges.ts — edgesFromMemeAst(): MemeAstNode[] → PranalaEdge[].
 *
 * Local-first, isomorphic: no fs/path/DOM imports.
 * Runs in Node, Deno, browser, and TW5-era JS environments.
 *
 * Projects edge declarations (Pranala, PranalaSugar, Lele, Pae/soh) out of
 * a parsed meme AST into the flat PranalaEdge record format consumed by the
 * meme graph, MCP export, and TW5 edge-field codec.
 *
 * Heleuma ka: sync-heleuma tracks this file.
 * Bundle entry: packages/lararium-tw5/src/meme-ast-entry.ts
 */

import type { PranalaEdge } from "./types.js";
import type {
  MemeAstNode,
  AhuNode,
  PranalaNode,
  PranalaSugarNode,
  LeleNode,
} from "./types.js";

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export function edgesFromMemeAst(ast: MemeAstNode[], memeUri: string): PranalaEdge[] {
  const edges: PranalaEdge[] = [];
  walkForEdges(ast, memeUri, [memeUri], edges);
  return edges;
}

// ---------------------------------------------------------------------------
// Walk
// ---------------------------------------------------------------------------

function walkForEdges(nodes: MemeAstNode[], memeUri: string, ahuStack: string[], edges: PranalaEdge[]): void {
  for (const node of nodes) {
    switch (node.kind) {
      case "Ahu":
        ahuStack.push(node.uri);
        walkForEdges(node.body, memeUri, ahuStack, edges);
        ahuStack.pop();
        break;
      case "Pranala":
        edges.push(projectEdge(node, memeUri, ahuStack));
        if (node.body.length) walkForEdges(node.body, memeUri, ahuStack, edges);
        break;
      case "PranalaSugar":
        edges.push(projectSugar(node, memeUri, ahuStack));
        break;
      case "Lele":
        edges.push(projectDispatch(node, memeUri, ahuStack));
        break;
      case "Pae":
        // SOH emits a "control"/"soh" edge carrying the declared URI.
        // STX/ETX/EOT are stream-phase markers — no graph edges.
        if (node.phase === "soh" && node.toUri) {
          edges.push(mk(memeUri, memeUri, null, node.toUri, node.toUri, "control", "soh"));
        }
        break;
      case "Text":
        break;
      case "Sigil":
      case "Dynamic":
        if (node.body.length) walkForEdges(node.body, memeUri, ahuStack, edges);
        break;
    }
  }
}

// ---------------------------------------------------------------------------
// Token resolution: "?" → current URI/socket; "#frag" → URI+frag; lar:/// absolute
// ---------------------------------------------------------------------------

function tok(raw: string, memeUri: string, ahuStack: string[]): [string, string] {
  // AN END NAMES ITSELF. `pranala`, `lares aim` and the framing sigils write `from=`/`to=` in front of the
  // address, so the value a reader resolves sits past the separator. A token still carrying its parameter
  // name matches no branch below and falls through to the meme's own address — an edge pointing home.
  const token = raw.replace(/^(?:from|to)=/, "");
  if (token === "?") return [memeUri, ahuStack[ahuStack.length - 1] ?? memeUri];
  if (token.startsWith("#")) return [memeUri, memeUri + token];
  if (token.startsWith("lar:///") && token.includes("#")) {
    const idx = token.indexOf("#");
    const uri = token.slice(0, idx);
    return [uri, uri + token.slice(idx)];
  }
  if (token.startsWith("lar:///")) return [token, token];
  return [memeUri, memeUri];
}

// ---------------------------------------------------------------------------
// mk — minimal PranalaEdge factory with sensible defaults
// ---------------------------------------------------------------------------

function mk(
  fromUri: string, fromSocket: string, fromSlot: string | null,
  toUri:   string, toSocket:   string,
  family:  string, role:       string | null,
  payload: Record<string, unknown> = {},
): PranalaEdge {
  return {
    fromUri, fromSocket, fromSlot, toUri, toSocket, family, role,
    lifecycle:    "instance",
    traversal:    "source-to-target",
    propagation:  "none",
    label:        "",
    cardinality:  null,
    polarity:     null,
    status:       "declared",
    confidence:   null,
    renderMode:   null,
    payload,
  };
}

// ---------------------------------------------------------------------------
// Projection helpers
// ---------------------------------------------------------------------------

function projectEdge(node: PranalaNode, mu: string, ahuStack: string[]): PranalaEdge {
  const fromSlot              = node.slot ? mu + node.slot : null;
  const [fromUri, fromSocket] = tok(node.fromRaw, mu, ahuStack);
  const [toUri,   toSocket]   = tok(node.toRaw,   mu, ahuStack);
  return mk(fromUri, fromSocket, fromSlot, toUri, toSocket, node.family, node.role);
}

function projectSugar(node: PranalaSugarNode, mu: string, ahuStack: string[]): PranalaEdge {
  const fromSlot   = node.slot ? mu + node.slot : null;
  const fromSocket = ahuStack[ahuStack.length - 1] ?? mu;

  if (node.fromRaw !== null) {
    const [fromUri, fSock] = tok(node.fromRaw, mu, ahuStack);
    const [toUri, toSocket] = tok(node.toRaw, mu, ahuStack);
    const payload: Record<string, unknown> = {};
    if (node.listenable)  payload["listenable"]  = node.listenable;
    if (node.subscribable) payload["subscribable"] = node.subscribable;
    const renderMode = node.sigil === "papalohe" ? "papalohe" : null;  // Hawaiian primary name
    const edge = mk(fromUri, fSock, fromSlot, toUri, toSocket, node.family, node.role, payload);
    return renderMode ? { ...edge, renderMode } : edge;
  }

  // Single-URI sugar (loulou / aka / kahea)
  const toRaw = node.toRaw;
  let toUri: string, toSocket: string;
  if (toRaw.startsWith("#")) {
    toUri = mu; toSocket = mu + toRaw;
  } else if (toRaw.startsWith("lar:///") && toRaw.includes("#")) {
    const idx = toRaw.indexOf("#"); toUri = toRaw.slice(0, idx); toSocket = toUri + toRaw.slice(idx);
  } else {
    toUri = toRaw; toSocket = "";
  }

  const propagation = node.sigil === "kahea" ? "push-forward" : "none";
  return mk(mu, fromSocket, null, toUri, toSocket, node.family, node.role, { propagation });
}

function projectDispatch(node: LeleNode, mu: string, ahuStack: string[]): PranalaEdge {
  const fromSocket = ahuStack[ahuStack.length - 1] ?? mu;
  const toRaw      = node.targetRaw;
  let toUri: string, toSocket: string;
  if (toRaw.startsWith("#")) {
    toUri = mu; toSocket = mu + toRaw;
  } else if (toRaw.startsWith("lar:///") && toRaw.includes("#")) {
    const idx = toRaw.indexOf("#"); toUri = toRaw.slice(0, idx); toSocket = toUri + toRaw.slice(idx);
  } else {
    toUri = toRaw; toSocket = "";
  }
  return mk(mu, fromSocket, null, toUri, toSocket, "message", null);
}

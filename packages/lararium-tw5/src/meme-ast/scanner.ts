/**
 * meme-ast/scanner.ts — regex scan patterns + collectEvents().
 *
 * Local-first, isomorphic: no fs/path/DOM imports.
 * Runs in Node, Deno, browser, and TW5-era JS environments.
 *
 * A SigilScan is one regex pass over the source text. collectEvents() runs all
 * scans, deduplicates by position, and returns a position-sorted ParseEvent[].
 * The caller (builder.ts) feeds these into the push/pop scope stack.
 *
 * Heleuma ka: sync-heleuma tracks this file.
 * Bundle entry: packages/lararium-tw5/src/meme-ast-entry.ts
 */

import type { GrammarRules, SigilRule } from "./types.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SigilScan {
  sigilName:     string;
  canonicalName?: string;   // alias erasure: event emits this name instead
  regex:         RegExp;
  eventType:     "open" | "close" | "leaf" | "pragma";
  generic?:      boolean;   // catch-all: emit the MATCHED word as sigilName, graded `missing` (partial rung)
}

export interface ParseEvent {
  pos:       number;
  end:       number;
  raw:       string;
  sigilName: string;        // canonical (alias already erased), or the matched word for a generic event
  eventType: "open" | "close" | "leaf" | "pragma";
  groups:    (string | undefined)[];
  generic?:  boolean;       // matched by the generic catch-all → builder grades it `missing` (partial rung)
}

// ---------------------------------------------------------------------------
// BOOTSTRAP_SCANS — minimal edge + ahu + common control sigils.
// Used when no GrammarRules loaded (bootstrap / unit tests without grammar).
//
// Control-character framing protocol MUST precede ahu and generic scans so
// decorated forms like <<~&#x0002; ahu #meme-body-open >> remain structural.
// ---------------------------------------------------------------------------

export const BOOTSTRAP_SCANS: SigilScan[] = [
  // ASCII control-character framing — SOH / STX / ETX / EOT
  { sigilName: "control-soh", regex: /<<~(?:[^>]|->)*&#x0001;(?:[^>]|->)*\?\s*->\s*([^\s>]+)\s*>>/g, eventType: "pragma" },
  { sigilName: "control-stx", regex: /<<~(?:[^>]|->)*&#x0002;(?:[^>]|->)*>>/g,                        eventType: "pragma" },
  { sigilName: "control-etx", regex: /<<~(?:[^>]|->)*&#x0003;(?:[^>]|->)*>>/g,                        eventType: "pragma" },
  { sigilName: "control-eot", regex: /<<~(?:[^>]|->)*&#x0004;(?:[^>]|->)*>>/g,                        eventType: "pragma" },
  // Kapu extended range — DC1 (&#x0011;) SOH variant, DC4 (&#x0014;) EOT variant
  { sigilName: "control-soh", regex: /<<~(?:[^>]|->)*&#x0011;(?:[^>]|->)*\?\s*->\s*([^\s>]+)\s*>>/g, eventType: "pragma" },
  { sigilName: "control-eot", regex: /<<~(?:[^>]|->)*&#x0014;(?:[^>]|->)*>>/g,                        eventType: "pragma" },
  // Structural: ahu — slot identifier supports nested fragment paths via
  // `/`-separated segments (`#parent/child/grandchild`). Per memetic-wikitext
  // spec §5.3 + lar-uri.md §5.6, the URI fragment is a path within the meme;
  // nested ahu blocks produce child tiddlers at `parentUri#parent/child`
  // rather than dedicated `#parent#child` URIs (single-hash invariant).
  { sigilName: "ahu", regex: /<<~(?:[^>]|->)*\bahu\s+(#[\w-]+(?:\/[\w-]+)*)(?:\s+->\s+(\S+))?\s*>>/g, eventType: "open"  },
  { sigilName: "ahu", regex: /<<~\/ahu\s*>>/g,                                                          eventType: "close" },
  // Pranala — block before inline (block wins at same position)
  { sigilName: "pranala", regex: /<<~\s*pranala\s+(#[\w-]+\s+)?(\S+)\s*->\s*(\S+)(?:\s+family:([\w-]+))?(?:\s+role:([\w-]+))?\s*>>([\s\S]*?)<<~\/pranala\s*>>/gs, eventType: "leaf" },
  { sigilName: "pranala", regex: /<<~\s*pranala\s+(#[\w-]+\s+)?(\S+)\s*->\s*(\S+)(?:\s+family:([\w-]+))?(?:\s+role:([\w-]+))?\s*>>/g, eventType: "leaf" },
  // Edge sugar
  { sigilName: "loulou",  regex: /<<~\s*loulou\s+(\S+)\s*>>/g,             eventType: "leaf" },
  // aka — URI form then child-slot form
  { sigilName: "aka", regex: /<<~\s*aka\s+([a-z][\w-]*)\s+(#[\w-]+)\s*>>/g, eventType: "leaf" },
  { sigilName: "aka", regex: /<<~\s*aka\s+(\S+)\s*>>/g,                      eventType: "leaf" },
  // kahea — leaf then open then URI-dataflow
  { sigilName: "kahea-invoke", regex: /<<~\s*kahea\s+([a-z][\w-]*)\s+([^>\n]+?)\s*>>/g,     eventType: "leaf" },
  { sigilName: "kahea-invoke", regex: /<<~\s*kahea\s+([a-z][\w-]*)(?:\s+([^>]*?))?\s*>>/g,  eventType: "open" },
  { sigilName: "kahea-invoke", regex: /<<~\/kahea\s*>>/g,                                     eventType: "close" },
  { sigilName: "kahea",        regex: /<<~\s*kahea\s+(lar:[^\s>]+|[^\s>(]+\/[^\s>]*|[^\s>(]+#[^\s>]*)\s*>>/g, eventType: "leaf" },
  { sigilName: "pono",    regex: /<<~\s*pono\s+(#[\w-]+\s+)?(\S+)\s*->\s*(\S+)(?:\s+role:([\w-]+))?\s*>>/g, eventType: "leaf" },
  { sigilName: "\\constraint", canonicalName: "pono", regex: /<<~\s*\\constraint\s+(#[\w-]+\s+)?(\S+)\s*->\s*(\S+)(?:\s+role:([\w-]+))?\s*>>/g, eventType: "leaf" },
  { sigilName: "lele",    regex: /<<~\s*lele\s+(\S+)\s*>>/g,               eventType: "leaf" },
  { sigilName: "\\branch", canonicalName: "lele", regex: /<<~\s*\\branch\s+(\S+)\s*>>/g, eventType: "leaf" },
  // Concurrency — grammar + scanner wired; Verse runtime semantics pending (async-first)
  { sigilName: "hui",   regex: /<<~\s*hui\s*>>/g,                          eventType: "open"  },
  { sigilName: "hui",   regex: /<<~\/hui\s*>>/g,                           eventType: "close" },
  { sigilName: "holo",  regex: /<<~\s*holo\s*>>/g,                        eventType: "open"  },
  { sigilName: "holo",  regex: /<<~\/holo\s*>>/g,                         eventType: "close" },
  { sigilName: "puka",  regex: /<<~\s*puka\s*>>/g,                        eventType: "open"  },
  { sigilName: "puka",  regex: /<<~\/puka\s*>>/g,                         eventType: "close" },
  { sigilName: "papalohe", regex: /<<~\s*papalohe\s+(#[\w-]+\s+)?(\S+)\s*->\s*(\S+)(?:\s+listenable:([\w.-]+))?(?:\s+subscribable:([\w.-]+))?\s*>>/g, eventType: "leaf" },
  // TOML data block
  { sigilName: "toml", regex: /```toml(?:[ \t]+([A-Za-z0-9_-]+))?[ \t]*\n([\s\S]*?)```/g,  eventType: "leaf" },
  { sigilName: "toml", regex: /<<~\s*toml\s*>>([\s\S]*?)<<~\/toml\s*>>/g,                   eventType: "leaf" },
  // Variable binding (waiho)
  { sigilName: "waiho", regex: /<<~!\s*waiho\s+([\w-]+)\s*=\s*([^\n>]+?)\s*>>/g, eventType: "pragma" },
  { sigilName: "waiho", regex: /<<~\s*waiho\s+([\w-]+)\s*=\s*([^\n>]+?)\s*>>/g,  eventType: "open"   },
  { sigilName: "waiho", regex: /<<~\/waiho\s*>>/g,                                eventType: "close"  },
  // kau — invocation before placement
  { sigilName: "kau", regex: /<<~\s*kau\s+([\w][\w.-]*)\(([^)]*)\)\s*>>/g,                   eventType: "leaf" },
  { sigilName: "kau", regex: /<<~\s*kau\s+(#[\w-]+\s+)?([\w][\w.-]*)(?:\s+([^>]*))?\s*>>/g, eventType: "leaf" },
  // Conditional — heihei (IF), kahawai (ELIF), mukuwai (ELSE)
  { sigilName: "heihei",  regex: /<<~\s*heihei\s+([^\n>]+?)\s*>>/g,    eventType: "open"  },
  { sigilName: "heihei",  regex: /<<~\/heihei\s*>>/g,                   eventType: "close" },
  { sigilName: "mukuwai", regex: /<<~\s*mukuwai\s*>>/g,                 eventType: "leaf"  },
  { sigilName: "kahawai", regex: /<<~\s*kahawai\s+([^\n>]+?)\s*>>/g,   eventType: "leaf"  },
  // Iteration
  { sigilName: "huli", regex: /<<~\s*huli\s+([^\n>]+?)\s+as\s+([\w-]+)\s*>>/g, eventType: "open"  },
  { sigilName: "huli", regex: /<<~\/huli\s*>>/g,                                eventType: "close" },
  // wehe — procedure definition block
  { sigilName: "wehe", regex: /<<~\s*wehe\s+([\w-]+)(?:\s+([^>]*?))?\s*>>/g,  eventType: "open"  },
  { sigilName: "wehe", regex: /<<~\/wehe\s*>>/g,                                eventType: "close" },
  // meme — tiddler context block
  { sigilName: "meme", regex: /<<~\s*meme\s+(\S+)\s*>>/g,                      eventType: "open"  },
  { sigilName: "meme", regex: /<<~\/meme\s*>>/g,                                eventType: "close" },
  // English aliases — emit canonical name directly (inline erasure)
  { sigilName: "\\if",   canonicalName: "heihei",  regex: /<<~\s*\\if\s+([^\n>]+?)\s*>>/g,     eventType: "open"  },
  { sigilName: "\\if",   canonicalName: "heihei",  regex: /<<~\/\\if\s*>>/g,                    eventType: "close" },
  { sigilName: "\\else", canonicalName: "mukuwai", regex: /<<~\s*\\else\s*>>/g,                 eventType: "leaf"  },
  { sigilName: "\\elif", canonicalName: "kahawai", regex: /<<~\s*\\elif\s+([^\n>]+?)\s*>>/g,   eventType: "leaf"  },
  { sigilName: "\\const", canonicalName: "waiho",  regex: /<<~!\s*\\const\s+([\w-]+)\s*=\s*([^\n>]+?)\s*>>/g, eventType: "pragma" },
  { sigilName: "\\let",  canonicalName: "waiho",   regex: /<<~\s*\\let\s+([\w-]+)\s*=\s*([^\n>]+?)\s*>>/g,    eventType: "open"   },
  { sigilName: "\\let",  canonicalName: "waiho",   regex: /<<~\/\\let\s*>>/g,                   eventType: "close" },
  { sigilName: "\\var",  canonicalName: "waiho",   regex: /<<~\s*\\var\s+([\w-]+)\s*=\s*([^\n>]+?)\s*>>/g,    eventType: "open"   },
  { sigilName: "\\var",  canonicalName: "waiho",   regex: /<<~\/\\var\s*>>/g,                   eventType: "close" },
  { sigilName: "kumu",   regex: /<<~\s*kumu\s+([\w-]+)(?:\(([^)]*)\))?\s*>>/g,     eventType: "open"  },
  { sigilName: "kumu",   regex: /<<~\/kumu\s*>>/g,                                   eventType: "close" },
  { sigilName: "\\widget", canonicalName: "kumu", regex: /<<~!\s*\\widget\s+([\w-]+)(?:\(([^)]*)\))?\s*>>/g, eventType: "open"  },
  { sigilName: "\\widget", canonicalName: "kumu", regex: /<<~\/\\widget\s*>>/g,                               eventType: "close" },
  { sigilName: "\\task", canonicalName: "hana",   regex: /<<~\s*\\task\s+([^\n>]+?)\s*>>/g,  eventType: "open"  },
  { sigilName: "\\task", canonicalName: "hana",   regex: /<<~\/\\task\s*>>/g,                 eventType: "close" },
  // hana — guest-grammar block (direct form; \task is the alias above)
  { sigilName: "hana", regex: /<<~\s*hana\s+([^\n>]+?)\s*>>/g,                eventType: "open"  },
  { sigilName: "hana", regex: /<<~\/hana\s*>>/g,                               eventType: "close" },
  // kukali — reactive wait posture
  { sigilName: "kukali",    regex: /<<~\s*kukali(?:\s+trigger:([\w.-]+))?\s*>>/g, eventType: "leaf" },
  { sigilName: "\\suspends", canonicalName: "kukali", regex: /<<~\s*\\suspends(?:\s+trigger:([\w.-]+))?\s*>>/g, eventType: "leaf" },

  // GENERIC catch-all — MUST stay last (position-dedup lets every specific scan win first). Recognizes
  // any sharktooth form no specific pattern matched: a known sigil in a novel param shape
  // (`<<~ aperture(0->20) >>`, `<<~ keyword(p) ~~ note >>`) or an unknown word. group 1 = sigil-name,
  // group 2 = raw params (lazy, `->`-aware). The builder grades it `missing` — the partial rung — so
  // a form-variant survives as a recognized sigil instead of dropping to water.
  { sigilName: "(generic)", generic: true, regex: /<<~\s*(\\?[A-Za-z][\w-]*)((?:[^>]|->)*?)\s*>>/g, eventType: "leaf" },
];

// ---------------------------------------------------------------------------
// buildScansFromGrammar — hydrate grammar-meme sigil rules into SigilScan[]
// ---------------------------------------------------------------------------

function safeRegex(src: string, flags: string): RegExp | null {
  try { return new RegExp(src, flags); } catch { return null; }
}

export function buildScansFromGrammar(sigils: SigilRule[]): SigilScan[] {
  const scans: SigilScan[] = [];
  for (const s of sigils) {
    const extra = s.aliasFor ? { canonicalName: s.aliasFor } : {};
    if (s.openPattern)   { const rx = safeRegex(s.openPattern,   "g");  if (rx) scans.push({ sigilName: s.name, ...extra, regex: rx, eventType: "open"   }); }
    if (s.closePattern)  { const rx = safeRegex(s.closePattern,  "g");  if (rx) scans.push({ sigilName: s.name, ...extra, regex: rx, eventType: "close"  }); }
    if (s.pragmaPattern) { const rx = safeRegex(s.pragmaPattern, "g");  if (rx) scans.push({ sigilName: s.name, ...extra, regex: rx, eventType: "pragma" }); }
    if (s.blockPattern)  { const rx = safeRegex(s.blockPattern,  "gs"); if (rx) scans.push({ sigilName: s.name, ...extra, regex: rx, eventType: "leaf"   }); }
    if (s.inlinePattern) { const rx = safeRegex(s.inlinePattern, "g");  if (rx) scans.push({ sigilName: s.name, ...extra, regex: rx, eventType: "leaf"   }); }
    if (s.pattern && !s.openPattern && !s.blockPattern && !s.inlinePattern) {
      const flags = s.name === "pranala" ? "gs" : "g";
      const rx = safeRegex(s.pattern, flags);
      if (rx) scans.push({ sigilName: s.name, ...extra, regex: rx, eventType: "leaf" });
    }
  }
  // Control scans must win at identical positions even in grammar-hydrated mode
  return scans.sort((a, b) => (a.sigilName.startsWith("control-") ? 0 : 1) - (b.sigilName.startsWith("control-") ? 0 : 1));
}

// ---------------------------------------------------------------------------
// collectEvents — scan text + inline alias erasure in one pass
// ---------------------------------------------------------------------------

export function collectEvents(text: string, grammar?: GrammarRules): ParseEvent[] {
  const scans = grammar ? buildScansFromGrammar(grammar.sigils) : BOOTSTRAP_SCANS;

  // Pranala block spans: inline events inside a pranala block body are excluded
  const blockSpans: [number, number][] = [];
  for (const m of text.matchAll(/<<~\s*pranala\s+(#[\w-]+\s+)?(\S+)\s*->\s*(\S+)\s*>>([\s\S]*?)<<~\/pranala\s*>>/gs)) {
    blockSpans.push([m.index!, m.index! + m[0].length]);
  }
  const inBlock = (pos: number): boolean => blockSpans.some(([s, e]) => pos >= s && pos < e);

  const seen   = new Set<number>();
  const events: ParseEvent[] = [];

  for (const scan of scans) {
    const rx       = new RegExp(scan.regex.source, scan.regex.flags.includes("s") ? "gs" : "g");
    const emitName = scan.canonicalName ?? scan.sigilName;
    for (const m of text.matchAll(rx)) {
      const pos = m.index!;
      if (seen.has(pos)) continue;
      if (scan.eventType !== "open" && scan.eventType !== "close" && inBlock(pos)) continue;
      seen.add(pos);
      // The generic catch-all emits the MATCHED sigil-name (group 1), flagged so the builder grades it
      // `missing` (the partial rung); specific scans emit their fixed (alias-erased) name.
      const name = scan.generic ? (m[1] ?? emitName) : emitName;
      const evt: ParseEvent = { pos, end: pos + m[0].length, raw: m[0], sigilName: name, eventType: scan.eventType, groups: [...m] };
      if (scan.generic) evt.generic = true;
      events.push(evt);
    }
  }

  return events.sort((a, b) => a.pos - b.pos || a.end - b.end);
}

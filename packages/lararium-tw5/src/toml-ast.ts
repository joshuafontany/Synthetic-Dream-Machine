/**
 * toml-ast — two-layer TOML engine for lossless carrier round-trips.
 *
 * Read  (#iam → fields, child fences): smol-toml — sync, spec-compliant, ~26 kB,
 *        handles inline comments and TOML tables without a WASM init step.
 *
 * Write (patch key, normalize):        @taplo/lib — WASM, lazy-loaded on first
 *        write call. Comment-preserving format via Taplo CST. Falls back
 *        gracefully to raw string if WASM is unavailable (offline, old browser,
 *        unit tests). Never included in the main bundle chunk.
 *
 * Isomorphic: identical code runs in Node.js and the browser. smol-toml is
 * pure JS; Taplo WASM loads via dynamic import() — resolved from disk on
 * Node, fetched as a code-split chunk on the browser.
 */

import { parse as smolParse } from "smol-toml";
import type { TiddlerFields } from "./deserializer.js";

// ---------------------------------------------------------------------------
// Internal: flatten nested TOML object → flat TiddlerFields
//
// TOML tables become prefix-keyed scalars:
//   { uncertainty: { foo: "bar" } } → { "uncertainty-foo": "bar" }
// Numbers / booleans coerce to string (TW5 tiddler field contract).
// Arrays stay as string[] (maps to TW5 tags-style field).
// ---------------------------------------------------------------------------
function flattenTomlValue(
  obj: Record<string, unknown>,
  prefix = "",
  out: TiddlerFields = {},
): TiddlerFields {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}-${k}` : k;
    if (Array.isArray(v)) {
      out[key] = v.map(String);
    } else if (v !== null && typeof v === "object") {
      flattenTomlValue(v as Record<string, unknown>, key, out);
    } else {
      out[key] = String(v ?? "");
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// parseTaploFields — sync TOML → flat Record.
//
// Uses smol-toml. Handles full TOML spec: inline comments, table sections,
// multi-line strings, typed values.
//
// On parse error: pushes a diagnostic to warnings and returns {}.
// The caller still gets a partial result via carrier-text on the parent tiddler.
// ---------------------------------------------------------------------------
export function parseTaploFields(
  toml:     string,
  warnings: string[] = [],
  context = "#iam",
): TiddlerFields {
  try {
    const decoded = smolParse(toml) as Record<string, unknown>;
    return flattenTomlValue(decoded);
  } catch (e) {
    warnings.push(`${context} TOML parse error: ${e}`);
    return {};
  }
}

// ---------------------------------------------------------------------------
// Taplo write engine — lazy WASM load, comment-preserving format.
//
// _taploLoad gets set on the first call to getTaplo() and reused thereafter.
// If the WASM fails to load, getTaplo() resolves to null and all write-path
// functions degrade gracefully (no throw, no data loss).
// ---------------------------------------------------------------------------
type TaploInstance = {
  format(toml: string): string;
  lint(toml: string): Promise<{ errors: Array<{ error: string }> }>;
};

let _taplo:     TaploInstance | null = null;
let _taploLoad: Promise<TaploInstance | null> | null = null;

function getTaplo(): Promise<TaploInstance | null> {
  if (_taplo)     return Promise.resolve(_taplo);
  if (_taploLoad) return _taploLoad;
  _taploLoad = import("@taplo/lib")
    .then(({ Taplo }) => Taplo.initialize())
    .then((t) => { _taplo = t as TaploInstance; return _taplo; })
    .catch(() => null); // WASM unavailable — degrade gracefully
  return _taploLoad;
}

// ---------------------------------------------------------------------------
// patchTomlKey — comment-safe scalar patch in a TOML block.
//
// Finds `key = <old>  # optional comment` and replaces only the value token,
// leaving the inline comment (and all other keys) untouched. If the key is
// not found, appends it. Reformats with Taplo after patching to normalize
// whitespace without disturbing any comments.
//
// value: string → written as a quoted TOML string
//        number | boolean → written as a bare TOML value
// ---------------------------------------------------------------------------
export async function patchTomlKey(
  tomlText: string,
  key:      string,
  value:    string | number | boolean,
): Promise<string> {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Group 1: prefix  (key + ws + = + ws)
  // Group 2: value   (non-comment, non-newline)
  // Group 3: suffix  (optional inline # comment to EOL)
  const re = new RegExp(
    `^([ \\t]*${escapedKey}[ \\t]*=[ \\t]*)([^#\\n]*)((?:[ \\t]*#[^\\n]*)?)$`,
    "m",
  );

  const serialized = typeof value === "string"
    ? `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
    : String(value);

  let patched: string;
  if (re.test(tomlText)) {
    patched = tomlText.replace(re, (_, pre, _old, suf) => `${pre}${serialized}${suf}`);
  } else {
    patched = `${tomlText.trimEnd()}\n${key} = ${serialized}\n`;
  }

  const taplo = await getTaplo();
  if (taplo) {
    try { return taplo.format(patched); } catch { /* leave unformatted — no data loss */ }
  }
  return patched;
}

// ---------------------------------------------------------------------------
// lintToml — async TOML lint via Taplo.
//
// Returns an array of human-readable error strings. Returns [] if Taplo is
// unavailable (degrade silently — smol-toml parse already catches syntax errors
// on the read path; lint is a best-effort secondary check for the write path).
// ---------------------------------------------------------------------------
export async function lintToml(toml: string): Promise<string[]> {
  const taplo = await getTaplo();
  if (!taplo) return [];
  try {
    const result = await taplo.lint(toml);
    return result.errors.map((e) => e.error);
  } catch {
    return [];
  }
}

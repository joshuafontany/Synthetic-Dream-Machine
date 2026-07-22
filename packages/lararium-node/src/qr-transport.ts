/**
 * qr-transport — GENERATE a scannable QR for a carried carriage, and DECODE a still image back to one.
 *
 * The persona-admission hops (and any carriage) ride a QR between airgapped devices. This is the node side:
 *   · GENERATE (freely, everywhere) — a carriage string → a terminal QR (a tabletop hand-off), a PNG buffer
 *     (a file / a still image), or the raw module matrix. Handshake QRs render at ECC level H — they are small,
 *     so the redundancy buys scan reliability. Pure `qrcode` (soldair, MIT): canvas-free, no node-gyp, offline.
 *   · DECODE (still image, no camera) — the node daemon has no camera, so it decodes a STILL image: a PNG's
 *     bytes → RGBA via `pngjs` (pure-JS, no node-gyp) → an INJECTED matrix decoder → the carriage string. The
 *     decoder is a SEAM (`QrImageDecoder`), NOT a hard dependency, so this module ships no scanner engine of its
 *     own — the node headless decoder + the browser camera decoder both plug in behind the same seam.
 *
 * ── SURFACED (dep decision, not silently taken) ──────────────────────────────────────────────────────────
 * The approved SCAN dep, nimiq `qr-scanner`, owns the BROWSER camera + a Web Worker + the DOM — it cannot run
 * headless in the node daemon (no `Worker`, no `Image`, no `canvas`). So the node STILL-image decoder wants a
 * headless, ImageData-native, pure-JS decoder that plugs into `QrImageDecoder`. `jsQR` (MIT, pure-JS, decodes a
 * raw `{data,width,height}` with NO DOM / wasm / node-gyp) meets every stated constraint and is the recommended
 * node still-decoder; nimiq stays the browser camera leg (deferred with the camera UX). This module leaves the
 * decoder INJECTABLE so neither is baked in until the operator seats the dep.
 *
 * Meme: lar:///ha.ka.ba/lararium/node/qr-transport
 */

import QRCode from "qrcode";
import { PNG } from "pngjs";

/** The QR error-correction level the handshake renders at — H (highest): small payload, max scan redundancy. */
export const HANDSHAKE_QR_ECC = "H" as const;
/** Error-correction levels, densest-last — the resilient renderer degrades H→Q→M→L to fit an oversized hop. */
type QrEcc = "H" | "Q" | "M" | "L";
const ECC_DENSITY_ORDER: readonly QrEcc[] = ["H", "Q", "M", "L"];

/** A resilient terminal-QR render: the outcome + the ECC it fit at, or `oversized` when even ECC-L cannot hold it. */
export interface ResilientQr {
  /** The terminal QR, or an empty string when the carriage is too large for ANY single static QR. */
  readonly qr:        string;
  /** The ECC level it rendered at (degraded from H only when the payload forced it), or null when oversized. */
  readonly ecc:       QrEcc | null;
  /** True when the carriage exceeds a single static QR even at ECC-L — the reserved bc-ur multi-part leg's cue. */
  readonly oversized: boolean;
}

/**
 * Render a terminal QR, DEGRADING the error-correction (H→Q→M→L) only as far as the payload forces. The small
 * hops (enroll / ack) render at ECC H (max scan redundancy); the larger sealed GRANT degrades if it must. When
 * even ECC-L cannot hold it, `oversized` flags the reserved bc-ur multi-part leg — never a throw. The carriage
 * itself (a paste / a PNG / a file) always travels regardless.
 */
export async function qrCarriageToTerminalResilient(carriage: string): Promise<ResilientQr> {
  for (const ecc of ECC_DENSITY_ORDER) {
    try {
      const qr = await QRCode.toString(carriage, { type: "utf8", errorCorrectionLevel: ecc });
      return { qr, ecc, oversized: false };
    } catch { /* too big at this ECC — degrade */ }
  }
  return { qr: "", ecc: null, oversized: true };
}

/** A still-image QR decoder seam — given RGBA bytes + dimensions, return the decoded text, or null on no-read.
 *  The node adapter plugs `jsQR`-shaped decode here; the browser adapter plugs its camera decoder. NO engine
 *  is bundled by this module — the seam keeps the scanner dependency the caller's, injected choice. */
export type QrImageDecoder = (rgba: Uint8ClampedArray, width: number, height: number) => string | null;

/** Render a carriage as a terminal QR (a tabletop hand-off) — ECC H. */
export async function qrCarriageToTerminal(carriage: string): Promise<string> {
  return QRCode.toString(carriage, { type: "utf8", errorCorrectionLevel: HANDSHAKE_QR_ECC });
}

/** Render a carriage as a PNG buffer (a still image a peer photographs / decodes) — ECC H, no canvas/node-gyp. */
export async function qrCarriageToPngBuffer(carriage: string, opts?: { scale?: number; margin?: number }): Promise<Buffer> {
  return QRCode.toBuffer(carriage, {
    errorCorrectionLevel: HANDSHAKE_QR_ECC,
    type: "png",
    scale: opts?.scale ?? 6,
    margin: opts?.margin ?? 2,
  });
}

/** Render a carriage as an SVG string (an embeddable vector QR) — ECC H. Runs anywhere GEN is allowed. */
export async function qrCarriageToSvg(carriage: string): Promise<string> {
  return QRCode.toString(carriage, { type: "svg", errorCorrectionLevel: HANDSHAKE_QR_ECC });
}

/** The raw QR module matrix for a carriage — `{ size, data }` where `data[i]` is 1 (dark) / 0 (light), row-major. */
export function qrCarriageMatrix(carriage: string): { size: number; data: Uint8Array } {
  const qr = QRCode.create(carriage, { errorCorrectionLevel: HANDSHAKE_QR_ECC });
  const size = qr.modules.size;
  const src = qr.modules.data;
  const data = new Uint8Array(size * size);
  for (let i = 0; i < data.length; i++) data[i] = src[i] ? 1 : 0;
  return { size, data };
}

/** Extract RGBA + dimensions from a PNG's bytes (pngjs, pure-JS) — the still-image front-half of a decode. */
export function pngToImageData(pngBytes: Uint8Array): { rgba: Uint8ClampedArray; width: number; height: number } {
  const png = PNG.sync.read(Buffer.from(pngBytes));
  return { rgba: new Uint8ClampedArray(png.data.buffer, png.data.byteOffset, png.data.length), width: png.width, height: png.height };
}

/**
 * Decode a carriage from a still PNG image: bytes → RGBA (pngjs) → the INJECTED matrix decoder → the text, or
 * null on no-read. The decoder is the caller's choice (jsQR headless in node; the camera engine in the browser),
 * so this module bundles no scanner. Fail-soft: a torn PNG or a no-read returns null, never a throw.
 */
export function decodeQrPng(pngBytes: Uint8Array, decode: QrImageDecoder): string | null {
  try {
    const { rgba, width, height } = pngToImageData(pngBytes);
    return decode(rgba, width, height);
  } catch {
    return null;
  }
}

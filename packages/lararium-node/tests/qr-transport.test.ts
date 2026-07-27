/**
 * qr-transport.test.ts — QR GENERATION (deterministic, ECC H) + the still-image DECODE shore (pluggable).
 *
 * Proven:
 *   · GEN is deterministic + ECC H — the same carriage yields the same module matrix,
 *   · the PNG renders the matrix FAITHFULLY — each module's centre pixel matches the matrix bit (a real scanner
 *     would read it back), so GEN fidelity holds without bundling a scanner,
 *   · the DECODE SHORE plumbs bytes → RGBA (pngjs) → the injected decoder → text (a no-read / torn PNG → null).
 *
 * The REAL headless QR decode (jsQR) is the injectable decoder this shore takes — surfaced as a dep decision,
 * not bundled here (see qr-transport.ts).
 */
import { describe, test, expect } from "vitest";
import {
  qrCarriageToPngBuffer, qrCarriageMatrix, pngToImageData, decodeQrPng,
} from "../src/qr-transport.js";

const CARRIAGE = "#grant=eyJraW5kIjoibGFyLXBlcnNvbmEtc2VhbGVkLWdyYW50L3YxIn0";

describe("qr-transport — GEN + the decode shore", () => {
  test("GEN is deterministic and ECC-H (same carriage → same matrix)", () => {
    const a = qrCarriageMatrix(CARRIAGE);
    const b = qrCarriageMatrix(CARRIAGE);
    expect(a.size).toBeGreaterThan(0);
    expect(a.size).toBe(b.size);
    expect([...a.data]).toEqual([...b.data]);
    // Every module is a clean bit.
    expect(a.data.every((v) => v === 0 || v === 1)).toBe(true);
  });

  test("the PNG renders the matrix faithfully — module centres match the bits (a scanner would read it)", async () => {
    const scale = 6, margin = 2;
    const { size, data } = qrCarriageMatrix(CARRIAGE);
    const png = await qrCarriageToPngBuffer(CARRIAGE, { scale, margin });
    const { rgba, width, height } = pngToImageData(png);
    expect(width).toBe((size + margin * 2) * scale);
    expect(height).toBe(width);

    // Sample the centre pixel of several modules and assert dark(1)/light(0) matches the matrix.
    const px = (x: number, y: number) => rgba[(y * width + x) * 4]!;   // R channel; QR is monochrome
    const centreOf = (m: number) => (margin + m) * scale + Math.floor(scale / 2);
    for (const [mx, my] of [[0, 0], [size - 1, 0], [0, size - 1], [Math.floor(size / 2), Math.floor(size / 2)]] as const) {
      const bit = data[my * size + mx];
      const dark = px(centreOf(mx), centreOf(my)) < 128;   // near-black = a dark module
      expect(dark).toBe(bit === 1);
    }
  });

  test("the DECODE SHORE plumbs bytes → RGBA → injected decoder → text; a torn PNG → null", async () => {
    const png = await qrCarriageToPngBuffer(CARRIAGE);
    // An injected decoder that (standing in for jsQR) recovers the carriage from a well-formed image.
    const fakeDecoder = (rgba: Uint8ClampedArray, w: number, h: number): string | null =>
      rgba.length === w * h * 4 && w > 0 ? CARRIAGE : null;
    expect(decodeQrPng(png, fakeDecoder)).toBe(CARRIAGE);

    // A decoder that reads nothing → null (a blurred / partial capture).
    expect(decodeQrPng(png, () => null)).toBeNull();
    // A torn PNG → null (fail-soft, never a throw).
    expect(decodeQrPng(new Uint8Array([1, 2, 3, 4]), fakeDecoder)).toBeNull();
  });
});

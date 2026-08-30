/**
 * `lares vessel card` — hand this vessel's ContactCard to another operator.
 *
 * ── THE ARTIFACT THAT EXISTED WITH NO DOOR ──────────────────────────────────────────────────────
 * A second operator cannot enter a relation with this vessel until she holds its ContactCard — the
 * self-certifying peer identifier `receiveContactCard` consumes, and what the two-human crossing
 * runs on. Every founding mints one and writes it to the identity home. Nothing read it back out:
 * `vessel read` does not show it, and the only consumer sits inside the daemon's auth gate. The
 * artifact stood on the operator's own disk with no door that would hand it to them.
 *
 * ── PUBLIC BY DESIGN, PRIVATE BY SITING ─────────────────────────────────────────────────────────
 * The card carries prekeys and a signature: public material, self-authenticating. It needs a channel
 * with INTEGRITY — a substituted card is the whole attack — and needs no confidentiality at all. It
 * sits at 0600 because it lives beside things that ARE secret, never because it is one.
 *
 * That distinction is worth enforcing rather than asserting, so a card carrying anything that reads
 * like a private key refuses instead of printing. This door is the one place the artifact leaves the
 * machine, which makes it the right place for that refusal to stand.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/operator-peer
 */

/** Field names that would mean a card had stopped being public material. */
const SECRET_MARKS = ["signingkey", "privatekey", "secret", "seed", "signingseed"] as const;

export interface CardHandoff {
  readonly ok:   boolean;
  readonly card: string | null;
  readonly path: string;
  /** What a person needs to know to act — which channel is safe, or why this refused. */
  readonly why:  string;
}

/**
 * Read a card for handing over, or refuse and say why.
 *
 * Takes the bytes rather than the disk so the refusal logic stands testable without a founded vessel;
 * `null` means the file was absent.
 */
export function cardHandoff(raw: string | null, path: string): CardHandoff {
  if (raw === null) {
    return { ok: false, card: null, path,
             why: `no ContactCard at ${path} — the founding mints one: \`lares vessel found\` `
                + "(or `lares vessel rite founding` end to end)." };
  }
  let parsed: unknown;
  try { parsed = JSON.parse(raw); }
  catch { return { ok: false, card: null, path, why: `the card at ${path} does not read as JSON — a card nobody can parse is not a card` }; }

  const found = secretMarkIn(parsed);
  if (found !== null) {
    return { ok: false, card: null, path,
             why: `the card at ${path} carries a field named ${JSON.stringify(found)} — this door refuses `
                + "to print anything that reads as private key material, whatever the surrounding shape claims" };
  }
  return { ok: true, card: raw, path,
           why: "public material — hand it over any channel that preserves INTEGRITY. Secrecy buys nothing; "
              + "a SUBSTITUTED card is the whole attack, so confirm it arrived unchanged (read it back, or "
              + "compare a few bytes aloud)." };
}

/** The first secret-looking field name anywhere in the card, or null. */
function secretMarkIn(node: unknown): string | null {
  if (Array.isArray(node)) {
    for (const v of node) { const hit = secretMarkIn(v); if (hit !== null) return hit; }
    return null;
  }
  if (typeof node !== "object" || node === null) return null;
  for (const [k, v] of Object.entries(node)) {
    if (SECRET_MARKS.includes(k.toLowerCase().replace(/[_-]/g, "") as typeof SECRET_MARKS[number])) return k;
    const hit = secretMarkIn(v);
    if (hit !== null) return hit;
  }
  return null;
}

/** `lares vessel card` — print the card, or refuse with the rite that mints one. */
export async function cmdVesselCard(args: import("../parse-args.js").ParsedArgs): Promise<number> {
  const { readFileSync, existsSync } = await import("node:fs");
  const { join } = await import("node:path");
  const { larIdentityDir } = await import("../env.js");
  const { emit } = await import("../render.js");

  // THE SAME SITING THE FOUNDING WROTE, through the house's own spelling. `<lares>/identity` is the
  // SIBLING of the vessel store, never a child of it — a path rebuilt by hand landed one level deep
  // and reported an absent card on a vessel that had just minted one. The file name carries the
  // operator's login when one is known, so two developers on one machine keep two cards.
  const idDir = larIdentityDir();
  let path = join(idDir, ".vessel-card.json");
  try {
    const named = (await import("node:fs")).readdirSync(idDir).find((f) => f.startsWith(".vessel-card"));
    if (named) path = join(idDir, named);
  } catch { /* an absent identity home reads as an absent card */ }

  const raw = existsSync(path) ? readFileSync(path, "utf8") : null;
  const r = cardHandoff(raw, path);

  emit(args, {
    ok: r.ok,
    ...(r.ok ? {} : { error: { code: "not-found", message: r.why } }),
    data: { path: r.path, ...(r.ok ? { card: r.card } : {}) },
    human: () => {
      if (!r.ok) { console.error(`lares vessel card: ${r.why}`); return; }
      console.log(r.card);
      console.error(`\n  ${r.path}`);
      console.error(`  ${r.why}`);
    },
  });
  return r.ok ? 0 : 4;
}

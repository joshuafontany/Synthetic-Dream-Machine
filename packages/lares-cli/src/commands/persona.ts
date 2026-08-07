/**
 * `lares persona {new <index> --name <petname> [--handle <Handle>] [--seat] | wear <index> | list}` — the
 * operator's door to the
 * PLURALITY-PONO identity multitude (#66). A vessel HOLDS a set of PersonaGroup-roots — one per persona
 * the operator wears (persona-vault) — and WEARS one at a time. This command DRIVES the existing node core;
 * it never re-implements minting, the custody wall, or the pet-name store.
 *
 *   new <index> --name <petname>       mint/load the persona-root at <index> (fail-closed via
 *                                      assertHandleIndex) + set its PRIVATE pet-name
 *              [--handle <Handle>]     declare the public Handle this persona answers to (an intent, not a
 *                                      publish — only an announce binds a persona to a glamour)
 *              [--seat]                stand this persona for a Kahu chair on THIS node (needs a Handle)
 *   wear <index>                       switch the active persona (one-face-to-mesh; reboot-to-switch)
 *   list                               the private multitude-view — held indices, active marker, labels, Handles
 *
 * The pet-name stays PRIVATE (persona-petname: fleet-syncs among the human's own vessels, never PUBLICLY
 * federates); minting a persona announces no public glamour, because only a publicly announced Handle binds
 * a PersonaGroup to a public glamour — a separate, deliberate publish.
 *
 * THREE NAMES, THREE JOBS (dyad, persona-declare). `--name` labels a compartment to its keeper and their own
 * fleet; `--handle` declares what that persona answers to outward; the announce publishes it. The label and
 * the Handle MAY read identical and stay two acts, so a human whose compartment reads "the-burner" can still
 * stand as "The Lindwyrm" — nothing joins them but the human's own say-so. Founder-side: `new` mints an
 * operator-root this vessel holds — a joining vessel receives a root by admit, never mints one here.
 */

import {
  generateOrLoadPersonaGroupRoot, wearPersona, listPersonaRoots, loadActivePersonaIndex,
  makeNodePersonaPetnameStore, makeNodePersonaDeclarationStore,
} from "@lararium/node";
import {
  renameOwnPersona, ownPersonaPetname, HANDLE_INDEX_CEILING,
  declarePersonaHandle, standForKahuSeat, declaredHandle,
  refuseSlot, personaSlotCeiling, type VesselClass,
} from "@lararium/mesh";
import { cmdPersonaAdmit } from "./persona-admit-cmd.js";
import { larDataDir } from "../env.js";
import { emit, exitFor } from "../render.js";
import type { ParsedArgs } from "../parse-args.js";

class UsageError extends Error {}

function usage(): void {
  console.error("usage: lares persona <new <index> --name <petname> [--handle <Handle>] [--seat] | wear <index> | list>");
  console.error("");
  console.error("  new <index> --name <name>   mint/load the persona-root at <index> + set its private pet-name");
  console.error("    [--handle <Handle>]       declare the public Handle it answers to (intent; the announce publishes)");
  console.error("    [--seat]                  stand it for a Kahu chair on this node (needs a Handle)");
  console.error("  wear <index>                switch the active persona (reboot-to-switch — one face to the mesh)");
  console.error("  list                        the private multitude — held indices, active marker, labels, Handles");
  console.error("  admit <offer|grant|open|accept|list>   airgapped device-to-device persona hand-off (QR 3-hop)");
  console.error("");
  console.error("  founding sequence (three symmetric commands, each declaring its Handle + standing for a chair):");
  console.error("    lares persona new 0 --name '<label>' --handle 'Guru Joshua Fontany' --seat");
  console.error("    lares persona new 1 --name '<label>' --handle 'Telarus, KSC'        --seat");
  console.error("    lares persona new 2 --name '<label>' --handle 'The Lindwyrm'        --seat");
  console.error("    lares nexus seal seat");
}

/**
 * This vessel's persona-slot ceiling. A hearth or leaf carries an operator dial; a Herm carries none and
 * never reaches here, because a faceless vessel stands CONTRACTED and mints no root through this verb at all.
 * `LAR_PERSONA_SLOTS` is that dial — a human holds a multitude, and the code decides no part of how large.
 */
function vesselCeiling(): { cls: VesselClass; declared: number | undefined } {
  const raw = process.env["LAR_PERSONA_SLOTS"];
  return { cls: "hearth", declared: raw === undefined ? undefined : Number(raw) };
}

/**
 * Parse a positional handle-index, fail-closed to a clean usage error. TWO bounds ride here and they mean
 * different things: the derivation's own range (structural — no dial reaches past SLIP-0010's hardened
 * ceiling) and THIS VESSEL's slot ceiling (an operator turn, raisable, and the refusal says so).
 */
function parseIndex(raw: string | undefined): number {
  if (raw === undefined) throw new UsageError("a handle-index is required (e.g. `lares persona new 1 --name '…'`)");
  const n = Number(raw);
  if (!Number.isSafeInteger(n) || n < 0 || n >= HANDLE_INDEX_CEILING) {
    throw new UsageError(`handle-index out of range: "${raw}" (expected 0 ≤ n < 0x80000000)`);
  }
  const { cls, declared } = vesselCeiling();
  const refusal = refuseSlot(cls, n, declared);
  if (refusal === "faceless-by-class") {
    throw new UsageError("this vessel holds no human face by class — a crossroads stands contracted, never self-stood.");
  }
  if (refusal === "past-ceiling") {
    throw new UsageError(
      `handle-index ${n} sits at or past this vessel's slot ceiling (${personaSlotCeiling(cls, declared)}) — ` +
      "raise it with LAR_PERSONA_SLOTS if this device should carry more faces.",
    );
  }
  return n;
}

export async function cmdPersona(args: ParsedArgs): Promise<number> {
  const sub = args.positional[0];
  if (!sub) { usage(); return 2; }
  try {
    switch (sub) {
      case "new":   return await personaNew(args);
      case "wear":  return await personaWear(args);
      case "list":  return await personaList(args);
      case "admit": return await cmdPersonaAdmit(args);
      default:
        console.error(`lares persona: unknown sub-verb "${sub}"`);
        usage();
        return 2;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = err instanceof UsageError ? "usage" : "error";
    emit(args, { ok: false, error: { code, message: msg }, human: () => console.error(`lares persona ${sub}: ${msg}`) });
    return exitFor(code);
  }
}

async function personaNew(args: ParsedArgs): Promise<number> {
  const index = parseIndex(args.positional[1]);
  const name = typeof args.options["name"] === "string" ? args.options["name"].trim() : "";
  if (name.length === 0) throw new UsageError("`persona new` needs a private label: --name '<petname>'");
  const handle = typeof args.options["handle"] === "string" ? args.options["handle"].trim() : "";
  const stands = args.flags["seat"] === true;
  // A seat claim answers to a CHAIR NAME, so it needs a Handle — either declared in this breath or already
  // standing from an earlier one. Refusing here beats seating a nameless claim the seal cannot join.
  if (stands && handle.length === 0) {
    const declarations = await makeNodePersonaDeclarationStore();
    const held = await declaredHandle(declarations, index);
    if (!held) {
      throw new UsageError(
        `--seat needs the Handle this persona answers to: --handle '<Handle>' (h${index} declares none yet)`,
      );
    }
  }

  // Mint/load the operator-root (idempotent per index; assertHandleIndex guards inside the core), then
  // set the PRIVATE pet-name. renameOwnPersona keeps its own non-blank guard.
  const root = await generateOrLoadPersonaGroupRoot(larDataDir(), index);
  const petnames = await makeNodePersonaPetnameStore();
  await renameOwnPersona(petnames, index, name);

  // The DECLARATION rides its own store, so the private label never becomes a public commitment by matching
  // a string. Each flag lands its own field; neither implies the other.
  const declarations = await makeNodePersonaDeclarationStore();
  if (handle.length > 0) await declarePersonaHandle(declarations, index, handle);
  if (stands) await standForKahuSeat(declarations, index, true);
  const declaration = await declarations.get(index);

  emit(args, {
    ok: true,
    data: {
      handleIndex: index, petname: name, verifyingKey: root.verifyingKey, created: root.created,
      handle: declaration?.handle ?? null, seat: declaration?.seat === true,
    },
    human: () => {
      console.log(`persona h${index} ${root.created ? "minted" : "loaded"} — "${name}"`);
      console.log(`  verifying key: ${root.verifyingKey}`);
      console.log(`  pet-name is PRIVATE — it fleet-syncs among your own vessels and never PUBLICLY federates.`);
      if (declaration?.handle) {
        console.log(`  declares the Handle "${declaration.handle}" — a local intent until you announce it;`);
        console.log(`  only a publicly announced Handle binds this persona to a public glamour.`);
      } else {
        console.log(`  declares no Handle — name one with --handle '<Handle>' when it should answer outward.`);
      }
      if (declaration?.seat === true) {
        console.log(`  STANDS for a Kahu seat on this node; take the chair with: lares nexus seal seat`);
      }
    },
  });
  return 0;
}

async function personaWear(args: ParsedArgs): Promise<number> {
  const index = parseIndex(args.positional[1]);
  // The custody wall lives in the core: wearing REQUIRES a held root — an unheld index throws there.
  await wearPersona(larDataDir(), index);
  emit(args, {
    ok: true,
    data: { active: index },
    human: () => {
      console.log(`now wearing persona h${index}.`);
      console.log(`  reboot-to-switch: the live vessel presents one face per persona — restart the node to sign as it.`);
    },
  });
  return 0;
}

async function personaList(args: ParsedArgs): Promise<number> {
  const dataDir = larDataDir();
  const held = await listPersonaRoots(dataDir);
  const active = await loadActivePersonaIndex(dataDir);
  const petnames = await makeNodePersonaPetnameStore();
  const declarations = await makeNodePersonaDeclarationStore();

  const rows = await Promise.all(
    held.map(async (handleIndex) => ({
      handleIndex,
      active: handleIndex === active,
      petname: (await ownPersonaPetname(petnames, handleIndex)) ?? null,
      handle: (await declarations.get(handleIndex))?.handle ?? null,
      seat: (await declarations.get(handleIndex))?.seat === true,
    })),
  );

  emit(args, {
    ok: true,
    data: { active: active ?? null, personas: rows },
    human: () => {
      if (rows.length === 0) {
        console.log("no personas held — stand the founder with `lares wake --install`, then name + declare every kahu (three symmetric commands): `lares persona new 0/1/2 --name '<label>' --handle '<Handle>' --seat` (new 0 loads+names the founder).");
        return;
      }
      console.log("personas (the private multitude — private label -> declared Handle):");
      for (const r of rows) {
        const declares = r.handle ? `  ->  "${r.handle}"${r.seat ? " [stands for a Kahu seat]" : ""}` : "";
        console.log(`  ${r.active ? "*" : " "} h${r.handleIndex}  ${r.petname ?? "(unnamed)"}${declares}`);
      }
      console.log(`  (* = active${active === undefined ? "; none worn yet" : ""})`);
    },
  });
  return 0;
}

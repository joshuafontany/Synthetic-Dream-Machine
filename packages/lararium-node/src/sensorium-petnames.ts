import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { atomicWriteFileSync } from "./fs-atomic.js";
import { readManifest, sensoriumContract } from "./sensorium.js";
import type { SensoriumContract } from "@lararium/mesh";

export const PETNAMES_FILE = "petnames.json";
const PETNAMES_SCHEMA = 1;

export interface OperatorNaming {
  readonly kind: "operator";
}

export interface ProjectionNaming {
  readonly kind: "projection";
  readonly projection: string;
  readonly evidence: readonly string[];
}

export interface PetName {
  readonly id: string;
  readonly subject: string;
  readonly label: string;
  readonly status: "accepted" | "proposed";
  readonly origin: OperatorNaming | ProjectionNaming;
  readonly basis: SensoriumContract;
  readonly created: string;
  readonly accepted?: string;
}

interface PetNameLedger {
  readonly schema: typeof PETNAMES_SCHEMA;
  readonly names: readonly PetName[];
}

function pathFor(root: string): string {
  return join(root, PETNAMES_FILE);
}

function emptyLedger(): PetNameLedger {
  return { schema: PETNAMES_SCHEMA, names: [] };
}

function readLedger(root: string): PetNameLedger {
  const path = pathFor(root);
  if (!existsSync(path)) return emptyLedger();
  const value: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error("pet-name ledger must be an object");
  const raw = value as Record<string, unknown>;
  if (raw.schema !== PETNAMES_SCHEMA || !Array.isArray(raw.names)) throw new Error("pet-name ledger has an unsupported shape");
  return raw as unknown as PetNameLedger;
}

function writeLedger(root: string, ledger: PetNameLedger): void {
  atomicWriteFileSync(pathFor(root), JSON.stringify(ledger, null, 2) + "\n");
}

function basisFor(root: string): SensoriumContract {
  const manifest = readManifest(root);
  if (manifest === null) throw new Error(`no sensorium manifest at ${root}`);
  return sensoriumContract(manifest);
}

function nonEmpty(value: string, field: string): string {
  const result = value.trim();
  if (!result) throw new Error(`pet-name ${field} must be non-empty`);
  return result;
}

function mintId(): string {
  return `pn-${randomBytes(8).toString("hex")}`;
}

export function listPetNames(root: string): readonly PetName[] {
  return readLedger(root).names;
}

export function attachPetName(root: string, input: { subject: string; label: string }): PetName {
  const entry: PetName = {
    id: mintId(), subject: nonEmpty(input.subject, "subject"), label: nonEmpty(input.label, "label"),
    status: "accepted", origin: { kind: "operator" }, basis: basisFor(root), created: new Date().toISOString(),
  };
  const ledger = readLedger(root);
  writeLedger(root, { ...ledger, names: [...ledger.names, entry] });
  return entry;
}

export function proposePetName(root: string, input: { subject: string; label: string; projection: string; evidence: readonly string[] }): PetName {
  const entry: PetName = {
    id: mintId(), subject: nonEmpty(input.subject, "subject"), label: nonEmpty(input.label, "label"), status: "proposed",
    origin: { kind: "projection", projection: nonEmpty(input.projection, "projection"), evidence: input.evidence.map((item) => nonEmpty(item, "evidence")) },
    basis: basisFor(root), created: new Date().toISOString(),
  };
  const ledger = readLedger(root);
  writeLedger(root, { ...ledger, names: [...ledger.names, entry] });
  return entry;
}

export function acceptPetName(root: string, id: string): PetName | null {
  const ledger = readLedger(root);
  const index = ledger.names.findIndex((entry) => entry.id === id);
  if (index < 0) return null;
  const prior = ledger.names[index]!;
  if (prior.status === "accepted") return prior;
  const accepted: PetName = { ...prior, status: "accepted", accepted: new Date().toISOString() };
  const names = [...ledger.names];
  names[index] = accepted;
  writeLedger(root, { ...ledger, names });
  return accepted;
}

/**
 * social-tiddlers — tiddler field shapes and typed read helpers for the social plane.
 *
 * TIDDLER-FIRST: all principal / group / session / presence / world-clock data lives
 * in `tiddlers`. No separate typed Records outside `tiddlers`.
 *
 * Keyhive / Ink & Switch / Zelenka: capability fields mirror the three-layer stack
 * (convergent capabilities + Group CRDT + BeeKEM). Queryable from TW5 field filters.
 */

import type { LarTiddlerRecord } from "./tiddler-store.js";
import type { LarDoc } from "./base-doc.js";
import type { FfzClock, ExchangeState, LarTickCounter } from "./ffz-clock.js";

// ── Principal identity ────────────────────────────────────────────────────

export interface IdentityTiddler {
  readonly did:             string;
  readonly displayName:     string;
  readonly createdAt:       string;
  readonly kind:            "operator" | "agent" | "service" | "device";
  /** Ed25519 verifying key (hex). Basis for Keyhive capability delegation. */
  readonly verifyingKey?:   string;
  /** lar: URI of the NexusRegistryDoc. */
  readonly nexusId?:        string;
  /** JSON array of { key, rotatedAt } — audit trail; never decreases. */
  readonly keyHistory?:     string;
  readonly trustTier?:      "local" | "nexus" | "cross-nexus" | "public";
  readonly readPolicy?:     string;
}

export function readIdentityTiddler(raw: LarTiddlerRecord): IdentityTiddler | null {
  const fields = raw.tiddler as Record<string, unknown>;
  const didValue = typeof fields["did"] === "string" ? fields["did"] : undefined;
  if (!didValue) return null;
  return {
    did:            didValue,
    displayName:    typeof fields["displayName"] === "string" ? fields["displayName"] : didValue,
    createdAt:      (fields["createdAt"] as string | undefined) ?? (fields["created"] as string | undefined) ?? "",
    kind:           (fields["kind"] as IdentityTiddler["kind"] | undefined) ?? "device",
    ...(typeof fields["verifyingKey"] === "string" ? { verifyingKey: fields["verifyingKey"] } : {}),
    ...(typeof fields["readPolicy"] === "string" ? { readPolicy: fields["readPolicy"] } : {}),
  };
}

// ── Circle (group) ────────────────────────────────────────────────────────

export interface CircleTiddler {
  readonly id:                  string;
  readonly displayName:         string;
  readonly createdAt:           string;
  readonly kind:                "Circle" | "System";
  readonly memberDids:          string;
  readonly nexusScope?:         "local" | "nexus";
  /** Ed25519 signature over "id|name|nexusScope|sortedMemberDids". */
  readonly memberSignature?:    string;
  /** Space-separated burned nonces — anti-replay for inbound invites. */
  readonly nonceBurnSet?:       string;
  /** BeeKEM encrypted share hint (base64). Keyhive layer (S7.2+). */
  readonly encryptedShareHint?: string;
  readonly capabilityPolicy?:   string;
  readonly readPolicy?:         string;
}

export function readCircleTiddler(raw: LarTiddlerRecord): CircleTiddler | null {
  const fields = raw.tiddler as Record<string, unknown>;
  const id = typeof fields["id"] === "string" ? fields["id"] : undefined;
  if (!id) return null;
  return {
    id,
    displayName:          (fields["displayName"] as string | undefined) ?? id,
    createdAt:            (fields["createdAt"] as string | undefined) ?? (fields["created"] as string | undefined) ?? "",
    kind:                 (fields["kind"] as CircleTiddler["kind"] | undefined) ?? "Circle",
    memberDids:           (fields["memberDids"] as string | undefined) ?? "",
    ...(typeof fields["addressingScope"] === "string" ? { addressingScope: fields["addressingScope"] } : {}),
    ...(typeof fields["encryptedShareHint"] === "string" ? { encryptedShareHint: fields["encryptedShareHint"] } : {}),
    ...(typeof fields["capabilityPolicy"] === "string" ? { capabilityPolicy: fields["capabilityPolicy"] } : {}),
    ...(typeof fields["readPolicy"] === "string" ? { readPolicy: fields["readPolicy"] } : {}),
  };
}

// ── Session ───────────────────────────────────────────────────────────────

export interface SessionTiddler {
  readonly id:                string;
  readonly operatorDid:       string;
  readonly agentId:           string;
  readonly startedAt:         string;
  readonly state:             "active" | "closed";
  readonly eventLogUrl?:      string;
  readonly eventLogHeads?:    string;
  readonly capabilityToken?:  string;
  readonly readPolicy?:       string;
}

export function readSessionTiddler(raw: LarTiddlerRecord): SessionTiddler | null {
  const fields = raw.tiddler as Record<string, unknown>;
  const id = typeof fields["id"] === "string" ? fields["id"] : undefined;
  if (!id) return null;
  return {
    id,
    operatorDid:        (fields["operatorDid"] as string | undefined) ?? "",
    agentId:            (fields["agentId"] as string | undefined) ?? "",
    startedAt:          (fields["startedAt"] as string | undefined) ?? (fields["created"] as string | undefined) ?? "",
    state:              (fields["state"] as SessionTiddler["state"] | undefined) ?? "active",
    ...(typeof fields["capabilityToken"] === "string" ? { capabilityToken: fields["capabilityToken"] } : {}),
    ...(typeof fields["readPolicy"] === "string" ? { readPolicy: fields["readPolicy"] } : {}),
  };
}

// ── Session event log ─────────────────────────────────────────────────────

export interface SessionEvent {
  readonly id:           string;
  readonly clock:        FfzClock;
  readonly tickCounter:  LarTickCounter;
  readonly kind:         string;
  readonly payload:      unknown;
}

export interface SessionEventLog extends LarDoc {
  readonly events: Record<string, SessionEvent>;
}

// ── Ephemeral presence ────────────────────────────────────────────────────

export interface PresenceSlot {
  readonly userId:         string;
  readonly deviceId:       string;
  readonly cursor:         { x: number; y: number } | null;
  readonly viewport:       { x: number; y: number; zoom: number } | null;
  readonly selection:      string[];
  readonly clocks:         Record<string, FfzClock>;
  readonly worldClockRef?: string;
  readonly exchangeState?: ExchangeState;
}


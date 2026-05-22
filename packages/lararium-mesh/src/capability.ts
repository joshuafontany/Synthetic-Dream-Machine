/**
 * Capability protocol — provider-neutral authority seam.
 *
 * Mesh owns the shape. Adapters prove it.
 * Keyhive, local-dev stubs, future UCAN/CAIP/EIP-712 bridges, and job
 * handlers can all satisfy this small interface without depending on a concrete
 * provider package.
 */

/** Small binary gate used before app-specific policy narrows further. */
export type CapabilityAccess = "read" | "admin";

/** Opaque principal identifier: DID, account id, verifying key, or provider handle. */
export type CapabilityPresenter = string;

export interface CapabilityVerifyArgs {
  readonly presenter: CapabilityPresenter;
  readonly bagUrl:    string;
  readonly access:    CapabilityAccess;
}

export interface CapabilityVerifyResult {
  readonly ok:      boolean;
  readonly reason?: string;
}

export interface CapabilityVerifier {
  verify(args: CapabilityVerifyArgs): Promise<CapabilityVerifyResult>;
}

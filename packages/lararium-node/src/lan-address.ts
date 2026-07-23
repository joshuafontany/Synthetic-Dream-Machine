/**
 * lan-address — derive the reach-faces a vessel actually answers on.
 *
 * The server binds `0.0.0.0`, so it answers on EVERY interface the host holds. A banner that names
 * only `localhost` therefore under-reports the vessel: the operator standing at a phone reads a name
 * that resolves, on that phone, to the phone itself. The vessel knows its own interfaces; it says them.
 *
 * Everything here stays PURE — it takes the interface table as an argument and returns strings. The IO
 * (calling `os.networkInterfaces()`, printing the banner) lives at the boot seam in main.ts. That split
 * lets the whole derivation run under a fixed interface table in a test, with no host to depend on.
 *
 * `LAR_PUBLIC_URL` leads when the operator sets it: a declared reach-face names what the OPERATOR made
 * reachable (a tunnel, a reverse proxy, a name in DNS), which the interface table cannot see and must
 * never override.
 *
 * Meme: lar:///ha.ka.ba/lararium/node/lan-address
 */

/** The shape `os.networkInterfaces()` yields, narrowed to the two fields the ranking reads. */
export interface InterfaceAddress {
  address:  string;
  family?:  string | number;
  internal: boolean;
}
export type InterfaceTable = Record<string, InterfaceAddress[] | undefined>;

/** An IPv4 address ranks by REACHABILITY from a phone on the same house network. */
function rankIPv4(addr: string): number {
  if (addr.startsWith("192.168.")) return 0;                        // the household router's own range
  if (addr.startsWith("10."))      return 1;                        // the larger private block
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(addr)) return 2;            // the middle private block
  if (addr.startsWith("169.254."))             return 4;            // self-assigned — carries last, never dropped
  return 3;                                                          // anything else routable
}

/** Read the IPv4 family off an entry — node reports `"IPv4"` on current releases and `4` on older tables. */
function isIPv4(a: InterfaceAddress): boolean {
  return a.family === "IPv4" || a.family === 4;
}

/**
 * Collect the non-internal IPv4 addresses a host answers on, most-reachable first.
 *
 * Loopback drops out (`internal`) because `localhost` already names it, and IPv6 drops out because an
 * operator types these by thumb. Ties hold the interface table's own order, so the banner reads the same
 * way twice in a row on an unchanged host.
 */
export function lanIPv4Addresses(interfaces: InterfaceTable): string[] {
  const found: string[] = [];
  for (const entries of Object.values(interfaces)) {
    for (const a of entries ?? []) {
      if (a.internal || !isIPv4(a) || !a.address) continue;
      if (!found.includes(a.address)) found.push(a.address);
    }
  }
  return found
    .map((address, i) => ({ address, i, rank: rankIPv4(address) }))
    .sort((x, y) => x.rank - y.rank || x.i - y.i)
    .map((e) => e.address);
}

/** One face the vessel answers on. `origin` carries an http origin; `host` carries the bare authority. */
export interface ReachFace {
  /** `declared` names LAR_PUBLIC_URL, `loopback` names localhost, `lan` names an interface address. */
  kind:   "declared" | "loopback" | "lan";
  host:   string;
  origin: string;
}

/**
 * Derive every http origin this vessel answers on, in the order an operator reads them.
 *
 * A declared URL leads (the operator's own truth about reachability), loopback follows (the face the
 * operator's own machine uses), then each LAN address. Duplicate origins collapse — a declared URL that
 * already names an interface address prints once.
 */
export function deriveReachFaces(opts: {
  port:         number;
  declaredUrl?: string | null;
  interfaces:   InterfaceTable;
}): ReachFace[] {
  const faces: ReachFace[] = [];
  const push = (kind: ReachFace["kind"], host: string, origin: string): void => {
    if (faces.some((f) => f.origin === origin)) return;
    faces.push({ kind, host, origin });
  };
  const declared = opts.declaredUrl?.trim();
  if (declared) {
    let host = declared.replace(/^\w+:\/\//, "").replace(/\/.*$/, "");
    try { host = new URL(declared).host; } catch { /* a non-URL declaration still yields its authority */ }
    push("declared", host, declared.replace(/\/+$/, ""));
  }
  push("loopback", `localhost:${opts.port}`, `http://localhost:${opts.port}`);
  for (const ip of lanIPv4Addresses(opts.interfaces)) {
    push("lan", `${ip}:${opts.port}`, `http://${ip}:${opts.port}`);
  }
  return faces;
}

/** Turn an http origin into the `/ws` relay URL a leaf dials. `https` carries to `wss`. */
export function wsUrlForOrigin(origin: string): string {
  return origin.replace(/^http/, "ws").replace(/\/+$/, "") + "/ws";
}

/**
 * Build the crossing URL a leaf opens: the app host, the relay it dials, and the GATE key its V3 proof
 * commits to. The relay rides the SAME host the app came from — a phone that loaded the app over a LAN
 * address cannot dial `localhost`, which on that phone names the phone.
 */
export function crossingUrl(opts: { host: string; appPort: number; wsUrl: string; gateKey: string }): string {
  const appHost = opts.host.replace(/:\d+$/, "");
  return `http://${appHost}:${opts.appPort}/?relay=${opts.wsUrl}&gate=${opts.gateKey}`;
}

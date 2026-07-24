/**
 * lan-address.test — the banner names what the socket answers on.
 *
 * The vessel binds `0.0.0.0`; a banner naming only `localhost` therefore under-reports it, and an
 * operator standing at a phone reads a name that resolves to the phone. These tests pin the derivation
 * against a FIXED interface table, so they say the same thing on a laptop, in CI, and inside a container.
 */
import { describe, test, expect } from "vitest";
import {
  lanIPv4Addresses, deriveReachFaces, wsUrlForOrigin, crossingUrl, appOriginForFace,
  type InterfaceTable, type ReachFace,
} from "../src/lan-address.js";

/** A host holding loopback, a household LAN address, a docker bridge, and an IPv6 face. */
const TABLE: InterfaceTable = {
  lo:     [{ address: "127.0.0.1", family: "IPv4", internal: true }],
  eth0:   [
    { address: "192.168.1.42", family: "IPv4", internal: false },
    { address: "fe80::1",      family: "IPv6", internal: false },
  ],
  docker0: [{ address: "172.17.0.1", family: "IPv4", internal: false }],
};

describe("the reach-faces a vessel answers on", () => {
  test("loopback and IPv6 drop out; the LAN address stands", () => {
    expect(lanIPv4Addresses(TABLE)).toEqual(["192.168.1.42", "172.17.0.1"]);
  });

  test("an older table reporting family as the NUMBER 4 reads the same", () => {
    expect(lanIPv4Addresses({ eth0: [{ address: "10.0.0.7", family: 4, internal: false }] }))
      .toEqual(["10.0.0.7"]);
  });

  test("the household range outranks the larger private blocks — a phone types the first line", () => {
    const t: InterfaceTable = {
      a: [{ address: "172.20.0.3",   family: "IPv4", internal: false }],
      b: [{ address: "10.1.2.3",     family: "IPv4", internal: false }],
      c: [{ address: "192.168.0.11", family: "IPv4", internal: false }],
      d: [{ address: "169.254.9.9",  family: "IPv4", internal: false }],
    };
    expect(lanIPv4Addresses(t)).toEqual(["192.168.0.11", "10.1.2.3", "172.20.0.3", "169.254.9.9"]);
  });

  test("a host with no LAN face still names loopback — the banner never empties", () => {
    const faces = deriveReachFaces({ port: 8080, interfaces: { lo: [{ address: "127.0.0.1", family: "IPv4", internal: true }] } });
    expect(faces).toEqual([{ kind: "loopback", host: "localhost:8080", origin: "http://localhost:8080" }]);
  });

  test("every interface reaches the banner, loopback first, LAN behind it", () => {
    expect(deriveReachFaces({ port: 8080, interfaces: TABLE })).toEqual([
      { kind: "loopback", host: "localhost:8080",    origin: "http://localhost:8080" },
      { kind: "lan",      host: "192.168.1.42:8080", origin: "http://192.168.1.42:8080" },
      { kind: "lan",      host: "172.17.0.1:8080",   origin: "http://172.17.0.1:8080" },
    ]);
  });

  test("a DECLARED public url leads — the operator knows a reachability the interface table cannot see", () => {
    const faces = deriveReachFaces({ port: 8080, declaredUrl: "https://hearth.example/", interfaces: TABLE });
    expect(faces[0]).toEqual({ kind: "declared", host: "hearth.example", origin: "https://hearth.example" });
    expect(faces.map((f) => f.kind)).toEqual(["declared", "loopback", "lan", "lan"]);
  });

  test("a declared url that repeats an interface origin prints ONCE", () => {
    const faces = deriveReachFaces({ port: 8080, declaredUrl: "http://192.168.1.42:8080", interfaces: TABLE });
    expect(faces.filter((f) => f.origin === "http://192.168.1.42:8080")).toHaveLength(1);
  });

  test("the relay url follows the origin's scheme — a TLS face carries wss", () => {
    expect(wsUrlForOrigin("http://192.168.1.42:8080")).toBe("ws://192.168.1.42:8080/ws");
    expect(wsUrlForOrigin("https://hearth.example")).toBe("wss://hearth.example/ws");
  });

  test("the crossing url dials the SAME host the app came from — a phone cannot reach the node's localhost", () => {
    const face: ReachFace = { kind: "lan", host: "192.168.1.42:8080", origin: "http://192.168.1.42:8080" };
    const url = crossingUrl({
      appOrigin: appOriginForFace(face, 5173),
      wsUrl: wsUrlForOrigin(face.origin), gateKey: "ab12",
    });
    expect(url).toBe("http://192.168.1.42:5173/?relay=ws://192.168.1.42:8080/ws&gate=ab12");
    expect(url).not.toContain("localhost");
  });

  // ── DNS-01: a configured LAR_PUBLIC_URL binds the app over https + the relay over wss under ONE name ──

  test("a declared TLS face advertises the APP over https at its own name — no separate app port (a proxy fronts both)", () => {
    const declared: ReachFace = { kind: "declared", host: "enyalios.home.amorphousdreams.net", origin: "https://enyalios.home.amorphousdreams.net" };
    // The proxy terminates TLS and serves the app at the SAME https origin — the app port is not appended.
    expect(appOriginForFace(declared, 5173)).toBe("https://enyalios.home.amorphousdreams.net");
    // The relay under the SAME name carries wss (mixed-content-safe from an https page).
    expect(wsUrlForOrigin(declared.origin)).toBe("wss://enyalios.home.amorphousdreams.net/ws");
    // The whole crossing URL: app over https, relay over wss, one name.
    expect(crossingUrl({ appOrigin: appOriginForFace(declared, 5173), wsUrl: wsUrlForOrigin(declared.origin), gateKey: "beef" }))
      .toBe("https://enyalios.home.amorphousdreams.net/?relay=wss://enyalios.home.amorphousdreams.net/ws&gate=beef");
  });

  test("UNSET LAR_PUBLIC_URL — loopback + LAN faces keep today's http://host:appPort app origin (inert)", () => {
    const faces = deriveReachFaces({ port: 8080, interfaces: TABLE });   // no declaredUrl
    expect(faces.map((f) => f.kind)).toEqual(["loopback", "lan", "lan"]);
    // loopback → localhost on the app port over http; LAN → the interface host on the app port over http.
    expect(appOriginForFace(faces[0]!, 5173)).toBe("http://localhost:5173");
    expect(appOriginForFace(faces[1]!, 5173)).toBe("http://192.168.1.42:5173");
    // The relay stays ws:// for a plain http face — unchanged.
    expect(wsUrlForOrigin(faces[1]!.origin)).toBe("ws://192.168.1.42:8080/ws");
  });

  test("a declared http (non-TLS) face still rides its app port over http — https is not forced onto a plain declaration", () => {
    // The whole point is that the SCHEME rides the declaration: an operator who declares http gets http+ws.
    const declaredHttp: ReachFace = { kind: "declared", host: "192.168.1.42:8080", origin: "http://192.168.1.42:8080" };
    expect(appOriginForFace(declaredHttp, 5173)).toBe("http://192.168.1.42:8080");   // declared origin verbatim
    expect(wsUrlForOrigin(declaredHttp.origin)).toBe("ws://192.168.1.42:8080/ws");
  });
});

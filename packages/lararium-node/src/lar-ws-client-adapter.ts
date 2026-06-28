/**
 * LarWSClientAdapter — re-export from @lararium/mesh.
 *
 * The adapter was lifted to platform-blind mesh (it is isomorphic: global `WebSocket` + automerge's
 * isomorphic `WebSocketClientAdapter` + the platform-blind `runPeerHandshake`), so the browser vessel
 * can compose the same V3 leaf transport for the second spore. This file stays as a back-compat
 * re-export for node consumers (daemon-connector et al. import it via @lararium/node).
 *
 * Meme: lar:///ha.ka.ba/@lararium/mesh/lar-ws-client-adapter
 */

export { LarWSClientAdapter } from "@lararium/mesh";
export type { LarWSClientOptions } from "@lararium/mesh";

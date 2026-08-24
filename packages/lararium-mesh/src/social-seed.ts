/**
 * social-seed — satellite-doc factory functions for the social plane + daemon.
 *
 * Exports:
 *   seedLaresDoc          — create the ba satellite doc on first boot
 * A PLACE seeds the daemon bag alone. A FACE seeds its own four planes, each under the id its PersonaGroup's
 * tag derives (`personaScopedBagIds`) — so the caller passes the bag id in rather than reading a constant,
 * and a vessel holding a multitude keeps one set of relations per face instead of one per machine.
 */

import type { Repo, DocHandle }  from "@automerge/automerge-repo";
import type { LarDoc, SessionEventLog } from "@lararium/mesh";
import {
  DAEMON_BAG_ID,
  emptyLarDoc,
  emptyIdentitiesDoc,
  emptyCirclesDoc,
  emptySessionsDoc,
  mutableLarRecord,
  circleTiddlerUri,
  sessionEventLogUri,
} from "@lararium/mesh";

export function seedIdentitiesDoc(repo: Repo, bagId: string): DocHandle<LarDoc> {
  const handle = repo.create<LarDoc>(emptyIdentitiesDoc());
  handle.change((doc) => {
    doc.tiddlers[bagId] = mutableLarRecord(bagId, { text: handle.url }, "lararium-seed");
  });
  console.log(`[social-seed] IdentitiesDoc seeded  url=${handle.url}`);
  return handle;
}

// The system circles every FACE carries — adding to a circle IS the follow (Kowloon model, jzellis).
// Membership never federates; the graph is private to the persona that holds it, and each face carries its
// own set under its own tag. NEXUS AUTHORIZATION RINGS ARE NOT HERE: a nexus tier names who may act at a
// Nexus, not who a person reads, so it lives on the nexus plane — one ring per Nexus, never one per mask.
const SYSTEM_CIRCLES: Array<{ id: string; displayName: string }> = [
  { id: "following",     displayName: "Following" },
  { id: "all-following", displayName: "All Following" },
  { id: "circles",       displayName: "Circles" },
  { id: "blocked",       displayName: "Blocked" },
  { id: "muted",         displayName: "Muted" },
];

export function seedCirclesDoc(repo: Repo, bagId: string): DocHandle<LarDoc> {
  const handle = repo.create<LarDoc>(emptyCirclesDoc());
  handle.change((doc) => {
    doc.tiddlers[bagId] = mutableLarRecord(bagId, { text: handle.url }, "lararium-seed");
    // The SELF-POINTER answers to the plane's own bag id; every record INSIDE it spells the NAMESPACE.
    // A title resolves verbatim within its own document, so one internal shape serves every face and a
    // reader never has to know which face it stands on to name a circle.
    for (const { id, displayName } of SYSTEM_CIRCLES) {
      const uri = circleTiddlerUri(id);
      doc.tiddlers[uri] = mutableLarRecord(uri, {
        text: "",
        id,
        displayName,
        kind: "System",
        memberDids: "",
        createdAt: "",
      }, "lararium-seed");
    }
  });
  console.log(`[social-seed] CirclesDoc seeded  url=${handle.url}  systemCircles=${SYSTEM_CIRCLES.length}`);
  return handle;
}

export function seedSessionsDoc(repo: Repo, bagId: string): DocHandle<LarDoc> {
  const handle = repo.create<LarDoc>(emptySessionsDoc());
  handle.change((doc) => {
    doc.tiddlers[bagId] = mutableLarRecord(bagId, { text: handle.url }, "lararium-seed");
  });
  console.log(`[social-seed] SessionsDoc seeded  url=${handle.url}`);
  return handle;
}

export function seedDaemonDoc(repo: Repo): DocHandle<LarDoc> {
  const handle = repo.create<LarDoc>(emptyLarDoc());
  handle.change((doc) => {
    doc.tiddlers[DAEMON_BAG_ID] = mutableLarRecord(DAEMON_BAG_ID, { text: handle.url, kind: "oracle" }, "lararium-seed");
  });
  console.log(`[social-seed] DaemonDoc seeded  url=${handle.url}`);
  return handle;
}

/**
 * Seed ONE PersonaGroup's private plane, under the name that group's own material derives.
 *
 * `personaBagId` arrives resolved (`personaBagIdFor(personaGroupDocIdHex)`) rather than derived here,
 * because a plane must exist under its TRUE name from its first write: the capability layer hashes a bag
 * URL to seed the document behind it, so a plane seeded under one name and renamed later would leave a
 * document nothing can reach. The caller mints the PersonaGroup first, then seeds its plane.
 */
export function seedPersonaDoc(repo: Repo, personaBagId: string): DocHandle<LarDoc> {
  const handle = repo.create<LarDoc>(emptyLarDoc());
  handle.change((doc) => {
    doc.tiddlers[personaBagId] = mutableLarRecord(personaBagId, { text: handle.url, kind: "oracle" }, "lararium-seed");
  });
  console.log(`[social-seed] PersonaDoc seeded url=${handle.url}`);
  return handle;
}

export function createSessionEventLog(
  repo:      Repo,
  sessionId: string,
): DocHandle<SessionEventLog> {
  const logHandle = repo.create<SessionEventLog>({ schemaVersion: "0.1", tiddlers: {}, events: {} });
  const logUri = sessionEventLogUri(sessionId);

  // Self-ref oracle tiddler: new doc not yet in composite — direct write is correct here.
  logHandle.change((doc) => {
    doc.tiddlers[logUri] = mutableLarRecord(logUri, {
      text: logHandle.url,
      sessionId,
      kind: "session-event-log",
    }, "lararium-session");
  });

  console.log(`[social-seed] SessionEventLog created  sessionId=${sessionId}  url=${logHandle.url}`);
  return logHandle;
}

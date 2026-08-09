/**
 * social-seed — satellite-doc factory functions for the social plane + daemon.
 *
 * Exports:
 *   seedLaresDoc          — create the ba satellite doc on first boot
 *   seedIdentitiesDoc     — create the @identities satellite doc on first boot
 *   seedCirclesDoc        — create the @circles satellite doc on first boot (+ 5 system circles)
 *   seedSessionsDoc       — create the @sessions satellite doc on first boot
 *   seedDaemonDoc          — create the operator-private daemon bag on first boot
 *   createSessionEventLog — create a per-session SessionEventLog child doc
 */

import type { Repo, DocHandle }  from "@automerge/automerge-repo";
import type { LarDoc, SessionEventLog } from "@lararium/mesh";
import {
  LARES_DOC_URI,
  IDENTITIES_DOC_URI,
  CIRCLES_DOC_URI,
  SESSIONS_DOC_URI,
  DAEMON_BAG_ID,
  emptyLarDoc,
  emptyIdentitiesDoc,
  emptyCirclesDoc,
  emptySessionsDoc,
  mutableLarRecord,
  sessionEventLogUri,
} from "@lararium/mesh";

export function seedLaresDoc(repo: Repo): DocHandle<LarDoc> {
  const handle = repo.create<LarDoc>(emptyLarDoc());
  handle.change((doc) => {
    doc.tiddlers[LARES_DOC_URI] = mutableLarRecord(LARES_DOC_URI, { text: handle.url }, "lararium-seed");
  });
  console.log(`[social-seed] LaresDoc seeded  url=${handle.url}`);
  return handle;
}

export function seedIdentitiesDoc(repo: Repo): DocHandle<LarDoc> {
  const handle = repo.create<LarDoc>(emptyIdentitiesDoc());
  handle.change((doc) => {
    doc.tiddlers[IDENTITIES_DOC_URI] = mutableLarRecord(IDENTITIES_DOC_URI, { text: handle.url }, "lararium-seed");
  });
  console.log(`[social-seed] IdentitiesDoc seeded  url=${handle.url}`);
  return handle;
}

// System circle IDs — auto-seeded per Kowloon model (jzellis): adding to a circle IS the follow;
// membership never federates; social graph is private to the owning node.
const SYSTEM_CIRCLES: Array<{ id: string; displayName: string }> = [
  { id: "following",     displayName: "Following" },
  { id: "all-following", displayName: "All Following" },
  { id: "circles",       displayName: "Circles" },
  { id: "blocked",       displayName: "Blocked" },
  { id: "muted",         displayName: "Muted" },
];

export function seedCirclesDoc(repo: Repo): DocHandle<LarDoc> {
  const handle = repo.create<LarDoc>(emptyCirclesDoc());
  handle.change((doc) => {
    doc.tiddlers[CIRCLES_DOC_URI] = mutableLarRecord(CIRCLES_DOC_URI, { text: handle.url }, "lararium-seed");
    for (const { id, displayName } of SYSTEM_CIRCLES) {
      const uri = `${CIRCLES_DOC_URI}/${id}`;
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

export function seedSessionsDoc(repo: Repo): DocHandle<LarDoc> {
  const handle = repo.create<LarDoc>(emptySessionsDoc());
  handle.change((doc) => {
    doc.tiddlers[SESSIONS_DOC_URI] = mutableLarRecord(SESSIONS_DOC_URI, { text: handle.url }, "lararium-seed");
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

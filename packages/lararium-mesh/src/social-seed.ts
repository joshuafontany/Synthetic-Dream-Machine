/**
 * social-seed — satellite-doc factory functions for the social plane + admin.
 *
 * Exports:
 *   seedLaresDoc          — create the ba satellite doc on first boot
 *   seedIdentitiesDoc     — create the @identities satellite doc on first boot
 *   seedCirclesDoc        — create the @circles satellite doc on first boot (+ 5 system circles)
 *   seedSessionsDoc       — create the @sessions satellite doc on first boot
 *   seedAdminDoc          — create the operator-private admin bag on first boot
 *   createSessionEventLog — create a per-session SessionEventLog child doc
 */

import type { Repo, DocHandle }  from "@automerge/automerge-repo";
import type { LarDoc, SessionEventLog } from "@lararium/mesh";
import {
  LARES_DOC_URI,
  IDENTITIES_DOC_URI,
  CIRCLES_DOC_URI,
  SESSIONS_DOC_URI,
  ADMIN_BAG_ID,
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

export function seedAdminDoc(repo: Repo): DocHandle<LarDoc> {
  const handle = repo.create<LarDoc>(emptyLarDoc());
  handle.change((doc) => {
    doc.tiddlers[ADMIN_BAG_ID] = mutableLarRecord(ADMIN_BAG_ID, { text: handle.url, kind: "oracle" }, "lararium-seed");
  });
  console.log(`[social-seed] AdminDoc seeded  url=${handle.url}`);
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

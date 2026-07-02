<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lararium/tw5/modules/sync-adaptor >>
```toml iam
file-path     = "bags/@lararium/tw5/modules/sync-adaptor.md"
heleuma       = "ha"
mana          = 18
manao         = 17
manaoio       = 17
register      = "Synthesis-Canon"
role          = "canonical source copy: LarariumCrdtSyncAdaptor — CRDT↔TW5 echo-loop gate and apply-change protocol"
source-symbol = "_applyChange"
status-date   = "2026-04-30"
tags          = ["lar:///ha.ka.ba/@lares/api/pono/meme", "lar:///ha.ka.ba/@lares/api/pono/heleuma/ha"]
type          = "text/x-memetic-wikitext"
uri-path      = "ha.ka.ba/@lararium/tw5/modules/sync-adaptor"
```

<<~ &#x0002; >>

<<~ ahu #contract >>

## Sync Adaptor — Contract

`LarariumCrdtSyncAdaptor` implements two protocols simultaneously:

**MemeProjection** (CRDT→TW5 direction)
: Changes arriving from the Automerge store are applied to the live TW5 wiki under an echo-loop guard (`_applying` flag). During initial replay (`onSyncComplete`), changes are buffered and flushed in a single `bulkSetTiddlers` transaction to avoid one widget refresh per tiddler.

**TW5 SyncAdaptor** (TW5→CRDT direction)
: When TW5 fires `saveTiddler` or `deleteTiddler`, the adaptor resolves a `SaveStrategy` by reading the corpus-driven save-cascade meme (`lar:///ha.ka.ba/@lararium/tw5/sync/save-cascade`) and routes accordingly. Carrier-aware: ahu child tiddler writes trigger parent carrier reconstruction.

Echo-loop guard rule:
- Applying a CRDT change sets `_applying = change.origin`
- Any `saveTiddler` call while `_applying !== null` returns immediately with revision "0"
- This prevents the TW5 wiki change event from re-writing the change back to the store

<<~/ahu >>

<<~ ahu #source >>

## Source — `_applyChange` (TypeScript — compiled-in)

```typescript
private _applyChange(change: LarTiddlerChange): void {
    // Skip echoes of our own writes.
    if (change.origin.kind === "tw-local" && change.origin.instanceId === this.instanceId) return;

    // M-bags: key becomes change.origin.edgeIsland when available.
    const applyKey = this.instanceId;
    this._applying.set(applyKey, change.origin);
    try {
      if (change.record === null || change.record.deleted) {
        this.tw5.removeTiddler(change.title);
        const childTitles: string[] = this.tw5.filterTiddlers(`[field:fragment-parent[${change.title}]]`);
        for (const t of childTitles) this.tw5.removeTiddler(t);
        this._pendingDeletions.add(change.title);
      } else {
        const rec = change.record;
        const isCarrier = rec.text !== undefined &&
          (rec.fields["type"] === "text/x-memetic-wikitext" ||
            rec.fields["content-type"] === "text/x-memetic-wikitext" ||
            (!(rec.fields["type"] || rec.fields["content-type"]) && change.title.startsWith("lar:")));

        if (isCarrier && rec.text) {
          const staleChildren: string[] = this.tw5.filterTiddlers(`[field:fragment-parent[${change.title}]]`);
          for (const t of staleChildren) this.tw5.removeTiddler(t);
          const tiddlers = this.tw5.deserializeCarrier(
            change.title, rec.text, rec.fields as Record<string, string | string[]>,
          );
          for (const t of tiddlers) this.tw5.setTiddler(t as Record<string, string | string[]>);
        } else {
          const fields: Record<string, string | string[]> = { title: rec.title, ...rec.fields };
          if (rec.text !== undefined) fields["text"] = rec.text;
          this.tw5.setTiddler(fields);
        }

        this._pendingModifications.add(change.title);
        if (change.revision) this._revisions.set(change.title, change.revision);
      }
    } finally {
      this._applying.delete(applyKey);
    }
  }
```

<<~/ahu >>

<<~ ahu #edges >>

<<~ loulou lar:///ha.ka.ba/@lararium/tw5/sync/save-cascade >>
<<~ loulou lar:///ha.ka.ba/@lararium/tw5/modules/boot-gate >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>

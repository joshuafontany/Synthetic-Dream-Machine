import type { LarTiddlerStore } from "@lararium/mesh";
import { IslandAdaptor } from "./island-adaptor.js";
import type { TW5Engine } from "./tw5-vm.js";

export interface VmCarrierSyncSessionOptions {
  readonly vm: TW5Engine;
  readonly store: LarTiddlerStore;
  readonly instanceId: string;
}

export interface VmCarrierSyncInput {
  readonly uri: string;
  readonly text: string;
  readonly sourceFile?: string;
  readonly syncedAt?: string;
  readonly realmOrigin?: string;
}

export interface VmCarrierSyncResult {
  readonly changed: boolean;
  readonly recordWrites: number;
  readonly recordTitles: readonly string[];
  readonly staleTitles: readonly string[];
}

export interface VmCarrierSyncSession {
  syncCarrier(input: VmCarrierSyncInput): Promise<VmCarrierSyncResult>;
  stop(): void;
}

export function openVmCarrierSyncSession(opts: VmCarrierSyncSessionOptions): VmCarrierSyncSession {
  const adaptor = new IslandAdaptor(opts.vm, opts.store, opts.instanceId);
  adaptor.start();
  adaptor.onSyncComplete("automerge");

  return {
    async syncCarrier(input: VmCarrierSyncInput): Promise<VmCarrierSyncResult> {
      const syncedAt = input.syncedAt ?? new Date().toISOString();
      const vmTiddlers = opts.vm.ingestCarrier(
        input.uri,
        input.text,
        {
          ...(input.sourceFile ? { "source-file": input.sourceFile } : {}),
          "synced-at": syncedAt,
        },
        input.realmOrigin ? { realmOrigin: input.realmOrigin } : undefined,
      );
      if (vmTiddlers.length === 0) {
        return { changed: false, recordWrites: 0, recordTitles: [], staleTitles: [] };
      }

      const recordTitles = vmTiddlers.map((record) => record.tiddler.title);
      const liveTitles = new Set(recordTitles);
      const staleTitles = (await opts.store.listVisible())
        .filter((title) => title.startsWith(`${input.uri}#`))
        .filter((title) => !liveTitles.has(title));

      let recordWrites = 0;
      for (const record of vmTiddlers) {
        await adaptor.saveRecord(record);
        recordWrites++;
      }

      for (const title of staleTitles) {
        await adaptor.deleteTiddler(title);
        recordWrites++;
      }

      return {
        changed: recordWrites > 0,
        recordWrites,
        recordTitles,
        staleTitles,
      };
    },

    stop(): void {
      adaptor.stop();
    },
  };
}
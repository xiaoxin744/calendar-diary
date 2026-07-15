import { diarySnapshotSchema } from '@/domain/schema';
import type { DiarySnapshot } from '@/domain/types';
import type { SyncData, SyncMetadata, SyncResult, WebDavConfig } from '@/domain/syncTypes';
import { localBackupRepository, syncMetadataRepository } from '@/data/syncRepository';
import { mergeSnapshots, snapshotsHaveSameContent } from '@/services/mergeService';
import { WebDavClient, WebDavError } from '@/services/webDavClient';

const snapshotToSyncData = (snapshot: DiarySnapshot): SyncData => ({
  version: 1,
  updatedAt: snapshot.updatedAt,
  data: snapshot.days,
  monthlyPlans: snapshot.monthlyPlans,
});

const syncDataToSnapshot = (data: SyncData): DiarySnapshot => diarySnapshotSchema.parse({
  schemaVersion: 1,
  days: data.data,
  monthlyPlans: data.monthlyPlans,
  updatedAt: data.updatedAt,
});

let syncQueue: Promise<SyncResult> | null = null;

const runSync = async (localSnapshot: DiarySnapshot, config: WebDavConfig): Promise<SyncResult> => {
  const client = new WebDavClient(config);
  await client.ensureDirectories();
  const metadata = await syncMetadataRepository.load();

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const remote = await client.readRemoteData();
    const completedAt = new Date().toISOString();

    if (!remote) {
      const uploaded = { ...localSnapshot, updatedAt: completedAt };
      try {
        await client.writeRemoteData(snapshotToSyncData(uploaded), null, true);
      } catch (error: unknown) {
        if (error instanceof WebDavError && error.status === 412 && attempt === 0) continue;
        throw error;
      }
      const nextMetadata: SyncMetadata = {
        lastSyncedAt: completedAt,
        lastBackupAt: metadata.lastBackupAt,
        lastConflictCount: 0,
        baseSnapshot: uploaded,
      };
      await syncMetadataRepository.save(nextMetadata);
      return {
        snapshot: uploaded,
        conflictCount: 0,
        remoteBackupCreated: false,
        direction: 'uploaded',
        completedAt,
      };
    }

    const remoteSnapshot = syncDataToSnapshot(remote.data);
    if (snapshotsHaveSameContent(localSnapshot, remoteSnapshot)) {
      const synchronized = { ...localSnapshot, updatedAt: remoteSnapshot.updatedAt };
      await syncMetadataRepository.save({
        lastSyncedAt: completedAt,
        lastBackupAt: metadata.lastBackupAt,
        lastConflictCount: 0,
        baseSnapshot: synchronized,
      });
      return {
        snapshot: synchronized,
        conflictCount: 0,
        remoteBackupCreated: false,
        direction: 'unchanged',
        completedAt,
      };
    }

    await localBackupRepository.create(localSnapshot, 'before-sync');
    const merged = mergeSnapshots(localSnapshot, remoteSnapshot, metadata.baseSnapshot);
    const differsFromRemote = !snapshotsHaveSameContent(merged.snapshot, remoteSnapshot);
    const differsFromLocal = !snapshotsHaveSameContent(merged.snapshot, localSnapshot);
    let remoteBackupCreated = false;
    let lastBackupAt = metadata.lastBackupAt;

    try {
      if (differsFromRemote) {
        await client.createBackup(remote.data);
        remoteBackupCreated = true;
        lastBackupAt = completedAt;
        const uploadSnapshot = { ...merged.snapshot, updatedAt: completedAt };
        await client.writeRemoteData(snapshotToSyncData(uploadSnapshot), remote.etag, false);
        merged.snapshot = uploadSnapshot;
      } else {
        merged.snapshot = { ...merged.snapshot, updatedAt: remoteSnapshot.updatedAt };
      }
    } catch (error: unknown) {
      if (error instanceof WebDavError && error.status === 412 && attempt === 0) continue;
      throw error;
    }

    await syncMetadataRepository.save({
      lastSyncedAt: completedAt,
      lastBackupAt,
      lastConflictCount: merged.conflictCount,
      baseSnapshot: merged.snapshot,
    });
    return {
      snapshot: merged.snapshot,
      conflictCount: merged.conflictCount,
      remoteBackupCreated,
      direction: differsFromRemote && differsFromLocal ? 'merged' : differsFromRemote ? 'uploaded' : 'downloaded',
      completedAt,
    };
  }

  throw new Error('同步期间云端数据持续变化，请稍后重试。');
};

export const syncService = {
  async testConnection(config: WebDavConfig): Promise<void> {
    await new WebDavClient(config).testConnection();
  },

  async synchronize(localSnapshot: DiarySnapshot, config: WebDavConfig): Promise<SyncResult> {
    const validated = diarySnapshotSchema.parse(localSnapshot);
    if (syncQueue) return syncQueue;
    syncQueue = runSync(validated, config).finally(() => {
      syncQueue = null;
    });
    return syncQueue;
  },
};

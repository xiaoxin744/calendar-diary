import type { DiarySnapshot } from '@/domain/types';

export interface WebDavConfig {
  serverUrl: string;
  rootPath: string;
  username: string;
  password: string;
}

export interface SyncData {
  version: 1;
  updatedAt: string;
  data: DiarySnapshot['days'];
  monthlyPlans: DiarySnapshot['monthlyPlans'];
}

export interface SyncPreferences {
  autoSyncEnabled: boolean;
  intervalMinutes: number;
}

export interface SyncMetadata {
  lastSyncedAt: string | null;
  lastBackupAt: string | null;
  lastConflictCount: number;
  baseSnapshot: DiarySnapshot | null;
}

export interface SyncResult {
  snapshot: DiarySnapshot;
  conflictCount: number;
  remoteBackupCreated: boolean;
  direction: 'uploaded' | 'downloaded' | 'merged' | 'unchanged';
  completedAt: string;
}

export interface LocalBackup {
  id: string;
  createdAt: string;
  reason: 'automatic' | 'before-sync' | 'before-import' | 'manual';
  snapshot: DiarySnapshot;
}

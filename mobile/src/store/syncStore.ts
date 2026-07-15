import { create } from 'zustand';
import { localBackupRepository, syncConfigRepository, syncMetadataRepository } from '@/data/syncRepository';
import type { SyncResult, WebDavConfig } from '@/domain/syncTypes';
import { configureBackgroundSync } from '@/services/backgroundSyncTask';
import { syncService } from '@/services/syncService';
import { validateWebDavConfig } from '@/services/webDavClient';
import { useDiaryStore } from '@/store/diaryStore';

type SyncStatus = 'idle' | 'testing' | 'syncing' | 'success' | 'error';

interface SyncStore {
  hydrated: boolean;
  configured: boolean;
  config: WebDavConfig | null;
  autoSyncEnabled: boolean;
  intervalMinutes: number;
  backgroundAvailable: boolean;
  status: SyncStatus;
  errorMessage: string | null;
  lastSyncedAt: string | null;
  lastBackupAt: string | null;
  lastConflictCount: number;
  lastDirection: SyncResult['direction'] | null;
  localBackupCount: number;
  hydrate: () => Promise<void>;
  testConnection: (config: WebDavConfig) => Promise<void>;
  saveConfig: (config: WebDavConfig) => Promise<void>;
  clearConfig: () => Promise<void>;
  setAutoSync: (enabled: boolean) => Promise<void>;
  syncNow: () => Promise<SyncResult>;
  syncIfDue: () => Promise<void>;
  restoreLatestBackup: () => Promise<boolean>;
}

const currentSnapshot = () => {
  const state = useDiaryStore.getState();
  return {
    schemaVersion: 1 as const,
    days: state.days,
    monthlyPlans: state.monthlyPlans,
    updatedAt: state.updatedAt,
  };
};

export const useSyncStore = create<SyncStore>((set, get) => ({
  hydrated: false,
  configured: false,
  config: null,
  autoSyncEnabled: false,
  intervalMinutes: 60,
  backgroundAvailable: false,
  status: 'idle',
  errorMessage: null,
  lastSyncedAt: null,
  lastBackupAt: null,
  lastConflictCount: 0,
  lastDirection: null,
  localBackupCount: 0,

  hydrate: async () => {
    try {
      const [config, preferences, metadata, backups] = await Promise.all([
        syncConfigRepository.load(),
        syncConfigRepository.loadPreferences(),
        syncMetadataRepository.load(),
        localBackupRepository.list(),
      ]);
      let backgroundAvailable = false;
      if (config && preferences.autoSyncEnabled) {
        backgroundAvailable = await configureBackgroundSync(true, preferences.intervalMinutes).catch(() => false);
      }
      set({
        hydrated: true,
        configured: Boolean(config),
        config,
        autoSyncEnabled: preferences.autoSyncEnabled,
        intervalMinutes: preferences.intervalMinutes,
        backgroundAvailable,
        lastSyncedAt: metadata.lastSyncedAt,
        lastBackupAt: metadata.lastBackupAt,
        lastConflictCount: metadata.lastConflictCount,
        localBackupCount: backups.length,
        status: 'idle',
        errorMessage: null,
      });
    } catch (error: unknown) {
      set({ hydrated: true, status: 'error', errorMessage: error instanceof Error ? error.message : '同步配置读取失败' });
    }
  },

  testConnection: async (config) => {
    set({ status: 'testing', errorMessage: null });
    try {
      await syncService.testConnection(validateWebDavConfig(config));
      set({ status: 'success' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'WebDAV 连接失败';
      set({ status: 'error', errorMessage: message });
      throw error;
    }
  },

  saveConfig: async (config) => {
    const normalized = validateWebDavConfig(config);
    await syncConfigRepository.save(normalized);
    set({ config: normalized, configured: true, status: 'success', errorMessage: null });
  },

  clearConfig: async () => {
    await Promise.all([
      syncConfigRepository.clear(),
      syncConfigRepository.savePreferences({ autoSyncEnabled: false, intervalMinutes: get().intervalMinutes }),
      configureBackgroundSync(false, get().intervalMinutes).catch(() => false),
    ]);
    set({
      config: null,
      configured: false,
      autoSyncEnabled: false,
      backgroundAvailable: false,
      lastSyncedAt: null,
      lastBackupAt: null,
      lastConflictCount: 0,
      lastDirection: null,
      status: 'idle',
      errorMessage: null,
    });
  },

  setAutoSync: async (enabled) => {
    if (enabled && !get().config) throw new Error('请先保存 WebDAV 配置。');
    const preferences = { autoSyncEnabled: enabled, intervalMinutes: get().intervalMinutes };
    await syncConfigRepository.savePreferences(preferences);
    const backgroundAvailable = await configureBackgroundSync(enabled, preferences.intervalMinutes).catch(() => false);
    set({ autoSyncEnabled: enabled, backgroundAvailable, errorMessage: null });
  },

  syncNow: async () => {
    const config = get().config;
    if (!config) throw new Error('请先配置 WebDAV。');
    set({ status: 'syncing', errorMessage: null });
    try {
      const result = await syncService.synchronize(currentSnapshot(), config);
      await useDiaryStore.getState().replaceSnapshot(result.snapshot);
      const backups = await localBackupRepository.list();
      set({
        status: 'success',
        lastSyncedAt: result.completedAt,
        lastBackupAt: result.remoteBackupCreated ? result.completedAt : get().lastBackupAt,
        lastConflictCount: result.conflictCount,
        lastDirection: result.direction,
        localBackupCount: backups.length,
      });
      return result;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '同步失败';
      set({ status: 'error', errorMessage: message });
      throw error;
    }
  },

  syncIfDue: async () => {
    const state = get();
    if (!state.autoSyncEnabled || !state.configured || state.status === 'syncing' || !useDiaryStore.getState().hydrated) return;
    const lastTime = state.lastSyncedAt ? Date.parse(state.lastSyncedAt) : 0;
    if (Date.now() - lastTime < state.intervalMinutes * 60_000) return;
    await get().syncNow().catch(() => undefined);
  },

  restoreLatestBackup: async () => {
    const backup = await localBackupRepository.latest();
    if (!backup) return false;
    await useDiaryStore.getState().replaceSnapshot({ ...backup.snapshot, updatedAt: new Date().toISOString() });
    set({ status: 'success', errorMessage: null });
    return true;
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { diarySnapshotSchema } from '@/domain/schema';
import type { LocalBackup, SyncMetadata, SyncPreferences, WebDavConfig } from '@/domain/syncTypes';
import { snapshotsHaveSameContent } from '@/services/mergeService';

const CONFIG_KEY = 'calendar-diary:webdav-config:v1';
const PASSWORD_KEY = 'calendar-diary:webdav-password:v1';
const PREFERENCES_KEY = 'calendar-diary:sync-preferences:v1';
const METADATA_KEY = 'calendar-diary:sync-metadata:v1';
const LOCAL_BACKUPS_KEY = 'calendar-diary:local-sync-backups:v1';
const MAX_LOCAL_BACKUPS = 3;
let backupWriteQueue: Promise<void> = Promise.resolve();

const DEFAULT_PREFERENCES: SyncPreferences = {
  autoSyncEnabled: false,
  intervalMinutes: 60,
};

const DEFAULT_METADATA: SyncMetadata = {
  lastSyncedAt: null,
  lastBackupAt: null,
  lastConflictCount: 0,
  baseSnapshot: null,
};

const readJson = async (key: string): Promise<unknown> => {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
};

const readPassword = async (): Promise<string> => {
  if (Platform.OS === 'web') return await AsyncStorage.getItem(PASSWORD_KEY) ?? '';
  return await SecureStore.getItemAsync(PASSWORD_KEY) ?? '';
};

const writePassword = async (password: string): Promise<void> => {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(PASSWORD_KEY, password);
    return;
  }
  await SecureStore.setItemAsync(PASSWORD_KEY, password, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
};

const deletePassword = async (): Promise<void> => {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(PASSWORD_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(PASSWORD_KEY);
};

export const syncConfigRepository = {
  async load(): Promise<WebDavConfig | null> {
    const value = await readJson(CONFIG_KEY);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const config = value as Record<string, unknown>;
    if (typeof config.serverUrl !== 'string' || typeof config.rootPath !== 'string' || typeof config.username !== 'string') return null;
    return {
      serverUrl: config.serverUrl,
      rootPath: config.rootPath,
      username: config.username,
      password: await readPassword(),
    };
  },

  async save(config: WebDavConfig): Promise<void> {
    await AsyncStorage.setItem(CONFIG_KEY, JSON.stringify({
      serverUrl: config.serverUrl,
      rootPath: config.rootPath,
      username: config.username,
    }));
    await writePassword(config.password);
  },

  async clear(): Promise<void> {
    await Promise.all([
      AsyncStorage.removeItem(CONFIG_KEY),
      AsyncStorage.removeItem(METADATA_KEY),
      deletePassword(),
    ]);
  },

  async loadPreferences(): Promise<SyncPreferences> {
    const value = await readJson(PREFERENCES_KEY);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return DEFAULT_PREFERENCES;
    const preferences = value as Record<string, unknown>;
    return {
      autoSyncEnabled: preferences.autoSyncEnabled === true,
      intervalMinutes: typeof preferences.intervalMinutes === 'number' && preferences.intervalMinutes >= 15
        ? Math.min(preferences.intervalMinutes, 24 * 60)
        : DEFAULT_PREFERENCES.intervalMinutes,
    };
  },

  async savePreferences(preferences: SyncPreferences): Promise<void> {
    await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  },
};

export const syncMetadataRepository = {
  async load(): Promise<SyncMetadata> {
    const value = await readJson(METADATA_KEY);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return DEFAULT_METADATA;
    const metadata = value as Record<string, unknown>;
    const baseResult = diarySnapshotSchema.safeParse(metadata.baseSnapshot);
    return {
      lastSyncedAt: typeof metadata.lastSyncedAt === 'string' ? metadata.lastSyncedAt : null,
      lastBackupAt: typeof metadata.lastBackupAt === 'string' ? metadata.lastBackupAt : null,
      lastConflictCount: typeof metadata.lastConflictCount === 'number' ? Math.max(0, metadata.lastConflictCount) : 0,
      baseSnapshot: baseResult.success ? baseResult.data : null,
    };
  },

  async save(metadata: SyncMetadata): Promise<void> {
    await AsyncStorage.setItem(METADATA_KEY, JSON.stringify(metadata));
  },
};

const parseBackups = (value: unknown): LocalBackup[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate): LocalBackup[] => {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return [];
    const backup = candidate as Record<string, unknown>;
    const snapshot = diarySnapshotSchema.safeParse(backup.snapshot);
    if (!snapshot.success || typeof backup.id !== 'string' || typeof backup.createdAt !== 'string') return [];
    if (backup.reason !== 'automatic' && backup.reason !== 'before-sync' && backup.reason !== 'before-import' && backup.reason !== 'manual') return [];
    return [{ id: backup.id, createdAt: backup.createdAt, reason: backup.reason, snapshot: snapshot.data }];
  });
};

export const localBackupRepository = {
  async list(): Promise<LocalBackup[]> {
    return parseBackups(await readJson(LOCAL_BACKUPS_KEY));
  },

  async create(snapshot: LocalBackup['snapshot'], reason: LocalBackup['reason']): Promise<LocalBackup> {
    const validated = diarySnapshotSchema.parse(snapshot);
    let result: LocalBackup | null = null;
    backupWriteQueue = backupWriteQueue.catch(() => undefined).then(async () => {
      const backups = parseBackups(await readJson(LOCAL_BACKUPS_KEY));
      const latest = backups[0];
      if (latest && snapshotsHaveSameContent(latest.snapshot, validated)) {
        result = latest;
        return;
      }
      const createdAt = new Date().toISOString();
      const backup: LocalBackup = { id: createdAt, createdAt, reason, snapshot: validated };
      await AsyncStorage.setItem(LOCAL_BACKUPS_KEY, JSON.stringify([backup, ...backups].slice(0, MAX_LOCAL_BACKUPS)));
      result = backup;
    });
    await backupWriteQueue;
    if (!result) throw new Error('本地自动备份创建失败。');
    return result;
  },

  async createIfDue(snapshot: LocalBackup['snapshot'], minimumIntervalMs = 6 * 60 * 60 * 1000): Promise<LocalBackup | null> {
    const latest = await this.latest();
    if (latest && Date.now() - Date.parse(latest.createdAt) < minimumIntervalMs) return latest;
    return this.create(snapshot, 'automatic');
  },

  async latest(): Promise<LocalBackup | null> {
    return (await this.list())[0] ?? null;
  },
};

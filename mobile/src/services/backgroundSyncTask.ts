import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { diaryRepository } from '@/data/diaryRepository';
import { syncConfigRepository } from '@/data/syncRepository';
import { syncService } from '@/services/syncService';

export const BACKGROUND_SYNC_TASK = 'calendar-diary-webdav-sync';

if (Platform.OS !== 'web' && !TaskManager.isTaskDefined(BACKGROUND_SYNC_TASK)) {
  TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
    try {
      const [config, preferences] = await Promise.all([
        syncConfigRepository.load(),
        syncConfigRepository.loadPreferences(),
      ]);
      if (!config || !preferences.autoSyncEnabled) return BackgroundTask.BackgroundTaskResult.Success;
      const snapshot = await diaryRepository.load();
      const result = await syncService.synchronize(snapshot, config);
      await diaryRepository.save(result.snapshot);
      return BackgroundTask.BackgroundTaskResult.Success;
    } catch {
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
}

export const configureBackgroundSync = async (enabled: boolean, intervalMinutes: number): Promise<boolean> => {
  if (Platform.OS === 'web') return false;
  const registered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
  if (!enabled) {
    if (registered) await BackgroundTask.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
    return false;
  }

  const status = await BackgroundTask.getStatusAsync();
  if (status !== BackgroundTask.BackgroundTaskStatus.Available) return false;
  if (registered) await BackgroundTask.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
  await BackgroundTask.registerTaskAsync(BACKGROUND_SYNC_TASK, {
    minimumInterval: Math.max(15, intervalMinutes),
  });
  return true;
};

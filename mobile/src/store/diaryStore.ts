import { create } from 'zustand';
import { diaryRepository } from '@/data/diaryRepository';
import { localBackupRepository } from '@/data/syncRepository';
import type { DayEvent, DiarySnapshot } from '@/domain/types';
import { EMPTY_SNAPSHOT } from '@/domain/types';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface DiaryStore extends DiarySnapshot {
  hydrated: boolean;
  saveStatus: SaveStatus;
  errorMessage: string | null;
  hydrate: () => Promise<void>;
  saveDay: (dateKey: string, events: DayEvent[], stickers: string[]) => void;
  updatePlan: (monthKey: string, index: number, value: string) => void;
  replaceSnapshot: (snapshot: DiarySnapshot) => Promise<void>;
  clearAll: () => Promise<void>;
}

let writeQueue: Promise<void> = Promise.resolve();
let latestWriteId = 0;

const snapshotFromStore = (state: DiaryStore): DiarySnapshot => ({
  schemaVersion: 1,
  days: state.days,
  monthlyPlans: state.monthlyPlans,
  updatedAt: state.updatedAt,
});

export const useDiaryStore = create<DiaryStore>((set, get) => {
  const enqueueWrite = (operation: () => Promise<void>) => {
    const writeId = ++latestWriteId;
    set({ saveStatus: 'saving', errorMessage: null });
    const pendingWrite = writeQueue
      .catch(() => undefined)
      .then(operation);
    writeQueue = pendingWrite;

    void pendingWrite.then(() => {
      if (writeId === latestWriteId) set({ saveStatus: 'saved' });
    }).catch((error: unknown) => {
      if (writeId === latestWriteId) {
        const message = error instanceof Error ? error.message : '保存失败';
        set({ saveStatus: 'error', errorMessage: message });
      }
    });

    return pendingWrite;
  };

  const queueSave = () => {
    const snapshot = snapshotFromStore(get());
    void enqueueWrite(() => diaryRepository.save(snapshot));
  };

  return {
    ...EMPTY_SNAPSHOT,
    hydrated: false,
    saveStatus: 'idle',
    errorMessage: null,

    hydrate: async () => {
      try {
        const snapshot = await diaryRepository.load();
        set({ ...snapshot, hydrated: true, saveStatus: 'idle', errorMessage: null });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : '读取本地数据失败';
        set({ hydrated: true, saveStatus: 'error', errorMessage: message });
      }
    },

    saveDay: (dateKey, events, stickers) => {
      void localBackupRepository.createIfDue(snapshotFromStore(get())).catch(() => undefined);
      const cleanEvents = events
        .filter((event) => event.rawText.trim().length > 0)
        .map((event) => ({
          ...event,
          rawText: event.rawText.trim(),
          summary: event.rawText.trim().split(/\r?\n/, 1)[0]?.slice(0, 120) ?? '',
        }));
      const nextDays = { ...get().days };
      if (cleanEvents.length === 0 && stickers.length === 0) {
        delete nextDays[dateKey];
      } else {
        nextDays[dateKey] = { date: dateKey, events: cleanEvents, stickers };
      }
      set({ days: nextDays, updatedAt: new Date().toISOString() });
      queueSave();
    },

    updatePlan: (monthKey, index, value) => {
      void localBackupRepository.createIfDue(snapshotFromStore(get())).catch(() => undefined);
      const plans = [...(get().monthlyPlans[monthKey] ?? ['', '', ''])];
      while (plans.length < 3) plans.push('');
      plans[index] = value;
      set({
        monthlyPlans: { ...get().monthlyPlans, [monthKey]: plans },
        updatedAt: new Date().toISOString(),
      });
      queueSave();
    },

    replaceSnapshot: async (snapshot) => {
      await enqueueWrite(() => diaryRepository.save(snapshot));
      set({ ...snapshot, saveStatus: 'saved', errorMessage: null });
    },

    clearAll: async () => {
      await enqueueWrite(() => diaryRepository.clear());
      set({ ...EMPTY_SNAPSHOT, updatedAt: new Date().toISOString(), saveStatus: 'idle', errorMessage: null });
    },
  };
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import { diarySnapshotSchema } from '@/domain/schema';
import { EMPTY_SNAPSHOT, type DiarySnapshot } from '@/domain/types';

const STORAGE_KEY = 'calendar-diary:snapshot:v1';

export const diaryRepository = {
  async load(): Promise<DiarySnapshot> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY_SNAPSHOT };

    const parsed: unknown = JSON.parse(raw);
    const result = diarySnapshotSchema.safeParse(parsed);
    if (!result.success) {
      throw new Error('本地数据格式异常，原始数据仍保留。请导入有效备份或清空本地数据。');
    }
    return result.data;
  },

  async save(snapshot: DiarySnapshot): Promise<void> {
    const validated = diarySnapshotSchema.parse(snapshot);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(validated));
  },

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEY);
  },
};

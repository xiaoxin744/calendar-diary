export interface DayEvent {
  id: string;
  rawText: string;
  summary: string;
  emoji: string;
}

export interface DayData {
  date: string;
  events: DayEvent[];
  stickers: string[];
}

export interface DiarySnapshot {
  schemaVersion: 1;
  days: Record<string, DayData>;
  monthlyPlans: Record<string, string[]>;
  updatedAt: string;
}

export interface DiaryBackup {
  version: 2;
  exportedAt: string;
  data: Record<string, DayData>;
  monthlyPlans: Record<string, string[]>;
}

export const MOODS = [
  { emoji: '🙂', label: '平静' },
  { emoji: '😊', label: '开心' },
  { emoji: '🥳', label: '兴奋' },
  { emoji: '😌', label: '放松' },
  { emoji: '😔', label: '低落' },
  { emoji: '😤', label: '烦躁' },
] as const;

export const EVENT_EMOJIS = ['📝', '✅', '💡', '📚', '💼', '🏃', '☕', '❤️'] as const;

export const EMPTY_SNAPSHOT: DiarySnapshot = {
  schemaVersion: 1,
  days: {},
  monthlyPlans: {},
  updatedAt: new Date(0).toISOString(),
};

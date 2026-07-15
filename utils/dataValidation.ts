import type { DayData } from '../types';

export const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const isValidDateKey = (value: string): boolean => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
};

export const isCalendarData = (value: unknown): value is Record<string, DayData> => {
  if (!isObjectRecord(value)) return false;

  return Object.entries(value).every(([dateKey, day]) => {
    if (!isValidDateKey(dateKey) || !isObjectRecord(day)) return false;
    if (day.date !== dateKey || !Array.isArray(day.events) || !Array.isArray(day.stickers)) return false;

    return day.stickers.every(sticker => typeof sticker === 'string') && day.events.every(event =>
      isObjectRecord(event) &&
      typeof event.id === 'string' &&
      typeof event.rawText === 'string' &&
      typeof event.summary === 'string' &&
      typeof event.emoji === 'string'
    );
  });
};

export const isMonthlyPlans = (value: unknown): value is Record<string, string[]> =>
  isObjectRecord(value) && Object.entries(value).every(([monthKey, plans]) =>
    /^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey) &&
    Array.isArray(plans) &&
    plans.every(plan => typeof plan === 'string')
  );

export const isSyncData = (value: unknown): value is {
  version: number;
  updatedAt: string;
  data: Record<string, DayData>;
  monthlyPlans: Record<string, string[]>;
} => {
  if (!isObjectRecord(value)) return false;

  return typeof value.version === 'number' &&
    Number.isFinite(value.version) &&
    typeof value.updatedAt === 'string' &&
    Number.isFinite(Date.parse(value.updatedAt)) &&
    isCalendarData(value.data) &&
    isMonthlyPlans(value.monthlyPlans);
};

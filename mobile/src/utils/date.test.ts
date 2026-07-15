import { describe, expect, it } from 'vitest';
import { getCalendarDays, toDateKey, toMonthKey } from './date';

describe('mobile calendar dates', () => {
  it('always returns a stable six-week grid', () => {
    const days = getCalendarDays(new Date(2026, 6, 14));
    expect(days).toHaveLength(42);
    expect(days[0]?.getDay()).toBe(0);
    expect(days[41]?.getDay()).toBe(6);
  });

  it('uses storage-compatible date keys', () => {
    const date = new Date(2026, 6, 14);
    expect(toDateKey(date)).toBe('2026-07-14');
    expect(toMonthKey(date)).toBe('2026-07');
  });
});

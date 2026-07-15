import { describe, expect, it } from 'vitest';
import { isCalendarData, isMonthlyPlans, isSyncData } from './dataValidation';

const validData = {
  '2026-07-13': {
    date: '2026-07-13',
    events: [{ id: 'event-1', rawText: '记录', summary: '记录', emoji: '📝' }],
    stickers: ['🙂'],
  },
};

describe('calendar data validation', () => {
  it('accepts a valid diary payload', () => {
    expect(isCalendarData(validData)).toBe(true);
    expect(isMonthlyPlans({ '2026-07': ['目标一', '', ''] })).toBe(true);
  });

  it('rejects impossible dates and malformed events', () => {
    expect(isCalendarData({
      '2026-02-31': { ...validData['2026-07-13'], date: '2026-02-31' },
    })).toBe(false);
    expect(isCalendarData({
      '2026-07-13': { date: '2026-07-13', events: [{ rawText: '缺少字段' }], stickers: [] },
    })).toBe(false);
  });

  it('rejects invalid month keys and incomplete sync payloads', () => {
    expect(isMonthlyPlans({ '2026-13': ['invalid'] })).toBe(false);
    expect(isSyncData({ version: 1, updatedAt: 'not-a-date', data: validData, monthlyPlans: {} })).toBe(false);
    expect(isSyncData({ version: 1, updatedAt: '2026-07-13T00:00:00.000Z', data: validData, monthlyPlans: {} })).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { diaryBackupSchema, diarySnapshotSchema } from './schema';

const day = {
  date: '2026-07-14',
  events: [{ id: 'event-1', rawText: '完成移动端', summary: '完成移动端', emoji: '✅' }],
  stickers: ['😊'],
};

describe('diary schemas', () => {
  it('accepts a valid local snapshot', () => {
    const result = diarySnapshotSchema.safeParse({
      schemaVersion: 1,
      days: { '2026-07-14': day },
      monthlyPlans: { '2026-07': ['发布第一个版本', '', ''] },
      updatedAt: '2026-07-14T08:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('accepts desktop-compatible backup version 2', () => {
    const result = diaryBackupSchema.safeParse({
      version: 2,
      exportedAt: '2026-07-14T08:00:00.000Z',
      data: { '2026-07-14': day },
      monthlyPlans: {},
    });
    expect(result.success).toBe(true);
  });

  it('rejects malformed records before they reach storage', () => {
    const result = diaryBackupSchema.safeParse({
      version: 2,
      data: { '2026-07-14': { ...day, events: [{ rawText: 'missing fields' }] } },
      monthlyPlans: { '2026-13': ['invalid month'] },
    });
    expect(result.success).toBe(false);
  });
});

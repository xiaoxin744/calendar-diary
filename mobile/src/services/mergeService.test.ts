import { describe, expect, it } from 'vitest';
import type { DayData, DiarySnapshot } from '@/domain/types';
import { mergeSnapshots } from '@/services/mergeService';

const snapshot = (days: DiarySnapshot['days'] = {}, monthlyPlans: DiarySnapshot['monthlyPlans'] = {}): DiarySnapshot => ({
  schemaVersion: 1,
  days,
  monthlyPlans,
  updatedAt: '2026-07-15T00:00:00.000Z',
});

const day = (date: string, id: string, rawText: string): DayData => ({
  date,
  events: [{ id, rawText, summary: rawText, emoji: '📝' }],
  stickers: [],
});

describe('mergeSnapshots', () => {
  it('自动合并两端新增的不同日期', () => {
    const local = snapshot({ '2026-07-14': day('2026-07-14', 'local', '本机记录') });
    const remote = snapshot({ '2026-07-15': day('2026-07-15', 'remote', '云端记录') });
    const result = mergeSnapshots(local, remote, snapshot());

    expect(Object.keys(result.snapshot.days)).toEqual(['2026-07-14', '2026-07-15']);
    expect(result.conflictCount).toBe(0);
  });

  it('同一条记录被两端修改时保留两个版本', () => {
    const base = snapshot({ '2026-07-15': day('2026-07-15', 'event-1', '原始内容') });
    const local = snapshot({ '2026-07-15': day('2026-07-15', 'event-1', '本机修改') });
    const remote = snapshot({ '2026-07-15': day('2026-07-15', 'event-1', '云端修改') });
    const result = mergeSnapshots(local, remote, base);
    const events = result.snapshot.days['2026-07-15']?.events ?? [];

    expect(events.map((event) => event.rawText)).toEqual(['本机修改', '云端修改']);
    expect(new Set(events.map((event) => event.id)).size).toBe(2);
    expect(result.conflictCount).toBe(1);
  });

  it('月度目标冲突时追加保留云端版本', () => {
    const base = snapshot({}, { '2026-07': ['原始目标'] });
    const local = snapshot({}, { '2026-07': ['本机目标'] });
    const remote = snapshot({}, { '2026-07': ['云端目标'] });
    const result = mergeSnapshots(local, remote, base);

    expect(result.snapshot.monthlyPlans['2026-07']).toEqual(['本机目标', '[云端冲突] 云端目标']);
    expect(result.conflictCount).toBe(1);
  });

  it('删除与编辑冲突时优先保存仍存在的数据', () => {
    const base = snapshot({ '2026-07-15': day('2026-07-15', 'event-1', '原始内容') });
    const remote = snapshot({ '2026-07-15': day('2026-07-15', 'event-1', '云端更新') });
    const result = mergeSnapshots(snapshot(), remote, base);

    expect(result.snapshot.days['2026-07-15']?.events[0]?.rawText).toBe('云端更新');
    expect(result.conflictCount).toBe(1);
  });
});

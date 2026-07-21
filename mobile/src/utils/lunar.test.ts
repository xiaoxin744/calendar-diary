import { describe, expect, it } from 'vitest';
import { getAlmanac, getLunarLabel } from './lunar';

describe('mobile lunar calendar', () => {
  it('prioritizes traditional festivals in the month grid', () => {
    expect(getLunarLabel(new Date(2024, 1, 10))).toBe('春节');
  });

  it('returns local almanac details without a network request', () => {
    const almanac = getAlmanac(new Date(2026, 6, 16));

    expect(almanac.lunarDate).toBe('丙午年六月初三');
    expect(almanac.yearName).toBe('丙午马年');
    expect(almanac.yi).toContain('出行');
    expect(almanac.ji).toContain('伐木');
    expect(almanac.clash).toContain('鸡');
  });
});

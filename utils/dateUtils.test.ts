import { describe, expect, it } from 'vitest';
import { getAlmanac, getLunarDate } from './dateUtils';

describe('lunar calendar and almanac', () => {
  it('uses a festival as the compact calendar label', () => {
    expect(getLunarDate(new Date(2024, 1, 10))).toBe('春节');
  });

  it('provides complete local almanac data', () => {
    const almanac = getAlmanac(new Date(2026, 6, 16));

    expect(almanac.lunarDate).toBe('丙午年六月初三');
    expect(almanac.yearName).toBe('丙午马年');
    expect(almanac.yi).toContain('出行');
    expect(almanac.ji).toContain('伐木');
    expect(almanac.clash).toContain('鸡');
  });
});

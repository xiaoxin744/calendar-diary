import { describe, expect, it } from 'vitest';
import { resolveMonthlyPlans } from './monthlyPlans';

describe('resolveMonthlyPlans', () => {
  it('reuses one stable fallback for a month without saved plans', () => {
    expect(resolveMonthlyPlans(undefined)).toBe(resolveMonthlyPlans(undefined));
    expect(resolveMonthlyPlans(undefined)).toEqual(['', '', '']);
  });

  it('preserves an existing month plan array', () => {
    const plans = ['发布新版本', '', ''];
    expect(resolveMonthlyPlans(plans)).toBe(plans);
  });
});

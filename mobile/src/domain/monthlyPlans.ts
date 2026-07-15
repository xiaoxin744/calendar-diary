const EMPTY_MONTHLY_PLANS: readonly string[] = Object.freeze(['', '', '']);

/**
 * Returns a referentially stable fallback for months without saved plans.
 * Zustand selectors must not allocate a new array for every snapshot read.
 */
export const resolveMonthlyPlans = (plans: string[] | undefined): readonly string[] => (
  plans ?? EMPTY_MONTHLY_PLANS
);

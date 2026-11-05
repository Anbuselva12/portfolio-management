export type Affordability =
  | { kind: 'lower'; monthlyRelief: number }
  | { kind: 'same' }
  | { kind: 'fits'; leftOver: number; surplus: number }
  | { kind: 'short'; shortBy: number; surplus: number }
  | { kind: 'unknown'; extra: number };

/**
 * Whether a higher EMI fits in the household's current monthly surplus.
 * `surplus` is income minus expenses and EMIs for the month (the dashboard's "net savings"),
 * so only the *increase* in EMI has to be found from it. Null means the surplus is unavailable.
 */
export const assessAffordability = (emiDiff: number, surplus: number | null): Affordability => {
  if (emiDiff < 0) return { kind: 'lower', monthlyRelief: -emiDiff };
  if (emiDiff === 0) return { kind: 'same' };
  if (surplus === null) return { kind: 'unknown', extra: emiDiff };
  return emiDiff <= surplus
    ? { kind: 'fits', leftOver: surplus - emiDiff, surplus }
    : { kind: 'short', shortBy: emiDiff - surplus, surplus };
};

export const formatMonths = (months: number): string => {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const parts = [];
  if (years > 0) parts.push(`${years} yr${years === 1 ? '' : 's'}`);
  if (rest > 0 || years === 0) parts.push(`${rest} mo${rest === 1 ? '' : 's'}`);
  return parts.join(' ');
};

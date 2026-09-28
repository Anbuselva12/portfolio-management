import Decimal from 'decimal.js';

export function formatINR(value: string | number | Decimal | null | undefined): string {
  if (value === null || value === undefined) return '₹0';
  const val = new Decimal(value).toNumber();
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(val);
}

export function formatKpiINR(value: string | number | Decimal | null | undefined): string {
  if (value === null || value === undefined) return '₹0';
  const val = new Decimal(value).toNumber();
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(val);
}

export function formatCurrency(value: string | number | Decimal | null | undefined, currency: string): string {
  if (value === null || value === undefined) return '0';
  const val = new Decimal(value).toNumber();
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 2,
  }).format(val);
}

export function parseDecimal(value: string): Decimal {
  try {
    return new Decimal(value || '0');
  } catch (e) {
    return new Decimal(0);
  }
}

export function deltaSign(current: string, previous: string): 'up' | 'down' | 'neutral' {
  const c = parseDecimal(current);
  const p = parseDecimal(previous);
  if (c.greaterThan(p)) return 'up';
  if (c.lessThan(p)) return 'down';
  return 'neutral';
}

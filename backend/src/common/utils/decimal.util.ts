import { Decimal } from 'decimal.js';

export function toDecimal(value: string | number | Decimal): Decimal {
  if (value instanceof Decimal) return value;
  return new Decimal(value);
}

export function formatCurrency(amount: Decimal | string | number, currency: string): string {
  const dec = toDecimal(amount);
  return `${currency} ${dec.toFixed(2)}`;
}

export function decimalToString(d: Decimal | null | undefined): string | null {
  if (!d) return null;
  return d.toString();
}

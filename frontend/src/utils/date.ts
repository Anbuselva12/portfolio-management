export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatMonthYear(dateString: string | null | undefined): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
}

export function daysUntil(dateString: string): number {
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  const diffTime = date.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function isOverdue(dateString: string): boolean {
  return daysUntil(dateString) < 0;
}

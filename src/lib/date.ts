export function parseISODate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function differenceInDays(from: Date, to: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.ceil((startOfLocalDay(to).getTime() - startOfLocalDay(from).getTime()) / msPerDay);
}

export function isDateWithin(date: Date, startDate: string | null, endDate: string | null): boolean {
  const time = startOfLocalDay(date).getTime();
  const start = startDate ? parseISODate(startDate).getTime() : Number.NEGATIVE_INFINITY;
  const end = endDate ? parseISODate(endDate).getTime() : Number.POSITIVE_INFINITY;
  return time >= start && time <= end;
}

export function formatLongDate(isoDate: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(parseISODate(isoDate));
}

export function formatDayChip(isoDate: string): { weekday: string; monthDay: string } {
  const date = parseISODate(isoDate);
  return {
    weekday: new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date),
    monthDay: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date)
  };
}

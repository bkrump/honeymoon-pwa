import type { TripDay } from '../types/trip';
import { startOfLocalDay, toISODate } from './date';

export function getInitialSelectedDate(days: TripDay[], referenceDate = new Date()): string {
  if (!days.length) return '';

  const today = toISODate(startOfLocalDay(referenceDate));
  const exact = days.find((day) => day.date === today);
  if (exact) return exact.date;

  if (today < days[0].date) {
    return days[0].date;
  }

  if (today > days[days.length - 1].date) {
    return days[days.length - 1].date;
  }

  const next = days.find((day) => day.date > today);
  return next?.date ?? days[0].date;
}

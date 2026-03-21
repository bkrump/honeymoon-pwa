import { describe, expect, it } from 'vitest';
import { getInitialSelectedDate } from './trip';
import { buildTripData } from '../../scripts/shared-trip.mjs';
import { sampleTripSource } from '../test/fixtures';

const trip = buildTripData(sampleTripSource);

describe('getInitialSelectedDate', () => {
  it('clamps before the first trip day', () => {
    expect(getInitialSelectedDate(trip.days, new Date('2026-06-01T12:00:00'))).toBe('2026-06-14');
  });

  it('clamps after the last trip day', () => {
    expect(getInitialSelectedDate(trip.days, new Date('2026-06-20T12:00:00'))).toBe('2026-06-16');
  });

  it('picks the exact matching day', () => {
    expect(getInitialSelectedDate(trip.days, new Date('2026-06-15T12:00:00'))).toBe('2026-06-15');
  });
});

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

  it('orders same-day events by their displayed time labels', () => {
    const orderedTrip = buildTripData({
      ...sampleTripSource,
      events: [
        {
          id: 'return-flight',
          type: 'flight',
          title: 'Marrakech to Seattle',
          startDate: '2026-06-14',
          endDate: '2026-06-15',
          startLabel: 'Departs 6:15 PM (RAK)',
          endLabel: 'Arrive 12:45 PM local',
          details: [],
          layovers: [],
          segments: []
        },
        {
          id: 'final-hop',
          type: 'flight',
          title: 'Seattle to Eugene',
          startDate: '2026-06-15',
          startLabel: '3:35 PM - 4:50 PM',
          details: [],
          layovers: [],
          segments: []
        }
      ]
    });

    expect(orderedTrip.days[1].events.map((event) => event.title)).toEqual([
      'Marrakech to Seattle',
      'Seattle to Eugene'
    ]);
  });
});

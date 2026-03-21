import { describe, expect, it } from 'vitest';
import { buildHomeDisplay } from './theme';
import { buildTripData } from '../../scripts/shared-trip.mjs';
import { sampleTripSource } from '../test/fixtures';

const trip = buildTripData(sampleTripSource);

describe('buildHomeDisplay', () => {
  it('shows a countdown before the trip starts', () => {
    const display = buildHomeDisplay(trip, new Date('2026-06-10T12:00:00'));
    expect(display.mode).toBe('countdown');
    expect(display.primary).toBe('4');
  });

  it('shows welcome copy during Marrakech dates', () => {
    const display = buildHomeDisplay(trip, new Date('2026-06-22T12:00:00'));
    expect(display.mode).toBe('welcome');
    expect(display.primary).toBe('Welcome to Marrakech');
  });
});

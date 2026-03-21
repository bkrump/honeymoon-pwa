import { describe, expect, it } from 'vitest';
import { validateTripSource } from '../../scripts/shared-trip.mjs';
import { sampleTripSource } from '../test/fixtures';

describe('validateTripSource', () => {
  it('accepts a valid trip payload', () => {
    expect(() => validateTripSource(sampleTripSource)).not.toThrow();
  });

  it('rejects duplicate reservation codes within the same provider', () => {
    const badSource = {
      ...sampleTripSource,
      events: [
        ...sampleTripSource.events,
        {
          ...sampleTripSource.events[0],
          id: 'flight-duplicate'
        }
      ]
    };

    expect(() => validateTripSource(badSource)).toThrow(/Duplicate reservation reference/);
  });
});

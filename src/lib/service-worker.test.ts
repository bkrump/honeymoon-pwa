import { describe, expect, it } from 'vitest';
import { decryptTripWithPassphrase } from './crypto';
import type { V2EncryptedTripPayload } from '../types/trip';
import { buildTripData, encryptTripData } from '../../scripts/shared-trip.mjs';
import { sampleTripSource } from '../test/fixtures';

describe('encrypted payload handling', () => {
  it('decrypts a generated v2 payload with the passphrase', async () => {
    const trip = buildTripData(sampleTripSource);
    const encrypted = await encryptTripData(trip, 'bdballing');
    const unlocked = await decryptTripWithPassphrase(encrypted as V2EncryptedTripPayload, 'bdballing');
    expect(unlocked.trip.tripTitle).toBe('Mykonos + Marrakech Honeymoon');
  });
});

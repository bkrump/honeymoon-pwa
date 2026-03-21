import { loadSourceInput, validateTripSource, decryptLegacyEncryptedTrip, migrateLegacyDataToSource } from './shared-trip.mjs';

async function main() {
  let source = loadSourceInput();

  if (!source && process.env.TRIP_PASSPHRASE) {
    const legacy = await decryptLegacyEncryptedTrip(process.env.TRIP_PASSPHRASE);
    source = migrateLegacyDataToSource(legacy);
  }

  if (!source) {
    console.log('No private trip source available. Skipping source validation.');
    return;
  }

  validateTripSource(source);
  console.log('Trip source is valid.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

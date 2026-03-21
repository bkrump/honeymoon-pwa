import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import {
  buildTripData,
  createSourceFingerprint,
  decryptLegacyEncryptedTrip,
  encryptTripData,
  generatedRevisionPath,
  loadSourceInput,
  migrateLegacyDataToSource,
  publicDataDir,
  revisionPath,
  sourcePath,
  validateTripSource,
  writeRevisionArtifacts
} from './shared-trip.mjs';

async function main() {
  let source = loadSourceInput();

  if (!source && process.env.TRIP_PASSPHRASE) {
    const legacy = await decryptLegacyEncryptedTrip(process.env.TRIP_PASSPHRASE);
    source = migrateLegacyDataToSource(legacy);
    if (!existsSync(sourcePath)) {
      writeFileSync(sourcePath, JSON.stringify(source, null, 2));
    }
  }

  const passphrase = process.env.TRIP_PASSPHRASE;
  const existingRevision = existsSync(revisionPath) ? JSON.parse(readFileSync(revisionPath, 'utf8')) : null;
  const hasExistingGeneratedBuild = Boolean(
    existingRevision &&
      existsSync(generatedRevisionPath) &&
      existsSync(publicDataDir) &&
      readdirSync(publicDataDir).some((file) => /^trip\..*\.enc\.json$/.test(file))
  );

  if (!source) {
    if (hasExistingGeneratedBuild) {
      console.log(`Using existing encrypted payload ${existingRevision.encryptedPath}`);
      return;
    }

    console.error('A private trip source and TRIP_PASSPHRASE are required to produce the first encrypted build.');
    process.exit(1);
  }

  const validated = validateTripSource(source);
  const sourceFingerprint = createSourceFingerprint(validated);

  if (!passphrase) {
    if (hasExistingGeneratedBuild && existingRevision.sourceFingerprint === sourceFingerprint) {
      console.log(`Trip source unchanged. Using existing encrypted payload ${existingRevision.encryptedPath}`);
      return;
    }

    console.error('TRIP_PASSPHRASE is required because the private trip source has changed.');
    process.exit(1);
  }

  if (hasExistingGeneratedBuild && existingRevision.sourceFingerprint === sourceFingerprint) {
    console.log(`Trip source unchanged. Using existing encrypted payload ${existingRevision.encryptedPath}`);
    return;
  }

  const tripData = buildTripData(validated);
  const encrypted = await encryptTripData(tripData, passphrase);
  const revision = writeRevisionArtifacts(encrypted, tripData, sourceFingerprint);
  console.log(`Prepared encrypted trip payload ${revision.encryptedPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

import { createHash, webcrypto } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const repoRoot = path.resolve(__dirname, '..');
export const sourcePath = path.join(repoRoot, 'data', 'trip.source.json');
export const legacyEncryptedPath = path.join(repoRoot, 'data', 'trip.enc.json');
export const publicDataDir = path.join(repoRoot, 'public', 'data');
export const revisionPath = path.join(repoRoot, 'public', 'revision.json');
export const generatedDir = path.join(repoRoot, 'src', 'generated');
export const generatedRevisionPath = path.join(generatedDir, 'tripRevision.ts');
const REMEMBER_SALT = 'honeymoon-remember-v1';
const BUILD_ARTIFACT_VERSION = 2;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const segmentSchema = z.object({
  from: z.string().min(3),
  to: z.string().min(3),
  departureLabel: z.string().min(1),
  arrivalLabel: z.string().min(1),
  equipment: z.string().min(1),
  airline: z.string().min(1),
  cabin: z.string().min(1),
  note: z.string().optional()
});

const baseEventSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['flight', 'car', 'hotel', 'activity', 'transfer', 'note']),
  title: z.string().min(1),
  provider: z.string().optional(),
  confirmationCode: z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startLabel: z.string().optional(),
  endLabel: z.string().optional(),
  location: z.string().optional(),
  address: z.string().optional(),
  duration: z.string().optional(),
  cabin: z.string().optional(),
  driver: z.string().optional(),
  vehicle: z.string().optional(),
  details: z.array(z.string()).default([]),
  layovers: z.array(z.string()).default([]),
  segments: z.array(segmentSchema).default([]),
  themeBand: z.string().optional()
});

const themeBandSchema = z.object({
  id: z.enum(['pretrip', 'mykonos', 'marrakech', 'posttrip']),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  homeMode: z.enum(['countdown', 'welcome']),
  headline: z.string().min(1),
  accentLabel: z.string().min(1),
  assetKey: z.enum(['pretrip', 'mykonos', 'marrakech', 'posttrip'])
});

const dayMetaSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().min(1),
  summary: z.string().min(1)
});

export const tripSourceSchema = z.object({
  metadata: z.object({
    title: z.string().min(1),
    dateRangeLabel: z.string().min(1),
    timezone: z.string().min(1),
    tripStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    tripEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
  }),
  themeBands: z.array(themeBandSchema).min(1),
  days: z.array(dayMetaSchema).min(1),
  events: z.array(baseEventSchema),
  reservations: z.array(
    z.object({
      type: z.string().min(1),
      name: z.string().min(1),
      confirmationCode: z.string().optional(),
      dateLabel: z.string().min(1),
      notes: z.string().optional()
    })
  ).default([]),
  essentials: z.array(
    z.object({
      title: z.string().min(1),
      value: z.string().min(1)
    })
  ).default([])
});

function parseISODate(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function compareISO(a, b) {
  return parseISODate(a).getTime() - parseISODate(b).getTime();
}

function getDaySpan(startDate, endDate) {
  const dates = [];
  let cursor = parseISODate(startDate);
  const end = parseISODate(endDate || startDate);
  while (cursor <= end) {
    dates.push(toISODate(cursor));
    cursor = addDays(cursor, 1);
  }
  return dates;
}

function labelForRole(event, role) {
  if (event.type !== 'flight') {
    return event.startLabel || 'Details';
  }

  if (role === 'end' && event.endLabel) {
    return event.endLabel;
  }

  if (role === 'middle') {
    return 'In transit';
  }

  return event.startLabel || 'Flight details';
}

function deriveEventRole(date, event) {
  const endDate = event.endDate || event.startDate;
  if (date === event.startDate && date === endDate) return 'single';
  if (date === event.startDate) return 'start';
  if (date === endDate) return 'end';
  return 'middle';
}

function parseTimeLabelMinutes(label) {
  const match = label.match(/(\d{1,2}):(\d{2})\s*([AP]M)/i);
  if (match) {
    let hours = Number(match[1]) % 12;
    if (match[3].toUpperCase() === 'PM') {
      hours += 12;
    }
    return hours * 60 + Number(match[2]);
  }

  const normalized = label.toLowerCase();
  if (normalized.includes('morning')) return 9 * 60;
  if (normalized.includes('daytime')) return 10 * 60;
  if (normalized.includes('lunch')) return 12 * 60;
  if (normalized.includes('after')) return 13 * 60;
  if (normalized.includes('afternoon')) return 14 * 60;
  if (normalized.includes('travel day')) return 12 * 60;
  if (normalized.includes('evening')) return 18 * 60;
  if (normalized.includes('dinner')) return 19 * 60;
  if (normalized.includes('night')) return 21 * 60;
  if (normalized.includes('after trip')) return 23 * 60;
  return 12 * 60;
}

function toDisplayEvent(event, date) {
  const role = deriveEventRole(date, event);
  return {
    id: `${event.id}:${date}`,
    sourceEventId: event.id,
    type: event.type,
    title: event.title,
    provider: event.provider,
    confirmationCode: event.confirmationCode,
    timeLabel: labelForRole(event, role),
    role,
    location: event.location,
    address: event.address,
    duration: event.duration,
    cabin: event.cabin,
    driver: event.driver,
    vehicle: event.vehicle,
    details: event.details,
    layovers: event.layovers,
    segments: event.segments,
    startDate: event.startDate,
    endDate: event.endDate || event.startDate
  };
}

export function validateTripSource(input) {
  const parsed = tripSourceSchema.parse(input);
  const knownDays = new Set(parsed.days.map((day) => day.date));
  const seenEventIds = new Set();

  parsed.days.forEach((day, index) => {
    if (index === 0) return;
    const previous = parsed.days[index - 1].date;
    if (compareISO(previous, day.date) >= 0) {
      throw new Error('Trip days must be strictly increasing.');
    }
  });

  const seenReservations = new Set();
  parsed.events.forEach((event) => {
    if (seenEventIds.has(event.id)) {
      throw new Error(`Duplicate event id ${event.id} found in trip source.`);
    }
    seenEventIds.add(event.id);

    if (compareISO(event.startDate, event.endDate || event.startDate) > 0) {
      throw new Error(`Event ${event.id} has an endDate before its startDate.`);
    }

    getDaySpan(event.startDate, event.endDate || event.startDate).forEach((date) => {
      if (!knownDays.has(date)) {
        throw new Error(`Event ${event.id} references ${date}, which is outside the itinerary day set.`);
      }
    });

    if (event.confirmationCode && event.provider) {
      const key = `${event.provider.toLowerCase()}::${event.confirmationCode.toLowerCase()}::${event.id}`;
      const duplicateKey = `${event.provider.toLowerCase()}::${event.confirmationCode.toLowerCase()}`;
      if ([...seenReservations].some((item) => item.startsWith(`${duplicateKey}::`))) {
        throw new Error(`Duplicate reservation reference ${event.confirmationCode} found for provider ${event.provider}.`);
      }
      seenReservations.add(key);
    }
  });

  return parsed;
}

export function buildTripData(source) {
  const parsed = validateTripSource(source);
  const eventsByDay = new Map(parsed.days.map((day) => [day.date, []]));

  parsed.events.forEach((event, index) => {
    getDaySpan(event.startDate, event.endDate || event.startDate).forEach((date) => {
      const displayEvent = toDisplayEvent(event, date);
      eventsByDay.get(date)?.push({
        event: displayEvent,
        order: index,
        sortMinutes: parseTimeLabelMinutes(displayEvent.timeLabel)
      });
    });
  });

  const days = parsed.days.map((day) => ({
    date: day.date,
    title: day.title,
    summary: day.summary,
    events: (eventsByDay.get(day.date) || [])
      .sort((a, b) => {
        return a.sortMinutes - b.sortMinutes || a.order - b.order;
      })
      .map((entry) => entry.event)
  }));

  return {
    tripTitle: parsed.metadata.title,
    tripDateRange: parsed.metadata.dateRangeLabel,
    timezone: parsed.metadata.timezone,
    metadata: parsed.metadata,
    themeBands: parsed.themeBands,
    days,
    reservations: parsed.reservations,
    essentials: parsed.essentials,
    schemaVersion: 1
  };
}

export async function encryptTripData(data, passphrase) {
  const salt = webcrypto.getRandomValues(new Uint8Array(16));
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const wrappedKeyIv = webcrypto.getRandomValues(new Uint8Array(12));
  const rememberIv = webcrypto.getRandomValues(new Uint8Array(12));
  const iterations = 210000;
  const keyMaterial = await webcrypto.subtle.importKey('raw', textEncoder.encode(passphrase), { name: 'PBKDF2' }, false, ['deriveKey']);
  const wrappingKey = await webcrypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  const rememberKey = await webcrypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: textEncoder.encode(REMEMBER_SALT),
      iterations,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  const contentKey = await webcrypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  const exportedContentKey = new Uint8Array(await webcrypto.subtle.exportKey('raw', contentKey));
  const plaintext = textEncoder.encode(JSON.stringify(data));
  const ciphertext = new Uint8Array(await webcrypto.subtle.encrypt({ name: 'AES-GCM', iv }, contentKey, plaintext));
  const wrappedKey = new Uint8Array(
    await webcrypto.subtle.encrypt({ name: 'AES-GCM', iv: wrappedKeyIv }, wrappingKey, exportedContentKey)
  );
  const rememberWrappedKey = new Uint8Array(
    await webcrypto.subtle.encrypt({ name: 'AES-GCM', iv: rememberIv }, rememberKey, exportedContentKey)
  );
  return {
    v: 2,
    kdf: 'PBKDF2',
    hash: 'SHA-256',
    iterations,
    cipher: 'AES-GCM',
    salt: Buffer.from(salt).toString('base64'),
    iv: Buffer.from(iv).toString('base64'),
    wrappedKeyIv: Buffer.from(wrappedKeyIv).toString('base64'),
    wrappedKey: Buffer.from(wrappedKey).toString('base64'),
    rememberWrappedKeyIv: Buffer.from(rememberIv).toString('base64'),
    rememberWrappedKey: Buffer.from(rememberWrappedKey).toString('base64'),
    ciphertext: Buffer.from(ciphertext).toString('base64')
  };
}

export async function decryptTripData(encrypted, passphrase) {
  const salt = new Uint8Array(Buffer.from(encrypted.salt, 'base64'));
  const iv = new Uint8Array(Buffer.from(encrypted.iv, 'base64'));
  const ciphertext = new Uint8Array(Buffer.from(encrypted.ciphertext, 'base64'));
  const keyMaterial = await webcrypto.subtle.importKey('raw', textEncoder.encode(passphrase), { name: 'PBKDF2' }, false, ['deriveKey']);
  const key = await webcrypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: Number(encrypted.iterations), hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
  const plaintext = await webcrypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return JSON.parse(textDecoder.decode(plaintext));
}

export function loadSourceInput() {
  if (process.env.TRIP_SOURCE_JSON) {
    return JSON.parse(process.env.TRIP_SOURCE_JSON);
  }

  if (process.env.TRIP_SOURCE_BASE64) {
    return JSON.parse(Buffer.from(process.env.TRIP_SOURCE_BASE64, 'base64').toString('utf8'));
  }

  if (existsSync(sourcePath)) {
    return JSON.parse(readFileSync(sourcePath, 'utf8'));
  }

  return null;
}

export async function decryptLegacyEncryptedTrip(passphrase) {
  if (!existsSync(legacyEncryptedPath)) {
    throw new Error('Legacy encrypted trip payload was not found.');
  }
  const encrypted = JSON.parse(readFileSync(legacyEncryptedPath, 'utf8'));
  return decryptTripData(encrypted, passphrase);
}

export function migrateLegacyDataToSource(legacy) {
  const days = (legacy.itineraryDays || []).map((day) => ({
    date: day.date,
    title: day.title,
    summary: day.subtitle || day.title
  }));

  const existingEvents = [];
  for (const day of legacy.itineraryDays || []) {
    for (const entry of day.entries || []) {
      if (existingEvents.some((event) => event.id === `${entry.type}-${entry.confirmationCode || entry.title}`)) {
        continue;
      }
      const endDate = entry.type === 'flight' && day.date === '2026-06-14' ? '2026-06-15' : undefined;
      existingEvents.push({
        id: `${entry.type}-${(entry.confirmationCode || entry.title).replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`,
        type: entry.type === 'plan' ? 'note' : entry.type,
        title: entry.title,
        provider: entry.provider,
        confirmationCode: entry.confirmationCode,
        startDate: day.date,
        endDate,
        startLabel: entry.time,
        endLabel: entry.type === 'flight' ? 'Arrive 6:20 PM local' : undefined,
        location: entry.location,
        address: entry.address,
        duration: entry.duration,
        cabin: entry.cabin,
        driver: entry.driver,
        vehicle: entry.carType,
        details: entry.details || [],
        layovers: entry.layovers || [],
        segments: (entry.segments || []).map((segment) => ({
          from: segment.split(' -> ')[0] || segment,
          to: segment.split(' -> ')[1] || '',
          departureLabel: segment.split(' -> ')[0] || segment,
          arrivalLabel: segment.split(' -> ')[1] || segment,
          equipment: segment,
          airline: entry.provider || 'Reservation',
          cabin: entry.cabin || 'Details'
        }))
      });
    }
  }

  return {
    metadata: {
      title: legacy.tripTitle,
      dateRangeLabel: legacy.tripDateRange,
      timezone: 'America/Los_Angeles',
      tripStartDate: days[0]?.date || '2026-06-14',
      tripEndDate: days[days.length - 1]?.date || '2026-06-27'
    },
    themeBands: [
      {
        id: 'pretrip',
        startDate: null,
        endDate: '2026-06-13',
        homeMode: 'countdown',
        headline: 'Countdown to Mykonos',
        accentLabel: 'The trip starts June 14',
        assetKey: 'pretrip'
      },
      {
        id: 'mykonos',
        startDate: '2026-06-14',
        endDate: '2026-06-20',
        homeMode: 'welcome',
        headline: 'Welcome to Mykonos',
        accentLabel: 'Aegean days',
        assetKey: 'mykonos'
      },
      {
        id: 'marrakech',
        startDate: '2026-06-21',
        endDate: '2026-06-27',
        homeMode: 'welcome',
        headline: 'Welcome to Marrakech',
        accentLabel: 'Lantern nights',
        assetKey: 'marrakech'
      },
      {
        id: 'posttrip',
        startDate: '2026-06-28',
        endDate: null,
        homeMode: 'welcome',
        headline: 'Welcome home',
        accentLabel: 'Keep the memories close',
        assetKey: 'posttrip'
      }
    ],
    days,
    events: existingEvents,
    reservations: legacy.reservations || [],
    essentials: legacy.essentials || []
  };
}

export function writeRevisionArtifacts(encryptedPayload, tripData, sourceFingerprint) {
  mkdirSync(publicDataDir, { recursive: true });
  mkdirSync(generatedDir, { recursive: true });

  for (const file of readdirSync(publicDataDir)) {
    if (/^trip\..*\.enc\.json$/.test(file)) {
      rmSync(path.join(publicDataDir, file), { force: true });
    }
  }

  const encryptedText = JSON.stringify(encryptedPayload, null, 2);
  const contentHash = createHash('sha256').update(encryptedText).digest('hex').slice(0, 10);
  const encryptedFilename = `trip.${contentHash}.enc.json`;
  const encryptedPath = path.join(publicDataDir, encryptedFilename);
  writeFileSync(encryptedPath, encryptedText);

  const revision = {
    appVersion: process.env.npm_package_version || '1.0.0',
    schemaVersion: tripData.schemaVersion,
    contentVersion: contentHash,
    buildTime: new Date().toISOString(),
    encryptedPath: `./data/${encryptedFilename}`,
    sourceFingerprint
  };

  writeFileSync(revisionPath, JSON.stringify(revision, null, 2));
  writeFileSync(
    generatedRevisionPath,
    `export const tripRevision = ${JSON.stringify(revision, null, 2)} as const;\n`
  );

  return revision;
}

export function createSourceFingerprint(source) {
  return createHash('sha256')
    .update(JSON.stringify({ buildArtifactVersion: BUILD_ARTIFACT_VERSION, source }))
    .digest('hex');
}

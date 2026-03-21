export type ThemeId = 'pretrip' | 'mykonos' | 'marrakech' | 'posttrip';
export type HomeMode = 'countdown' | 'welcome';
export type TripEventType = 'flight' | 'car' | 'hotel' | 'activity' | 'transfer' | 'note';
export type EventRole = 'single' | 'start' | 'middle' | 'end';

export interface ThemeBand {
  id: ThemeId;
  startDate: string | null;
  endDate: string | null;
  homeMode: HomeMode;
  headline: string;
  accentLabel: string;
  assetKey: ThemeId;
}

export interface TripSegment {
  from: string;
  to: string;
  departureLabel: string;
  arrivalLabel: string;
  equipment: string;
  airline: string;
  cabin: string;
  note?: string;
}

export interface TripEvent {
  id: string;
  sourceEventId: string;
  type: TripEventType;
  title: string;
  provider?: string;
  confirmationCode?: string;
  timeLabel: string;
  role: EventRole;
  location?: string;
  address?: string;
  duration?: string;
  cabin?: string;
  driver?: string;
  vehicle?: string;
  details: string[];
  layovers: string[];
  segments: TripSegment[];
  startDate: string;
  endDate: string;
}

export interface TripDay {
  date: string;
  title: string;
  summary: string;
  events: TripEvent[];
}

export interface ReservationSummary {
  type: string;
  name: string;
  confirmationCode?: string;
  dateLabel: string;
  notes?: string;
}

export interface EssentialItem {
  title: string;
  value: string;
}

export interface TripData {
  tripTitle: string;
  tripDateRange: string;
  timezone: string;
  themeBands: ThemeBand[];
  days: TripDay[];
  reservations: ReservationSummary[];
  essentials: EssentialItem[];
  schemaVersion: number;
}

export interface V2EncryptedTripPayload {
  v: 2;
  kdf: 'PBKDF2';
  hash: 'SHA-256';
  iterations: number;
  cipher: 'AES-GCM';
  salt: string;
  iv: string;
  wrappedKeyIv: string;
  wrappedKey: string;
  rememberWrappedKeyIv: string;
  rememberWrappedKey: string;
  ciphertext: string;
}

export interface V1EncryptedTripPayload {
  v?: 1;
  kdf: 'PBKDF2';
  hash: 'SHA-256';
  iterations: number;
  cipher: 'AES-GCM';
  salt: string;
  iv: string;
  ciphertext: string;
}

export type EncryptedTripPayload = V1EncryptedTripPayload | V2EncryptedTripPayload;

export type AppTab = 'home' | 'itinerary';

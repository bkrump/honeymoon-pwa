import { CSSProperties, useEffect, useMemo, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { AuthGate } from './components/AuthGate';
import { BottomTabs } from './components/BottomTabs';
import { HomeScreen } from './components/HomeScreen';
import { ItineraryScreen } from './components/ItineraryScreen';
import { UpdateToast } from './components/UpdateToast';
import { decryptTripWithPassphrase, decryptTripWithRememberedKey, loadEncryptedPayload } from './lib/crypto';
import { clearRememberedKey, loadRememberedKey, saveRememberedKey } from './lib/storage';
import { buildHomeDisplay, getThemeBandForDate, themeVisuals } from './lib/theme';
import { tripRevision } from './generated/tripRevision';
import type { AppTab, EncryptedTripPayload, TripData } from './types/trip';

function resolveAppAsset(relativePath: string): string {
  return new URL(relativePath, new URL(import.meta.env.BASE_URL, window.location.origin)).toString();
}

export default function App() {
  const [tab, setTab] = useState<AppTab>('home');
  const [trip, setTrip] = useState<TripData | null>(null);
  const [payload, setPayload] = useState<EncryptedTripPayload | null>(null);
  const [status, setStatus] = useState<'booting' | 'locked' | 'unlocking' | 'ready' | 'error'>('booting');
  const [message, setMessage] = useState('Preparing the offline guide…');
  const {
    needRefresh: [needRefresh],
    updateServiceWorker
  } = useRegisterSW();

  useEffect(() => {
    let active = true;

    async function boot() {
      try {
        const encryptedPayload = await loadEncryptedPayload(resolveAppAsset(tripRevision.encryptedPath));
        if (!active) return;
        setPayload(encryptedPayload);

        const rememberedKey = loadRememberedKey();
        if (rememberedKey) {
          try {
            const unlockedTrip = await decryptTripWithRememberedKey(encryptedPayload, rememberedKey);
            if (!active) return;
            setTrip(unlockedTrip);
            setStatus('ready');
            setMessage('Unlocked on this device.');
            return;
          } catch {
            clearRememberedKey();
          }
        }

        setStatus('locked');
        setMessage('Enter your secret phrase to unlock the honeymoon details.');
      } catch {
        if (!active) return;
        setStatus('error');
        setMessage('The encrypted trip payload could not be loaded. Refresh once when you have service.');
      }
    }

    void boot();
    return () => {
      active = false;
    };
  }, []);

  async function handleUnlock(passphrase: string, remember: boolean) {
    if (!payload) return;
    setStatus('unlocking');
    setMessage('Unlocking your itinerary…');

    try {
      const { trip: unlockedTrip, rememberKey } = await decryptTripWithPassphrase(payload, passphrase);
      setTrip(unlockedTrip);
      if (remember) {
        saveRememberedKey(rememberKey);
      } else {
        clearRememberedKey();
      }
      setStatus('ready');
      setMessage('Unlocked on this device.');
    } catch {
      clearRememberedKey();
      setStatus('locked');
      setMessage('That secret phrase did not match. Try again.');
    }
  }

  const referenceDate = useMemo(() => new Date(), []);
  const activeTheme = useMemo(() => {
    if (!trip) return themeVisuals.pretrip;
    const band = getThemeBandForDate(trip.themeBands, referenceDate);
    return themeVisuals[band.assetKey];
  }, [trip, referenceDate]);

  const homeDisplay = useMemo(() => (trip ? buildHomeDisplay(trip, referenceDate) : null), [trip, referenceDate]);

  return (
    <div
      className={tab === 'home' && status === 'ready' && trip ? 'app-frame app-frame-home' : 'app-frame'}
      style={
        {
          '--theme-accent': activeTheme.accent,
          '--theme-surface': activeTheme.surface,
          '--theme-page-tone': activeTheme.pageTone,
          '--theme-image-position': activeTheme.position,
          '--theme-tab-tint': activeTheme.tabTint,
          '--theme-on-image': activeTheme.text
        } as CSSProperties
      }
    >
      <div className="backdrop-scene" style={{ backgroundImage: `${activeTheme.overlay}, url(${activeTheme.image})` }} />
      {status !== 'ready' || !trip ? (
        <AuthGate status={status} message={message} onUnlock={handleUnlock} />
      ) : (
        <>
          <header className="status-rail">
            <div>
              <p>{trip.tripTitle}</p>
              <span>{trip.tripDateRange}</span>
            </div>
          </header>
          <main className={tab === 'home' ? 'app-shell app-shell-home' : 'app-shell'}>
            {tab === 'home' ? (
              <HomeScreen trip={trip} referenceDate={referenceDate} />
            ) : (
              <ItineraryScreen trip={trip} />
            )}
          </main>
          <BottomTabs activeTab={tab} onChange={setTab} />
          <UpdateToast
            needRefresh={needRefresh}
            onRefresh={() => void updateServiceWorker(true)}
          />
        </>
      )}
    </div>
  );
}

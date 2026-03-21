const SESSION_STORAGE_KEY = 'honeymoon_session_v2';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

interface RememberedSession {
  rememberKey: string;
  expiresAt: number;
}

export function loadRememberedKey(): string | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RememberedSession;
    if (!parsed.expiresAt || parsed.expiresAt < Date.now()) {
      clearRememberedKey();
      return null;
    }
    return parsed.rememberKey;
  } catch {
    clearRememberedKey();
    return null;
  }
}

export function saveRememberedKey(rememberKey: string): void {
  const session: RememberedSession = {
    rememberKey,
    expiresAt: Date.now() + THIRTY_DAYS_MS
  };
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearRememberedKey(): void {
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

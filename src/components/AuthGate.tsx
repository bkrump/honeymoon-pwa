import { FormEvent, useState } from 'react';

interface AuthGateProps {
  status: 'booting' | 'locked' | 'unlocking' | 'error' | 'ready';
  message: string;
  onUnlock: (passphrase: string, remember: boolean) => Promise<void>;
}

export function AuthGate({ status, message, onUnlock }: AuthGateProps) {
  const [passphrase, setPassphrase] = useState('');
  const [remember, setRemember] = useState(true);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!passphrase.trim()) return;
    await onUnlock(passphrase, remember);
  }

  const busy = status === 'booting' || status === 'unlocking';

  return (
    <section className="auth-shell" aria-live="polite">
      <div className="auth-card">
        <div className="auth-mark">H</div>
        <p className="auth-eyebrow">Private travel journal</p>
        <h1>Honeymoon</h1>
        <p className="auth-copy">{status === 'booting' ? 'Preparing the offline guide…' : message}</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="passphrase">Secret phrase</label>
          <input
            id="passphrase"
            className="auth-input"
            type="password"
            placeholder="Enter phrase"
            autoComplete="current-password"
            value={passphrase}
            onChange={(event) => setPassphrase(event.target.value)}
            disabled={busy}
          />
          <label className="remember-toggle">
            <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} disabled={busy} />
            <span>Remember this device for 30 days</span>
          </label>
          <button className="primary-button" type="submit" disabled={busy || !passphrase.trim()}>
            {busy ? 'Unlocking…' : 'Unlock details'}
          </button>
        </form>
      </div>
    </section>
  );
}

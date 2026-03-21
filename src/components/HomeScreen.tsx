import type { TripData } from '../types/trip';
import { buildHomeDisplay } from '../lib/theme';

interface HomeScreenProps {
  trip: TripData;
  referenceDate: Date;
  previewDate: string;
  onPreviewDateChange: (value: string) => void;
}

export function HomeScreen({ trip, referenceDate, previewDate, onPreviewDateChange }: HomeScreenProps) {
  const display = buildHomeDisplay(trip, referenceDate);

  return (
    <section className="home-screen panel-shell active-screen">
      <div className="hero-surface">
        <div className="hero-copy">
          <p className="hero-eyebrow">{display.eyebrow}</p>
          {display.mode === 'countdown' ? (
            <>
              <div className="countdown-wrap">
                <span className="countdown-value">{display.primary}</span>
                <span className="countdown-unit">days</span>
              </div>
              <p className="hero-support">{display.secondary}</p>
            </>
          ) : (
            <>
              <h1 className="hero-title">{display.primary}</h1>
              <p className="hero-support">{display.secondary}</p>
            </>
          )}
        </div>
        <label className="preview-picker">
          <span>Preview date</span>
          <input type="date" value={previewDate} onChange={(event) => onPreviewDateChange(event.target.value)} />
        </label>
      </div>
    </section>
  );
}

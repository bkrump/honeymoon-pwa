import type { TripData } from '../types/trip';
import { toISODate } from '../lib/date';
import { buildHomeDisplay } from '../lib/theme';

interface HomeScreenProps {
  trip: TripData;
  referenceDate: Date;
  referenceDateISO: string;
  onReferenceDateChange: (date: string) => void;
}

export function HomeScreen({ trip, referenceDate, referenceDateISO, onReferenceDateChange }: HomeScreenProps) {
  const display = buildHomeDisplay(trip, referenceDate);
  const handleDateChange = (value: string) => {
    if (value) {
      onReferenceDateChange(value);
    }
  };

  return (
    <section className="home-screen active-screen">
      <div className="home-overlay">
        <div className="hero-copy floating-copy">
          <div className="qa-date-control" aria-label="QA date override">
            <label htmlFor="qa-date-input">QA date</label>
            <input
              id="qa-date-input"
              type="date"
              value={referenceDateISO}
              onChange={(event) => handleDateChange(event.currentTarget.value)}
              onInput={(event) => handleDateChange(event.currentTarget.value)}
              onBlur={(event) => handleDateChange(event.currentTarget.value)}
            />
            <button type="button" onClick={() => onReferenceDateChange(toISODate(new Date()))}>
              Today
            </button>
          </div>
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
      </div>
    </section>
  );
}

import type { TripData } from '../types/trip';
import { buildHomeDisplay } from '../lib/theme';

interface HomeScreenProps {
  trip: TripData;
  referenceDate: Date;
}

export function HomeScreen({ trip, referenceDate }: HomeScreenProps) {
  const display = buildHomeDisplay(trip, referenceDate);

  return (
    <section className="home-screen active-screen">
      <div className="home-overlay">
        <div className="hero-copy floating-copy">
          <p className="hero-eyebrow">{display.eyebrow}</p>
          {display.mode === 'countdown' ? (
            <>
              <div className="countdown-wrap">
                <span className="countdown-value">{display.primary}</span>
                <span className="countdown-unit">days</span>
              </div>
              <p className="hero-support">{display.secondary}</p>
              {display.milestones.length ? (
                <div className="countdown-sidecars" aria-label="Additional countdowns">
                  {display.milestones.map((milestone) => (
                    <div className="countdown-sidecar" key={milestone.targetDate}>
                      <span>{milestone.label}</span>
                      <strong>{milestone.value}</strong>
                      <p>
                        {milestone.unit} {milestone.caption}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
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
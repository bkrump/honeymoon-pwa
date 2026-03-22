import { useEffect, useMemo, useRef, useState } from 'react';
import type { TripData, TripDay, TripEvent, TripEventType } from '../types/trip';
import { formatDayChip, formatLongDate } from '../lib/date';
import { getInitialSelectedDate } from '../lib/trip';

interface ItineraryScreenProps {
  trip: TripData;
}

const typeLabels: Record<TripEventType, string> = {
  flight: 'Flight',
  car: 'Car',
  hotel: 'Hotel',
  activity: 'Activity',
  transfer: 'Transfer',
  note: 'Note'
};

const metaRows: Array<{ key: keyof TripEvent; label: string; link?: boolean }> = [
  { key: 'provider', label: 'Provider' },
  { key: 'location', label: 'Location' },
  { key: 'address', label: 'Address', link: true },
  { key: 'duration', label: 'Duration' },
  { key: 'cabin', label: 'Cabin' },
  { key: 'driver', label: 'Driver' },
  { key: 'vehicle', label: 'Vehicle' }
];

function copyValue(value: string) {
  navigator.clipboard?.writeText(value).catch(() => undefined);
}

function EventCard({ event }: { event: TripEvent }) {
  return (
    <article className={`event-card event-${event.type}`}>
      <div className="event-card-topline">
        <span className="event-chip">{typeLabels[event.type]}</span>
        <span className="event-time">{event.timeLabel}</span>
      </div>
      <div className="event-card-heading">
        <div>
          <h4>{event.title}</h4>
          {event.confirmationCode ? (
            <button className="code-chip" type="button" onClick={() => copyValue(event.confirmationCode!)}>
              {event.confirmationCode}
            </button>
          ) : null}
        </div>
      </div>
      <div className="event-meta-grid">
        {metaRows.map((row) => {
          const value = event[row.key];
          if (!value || typeof value !== 'string') return null;
          return (
            <div key={row.key} className="meta-block">
              <span>{row.label}</span>
              {row.link ? (
                <a href={`https://maps.apple.com/?q=${encodeURIComponent(value)}`} target="_blank" rel="noreferrer">
                  {value}
                </a>
              ) : (
                <strong>{value}</strong>
              )}
            </div>
          );
        })}
      </div>
      {event.segments.length ? (
        <div className="timeline-block">
          <p className="list-label">Segments</p>
          <div className="segment-list">
            {event.segments.map((segment, index) => (
              <div className="segment-item" key={`${event.id}-segment-${index}`}>
                <div className="segment-route">
                  <strong>{segment.from}</strong>
                  <span />
                  <strong>{segment.to}</strong>
                </div>
                <p>{segment.departureLabel}</p>
                <p>{segment.arrivalLabel}</p>
                <p>{segment.airline} · {segment.equipment} · {segment.cabin}</p>
                {segment.note ? <p>{segment.note}</p> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {event.layovers.length ? (
        <div className="list-block">
          <p className="list-label">Layovers</p>
          <ul>
            {event.layovers.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      ) : null}
      {event.details.length ? (
        <div className="list-block">
          <p className="list-label">Details</p>
          <ul>
            {event.details.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      ) : null}
    </article>
  );
}

function centerChip(container: HTMLDivElement | null, button: HTMLButtonElement | null, behavior: ScrollBehavior = 'smooth') {
  if (!container || !button) return;
  const left = button.offsetLeft - (container.clientWidth - button.clientWidth) / 2;
  const max = Math.max(0, container.scrollWidth - container.clientWidth);
  container.scrollTo({ left: Math.max(0, Math.min(left, max)), behavior });
}

export function ItineraryScreen({ trip }: ItineraryScreenProps) {
  const initialDate = useMemo(() => getInitialSelectedDate(trip.days), [trip.days]);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const stripRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const chipRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    setSelectedDate(initialDate);
  }, [initialDate]);

  useEffect(() => {
    centerChip(stripRef.current, chipRefs.current[selectedDate], 'auto');
  }, [selectedDate]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible[0]) {
          setSelectedDate(visible[0].target.getAttribute('data-day') || visible[0].target.id.replace('day-', ''));
        }
      },
      {
        root: null,
        rootMargin: '-160px 0px -50% 0px',
        threshold: [0.15, 0.35, 0.6]
      }
    );

    trip.days.forEach((day) => {
      const section = sectionRefs.current[day.date];
      if (section) observer.observe(section);
    });

    return () => observer.disconnect();
  }, [trip.days]);

  function jumpToDay(day: TripDay) {
    setSelectedDate(day.date);
    centerChip(stripRef.current, chipRefs.current[day.date]);
    const target = sectionRefs.current[day.date];
    const stickyHeight = headerRef.current?.offsetHeight ?? 0;
    if (!target) return;
    const top = target.getBoundingClientRect().top + window.scrollY - stickyHeight - 18;
    window.scrollTo({ top, behavior: 'smooth' });
  }

  return (
    <section className="itinerary-screen panel-shell active-screen">
      <div ref={headerRef} className="itinerary-sticky-shell">
        <div className="itinerary-header-card">
          <div>
            <p className="section-kicker">Reservations</p>
            <h2>Itinerary</h2>
            <p className="section-subtitle">{trip.tripDateRange}</p>
          </div>
        </div>
        <div ref={stripRef} className="day-strip" aria-label="Jump to trip day">
          {trip.days.map((day) => {
            const chip = formatDayChip(day.date);
            return (
              <button
                key={day.date}
                ref={(element) => {
                  chipRefs.current[day.date] = element;
                }}
                className={selectedDate === day.date ? 'day-chip active' : 'day-chip'}
                onClick={() => jumpToDay(day)}
                type="button"
              >
                <span>{chip.weekday}</span>
                <strong>{chip.monthDay}</strong>
              </button>
            );
          })}
        </div>
      </div>
      <div className="day-stack">
        {trip.days.map((day) => (
          <section
            key={day.date}
            data-day={day.date}
            id={`day-${day.date}`}
            ref={(element) => {
              sectionRefs.current[day.date] = element;
            }}
            className="day-card"
          >
            <div className="day-card-header">
              <div>
                <p className="day-label">{formatLongDate(day.date)}</p>
                <h3>{day.title}</h3>
                <p className="day-summary">{day.summary}</p>
              </div>
            </div>
            {day.events.length ? (
              <div className="event-stack">
                {day.events.map((event) => <EventCard key={event.id} event={event} />)}
              </div>
            ) : (
              <div className="empty-state">
                <p>Nothing pinned here yet.</p>
              </div>
            )}
          </section>
        ))}
      </div>
    </section>
  );
}

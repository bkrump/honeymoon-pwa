import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { TripData, TripEvent, TripEventType } from '../types/trip';
import { formatDayChip, formatLongDate } from '../lib/date';
import { getInitialSelectedDate } from '../lib/trip';

interface ItineraryScreenProps {
  trip: TripData;
}

type SummaryItem = {
  label: string;
  value: string;
};

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

const urlPattern = /(https?:\/\/[^\s]+)/g;
const googleMapsUrlPattern = /^https?:\/\/(?:www\.)?(?:google\.[^/\s]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps)\S*$/i;
const genericLocationPattern = /^(hotel|hotel spa|hotel pool|hotel pickup)$/i;

function copyValue(value: string) {
  navigator.clipboard?.writeText(value).catch(() => undefined);
}

function renderLinkedText(value: string): ReactNode {
  const parts = value.split(urlPattern);
  if (parts.length === 1) return value;

  return parts.map((part, index) => {
    if (!/^https?:\/\//.test(part)) {
      return part;
    }

    return (
      <a key={`${part}-${index}`} href={part} target="_blank" rel="noreferrer">
        {part}
      </a>
    );
  });
}

function getAirportCode(value: string) {
  const match = value.match(/\(([A-Z0-9]{3,4})\)/);
  return match ? match[1] : value;
}

function getGoogleMapsHref(value: string): string {
  return googleMapsUrlPattern.test(value)
    ? value
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value)}`;
}

function findGoogleMapsLink(values: string[]): string | null {
  for (const value of values) {
    const matches = value.match(urlPattern) ?? [];
    const googleMatch = matches.find((match) => googleMapsUrlPattern.test(match));
    if (googleMatch) {
      return googleMatch;
    }
  }

  return null;
}

function buildRouteLabel(event: TripEvent) {
  if (event.location) {
    return event.location.replace(/\s*->\s*/g, ' → ');
  }

  if (!event.segments.length) return undefined;

  const stops = [event.segments[0].from, ...event.segments.map((segment) => segment.to)].map(getAirportCode);
  return stops.join(' → ');
}

function buildHeadline(event: TripEvent) {
  switch (event.type) {
    case 'flight':
      return buildRouteLabel(event);
    case 'car':
      return event.vehicle || event.provider || event.location;
    case 'hotel':
      return event.location || event.provider;
    case 'activity':
      return event.location || event.details[0];
    case 'transfer':
      return event.location || event.provider || event.details[0];
    case 'note':
      return event.details[0] || event.location || event.provider;
    default:
      return undefined;
  }
}

function buildSummaryItems(event: TripEvent): SummaryItem[] {
  switch (event.type) {
    case 'flight':
      return [
        event.duration ? { label: 'Duration', value: event.duration } : null,
        event.cabin ? { label: 'Cabin', value: event.cabin } : null,
        event.layovers.length ? { label: 'Stops', value: event.layovers.join(' · ') } : null
      ].filter(Boolean) as SummaryItem[];
    case 'car':
      return [
        event.provider ? { label: 'Provider', value: event.provider } : null,
        event.location ? { label: 'Pickup', value: event.location } : null,
        event.vehicle ? { label: 'Vehicle', value: event.vehicle } : null
      ].filter(Boolean) as SummaryItem[];
    case 'hotel':
      return [
        event.provider ? { label: 'Hotel', value: event.provider } : null,
        event.location ? { label: 'Location', value: event.location } : null,
        event.duration ? { label: 'Stay', value: event.duration } : null
      ].filter(Boolean) as SummaryItem[];
    case 'activity':
      return [
        event.location ? { label: 'Where', value: event.location } : null,
        event.provider ? { label: 'Host', value: event.provider } : null,
        event.details[0] ? { label: 'Plan', value: event.details[0] } : null
      ].filter(Boolean) as SummaryItem[];
    case 'transfer':
      return [
        event.location ? { label: 'Route', value: event.location } : null,
        event.provider ? { label: 'Provider', value: event.provider } : null,
        event.details[0] ? { label: 'Note', value: event.details[0] } : null
      ].filter(Boolean) as SummaryItem[];
    case 'note':
      return [
        event.details[0] ? { label: 'Note', value: event.details[0] } : null,
        event.location ? { label: 'Where', value: event.location } : null,
        event.provider ? { label: 'Source', value: event.provider } : null
      ].filter(Boolean) as SummaryItem[];
    default:
      return [];
  }
}

function getMapHref(event: TripEvent) {
  const directMapsLink = findGoogleMapsLink(event.details);
  if (directMapsLink) return directMapsLink;

  if (event.address) return getGoogleMapsHref(event.address);
  if (!event.location || event.type === 'flight' || event.location.includes('->') || genericLocationPattern.test(event.location)) {
    return null;
  }
  return getGoogleMapsHref(event.location);
}

function EventCard({ event }: { event: TripEvent }) {
  const summaryItems = buildSummaryItems(event);
  const headline = buildHeadline(event);
  const mapHref = getMapHref(event);

  return (
    <article className={`event-card event-${event.type} expanded always-open`}>
      <div className="event-card-shell">
        <div className="event-card-topline">
          <span className="event-time-badge">{event.timeLabel}</span>
        </div>
        <div className="event-card-heading">
          <div className="event-title-block">
            <div className="event-badge-row">
              <span className="event-chip">{typeLabels[event.type]}</span>
              {event.confirmationCode ? <span className="event-code-badge">{event.confirmationCode}</span> : null}
            </div>
            <h4>{event.title}</h4>
            {headline ? <p className="event-headline">{headline}</p> : null}
          </div>
        </div>
        {summaryItems.length ? (
          <dl className="event-summary-grid">
            {summaryItems.map((item) => (
              <div key={`${event.id}-${item.label}`} className="event-summary-item">
                <dt>{item.label}</dt>
                <dd>{renderLinkedText(item.value)}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {(event.confirmationCode || mapHref) ? (
          <div className="event-actions">
            {event.confirmationCode ? (
              <button className="event-action" type="button" onClick={() => copyValue(event.confirmationCode!)}>
                Copy code
              </button>
            ) : null}
            {mapHref ? (
              <a
                className="event-action secondary"
                href={mapHref}
                target="_blank"
                rel="noreferrer"
              >
                Open in Google Maps
              </a>
            ) : null}
          </div>
        ) : null}

        <div className="event-expanded-content always-open">
          <div className="event-meta-grid">
            {metaRows.map((row) => {
              const value = event[row.key];
              if (!value || typeof value !== 'string') return null;
              return (
                <div key={row.key} className="meta-block">
                  <span>{row.label}</span>
                  {row.link ? (
                    <a href={getGoogleMapsHref(value)} target="_blank" rel="noreferrer">
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
                    <p>
                      {segment.airline} · {segment.equipment} · {segment.cabin}
                    </p>
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
                {event.layovers.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {event.details.length ? (
            <div className="list-block">
              <p className="list-label">Details</p>
              <ul>
                {event.details.map((item) => (
                  <li key={item}>{renderLinkedText(item)}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function revealChip(container: HTMLDivElement | null, button: HTMLButtonElement | null, behavior: ScrollBehavior = 'smooth') {
  if (!container || !button) return;
  const chipStart = button.offsetLeft;
  const chipEnd = chipStart + button.offsetWidth;
  const viewStart = container.scrollLeft;
  const viewEnd = viewStart + container.clientWidth;

  if (chipStart >= viewStart && chipEnd <= viewEnd) return;

  if (chipStart < viewStart) {
    container.scrollTo({ left: Math.max(0, chipStart - 12), behavior });
    return;
  }

  const max = Math.max(0, container.scrollWidth - container.clientWidth);
  container.scrollTo({ left: Math.min(max, chipEnd - container.clientWidth + 12), behavior });
}

export function ItineraryScreen({ trip }: ItineraryScreenProps) {
  const initialDate = useMemo(() => getInitialSelectedDate(trip.days), [trip.days]);
  const initialIndex = useMemo(
    () => Math.max(0, trip.days.findIndex((day) => day.date === initialDate)),
    [initialDate, trip.days]
  );

  const [activeIndex, setActiveIndex] = useState(initialIndex);

  const headerRef = useRef<HTMLDivElement | null>(null);
  const stripRef = useRef<HTMLDivElement | null>(null);
  const chipRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    setActiveIndex(initialIndex);
  }, [initialIndex]);

  const activeDay = trip.days[activeIndex] ?? trip.days[0];

  useEffect(() => {
    if (!activeDay) return;
    revealChip(stripRef.current, chipRefs.current[activeDay.date], 'smooth');
  }, [activeDay]);

  function jumpToDay(index: number) {
    setActiveIndex(index);
    const header = headerRef.current;
    if (!header) return;
    const top = header.getBoundingClientRect().top + window.scrollY - 12;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }

  return (
    <section className="itinerary-screen panel-shell active-screen">
      <div ref={headerRef} className="itinerary-sticky-shell">
        <div className="itinerary-header-card compact">
          <p className="section-kicker">Reservations</p>
          <div className="itinerary-header-row">
            <h2>Itinerary</h2>
            {activeDay ? <p className="itinerary-active-date">{formatLongDate(activeDay.date)}</p> : null}
          </div>
        </div>
        <div ref={stripRef} className="day-strip compact" aria-label="Jump to trip day">
          {trip.days.map((day, index) => {
            const chip = formatDayChip(day.date);
            return (
              <button
                key={day.date}
                ref={(element) => {
                  chipRefs.current[day.date] = element;
                }}
                className={activeDay?.date === day.date ? 'day-chip active compact' : 'day-chip compact'}
                onClick={() => jumpToDay(index)}
                type="button"
              >
                <span>{chip.weekday}</span>
                <strong>{chip.monthDay}</strong>
              </button>
            );
          })}
        </div>
      </div>

      {activeDay ? (
        <section className="day-page-single day-page-shell day-card">
          <div className="day-card-header daybook-header">
            <div>
              <p className="day-label">{formatLongDate(activeDay.date)}</p>
              <h3>{activeDay.title}</h3>
              <p className="day-summary">{activeDay.summary}</p>
            </div>
          </div>
          {activeDay.events.length ? (
            <div className="event-stack daybook-events">
              {activeDay.events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <div className="empty-state daybook-empty-state">
              <p>Nothing pinned here yet.</p>
            </div>
          )}
        </section>
      ) : null}
    </section>
  );
}

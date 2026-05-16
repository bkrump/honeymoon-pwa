import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { TripData, TripEvent, TripEventType } from '../types/trip';
import { formatDayChip, formatLongDate } from '../lib/date';
import { getInitialSelectedDate } from '../lib/trip';

interface ItineraryScreenProps {
  trip: TripData;
  referenceDate: Date;
}

type SummaryItem = {
  label: string;
  value: string;
  priority?: 'primary' | 'secondary';
};

type MetaItem = {
  key: keyof TripEvent;
  label: string;
  value: string;
  link?: boolean;
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
const freeTimeNotePattern = /(free time|open day|open dinner|nothing scheduled|unscheduled|rest of day|lunch|wander|pool|cabana|no dinner|no reservation|last day)/i;
const genericDetailPattern = /^(dinner reservation|morning visit|museum visit|museum visit after jardin majorelle|no reservation|no dinner reservation|massage appointment at the hotel|pickup from the hotel|guided walking tour|boat day)$/i;
const compactDetailMaxLength = 28;

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

function normalizeComparableText(value: string) {
  return value
    .toLowerCase()
    .replace(urlPattern, ' ')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function isRedundantValue(value: string, references: Array<string | undefined>) {
  const normalizedValue = normalizeComparableText(value);
  if (!normalizedValue) return false;

  return references.some((reference) => {
    if (!reference) return false;

    const normalizedReference = normalizeComparableText(reference);
    if (!normalizedReference) return false;

    return normalizedValue === normalizedReference ||
      normalizedValue.includes(normalizedReference) ||
      normalizedReference.includes(normalizedValue);
  });
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
      return undefined;
    case 'transfer':
      return event.location || event.provider || event.details[0];
    case 'note':
      return event.location || event.details[0] || event.provider;
    default:
      return undefined;
  }
}

function buildSummaryItems(event: TripEvent, headline?: string): SummaryItem[] {
  const rawItems = (() => {
    switch (event.type) {
    case 'flight':
      return [];
    case 'car':
      return [
        event.location ? { label: 'Pickup', value: event.location } : null,
        event.vehicle ? { label: 'Vehicle', value: event.vehicle } : null
      ];
    case 'hotel':
      return [
        event.location ? { label: 'Location', value: event.location } : null,
        event.duration ? { label: 'Stay', value: event.duration } : null
      ];
    case 'activity':
      return [
        event.provider && !isRedundantValue(event.provider, [event.title, event.location])
          ? { label: 'Host', value: event.provider }
          : null
      ];
    case 'transfer':
      return [
        event.location ? { label: 'Route', value: event.location } : null,
        event.provider ? { label: 'Provider', value: event.provider } : null
      ];
    case 'note':
      return [
        event.location ? { label: 'Where', value: event.location } : null,
        event.provider ? { label: 'Source', value: event.provider } : null
      ];
    default:
      return [];
    }
  })();

  return rawItems
    .filter(Boolean)
    .filter((item): item is SummaryItem => Boolean(item))
    .filter((item) => !isRedundantValue(item.value, [event.title, headline]));
}

function buildMetaItems(event: TripEvent, headline: string | undefined, summaryItems: SummaryItem[]): MetaItem[] {
  if (event.type === 'flight' || event.type === 'car') return [];

  const references = [event.title, headline, ...summaryItems.map((item) => item.value)];

  return metaRows.flatMap((row) => {
    const value = event[row.key];
    if (!value || typeof value !== 'string') return [];
    if (row.key === 'location' || row.key === 'address') return [];
    if (isRedundantValue(value, references)) return [];

    return [
      {
        key: row.key,
        label: row.label,
        value,
        link: row.link
      }
    ];
  });
}

function isCompactDetail(value: string) {
  return !value.match(urlPattern) && value.length <= compactDetailMaxLength;
}

function hasGoogleMapsLink(value: string) {
  return (value.match(urlPattern) ?? []).some((match) => googleMapsUrlPattern.test(match));
}

function isGenericDetail(value: string) {
  if (value.match(urlPattern)) return false;
  return genericDetailPattern.test(value.trim());
}

function buildDetailContent(event: TripEvent, headline: string | undefined, summaryItems: SummaryItem[], metaItems: MetaItem[]) {
  const references = [
    event.title,
    headline,
    ...summaryItems.map((item) => item.value),
    ...metaItems.map((item) => item.value)
  ];

  const visibleDetails = event.details.filter((item) => !hasGoogleMapsLink(item) && !isGenericDetail(item) && !isRedundantValue(item, references));
  const supportCopy =
    event.type === 'note' &&
    visibleDetails.length === 1 &&
    !visibleDetails[0].match(urlPattern)
      ? visibleDetails[0]
      : null;

  const detailCandidates = supportCopy ? [] : visibleDetails;
  const detailPills =
    detailCandidates.length <= 2
      ? detailCandidates.filter((item) => isCompactDetail(item))
      : [];

  return {
    supportCopy,
    detailPills,
    detailItems: detailCandidates.filter((item) => !detailPills.includes(item))
  };
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

function getLocationLabel(event: TripEvent, mapHref: string | null) {
  if (event.type === 'flight') return null;

  if (event.location && !genericLocationPattern.test(event.location)) {
    return event.location;
  }

  if (event.address) return event.address;
  if (mapHref) return 'Meeting point';
  return null;
}

function shouldShowTypeChip(event: TripEvent) {
  return event.type === 'flight' || event.type === 'car' || event.type === 'hotel' || event.type === 'transfer';
}

function isFreeTimeNote(event: TripEvent) {
  if (event.type !== 'note' || event.confirmationCode || event.segments.length || event.layovers.length) {
    return false;
  }

  return freeTimeNotePattern.test([event.title, event.timeLabel, event.location, ...event.details].filter(Boolean).join(' '));
}

function getFreeTimeCopy(event: TripEvent) {
  return event.details.find((detail) => !isRedundantValue(detail, [event.title])) || event.location || event.title;
}

function isDuplicateFlightArrivalNote(event: TripEvent, events: TripEvent[]) {
  if (event.type !== 'note' || !/^Land at .* Airport/i.test(event.title) || !event.confirmationCode) {
    return false;
  }

  const airportCode = getAirportCode(event.title);
  return events.some((candidate) => (
    candidate.type === 'flight' &&
    candidate.confirmationCode === event.confirmationCode &&
    candidate.segments.some((segment) => segment.arrivalLabel.includes(airportCode))
  ));
}

function getDisplayEvents(events: TripEvent[]) {
  return events.filter((event) => !isDuplicateFlightArrivalNote(event, events));
}

function EventLocationRow({ label, mapHref }: { label: string; mapHref: string | null }) {
  return (
    <div className="event-location-row">
      <span>{label}</span>
      {mapHref ? (
        <a href={mapHref} target="_blank" rel="noreferrer">
          Map
        </a>
      ) : null}
    </div>
  );
}

function getDetailValue(event: TripEvent, prefix: string) {
  const match = event.details.find((detail) => detail.toLowerCase().startsWith(prefix.toLowerCase()));
  return match?.replace(new RegExp(`^${prefix}\\s*`, 'i'), '').trim();
}

function getFlightStartLabel(event: TripEvent) {
  return event.segments[0]?.departureLabel ?? getDetailValue(event, 'Departs') ?? event.timeLabel;
}

function getFlightEndLabel(event: TripEvent) {
  return event.segments[event.segments.length - 1]?.arrivalLabel ?? getDetailValue(event, 'Arrives') ?? event.endDate;
}

function CarOverview({ event, mapHref, locationLabel }: { event: TripEvent; mapHref: string | null; locationLabel: string | null }) {
  const items = [
    event.timeLabel ? { label: 'Pickup window', value: event.timeLabel } : null,
    event.vehicle ? { label: 'Vehicle', value: event.vehicle } : null,
    event.driver ? { label: 'Driver', value: event.driver } : null,
    event.provider ? { label: 'Provider', value: event.provider } : null
  ].filter((item): item is SummaryItem => Boolean(item));

  return (
    <div className="travel-brief car-brief" aria-label="Car rental essentials">
      {locationLabel ? <EventLocationRow label={locationLabel} mapHref={mapHref} /> : null}
      {items.length ? (
        <dl className="travel-brief-grid">
          {items.map((item) => (
            <div key={`${event.id}-${item.label}`} className="travel-brief-item">
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}

function FlightOverview({ event }: { event: TripEvent }) {
  const rawItems: Array<SummaryItem | null> = [
    { label: 'Start', value: getFlightStartLabel(event), priority: 'primary' as const },
    { label: 'End', value: getFlightEndLabel(event), priority: 'primary' as const },
    event.duration ? { label: 'Duration', value: event.duration, priority: 'primary' as const } : null,
    event.cabin ? { label: 'Cabin', value: event.cabin, priority: 'secondary' as const } : null,
    event.confirmationCode ? { label: 'Confirmation', value: event.confirmationCode, priority: 'secondary' as const } : null
  ];
  const items = rawItems.filter((item): item is SummaryItem => item !== null);

  return (
    <dl className="flight-overview" aria-label="Flight timing">
      {items.map((item) => (
        <div key={`${event.id}-${item.label}`} className={`flight-overview-item ${item.priority === 'primary' ? 'primary' : 'secondary'}`}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function splitLayoverLabel(value: string) {
  const [stop, ...details] = value.split(':');
  return {
    stop: stop.trim(),
    detail: details.join(':').trim()
  };
}

function LayoverList({ layovers }: { layovers: string[] }) {
  if (!layovers.length) return null;

  return (
    <div className="connection-list" aria-label="Layovers">
      <p className="list-label">Connections</p>
      <div className="connection-items">
        {layovers.map((item) => {
          const { stop, detail } = splitLayoverLabel(item);

          return (
            <div className="connection-item" key={item}>
              <span>{stop}</span>
              <strong>{detail || item}</strong>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FlightSegmentList({ event }: { event: TripEvent }) {
  if (!event.segments.length) return null;

  return (
    <div className="timeline-block flight-segments-block">
      <p className="list-label">Segments</p>
      <div className="segment-list flight-segment-list">
        {event.segments.map((segment, index) => (
          <div className="segment-item flight-segment-card" key={`${event.id}-segment-${index}`}>
            <div className="segment-route">
              <strong>{segment.from}</strong>
              <span />
              <strong>{segment.to}</strong>
            </div>
            <dl className="flight-segment-times">
              <div>
                <dt>Depart</dt>
                <dd>{segment.departureLabel}</dd>
              </div>
              <div>
                <dt>Arrive</dt>
                <dd>{segment.arrivalLabel}</dd>
              </div>
              {segment.duration ? (
                <div>
                  <dt>Duration</dt>
                  <dd>{segment.duration}</dd>
                </div>
              ) : null}
            </dl>
            <div className="flight-segment-meta">
              <span>{segment.airline}</span>
              <span>{segment.cabin}</span>
            </div>
            {segment.note ? <p>{segment.note}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function FreeTimeRow({ event }: { event: TripEvent }) {
  const mapHref = getMapHref(event);
  const locationLabel = getLocationLabel(event, mapHref);
  const copy = getFreeTimeCopy(event);

  return (
    <article className="event-free-time">
      <span className="free-time-time">{event.timeLabel}</span>
      <div className="free-time-copy">
        <strong>{event.title}</strong>
        {copy !== event.title ? <span>{renderLinkedText(copy)}</span> : null}
        {locationLabel ? <EventLocationRow label={locationLabel} mapHref={mapHref} /> : null}
      </div>
    </article>
  );
}

function EventCard({ event }: { event: TripEvent }) {
  const headline = buildHeadline(event);
  const summaryItems = buildSummaryItems(event, headline);
  const metaItems = buildMetaItems(event, headline, summaryItems);
  const { supportCopy, detailPills, detailItems } = buildDetailContent(event, headline, summaryItems, metaItems);
  const mapHref = getMapHref(event);
  const locationLabel = getLocationLabel(event, mapHref);
  const showTypeChip = shouldShowTypeChip(event);
  const showCodeBadge = Boolean(event.confirmationCode && event.type !== 'flight');
  const hasExpandedContent = Boolean(metaItems.length || event.segments.length || event.layovers.length || detailItems.length);
  const eventCardClassName = [
    'event-card',
    `event-${event.type}`,
    'expanded',
    'always-open',
    event.type === 'note' && !hasExpandedContent && !summaryItems.length ? 'event-quiet-note' : ''
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article className={eventCardClassName}>
      <div className="event-card-shell">
        <div className="event-card-topline">
          <span className="event-time-badge">{event.timeLabel}</span>
        </div>
        <div className="event-card-heading">
          <div className="event-title-block">
            {showTypeChip || showCodeBadge ? (
              <div className="event-badge-row">
                {showTypeChip ? <span className="event-chip">{typeLabels[event.type]}</span> : null}
                {showCodeBadge ? <span className="event-code-badge">{event.confirmationCode}</span> : null}
              </div>
            ) : null}
            {event.type === 'flight' && headline ? <p className="event-route-line">{headline}</p> : null}
            <h4>{event.title}</h4>
            {headline && event.type !== 'flight' ? <p className="event-headline">{headline}</p> : null}
          </div>
        </div>
        {event.type === 'flight' ? <FlightOverview event={event} /> : null}
        {event.type === 'car' ? <CarOverview event={event} mapHref={mapHref} locationLabel={locationLabel} /> : null}
        {locationLabel && event.type !== 'car' ? <EventLocationRow label={locationLabel} mapHref={mapHref} /> : null}
        {summaryItems.length && event.type !== 'car' ? (
          <dl className="event-summary-grid">
            {summaryItems.map((item) => (
              <div key={`${event.id}-${item.label}`} className="event-summary-item">
                <dt>{item.label}</dt>
                <dd>{renderLinkedText(item.value)}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {detailPills.length ? (
          <div className="event-detail-pills" aria-label="Highlights">
            {detailPills.map((item) => (
              <span key={`${event.id}-${item}`} className="event-detail-pill">
                {item}
              </span>
            ))}
          </div>
        ) : null}

        {supportCopy ? <p className="event-support-copy">{renderLinkedText(supportCopy)}</p> : null}

        {event.confirmationCode ? (
          <div className="event-actions">
            <button className="event-action" type="button" onClick={() => copyValue(event.confirmationCode!)}>
              Copy code
            </button>
          </div>
        ) : null}

        {hasExpandedContent ? (
          <div className="event-expanded-content always-open">
            {metaItems.length ? (
              <div className="event-meta-grid">
                {metaItems.map((item) => (
                  <div key={item.key} className="meta-block">
                    <span>{item.label}</span>
                    {item.link ? (
                      <a href={getGoogleMapsHref(item.value)} target="_blank" rel="noreferrer">
                        {item.value}
                      </a>
                    ) : (
                      <strong>{item.value}</strong>
                    )}
                  </div>
                ))}
              </div>
            ) : null}

            {event.type === 'flight' ? <LayoverList layovers={event.layovers} /> : null}

            {event.type === 'flight' ? <FlightSegmentList event={event} /> : null}

            {event.type !== 'flight' && event.layovers.length ? (
              <div className="list-block">
                <p className="list-label">Layovers</p>
                <ul>
                  {event.layovers.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {detailItems.length ? (
              <div className="list-block">
                <p className="list-label">Details</p>
                <ul>
                  {detailItems.map((item) => (
                    <li key={item}>{renderLinkedText(item)}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function revealChip(container: HTMLDivElement | null, button: HTMLButtonElement | null, behavior: ScrollBehavior = 'smooth') {
  if (!container || !button) return;
  const chips = Array.from(container.querySelectorAll<HTMLButtonElement>('.day-chip'));
  const activeIndex = chips.indexOf(button);
  if (activeIndex < 0) return;

  const styles = window.getComputedStyle(container);
  const gap = Number.parseFloat(styles.columnGap) || Number.parseFloat(styles.gap) || 0;
  const paddingLeft = Number.parseFloat(styles.paddingLeft) || 0;
  const paddingRight = Number.parseFloat(styles.paddingRight) || 0;
  const chipWidth = button.getBoundingClientRect().width;
  const contentWidth = container.clientWidth - paddingLeft - paddingRight;
  const step = chipWidth + gap;

  if (chipWidth <= 0 || contentWidth <= 0 || step <= 0) return;

  const visibleSlots = Math.max(1, Math.min(chips.length, Math.round((contentWidth + gap) / step)));
  const desiredFirstIndex = Math.max(0, activeIndex - Math.floor(visibleSlots / 2));
  const targetIndex = Math.min(desiredFirstIndex, Math.max(0, chips.length - visibleSlots));
  const containerRect = container.getBoundingClientRect();
  const targetRect = chips[targetIndex].getBoundingClientRect();
  const max = Math.max(0, container.scrollWidth - container.clientWidth);
  const targetLeft = Math.min(max, Math.max(0, targetRect.left - containerRect.left + container.scrollLeft - paddingLeft));

  if (Math.abs(container.scrollLeft - targetLeft) > 1) {
    container.scrollTo({ left: targetLeft, behavior });
  }
}

export function ItineraryScreen({ trip, referenceDate }: ItineraryScreenProps) {
  const initialDate = useMemo(() => getInitialSelectedDate(trip.days, referenceDate), [referenceDate, trip.days]);
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

  const displayEvents = activeDay ? getDisplayEvents(activeDay.events) : [];

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
          <p className="section-kicker">Trip days</p>
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
              <h3>{activeDay.title}</h3>
              <p className="day-summary">{activeDay.summary}</p>
            </div>
          </div>
          {displayEvents.length ? (
            <div className="event-stack daybook-events">
              {displayEvents.map((event) => (
                isFreeTimeNote(event) ? <FreeTimeRow key={event.id} event={event} /> : <EventCard key={event.id} event={event} />
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

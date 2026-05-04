import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ItineraryScreen } from './ItineraryScreen';
import type { TripData, TripEvent } from '../types/trip';

beforeAll(() => {
  window.scrollTo = vi.fn();
  HTMLElement.prototype.scrollTo = vi.fn();
});

afterEach(() => {
  cleanup();
});

function makeTrip(events: TripEvent[], summary = 'A focused test day'): TripData {
  return {
    tripTitle: 'Test Trip',
    tripDateRange: 'June 2026',
    timezone: 'America/Los_Angeles',
    themeBands: [],
    days: [
      {
        date: '2026-06-24',
        title: 'Test Day',
        summary,
        events
      }
    ],
    reservations: [],
    essentials: [],
    schemaVersion: 1
  };
}

function renderItinerary(trip: TripData, referenceDate = new Date('2026-06-24T12:00:00')) {
  return render(<ItineraryScreen trip={trip} referenceDate={referenceDate} />);
}

describe('ItineraryScreen', () => {
  it('uses compact map actions from event details and still linkifies booking URLs', () => {
    const trip = makeTrip([
      {
        id: 'home-cooking:2026-06-24',
        sourceEventId: 'home-cooking',
        type: 'activity',
        title: 'Home cooking experience',
        timeLabel: '10:00 AM',
        role: 'single',
        details: [
          'Airbnb cooking experience',
          'Meeting point: https://goo.gl/maps/Dnr14mxQenfcDqGU8',
          'Booking link: https://www.airbnb.com/experiences/1210804?viralityEntryPoint=2&s=76'
        ],
        layovers: [],
        segments: [],
        startDate: '2026-06-24',
        endDate: '2026-06-24'
      }
    ]);

    renderItinerary(trip);

    const bookingLinks = screen.getAllByRole('link', {
      name: 'https://www.airbnb.com/experiences/1210804?viralityEntryPoint=2&s=76'
    });

    expect(bookingLinks[0]).toHaveAttribute('href', 'https://www.airbnb.com/experiences/1210804?viralityEntryPoint=2&s=76');
    expect(screen.getByRole('link', { name: 'Map' })).toHaveAttribute('href', 'https://goo.gl/maps/Dnr14mxQenfcDqGU8');
    expect(screen.queryByText(/Meeting point: https:\/\/goo\.gl\/maps/)).not.toBeInTheDocument();
  });

  it('builds Google Maps search links for named venues', () => {
    const trip = makeTrip([
      {
        id: 'nammos:2026-06-17',
        sourceEventId: 'nammos',
        type: 'activity',
        title: 'Dinner at Nammos',
        provider: 'Nammos',
        location: 'NAMMOS Mykonos, Psarou Beach, Mykonos, Greece',
        timeLabel: '7:30 PM',
        role: 'single',
        details: ['Dinner reservation'],
        layovers: [],
        segments: [],
        startDate: '2026-06-17',
        endDate: '2026-06-17'
      }
    ]);

    renderItinerary(trip);

    expect(screen.getByRole('link', { name: 'Map' })).toHaveAttribute(
      'href',
      'https://www.google.com/maps/search/?api=1&query=NAMMOS%20Mykonos%2C%20Psarou%20Beach%2C%20Mykonos%2C%20Greece'
    );
    expect(screen.queryByText('Dinner reservation')).not.toBeInTheDocument();
  });

  it('prefers an exact street address over a broader venue location', () => {
    const trip = makeTrip([
      {
        id: 'm-eating:2026-06-20',
        sourceEventId: 'm-eating',
        type: 'activity',
        title: 'Dinner at m-eating',
        provider: 'm-eating',
        location: 'M-eating Restaurant, Mykonos Town, Greece',
        address: '10 Kalogera St, Mykonos Town, Greece',
        timeLabel: '7:30 PM',
        role: 'single',
        details: ['Dinner reservation'],
        layovers: [],
        segments: [],
        startDate: '2026-06-20',
        endDate: '2026-06-20'
      }
    ]);

    renderItinerary(trip);

    expect(screen.getByRole('link', { name: 'Map' })).toHaveAttribute(
      'href',
      'https://www.google.com/maps/search/?api=1&query=10%20Kalogera%20St%2C%20Mykonos%20Town%2C%20Greece'
    );
  });

  it('renders flexible open-time notes as lightweight rows instead of full note cards', () => {
    const trip = makeTrip(
      [
        {
          id: 'open-day:2026-06-19',
          sourceEventId: 'open-day',
          type: 'note',
          title: 'Open day',
          timeLabel: 'Daytime',
          role: 'single',
          details: ['Nothing scheduled until dinner'],
          layovers: [],
          segments: [],
          startDate: '2026-06-19',
          endDate: '2026-06-19'
        }
      ],
      'Nothing scheduled until dinner'
    );

    renderItinerary(trip);

    expect(screen.getByText('Daytime')).toBeInTheDocument();
    expect(screen.getByText('Open day')).toBeInTheDocument();
    expect(screen.getAllByText('Nothing scheduled until dinner')).toHaveLength(2);
    expect(screen.queryByText('Note')).not.toBeInTheDocument();
    expect(screen.queryByText('Details')).not.toBeInTheDocument();
  });

  it('suppresses duplicate flight arrival notes when the flight segment already contains the arrival', () => {
    const trip = makeTrip([
      {
        id: 'flight-8z2ma2:2026-06-15',
        sourceEventId: 'flight-8z2ma2',
        type: 'flight',
        title: 'Portland to Mykonos',
        provider: 'Lufthansa Group',
        confirmationCode: '8Z2MA2',
        timeLabel: 'Departs 3:25 PM (PDX)',
        role: 'single',
        location: 'PDX -> YVR -> MUC -> JMK',
        duration: '16h 55m',
        cabin: 'Business',
        details: [],
        layovers: [],
        segments: [
          {
            from: 'Munich (MUC)',
            to: 'Mykonos (JMK)',
            departureLabel: '14:50 Munich (MUC)',
            arrivalLabel: '18:20 Mykonos (JMK)',
            airline: 'Discover Airlines',
            cabin: 'Business'
          }
        ],
        startDate: '2026-06-14',
        endDate: '2026-06-15'
      },
      {
        id: 'arrival-jmk-8z2ma2:2026-06-15',
        sourceEventId: 'arrival-jmk-8z2ma2',
        type: 'note',
        title: 'Land at Mykonos Airport (JMK)',
        confirmationCode: '8Z2MA2',
        timeLabel: 'Arrive 6:20 PM local',
        role: 'single',
        location: 'Mykonos Airport (JMK)',
        details: ['Final segment arrives from Munich at 6:20 PM local'],
        layovers: [],
        segments: [],
        startDate: '2026-06-15',
        endDate: '2026-06-15'
      }
    ]);

    renderItinerary(trip);

    expect(screen.getByText('Portland to Mykonos')).toBeInTheDocument();
    expect(screen.queryByText('Land at Mykonos Airport (JMK)')).not.toBeInTheDocument();
  });

  it('prioritizes flight start, end, and duration without showing aircraft types', () => {
    const trip = makeTrip([
      {
        id: 'flight-mxp-rak:2026-06-21',
        sourceEventId: 'flight-mxp-rak',
        type: 'flight',
        title: 'Mykonos to Marrakech',
        provider: 'easyJet',
        confirmationCode: 'CBCXV5FG',
        timeLabel: 'Departs 10:30 AM (JMK)',
        role: 'single',
        location: 'JMK -> MXP -> RAK',
        duration: '12h 25m',
        details: [],
        layovers: ['Milan Malpensa (MXP): 6h 15m self-transfer'],
        segments: [
          {
            from: 'Mykonos (JMK)',
            to: 'Milan (MXP)',
            departureLabel: 'Sun Jun 21, 10:30 AM Mykonos (JMK)',
            arrivalLabel: 'Sun Jun 21, 12:15 PM Milan (MXP)',
            duration: '2h 45m',
            airline: 'easyJet U23664',
            cabin: 'Seats 12A / 12B'
          },
          {
            from: 'Milan (MXP)',
            to: 'Marrakesh (RAK)',
            departureLabel: 'Sun Jun 21, 6:30 PM Milan (MXP)',
            arrivalLabel: 'Sun Jun 21, 8:55 PM Marrakesh (RAK)',
            duration: '3h 25m',
            airline: 'easyJet U23929',
            cabin: 'Seats 1B / 1C'
          }
        ],
        startDate: '2026-06-21',
        endDate: '2026-06-21'
      }
    ]);

    renderItinerary(trip);

    expect(screen.getByText('Start')).toBeInTheDocument();
    expect(screen.getAllByText('Sun Jun 21, 10:30 AM Mykonos (JMK)')).toHaveLength(2);
    expect(screen.getByText('End')).toBeInTheDocument();
    expect(screen.getAllByText('Sun Jun 21, 8:55 PM Marrakesh (RAK)')).toHaveLength(2);
    expect(screen.getAllByText('Duration')).toHaveLength(3);
    expect(screen.getByText('12h 25m')).toBeInTheDocument();
    expect(screen.getByText('2h 45m')).toBeInTheDocument();
    expect(screen.getByText('3h 25m')).toBeInTheDocument();
    expect(screen.getByText('easyJet U23664')).toBeInTheDocument();
    expect(screen.queryByText(/Airbus|Boeing|DHC|Sharklets/i)).not.toBeInTheDocument();
  });

  it('uses the provided QA reference date to autoselect the matching trip day', () => {
    const trip = makeTrip([]);
    trip.days = [
      {
        date: '2026-06-14',
        title: 'Departure Day',
        summary: 'Travel begins',
        events: []
      },
      {
        date: '2026-06-20',
        title: 'Mykonos Dinner Day',
        summary: 'Beach and dinner',
        events: []
      }
    ];

    renderItinerary(trip, new Date('2026-06-20T12:00:00'));

    expect(screen.getByText('Mykonos Dinner Day')).toBeInTheDocument();
    expect(screen.queryByText('Departure Day')).not.toBeInTheDocument();
  });

  it('sizes the day selector in whole-chip groups instead of fixed widths', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/styles/global.css'), 'utf8');

    expect(css).toContain('grid-auto-columns: calc((100% - 1.8rem) / 5)');
    expect(css).toContain('grid-auto-columns: calc((100% - 1.35rem) / 4)');
    expect(css).toContain('scroll-snap-stop: always');
    expect(css).not.toContain('grid-auto-columns: 5.2rem');
    expect(css).not.toContain('grid-auto-columns: 4.7rem');
  });
});

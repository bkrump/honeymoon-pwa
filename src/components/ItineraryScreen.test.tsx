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

    render(<ItineraryScreen trip={trip} />);

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

    render(<ItineraryScreen trip={trip} />);

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

    render(<ItineraryScreen trip={trip} />);

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

    render(<ItineraryScreen trip={trip} />);

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
            equipment: 'Airbus A320',
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

    render(<ItineraryScreen trip={trip} />);

    expect(screen.getByText('Portland to Mykonos')).toBeInTheDocument();
    expect(screen.queryByText('Land at Mykonos Airport (JMK)')).not.toBeInTheDocument();
  });
});

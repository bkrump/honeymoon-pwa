import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ItineraryScreen } from './ItineraryScreen';
import type { TripData } from '../types/trip';

beforeAll(() => {
  window.scrollTo = vi.fn();
  HTMLElement.prototype.scrollTo = vi.fn();
});

afterEach(() => {
  cleanup();
});

describe('ItineraryScreen', () => {
  it('uses direct Google Maps links from event details and linkifies booking URLs', () => {
    const trip: TripData = {
      tripTitle: 'Test Trip',
      tripDateRange: 'June 24, 2026',
      timezone: 'America/Los_Angeles',
      themeBands: [],
      days: [
        {
          date: '2026-06-24',
          title: 'Cooking Day',
          summary: 'Home cooking experience',
          events: [
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
          ]
        }
      ],
      reservations: [],
      essentials: [],
      schemaVersion: 1
    };

    render(<ItineraryScreen trip={trip} />);

    const links = screen.getAllByRole('link', {
      name: 'https://www.airbnb.com/experiences/1210804?viralityEntryPoint=2&s=76'
    });

    expect(links[0]).toHaveAttribute('href', 'https://www.airbnb.com/experiences/1210804?viralityEntryPoint=2&s=76');
    expect(screen.getByRole('link', { name: 'Open in Google Maps' })).toHaveAttribute(
      'href',
      'https://goo.gl/maps/Dnr14mxQenfcDqGU8'
    );
  });

  it('builds Google Maps search links for named venues', () => {
    const trip: TripData = {
      tripTitle: 'Test Trip',
      tripDateRange: 'June 17, 2026',
      timezone: 'America/Los_Angeles',
      themeBands: [],
      days: [
        {
          date: '2026-06-17',
          title: 'Dinner Day',
          summary: 'Dinner at Nammos',
          events: [
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
          ]
        }
      ],
      reservations: [],
      essentials: [],
      schemaVersion: 1
    };

    render(<ItineraryScreen trip={trip} />);

    expect(screen.getByRole('link', { name: 'Open in Google Maps' })).toHaveAttribute(
      'href',
      'https://www.google.com/maps/search/?api=1&query=NAMMOS%20Mykonos%2C%20Psarou%20Beach%2C%20Mykonos%2C%20Greece'
    );
  });
});

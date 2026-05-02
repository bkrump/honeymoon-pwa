import { fireEvent, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { buildTripData } from '../../scripts/shared-trip.mjs';
import { sampleTripSource } from '../test/fixtures';
import { GamesScreen, scoreGuess } from './GamesScreen';

const trip = buildTripData(sampleTripSource);
const storageKey = 'honeymoon-wordle-history-v1';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe('GamesScreen', () => {
  it('locks the daily Wordle before the trip starts and hides future words', () => {
    render(<GamesScreen trip={trip} referenceDate={new Date(2026, 5, 10, 12)} />);

    expect(screen.getByText(/Games unlock/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Submit Daily guess' })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByText('VALET')).not.toBeInTheDocument();
    expect(screen.getAllByText('Hidden')).toHaveLength(trip.days.length);
  });

  it('stores a solved result and reveals the completed word in history', () => {
    render(<GamesScreen trip={trip} referenceDate={new Date(2026, 5, 14, 12)} />);

    fireEvent.change(screen.getByLabelText('Daily guess'), { target: { value: 'valet' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit Daily guess' }));

    expect(screen.getByRole('status')).toHaveTextContent('Solved in 1 guess.');
    expect(screen.getByText('VALET')).toBeInTheDocument();
    expect(screen.getAllByText('1/6')).toHaveLength(2);
    expect(JSON.parse(window.localStorage.getItem(storageKey) ?? '{}')).toMatchObject({
      '2026-06-14': {
        guesses: ['VALET'],
        status: 'won'
      }
    });
  });

  it('scores repeated-letter guesses without over-counting letters', () => {
    expect(scoreGuess('LOTUS', 'ATLAS')).toEqual(['present', 'absent', 'present', 'absent', 'correct']);
  });
});

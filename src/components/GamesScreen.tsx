import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { TripData } from '../types/trip';
import { formatLongDate, toISODate } from '../lib/date';

const WORD_LENGTH = 5;
const MAX_GUESSES = 6;
const STORAGE_KEY = 'honeymoon-wordle-history-v1';

const dailyWords: Record<string, string> = {
  '2026-06-14': 'VALET',
  '2026-06-15': 'BRINE',
  '2026-06-16': 'SERUM',
  '2026-06-17': 'MURAL',
  '2026-06-18': 'YACHT',
  '2026-06-19': 'OCHRE',
  '2026-06-20': 'SAVOR',
  '2026-06-21': 'RIADS',
  '2026-06-22': 'ATLAS',
  '2026-06-23': 'HENNA',
  '2026-06-24': 'SOUKS',
  '2026-06-25': 'CUMIN',
  '2026-06-26': 'DUNES',
  '2026-06-27': 'LOTUS',
  '2026-06-28': 'JETTY'
};

const keyboardRows = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

type LetterStatus = 'correct' | 'present' | 'absent';
type StoredGame = {
  guesses: string[];
  status: 'playing' | 'won' | 'lost';
  completedAt?: string;
};
type StoredGames = Record<string, StoredGame>;

function createEmptyGame(): StoredGame {
  return { guesses: [], status: 'playing' };
}

function loadStoredGames(): StoredGames {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as StoredGames : {};
  } catch {
    return {};
  }
}

function saveStoredGames(games: StoredGames) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(games));
  } catch {
    // The game still works for the session if storage is unavailable.
  }
}

function normalizeGuess(value: string) {
  return value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, WORD_LENGTH);
}

export function scoreGuess(guess: string, answer: string): LetterStatus[] {
  const result: LetterStatus[] = Array(WORD_LENGTH).fill('absent');
  const remaining = new Map<string, number>();

  for (let index = 0; index < WORD_LENGTH; index += 1) {
    if (guess[index] === answer[index]) {
      result[index] = 'correct';
    } else {
      remaining.set(answer[index], (remaining.get(answer[index]) ?? 0) + 1);
    }
  }

  for (let index = 0; index < WORD_LENGTH; index += 1) {
    if (result[index] === 'correct') continue;

    const letter = guess[index];
    const count = remaining.get(letter) ?? 0;
    if (count > 0) {
      result[index] = 'present';
      remaining.set(letter, count - 1);
    }
  }

  return result;
}

function getWordForDate(date: string) {
  return dailyWords[date] ?? 'AMBER';
}

function compareDateISO(a: string, b: string) {
  return a.localeCompare(b);
}

function buildKeyboardState(guesses: string[], answer: string) {
  const rank: Record<LetterStatus, number> = { absent: 0, present: 1, correct: 2 };
  const state: Record<string, LetterStatus> = {};

  guesses.forEach((guess) => {
    scoreGuess(guess, answer).forEach((status, index) => {
      const letter = guess[index];
      if (!state[letter] || rank[status] > rank[state[letter]]) {
        state[letter] = status;
      }
    });
  });

  return state;
}

function buildRows(game: StoredGame, activeGuess: string, answer: string) {
  return Array.from({ length: MAX_GUESSES }, (_, rowIndex) => {
    const submitted = game.guesses[rowIndex];
    const value = submitted ?? (rowIndex === game.guesses.length ? activeGuess : '');
    const scores = submitted ? scoreGuess(submitted, answer) : [];

    return { value, scores };
  });
}

function resolveGuess(game: StoredGame, rawGuess: string, answer: string) {
  const guess = normalizeGuess(rawGuess);
  if (guess.length !== WORD_LENGTH) {
    return { game, message: 'Five letters, no shortcuts.', accepted: false };
  }

  if (game.guesses.includes(guess)) {
    return { game, message: 'Already tried that one.', accepted: false };
  }

  const guesses = [...game.guesses, guess];
  const won = guess === answer;
  const lost = !won && guesses.length >= MAX_GUESSES;
  const nextGame: StoredGame = {
    guesses,
    status: won ? 'won' : lost ? 'lost' : 'playing',
    completedAt: won || lost ? new Date().toISOString() : undefined
  };

  return {
    game: nextGame,
    message: won ? `Solved in ${guesses.length} ${guesses.length === 1 ? 'guess' : 'guesses'}.` : lost ? `Answer: ${answer}.` : 'Locked in.',
    accepted: true
  };
}

function getHistoryLabel(dayDate: string, todayISO: string, game?: StoredGame) {
  const word = getWordForDate(dayDate);
  const isFuture = compareDateISO(dayDate, todayISO) > 0;

  if (game?.status === 'won') {
    return { result: `${game.guesses.length}/${MAX_GUESSES}`, word };
  }

  if (game?.status === 'lost') {
    return { result: `X/${MAX_GUESSES}`, word };
  }

  if (isFuture) {
    return { result: 'Locked', word: 'Hidden' };
  }

  if (dayDate === todayISO) {
    return { result: 'In progress', word: 'Hidden' };
  }

  return { result: 'Missed', word };
}

interface WordleBoardProps {
  label: string;
  rows: Array<{ value: string; scores: LetterStatus[] }>;
}

function WordleBoard({ label, rows }: WordleBoardProps) {
  return (
    <div className="wordle-board" aria-label={label}>
      {rows.map((row, rowIndex) => (
        <div className="wordle-row" key={`row-${rowIndex}`}>
          {Array.from({ length: WORD_LENGTH }, (_, letterIndex) => {
            const status = row.scores[letterIndex];
            const letter = row.value[letterIndex] ?? '';
            return (
              <span
                className={status ? `wordle-tile ${status}` : letter ? 'wordle-tile filled' : 'wordle-tile'}
                key={`row-${rowIndex}-letter-${letterIndex}`}
              >
                {letter}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

interface WordleEntryProps {
  id: string;
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

function WordleEntry({ id, label, value, disabled, onChange, onSubmit }: WordleEntryProps) {
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form className="wordle-entry" onSubmit={handleSubmit}>
      <label htmlFor={id}>{label}</label>
      <div>
        <input
          id={id}
          inputMode="text"
          autoComplete="off"
          value={value}
          maxLength={WORD_LENGTH}
          disabled={disabled}
          onChange={(event) => onChange(normalizeGuess(event.currentTarget.value))}
        />
        <button type="submit" aria-label={`Submit ${label}`} disabled={disabled}>
          Guess
        </button>
      </div>
    </form>
  );
}

interface WordleKeyboardProps {
  label: string;
  keyboardState: Record<string, LetterStatus>;
  disabled: boolean;
  onPress: (key: string) => void;
}

function WordleKeyboard({ label, keyboardState, disabled, onPress }: WordleKeyboardProps) {
  return (
    <div className="wordle-keyboard" aria-label={label}>
      {keyboardRows.map((row) => (
        <div className="keyboard-row" key={row}>
          {row.split('').map((key) => (
            <button
              className={keyboardState[key] ? `key ${keyboardState[key]}` : 'key'}
              disabled={disabled}
              key={key}
              type="button"
              onClick={() => onPress(key)}
            >
              {key}
            </button>
          ))}
        </div>
      ))}
      <div className="keyboard-row actions">
        <button className="key wide" disabled={disabled} type="button" onClick={() => onPress('BACKSPACE')}>
          Delete
        </button>
        <button className="key wide" disabled={disabled} type="button" onClick={() => onPress('ENTER')}>
          Enter
        </button>
      </div>
    </div>
  );
}

interface GamesScreenProps {
  trip: TripData;
  referenceDate: Date;
}

export function GamesScreen({ trip, referenceDate }: GamesScreenProps) {
  const todayISO = toISODate(referenceDate);
  const tripStart = trip.days[0]?.date ?? '';
  const tripEnd = trip.days[trip.days.length - 1]?.date ?? '';
  const todayDay = trip.days.find((day) => day.date === todayISO);
  const isBeforeTrip = Boolean(tripStart && compareDateISO(todayISO, tripStart) < 0);
  const isAfterTrip = Boolean(tripEnd && compareDateISO(todayISO, tripEnd) > 0);
  const isPlayableDay = Boolean(todayDay && !isBeforeTrip && !isAfterTrip);
  const answer = getWordForDate(todayISO);
  const [storedGames, setStoredGames] = useState<StoredGames>(() => loadStoredGames());
  const [currentGuess, setCurrentGuess] = useState('');
  const [message, setMessage] = useState('');
  const currentGame = storedGames[todayISO] ?? createEmptyGame();
  const isComplete = currentGame.status === 'won' || currentGame.status === 'lost';
  const keyboardState = useMemo(() => buildKeyboardState(currentGame.guesses, answer), [answer, currentGame.guesses]);

  useEffect(() => {
    setCurrentGuess('');
    setMessage('');
  }, [todayISO]);

  function updateGame(nextGame: StoredGame) {
    const nextGames = { ...storedGames, [todayISO]: nextGame };
    setStoredGames(nextGames);
    saveStoredGames(nextGames);
  }

  function submitGuess() {
    if (!isPlayableDay || isComplete) return;

    const result = resolveGuess(currentGame, currentGuess, answer);
    if (result.accepted) {
      updateGame(result.game);
      setCurrentGuess('');
    }
    setMessage(result.message);
  }

  function pressKey(key: string) {
    if (!isPlayableDay || isComplete) return;

    if (key === 'ENTER') {
      submitGuess();
      return;
    }

    if (key === 'BACKSPACE') {
      setCurrentGuess((value) => value.slice(0, -1));
      return;
    }

    setCurrentGuess((value) => normalizeGuess(`${value}${key}`));
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!isPlayableDay || isComplete) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || target.closest('input, textarea, select, button'))) return;

      if (event.key === 'Enter') {
        event.preventDefault();
        submitGuess();
        return;
      }

      if (event.key === 'Backspace') {
        event.preventDefault();
        pressKey('BACKSPACE');
        return;
      }

      if (/^[a-z]$/i.test(event.key)) {
        setCurrentGuess((value) => normalizeGuess(`${value}${event.key}`));
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const rows = buildRows(currentGame, currentGuess, answer);

  return (
    <section className="games-screen panel-shell active-screen">
      <div className="game-hero-card">
        <p className="section-kicker">Daily games</p>
        <h2>Honeymoon Wordle</h2>
        <p>
          A fresh five-letter word unlocks each trip day. Results stay on this device so you can keep a tiny victory log together.
        </p>
      </div>

      <div className="game-card">
        {isBeforeTrip ? (
          <div className="game-locked-state">
            <span>Locked until wheels up</span>
            <h3>Games unlock {formatLongDate(tripStart)}</h3>
            <p>The first word appears when the trip begins. No peeking, future honeymooners.</p>
          </div>
        ) : isAfterTrip ? (
          <div className="game-locked-state">
            <span>Trip complete</span>
            <h3>The daily board is closed</h3>
            <p>Your history stays below as the little word trail of the trip.</p>
          </div>
        ) : (
          <>
            <div className="game-day-row">
              <div>
                <span>{todayDay ? formatLongDate(todayDay.date) : 'Today'}</span>
                <strong>{todayDay?.title ?? 'Trip Wordle'}</strong>
              </div>
              <p>{isComplete ? currentGame.status === 'won' ? `${currentGame.guesses.length}/${MAX_GUESSES}` : `X/${MAX_GUESSES}` : `${currentGame.guesses.length}/${MAX_GUESSES} guesses`}</p>
            </div>

            <WordleBoard label="Daily Wordle guesses" rows={rows} />
            <WordleEntry
              id="daily-wordle-guess"
              label="Daily guess"
              value={currentGuess}
              disabled={isComplete}
              onChange={setCurrentGuess}
              onSubmit={submitGuess}
            />
            <WordleKeyboard
              label="Daily keyboard"
              keyboardState={keyboardState}
              disabled={isComplete}
              onPress={pressKey}
            />

            {message ? <p className="game-message" role="status">{message}</p> : null}
          </>
        )}
      </div>

      <div className="game-history-card">
        <div className="history-heading">
          <p className="section-kicker">History</p>
          <span>{trip.days.length} daily words</span>
        </div>
        <div className="history-list">
          {trip.days.map((day) => {
            const history = getHistoryLabel(day.date, todayISO, storedGames[day.date]);
            return (
              <div className="history-row" key={day.date}>
                <div>
                  <span>{formatLongDate(day.date)}</span>
                  <strong>{history.word}</strong>
                </div>
                <p>{history.result}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

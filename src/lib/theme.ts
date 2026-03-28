import type { ThemeBand, ThemeId, TripData } from '../types/trip';
import { differenceInDays, isDateWithin, parseISODate } from './date';
import pretripBg from '../../assets/images/pretrip-bg.jpg';
import mykonosBg from '../../assets/images/mykonos-bg.jpg';
import marrakechBg from '../../assets/images/marrakech-bg.jpg';
import posttripBg from '../../assets/images/posttrip-bg.jpg';

export interface ThemeVisual {
  image: string;
  position: string;
  accent: string;
  text: string;
  overlay: string;
  surface: string;
  tabTint: string;
  pageTone: string;
}

export const themeVisuals: Record<ThemeId, ThemeVisual> = {
  pretrip: {
    image: pretripBg,
    position: 'center center',
    accent: '#79955d',
    text: '#f8f4ec',
    overlay: 'linear-gradient(180deg, rgba(38, 49, 26, 0.18), rgba(34, 47, 27, 0.62) 54%, rgba(21, 25, 17, 0.82))',
    surface: 'rgba(247, 243, 233, 0.88)',
    tabTint: '#60794b',
    pageTone: '#e6e2d4'
  },
  mykonos: {
    image: mykonosBg,
    position: 'center center',
    accent: '#0f6db3',
    text: '#ffffff',
    overlay: 'linear-gradient(180deg, rgba(15, 78, 122, 0.18), rgba(10, 51, 90, 0.56) 52%, rgba(7, 26, 47, 0.82))',
    surface: 'rgba(248, 245, 240, 0.9)',
    tabTint: '#0f6db3',
    pageTone: '#e9f1f4'
  },
  marrakech: {
    image: marrakechBg,
    position: 'center center',
    accent: '#a5582e',
    text: '#fff8f0',
    overlay: 'linear-gradient(180deg, rgba(72, 31, 10, 0.18), rgba(86, 37, 12, 0.62) 50%, rgba(33, 15, 8, 0.86))',
    surface: 'rgba(245, 238, 229, 0.9)',
    tabTint: '#9a5127',
    pageTone: '#efe1d3'
  },
  posttrip: {
    image: posttripBg,
    position: 'center center',
    accent: '#7c4b38',
    text: '#fff8f0',
    overlay: 'linear-gradient(180deg, rgba(18, 22, 35, 0.22), rgba(41, 31, 31, 0.66) 55%, rgba(18, 19, 25, 0.88))',
    surface: 'rgba(245, 240, 233, 0.9)',
    tabTint: '#69453a',
    pageTone: '#e9e0d9'
  }
};

export function getThemeBandForDate(themeBands: ThemeBand[], date: Date): ThemeBand {
  const exact = themeBands.find((band) => isDateWithin(date, band.startDate, band.endDate));
  if (exact) return exact;

  const sorted = themeBands.slice().sort((a, b) => {
    const aTime = a.startDate ? parseISODate(a.startDate).getTime() : Number.NEGATIVE_INFINITY;
    const bTime = b.startDate ? parseISODate(b.startDate).getTime() : Number.NEGATIVE_INFINITY;
    return aTime - bTime;
  });

  const today = date.getTime();
  const firstFuture = sorted.find((band) => band.startDate && parseISODate(band.startDate).getTime() > today);
  if (firstFuture) return sorted[0];

  return sorted[sorted.length - 1];
}

export interface HomeDisplay {
  mode: 'countdown' | 'welcome';
  eyebrow: string;
  primary: string;
  secondary: string;
  theme: ThemeId;
}

export function buildHomeDisplay(trip: TripData, date: Date): HomeDisplay {
  const band = getThemeBandForDate(trip.themeBands, date);

  if (band.homeMode === 'countdown') {
    const nextStart = trip.themeBands
      .map((item) => item.startDate)
      .filter((value): value is string => Boolean(value))
      .sort()[0];
    const days = nextStart ? Math.max(0, differenceInDays(date, parseISODate(nextStart))) : 0;

    return {
      mode: 'countdown',
      eyebrow: band.headline,
      primary: String(days),
      secondary: days === 1 ? 'day until wheels up' : 'days until wheels up',
      theme: band.assetKey
    };
  }

  return {
    mode: 'welcome',
    eyebrow: band.accentLabel,
    primary: band.headline,
    secondary: trip.tripDateRange,
    theme: band.assetKey
  };
}

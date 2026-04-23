import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BottomTabs } from './BottomTabs';

describe('BottomTabs', () => {
  afterEach(() => {
    cleanup();
    document.documentElement.style.removeProperty('--tabbar-height');
    document.documentElement.style.removeProperty('--tabbar-total-height');
    vi.restoreAllMocks();
  });

  it('keeps tab sizing CSS-driven and does not mutate root height variables after render', () => {
    render(<BottomTabs activeTab="home" onChange={vi.fn()} />);

    expect(document.documentElement.style.getPropertyValue('--tabbar-height')).toBe('');
    expect(document.documentElement.style.getPropertyValue('--tabbar-total-height')).toBe('');
  });

  it('marks the active tab as the current page without changing button semantics', () => {
    render(<BottomTabs activeTab="itinerary" onChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Itinerary' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Home' })).not.toHaveAttribute('aria-current');
  });
});

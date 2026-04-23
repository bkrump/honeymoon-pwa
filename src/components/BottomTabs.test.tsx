import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
    expect(screen.getByRole('button', { name: 'Itinerary' })).toHaveAttribute('type', 'button');
    expect(screen.getByRole('button', { name: 'Home' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('button', { name: 'Home' })).toHaveAttribute('type', 'button');
  });

  it('anchors the tab shell with explicit fixed geometry instead of content-measured height', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/styles/global.css'), 'utf8');
    const block = css.match(/\.bottom-tabs\s*{(?<body>[^}]+)}/)?.groups?.body ?? '';

    expect(block).toContain('position: fixed');
    expect(block).toContain('inset: auto 0 0 0');
    expect(block).toContain('height: var(--tabbar-total-height)');
    expect(block).toContain('contain: layout paint style');
    expect(block).not.toContain('min-height: var(--tabbar-total-height)');
  });
});

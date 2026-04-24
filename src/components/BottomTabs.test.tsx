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
    document.documentElement.style.removeProperty('--tabbar-visual-height');
    document.documentElement.style.removeProperty('--tabbar-reserve-height');
    vi.restoreAllMocks();
  });

  it('keeps tab sizing CSS-driven and does not mutate root height variables after render', () => {
    render(<BottomTabs activeTab="home" onChange={vi.fn()} />);

    expect(document.documentElement.style.getPropertyValue('--tabbar-height')).toBe('');
    expect(document.documentElement.style.getPropertyValue('--tabbar-total-height')).toBe('');
    expect(document.documentElement.style.getPropertyValue('--tabbar-visual-height')).toBe('');
    expect(document.documentElement.style.getPropertyValue('--tabbar-reserve-height')).toBe('');
  });

  it('marks the active tab as the current page without changing button semantics', () => {
    render(<BottomTabs activeTab="itinerary" onChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Itinerary' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Itinerary' })).toHaveAttribute('type', 'button');
    expect(screen.getByRole('button', { name: 'Home' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('button', { name: 'Home' })).toHaveAttribute('type', 'button');
  });

  it('keeps the painted tab shell compact and separates safe-area reserve from visual height', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/styles/global.css'), 'utf8');
    const block = css.match(/\.bottom-tabs\s*{(?<body>[^}]+)}/)?.groups?.body ?? '';
    const paddingLine = block.match(/padding:\s*(?<value>[^;]+);/)?.groups?.value ?? '';

    expect(css).toContain('--tabbar-visual-height:');
    expect(css).toContain('--tabbar-reserve-height: calc(var(--tabbar-visual-height) + var(--safe-bottom)');
    expect(css).toContain('padding: 1rem 1.25rem calc(var(--tabbar-reserve-height) + 1.25rem)');
    expect(block).toContain('position: fixed');
    expect(block).toContain('inset: auto 0 var(--safe-bottom) 0');
    expect(block).toContain('height: var(--tabbar-visual-height)');
    expect(block).toContain('contain: layout paint style');
    expect(paddingLine).not.toContain('safe-bottom');
    expect(block).not.toContain('height: var(--tabbar-total-height)');
    expect(block).not.toContain('min-height: var(--tabbar-total-height)');
  });
});

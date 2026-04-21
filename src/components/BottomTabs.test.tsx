import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BottomTabs } from './BottomTabs';

type ResizeObserverCallback = ConstructorParameters<typeof ResizeObserver>[0];

class ResizeObserverMock {
  callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe() {}

  disconnect() {}
}

describe('BottomTabs', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
  });

  afterEach(() => {
    cleanup();
    document.documentElement.style.removeProperty('--tabbar-height');
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('syncs the shared tabbar height variable from the rendered nav', () => {
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) {
      return this.getAttribute('aria-label') === 'Primary' ? 92 : 0;
    });

    render(<BottomTabs activeTab="home" onChange={vi.fn()} />);

    expect(document.documentElement.style.getPropertyValue('--tabbar-height')).toBe('92px');
  });
});

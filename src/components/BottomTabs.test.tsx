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
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.getAttribute('aria-label') === 'Primary') {
        return {
          x: 0,
          y: 0,
          width: 390,
          height: 92,
          top: 0,
          right: 390,
          bottom: 92,
          left: 0,
          toJSON() {
            return {};
          }
        } as DOMRect;
      }

      return {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        toJSON() {
          return {};
        }
      } as DOMRect;
    });

    render(<BottomTabs activeTab="home" onChange={vi.fn()} />);

    expect(document.documentElement.style.getPropertyValue('--tabbar-height')).toBe('92px');
  });
});

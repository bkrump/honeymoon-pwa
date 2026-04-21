import { useLayoutEffect, useRef } from 'react';
import type { AppTab } from '../types/trip';

interface BottomTabsProps {
  activeTab: AppTab;
  onChange: (tab: AppTab) => void;
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 9.5V20h13V9.5" />
      <path d="M9.5 20v-5h5v5" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4.5" width="18" height="16" rx="3" />
      <path d="M8 3v3M16 3v3M3 9.5h18" />
    </svg>
  );
}

export function BottomTabs({ activeTab, onChange }: BottomTabsProps) {
  const navRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const rootStyle = document.documentElement.style;
    const syncHeight = () => {
      rootStyle.setProperty('--tabbar-height', `${Math.ceil(nav.getBoundingClientRect().height)}px`);
    };

    syncHeight();

    window.addEventListener('resize', syncHeight);
    window.visualViewport?.addEventListener('resize', syncHeight);

    if (typeof ResizeObserver === 'undefined') {
      return () => {
        window.removeEventListener('resize', syncHeight);
        window.visualViewport?.removeEventListener('resize', syncHeight);
      };
    }

    const resizeObserver = new ResizeObserver(syncHeight);
    resizeObserver.observe(nav);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', syncHeight);
      window.visualViewport?.removeEventListener('resize', syncHeight);
    };
  }, []);

  return (
    <nav ref={navRef} className="bottom-tabs" aria-label="Primary">
      <button className={activeTab === 'home' ? 'tab-item active' : 'tab-item'} onClick={() => onChange('home')} aria-selected={activeTab === 'home'}>
        <HomeIcon />
        <span>Home</span>
      </button>
      <button className={activeTab === 'itinerary' ? 'tab-item active' : 'tab-item'} onClick={() => onChange('itinerary')} aria-selected={activeTab === 'itinerary'}>
        <CalendarIcon />
        <span>Itinerary</span>
      </button>
    </nav>
  );
}

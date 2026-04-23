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
  return (
    <nav className="bottom-tabs" aria-label="Primary">
      <button
        className={activeTab === 'home' ? 'tab-item active' : 'tab-item'}
        onClick={() => onChange('home')}
        aria-current={activeTab === 'home' ? 'page' : undefined}
      >
        <HomeIcon />
        <span>Home</span>
      </button>
      <button
        className={activeTab === 'itinerary' ? 'tab-item active' : 'tab-item'}
        onClick={() => onChange('itinerary')}
        aria-current={activeTab === 'itinerary' ? 'page' : undefined}
      >
        <CalendarIcon />
        <span>Itinerary</span>
      </button>
    </nav>
  );
}

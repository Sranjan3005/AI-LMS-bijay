import React from 'react';
import { Ico } from './icons';

// MobileTabBar — the app-style bottom navigation shown only on phones/small
// screens (≤900px, exactly where the top nav links are hidden). Keeps the five
// primary destinations in the thumb zone so the app stops feeling like a
// scrolled web page. Desktop is unaffected (CSS hides this entirely).
//
// Tabs map to existing views; Today/Path are two focused modes of the dashboard.
const TABS = [
  { key: 'today',  label: 'Today',  icon: 'spark' },
  { key: 'path',   label: 'Path',   icon: 'trend' },
  { key: 'tasks',  label: 'Tasks',  icon: 'check' },
  { key: 'parent', label: 'Parent', icon: 'users' },
  { key: 'you',    label: 'You',    icon: 'user' },
];

export default function MobileTabBar({ active, onSelect }) {
  return (
    <nav className="mtabbar" role="navigation" aria-label="Primary">
      {TABS.map((t) => (
        <button
          key={t.key}
          className={`mtab${active === t.key ? ' is-active' : ''}`}
          aria-current={active === t.key ? 'page' : undefined}
          onClick={() => onSelect(t.key)}
        >
          <span className="mtab-ic"><Ico name={t.icon} w={2} /></span>
          <span className="mtab-lbl">{t.label}</span>
        </button>
      ))}
    </nav>
  );
}

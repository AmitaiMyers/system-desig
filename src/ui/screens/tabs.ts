import type { Tab } from '../primitives/Screen';

export type HomeTab = 'map' | 'learn' | 'codex';

/** The three top-level places of the app. */
export const HOME_TABS: Tab<HomeTab>[] = [
  { id: 'map', label: 'Map', icon: 'map' },
  { id: 'learn', label: 'Learn', icon: 'bulb' },
  { id: 'codex', label: 'Codex', icon: 'book' },
];

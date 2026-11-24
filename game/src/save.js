// Palmera Bay — saving to the browser's local storage: cash, mission
// progress and the best wanted level. Never a network call, never a file.

import { SAVE_KEY } from './config.js';

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return null;
    return {
      cash: typeof data.cash === 'number' ? data.cash : 0,
      missionIndex: typeof data.missionIndex === 'number' ? data.missionIndex : 0,
      bestWanted: typeof data.bestWanted === 'number' ? data.bestWanted : 0,
    };
  } catch {
    return null;
  }
}

export function saveGame(state) {
  try {
    window.localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({
        cash: Math.floor(state.cash),
        missionIndex: state.missionIndex,
        bestWanted: state.bestWanted,
      }),
    );
  } catch {
    // Storage full or unavailable: the game plays on without saving.
  }
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // Nothing to clear.
  }
}

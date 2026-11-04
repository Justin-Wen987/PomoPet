// ========== storage.js ==========
// Handles saving and loading game state to/from localStorage

import { DEFAULT_STATE } from './constants.js';

// Key used to store game data in localStorage
const STORAGE_KEY = 'pomopet_data';

// Load state from localStorage, fallback to default state if none exists or data is corrupted
export function loadState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            // Ensure every task object has a 'completed' field (migration for older saves)
            if (parsed.tasks && Array.isArray(parsed.tasks)) {
                parsed.tasks = parsed.tasks.map(t => ({ ...t, completed: t.completed || false }));
            }
            return parsed;
        } catch(e) {
            return structuredClone(DEFAULT_STATE);
        }
    }
    return structuredClone(DEFAULT_STATE);
}

// Save current game state to localStorage
export function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
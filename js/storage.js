// ========== storage.js ==========
// Handles saving/loading game state to localStorage

import { DEFAULT_STATE } from './constants.js';

const STORAGE_KEY = 'pomopet_data';

// Load state from localStorage, fallback to default
export function loadState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            // Ensure tasks have 'completed' field
            if (parsed.tasks && Array.isArray(parsed.tasks)) {
                parsed.tasks = parsed.tasks.map(t => ({ ...t, completed: t.completed || false }));
            }
            return parsed;
        } catch(e) {
            return { ...DEFAULT_STATE };
        }
    }
    return { ...DEFAULT_STATE };
}

// Save current state to localStorage
export function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
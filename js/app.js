// ========== app.js ==========
// Main application logic: timer, tasks, gacha, recycling, settings

// Import constants and modules
import { DEFAULT_STATE, PET_TYPES, RARITY_WEIGHTS, RARITY_COINS, PATHS } from './constants.js';
import { loadState, saveState } from './storage.js';
import {
    playGachaSpin, playResultSound, playClockAlarm,
    loadBgmPreference, bindGlobalInteraction, toggleBgmMute, getBgmMuted,
    setBackgroundMusic
} from './audio.js';
import {
    elements, buildClock, updateFlipClock, updateProgressBar, updateUI,
    renderTasks, renderCollection, renderDuplicateList, updateSelectedRewardPreview,
    showRewardPopup, createSlotMachine, showSettingsModal
} from './ui.js';

// ---------- Game state ----------
let state = loadState();               // Load saved data or default state
let timerInterval = null;             // Timer interval ID
let timerMode = 'work';               // Current timer mode: 'work' or 'break'
let timeLeft = state.workDuration;    // Seconds remaining in current session
let isTimerRunning = false;           // Whether timer is actively ticking
let currentFilter = 'all';            // Current rarity filter for collection gallery
let workClockTriggered = false;       // Prevents alarm spam for work session
let breakClockTriggered = false;      // Prevents alarm spam for break session

// Generate unique ID for tasks and pets
function generateId() {
    return Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

// Reset alarm flags when switching timer mode
function resetAlarmFlags() {
    workClockTriggered = false;
    breakClockTriggered = false;
}

// Timer tick: decrement time, play alarm at 6 seconds remaining, switch sessions
function timerTick() {
    if (timeLeft <= 0) return;
    const previousTime = timeLeft;
    timeLeft--;
    // Trigger alarm exactly when crossing the 6-second threshold (once per session)
    if (previousTime > 6 && timeLeft <= 6) {
        if (timerMode === 'work' && !workClockTriggered) {
            workClockTriggered = true;
            playClockAlarm();
        } else if (timerMode === 'break' && !breakClockTriggered) {
            breakClockTriggered = true;
            playClockAlarm();
        }
    }
    // Update UI
    updateFlipClock(timeLeft);
    updateProgressBar(timeLeft, timerMode, state.workDuration, state.breakDuration);
    // Handle session completion
    if (timeLeft === 0) {
        if (timerMode === 'work') {
            // Switch to break session
            timerMode = 'break';
            timeLeft = state.breakDuration;
            resetAlarmFlags();
            updateFlipClock(timeLeft);
            updateProgressBar(timeLeft, timerMode, state.workDuration, state.breakDuration);
        } else if (timerMode === 'break') {
            // Complete a full pomodoro cycle: reward token, show popup, reset timer
            state.tokens++;
            saveState(state);
            updateUI(state, currentFilter);
            showRewardPopup();
            stopTimer();
            timerMode = 'work';
            timeLeft = state.workDuration;
            resetAlarmFlags();
            updateFlipClock(timeLeft);
            updateProgressBar(timeLeft, timerMode, state.workDuration, state.breakDuration);
        }
    }
}

// Start the timer if not already running
function startTimer() {
    if (isTimerRunning) return;
    // Initialize timer if it was at zero
    if (timeLeft === 0 && timerMode === 'work') {
        timeLeft = state.workDuration;
        resetAlarmFlags();
        updateFlipClock(timeLeft);
        updateProgressBar(timeLeft, timerMode, state.workDuration, state.breakDuration);
    }
    if (timeLeft === 0 && timerMode === 'break') {
        timeLeft = state.breakDuration;
        resetAlarmFlags();
        updateFlipClock(timeLeft);
        updateProgressBar(timeLeft, timerMode, state.workDuration, state.breakDuration);
    }
    isTimerRunning = true;
    timerInterval = setInterval(timerTick, 1000);
}

// Stop the timer and clear interval
function stopTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
    isTimerRunning = false;
}

// Reset timer to work session with original duration
function resetTimer() {
    stopTimer();
    timerMode = 'work';
    timeLeft = state.workDuration;
    resetAlarmFlags();
    updateFlipClock(timeLeft);
    updateProgressBar(timeLeft, timerMode, state.workDuration, state.breakDuration);
}

// Apply new work/break durations from settings inputs
function applyTimerSettings() {
    const workMin = parseInt(elements.workMinInput.value, 10);
    const breakMin = parseInt(elements.breakMinInput.value, 10);
    if (isNaN(workMin) || workMin < 1) return;
    if (isNaN(breakMin) || breakMin < 1) return;
    state.workDuration = workMin * 60;
    state.breakDuration = breakMin * 60;
    saveState(state);
    if (isTimerRunning) stopTimer();
    if (timerMode === 'work') timeLeft = state.workDuration;
    else timeLeft = state.breakDuration;
    resetAlarmFlags();
    updateFlipClock(timeLeft);
    updateProgressBar(timeLeft, timerMode, state.workDuration, state.breakDuration);
}

// ---------- Task management ----------
// Add a new task from input field
function addTask() {
    const text = elements.taskInput.value.trim();
    if (!text) return;
    state.tasks.push({ id: generateId(), text, completed: false });
    saveState(state);
    elements.taskInput.value = '';
    renderTasks(state.tasks);
}

// Toggle task completion status and award token if newly completed
function toggleTask(id) {
    const task = state.tasks.find(t => t.id === id);
    if (task) {
        const was = task.completed;
        task.completed = !task.completed;
        if (!was && task.completed) {
            state.tokens++;
            saveState(state);
            updateUI(state, currentFilter);
            showRewardPopup();   // Reward popup for task completion
        } else {
            saveState(state);
            updateUI(state, currentFilter);
        }
    }
}

// Delete a task by id
function deleteTask(id) {
    state.tasks = state.tasks.filter(t => t.id !== id);
    saveState(state);
    renderTasks(state.tasks);
}

// ---------- Collection & Filter ----------
// Set current rarity filter and re-render collection
function setFilter(filter) {
    currentFilter = filter;
    renderCollection(state.pets, currentFilter);
}

// ---------- Duplicate recycling ----------
// Select all duplicate checkboxes
function selectAllDuplicates() {
    const checkboxes = document.querySelectorAll('.dupe-checkbox');
    checkboxes.forEach(cb => cb.checked = true);
    updateSelectedRewardPreview(state.pets);
}

// Deselect all duplicate checkboxes
function deselectAllDuplicates() {
    const checkboxes = document.querySelectorAll('.dupe-checkbox');
    checkboxes.forEach(cb => cb.checked = false);
    updateSelectedRewardPreview(state.pets);
}

// Recycle selected duplicate pets: remove them and add coins
function recycleSelected() {
    const checkboxes = document.querySelectorAll('.dupe-checkbox:checked');
    if (checkboxes.length === 0) {
        alert("Please select at least one duplicate pet to recycle.");
        return;
    }
    let totalCoins = 0;
    const idsToRemove = [];
    checkboxes.forEach(cb => {
        const petId = cb.value;
        const pet = state.pets.find(p => p.id === petId);
        if (pet) {
            totalCoins += RARITY_COINS[pet.rarity];
            idsToRemove.push(petId);
        }
    });
    state.pets = state.pets.filter(p => !idsToRemove.includes(p.id));
    state.coins += totalCoins;
    saveState(state);
    updateUI(state, currentFilter);
    alert(`Recycled ${idsToRemove.length} pet(s) and earned ${totalCoins} coins!`);
}

// Exchange 100 coins for 1 token
function buyToken() {
    if (state.coins >= 100) {
        state.coins -= 100;
        state.tokens++;
        saveState(state);
        updateUI(state, currentFilter);
    } else {
        alert("Not enough coins! Need 100 coins for 1 token.");
    }
}

// ---------- Gacha ----------
// Draw a random pet using slot machine animation
function drawPetWithSmoothSlot() {
    if (state.tokens < 1) return;
    playGachaSpin();
    elements.drawBtn.disabled = true;
    state.tokens--;
    // Determine rarity based on weights
    const rand = Math.random() * 100;
    let selectedRarity;
    if (rand < RARITY_WEIGHTS.common) selectedRarity = 'common';
    else if (rand < RARITY_WEIGHTS.common + RARITY_WEIGHTS.uncommon) selectedRarity = 'uncommon';
    else selectedRarity = 'rare';
    const candidates = PET_TYPES.filter(p => p.rarity === selectedRarity);
    const randomIndex = Math.floor(Math.random() * candidates.length);
    const type = candidates[randomIndex];
    const alreadyOwned = state.pets.some(p => p.typeId === type.typeId);
    const newPet = {
        id: generateId(),
        typeId: type.typeId,
        name: type.name,
        rarity: type.rarity,
        image: type.image,
        isDuplicate: alreadyOwned
    };
    state.pets.push(newPet);
    saveState(state);
    const targetIndex = PET_TYPES.findIndex(p => p.typeId === type.typeId);
    createSlotMachine(targetIndex, newPet.rarity, () => {
        updateUI(state, currentFilter);
        elements.drawResult.innerHTML = '';
    });
}

// ---------- Import/Export event handlers ----------
// Handle imported save data from settings modal
function handleImportSave(imported) {
    state = imported;
    saveState(state);
    stopTimer();
    timerMode = 'work';
    timeLeft = state.workDuration;
    resetAlarmFlags();
    buildClock(timeLeft);
    updateFlipClock(timeLeft);
    updateProgressBar(timeLeft, timerMode, state.workDuration, state.breakDuration);
    updateUI(state, currentFilter);
}

// Handle clear all data request from settings modal
function handleClearData() {
    localStorage.removeItem('pomopet_data');
    state = { ...DEFAULT_STATE };
    saveState(state);
    stopTimer();
    timerMode = 'work';
    timeLeft = state.workDuration;
    resetAlarmFlags();
    buildClock(timeLeft);
    updateFlipClock(timeLeft);
    updateProgressBar(timeLeft, timerMode, state.workDuration, state.breakDuration);
    updateUI(state, currentFilter);
}

// ---------- Event listeners for DOM elements ----------
elements.timerStart.addEventListener('click', startTimer);
elements.timerPause.addEventListener('click', stopTimer);
elements.timerReset.addEventListener('click', resetTimer);
elements.applySettingsBtn.addEventListener('click', applyTimerSettings);
elements.addTaskBtn.addEventListener('click', addTask);
elements.taskInput.addEventListener('keypress', e => { if (e.key === 'Enter') addTask(); });
elements.filterButtons.forEach(btn => {
    btn.addEventListener('click', () => setFilter(btn.dataset.filter));
});
elements.selectAllBtn.addEventListener('click', selectAllDuplicates);
elements.deselectAllBtn.addEventListener('click', deselectAllDuplicates);
elements.recycleSelectedBtn.addEventListener('click', recycleSelected);
elements.buyTokenBtn.addEventListener('click', buyToken);
elements.drawBtn.addEventListener('click', drawPetWithSmoothSlot);
elements.openSettingsBtn.addEventListener('click', showSettingsModal);

// Sound toggle: update mute state and icon
elements.soundToggle.addEventListener('click', () => {
    const newMuted = toggleBgmMute();
    const soundIconUnmuted = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect x="4" y="12" width="8" height="8" fill="#8E8E8E" stroke="#000" stroke-width="1"/>
        <polygon points="12,12 20,6 20,26 12,20" fill="#B0B0B0" stroke="#000" stroke-width="1"/>
        <path d="M22 12 C24 14, 24 18, 22 20" stroke="#4FC3F7" stroke-width="2" fill="none"/>
        <path d="M24 10 C27 13, 27 19, 24 22" stroke="#4FC3F7" stroke-width="2" fill="none"/>
    </svg>`;
    const soundIconMuted = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect x="4" y="12" width="8" height="8" fill="#8E8E8E" stroke="#000" stroke-width="1"/>
        <polygon points="12,12 20,6 20,26 12,20" fill="#B0B0B0" stroke="#000" stroke-width="1"/>
        <line x1="6" y1="6" x2="26" y2="26" stroke="#FF4D4F" stroke-width="3"/>
    </svg>`;
    elements.soundToggle.innerHTML = newMuted ? soundIconMuted : soundIconUnmuted;
});

// Custom events for task operations
document.addEventListener('toggle-task', (e) => toggleTask(e.detail.id));
document.addEventListener('delete-task', (e) => deleteTask(e.detail.id));
document.addEventListener('import-save', (e) => handleImportSave(e.detail));
document.addEventListener('clear-data', handleClearData);

// ---------- Initialization ----------
// Load background music preferences and bind interaction
loadBgmPreference();
bindGlobalInteraction();

// Set timer input fields from saved state
elements.workMinInput.value = Math.floor(state.workDuration / 60);
elements.breakMinInput.value = Math.floor(state.breakDuration / 60);
timeLeft = state.workDuration;
timerMode = 'work';
resetAlarmFlags();

// Build and update UI components
buildClock(timeLeft);
updateFlipClock(timeLeft);
updateProgressBar(timeLeft, timerMode, state.workDuration, state.breakDuration);
updateUI(state, currentFilter);

// Set initial sound icon based on saved mute state
const soundIconUnmuted = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
    <rect x="4" y="12" width="8" height="8" fill="#8E8E8E" stroke="#000" stroke-width="1"/>
    <polygon points="12,12 20,6 20,26 12,20" fill="#B0B0B0" stroke="#000" stroke-width="1"/>
    <path d="M22 12 C24 14, 24 18, 22 20" stroke="#4FC3F7" stroke-width="2" fill="none"/>
    <path d="M24 10 C27 13, 27 19, 24 22" stroke="#4FC3F7" stroke-width="2" fill="none"/>
</svg>`;
const soundIconMuted = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
    <rect x="4" y="12" width="8" height="8" fill="#8E8E8E" stroke="#000" stroke-width="1"/>
    <polygon points="12,12 20,6 20,26 12,20" fill="#B0B0B0" stroke="#000" stroke-width="1"/>
    <line x1="6" y1="6" x2="26" y2="26" stroke="#FF4D4F" stroke-width="3"/>
</svg>`;
elements.soundToggle.innerHTML = getBgmMuted() ? soundIconMuted : soundIconUnmuted;
// ========== app.js ==========
// Main application logic: timer, tasks, gacha, recycling, settings

import { DEFAULT_STATE, PET_TYPES, RARITY_WEIGHTS, RARITY_COINS } from './constants.js';
import { loadState, saveState } from './storage.js';
import {
    playGachaSpin, playResultSound, playClockAlarm,
    loadBgmPreference, bindGlobalInteraction, toggleBgmMute, getBgmMuted,
    setBackgroundMusic
} from './audio.js';
import {
    elements, buildClock, updateFlipClock, updateProgressBar, updateUI,
    renderTasks, renderCollection, renderDuplicateList, updateSelectedRewardPreview,
    showRewardPopup, createSlotMachine
} from './ui.js';

// ---------- Global state ----------
let state = loadState();
let timerInterval = null;
let timerMode = 'work';           // 'work' or 'break'
let timeLeft = state.workDuration;
let isTimerRunning = false;
let currentFilter = 'all';
let workClockTriggered = false;   // prevent alarm spam
let breakClockTriggered = false;

// Generate unique ID for pets/tasks
function generateId() {
    return Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

// ---------- Timer logic ----------
function resetAlarmFlags() {
    workClockTriggered = false;
    breakClockTriggered = false;
}

// Timer tick: decrement time, play alarm at 6s left, switch sessions
function timerTick() {
    if (timeLeft <= 0) return;
    const previousTime = timeLeft;
    timeLeft--;
    // Alarm at exactly 6 seconds remaining (once per session)
    if (previousTime > 6 && timeLeft <= 6) {
        if (timerMode === 'work' && !workClockTriggered) {
            workClockTriggered = true;
            playClockAlarm();
        } else if (timerMode === 'break' && !breakClockTriggered) {
            breakClockTriggered = true;
            playClockAlarm();
        }
    }
    updateFlipClock(timeLeft);
    updateProgressBar(timeLeft, timerMode, state.workDuration, state.breakDuration);
    if (timeLeft === 0) {
        if (timerMode === 'work') {
            // Switch to break
            timerMode = 'break';
            timeLeft = state.breakDuration;
            resetAlarmFlags();
            updateFlipClock(timeLeft);
            updateProgressBar(timeLeft, timerMode, state.workDuration, state.breakDuration);
        } else if (timerMode === 'break') {
            // Complete a full pomodoro cycle
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

function startTimer() {
    if (isTimerRunning) return;
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

function stopTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
    isTimerRunning = false;
}

function resetTimer() {
    stopTimer();
    timerMode = 'work';
    timeLeft = state.workDuration;
    resetAlarmFlags();
    updateFlipClock(timeLeft);
    updateProgressBar(timeLeft, timerMode, state.workDuration, state.breakDuration);
}

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
function addTask() {
    const text = elements.taskInput.value.trim();
    if (!text) return;
    state.tasks.push({ id: generateId(), text, completed: false });
    saveState(state);
    elements.taskInput.value = '';
    renderTasks(state.tasks);
}

function toggleTask(id) {
    const task = state.tasks.find(t => t.id === id);
    if (task) {
        const was = task.completed;
        task.completed = !task.completed;
        if (!was && task.completed) {
            state.tokens++;
            saveState(state);
            updateUI(state, currentFilter);
            showRewardPopup();
        } else {
            saveState(state);
            updateUI(state, currentFilter);
        }
    }
}

function deleteTask(id) {
    state.tasks = state.tasks.filter(t => t.id !== id);
    saveState(state);
    renderTasks(state.tasks);
}

// ---------- Collection & Filter ----------
function setFilter(filter) {
    currentFilter = filter;
    renderCollection(state.pets, currentFilter);
}

// ---------- Duplicate recycling ----------
function selectAllDuplicates() {
    const checkboxes = document.querySelectorAll('.dupe-checkbox');
    checkboxes.forEach(cb => cb.checked = true);
    updateSelectedRewardPreview(state.pets);
}

function deselectAllDuplicates() {
    const checkboxes = document.querySelectorAll('.dupe-checkbox');
    checkboxes.forEach(cb => cb.checked = false);
    updateSelectedRewardPreview(state.pets);
}

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
function drawPetWithSmoothSlot() {
    if (state.tokens < 1) return;
    playGachaSpin();
    elements.drawBtn.disabled = true;
    state.tokens--;
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

// ---------- Settings Modal ----------
function showSettingsModal() {
    const modal = document.createElement('div');
    modal.className = 'settings-modal';
    modal.innerHTML = `
        <div class="settings-panel">
            <h2>⚙️ Settings</h2>
            <div class="setting-group" style="flex-direction: column; align-items: stretch;">
                <label>🎵 Background Music</label>
                <select id="bgm-select" class="bgm-select">
                    ${PATHS.bgmList.map((track, idx) => `<option value="${idx}" ${idx === currentBgmIndex ? 'selected' : ''}>${track.name}</option>`).join('')}
                </select>
            </div>
            <div class="setting-group"><label>💾 Export Save</label><button id="export-save">Export</button></div>
            <div class="setting-group"><label>📂 Import Save</label><div class="custom-file-input"><button id="import-trigger">Choose File</button><span id="import-filename" class="file-name" style="display: none;"></span><input type="file" id="import-file-hidden" accept=".json" style="display: none;"></div></div>
            <div class="setting-group"><label>⚠️ Danger Zone</label><button id="confirm-clear">Clear All Data</button></div>
            <button id="close-settings" class="close-settings">Close</button>
        </div>`;
    document.body.appendChild(modal);
    const bgmSelect = modal.querySelector('#bgm-select');
    const exportBtn = modal.querySelector('#export-save');
    const importTrigger = modal.querySelector('#import-trigger');
    const importFileHidden = modal.querySelector('#import-file-hidden');
    const fileNameSpan = modal.querySelector('#import-filename');
    const confirmClearBtn = modal.querySelector('#confirm-clear');
    const closeBtn = modal.querySelector('#close-settings');

    function closeModal() { modal.remove(); }

    bgmSelect.addEventListener('change', (e) => {
        const idx = parseInt(e.target.value, 10);
        setBackgroundMusic(idx);
    });
    exportBtn.addEventListener('click', () => {
        const saveData = JSON.stringify(state, null, 2);
        const blob = new Blob([saveData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pomopet_save_${new Date().toISOString().slice(0,19)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
    importTrigger.addEventListener('click', () => importFileHidden.click());
    importFileHidden.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            fileNameSpan.textContent = file.name;
            fileNameSpan.style.display = 'inline-block';
            const reader = new FileReader();
            reader.onload = function(ev) {
                try {
                    const imported = JSON.parse(ev.target.result);
                    if (typeof imported.tokens === 'number' && typeof imported.coins === 'number' &&
                        Array.isArray(imported.pets) && Array.isArray(imported.tasks)) {
                        if (imported.tasks) imported.tasks = imported.tasks.map(t => ({ ...t, completed: t.completed || false }));
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
                        alert('Save imported successfully!');
                        closeModal();
                    } else alert('Invalid save file');
                } catch(err) { alert('Failed to parse'); }
            };
            reader.readAsText(file);
        }
    });
    confirmClearBtn.addEventListener('click', () => {
        if (confirm('⚠️ Are you sure? This will delete all your progress.')) {
            localStorage.removeItem(STORAGE_KEY);
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
            closeModal();
        }
    });
    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
}

// ---------- Event listeners ----------
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

// Toggle mute and update icon
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

// Custom events for tasks
document.addEventListener('toggle-task', (e) => toggleTask(e.detail.id));
document.addEventListener('delete-task', (e) => deleteTask(e.detail.id));

// ---------- Initialization ----------
loadBgmPreference();
bindGlobalInteraction();
elements.workMinInput.value = Math.floor(state.workDuration / 60);
elements.breakMinInput.value = Math.floor(state.breakDuration / 60);
timeLeft = state.workDuration;
timerMode = 'work';
resetAlarmFlags();
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
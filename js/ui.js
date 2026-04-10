// ========== ui.js ==========
// All DOM manipulations, flip clock, popups, slot machine

import { RARITY_COINS, PET_TYPES } from './constants.js';
import { playGachaSpin, stopGachaSpin, playResultSound } from './audio.js';

// DOM element references
export const elements = {
    tokenSpan: document.getElementById('token-count'),
    coinSpan: document.getElementById('coin-count'),
    timerModeText: document.getElementById('timer-mode-text'),
    timerStart: document.getElementById('timer-start'),
    timerPause: document.getElementById('timer-pause'),
    timerReset: document.getElementById('timer-reset'),
    taskInput: document.getElementById('task-input'),
    addTaskBtn: document.getElementById('add-task'),
    taskList: document.getElementById('task-list'),
    drawBtn: document.getElementById('draw-pet'),
    drawResult: document.getElementById('draw-result'),
    collectionGrid: document.getElementById('collection-grid'),
    filterButtons: document.querySelectorAll('[data-filter]'),
    buyTokenBtn: document.getElementById('buy-token'),
    workMinInput: document.getElementById('work-min'),
    breakMinInput: document.getElementById('break-min'),
    applySettingsBtn: document.getElementById('apply-timer-settings'),
    openSettingsBtn: document.getElementById('open-settings'),
    timerBar: document.getElementById('timer-bar'),
    soundToggle: document.getElementById('sound-toggle'),
    duplicateListContainer: document.getElementById('duplicate-list-container'),
    selectAllBtn: document.getElementById('select-all-dupes'),
    deselectAllBtn: document.getElementById('deselect-all-dupes'),
    recycleSelectedBtn: document.getElementById('recycle-selected-btn'),
    selectedRewardSpan: document.getElementById('selected-reward-preview'),
    clockContainer: document.getElementById('flip-clock')
};

// Flip clock internal variables
let colWrappers = [];
let lastDigits = ['0','0','0','0'];

// Convert seconds to array of 4 digits [min10, min1, sec10, sec1]
function getDigitArray(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const mm = mins.toString().padStart(2, '0');
    const ss = secs.toString().padStart(2, '0');
    return [mm[0], mm[1], ss[0], ss[1]];
}

// Create a flip column for a single digit
function createFlipCol(initialDigit) {
    const colDiv = document.createElement('div');
    colDiv.className = 'col';
    const flip = document.createElement('div');
    flip.className = 'flip';
    const flipNext = document.createElement('div');
    flipNext.className = 'next';
    const flipCurr = document.createElement('div');
    flipCurr.className = 'curr';
    flip.append(flipNext, flipCurr);
    const nextStatic = document.createElement('div');
    nextStatic.className = 'next';
    const currStatic = document.createElement('div');
    currStatic.className = 'curr';
    colDiv.append(flip, nextStatic, currStatic);
    flipCurr.dataset.t = initialDigit;
    currStatic.dataset.t = initialDigit;
    flipNext.dataset.t = initialDigit;
    nextStatic.dataset.t = initialDigit;
    return {
        element: colDiv,
        toggleActive: () => flip.classList.toggle('active'),
        getCurr: () => currStatic.dataset.t,
        setCurr: (digit) => {
            flipCurr.dataset.t = digit;
            currStatic.dataset.t = digit;
        },
        setNext: (digit) => {
            flipNext.dataset.t = digit;
            nextStatic.dataset.t = digit;
        }
    };
}

// Build the flip clock DOM
export function buildClock(initialSeconds) {
    elements.clockContainer.innerHTML = '';
    colWrappers = [];
    const digits = getDigitArray(initialSeconds);
    colWrappers.push(createFlipCol(digits[0]));
    colWrappers.push(createFlipCol(digits[1]));
    const separator = document.createElement('div');
    separator.className = 'separator';
    separator.textContent = ':';
    elements.clockContainer.appendChild(separator);
    colWrappers.push(createFlipCol(digits[2]));
    colWrappers.push(createFlipCol(digits[3]));
    elements.clockContainer.appendChild(colWrappers[0].element);
    elements.clockContainer.appendChild(colWrappers[1].element);
    elements.clockContainer.appendChild(separator);
    elements.clockContainer.appendChild(colWrappers[2].element);
    elements.clockContainer.appendChild(colWrappers[3].element);
    lastDigits = [...digits];
}

// Update clock display with flip animation
export function updateFlipClock(timeLeft) {
    const newDigits = getDigitArray(timeLeft);
    for (let i = 0; i < 4; i++) {
        if (newDigits[i] !== lastDigits[i]) {
            const wrapper = colWrappers[i];
            if (wrapper) {
                wrapper.setNext(newDigits[i]);
                wrapper.toggleActive();
                setTimeout(() => {
                    wrapper.toggleActive();
                    wrapper.setCurr(newDigits[i]);
                }, 500);
            }
            lastDigits[i] = newDigits[i];
        }
    }
}

// Update timer progress bar and mode text
export function updateProgressBar(timeLeft, timerMode, workDuration, breakDuration) {
    const total = timerMode === 'work' ? workDuration : breakDuration;
    const percent = (timeLeft / total) * 100;
    elements.timerBar.style.width = percent + '%';
    elements.timerBar.style.backgroundColor = timerMode === 'work' ? '#6bc1ff' : '#ffaa33';
    elements.timerModeText.textContent = timerMode === 'work' ? 'Work Session' : 'Break Session';
}

// Update all UI based on state
export function updateUI(state, currentFilter) {
    elements.tokenSpan.textContent = state.tokens;
    elements.coinSpan.textContent = state.coins;
    renderTasks(state.tasks);
    renderCollection(state.pets, currentFilter);
    renderDuplicateList(state.pets);
    elements.drawBtn.disabled = state.tokens < 1;
    elements.buyTokenBtn.disabled = state.coins < 100;
}

// Render task list
export function renderTasks(tasks) {
    elements.taskList.innerHTML = '';
    tasks.forEach(task => {
        const li = document.createElement('li');
        li.className = task.completed ? 'completed' : '';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = task.completed;
        cb.addEventListener('change', () => {
            document.dispatchEvent(new CustomEvent('toggle-task', { detail: { id: task.id } }));
        });
        const span = document.createElement('span');
        span.textContent = task.text;
        const del = document.createElement('button');
        del.textContent = 'Delete';
        del.addEventListener('click', () => {
            document.dispatchEvent(new CustomEvent('delete-task', { detail: { id: task.id } }));
        });
        li.appendChild(cb);
        li.appendChild(span);
        li.appendChild(del);
        elements.taskList.appendChild(li);
    });
}

// Render pet collection gallery with filters
export function renderCollection(pets, currentFilter) {
    let filtered = pets;
    if (currentFilter !== 'all') filtered = pets.filter(p => p.rarity === currentFilter);
    elements.collectionGrid.innerHTML = '';
    filtered.forEach(pet => {
        const div = document.createElement('div');
        let rarityClass = pet.rarity === 'common' ? 'rarity-common' : (pet.rarity === 'uncommon' ? 'rarity-uncommon' : 'rarity-rare');
        div.className = `pet-item ${rarityClass} ${pet.isDuplicate ? 'duplicate' : ''}`;
        div.innerHTML = `<img src="${pet.image}" alt="${pet.name}" onerror="this.src='data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2064%2064%22%3E%3Crect%20width%3D%2264%22%20height%3D%2264%22%20fill%3D%22%23ddd%22%2F%3E%3Ctext%20x%3D%2232%22%20y%3D%2232%22%20text-anchor%3D%22middle%22%20dy%3D%22.3em%22%20fill%3D%22%23999%22%3E%3F%3C%2Ftext%3E%3C%2Fsvg%3E';"><p>${pet.name}</p>${pet.isDuplicate ? '<span class="duplicate-badge">DUPE</span>' : ''}`;
        elements.collectionGrid.appendChild(div);
    });
}

// Render the list of duplicate pets with checkboxes
export function renderDuplicateList(pets) {
    const dupPets = pets.filter(p => p.isDuplicate);
    if (dupPets.length === 0) {
        elements.duplicateListContainer.innerHTML = '<div style="padding: 12px; text-align: center; color: #4a3f35;">No duplicate pets available.</div>';
        elements.selectedRewardSpan.textContent = '+0 Coins';
        return;
    }
    const container = document.createElement('div');
    container.className = 'duplicate-list';
    dupPets.forEach(pet => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'duplicate-item';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = pet.id;
        cb.className = 'dupe-checkbox';
        const img = document.createElement('img');
        img.src = pet.image;
        img.alt = pet.name;
        img.onerror = () => { img.src = 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2064%2064%22%3E%3Crect%20width%3D%2264%22%20height%3D%2264%22%20fill%3D%22%23ddd%22%2F%3E%3Ctext%20x%3D%2232%22%20y%3D%2232%22%20text-anchor%3D%22middle%22%20dy%3D%22.3em%22%20fill%3D%22%23999%22%3E%3F%3C%2Ftext%3E%3C%2Fsvg%3E'; };
        const infoDiv = document.createElement('div');
        infoDiv.className = 'duplicate-info';
        infoDiv.innerHTML = `<span class="duplicate-name">${pet.name}</span><span class="duplicate-reward">${RARITY_COINS[pet.rarity]} coins</span>`;
        itemDiv.appendChild(cb);
        itemDiv.appendChild(img);
        itemDiv.appendChild(infoDiv);
        container.appendChild(itemDiv);
    });
    elements.duplicateListContainer.innerHTML = '';
    elements.duplicateListContainer.appendChild(container);
    const checkboxes = document.querySelectorAll('.dupe-checkbox');
    checkboxes.forEach(cb => cb.addEventListener('change', () => updateSelectedRewardPreview(pets)));
    updateSelectedRewardPreview(pets);
}

// Update the coin reward preview based on selected duplicates
export function updateSelectedRewardPreview(pets) {
    const checkboxes = document.querySelectorAll('.dupe-checkbox');
    let totalReward = 0;
    checkboxes.forEach(cb => {
        if (cb.checked) {
            const petId = cb.value;
            const pet = pets.find(p => p.id === petId);
            if (pet) totalReward += RARITY_COINS[pet.rarity];
        }
    });
    elements.selectedRewardSpan.textContent = `+${totalReward} Coins`;
    if (totalReward === 0) elements.selectedRewardSpan.textContent = '+0 Coins';
}

// Show the "Great work!" reward popup (auto-closes after 3s, has Back button)
export function showRewardPopup() {
    const existingOverlay = document.querySelector('.cycle-overlay');
    if (existingOverlay) existingOverlay.remove();
    if (window.modalAutoCloseTimer) clearTimeout(window.modalAutoCloseTimer);
    const overlay = document.createElement('div');
    overlay.className = 'cycle-overlay';
    overlay.innerHTML = `
        <div class="cycle-message">
            <h3>🎉 Great work! 🎉</h3>
            <div class="reward">
                <span>+1 Token</span>
                <svg width="36" height="36" viewBox="0 0 64 64">
                    <rect x="10" y="20" width="44" height="24" rx="6" fill="#ffe08a" stroke="#4a3f35" stroke-width="3"/>
                    <circle cx="10" cy="32" r="4" fill="#f4e9d8"/>
                    <circle cx="54" cy="32" r="4" fill="#f4e9d8"/>
                    <polygon points="32,24 34,30 40,30 35,34 37,40 32,36 27,40 29,34 24,30 30,30" fill="#ff6b6b"/>
                </svg>
            </div>
            <button id="cycle-ok">Back</button>
        </div>
    `;
    document.body.appendChild(overlay);
    window.modalAutoCloseTimer = setTimeout(() => {
        if (overlay && overlay.parentNode) overlay.remove();
        window.modalAutoCloseTimer = null;
    }, 3000);
    const okBtn = overlay.querySelector('#cycle-ok');
    okBtn.addEventListener('click', () => {
        if (window.modalAutoCloseTimer) clearTimeout(window.modalAutoCloseTimer);
        window.modalAutoCloseTimer = null;
        overlay.remove();
    });
}

// Slot machine animation for gacha
export function createSlotMachine(targetPetIndex, rarity, onClose) {
    const ITEM_WIDTH = 120;
    const CENTER_INDEX = 1;
    const REPEAT_COUNT = 20;
    const EXTENDED_PETS = [];
    for (let i = 0; i < REPEAT_COUNT; i++) EXTENDED_PETS.push(...PET_TYPES);
    const modal = document.createElement('div');
    modal.className = 'slot-modal';
    modal.innerHTML = `<div class="slot-container"><div class="slot-window"><div class="slot-track" id="slot-track"></div><div class="slot-indicator"></div></div><div class="slot-message" id="slot-message"></div><button class="slot-close" id="slot-close" style="display: none;">OK</button></div>`;
    document.body.appendChild(modal);
    const track = modal.querySelector('#slot-track');
    const messageDiv = modal.querySelector('#slot-message');
    const closeBtn = modal.querySelector('#slot-close');
    EXTENDED_PETS.forEach(pet => {
        const div = document.createElement('div');
        div.className = 'slot-pet';
        div.innerHTML = `<img src="${pet.image}" alt="${pet.name}" onerror="this.src='data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2064%2064%22%3E%3Crect%20width%3D%2264%22%20height%3D%2264%22%20fill%3D%22%23ddd%22%2F%3E%3Ctext%20x%3D%2232%22%20y%3D%2232%22%20text-anchor%3D%22middle%22%20dy%3D%22.3em%22%20fill%3D%22%23999%22%3E%3F%3C%2Ftext%3E%3C%2Fsvg%3E';"><p>${pet.name}</p>`;
        track.appendChild(div);
    });
    const startOffset = 0;
    track.style.transform = `translateX(${startOffset}px)`;
    const targetPet = PET_TYPES[targetPetIndex];
    let targetIndices = [];
    for (let i = 0; i < EXTENDED_PETS.length; i++) {
        if (EXTENDED_PETS[i].typeId === targetPet.typeId) targetIndices.push(i);
    }
    const targetIdx = targetIndices[Math.floor(targetIndices.length / 2)];
    const targetOffset = -(targetIdx * ITEM_WIDTH) + (CENTER_INDEX * ITEM_WIDTH);
    const EXTRA_CYCLES = 3;
    const extraDistance = EXTRA_CYCLES * PET_TYPES.length * ITEM_WIDTH;
    const totalDisplacement = (targetOffset - startOffset) - extraDistance;
    const duration = 4500;
    const startTime = performance.now();
    function easeInOutQuart(t) {
        return t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (1 - t) * (1 - t) * (1 - t) * (1 - t);
    }
    function animate(now) {
        const elapsed = now - startTime;
        let t = Math.min(1, elapsed / duration);
        const eased = easeInOutQuart(t);
        const currentX = startOffset + totalDisplacement * eased;
        track.style.transform = `translateX(${currentX}px)`;
        if (t < 1) {
            requestAnimationFrame(animate);
        } else {
            stopGachaSpin();
            playResultSound(rarity);
            track.style.transform = `translateX(${targetOffset}px)`;
            messageDiv.innerHTML = `🎉 You got: ${targetPet.name} (${targetPet.rarity}) 🎉`;
            closeBtn.style.display = 'inline-block';
            closeBtn.onclick = () => { modal.remove(); onClose(); };
        }
    }
    requestAnimationFrame(animate);
}
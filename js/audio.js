// ========== audio.js ==========
// Manages all sound effects and background music with ducking

import { PATHS } from './constants.js';

// Audio elements
const bgmAudio = new Audio();
bgmAudio.loop = true;
bgmAudio.volume = 1.0;

const gachaAudio = new Audio(PATHS.gacha);
const revealAudio = new Audio(PATHS.reveal);
const rareAudio = new Audio(PATHS.rare);
const clockAudio = new Audio(PATHS.clock);

[gachaAudio, revealAudio, rareAudio, clockAudio].forEach(audio => audio.preload = 'auto');

// State
let bgmMuted = false;
let userInteracted = false;
let currentBgmIndex = 0;
let bgmDuckingCount = 0;
const BGM_DUCK_VOLUME = 0.25;   // Background volume when SFX plays

// Lower background volume (duck)
function duckBgm() {
    if (!bgmMuted && bgmAudio && !bgmAudio.paused) {
        bgmAudio.volume = BGM_DUCK_VOLUME;
    }
}

// Restore background volume
function unduckBgm() {
    if (!bgmMuted && bgmAudio && !bgmAudio.paused) {
        bgmAudio.volume = 1.0;
    }
}

// Play a sound effect with ducking
function playSound(audioElement) {
    if (bgmDuckingCount === 0) duckBgm();
    bgmDuckingCount++;
    audioElement.pause();
    audioElement.currentTime = 0;
    const playPromise = audioElement.play();
    if (playPromise !== undefined) {
        playPromise.catch(err => {
            console.warn('Sound play error:', err);
            bgmDuckingCount--;
            if (bgmDuckingCount === 0) unduckBgm();
        });
    }
    const onEnded = () => {
        bgmDuckingCount--;
        if (bgmDuckingCount === 0) unduckBgm();
        audioElement.removeEventListener('ended', onEnded);
    };
    audioElement.addEventListener('ended', onEnded, { once: true });
}

// Public sound actions
export function playGachaSpin() { playSound(gachaAudio); }
export function stopGachaSpin() {
    if (!gachaAudio.paused) {
        gachaAudio.pause();
        gachaAudio.currentTime = 0;
        const endedEvent = new Event('ended');
        gachaAudio.dispatchEvent(endedEvent);
    }
}
export function playResultSound(rarity) {
    if (rarity === 'rare') playSound(rareAudio);
    else playSound(revealAudio);
}
export function playClockAlarm() { playSound(clockAudio); }

// Background music control
export function loadBgmPreference() {
    const saved = localStorage.getItem('pomopet_bgm_index');
    if (saved !== null) {
        currentBgmIndex = parseInt(saved, 10);
        if (isNaN(currentBgmIndex) || currentBgmIndex < 0 || currentBgmIndex >= PATHS.bgmList.length)
            currentBgmIndex = 0;
    } else {
        currentBgmIndex = 0;
    }
    bgmAudio.src = PATHS.bgmList[currentBgmIndex].file;
    bgmAudio.load();
}

export function saveBgmPreference() {
    localStorage.setItem('pomopet_bgm_index', currentBgmIndex);
}

export function setBackgroundMusic(index) {
    if (index === currentBgmIndex && bgmAudio.src.includes(PATHS.bgmList[index].file)) return;
    currentBgmIndex = index;
    const wasPlaying = !bgmAudio.paused;
    bgmAudio.src = PATHS.bgmList[index].file;
    bgmAudio.load();
    saveBgmPreference();
    if (wasPlaying && userInteracted && !bgmMuted) {
        bgmAudio.play().catch(e => console.log('BGM play on change failed:', e));
    }
    if (bgmDuckingCount > 0 && !bgmMuted) bgmAudio.volume = BGM_DUCK_VOLUME;
    else bgmAudio.volume = 1.0;
}

// Start BGM on first user click (browser autoplay policy)
export function bindGlobalInteraction() {
    const startBgmOnInteraction = () => {
        if (!userInteracted && !bgmMuted && bgmAudio.paused) {
            bgmAudio.play().then(() => userInteracted = true)
                .catch(e => console.log('User interaction play failed', e));
        } else {
            userInteracted = true;
        }
        document.removeEventListener('click', startBgmOnInteraction);
        document.removeEventListener('touchstart', startBgmOnInteraction);
    };
    document.addEventListener('click', startBgmOnInteraction);
    document.addEventListener('touchstart', startBgmOnInteraction);
}

// Toggle mute/unmute for background music
export function toggleBgmMute() {
    bgmMuted = !bgmMuted;
    localStorage.setItem('pomopet_bgm_mute', bgmMuted);
    if (!bgmMuted && userInteracted && bgmAudio.paused) {
        bgmAudio.play().catch(e => console.log('BGM resume from mute toggle:', e));
        if (bgmDuckingCount > 0) bgmAudio.volume = BGM_DUCK_VOLUME;
        else bgmAudio.volume = 1.0;
    } else if (bgmMuted && !bgmAudio.paused) {
        bgmAudio.pause();
    }
    return bgmMuted;
}

export function getBgmMuted() { return bgmMuted; }
export function setBgmMuted(value) { bgmMuted = value; }
// ========== audio.js ==========
// Manages all sound effects and background music with ducking

import { PATHS } from './constants.js';

// Background music player
export const bgmAudio = new Audio();
bgmAudio.loop = true;          // Repeat continuously
bgmAudio.volume = 1.0;         // Full volume initially

// Currently selected background music index (exported for settings modal)
export let currentBgmIndex = 0;

// Internal state
let bgmMuted = false;           // Whether background music is muted
let userInteracted = false;     // Flag to handle browser autoplay policy
let bgmDuckingCount = 0;        // Number of active sound effects (for volume ducking)
const BGM_DUCK_VOLUME = 0.25;   // Volume level when sound effects play

// Sound effect audio elements
const gachaAudio = new Audio(PATHS.gacha);
const revealAudio = new Audio(PATHS.reveal);
const rareAudio = new Audio(PATHS.rare);
const clockAudio = new Audio(PATHS.clock);
[gachaAudio, revealAudio, rareAudio, clockAudio].forEach(audio => audio.preload = 'auto');

// Lower background volume when sound effects start (ducking)
function duckBgm() {
    if (!bgmMuted && bgmAudio && !bgmAudio.paused) {
        bgmAudio.volume = BGM_DUCK_VOLUME;
    }
}

// Restore background volume after sound effects finish
function unduckBgm() {
    if (!bgmMuted && bgmAudio && !bgmAudio.paused) {
        bgmAudio.volume = 1.0;
    }
}

// Play a sound effect with ducking and restore BGM after playback
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

// Public sound effect actions
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

// Load saved background music preference from localStorage
export function loadBgmPreference() {
    const saved = localStorage.getItem('pomopet_bgm_index');
    if (saved !== null) {
        currentBgmIndex = parseInt(saved, 10);
        if (isNaN(currentBgmIndex) || currentBgmIndex < 0 || currentBgmIndex >= PATHS.bgmList.length) {
            currentBgmIndex = 0;
        }
    }
    bgmAudio.src = PATHS.bgmList[currentBgmIndex].file;
    bgmAudio.load();
}

// Save current background music index to localStorage
export function saveBgmPreference() {
    localStorage.setItem('pomopet_bgm_index', currentBgmIndex);
}

// Change background music track by index
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

// Start background music on first user interaction (browser autoplay policy)
export function bindGlobalInteraction() {
    const start = () => {
        if (!userInteracted && !bgmMuted && bgmAudio.paused) {
            bgmAudio.play().then(() => userInteracted = true)
                .catch(e => console.log('User interaction play failed', e));
        } else {
            userInteracted = true;
        }
        document.removeEventListener('click', start);
        document.removeEventListener('touchstart', start);
    };
    document.addEventListener('click', start);
    document.addEventListener('touchstart', start);
}

// Toggle mute/unmute for background music, return new mute state
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

// Get current mute state
export function getBgmMuted() { return bgmMuted; }
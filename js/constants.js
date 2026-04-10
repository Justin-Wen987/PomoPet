// ========== constants.js ==========
// Defines all static data for the game: pet types, rarity weights, coin values, audio paths, and default state.
//Pet Background color: #fff7e8

// List of all collectible pets with their properties
export const PET_TYPES = [
    { typeId: 'cat', name: 'Kitty', rarity: 'common', image: 'image/Kitty.jpg' },
    { typeId: 'dog', name: 'Puppy', rarity: 'common', image: 'image/Puppy.jpeg' },
    { typeId: 'hamster', name: 'Hammy', rarity: 'common', image: 'image/Hammy.jpg' },
    { typeId: 'fox', name: 'Foxy', rarity: 'uncommon', image: 'image/Foxy.jpg' },
    { typeId: 'panda', name: 'Panda', rarity: 'uncommon', image: 'image/Panda.jpg' },
    { typeId: 'dragon', name: 'Drake', rarity: 'rare', image: 'image/Dragon.jpg' },
    { typeId: 'phoenix', name: 'Phoenix', rarity: 'rare', image: 'image/Phoenix.jpg' }
];

// Probability distribution for gacha draws (total = 100)
export const RARITY_WEIGHTS = { common: 75, uncommon: 20, rare: 5 };

// Coin reward values when recycling a duplicate pet by rarity
export const RARITY_COINS = {
    common: 5,
    uncommon: 10,
    rare: 20
};

// File paths for all audio assets used in the game
export const PATHS = {
    gacha: 'music/gacha.mp3',
    reveal: 'music/reveal.mp3',
    rare: 'music/rare.mp3',
    clock: 'music/clock.mp3',
    bgmList: [
        { name: '10℃', file: 'music/10℃.mp3' },
        { name: 'Morning', file: 'music/Morning.mp3' },
        { name: 'サンタは中央線でやってくる', file: 'music/サンタは中央線でやってくる.mp3' }
    ]
};

// Initial game state when no saved data exists
export const DEFAULT_STATE = {
    tokens: 0,
    coins: 0,
    pets: [],
    tasks: [],
    workDuration: 25 * 60,   // 25 minutes in seconds
    breakDuration: 5 * 60     // 5 minutes in seconds
};
# 🐾 PomoPet

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?logo=javascript)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![GitHub Pages](https://img.shields.io/badge/Deployed%20on-GitHub%20Pages-222222?logo=github)](https://pages.github.com/)

**PomoPet** is an innovative web application that combines the proven Pomodoro focus technique with an engaging collectible pet game. Designed to address the common "motivation gap" students face during self-directed study, PomoPet transforms routine work into an enjoyable and sustainable habit through a simple reward loop: **focus → earn tokens → collect pets**.


---

## ✨ Key Features

### 🎯 1. Pomodoro Focus Timer
- Standard 25/5 minute work/break intervals
- Start, pause, and reset functionality
- Customizable work and break durations
- Visual flip‑clock animation and progress bar

### 📝 2. Task List
- Add, complete, and delete todo items
- Earn one **Token** instantly upon completing a task

### 🎁 3. Gacha Collection System
- Spend one Token to draw a random digital pet
- Three rarity tiers: Common, Uncommon, Rare (weighted probabilities)
- Slot‑machine style animation when drawing
- Duplicate pets are automatically marked for recycling

### 🖼️ 4. Collection Gallery
- Grid display of all uniquely owned pets
- Filter by rarity (All / Common / Uncommon / Rare)

### 🏪 5. Pet Recycle Shop
- Select one or more duplicate pets to recycle into **Coins**
  - Common: +5 Coins
  - Uncommon: +10 Coins
  - Rare: +20 Coins
- Exchange 100 Coins for 1 Token (self-contained in-app economy)

### 💾 6. Data Persistence
- All game progress (Tokens, Coins, pet collection) saved to browser `localStorage`
- Progress persists across page refreshes and browser restarts

### 🔊 7. Immersive Audio
- Background music with multiple tracks (user selectable)
- Sound effects for gacha spins, pet reveals, and timer alarms
- Volume ducking: BGM automatically lowers when SFX plays

---

## 🎮 Gameplay Loop

A simple, rewarding cycle that makes studying more fun:

1. **Focus** → Start a Pomodoro session or complete a task from your list.
2. **Reward** → Your effort is immediately rewarded with a **Token**.
3. **Relax** → Visit the Gacha machine, spend a Token, and see which cute pet you get.
4. **Collect** → New pets are added to your gallery; duplicates can be sent to the shop.
5. **Exchange** → Use Coins from recycled duplicates to buy more Tokens and continue collecting.

This positive feedback loop keeps you coming back to manage your time while filling your pet collection.

---

## 🛠️ Technology Stack

PomoPet is a lightweight, client-side single-page application (SPA) with no backend dependencies.

- **Language**: JavaScript (ES6+ modules)
- **Styling**: CSS3 (custom pixel‑art styling, responsive design)
- **Data Persistence**: Web Storage API (`localStorage`)
- **Audio**: Web Audio API (background music, sound effects, volume ducking)
- **Version Control**: Git & GitHub
- **Deployment**: GitHub Pages

### System Architecture

```
User Browser
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│                   HTML / CSS / JavaScript                   │
├──────────────┬──────────────┬──────────────┬────────────────┤
│   Timer      │  Task List   │    Gacha     │     Shop       │
│   Module     │   Module     │   Module     │    Module      │
└──────────────┴──────────────┴──────────────┴────────────────┘
      │              │              │              │
      └──────────────┴──────────────┴──────────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │    Application      │
                  │       State         │
                  └─────────────────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │    localStorage     │
                  │  (Data Persistence) │
                  └─────────────────────┘
```

---

## 📁 Project Structure

```
pomopet/
├── index.html              # Main entry point
├── css/
│   └── style.css           # Global stylesheet
├── js/
│   ├── app.js              # Main application logic
│   ├── constants.js        # Static data (pets, audio paths, etc.)
│   ├── audio.js            # Audio management (BGM + SFX with ducking)
│   ├── storage.js          # localStorage read/write wrapper
│   └── ui.js               # UI rendering and DOM manipulation
├── image/                  # Game assets (pet icons, logo, etc.)
└── music/                  # Sound effects and background music
    ├── gacha.mp3           # Gacha spin sound
    ├── reveal.mp3          # Pet reveal sound
    ├── rare.mp3            # Rare pet sound
    ├── clock.mp3           # Timer reminder sound
    └── *.mp3               # Multiple background music tracks
```

---

## 🚀 Getting Started

Follow these steps to run the project locally.

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- A local web server (Python's `http.server` or VS Code Live Server)

### Installation & Running

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/pomopet.git
   cd pomopet
   ```

2. **Start a local server**
   ```bash
   # Using Python 3
   python -m http.server 5173
   
   # Or use VS Code Live Server extension
   ```

3. **Open your browser**
   Navigate to `http://localhost:5173` to start using PomoPet.

---

## 🧪 Testing & Quality Assurance

The following testing strategies were implemented to ensure reliability:

- **Manual Functional Testing**: End-to-end testing of all user stories (timer, gacha, shop, etc.)
- **Data Persistence Testing**: Verified data restoration after page refresh and browser restart
- **User Acceptance Testing**: Gathered feedback from target users (college and high school students)
- **Code Review**: Peer review to maintain code quality and consistency

---

## 📅 Development Timeline

The project followed an agile-inspired approach over 12 weeks:

**Phase 1: Foundation & Design** (Weeks 1-2)  
- Project setup, design finalization, initial asset creation

**Phase 2: Core Feature Development** (Weeks 3-5)  
- Timer, task list, and data persistence implementation

**Phase 3: Gamification Development** (Weeks 6-8)  
- Gacha system, collection gallery, shop implementation

**Phase 4: Integration & Polish** (Weeks 9-10)  
- Asset integration, UI styling, internal testing

**Phase 5: Finalization** (Weeks 11-12)  
- User testing, bug fixes, deployment, documentation

### Milestones

- **System Design Document** – Week 2
- **LoFi Prototype** – Week 2
- **Core Features Complete** – Week 5
- **Gamification System Complete** – Week 8
- **Complete Application Deployed** – Week 12

---

## 👤 Author

**Changyu Wen**

- **Role**: Solo Developer, UI/UX Designer, Pixel Artist
- **Responsibilities**:
  - Frontend development (JavaScript, HTML, CSS, modular architecture)
  - UI/UX design and user experience optimization
  - Original pixel art asset creation (pets, UI elements, icons)
  - Audio integration and volume ducking logic
  - Testing strategy and quality assurance

---

## 📜 License

This project is open source and available under the [MIT License](LICENSE).

---

## 🙏 Acknowledgments

- Inspired by the Pomodoro Technique and classic pet collection games
- Thanks to all test users who provided valuable feedback

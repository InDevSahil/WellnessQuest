// ===============================
// Utility helpers
// ===============================
const KEY = "wellness-quest-state-v2";
const todayISO = () => new Date().toISOString().slice(0, 10);
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

// Google Sign-In Configuration
const GOOGLE_CLIENT_ID = "355857285805-duk644adl1ujva986729cd0ljr15b2g9.apps.googleusercontent.com";

// Fix: Add Google client_id meta tag dynamically for gapi to detect
function addGoogleClientIdMeta() {
    let meta = document.querySelector('meta[name="google-signin-client_id"]');
    if (!meta) {
        meta = document.createElement('meta');
        meta.name = "google-signin-client_id";
        meta.content = GOOGLE_CLIENT_ID;
        document.head.appendChild(meta);
    }
}

window.addEventListener('load', () => {
    addGoogleClientIdMeta();
    loadGoogleApi();
});

// Google Sign-In Initialization and Handlers
function initializeGoogleSignIn() {
    window.onGoogleSignIn = function(googleUser) {
        const profile = googleUser.getBasicProfile();
        const id_token = googleUser.getAuthResponse().id_token;
        console.log('Google User signed in:', profile.getName(), profile.getEmail());
        // Save user info in state or localStorage as needed
        state.displayName = profile.getName() || "You";
        saveState();
        renderUI();
        showToast(`Signed in as ${state.displayName}`);
    };

    window.onGoogleSignOut = function() {
        console.log('User signed out.');
        state.displayName = "You";
        saveState();
        renderUI();
        showToast('Signed out');
    };
}

function signOutGoogle() {
    const auth2 = gapi.auth2.getAuthInstance();
    if (auth2) {
        auth2.signOut().then(() => {
            window.onGoogleSignOut();
        });
    }
}

// Load Google API script dynamically and initialize
function loadGoogleApi() {
    const script = document.createElement('script');
    script.src = "https://apis.google.com/js/platform.js";
    script.onload = () => {
        gapi.load('auth2', () => {
            gapi.auth2.init({
                client_id: GOOGLE_CLIENT_ID,
            }).then(() => {
                initializeGoogleSignIn();
            });
        });
    };
    document.head.appendChild(script);
}



function showToast(message) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    toastMessage.textContent = message;
    toast.style.opacity = 1;
    toast.style.transform = 'translate(-50%, 0) scale(1)';
    setTimeout(() => {
        toast.style.opacity = 0;
        toast.style.transform = 'translate(-50%, 0) scale(0.95)';
    }, 3000);
}

function showDailyReminder() {
    const today = todayISO();
    const moodLoggedToday = state.moodLog.some(m => m.date === today);
    const questsCompletedToday = (state.completed[today] || []).length;

    if (!moodLoggedToday) {
        showToast("Don't forget to log your mood today! 🌟");
    } else if (questsCompletedToday < 3) {
        showToast("Complete a few quests to boost your wellness streak! 💪");
    } else {
        showToast("Great job today! Keep up the good work! 🎉");
    }
}

// ===============================
// Seed Data
// ===============================
const BASE_ACTIVITIES = [
    { id: "walk10", title: "Go for a 10‑minute walk", xp: 15, tag: "movement", duration: 10, sticker: "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif" },
    { id: "grat1", title: "Write one good thing", xp: 10, tag: "gratitude", sticker: "https://media.giphy.com/media/3o6ZtpxSZbQRRnwCKQ/giphy.gif" },
    { id: "breathe", title: "Try a 3‑minute breathing", xp: 15, tag: "breathing", tagColor: 'text-blue-500', duration: 3, sticker: "https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif" },
    { id: "text", title: "Text a friend hello", xp: 12, tag: "connection", sticker: "https://media.giphy.com/media/3o6Zt6ML6BklcajjsA/giphy.gif" },
    { id: "water", title: "Drink a tall glass of water", xp: 8, tag: "hydration", sticker: "https://media.giphy.com/media/3o7aD2saalBwwftBIY/giphy.gif" },
    { id: "sleep", title: "Lights out 30 min earlier", xp: 20, tag: "sleep", sticker: "https://media.giphy.com/media/3o6Zt481isNVuQI1l6/giphy.gif" },
    { id: "focus5", title: "5‑minute focus sprint", xp: 10, tag: "focus", duration: 5, sticker: "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif" },
];

const AVATARS = [
    { id: "sprout", name: "Sprout", minLevel: 1, sticker: "https://img.icons8.com/color/48/000000/sprout.png" },
    { id: "spark", name: "Spark", minLevel: 3, sticker: "https://img.icons8.com/color/48/000000/sparkling.png" },
    { id: "ranger", name: "Ranger", minLevel: 5, sticker: "https://img.icons8.com/color/48/000000/tree.png" },
    { id: "guardian", name: "Guardian", minLevel: 8, sticker: "https://img.icons8.com/color/48/000000/shield.png" },
    { id: "phoenix", name: "Phoenix", minLevel: 12, sticker: "https://img.icons8.com/color/48/000000/fire.png" },
];

const DEMO_LEADERBOARD = [
    { name: "Aria", xp: 620 },
    { name: "Jay", xp: 540 },
    { name: "Sam", xp: 480 },
    { name: "Mina", xp: 430 },
];

const DEFAULT_STATE = {
    xp: 0,
    completed: {},
    moodLog: [],
    selectedAvatar: "sprout",
    badges: [],
    weeklyProgress: 0,
    displayName: "You",
};

// ===============================
// State Management
// ===============================
let state = {};
let activeTask = null; // Track currently active timed task
let taskTimer = null; // Timer for active task
let taskStartTime = null; // When the task started

function loadState() {
    try {
        const raw = localStorage.getItem(KEY);
        state = raw ? JSON.parse(raw) : DEFAULT_STATE;
        if (!state.displayName) {
            state.displayName = "You";
        }
    } catch (e) {
        console.error("Failed to load state from localStorage:", e);
        state = DEFAULT_STATE;
    }
}

function saveState() {
    try {
        localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
        console.error("Failed to save state to localStorage:", e);
    }
}

// ===============================
// UI Update Functions
// ===============================
function renderUI() {
    const level = levelFromXP(state.xp);
    const next = xpToNextLevel(state.xp);
    const today = todayISO();
    const doneToday = new Set(state.completed[today] || []);
    const unlockedAvatars = AVATARS.filter(a => a.minLevel <= level);
    const leaderboard = [...DEMO_LEADERBOARD, { name: state.displayName, xp: state.xp }]
                        .sort((a, b) => b.xp - a.xp).slice(0, 5);
    const suggestedQuests = suggestQuests(state);

    // Update stats cards
    document.getElementById('level').textContent = level;
    document.getElementById('xpToNext').textContent = `${next} XP to next`;
    document.getElementById('levelProgress').style.width = `${(state.xp % 100)}%`;
    document.getElementById('totalXp').textContent = state.xp;
    document.getElementById('weeklyProgress').style.width = `${state.weeklyProgress}%`;
    document.getElementById('weeklyProgressText').textContent = `${state.weeklyProgress}% of 100`;

    // Render avatars
    const avatarButtonsContainer = document.getElementById('avatarButtons');
    avatarButtonsContainer.innerHTML = '';
    unlockedAvatars.forEach(a => {
        const button = document.createElement('button');
        button.className = `inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors h-12 w-12 p-1 transform hover:scale-110 ${a.id === state.selectedAvatar ? 'bg-blue-500 text-white shadow hover:bg-blue-600' : 'bg-slate-100 text-slate-700 shadow-sm hover:bg-slate-200'}`;
        const img = document.createElement('img');
        img.src = a.sticker || "https://img.icons8.com/color/48/000000/question-mark.png"; // fallback sticker
        img.alt = a.name;
        img.className = "w-full h-full object-contain rounded-md pointer-events-none select-none animate-pulse hover:animate-bounce";
        button.appendChild(img);
        button.onclick = () => {
            state.selectedAvatar = a.id;
            saveState();
            renderUI();
        };
        avatarButtonsContainer.appendChild(button);
    });


    // Render quests
    const dailyQuestsContainer = document.getElementById('dailyQuests');
    dailyQuestsContainer.innerHTML = '';
    const renderQuest = (q, isSuggested = false) => {
        const button = document.createElement('button');
        button.className = `w-full text-left p-3 rounded-2xl border transition-all duration-300 transform hover:scale-[1.02] hover:shadow-md flex items-center gap-3 ${isSuggested ? 'bg-indigo-50/60' : 'bg-white'} ${doneToday.has(q.id) ? 'bg-emerald-50 border-emerald-200' : ''}`;
        button.disabled = doneToday.has(q.id);
        button.onclick = () => {
            if (q.tag === "mini-game") {
                document.getElementById('miniGameModal').classList.remove('hidden');
                startMiniGame();
            } else {
                completeQuest(q);
            }
        };

        const titleBadge = `
            <div class="flex items-center justify-between flex-grow">
                <div class="font-semibold">${q.title}</div>
                ${isSuggested ? `<div class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors bg-blue-600 text-white">AI</div>` :
                               `<div class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors bg-slate-200 text-slate-700"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3 h-3"><path d="M12.5 12.5h-1v-2h1v2z"/></svg>${q.xp}</div>`}
            </div>
        `;
        const tag = `<div class="text-xs text-slate-500 mt-1 capitalize">#${q.tag}</div>`;
        const completedText = doneToday.has(q.id) ? `<div class="text-xs mt-2 text-emerald-700 font-semibold">Completed ✓</div>` : '';

        // Removed sticker image to eliminate GIFs from Daily Quests
        // const stickerImg = q.sticker ? `<img src="${q.sticker}" alt="sticker" class="w-10 h-10 rounded-lg select-none pointer-events-none" />` : '';
        const stickerImg = '';

        button.innerHTML = stickerImg + titleBadge + tag + completedText;
        dailyQuestsContainer.appendChild(button);
    };

    BASE_ACTIVITIES.forEach(a => renderQuest(a));
    suggestedQuests.forEach(q => renderQuest(q, true));

    // Render mood buttons
    const moodButtonsContainer = document.getElementById('moodButtons');
    moodButtonsContainer.innerHTML = '';
    const moodLabels = ['Depressed', 'Sad', 'Normal', 'Happy', 'Happiest'];
    moodLabels.forEach((label, index) => {
        const moodButton = document.createElement('button');
        moodButton.className = `inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors h-9 px-4 py-2 transform hover:scale-110 ${index + 1 === state.moodToday ? 'bg-blue-500 text-white shadow hover:bg-blue-600' : 'border border-slate-200 bg-white shadow-sm hover:bg-slate-100'}`;
        moodButton.textContent = label;
        moodButton.onclick = () => {
            state.moodToday = index + 1;
            renderUI();
        };
        moodButtonsContainer.appendChild(moodButton);
    });

    // Render badges
    const badgesContainer = document.getElementById('badgesContainer');
    badgesContainer.innerHTML = '';
    if (state.badges.length === 0) {
        badgesContainer.innerHTML = '<div class="text-sm text-slate-500">Complete quests to earn your first badge!</div>';
    } else {
        state.badges.forEach(b => {
            const badge = document.createElement('div');
            badge.className = "inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold transition-colors bg-blue-500 text-white";
            badge.textContent = b;
            badgesContainer.appendChild(badge);
        });
    }

    // Render leaderboard
    const leaderboardContainer = document.getElementById('leaderboard');
    leaderboardContainer.innerHTML = '';
    leaderboard.forEach((row, idx) => {
        const rowDiv = document.createElement('div');
        rowDiv.className = `flex items-center justify-between p-2 rounded-xl border bg-white/60 transform transition-all hover:scale-[1.02] ${row.name === state.displayName ? 'border-2 border-blue-500 bg-blue-50' : ''}`;
        rowDiv.innerHTML = `
            <div class="flex items-center gap-2">
                <div class="w-6 text-right font-bold">${idx + 1}</div>
                <div class="font-semibold">${row.name}</div>
            </div>
            <div class="text-sm flex items-center gap-1 text-slate-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3 h-3 text-yellow-500">
                    <path d="M12.5 12.5h-1v-2h1v2z"/>
                </svg>
                ${row.xp}
            </div>
        `;
        leaderboardContainer.appendChild(rowDiv);
    });
    document.getElementById('displayNameInput').value = state.displayName;
}

// ===============================
// Game Logic
// ===============================
function levelFromXP(xp) {
    return Math.floor(xp / 100) + 1;
}

function xpToNextLevel(xp) {
    return 100 - (xp % 100);
}

function suggestQuests(state) {
    const last7 = state.moodLog.slice(-7);
    const avg = last7.length ? last7.reduce((a, b) => a + b.mood, 0) / last7.length : 3;
    const todayDone = new Set(state.completed[todayISO()] || []);

    const pool = [];
    if (avg < 3) {
        pool.push(
            { id: "dance", title: "2‑song dance break", description: "Pick two upbeat songs and move!", tag: "movement", xp: 15 },
            { id: "mini-arcade", title: "Play the bubble‑breath mini‑game", description: "Tap to pace your breath with bubbles.", tag: "mini-game", xp: 20 },
            { id: "grat3", title: "3 tiny wins list", description: "Write three small wins from today.", tag: "gratitude", xp: 18 },
        );
    } else if (avg >= 3.5) {
        pool.push(
            { id: "focus10", title: "10‑minute pomodoro", description: "Push a focused mini sprint.", tag: "focus", xp: 12 },
            { id: "walk-view", title: "Scenery walk pic", description: "Walk 10 minutes and snap a sky/plant pic.", tag: "movement", xp: 15 },
            { id: "kindness", title: "Send a kind text", description: "Cheer someone on today.", tag: "connection", xp: 10 },
        );
    } else {
        pool.push(
            { id: "box-breath", title: "Box breathing 4x4", description: "Inhale‑hold‑exhale‑hold, 4 counts each.", tag: "breathing", xp: 15 },
            { id: "hydrate2", title: "Two glasses of water", description: "Hydrate and log it.", tag: "hydration", xp: 10 },
            { id: "grat-snap", title: "Photo gratitude", description: "Capture one thing you appreciate.", tag: "gratitude", xp: 12 },
        );
    }
    return pool.filter(q => !todayDone.has(q.id)).slice(0, 3);
}

function completeQuest(item) {
    if (activeTask) {
        showToast(`Finish the current task "${activeTask.title}" before starting another.`);
        return;
    }
    const today = todayISO();
    const doneToday = new Set(state.completed[today] || []);
    if (doneToday.has(item.id)) return;

    // If the task has a duration, start timer and require proof
    if (item.duration) {
        activeTask = item;
        taskStartTime = Date.now();
        startTaskTimer(item.duration);
        showToast(`Started timed task: ${item.title}. Please complete and submit proof.`);
        renderUI();
        return;
    }

    const completed = { ...state.completed };
    completed[today] = [...(completed[today] || []), item.id];
    const gained = item.xp ?? 12;
    const newXP = state.xp + gained;
    const newLevel = levelFromXP(newXP);
    const badges = new Set(state.badges);
    if (newLevel >= 3) badges.add("Level 3 Achiever");
    if ((completed[today] || []).length + 1 >= 3) badges.add("Daily Trio");
    if (item.tag === "hydration") badges.add("Hydration Hero");

    state.completed = completed;
    state.xp = newXP;
    state.badges = Array.from(badges);
    state.weeklyProgress = clamp(state.weeklyProgress + 5, 0, 100);

    saveState();
    renderUI();
    showToast(`+${gained} XP! Quest completed: ${item.title}`);
}

function startTaskTimer(durationMinutes) {
    clearInterval(taskTimer);
    let remaining = durationMinutes * 60; // seconds
    document.getElementById('taskTimerContainer').classList.remove('hidden');
    document.getElementById('taskTimerContainer').classList.add('hidden'); // Hide the original small timer
    document.getElementById('taskTimerContainer').classList.remove('hidden'); // Show the overlay timer
    taskTimer = setInterval(() => {
        remaining--;
        updateTaskTimerUI(remaining);
        if (remaining <= 0) {
            clearInterval(taskTimer);
            document.getElementById('taskTimerContainer').classList.add('hidden');
            document.getElementById('proofModal').classList.remove('hidden');
            showToast(`Time's up for task "${activeTask.title}". Please submit proof.`);
        }
    }, 1000);
}

function updateTaskTimerUI(remainingSeconds) {
    const timerDisplay = document.getElementById('taskTimerDisplay');
    const overlayTimerDisplay = document.getElementById('overlayTimerDisplay');

    if (timerDisplay) {
        const minutes = Math.floor(remainingSeconds / 60);
        const seconds = remainingSeconds % 60;
        timerDisplay.textContent = `Time remaining: ${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    if (overlayTimerDisplay) {
        const minutes = Math.floor(remainingSeconds / 60);
        const seconds = remainingSeconds % 60;
        overlayTimerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
}

function submitTaskProof(proofText) {
    if (!activeTask) {
        showToast("No active timed task to submit proof for.");
        return;
    }
    if (!proofText || proofText.trim().length === 0) {
        showToast("Please provide proof text before submitting.");
        return;
    }
    // Mark task as completed with proof
    completeQuest(activeTask);
    activeTask = null;
    clearInterval(taskTimer);
    updateTaskTimerUI(0);
    showToast("Task proof submitted and task completed!");
    renderUI();
}

function logMood() {
    const today = todayISO();
    const note = document.getElementById('moodNote').value;
    const mood = state.moodToday || 3;
    const existing = state.moodLog.filter(m => m.date !== today);
    state.moodLog = [...existing, { date: today, mood: mood, notes: note }];
    document.getElementById('moodNote').value = '';
    showToast(`Logged mood as ${mood}.`);
    saveState();
    renderUI();
}

let miniGameInterval;
function startMiniGame() {
    const phaseText = document.getElementById('phaseText');
    const countText = document.getElementById('countText');
    const bubble = document.getElementById('bubble');
    let phase = "inhale";
    let count = 4;

    const updateDisplay = () => {
        phaseText.textContent = phase;
        countText.textContent = `Count: ${count}`;
        if (phase === "inhale") {
            bubble.style.transform = "scale(1.2)";
            bubble.classList.remove('animate-pulse-slow');
        } else if (phase === "exhale") {
            bubble.style.transform = "scale(0.8)";
            bubble.classList.remove('animate-pulse-slow');
        } else {
            bubble.style.transform = "scale(1)";
            bubble.classList.add('animate-pulse-slow');
        }
    };

    // Set initial state for the bubble animation
    bubble.classList.add('animate-pulse-slow');

    updateDisplay();

    miniGameInterval = setInterval(() => {
        count--;
        if (count < 1) {
            count = 4;
            if (phase === "inhale") phase = "hold";
            else if (phase === "hold") phase = "exhale";
            else phase = "inhale";
        }
        updateDisplay();
    }, 1000);
}

function stopMiniGame() {
    clearInterval(miniGameInterval);
    document.getElementById('miniGameModal').classList.add('hidden');
    completeQuest({ id: 'mini-arcade', xp: 20, title: 'Bubble-Breath' });
}


function renderWorkoutCalendar() {
    const calendarContainer = document.getElementById('workoutCalendar');
    calendarContainer.innerHTML = '';

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Get day of week for first day (0=Sunday, 6=Saturday)
    const startDay = firstDay.getDay();

    // Create empty slots for days before first day
    for (let i = 0; i < startDay; i++) {
        const emptyCell = document.createElement('div');
        calendarContainer.appendChild(emptyCell);
    }

    // Create day cells
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayCell = document.createElement('div');
        dayCell.textContent = day;
        dayCell.className = 'p-1 rounded cursor-pointer select-none hover:bg-blue-200';

        // Highlight if workout completed on this day
        if (state.completed[dateStr]) {
            // Check if any workout-related quests completed on this day
            const completedIds = state.completed[dateStr];
            const workoutCompleted = completedIds.some(id => BASE_ACTIVITIES.find(a => a.id === id && a.tag === 'movement'));
            if (workoutCompleted) {
                dayCell.classList.add('bg-green-400', 'text-white', 'font-semibold');
            }
        }

        // Add click event to show completed quests for the day
        dayCell.addEventListener('click', () => {
            showCompletedQuestsForDate(dateStr);
        });

        calendarContainer.appendChild(dayCell);
    }
}

function calculateWorkoutStreak() {
    const today = new Date();
    let streak = 0;

    // Check consecutive days backwards from today
    for (let i = 0; i < 30; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        const dateStr = checkDate.toISOString().slice(0, 10);

        if (state.completed[dateStr]) {
            const completedIds = state.completed[dateStr];
            const workoutCompleted = completedIds.some(id => BASE_ACTIVITIES.find(a => a.id === id && a.tag === 'movement'));
            if (workoutCompleted) {
                streak++;
            } else {
                break;
            }
        } else {
            break;
        }
    }
    return streak;
}

function renderWorkoutStreak() {
    const streak = calculateWorkoutStreak();
    const streakText = document.getElementById('workoutStreakText');
    streakText.textContent = streak;
}

function showCompletedQuestsForDate(dateStr) {
    const modal = document.getElementById('workoutCalendarModal');
    const completedIds = state.completed[dateStr] || [];
    const allActivities = [...BASE_ACTIVITIES, ...suggestQuests(state)];

    // Create a list of completed quests
    const completedQuests = completedIds.map(id => allActivities.find(a => a.id === id)).filter(Boolean);

    // Add a section to display completed quests
    let questsDisplay = document.getElementById('completedQuestsDisplay');
    if (!questsDisplay) {
        questsDisplay = document.createElement('div');
        questsDisplay.id = 'completedQuestsDisplay';
        questsDisplay.className = 'mt-4 p-4 bg-slate-50 rounded-lg';
        modal.appendChild(questsDisplay);
    }

    if (completedQuests.length > 0) {
        questsDisplay.innerHTML = `
            <h4 class="font-semibold text-slate-800 mb-2">Completed Quests on ${new Date(dateStr).toLocaleDateString()}</h4>
            <ul class="space-y-1">
                ${completedQuests.map(q => `<li class="text-sm text-slate-600">✓ ${q.title} (+${q.xp} XP)</li>`).join('')}
            </ul>
        `;
    } else {
        questsDisplay.innerHTML = `
            <h4 class="font-semibold text-slate-800 mb-2">No Quests Completed on ${new Date(dateStr).toLocaleDateString()}</h4>
            <p class="text-sm text-slate-600">No quests were completed on this date.</p>
        `;
    }
}

// ===============================
// Chat Support
// ===============================
const CHAT_RESPONSES = {
    stress: [
        "Stress is common. Try deep breathing: inhale for 4, hold for 4, exhale for 4.",
        "Remember to take breaks. Even a 5-minute walk can help reset your mind.",
        "Journaling your thoughts can help process stress. What's on your mind?"
    ],
    anxiety: [
        "Anxiety can feel overwhelming. Try the 5-4-3-2-1 grounding technique.",
        "You're not alone in this. Many people feel anxious sometimes.",
        "Focus on the present moment. What can you see, hear, or feel right now?"
    ],
    sad: [
        "Feeling sad is okay. Be kind to yourself during tough times.",
        "Consider reaching out to a friend or doing something you enjoy.",
        "Small steps matter. What’s one thing you can do today to feel a bit better?"
    ],
    tired: [
        "Rest is important for mental health. Have you been getting enough sleep?",
        "Try a short nap or relaxation exercise if you're feeling drained.",
        "Listen to your body. Sometimes we need to slow down and recharge."
    ],
    default: [
        "I'm here to listen. What's been on your mind lately?",
        "Everyone has challenges. You're taking a positive step by reaching out.",
        "How are you feeling right now? I'm here to support you.",
        "Remember, it's okay to ask for help. You're not alone in this."
    ]
};

function getChatResponse(message) {
    const lowerMsg = message.toLowerCase();
    if (lowerMsg.includes('stress') || lowerMsg.includes('overwhelm')) {
        return CHAT_RESPONSES.stress[Math.floor(Math.random() * CHAT_RESPONSES.stress.length)];
    } else if (lowerMsg.includes('anxiety') || lowerMsg.includes('worried') || lowerMsg.includes('nervous')) {
        return CHAT_RESPONSES.anxiety[Math.floor(Math.random() * CHAT_RESPONSES.anxiety.length)];
    } else if (lowerMsg.includes('sad') || lowerMsg.includes('depressed') || lowerMsg.includes('down')) {
        return CHAT_RESPONSES.sad[Math.floor(Math.random() * CHAT_RESPONSES.sad.length)];
    } else if (lowerMsg.includes('tired') || lowerMsg.includes('exhausted') || lowerMsg.includes('sleep')) {
        return CHAT_RESPONSES.tired[Math.floor(Math.random() * CHAT_RESPONSES.tired.length)];
    } else {
        return CHAT_RESPONSES.default[Math.floor(Math.random() * CHAT_RESPONSES.default.length)];
    }
}

function addChatMessage(message, isUser = false) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `p-2 rounded-lg max-w-xs ${isUser ? 'bg-blue-500 text-white ml-auto' : 'bg-white text-slate-800'}`;
    messageDiv.textContent = message;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    if (!message) return;

    addChatMessage(message, true);
    input.value = '';

    // Simulate AI response after a short delay
    setTimeout(() => {
        const response = getChatResponse(message);
        addChatMessage(response);
    }, 1000 + Math.random() * 1000); // Random delay between 1-2 seconds
}

function openChat() {
    const chatPopup = document.getElementById('chatPopup');
    chatPopup.classList.remove('hidden');
    chatPopup.style.width = '400px';
    chatPopup.style.height = '600px';
    document.getElementById('chatInput').focus();
}

function closeChat() {
    document.getElementById('chatPopup').classList.add('hidden');
}

// ===============================
// Camera Mood Detector
// ===============================
let cameraStream = null;
let isCameraActive = false;

// Azure Face API Configuration
const AZURE_ENDPOINT = 'https://your-azure-face-api-endpoint.cognitiveservices.azure.com';
const AZURE_KEY = 'your-azure-face-api-key'; // Replace with your actual key

function initializeCameraMoodDetector() {
    updateCameraStatus('Initializing...');

    // Check if camera is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        updateCameraStatus('Camera not supported');
        return;
    }

    // Automatically start mood detection on page load
    setTimeout(() => {
        startMoodDetection();
    }, 2000); // Delay to allow page to fully load

    // Add event listener for manual detection button
    document.getElementById('detectMoodBtn').addEventListener('click', startMoodDetection);
}

async function startMoodDetection() {
    try {
        updateCameraStatus('Requesting camera access...');

        // Request camera access
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: 'user'
            }
        });

        cameraStream = stream;
        isCameraActive = true;

        // Show camera preview
        const videoElement = document.getElementById('cameraVideo');
        videoElement.srcObject = stream;
        document.getElementById('cameraPreview').classList.remove('hidden');

        updateCameraStatus('Analyzing mood...');

        // Wait for video to load
        await new Promise(resolve => {
            videoElement.onloadedmetadata = resolve;
        });

        // Capture and analyze mood
        await captureAndAnalyzeMood();

    } catch (error) {
        console.error('Camera access error:', error);
        updateCameraStatus('Camera access denied or unavailable');
        showToast('Unable to access camera for mood detection');
    }
}

async function captureAndAnalyzeMood() {
    try {
        const video = document.getElementById('cameraVideo');
        const canvas = document.getElementById('cameraCanvas');
        const context = canvas.getContext('2d');

        // Set canvas size to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw current video frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert canvas to blob for API
        const imageBlob = await new Promise(resolve => {
            canvas.toBlob(resolve, 'image/jpeg', 0.8);
        });

        // Analyze mood using Azure Face API
        const mood = await analyzeMoodWithAzure(imageBlob);

        // Update UI with detected mood
        displayDetectedMood(mood);

        // Auto-select mood button
        selectMoodFromDetection(mood);

        updateCameraStatus('Mood detected successfully');

        // Stop camera after successful detection
        stopCamera();

    } catch (error) {
        console.error('Mood analysis error:', error);
        updateCameraStatus('Mood analysis failed');
        showToast('Failed to analyze mood. Please try again.');
    }
}

async function analyzeMoodWithAzure(imageBlob) {
    try {
        const response = await fetch(`${AZURE_ENDPOINT}/face/v1.0/detect?returnFaceAttributes=emotion`, {
            method: 'POST',
            headers: {
                'Ocp-Apim-Subscription-Key': AZURE_KEY,
                'Content-Type': 'application/octet-stream'
            },
            body: imageBlob
        });

        if (!response.ok) {
            throw new Error(`Azure API error: ${response.status}`);
        }

        const data = await response.json();

        if (data.length === 0) {
            throw new Error('No face detected');
        }

        // Extract emotions from first detected face
        const emotions = data[0].faceAttributes.emotion;

        // Map Azure emotions to our mood scale (1-5)
        return mapEmotionsToMood(emotions);

    } catch (error) {
        console.error('Azure Face API error:', error);
        // Fallback to simulated mood detection for demo
        return simulateMoodDetection();
    }
}

function mapEmotionsToMood(emotions) {
    // Map Azure emotion scores to our 5-point mood scale
    const { happiness, sadness, anger, fear, surprise, neutral, disgust, contempt } = emotions;

    // Calculate weighted mood score
    let moodScore = 3; // Default to neutral

    // Positive emotions increase mood
    moodScore += happiness * 2;
    moodScore += surprise * 0.5;

    // Negative emotions decrease mood
    moodScore -= sadness * 2;
    moodScore -= anger * 2;
    moodScore -= fear * 1.5;
    moodScore -= disgust * 1.5;
    moodScore -= contempt * 1;

    // Neutral has minimal impact
    moodScore += (neutral - 0.5) * 0.2;

    // Clamp to 1-5 range
    return Math.max(1, Math.min(5, Math.round(moodScore)));
}

function simulateMoodDetection() {
    // Fallback simulation for demo purposes
    const moods = [1, 2, 3, 4, 5];
    return moods[Math.floor(Math.random() * moods.length)];
}

function displayDetectedMood(mood) {
    const moodLabels = ['Depressed', 'Sad', 'Neutral', 'Happy', 'Very Happy'];
    const detectedMoodText = document.getElementById('detectedMoodText');
    const detectedMoodDiv = document.getElementById('detectedMood');

    detectedMoodText.textContent = moodLabels[mood - 1];
    detectedMoodDiv.classList.remove('hidden');
}

function selectMoodFromDetection(mood) {
    state.moodToday = mood;
    renderUI();
}

function updateCameraStatus(status) {
    document.getElementById('cameraStatus').textContent = status;
}

function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
        isCameraActive = false;
        document.getElementById('cameraPreview').classList.add('hidden');
    }
}

// Cleanup camera on page unload
window.addEventListener('beforeunload', stopCamera);

window.onload = function() {
    loadState();
    state.moodToday = state.moodLog.find(m => m.date === todayISO())?.mood || 3;
    renderUI();
    renderWorkoutCalendar();
    renderWorkoutStreak();

    // Initialize camera mood detector
    initializeCameraMoodDetector();

    // Event Listeners
    document.getElementById('logMoodBtn').addEventListener('click', logMood);
    document.getElementById('closeMiniGameBtn').addEventListener('click', stopMiniGame);
    document.getElementById('displayNameInput').addEventListener('input', (e) => {
        state.displayName = e.target.value || "You";
        saveState();
        renderUI();
    });

    // Chat event listeners
    document.getElementById('sendChatBtn').addEventListener('click', sendChatMessage);
    document.getElementById('chatInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendChatMessage();
        }
    });

    // Open/close chat popup
    document.getElementById('openChatBtn').addEventListener('click', openChat);
    document.getElementById('closeChatBtn').addEventListener('click', closeChat);

    // Workout calendar modal open/close
    document.getElementById('closeWorkoutCalendarBtn').addEventListener('click', () => {
        document.getElementById('workoutCalendarModal').classList.add('hidden');
    });

    // Header navigation
    document.getElementById('homeLink').addEventListener('click', (e) => {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    document.getElementById('calendarLink').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('workoutCalendarModal').classList.remove('hidden');
    });

    // Task timer and proof submission event listeners
    document.getElementById('cancelTaskBtn').addEventListener('click', () => {
        clearInterval(taskTimer);
        document.getElementById('taskTimerContainer').classList.add('hidden');
        activeTask = null;
        showToast('Task cancelled.');
        renderUI();
    });

    document.getElementById('submitProofBtn').addEventListener('click', () => {
        const proofText = document.getElementById('proofText').value;
        submitTaskProof(proofText);
        document.getElementById('proofModal').classList.add('hidden');
        document.getElementById('proofText').value = '';
    });

    document.getElementById('cancelProofBtn').addEventListener('click', () => {
        document.getElementById('proofModal').classList.add('hidden');
        document.getElementById('proofText').value = '';
        showToast('Proof submission cancelled. Task not completed.');
    });

    // Daily Sticker Event Listener
    document.getElementById('dailySticker').addEventListener('click', () => {
        const messages = [
            "Keep going, you're doing great!",
            "Every step counts!",
            "You got this!",
            "Stay strong and keep pushing!",
            "Small wins lead to big victories!"
        ];
        const randomMsg = messages[Math.floor(Math.random() * messages.length)];
        showToast(randomMsg);
        state.xp += 1;
        saveState();
        renderUI();
    });

    // Add badge notification to chat button
    const chatBtn = document.getElementById('openChatBtn');
    const badge = document.createElement('span');
    badge.id = 'chatNotificationBadge';
    badge.textContent = '1';
    badge.style.position = 'absolute';
    badge.style.top = '4px';
    badge.style.right = '4px';
    badge.style.backgroundColor = 'red';
    badge.style.color = 'white';
    badge.style.borderRadius = '50%';
    badge.style.width = '18px';
    badge.style.height = '18px';
    badge.style.fontSize = '12px';
    badge.style.display = 'flex';
    badge.style.alignItems = 'center';
    badge.style.justifyContent = 'center';
    badge.style.pointerEvents = 'none';
    chatBtn.style.position = 'relative';
    chatBtn.appendChild(badge);

    // Automatically open chat and ask mood on page load
    setTimeout(() => {
        openChat();
        addChatMessage("Assistant: What is your mood right now?");
    }, 1500);

    // Show daily reminder after a short delay
    setTimeout(() => {
        showDailyReminder();
    }, 3000);
};

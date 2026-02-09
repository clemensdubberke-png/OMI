// ===== SCREEN NAVIGATION =====

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

// Main Menu -> Kälte
document.getElementById('kaelte-btn').addEventListener('click', () => {
    showScreen('kaelte-menu');
});

// Kälte -> Main Menu
document.getElementById('back-to-main').addEventListener('click', () => {
    showScreen('main-menu');
});

// Kälte -> Eisdusche Tracker
document.getElementById('eisdusche-btn').addEventListener('click', () => {
    showScreen('tracker-screen');
    showTrackerView('setup-view');
});

// Tracker -> Kälte
document.getElementById('back-to-kaelte').addEventListener('click', () => {
    stopTimer();
    showScreen('kaelte-menu');
});

// Geist & Atem placeholders
document.getElementById('geist-btn').addEventListener('click', () => {
    // Placeholder - future functionality
});
document.getElementById('atem-btn').addEventListener('click', () => {
    // Placeholder - future functionality
});

// ===== TRACKER VIEW SWITCHING =====

function showTrackerView(viewId) {
    document.querySelectorAll('.tracker-view').forEach(v => v.classList.add('hidden'));
    document.getElementById(viewId).classList.remove('hidden');
}

// ===== SLIDERS =====

const prepSlider = document.getElementById('prep-slider');
const tempSlider = document.getElementById('temp-slider');
const durationSlider = document.getElementById('duration-slider');
const prepValue = document.getElementById('prep-value');
const tempValue = document.getElementById('temp-value');
const durationValue = document.getElementById('duration-value');

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

prepSlider.addEventListener('input', () => {
    const val = parseInt(prepSlider.value);
    prepValue.textContent = val === 0 ? 'Aus' : formatTime(val);
});

tempSlider.addEventListener('input', () => {
    tempValue.textContent = `${tempSlider.value}°C`;
});

durationSlider.addEventListener('input', () => {
    durationValue.textContent = formatTime(parseInt(durationSlider.value));
});

// ===== TIMER =====

let timerInterval = null;
let remainingSeconds = 0;
let totalPhaseSeconds = 0;
let currentPhase = 'prep'; // 'prep' or 'shower'
let showerDuration = 0;
let showerTemp = 0;

const timerPhase = document.getElementById('timer-phase');
const timerDisplay = document.getElementById('timer-display');
const timerTempDisplay = document.getElementById('timer-temp');
const progressCircle = document.getElementById('progress-circle');
const circumference = 2 * Math.PI * 90; // r=90

progressCircle.style.strokeDasharray = circumference;

function updateProgress() {
    const progress = remainingSeconds / totalPhaseSeconds;
    const offset = circumference * (1 - progress);
    progressCircle.style.strokeDashoffset = offset;
}

function tick() {
    remainingSeconds--;
    timerDisplay.textContent = formatTime(remainingSeconds);
    updateProgress();

    if (remainingSeconds <= 0) {
        if (currentPhase === 'prep') {
            startShowerPhase();
        } else {
            finishTimer();
        }
    }
}

function startPrepPhase() {
    const prepTime = parseInt(prepSlider.value);
    showerDuration = parseInt(durationSlider.value);
    showerTemp = parseInt(tempSlider.value);

    if (prepTime === 0) {
        startShowerPhase();
        return;
    }

    currentPhase = 'prep';
    remainingSeconds = prepTime;
    totalPhaseSeconds = prepTime;

    timerPhase.textContent = 'VORBEREITUNG';
    timerDisplay.textContent = formatTime(remainingSeconds);
    timerTempDisplay.textContent = '';
    progressCircle.style.stroke = '#4a9eda';
    updateProgress();

    timerInterval = setInterval(tick, 1000);
}

function startShowerPhase() {
    if (timerInterval) clearInterval(timerInterval);

    currentPhase = 'shower';
    remainingSeconds = showerDuration;
    totalPhaseSeconds = showerDuration;

    timerPhase.textContent = 'KALTE DUSCHE';
    timerDisplay.textContent = formatTime(remainingSeconds);
    timerTempDisplay.textContent = `${showerTemp}°C`;
    progressCircle.style.stroke = '#00bfff';
    progressCircle.style.strokeDashoffset = 0;

    // Vibrate to signal start of cold shower
    if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200, 100, 200]);
    }

    timerInterval = setInterval(tick, 1000);
}

function finishTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;

    if (navigator.vibrate) {
        navigator.vibrate([500, 200, 500]);
    }

    document.getElementById('stat-duration').textContent = formatTime(showerDuration);
    document.getElementById('stat-temp').textContent = `${showerTemp}°C`;

    showTrackerView('done-view');
}

function stopTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
    showTrackerView('setup-view');
}

document.getElementById('start-btn').addEventListener('click', () => {
    showerDuration = parseInt(durationSlider.value);
    showerTemp = parseInt(tempSlider.value);
    showTrackerView('timer-view');
    startPrepPhase();
});

document.getElementById('stop-btn').addEventListener('click', () => {
    stopTimer();
});

document.getElementById('done-btn').addEventListener('click', () => {
    showTrackerView('setup-view');
});

// ===== SERVICE WORKER REGISTRATION =====

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
}

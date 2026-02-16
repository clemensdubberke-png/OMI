// ===== AUDIO VOLUME CONFIGURATION =====

const MUSIC_VOLUME = 0.75;
const VOICE_GAIN = 1.25;

let _audioCtx = null;
function boostVoiceClip(audio) {
    try {
        if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const src = _audioCtx.createMediaElementSource(audio);
        const gain = _audioCtx.createGain();
        gain.gain.value = VOICE_GAIN;
        src.connect(gain);
        gain.connect(_audioCtx.destination);
    } catch(e) {}
}

// ===== SOUNDS =====

const clickSound = new Audio('Klick.mp3');
const gongSound = new Audio('Gong.mp3');
clickSound.preload = 'auto';
gongSound.preload = 'auto';

function playClick() {
    if (_audioCtx && _audioCtx.state === 'suspended') _audioCtx.resume();
    clickSound.currentTime = 0;
    clickSound.play().catch(() => {});
}

function playGong() {
    gongSound.currentTime = 0;
    gongSound.play().catch(() => {});
}

// ===== UTILITIES =====

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function showView(parentId, viewId) {
    const parent = document.getElementById(parentId);
    parent.querySelectorAll('.tracker-view').forEach(v => v.classList.add('hidden'));
    document.getElementById(viewId).classList.remove('hidden');
}

const CIRC = 2 * Math.PI * 90;

// ===== RECORDS (localStorage) =====

function loadRecords() {
    try {
        const data = localStorage.getItem('coldshower_records');
        return data ? JSON.parse(data) : {};
    } catch (e) {
        return {};
    }
}

function saveRecords(records) {
    localStorage.setItem('coldshower_records', JSON.stringify(records));
}

function checkAndSaveRecord(category, field, value, lowerIsBetter) {
    const records = loadRecords();
    if (!records[category]) records[category] = {};
    const current = records[category][field];
    let isNew = false;
    if (current === undefined || current === null) {
        isNew = true;
    } else if (lowerIsBetter) {
        isNew = value < current;
    } else {
        isNew = value > current;
    }
    if (isNew) {
        records[category][field] = value;
        saveRecords(records);
    }
    return isNew;
}

function showNewRecordBadge(badgeId, isNew) {
    const badge = document.getElementById(badgeId);
    if (badge) {
        badge.classList.toggle('hidden', !isNew);
    }
}

function updateRecordsDisplay() {
    const records = loadRecords();
    const setVal = (id, val, suffix) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val !== undefined && val !== null ? (suffix ? val + suffix : val) : '--';
    };
    const setTime = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val !== undefined && val !== null ? formatTime(val) : '--';
    };

    // Kälte
    ['eisdusche', 'eisbaden', 'gesicht', 'hand', 'fuss'].forEach(cat => {
        const r = records[cat] || {};
        setVal(`rec-${cat}-temp`, r.coldestTemp, '\u00B0C');
        setTime(`rec-${cat}-time`, r.longestTime);
    });

    // Geist
    const med = records.meditation || {};
    setTime('rec-meditation-time', med.longestSession);

    const atm = records.atmung || {};
    setTime('rec-atmung-retention', atm.longestRetention);

    const lg = records.liegestuetze || {};
    setVal('rec-liegestuetze-count', lg.mostPushups, '');

    // Atem
    const wh = records.wimhof || {};
    setVal('rec-wimhof-rounds', wh.mostRounds, '');
    setTime('rec-wimhof-retention', wh.longestRetention);
}

// Records screen navigation
document.getElementById('records-btn').addEventListener('click', () => {
    playClick();
    updateRecordsDisplay();
    showScreen('records-screen');
});

document.getElementById('back-to-main-records').addEventListener('click', () => {
    playClick();
    showScreen('main-menu');
});

document.getElementById('records-reset').addEventListener('click', () => {
    playClick();
    if (confirm('Alle Rekorde wirklich zurücksetzen?')) {
        localStorage.removeItem('coldshower_records');
        updateRecordsDisplay();
    }
});

// ===== MAIN MENU NAVIGATION =====

document.getElementById('kaelte-btn').addEventListener('click', () => { playClick(); showScreen('kaelte-menu'); });
document.getElementById('back-to-main').addEventListener('click', () => { playClick(); showScreen('main-menu'); });
document.getElementById('geist-btn').addEventListener('click', () => { playClick(); showScreen('geist-menu'); });
document.getElementById('atem-btn').addEventListener('click', () => { playClick(); showScreen('atem-menu'); });
document.getElementById('back-to-main-atem').addEventListener('click', () => { playClick(); showScreen('main-menu'); });
document.getElementById('back-to-main-geist').addEventListener('click', () => { playClick(); showScreen('main-menu'); });

// Back buttons for all tracker screens
document.querySelectorAll('.back-to-kaelte').forEach(btn => {
    btn.addEventListener('click', () => {
        playClick();
        stopAllTimers();
        showScreen('kaelte-menu');
    });
});

// ===== KÄLTE MENU ITEMS =====

document.querySelectorAll('.kaelte-item').forEach(item => {
    item.addEventListener('click', () => {
        playClick();
        const target = item.dataset.target;
        if (target === 'eisdusche') {
            showScreen('tracker-eisdusche');
            showView('tracker-eisdusche', 'eisdusche-setup');
        } else if (target === 'eisbaden') {
            showScreen('tracker-eisbaden');
            showView('tracker-eisbaden', 'eisbaden-setup');
        } else if (target === 'gesicht' || target === 'hand' || target === 'fuss') {
            openRoundsTracker(target);
        }
    });
});

// ===== COUNTDOWN TRACKER (shared for Eisdusche & Eisbaden) =====

function createCountdownTracker(prefix, screenId, activityLabel) {
    const els = {
        prep: document.getElementById(`${prefix}-prep`),
        temp: document.getElementById(`${prefix}-temp`),
        dur: document.getElementById(`${prefix}-dur`),
        prepVal: document.getElementById(`${prefix}-prep-val`),
        tempVal: document.getElementById(`${prefix}-temp-val`),
        durVal: document.getElementById(`${prefix}-dur-val`),
        phase: document.getElementById(`${prefix}-phase`),
        display: document.getElementById(`${prefix}-display`),
        tempShow: document.getElementById(`${prefix}-temp-show`),
        progress: document.querySelector(`.${prefix}-progress`),
        statDur: document.getElementById(`${prefix}-stat-dur`),
        statTemp: document.getElementById(`${prefix}-stat-temp`),
    };

    els.progress.style.strokeDasharray = CIRC;

    let interval = null;
    let remaining = 0;
    let total = 0;
    let phase = 'prep';
    let duration = 0;
    let temp = 0;

    // Slider listeners
    els.prep.addEventListener('input', () => {
        const v = parseInt(els.prep.value);
        els.prepVal.textContent = v === 0 ? 'Aus' : formatTime(v);
    });
    els.temp.addEventListener('input', () => {
        els.tempVal.textContent = `${els.temp.value}°C`;
    });
    els.dur.addEventListener('input', () => {
        els.durVal.textContent = formatTime(parseInt(els.dur.value));
    });

    function updateProgress() {
        const offset = CIRC * (1 - remaining / total);
        els.progress.style.strokeDashoffset = offset;
    }

    function tick() {
        remaining--;
        els.display.textContent = formatTime(remaining);
        updateProgress();
        if (remaining <= 0) {
            if (phase === 'prep') startMain();
            else finish();
        }
    }

    function startPrep() {
        duration = parseInt(els.dur.value);
        temp = parseInt(els.temp.value);
        const prepTime = parseInt(els.prep.value);
        if (prepTime === 0) { startMain(); return; }
        phase = 'prep';
        remaining = prepTime;
        total = prepTime;
        els.phase.textContent = 'VORBEREITUNG';
        els.display.textContent = formatTime(remaining);
        els.tempShow.textContent = '';
        els.progress.style.stroke = '#4a9eda';
        els.progress.style.strokeDashoffset = 0;
        interval = setInterval(tick, 1000);
    }

    function startMain() {
        if (interval) clearInterval(interval);
        phase = 'main';
        remaining = duration;
        total = duration;
        els.phase.textContent = activityLabel;
        els.display.textContent = formatTime(remaining);
        els.tempShow.textContent = `${temp}°C`;
        els.progress.style.stroke = '#00bfff';
        els.progress.style.strokeDashoffset = 0;
        if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
        interval = setInterval(tick, 1000);
    }

    function finish() {
        if (interval) clearInterval(interval);
        interval = null;
        playGong();
        if (navigator.vibrate) navigator.vibrate([500, 200, 500]);
        els.statDur.textContent = formatTime(duration);
        els.statTemp.textContent = `${temp}°C`;
        // Save records
        const category = prefix === 'ed' ? 'eisdusche' : 'eisbaden';
        const newTemp = checkAndSaveRecord(category, 'coldestTemp', temp, true);
        const newTime = checkAndSaveRecord(category, 'longestTime', duration, false);
        showNewRecordBadge(`${prefix}-new-record`, newTemp || newTime);
        showView(screenId, `${setupId}-done`);
    }

    function stop() {
        if (interval) clearInterval(interval);
        interval = null;
    }

    // Wire buttons
    const setupId = prefix === 'ed' ? 'eisdusche' : 'eisbaden';
    document.getElementById(`${prefix}-start`).addEventListener('click', () => {
        playClick();
        showView(screenId, `${setupId}-timer`);
        startPrep();
    });
    document.getElementById(`${prefix}-stop`).addEventListener('click', () => {
        playClick();
        stop();
        showView(screenId, `${setupId}-setup`);
    });
    document.getElementById(`${prefix}-done`).addEventListener('click', () => {
        playClick();
        showView(screenId, `${setupId}-setup`);
    });

    return { stop };
}

const eisduscheTracker = createCountdownTracker('ed', 'tracker-eisdusche', 'KALTE DUSCHE');
const eisbadenTracker = createCountdownTracker('eb', 'tracker-eisbaden', 'EISBADEN');

// ===== ROUNDS TRACKER (Gesicht / Hand / Fuß) =====

const roundsConfig = {
    gesicht: { title: 'GESICHT INS EIS', img: 'gesicht.jpg' },
    hand: { title: 'HAND INS EIS', img: 'hand.jpg' },
    fuss: { title: 'FUSS INS EIS', img: 'fuss.jpg' },
};

let roundsInterval = null;
let roundsElapsed = 0;
let roundsData = [];
let currentRoundsType = 'gesicht';

function openRoundsTracker(type) {
    currentRoundsType = type;
    const cfg = roundsConfig[type];
    document.getElementById('rounds-title').textContent = cfg.title;
    document.getElementById('rounds-icon').src = cfg.img;
    showScreen('tracker-rounds');
    showView('tracker-rounds', 'rounds-setup');
}

document.getElementById('rounds-temp').addEventListener('input', () => {
    document.getElementById('rounds-temp-val').textContent =
        `${document.getElementById('rounds-temp').value}°C`;
});

document.getElementById('rounds-start').addEventListener('click', () => {
    playClick();
    roundsData = [];
    roundsElapsed = 0;
    document.getElementById('rounds-stop-round').style.display = '';
    document.getElementById('rounds-next-round').style.display = 'none';
    showView('tracker-rounds', 'rounds-active');
    startNewRound();
});

function startNewRound() {
    roundsElapsed = 0;
    const roundNum = roundsData.length + 1;
    document.getElementById('rounds-phase').textContent = `RUNDE ${roundNum}`;
    document.getElementById('rounds-display').textContent = '0:00';
    document.getElementById('rounds-temp-show').textContent =
        `${document.getElementById('rounds-temp').value}°C`;
    updateRoundsInfo();
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    roundsInterval = setInterval(() => {
        roundsElapsed++;
        document.getElementById('rounds-display').textContent = formatTime(roundsElapsed);
    }, 1000);
}

function updateRoundsInfo() {
    const info = document.getElementById('rounds-info');
    if (roundsData.length === 0) {
        info.innerHTML = '';
        return;
    }
    info.innerHTML = roundsData.map((r, i) =>
        `<div class="round-result">Runde ${i + 1}: <strong>${formatTime(r)}</strong></div>`
    ).join('');
}

document.getElementById('rounds-stop-round').addEventListener('click', () => {
    playClick();
    if (roundsInterval) clearInterval(roundsInterval);
    roundsInterval = null;
    roundsData.push(roundsElapsed);
    if (navigator.vibrate) navigator.vibrate([300]);
    updateRoundsInfo();
    document.getElementById('rounds-phase').textContent = 'PAUSE';
    document.getElementById('rounds-display').textContent = formatTime(roundsElapsed);
    document.getElementById('rounds-stop-round').style.display = 'none';
    document.getElementById('rounds-next-round').style.display = '';
});

document.getElementById('rounds-next-round').addEventListener('click', () => {
    playClick();
    document.getElementById('rounds-next-round').style.display = 'none';
    document.getElementById('rounds-stop-round').style.display = '';
    startNewRound();
});

document.getElementById('rounds-finish').addEventListener('click', () => {
    playClick();
    if (roundsInterval) {
        clearInterval(roundsInterval);
        roundsInterval = null;
        if (roundsElapsed > 0) roundsData.push(roundsElapsed);
    }
    if (navigator.vibrate) navigator.vibrate([500, 200, 500]);
    const totalSecs = roundsData.reduce((a, b) => a + b, 0);
    const longestRound = roundsData.length > 0 ? Math.max(...roundsData) : 0;
    const temp = parseInt(document.getElementById('rounds-temp').value);
    // Summary
    document.getElementById('rounds-summary').innerHTML = roundsData.map((r, i) =>
        `<div class="round-result">Runde ${i + 1}: <strong>${formatTime(r)}</strong></div>`
    ).join('');
    document.getElementById('rounds-stat-count').textContent = roundsData.length;
    document.getElementById('rounds-stat-total').textContent = formatTime(totalSecs);
    document.getElementById('rounds-stat-temp').textContent = `${temp}°C`;
    // Save records
    const newTemp = checkAndSaveRecord(currentRoundsType, 'coldestTemp', temp, true);
    const newTime = checkAndSaveRecord(currentRoundsType, 'longestTime', longestRound, false);
    showNewRecordBadge('rounds-new-record', newTemp || newTime);
    showView('tracker-rounds', 'rounds-done');
});

document.getElementById('rounds-done-btn').addEventListener('click', () => {
    playClick();
    showView('tracker-rounds', 'rounds-setup');
});

// ===== MEDITATION TRACKER =====

document.getElementById('meditation-btn').addEventListener('click', () => {
    playClick();
    showScreen('tracker-meditation');
    showView('tracker-meditation', 'meditation-setup');
});

document.getElementById('back-to-geist').addEventListener('click', () => {
    playClick();
    stopMeditation();
    showScreen('geist-menu');
});

const medProgress = document.querySelector('.med-progress');
medProgress.style.strokeDasharray = CIRC;

let medInterval = null;
let medRemaining = 0;
let medTotal = 0;
let medMusic = null;
let musicEnabled = false;
let selectedMusicSrc = '';
let medVoiceEnabled = false;
let medVoiceInterval = null;

// Meditation focus voice clips
const medFocusVoices = [
    new Audio('lass deine Gedanken los.mp3'),
    new Audio('kehre zurück zu deinem Atem.mp3'),
    new Audio('spüre deinen Atem.mp3'),
    new Audio('Bleibe bei deinem Atem.mp3'),
];
medFocusVoices.forEach(a => { a.preload = 'auto'; boostVoiceClip(a); });

// Music toggle
const musicToggle = document.getElementById('med-music-toggle');
const musicOptions = document.getElementById('med-music-options');

musicToggle.addEventListener('click', () => {
    playClick();
    musicEnabled = !musicEnabled;
    musicToggle.classList.toggle('active', musicEnabled);
    musicOptions.classList.toggle('hidden', !musicEnabled);
    if (!musicEnabled) {
        selectedMusicSrc = '';
    } else {
        const sel = musicOptions.querySelector('.music-option.selected');
        if (sel) selectedMusicSrc = sel.dataset.src;
    }
});

// Music song selection
document.querySelectorAll('.music-option').forEach(opt => {
    opt.addEventListener('click', () => {
        playClick();
        document.querySelectorAll('.music-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        selectedMusicSrc = opt.dataset.src;
    });
});

// Meditation voice toggle
const medVoiceToggle = document.getElementById('med-voice-toggle');
medVoiceToggle.addEventListener('click', () => {
    playClick();
    medVoiceEnabled = !medVoiceEnabled;
    medVoiceToggle.classList.toggle('active', medVoiceEnabled);
});

document.getElementById('med-dur').addEventListener('input', () => {
    const v = parseInt(document.getElementById('med-dur').value);
    document.getElementById('med-dur-val').textContent = formatTime(v);
});

document.getElementById('med-start').addEventListener('click', () => {
    playClick();
    medTotal = parseInt(document.getElementById('med-dur').value);
    medRemaining = medTotal;
    document.getElementById('med-display').textContent = formatTime(medRemaining);
    document.getElementById('med-phase').textContent = 'MEDITATION';
    medProgress.style.stroke = '#c8a050';
    medProgress.style.strokeDashoffset = 0;
    showView('tracker-meditation', 'meditation-timer');
    // Start music if enabled and selected
    if (musicEnabled && selectedMusicSrc) {
        medMusic = new Audio(selectedMusicSrc);
        medMusic.volume = MUSIC_VOLUME;
        medMusic.loop = true;
        medMusic.play().catch(() => {});
    }
    // Start focus voice if enabled
    if (medVoiceEnabled) {
        medVoiceInterval = setInterval(() => {
            const clip = medFocusVoices[Math.floor(Math.random() * medFocusVoices.length)];
            clip.currentTime = 0;
            clip.play().catch(() => {});
        }, 45000);
    }
    medInterval = setInterval(() => {
        medRemaining--;
        document.getElementById('med-display').textContent = formatTime(medRemaining);
        const offset = CIRC * (1 - medRemaining / medTotal);
        medProgress.style.strokeDashoffset = offset;
        if (medRemaining <= 0) {
            clearInterval(medInterval);
            medInterval = null;
            if (medVoiceInterval) { clearInterval(medVoiceInterval); medVoiceInterval = null; }
            stopMusicFadeOut();
            playGong();
            if (navigator.vibrate) navigator.vibrate([500, 200, 500]);
            document.getElementById('med-stat-dur').textContent = formatTime(medTotal);
            // Save records
            const newRecord = checkAndSaveRecord('meditation', 'longestSession', medTotal, false);
            showNewRecordBadge('med-new-record', newRecord);
            showView('tracker-meditation', 'meditation-done');
        }
    }, 1000);
});

document.getElementById('med-stop').addEventListener('click', () => {
    playClick();
    stopMeditation();
    showView('tracker-meditation', 'meditation-setup');
});

document.getElementById('med-done').addEventListener('click', () => {
    playClick();
    showView('tracker-meditation', 'meditation-setup');
});

function stopMusicFadeOut() {
    if (!medMusic) return;
    let vol = medMusic.volume;
    const fade = setInterval(() => {
        vol -= 0.1;
        if (vol <= 0) {
            clearInterval(fade);
            medMusic.pause();
            medMusic = null;
        } else {
            medMusic.volume = vol;
        }
    }, 150);
}

function stopMeditation() {
    if (medInterval) { clearInterval(medInterval); medInterval = null; }
    if (medVoiceInterval) { clearInterval(medVoiceInterval); medVoiceInterval = null; }
    if (medMusic) { medMusic.pause(); medMusic = null; }
}

// ===== MEDITATIONS-ATMUNG (Wim Hof) =====

document.getElementById('atemmeditation-btn').addEventListener('click', () => {
    playClick();
    showScreen('tracker-atmung');
    showView('tracker-atmung', 'atmung-setup');
});

document.getElementById('back-to-geist-atmung').addEventListener('click', () => {
    playClick();
    stopAtmung();
    showScreen('geist-menu');
});

let atmInterval = null;
let atmMusic = null;
let atmMusicEnabled = false;
let atmSelectedSrc = '';
let atmRetentionSeconds = 0;
let atmBreathSoundEnabled = false;
const inhaleSound = new Audio('Einatmung.mp3');
const exhaleSound = new Audio('Ausatmung.mp3');
inhaleSound.preload = 'auto';
exhaleSound.preload = 'auto';

// Music toggle for Atmung
const atmToggle = document.getElementById('atm-music-toggle');
const atmOptions = document.getElementById('atm-music-options');

atmToggle.addEventListener('click', () => {
    playClick();
    atmMusicEnabled = !atmMusicEnabled;
    atmToggle.classList.toggle('active', atmMusicEnabled);
    atmOptions.classList.toggle('hidden', !atmMusicEnabled);
    if (!atmMusicEnabled) {
        atmSelectedSrc = '';
    } else {
        const sel = atmOptions.querySelector('.music-option.selected');
        if (sel) atmSelectedSrc = sel.dataset.src;
    }
});

// Breath sounds toggle
const breathSoundToggle = document.getElementById('atm-breath-sound-toggle');
breathSoundToggle.addEventListener('click', () => {
    playClick();
    atmBreathSoundEnabled = !atmBreathSoundEnabled;
    breathSoundToggle.classList.toggle('active', atmBreathSoundEnabled);
});

// Voice guidance toggle + sounds
let atmVoiceEnabled = false;
const voiceToggle = document.getElementById('atm-voice-toggle');
voiceToggle.addEventListener('click', () => {
    playClick();
    atmVoiceEnabled = !atmVoiceEnabled;
    voiceToggle.classList.toggle('active', atmVoiceEnabled);
});

const voiceAtmeEin = new Audio('atme ein.mp3');
const voiceAusatmen = new Audio('ausatmen.mp3');
const voiceEinatmen = new Audio('Einatmen.mp3');
const voiceEin = new Audio('ein.mp3');
const voiceAus = new Audio('aus.mp3');
const voiceUndAus = new Audio('und aus.mp3');
const voiceFolge = new Audio('Folge dem Fluss deines atems ohne Pause dazwischen.mp3');
[voiceAtmeEin, voiceAusatmen, voiceEinatmen, voiceEin, voiceAus, voiceUndAus, voiceFolge].forEach(a => { a.preload = 'auto'; boostVoiceClip(a); });

function playVoice(audio) {
    if (!atmVoiceEnabled) return;
    audio.currentTime = 0;
    audio.play().catch(() => {});
}

// Voice schedule: { breathNumber: { inhale: Audio|null, exhale: Audio|null } }
const voiceSchedule = {
    1:  { inhale: voiceAtmeEin,  exhale: voiceAusatmen },
    2:  { inhale: voiceEinatmen, exhale: voiceAusatmen },
    // 3-5: silence (~10 seconds)
    6:  { inhale: voiceEin, exhale: voiceAus },
    7:  { inhale: voiceEin, exhale: voiceAus },
    8:  { inhale: voiceEin, exhale: voiceAus },
    9:  { inhale: voiceEin, exhale: voiceAus },
    10: { inhale: voiceEin, exhale: voiceAus },
    // 11-13: silence
    14: { inhale: voiceEinatmen, exhale: voiceUndAus },
    15: { inhale: voiceEin,     exhale: voiceUndAus },
    16: { inhale: voiceEin,     exhale: voiceAus },
    // 17-19: silence
    20: { inhale: voiceFolge,   exhale: null },
    // 21-25: silence (meditative)
    26: { inhale: voiceAtmeEin, exhale: voiceUndAus },
    27: { inhale: voiceEin, exhale: voiceAus },
    28: { inhale: voiceEin, exhale: voiceAus },
    29: { inhale: voiceEin, exhale: voiceAus },
    30: { inhale: voiceEin, exhale: voiceAus },
};

atmOptions.querySelectorAll('.music-option').forEach(opt => {
    opt.addEventListener('click', () => {
        playClick();
        atmOptions.querySelectorAll('.music-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        atmSelectedSrc = opt.dataset.src;
    });
});

document.getElementById('atm-start').addEventListener('click', () => {
    playClick();
    // Start music
    if (atmMusicEnabled && atmSelectedSrc) {
        atmMusic = new Audio(atmSelectedSrc);
        atmMusic.volume = MUSIC_VOLUME;
        atmMusic.loop = true;
        atmMusic.play().catch(() => {});
    }
    showView('tracker-atmung', 'atmung-breathing');
    startBreathingPhase();
});

// --- Breathing Phase: 30 breaths, Wim Hof rhythm ---
// ~0.9s inhale, ~0.6s exhale = ~1.5s per cycle

function startBreathingPhase() {
    const img = document.getElementById('atm-breath-img');
    const phase = document.getElementById('atm-phase');
    const count = document.getElementById('atm-count');
    const instruction = document.getElementById('atm-instruction');
    let breath = 0;
    const totalBreaths = 30;
    const inhaleMs = 2000;
    const exhaleMs = 1000;

    function doInhale() {
        breath++;
        if (breath > totalBreaths) {
            startRetentionPhase();
            return;
        }
        count.textContent = `${breath} / ${totalBreaths}`;
        phase.textContent = 'EINATMEN';
        instruction.textContent = 'Atme tief ein...';
        img.style.transition = `transform ${(inhaleMs * 0.9) / 1000}s ease-in-out`;
        img.classList.remove('atm-exhale');
        img.classList.add('atm-inhale');
        if (atmBreathSoundEnabled) { inhaleSound.currentTime = 0; inhaleSound.play().catch(() => {}); }
        const vs = voiceSchedule[breath];
        if (vs && vs.inhale) playVoice(vs.inhale);
        if (navigator.vibrate) navigator.vibrate(50);
        atmInterval = setTimeout(doExhale, inhaleMs);
    }

    function doExhale() {
        phase.textContent = 'AUSATMEN';
        instruction.textContent = 'Langsam ausatmen...';
        img.style.transition = `transform ${(exhaleMs * 0.9) / 1000}s ease-in-out`;
        img.classList.remove('atm-inhale');
        img.classList.add('atm-exhale');
        if (atmBreathSoundEnabled) { exhaleSound.currentTime = 0; exhaleSound.play().catch(() => {}); }
        const vs = voiceSchedule[breath];
        if (vs && vs.exhale) playVoice(vs.exhale);
        atmInterval = setTimeout(doInhale, exhaleMs);
    }

    doInhale();
}

// --- Retention Phase ---

// Retention voice clips
const voiceHalteAtem = new Audio('halte deinen Atem so lange wie möglich an.mp3');
const voiceKribbeln = new Audio('wenn Hände und füße Kribbeln oder körpertemperatur ändert, ist das normal.mp3');
const voiceSeiEinfach = new Audio('sei einfach in diesem Moment.mp3');
const voiceHerzschlag = new Audio('spüre deinen Herzschlag.mp3');
const voiceEineMinute = new Audio('eine Minute.mp3');
const voiceZweiMinuten = new Audio('zwei Minuten.mp3');
const voiceDreiMinuten = new Audio('drei Minuten.mp3');
const voiceVierMinuten = new Audio('vier Minuten.mp3');
const voiceFuenfMinuten = new Audio('fünf Minuten.mp3');
[voiceHalteAtem, voiceKribbeln, voiceSeiEinfach, voiceHerzschlag,
 voiceEineMinute, voiceZweiMinuten, voiceDreiMinuten, voiceVierMinuten, voiceFuenfMinuten
].forEach(a => { a.preload = 'auto'; boostVoiceClip(a); });

const retentionRandomClips = [voiceKribbeln, voiceSeiEinfach, voiceHerzschlag];
const retentionMinuteClips = {
    60: voiceEineMinute,
    120: voiceZweiMinuten,
    180: voiceDreiMinuten,
    240: voiceVierMinuten,
    300: voiceFuenfMinuten,
};

let retentionVoiceInterval = null;

function startRetentionPhase() {
    showView('tracker-atmung', 'atmung-retention');
    atmRetentionSeconds = 0;
    document.getElementById('atm-retention-display').textContent = '0:00';

    // Play initial retention voice
    if (atmVoiceEnabled) {
        voiceHalteAtem.currentTime = 0;
        voiceHalteAtem.play().catch(() => {});
    }

    atmInterval = setInterval(() => {
        atmRetentionSeconds++;
        document.getElementById('atm-retention-display').textContent = formatTime(atmRetentionSeconds);

        // Voice at minute marks
        if (atmVoiceEnabled && retentionMinuteClips[atmRetentionSeconds]) {
            const clip = retentionMinuteClips[atmRetentionSeconds];
            clip.currentTime = 0;
            clip.play().catch(() => {});
        }
    }, 1000);

    // Random voice every 30 seconds
    if (atmVoiceEnabled) {
        retentionVoiceInterval = setInterval(() => {
            // Skip if a minute marker is playing at the same time
            if (!retentionMinuteClips[atmRetentionSeconds]) {
                const clip = retentionRandomClips[Math.floor(Math.random() * retentionRandomClips.length)];
                clip.currentTime = 0;
                clip.play().catch(() => {});
            }
        }, 30000);
    }
}

// Double-tap to end retention (same as Wim Hof)
let atmLastTap = 0;
document.getElementById('atmung-retention').addEventListener('click', (e) => {
    const now = Date.now();
    if (now - atmLastTap < 400) {
        // Double-tap detected
        playClick();
        if (atmInterval) { clearInterval(atmInterval); atmInterval = null; }
        if (retentionVoiceInterval) { clearInterval(retentionVoiceInterval); retentionVoiceInterval = null; }
        atmLastTap = 0;
        startRecoveryPhase();
    } else {
        atmLastTap = now;
    }
});

// --- Recovery Breath: inhale and hold 15s ---

function startRecoveryPhase() {
    showView('tracker-atmung', 'atmung-recovery');
    let remaining = 15;
    document.getElementById('atm-recovery-display').textContent = '0:15';
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    atmInterval = setInterval(() => {
        remaining--;
        document.getElementById('atm-recovery-display').textContent = formatTime(remaining);
        if (remaining <= 0) {
            clearInterval(atmInterval);
            atmInterval = null;
            finishAtmung();
        }
    }, 1000);
}

function finishAtmung() {
    // Fade out music
    if (atmMusic) {
        let vol = atmMusic.volume;
        const fade = setInterval(() => {
            vol -= 0.1;
            if (vol <= 0) {
                clearInterval(fade);
                atmMusic.pause();
                atmMusic = null;
            } else {
                atmMusic.volume = vol;
            }
        }, 150);
    }
    playGong();
    if (navigator.vibrate) navigator.vibrate([500, 200, 500]);
    document.getElementById('atm-stat-retention').textContent = formatTime(atmRetentionSeconds);
    // Save records
    const newRecord = checkAndSaveRecord('atmung', 'longestRetention', atmRetentionSeconds, false);
    showNewRecordBadge('atm-new-record', newRecord);
    showView('tracker-atmung', 'atmung-done');
}

document.getElementById('atm-done').addEventListener('click', () => {
    playClick();
    showView('tracker-atmung', 'atmung-setup');
});

function stopAtmung() {
    if (atmInterval) { clearTimeout(atmInterval); clearInterval(atmInterval); atmInterval = null; }
    if (retentionVoiceInterval) { clearInterval(retentionVoiceInterval); retentionVoiceInterval = null; }
    if (atmMusic) { atmMusic.pause(); atmMusic = null; }
}

// ===== LIEGESTÜTZE (Wim Hof Pushups) =====

document.getElementById('liegestuetze-btn').addEventListener('click', () => {
    playClick();
    showScreen('tracker-liegestuetze');
    showView('tracker-liegestuetze', 'lg-safety');
});

document.getElementById('back-to-geist-lg').addEventListener('click', () => {
    playClick();
    stopLiegestuetze();
    showScreen('geist-menu');
});

let lgInterval = null;
let lgRetentionSeconds = 0;
let lgPushupCount = 0;
let lgBreathSoundEnabled = false;
const lgTotalBreaths = 35;

let lgVoiceEnabled = false;

const lgBreathToggle = document.getElementById('lg-breath-sound-toggle');
lgBreathToggle.addEventListener('click', () => {
    playClick();
    lgBreathSoundEnabled = !lgBreathSoundEnabled;
    lgBreathToggle.classList.toggle('active', lgBreathSoundEnabled);
});

const lgVoiceToggle = document.getElementById('lg-voice-toggle');
lgVoiceToggle.addEventListener('click', () => {
    playClick();
    lgVoiceEnabled = !lgVoiceEnabled;
    lgVoiceToggle.classList.toggle('active', lgVoiceEnabled);
});

function playLgVoice(audio) {
    if (!lgVoiceEnabled) return;
    audio.currentTime = 0;
    audio.play().catch(() => {});
}

// Voice schedule for Liegestütze (35 breaths)
const lgVoiceSchedule = {
    1:  { inhale: voiceAtmeEin,  exhale: voiceAusatmen },
    2:  { inhale: voiceEinatmen, exhale: voiceAusatmen },
    // 3-5: silence
    6:  { inhale: voiceEin, exhale: voiceAus },
    7:  { inhale: voiceEin, exhale: voiceAus },
    8:  { inhale: voiceEin, exhale: voiceAus },
    9:  { inhale: voiceEin, exhale: voiceAus },
    10: { inhale: voiceEin, exhale: voiceAus },
    // 11-13: silence
    14: { inhale: voiceEinatmen, exhale: voiceUndAus },
    15: { inhale: voiceEin,     exhale: voiceUndAus },
    16: { inhale: voiceEin,     exhale: voiceAus },
    // 17-19: silence
    20: { inhale: voiceFolge,   exhale: null },
    // 21-25: silence
    26: { inhale: voiceAtmeEin, exhale: voiceUndAus },
    27: { inhale: voiceEin, exhale: voiceAus },
    28: { inhale: voiceEin, exhale: voiceAus },
    29: { inhale: voiceEin, exhale: voiceAus },
    30: { inhale: voiceEin, exhale: voiceAus },
    // 31-33: silence
    34: { inhale: voiceEinatmen, exhale: voiceUndAus },
    35: { inhale: voiceEin,     exhale: voiceAus },
};

document.getElementById('lg-start').addEventListener('click', () => {
    playClick();
    showView('tracker-liegestuetze', 'lg-breathing');
    startLgBreathing();
});

function startLgBreathing() {
    const img = document.getElementById('lg-breath-img');
    const phase = document.getElementById('lg-phase');
    const count = document.getElementById('lg-count');
    const instruction = document.getElementById('lg-instruction');
    let breath = 0;
    const inhaleMs = 2000;
    const exhaleMs = 1000;

    function doInhale() {
        breath++;
        if (breath > lgTotalBreaths) {
            startLgPushups();
            return;
        }
        count.textContent = `${breath} / ${lgTotalBreaths}`;
        phase.textContent = 'EINATMEN';
        instruction.textContent = 'Atme tief ein...';
        img.style.transition = `transform ${(inhaleMs * 0.9) / 1000}s ease-in-out`;
        img.classList.remove('atm-exhale');
        img.classList.add('atm-inhale');
        if (lgBreathSoundEnabled) { inhaleSound.currentTime = 0; inhaleSound.play().catch(() => {}); }
        const vs = lgVoiceSchedule[breath];
        if (vs && vs.inhale) playLgVoice(vs.inhale);
        if (navigator.vibrate) navigator.vibrate(50);
        lgInterval = setTimeout(doExhale, inhaleMs);
    }

    function doExhale() {
        phase.textContent = 'AUSATMEN';
        instruction.textContent = 'Loslassen...';
        img.style.transition = `transform ${(exhaleMs * 0.9) / 1000}s ease-in-out`;
        img.classList.remove('atm-inhale');
        img.classList.add('atm-exhale');
        if (lgBreathSoundEnabled) { exhaleSound.currentTime = 0; exhaleSound.play().catch(() => {}); }
        const vs = lgVoiceSchedule[breath];
        if (vs && vs.exhale) playLgVoice(vs.exhale);
        lgInterval = setTimeout(doInhale, exhaleMs);
    }

    doInhale();
}

function startLgPushups() {
    showView('tracker-liegestuetze', 'lg-pushups');
    lgRetentionSeconds = 0;
    lgPushupCount = 0;
    document.getElementById('lg-retention-display').textContent = '0:00';
    document.getElementById('lg-pushup-num').textContent = '0';
    if (navigator.vibrate) navigator.vibrate([300, 100, 300]);
    lgInterval = setInterval(() => {
        lgRetentionSeconds++;
        document.getElementById('lg-retention-display').textContent = formatTime(lgRetentionSeconds);
    }, 1000);
}

document.getElementById('lg-tap').addEventListener('click', () => {
    lgPushupCount++;
    document.getElementById('lg-pushup-num').textContent = lgPushupCount;
    if (navigator.vibrate) navigator.vibrate(30);
});

document.getElementById('lg-finish').addEventListener('click', () => {
    playClick();
    if (lgInterval) { clearInterval(lgInterval); lgInterval = null; }
    playGong();
    if (navigator.vibrate) navigator.vibrate([500, 200, 500]);
    document.getElementById('lg-stat-breaths').textContent = lgTotalBreaths;
    document.getElementById('lg-stat-pushups').textContent = lgPushupCount;
    document.getElementById('lg-stat-retention').textContent = formatTime(lgRetentionSeconds);
    // Save records
    const newRecord = checkAndSaveRecord('liegestuetze', 'mostPushups', lgPushupCount, false);
    showNewRecordBadge('lg-new-record', newRecord);
    showView('tracker-liegestuetze', 'lg-done');
});

document.getElementById('lg-done-btn').addEventListener('click', () => {
    playClick();
    showView('tracker-liegestuetze', 'lg-safety');
});

function stopLiegestuetze() {
    if (lgInterval) { clearTimeout(lgInterval); clearInterval(lgInterval); lgInterval = null; }
}

// ===== WIM HOF ATEMTECHNIK =====

document.getElementById('wimhof-btn').addEventListener('click', () => {
    playClick();
    showScreen('tracker-wimhof');
    showView('tracker-wimhof', 'wh-setup');
});

document.getElementById('back-to-atem').addEventListener('click', () => {
    playClick();
    stopWimhof();
    showScreen('atem-menu');
});

let whInterval = null;
let whMusic = null;
let whMusicEnabled = false;
let whSelectedSrc = '';
let whCurrentRound = 0;
let whTotalRounds = 3;
let whRetentionSeconds = 0;
let whRoundRetentions = [];
let whBreathsPerRound = 30;
let whBreathSoundEnabled = false;
let whVoiceEnabled = false;
let whRetentionGuideEnabled = false;
let whRetentionVoiceInterval = null;
let whRecoveryDuration = 15;
let whPauseDuration = 3;

const whSpeeds = {
    slow:   { inhale: 2700, exhale: 1500 },
    medium: { inhale: 2000, exhale: 1000 },
    fast:   { inhale: 1300, exhale: 700 },
};
let whSpeed = 'medium';

// Speed selector
document.querySelectorAll('#wh-speed-selector .speed-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        playClick();
        document.querySelectorAll('#wh-speed-selector .speed-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        whSpeed = btn.dataset.speed;
    });
});

// Rounds slider
document.getElementById('wh-rounds').addEventListener('input', () => {
    document.getElementById('wh-rounds-val').textContent = document.getElementById('wh-rounds').value;
});

// Breaths per round slider
document.getElementById('wh-breaths').addEventListener('input', () => {
    document.getElementById('wh-breaths-val').textContent = document.getElementById('wh-breaths').value;
});

// Recovery duration slider
document.getElementById('wh-recovery-dur').addEventListener('input', () => {
    const v = parseInt(document.getElementById('wh-recovery-dur').value);
    document.getElementById('wh-recovery-val').textContent = formatTime(v);
});

// Pause between rounds slider
document.getElementById('wh-pause-dur').addEventListener('input', () => {
    const v = parseInt(document.getElementById('wh-pause-dur').value);
    document.getElementById('wh-pause-val').textContent = `${v}s`;
});

// Music toggle
const whMusicToggle = document.getElementById('wh-music-toggle');
const whMusicOptions = document.getElementById('wh-music-options');

whMusicToggle.addEventListener('click', () => {
    playClick();
    whMusicEnabled = !whMusicEnabled;
    whMusicToggle.classList.toggle('active', whMusicEnabled);
    whMusicOptions.classList.toggle('hidden', !whMusicEnabled);
    if (!whMusicEnabled) {
        whSelectedSrc = '';
    } else {
        const sel = whMusicOptions.querySelector('.music-option.selected');
        if (sel) whSelectedSrc = sel.dataset.src;
    }
});

whMusicOptions.querySelectorAll('.music-option').forEach(opt => {
    opt.addEventListener('click', () => {
        playClick();
        whMusicOptions.querySelectorAll('.music-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        whSelectedSrc = opt.dataset.src;
    });
});

// Breath sounds toggle
const whBreathToggle = document.getElementById('wh-breath-sound-toggle');
whBreathToggle.addEventListener('click', () => {
    playClick();
    whBreathSoundEnabled = !whBreathSoundEnabled;
    whBreathToggle.classList.toggle('active', whBreathSoundEnabled);
});

// Voice toggle
const whVoiceToggle = document.getElementById('wh-voice-toggle');
whVoiceToggle.addEventListener('click', () => {
    playClick();
    whVoiceEnabled = !whVoiceEnabled;
    whVoiceToggle.classList.toggle('active', whVoiceEnabled);
});

// Retention guide toggle (Anleitung Haltephase)
const whRetentionGuideToggle = document.getElementById('wh-retention-guide-toggle');
whRetentionGuideToggle.addEventListener('click', () => {
    playClick();
    whRetentionGuideEnabled = !whRetentionGuideEnabled;
    whRetentionGuideToggle.classList.toggle('active', whRetentionGuideEnabled);
});

function playWhVoice(audio) {
    if (!whVoiceEnabled) return;
    audio.currentTime = 0;
    audio.play().catch(() => {});
}

// Voice schedule for Wim Hof (same as Atemmeditation, 30 breaths)
const whVoiceSchedule = {
    1:  { inhale: voiceAtmeEin,  exhale: voiceAusatmen },
    2:  { inhale: voiceEinatmen, exhale: voiceAusatmen },
    6:  { inhale: voiceEin, exhale: voiceAus },
    7:  { inhale: voiceEin, exhale: voiceAus },
    8:  { inhale: voiceEin, exhale: voiceAus },
    9:  { inhale: voiceEin, exhale: voiceAus },
    10: { inhale: voiceEin, exhale: voiceAus },
    14: { inhale: voiceEinatmen, exhale: voiceUndAus },
    15: { inhale: voiceEin,     exhale: voiceUndAus },
    16: { inhale: voiceEin,     exhale: voiceAus },
    20: { inhale: voiceFolge,   exhale: null },
    26: { inhale: voiceAtmeEin, exhale: voiceUndAus },
    27: { inhale: voiceEin, exhale: voiceAus },
    28: { inhale: voiceEin, exhale: voiceAus },
    29: { inhale: voiceEin, exhale: voiceAus },
    30: { inhale: voiceEin, exhale: voiceAus },
};

// Start
document.getElementById('wh-start').addEventListener('click', () => {
    playClick();
    whTotalRounds = parseInt(document.getElementById('wh-rounds').value);
    whBreathsPerRound = parseInt(document.getElementById('wh-breaths').value);
    whRecoveryDuration = parseInt(document.getElementById('wh-recovery-dur').value);
    whPauseDuration = parseInt(document.getElementById('wh-pause-dur').value);
    whCurrentRound = 0;
    whRoundRetentions = [];
    // Start music
    if (whMusicEnabled && whSelectedSrc) {
        whMusic = new Audio(whSelectedSrc);
        whMusic.volume = MUSIC_VOLUME;
        whMusic.loop = true;
        whMusic.play().catch(() => {});
    }
    startWhNextRound();
});

function startWhNextRound() {
    whCurrentRound++;
    showView('tracker-wimhof', 'wh-breathing');
    startWhBreathing();
}

function updateWhRoundInfo(elementId) {
    const el = document.getElementById(elementId);
    if (el) el.textContent = `Runde ${whCurrentRound} / ${whTotalRounds}`;
}

function startWhBreathing() {
    const img = document.getElementById('wh-breath-img');
    const phase = document.getElementById('wh-phase');
    const count = document.getElementById('wh-count');
    const instruction = document.getElementById('wh-instruction');
    updateWhRoundInfo('wh-round-info');
    let breath = 0;
    const speed = whSpeeds[whSpeed];

    function doInhale() {
        breath++;
        if (breath > whBreathsPerRound) {
            startWhRetention();
            return;
        }
        count.textContent = `${breath} / ${whBreathsPerRound}`;
        phase.textContent = 'EINATMEN';
        instruction.textContent = 'Atme tief ein...';
        img.style.transition = `transform ${(speed.inhale * 0.9) / 1000}s ease-in-out`;
        img.classList.remove('atm-exhale');
        img.classList.add('atm-inhale');
        if (whBreathSoundEnabled) { inhaleSound.currentTime = 0; inhaleSound.play().catch(() => {}); }
        const vs = whVoiceSchedule[breath];
        if (vs && vs.inhale) playWhVoice(vs.inhale);
        if (navigator.vibrate) navigator.vibrate(50);
        whInterval = setTimeout(doExhale, speed.inhale);
    }

    function doExhale() {
        phase.textContent = 'AUSATMEN';
        instruction.textContent = 'Langsam ausatmen...';
        img.style.transition = `transform ${(speed.exhale * 0.9) / 1000}s ease-in-out`;
        img.classList.remove('atm-inhale');
        img.classList.add('atm-exhale');
        if (whBreathSoundEnabled) { exhaleSound.currentTime = 0; exhaleSound.play().catch(() => {}); }
        const vs = whVoiceSchedule[breath];
        if (vs && vs.exhale) playWhVoice(vs.exhale);
        whInterval = setTimeout(doInhale, speed.exhale);
    }

    doInhale();
}

function startWhRetention() {
    showView('tracker-wimhof', 'wh-retention');
    updateWhRoundInfo('wh-retention-round');
    whRetentionSeconds = 0;
    document.getElementById('wh-retention-display').textContent = '0:00';

    // Play initial retention voice (Anleitung Haltephase)
    if (whRetentionGuideEnabled) {
        voiceHalteAtem.currentTime = 0;
        voiceHalteAtem.play().catch(() => {});
    }

    whInterval = setInterval(() => {
        whRetentionSeconds++;
        document.getElementById('wh-retention-display').textContent = formatTime(whRetentionSeconds);

        // Voice at minute marks (Anleitung)
        if (whRetentionGuideEnabled && retentionMinuteClips[whRetentionSeconds]) {
            const clip = retentionMinuteClips[whRetentionSeconds];
            clip.currentTime = 0;
            clip.play().catch(() => {});
        }
    }, 1000);

    // Random voice every 30 seconds (Anleitung)
    if (whRetentionGuideEnabled) {
        whRetentionVoiceInterval = setInterval(() => {
            if (!retentionMinuteClips[whRetentionSeconds]) {
                const clip = retentionRandomClips[Math.floor(Math.random() * retentionRandomClips.length)];
                clip.currentTime = 0;
                clip.play().catch(() => {});
            }
        }, 30000);
    }
}

// Double-tap to end retention
let whLastTap = 0;
document.getElementById('wh-retention').addEventListener('click', (e) => {
    const now = Date.now();
    if (now - whLastTap < 400) {
        // Double-tap detected
        playClick();
        if (whInterval) { clearInterval(whInterval); whInterval = null; }
        if (whRetentionVoiceInterval) { clearInterval(whRetentionVoiceInterval); whRetentionVoiceInterval = null; }
        whLastTap = 0;
        startWhRecovery();
    } else {
        whLastTap = now;
    }
});

// Recovery phase voice clips
const voiceAtmeTiefEin = new Audio('Atme tief ein und halte deinen Atem an.mp3');
const voiceAusatmen10 = new Audio('Ausatmen in 10 Sekunden.mp3');
const voiceJetzt = new Audio('Jetzt.mp3');
const voiceCountdown = {
    5: new Audio('5.mp3'),
    4: new Audio('4.mp3'),
    3: new Audio('3.mp3'),
    2: new Audio('2.mp3'),
    1: new Audio('1.mp3'),
};
[voiceAtmeTiefEin, voiceAusatmen10, voiceJetzt,
 voiceCountdown[5], voiceCountdown[4], voiceCountdown[3], voiceCountdown[2], voiceCountdown[1]
].forEach(a => { a.preload = 'auto'; boostVoiceClip(a); });

function startWhRecovery() {
    showView('tracker-wimhof', 'wh-recovery');
    updateWhRoundInfo('wh-recovery-round');
    let remaining = whRecoveryDuration;
    document.getElementById('wh-recovery-display').textContent = formatTime(remaining);
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);

    // Play "Atme tief ein und halte deinen Atem an"
    if (whRetentionGuideEnabled) {
        voiceAtmeTiefEin.currentTime = 0;
        voiceAtmeTiefEin.play().catch(() => {});
    }

    whInterval = setInterval(() => {
        remaining--;
        document.getElementById('wh-recovery-display').textContent = formatTime(remaining);

        if (whRetentionGuideEnabled) {
            if (remaining === 10) {
                voiceAusatmen10.currentTime = 0;
                voiceAusatmen10.play().catch(() => {});
            } else if (remaining >= 1 && remaining <= 5 && voiceCountdown[remaining]) {
                voiceCountdown[remaining].currentTime = 0;
                voiceCountdown[remaining].play().catch(() => {});
            } else if (remaining === 0) {
                voiceJetzt.currentTime = 0;
                voiceJetzt.play().catch(() => {});
            }
        }

        if (remaining <= 0) {
            clearInterval(whInterval);
            whInterval = null;
            whRoundRetentions.push(whRetentionSeconds);
            finishWhRound();
        }
    }, 1000);
}

function finishWhRound() {
    if (whCurrentRound >= whTotalRounds) {
        // Last round - play gong
        playGong();
        if (navigator.vibrate) navigator.vibrate([500, 200, 500]);
        finishWhAll();
    } else {
        // Between rounds - no gong
        if (navigator.vibrate) navigator.vibrate([200]);
        // Show round complete, then auto-advance
        document.getElementById('wh-round-done-title').textContent = `RUNDE ${whCurrentRound} GESCHAFFT`;
        document.getElementById('wh-round-retention').textContent = formatTime(whRetentionSeconds);
        showView('tracker-wimhof', 'wh-round-done');

        if (whPauseDuration === 0) {
            // Immediate
            document.getElementById('wh-next-countdown').textContent = '';
            startWhNextRound();
        } else {
            let countdown = whPauseDuration;
            document.getElementById('wh-next-countdown').textContent = `Nächste Runde in ${countdown}...`;
            whInterval = setInterval(() => {
                countdown--;
                if (countdown <= 0) {
                    clearInterval(whInterval);
                    whInterval = null;
                    startWhNextRound();
                } else {
                    document.getElementById('wh-next-countdown').textContent = `Nächste Runde in ${countdown}...`;
                }
            }, 1000);
        }
    }
}

function finishWhAll() {
    // Fade out music
    if (whMusic) {
        let vol = whMusic.volume;
        const fade = setInterval(() => {
            vol -= 0.1;
            if (vol <= 0) {
                clearInterval(fade);
                whMusic.pause();
                whMusic = null;
            } else {
                whMusic.volume = vol;
            }
        }, 150);
    }
    // Summary
    document.getElementById('wh-summary').innerHTML = whRoundRetentions.map((r, i) =>
        `<div class="round-result">Runde ${i + 1}: <strong>${formatTime(r)}</strong></div>`
    ).join('');
    document.getElementById('wh-stat-rounds').textContent = whTotalRounds;
    const totalRetention = whRoundRetentions.reduce((a, b) => a + b, 0);
    document.getElementById('wh-stat-total-retention').textContent = formatTime(totalRetention);
    // Save records
    const longestRetention = whRoundRetentions.length > 0 ? Math.max(...whRoundRetentions) : 0;
    const newRounds = checkAndSaveRecord('wimhof', 'mostRounds', whTotalRounds, false);
    const newRetention = checkAndSaveRecord('wimhof', 'longestRetention', longestRetention, false);
    showNewRecordBadge('wh-new-record', newRounds || newRetention);
    showView('tracker-wimhof', 'wh-done');
}

document.getElementById('wh-done-btn').addEventListener('click', () => {
    playClick();
    showView('tracker-wimhof', 'wh-setup');
});

function stopWimhof() {
    if (whInterval) { clearTimeout(whInterval); clearInterval(whInterval); whInterval = null; }
    if (whRetentionVoiceInterval) { clearInterval(whRetentionVoiceInterval); whRetentionVoiceInterval = null; }
    if (whMusic) { whMusic.pause(); whMusic = null; }
}

// ===== STOP ALL TIMERS =====

function stopAllTimers() {
    eisduscheTracker.stop();
    eisbadenTracker.stop();
    stopMeditation();
    stopAtmung();
    stopLiegestuetze();
    stopWimhof();
    if (roundsInterval) { clearInterval(roundsInterval); roundsInterval = null; }
}

// ===== FLOATING PARTICLES =====

(function initAllParticles() {
    const canvases = document.querySelectorAll('.particles-canvas');
    const COUNT = 40;

    canvases.forEach(canvas => {
        const ctx = canvas.getContext('2d');
        let w, h;
        const particles = [];

        function resize() {
            w = canvas.width = canvas.offsetWidth;
            h = canvas.height = canvas.offsetHeight;
        }
        resize();

        for (let i = 0; i < COUNT; i++) {
            const isIce = Math.random() > 0.4;
            particles.push({
                x: Math.random() * (w || 400),
                y: Math.random() * (h || 800),
                r: Math.random() * 2 + 0.5,
                dx: (Math.random() - 0.5) * 0.3,
                dy: -Math.random() * 0.4 - 0.1,
                alpha: Math.random() * 0.4 + 0.1,
                color: isIce ? [100, 170, 220] : [200, 170, 90],
                pulse: Math.random() * Math.PI * 2,
                pulseSpeed: Math.random() * 0.02 + 0.005,
            });
        }

        function draw() {
            // Only animate if the parent screen is active
            const screen = canvas.closest('.screen');
            if (screen && screen.classList.contains('active')) {
                if (w === 0 || h === 0) resize();
                ctx.clearRect(0, 0, w, h);
                for (const p of particles) {
                    p.x += p.dx;
                    p.y += p.dy;
                    p.pulse += p.pulseSpeed;
                    const a = p.alpha * (0.5 + 0.5 * Math.sin(p.pulse));
                    if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
                    if (p.x < -10) p.x = w + 10;
                    if (p.x > w + 10) p.x = -10;

                    const [r, g, b] = p.color;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(${r},${g},${b},${a * 0.2})`;
                    ctx.fill();
                }
            }
            requestAnimationFrame(draw);
        }
        draw();
    });

    window.addEventListener('resize', () => {
        canvases.forEach(canvas => {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
        });
    });
})();

// ===== WAKE LOCK (Display bleibt an) =====

let wakeLock = null;

async function requestWakeLock() {
    if (!('wakeLock' in navigator)) return;
    try {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => { wakeLock = null; });
    } catch(e) {}
}

requestWakeLock();

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        requestWakeLock();
        if (_audioCtx && _audioCtx.state === 'suspended') _audioCtx.resume();
    }
});

// ===== SERVICE WORKER =====

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
}

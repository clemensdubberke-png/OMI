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

// ===== MAIN MENU NAVIGATION =====

document.getElementById('kaelte-btn').addEventListener('click', () => showScreen('kaelte-menu'));
document.getElementById('back-to-main').addEventListener('click', () => showScreen('main-menu'));
document.getElementById('geist-btn').addEventListener('click', () => {});
document.getElementById('atem-btn').addEventListener('click', () => {});

// Back buttons for all tracker screens
document.querySelectorAll('.back-to-kaelte').forEach(btn => {
    btn.addEventListener('click', () => {
        stopAllTimers();
        showScreen('kaelte-menu');
    });
});

// ===== KÄLTE MENU ITEMS =====

document.querySelectorAll('.kaelte-item').forEach(item => {
    item.addEventListener('click', () => {
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
        if (navigator.vibrate) navigator.vibrate([500, 200, 500]);
        els.statDur.textContent = formatTime(duration);
        els.statTemp.textContent = `${temp}°C`;
        showView(screenId, `${prefix.replace('-', '')}-done`);
    }

    function stop() {
        if (interval) clearInterval(interval);
        interval = null;
    }

    // Wire buttons
    const setupId = prefix === 'ed' ? 'eisdusche' : 'eisbaden';
    document.getElementById(`${prefix}-start`).addEventListener('click', () => {
        showView(screenId, `${setupId}-timer`);
        startPrep();
    });
    document.getElementById(`${prefix}-stop`).addEventListener('click', () => {
        stop();
        showView(screenId, `${setupId}-setup`);
    });
    document.getElementById(`${prefix}-done`).addEventListener('click', () => {
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
    roundsData = [];
    roundsElapsed = 0;
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
    if (roundsInterval) clearInterval(roundsInterval);
    roundsInterval = null;
    roundsData.push(roundsElapsed);
    if (navigator.vibrate) navigator.vibrate([300]);
    updateRoundsInfo();
    // Auto-start next round after brief pause
    document.getElementById('rounds-phase').textContent = 'PAUSE';
    document.getElementById('rounds-display').textContent = formatTime(roundsElapsed);
    setTimeout(() => {
        if (document.getElementById('rounds-active').classList.contains('hidden')) return;
        startNewRound();
    }, 1500);
});

document.getElementById('rounds-finish').addEventListener('click', () => {
    if (roundsInterval) {
        clearInterval(roundsInterval);
        roundsInterval = null;
        if (roundsElapsed > 0) roundsData.push(roundsElapsed);
    }
    if (navigator.vibrate) navigator.vibrate([500, 200, 500]);
    const totalSecs = roundsData.reduce((a, b) => a + b, 0);
    // Summary
    document.getElementById('rounds-summary').innerHTML = roundsData.map((r, i) =>
        `<div class="round-result">Runde ${i + 1}: <strong>${formatTime(r)}</strong></div>`
    ).join('');
    document.getElementById('rounds-stat-count').textContent = roundsData.length;
    document.getElementById('rounds-stat-total').textContent = formatTime(totalSecs);
    document.getElementById('rounds-stat-temp').textContent =
        `${document.getElementById('rounds-temp').value}°C`;
    showView('tracker-rounds', 'rounds-done');
});

document.getElementById('rounds-done-btn').addEventListener('click', () => {
    showView('tracker-rounds', 'rounds-setup');
});

// ===== STOP ALL TIMERS =====

function stopAllTimers() {
    eisduscheTracker.stop();
    eisbadenTracker.stop();
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

// ===== SERVICE WORKER =====

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
}

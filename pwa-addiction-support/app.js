/* ========================================
   STARK BLEIBEN — PWA App Logic
   Phase 1: Sofort-Hilfe Aufgaben
   ======================================== */

(function() {
  'use strict';

  // =====================
  // Phase 1 Aufgaben
  // =====================
  const TASKS = [
    {
      id: 1,
      icon: '🌬️',
      title: 'Atemübung',
      description: 'Atme 5x tief ein und aus — zähle dabei langsam bis 4 beim Einatmen, halte 4 Sekunden, atme 4 Sekunden aus.',
      timer: null
    },
    {
      id: 2,
      icon: '💧',
      title: 'Kaltes Wasser',
      description: 'Wasche dein Gesicht mit kaltem Wasser oder halte die Handgelenke 30 Sekunden unter kaltes Wasser.',
      timer: 30 // Sekunden
    },
    {
      id: 3,
      icon: '🚪',
      title: 'Rausgehen',
      description: 'Verlasse den Raum, in dem du gerade bist. Gehe nach draußen oder in einen anderen Raum.',
      timer: null
    },
    {
      id: 4,
      icon: '🍽️',
      title: 'Haushaltsaufgabe',
      description: 'Räume den Geschirrspüler ein/aus oder erledige eine andere kleine Haushaltsaufgabe (5–10 Minuten).',
      timer: null
    },
    {
      id: 5,
      icon: '💪',
      title: 'Körperliche Bewegung',
      description: 'Mache 20 Liegestütze, Kniebeugen oder Jumping Jacks.',
      timer: null
    },
    {
      id: 6,
      icon: '📞',
      title: 'Jemanden anrufen',
      description: 'Rufe einen Freund oder ein Familienmitglied an — einfach zum Quatschen.',
      timer: null
    },
    {
      id: 7,
      icon: '🎵',
      title: 'Musik hören',
      description: 'Setze Kopfhörer auf und höre einen energiegeladenen oder beruhigenden Song (je nach Stimmung).',
      timer: null
    },
    {
      id: 8,
      icon: '🥤',
      title: 'Snack/Trinken',
      description: 'Bereite dir bewusst einen gesunden Snack zu oder trinke ein großes Glas Wasser.',
      timer: null
    },
    {
      id: 9,
      icon: '🚶',
      title: 'Kurzer Spaziergang',
      description: 'Gehe 10 Minuten um den Block oder durchs Haus/die Wohnung.',
      timer: 600 // 10 Minuten
    },
    {
      id: 10,
      icon: '📵',
      title: 'Smartphone weglegen',
      description: 'Lege dein Smartphone in einen anderen Raum und stelle einen Timer für 15 Minuten.',
      timer: 900 // 15 Minuten
    }
  ];

  // =====================
  // DOM-Referenzen
  // =====================
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const menuToggle   = $('#menuToggle');
  const sidebar      = $('#sidebar');
  const sidebarOverlay = $('#sidebarOverlay');
  const sidebarClose = $('#sidebarClose');
  const navLinks     = $$('.nav-link');

  const pageHome     = $('#pageHome');
  const pageTask     = $('#pageTask');
  const pageTimer    = $('#pageTimer');
  const pageConfirm  = $('#pageConfirm');
  const pageSuccess  = $('#pageSuccess');
  const pageMyTasks  = $('#pageMyTasks');
  const pageInfo     = $('#pageInfo');

  const emergencyBtn = $('#emergencyBtn');

  const taskIcon     = $('#taskIcon');
  const taskTitle    = $('#taskTitle');
  const taskDescription = $('#taskDescription');
  const btnAccept    = $('#btnAccept');
  const btnSkip      = $('#btnSkip');

  const timerTaskName = $('#timerTaskName');
  const timerDisplay = $('#timerDisplay');
  const timerFg      = $('#timerFg');
  const btnStartTimer = $('#btnStartTimer');
  const btnTimerDone = $('#btnTimerDone');

  const confirmTaskName = $('#confirmTaskName');
  const btnConfirmDone  = $('#btnConfirmDone');

  const successStreak = $('#successStreak');
  const btnBackHome  = $('#btnBackHome');

  const statTotal    = $('#statTotal');
  const statToday    = $('#statToday');
  const taskHistory  = $('#taskHistory');

  // =====================
  // State
  // =====================
  let currentTask = null;
  let skippedIds  = [];
  let timerInterval = null;
  let timerRemaining = 0;
  let timerTotal = 0;

  // =====================
  // LocalStorage Helpers
  // =====================
  const STORAGE_KEY = 'starkBleiben';

  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : { completedTasks: [], lastSession: null };
    } catch {
      return { completedTasks: [], lastSession: null };
    }
  }

  function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function addCompletedTask(task) {
    const data = loadData();
    data.completedTasks.push({
      id: task.id,
      title: task.title,
      icon: task.icon,
      timestamp: new Date().toISOString()
    });
    data.lastSession = new Date().toISOString();
    saveData(data);
  }

  // =====================
  // Navigation
  // =====================
  function openSidebar() {
    sidebar.classList.add('open');
  }

  function closeSidebar() {
    sidebar.classList.remove('open');
  }

  function showPage(pageId) {
    $$('.page').forEach(p => p.classList.remove('active'));

    switch (pageId) {
      case 'home':
        pageHome.classList.add('active');
        break;
      case 'tasks':
        renderMyTasks();
        pageMyTasks.classList.add('active');
        break;
      case 'info':
        pageInfo.classList.add('active');
        break;
    }

    // Nav-Link aktiv markieren
    navLinks.forEach(link => {
      link.classList.toggle('active', link.dataset.page === pageId);
    });

    closeSidebar();
    clearTimer();
  }

  function showSection(sectionEl) {
    $$('.page').forEach(p => p.classList.remove('active'));
    sectionEl.classList.add('active');
  }

  // =====================
  // Aufgabe auswählen
  // =====================
  function getRandomTask() {
    const available = TASKS.filter(t => !skippedIds.includes(t.id));

    // Falls alle übersprungen: Reset
    if (available.length === 0) {
      skippedIds = [];
      return TASKS[Math.floor(Math.random() * TASKS.length)];
    }

    return available[Math.floor(Math.random() * available.length)];
  }

  function showRandomTask() {
    currentTask = getRandomTask();
    taskIcon.textContent = currentTask.icon;
    taskTitle.textContent = currentTask.title;
    taskDescription.textContent = currentTask.description;

    // Karte neu-animieren
    const card = $('#taskCard');
    card.style.animation = 'none';
    // Reflow erzwingen
    void card.offsetHeight;
    card.style.animation = '';

    showSection(pageTask);
  }

  // =====================
  // Aufgabe annehmen
  // =====================
  function acceptTask() {
    if (!currentTask) return;

    if (currentTask.timer) {
      // Timer-Aufgabe
      timerTaskName.textContent = currentTask.title + ': ' + currentTask.description;
      timerTotal = currentTask.timer;
      timerRemaining = currentTask.timer;
      updateTimerDisplay();
      resetTimerRing();
      btnStartTimer.classList.remove('hidden');
      btnTimerDone.classList.add('hidden');
      timerDisplay.classList.remove('running', 'finished');
      showSection(pageTimer);
    } else {
      // Aufgabe ohne Timer
      confirmTaskName.textContent = currentTask.icon + ' ' + currentTask.title + ': ' + currentTask.description;
      showSection(pageConfirm);
    }
  }

  function skipTask() {
    if (currentTask) {
      skippedIds.push(currentTask.id);
    }
    showRandomTask();
  }

  // =====================
  // Timer
  // =====================
  function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function updateTimerDisplay() {
    timerDisplay.textContent = formatTime(timerRemaining);
  }

  function resetTimerRing() {
    const circumference = 2 * Math.PI * 90; // r=90
    timerFg.style.strokeDasharray = circumference;
    timerFg.style.strokeDashoffset = '0';
  }

  function updateTimerRing() {
    const circumference = 2 * Math.PI * 90;
    const progress = 1 - (timerRemaining / timerTotal);
    timerFg.style.strokeDashoffset = (circumference * progress).toString();
  }

  function startTimer() {
    btnStartTimer.classList.add('hidden');
    timerDisplay.classList.add('running');

    timerInterval = setInterval(() => {
      timerRemaining--;
      updateTimerDisplay();
      updateTimerRing();

      if (timerRemaining <= 0) {
        clearInterval(timerInterval);
        timerInterval = null;
        timerDisplay.classList.remove('running');
        timerDisplay.classList.add('finished');
        timerDisplay.textContent = '00:00';
        btnTimerDone.classList.remove('hidden');
        playTimerSound();
        vibrateDevice();
      }
    }, 1000);
  }

  function clearTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function playTimerSound() {
    // Erzeuge einen kurzen Ton mit Web Audio API
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);     // D5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.8);

      // Zweiter Ton
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(783.99, ctx.currentTime); // G5
        gain2.gain.setValueAtTime(0.3, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);
        osc2.start(ctx.currentTime);
        osc2.stop(ctx.currentTime + 1);
      }, 300);
    } catch (e) {
      // Web Audio nicht verfügbar — kein Problem
    }
  }

  function vibrateDevice() {
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 300]);
    }
  }

  // =====================
  // Aufgabe abschließen
  // =====================
  function completeTask() {
    if (!currentTask) return;

    addCompletedTask(currentTask);

    const data = loadData();
    const total = data.completedTasks.length;
    successStreak.textContent = `${total} Aufgabe${total !== 1 ? 'n' : ''} insgesamt geschafft!`;

    // Reset
    currentTask = null;
    skippedIds = [];
    clearTimer();

    showSection(pageSuccess);
  }

  // =====================
  // Meine Aufgaben Seite
  // =====================
  function renderMyTasks() {
    const data = loadData();
    const tasks = data.completedTasks || [];

    // Statistiken
    const total = tasks.length;
    const today = new Date().toDateString();
    const todayCount = tasks.filter(t => new Date(t.timestamp).toDateString() === today).length;

    statTotal.textContent = total;
    statToday.textContent = todayCount;

    // History (neueste zuerst, max 50)
    taskHistory.innerHTML = '';

    if (tasks.length === 0) {
      taskHistory.innerHTML = '<li class="task-history-empty">Noch keine Aufgaben erledigt.</li>';
      return;
    }

    const recent = tasks.slice(-50).reverse();
    recent.forEach(t => {
      const li = document.createElement('li');
      const date = new Date(t.timestamp);
      const dateStr = date.toLocaleDateString('de-DE', {
        day: '2-digit', month: '2-digit', year: '2-digit',
        hour: '2-digit', minute: '2-digit'
      });
      li.innerHTML = `
        <span class="task-history-name">${t.icon} ${t.title}</span>
        <span class="task-history-date">${dateStr}</span>
      `;
      taskHistory.appendChild(li);
    });
  }

  // =====================
  // Event Listeners
  // =====================
  // Navigation
  menuToggle.addEventListener('click', openSidebar);
  sidebarOverlay.addEventListener('click', closeSidebar);
  sidebarClose.addEventListener('click', closeSidebar);

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      showPage(link.dataset.page);
    });
  });

  // Notfall-Button
  emergencyBtn.addEventListener('click', () => {
    skippedIds = [];
    showRandomTask();
  });

  // Aufgaben-Buttons
  btnAccept.addEventListener('click', acceptTask);
  btnSkip.addEventListener('click', skipTask);

  // Timer
  btnStartTimer.addEventListener('click', startTimer);
  btnTimerDone.addEventListener('click', completeTask);

  // Bestätigung (ohne Timer)
  btnConfirmDone.addEventListener('click', completeTask);

  // Zurück zur Startseite
  btnBackHome.addEventListener('click', () => showPage('home'));

  // Keyboard: Escape schließt Sidebar
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSidebar();
  });

  // =====================
  // Service Worker registrieren
  // =====================
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {
      // Service Worker nicht unterstützt oder Registrierung fehlgeschlagen
    });
  }

  // =====================
  // Init
  // =====================
  showPage('home');

})();

// ============================================================
// Ameisen Simulator - Game Engine
// ============================================================

(function () {
    'use strict';

    // --- Constants ---
    // Map is built by tiling the grass image; dimensions are calculated after loading
    let GRASS_W = 1232;             // Will be updated from actual image
    let GRASS_H = 607;
    const MAP_REPEAT_X = 4;         // How many times to repeat the grass horizontally
    const MAP_REPEAT_Y = 6;         // How many times to repeat the grass vertically
    let MAP_WIDTH = GRASS_W * MAP_REPEAT_X;
    let MAP_HEIGHT = GRASS_H * MAP_REPEAT_Y;
    const ANT_SPEED = 3;            // Pixels per frame
    const ANT_HEIGHT = 64;          // Display height of the ant queen sprite
    let ANT_WIDTH = 64;             // Will be calculated from aspect ratio after loading

    // --- Canvas Setup ---
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // --- Loading UI ---
    const loadingBarInner = document.getElementById('loading-bar-inner');
    const loadingText = document.getElementById('loading-text');
    const loadingScreen = document.getElementById('loading-screen');

    function setLoadingProgress(percent, text) {
        loadingBarInner.style.width = percent + '%';
        if (text) loadingText.textContent = text;
    }

    // --- Asset Loading ---
    const images = {};
    const imageList = [
        { key: 'grass', src: 'assets/images/grass.png' },
        { key: 'ant_queen', src: 'assets/images/ant_queen.png' }
    ];

    function loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Failed to load: ' + src));
            img.src = src;
        });
    }

    async function loadAllImages() {
        for (let i = 0; i < imageList.length; i++) {
            const { key, src } = imageList[i];
            const percent = Math.round(((i + 1) / imageList.length) * 100);
            setLoadingProgress(percent, 'Lade: ' + key + '...');
            try {
                images[key] = await loadImage(src);
            } catch (e) {
                console.warn(e.message + ' - using fallback');
                images[key] = createFallback(key);
            }
        }

        // Calculate ant display width from aspect ratio (image faces right)
        const antImg = images.ant_queen;
        const antImgW = antImg.naturalWidth || antImg.width;
        const antImgH = antImg.naturalHeight || antImg.height;
        ANT_WIDTH = Math.round(ANT_HEIGHT * (antImgW / antImgH));

        // Update map dimensions based on actual grass image size
        if (images.grass) {
            GRASS_W = images.grass.naturalWidth || images.grass.width;
            GRASS_H = images.grass.naturalHeight || images.grass.height;
            MAP_WIDTH = GRASS_W * MAP_REPEAT_X;
            MAP_HEIGHT = GRASS_H * MAP_REPEAT_Y;
            game.antQueen.x = MAP_WIDTH / 2;
            game.antQueen.y = MAP_HEIGHT / 2;
        }

        setLoadingProgress(100, 'Fertig!');
    }

    // Fallback graphics if images are not yet placed
    function createFallback(key) {
        const c = document.createElement('canvas');
        const cx = c.getContext('2d');
        if (key === 'grass') {
            c.width = 256;
            c.height = 256;
            cx.fillStyle = '#4a8c2a';
            cx.fillRect(0, 0, 256, 256);
            cx.fillStyle = '#5a9c3a';
            for (let i = 0; i < 40; i++) {
                const x = Math.floor(Math.random() * 250);
                const y = Math.floor(Math.random() * 250);
                cx.fillRect(x, y, 6, 6);
            }
            cx.fillStyle = '#3a7c1a';
            for (let i = 0; i < 30; i++) {
                const x = Math.floor(Math.random() * 250);
                const y = Math.floor(Math.random() * 250);
                cx.fillRect(x, y, 3, 8);
            }
        } else if (key === 'ant_queen') {
            c.width = 48;
            c.height = 48;
            cx.fillStyle = '#2a1a0a';
            cx.beginPath();
            cx.arc(24, 10, 7, 0, Math.PI * 2);
            cx.fill();
            cx.beginPath();
            cx.arc(24, 22, 6, 0, Math.PI * 2);
            cx.fill();
            cx.beginPath();
            cx.ellipse(24, 36, 8, 10, 0, 0, Math.PI * 2);
            cx.fill();
            cx.strokeStyle = '#2a1a0a';
            cx.lineWidth = 2;
            cx.beginPath();
            cx.moveTo(20, 6); cx.lineTo(14, 0);
            cx.moveTo(28, 6); cx.lineTo(34, 0);
            cx.stroke();
            cx.beginPath();
            cx.moveTo(18, 18); cx.lineTo(8, 14);
            cx.moveTo(30, 18); cx.lineTo(40, 14);
            cx.moveTo(18, 22); cx.lineTo(8, 24);
            cx.moveTo(30, 22); cx.lineTo(40, 24);
            cx.moveTo(18, 26); cx.lineTo(10, 32);
            cx.moveTo(30, 26); cx.lineTo(38, 32);
            cx.stroke();
        }
        return c;
    }

    // --- Game State ---
    const game = {
        antQueen: {
            x: MAP_WIDTH / 2,
            y: MAP_HEIGHT / 2,
            angle: 0,
            targetX: null,
            targetY: null,
            moving: false
        },
        camera: {
            x: 0,
            y: 0
        },
        touch: {
            active: false,
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
            mode: null,
            identifier: null,
            startTime: 0,
            hasMoved: false,
            panStartCamX: 0,
            panStartCamY: 0,
            panTouch: null,
            panActive: false,
            panStartX: 0,
            panStartY: 0,
            panStartCamX2: 0,
            panStartCamY2: 0
        }
    };

    // --- Camera ---
    function centerCameraOn(x, y) {
        game.camera.x = x - canvas.width / 2;
        game.camera.y = y - canvas.height / 2;
        clampCamera();
    }

    function clampCamera() {
        game.camera.x = Math.max(0, Math.min(MAP_WIDTH - canvas.width, game.camera.x));
        game.camera.y = Math.max(0, Math.min(MAP_HEIGHT - canvas.height, game.camera.y));
    }

    // --- Touch Input ---
    const MOVE_THRESHOLD = 10;

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);

    function handleTouchStart(e) {
        e.preventDefault();
        const touch = e.changedTouches[0];

        if (game.touch.active && e.touches.length >= 2) {
            const secondTouch = e.changedTouches[0];
            game.touch.panActive = true;
            game.touch.panTouch = secondTouch.identifier;
            game.touch.panStartX = secondTouch.clientX;
            game.touch.panStartY = secondTouch.clientY;
            game.touch.panStartCamX2 = game.camera.x;
            game.touch.panStartCamY2 = game.camera.y;
            return;
        }

        game.touch.active = true;
        game.touch.identifier = touch.identifier;
        game.touch.startX = touch.clientX;
        game.touch.startY = touch.clientY;
        game.touch.currentX = touch.clientX;
        game.touch.currentY = touch.clientY;
        game.touch.startTime = Date.now();
        game.touch.hasMoved = false;
        game.touch.mode = null;
        game.touch.panStartCamX = game.camera.x;
        game.touch.panStartCamY = game.camera.y;
    }

    function handleTouchMove(e) {
        e.preventDefault();

        if (game.touch.panActive) {
            for (let i = 0; i < e.changedTouches.length; i++) {
                const t = e.changedTouches[i];
                if (t.identifier === game.touch.panTouch) {
                    const dx = game.touch.panStartX - t.clientX;
                    const dy = game.touch.panStartY - t.clientY;
                    game.camera.x = game.touch.panStartCamX2 + dx;
                    game.camera.y = game.touch.panStartCamY2 + dy;
                    clampCamera();
                }
            }
        }

        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            if (touch.identifier === game.touch.identifier) {
                game.touch.currentX = touch.clientX;
                game.touch.currentY = touch.clientY;

                const dx = touch.clientX - game.touch.startX;
                const dy = touch.clientY - game.touch.startY;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist > MOVE_THRESHOLD) {
                    game.touch.hasMoved = true;
                }

                if (game.touch.hasMoved && !game.touch.mode) {
                    game.touch.mode = 'pan_camera';
                }

                if (game.touch.mode === 'pan_camera') {
                    game.camera.x = game.touch.panStartCamX - dx;
                    game.camera.y = game.touch.panStartCamY - dy;
                    clampCamera();
                }
            }
        }
    }

    function handleTouchEnd(e) {
        e.preventDefault();

        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === game.touch.panTouch) {
                game.touch.panActive = false;
                game.touch.panTouch = null;
            }
        }

        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            if (touch.identifier === game.touch.identifier) {
                if (!game.touch.hasMoved) {
                    const worldX = touch.clientX + game.camera.x;
                    const worldY = touch.clientY + game.camera.y;
                    setAntTarget(worldX, worldY);
                }
                game.touch.active = false;
                game.touch.mode = null;
                game.touch.identifier = null;
            }
        }
    }

    // --- Mouse fallback ---
    let mouseDown = false;
    let mouseStartX = 0, mouseStartY = 0;
    let mousePanCamX = 0, mousePanCamY = 0;
    let mouseHasMoved = false;

    function handleMouseDown(e) {
        mouseDown = true;
        mouseStartX = e.clientX;
        mouseStartY = e.clientY;
        mousePanCamX = game.camera.x;
        mousePanCamY = game.camera.y;
        mouseHasMoved = false;
    }

    function handleMouseMove(e) {
        if (!mouseDown) return;
        const dx = e.clientX - mouseStartX;
        const dy = e.clientY - mouseStartY;
        if (Math.sqrt(dx * dx + dy * dy) > MOVE_THRESHOLD) {
            mouseHasMoved = true;
        }
        if (mouseHasMoved) {
            game.camera.x = mousePanCamX - dx;
            game.camera.y = mousePanCamY - dy;
            clampCamera();
        }
    }

    function handleMouseUp(e) {
        if (!mouseHasMoved) {
            const worldX = e.clientX + game.camera.x;
            const worldY = e.clientY + game.camera.y;
            setAntTarget(worldX, worldY);
        }
        mouseDown = false;
        mouseHasMoved = false;
    }

    // --- Ant Movement ---
    function setAntTarget(worldX, worldY) {
        const margin = ANT_WIDTH / 2;
        game.antQueen.targetX = Math.max(margin, Math.min(MAP_WIDTH - margin, worldX));
        game.antQueen.targetY = Math.max(margin, Math.min(MAP_HEIGHT - margin, worldY));
        game.antQueen.moving = true;
    }

    function updateAnt() {
        const ant = game.antQueen;
        if (!ant.moving || ant.targetX === null) return;

        const dx = ant.targetX - ant.x;
        const dy = ant.targetY - ant.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < ANT_SPEED) {
            ant.x = ant.targetX;
            ant.y = ant.targetY;
            ant.moving = false;
            return;
        }

        // atan2(dy, dx) => 0 = right, matching the sprite orientation
        // The ant image faces RIGHT, so angle 0 = moving right
        ant.angle = Math.atan2(dy, dx);

        ant.x += (dx / dist) * ANT_SPEED;
        ant.y += (dy / dist) * ANT_SPEED;
    }

    // --- Camera follow ---
    function updateCamera() {
        const ant = game.antQueen;
        const margin = 100;
        const screenX = ant.x - game.camera.x;
        const screenY = ant.y - game.camera.y;

        if (game.touch.mode === 'pan_camera' || game.touch.panActive || mouseDown) return;

        let targetCamX = game.camera.x;
        let targetCamY = game.camera.y;

        if (screenX < margin) {
            targetCamX = ant.x - margin;
        } else if (screenX > canvas.width - margin) {
            targetCamX = ant.x - canvas.width + margin;
        }

        if (screenY < margin) {
            targetCamY = ant.y - margin;
        } else if (screenY > canvas.height - margin) {
            targetCamY = ant.y - canvas.height + margin;
        }

        game.camera.x += (targetCamX - game.camera.x) * 0.08;
        game.camera.y += (targetCamY - game.camera.y) * 0.08;
        clampCamera();
    }

    // --- Rendering ---
    function drawGrass() {
        const img = images.grass;
        const imgW = img.naturalWidth || img.width;
        const imgH = img.naturalHeight || img.height;

        // Calculate which repetitions of the grass image are visible
        const startCol = Math.floor(game.camera.x / imgW);
        const startRow = Math.floor(game.camera.y / imgH);
        const endCol = Math.ceil((game.camera.x + canvas.width) / imgW);
        const endRow = Math.ceil((game.camera.y + canvas.height) / imgH);

        for (let row = startRow; row <= endRow && row < MAP_REPEAT_Y; row++) {
            for (let col = startCol; col <= endCol && col < MAP_REPEAT_X; col++) {
                if (row < 0 || col < 0) continue;
                const drawX = col * imgW - game.camera.x;
                const drawY = row * imgH - game.camera.y;
                ctx.drawImage(img, drawX, drawY, imgW, imgH);
            }
        }
    }

    function drawAntQueen() {
        const ant = game.antQueen;
        const img = images.ant_queen;
        const screenX = ant.x - game.camera.x;
        const screenY = ant.y - game.camera.y;

        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate(ant.angle);
        // Draw centered; image faces right so width is the long axis
        ctx.drawImage(img, -ANT_WIDTH / 2, -ANT_HEIGHT / 2, ANT_WIDTH, ANT_HEIGHT);
        ctx.restore();
    }

    function drawTargetIndicator() {
        const ant = game.antQueen;
        if (!ant.moving || ant.targetX === null) return;

        const screenX = ant.targetX - game.camera.x;
        const screenY = ant.targetY - game.camera.y;
        const time = Date.now() / 500;
        const pulse = Math.sin(time) * 0.3 + 0.7;

        ctx.save();
        ctx.globalAlpha = pulse * 0.5;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(screenX, screenY, 12, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(screenX, screenY, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.restore();
    }

    function drawUI() {
        if (!game.antQueen.moving && game.antQueen.targetX === null) {
            ctx.save();
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(canvas.width / 2 - 140, canvas.height - 60, 280, 36);
            ctx.fillStyle = '#ffffff';
            ctx.font = '14px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('Tippe um die Koenigin zu bewegen', canvas.width / 2, canvas.height - 37);
            ctx.restore();
        }
    }

    // --- Game Loop ---
    function update() {
        updateAnt();
        updateCamera();
    }

    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawGrass();
        drawTargetIndicator();
        drawAntQueen();
        drawUI();
    }

    function gameLoop() {
        update();
        render();
        requestAnimationFrame(gameLoop);
    }

    // --- Init ---
    async function init() {
        await loadAllImages();

        // Center camera on ant queen
        centerCameraOn(game.antQueen.x, game.antQueen.y);

        // Hide loading screen
        setTimeout(() => {
            loadingScreen.classList.add('hidden');
            setTimeout(() => loadingScreen.remove(), 600);
        }, 300);

        gameLoop();
    }

    // --- Service Worker Registration ---
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').then(reg => {
            console.log('Service Worker registered:', reg.scope);
        }).catch(err => {
            console.warn('Service Worker registration failed:', err);
        });
    }

    init();

})();

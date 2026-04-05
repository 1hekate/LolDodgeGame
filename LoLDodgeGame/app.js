// ============================================
// LoL Dodge Game - Enhanced Edition
// ============================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// --- DOM ---
const startMenuContainer = document.getElementById('start-menu-container');
const startBtn = document.getElementById('start-btn');
const mainHighScoreEl = document.getElementById('main-high-score');

const gameOverContainer = document.getElementById('game-over-container');
const finalScoreElement = document.getElementById('final-score');
const endHighScoreEl = document.getElementById('end-high-score');
const highScoreRecordEl = document.getElementById('high-score-record');
const finalDifficultyEl = document.getElementById('final-difficulty');
const restartBtn = document.getElementById('restart-btn');

const cdQElement = document.getElementById('cd-q');
const cdEElement = document.getElementById('cd-e');
const skillQBox = document.getElementById('skill-q');
const skillEBox = document.getElementById('skill-e');
const scoreElement = document.getElementById('score');
const difficultyElement = document.getElementById('difficulty-level');

window.addEventListener('contextmenu', (e) => e.preventDefault());

// --- ASSET LOADING ---
const assets = {};
function loadImg(name, src) { const img = new Image(); img.src = src; assets[name] = img; }
loadImg('ezreal', './assets/ezreal.png');
loadImg('minion', './assets/minion.png');
loadImg('brandQ', './assets/brand_q.png');
loadImg('ezrealQ', './assets/ezreal_q.png');

function imgReady(img) { return img && img.complete && img.naturalWidth > 0; }

// --- SPRITE CONFIGS ---
const SP_EZREAL = { frames: 4, fw: 256, fh: 1024, cx: 15, cy: 280, cw: 230, ch: 500, rw: 55, rh: 120, speed: 150 };
const SP_MINION = { frames: 4, cols: 2, fw: 512, fh: 512, cx: 80, cy: 50, cw: 380, ch: 420, rw: 50, rh: 55, speed: 200 };
const SP_EZ_Q = { cx: 100, cy: 300, cw: 800, ch: 400, rw: 56, rh: 28 };
const SP_BRAND_Q = { cx: 50, cy: 50, cw: 900, ch: 900, rw: 44, rh: 44 };

// --- CORRIDOR (Mid Lane Boundaries) ---
const CORRIDOR = [
    [0.03, 0.22], [0.22, 0.03], [0.78, 0.02], [0.97, 0.18],
    [0.97, 0.78], [0.78, 0.97], [0.22, 0.98], [0.03, 0.78]
];

function getCorridor() { return CORRIDOR.map(([rx, ry]) => ({ x: rx * canvas.width, y: ry * canvas.height })); }

function isInCorridor(px, py) {
    const poly = getCorridor();
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
        if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
}

function drawCorridorOverlay() {
    const poly = getCorridor();
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, canvas.width, canvas.height);
    ctx.moveTo(poly[0].x, poly[0].y);
    for (let i = poly.length - 1; i >= 0; i--) ctx.lineTo(poly[i].x, poly[i].y);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fill('evenodd');

    // Border glow
    ctx.beginPath();
    ctx.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
    ctx.closePath();
    ctx.strokeStyle = 'rgba(200, 170, 110, 0.25)';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(200, 170, 110, 0.3)';
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.restore();
}

// --- GAME STATE ---
let animationId, spawnEnemiesId, spawnDangersId, scoreIntervalId, difficultyIntervalId;
let score = 0, combo = 1, difficultyLevel = 1;
let highScore = localStorage.getItem('lolDodgeHighScore') || 0;
let gameState = 'MENU'; // MENU, PLAYING, GAME_OVER

let lastQTime = 0, lastETime = 0;
const qCooldown = 500, eCooldown = 3000, eRange = 250;
const enemies = [], projectiles = [], dangers = [], particles = [], floatingTexts = [], trails = [];
let isRightMouseDown = false;
const mouse = { x: canvas.width / 2, y: canvas.height / 2 };

// --- PARTICLE ---
class Particle {
    constructor(x, y, color) {
        this.x = x; this.y = y;
        const a = Math.random() * Math.PI * 2, s = Math.random() * 4 + 1;
        this.vx = Math.cos(a) * s; this.vy = Math.sin(a) * s;
        this.r = Math.random() * 4 + 1; this.color = color;
        this.alpha = 1; this.decay = Math.random() * 0.03 + 0.02;
    }
    update() { this.x += this.vx; this.y += this.vy; this.alpha -= this.decay; }
    draw() {
        if (this.alpha <= 0) return;
        ctx.save(); ctx.globalAlpha = this.alpha;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = this.color; ctx.shadowColor = this.color; ctx.shadowBlur = 5;
        ctx.fill(); ctx.restore();
    }
}

function spawnParticles(x, y, colors, n = 8) {
    for (let i = 0; i < n; i++) particles.push(new Particle(x, y, colors[Math.floor(Math.random() * colors.length)]));
}

// --- FLOATING TEXT ---
class FloatingText {
    constructor(x, y, text, color) {
        this.x = x; this.y = y; this.text = text; this.color = color;
        this.alpha = 1; this.vy = -1.5; this.scale = 1.3;
    }
    update() { this.y += this.vy; this.alpha -= 0.018; this.scale = Math.max(1, this.scale - 0.01); }
    draw() {
        if (this.alpha <= 0) return;
        ctx.save(); ctx.globalAlpha = this.alpha;
        ctx.font = `bold ${Math.round(18 * this.scale)}px Inter, Arial`; ctx.textAlign = 'center';
        ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.lineWidth = 3;
        ctx.strokeText(this.text, this.x, this.y);
        ctx.fillStyle = this.color; ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

// --- PLAYER (EZREAL) ---
class Player {
    constructor(x, y) {
        this.x = x; this.y = y; this.hitboxRadius = 15; this.speed = 3;
        this.targetX = x; this.targetY = y; this.isCasting = false;
        this.facingRight = true; this.frameIndex = 0; this.frameTimer = 0; this.lastTime = Date.now();
    }
    draw() {
        const img = assets.ezreal, sp = SP_EZREAL;
        ctx.save(); ctx.translate(this.x, this.y);
        if (!this.facingRight) ctx.scale(-1, 1);
        // Shadow
        ctx.beginPath(); ctx.ellipse(0, sp.rh * 0.35, sp.rw * 0.35, 8, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fill();
        if (imgReady(img)) {
            const srcX = this.frameIndex * sp.fw + sp.cx;
            ctx.drawImage(img, srcX, sp.cy, sp.cw, sp.ch, -sp.rw / 2, -sp.rh / 2, sp.rw, sp.rh);
        } else {
            ctx.beginPath(); ctx.arc(0, 0, this.hitboxRadius, 0, Math.PI * 2);
            const g = ctx.createRadialGradient(0, 0, 0, 0, 0, this.hitboxRadius);
            g.addColorStop(0, '#fff'); g.addColorStop(0.5, '#00dfff'); g.addColorStop(1, '#007bff');
            ctx.fillStyle = g; ctx.shadowColor = '#00dfff'; ctx.shadowBlur = 15; ctx.fill();
        }
        ctx.restore();
    }
    update() {
        const now = Date.now(), dt = now - this.lastTime; this.lastTime = now;
        if (this.isCasting) { this.draw(); return; }
        const dx = this.targetX - this.x, dy = this.targetY - this.y, dist = Math.hypot(dx, dy);
        if (dist > this.speed) {
            const angle = Math.atan2(dy, dx);
            let nx = this.x + Math.cos(angle) * this.speed, ny = this.y + Math.sin(angle) * this.speed;
            if (isInCorridor(nx, ny)) { this.x = nx; this.y = ny; }
            else {
                if (isInCorridor(nx, this.y)) this.x = nx;
                if (isInCorridor(this.x, ny)) this.y = ny;
            }
            if (Math.abs(dx) > 1) this.facingRight = dx > 0;
            this.frameTimer += dt;
            if (this.frameTimer >= SP_EZREAL.speed) { this.frameTimer = 0; this.frameIndex = (this.frameIndex + 1) % SP_EZREAL.frames; }
            if (Math.random() < 0.3) trails.push({ x: this.x, y: this.y + 20, alpha: 0.2, r: Math.random() * 3 + 2 });
        } else {
            this.x = this.targetX; this.y = this.targetY; this.frameIndex = 0; this.frameTimer = 0;
        }
        this.draw();
    }
}

// --- ENEMY (MINION) - Pelerinli Hayalet Daire ---
class Enemy {
    constructor(x, y, speed) {
        this.x = x; this.y = y; this.hitboxRadius = 18; this.speed = speed;
        this.hoverOffset = Math.random() * Math.PI * 2; // Süzülme animasyonu fazı
    }
    draw() {
        const r = this.hitboxRadius;
        const hover = Math.sin(Date.now() * 0.004 + this.hoverOffset) * 3; // Hafif yukarı-aşağı süzülme
        ctx.save();
        ctx.translate(this.x, this.y + hover);

        // Gölge (yerde)
        ctx.beginPath(); ctx.ellipse(0, r + 8, r * 0.7, 5, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill();

        // Pelerin / Etek (üçgenimsi aşağı sarkan kumaş)
        ctx.beginPath();
        ctx.moveTo(-r * 1.1, -r * 0.2);
        ctx.quadraticCurveTo(-r * 0.6, r * 1.4, 0, r * 1.1);
        ctx.quadraticCurveTo(r * 0.6, r * 1.4, r * 1.1, -r * 0.2);
        ctx.fillStyle = '#3a0a0a'; ctx.fill();

        // Ana gövde (koyu kırmızı daire)
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
        const bodyGrad = ctx.createRadialGradient(0, -r * 0.3, r * 0.1, 0, 0, r);
        bodyGrad.addColorStop(0, '#8b1a1a'); bodyGrad.addColorStop(0.7, '#4a0808'); bodyGrad.addColorStop(1, '#1a0000');
        ctx.fillStyle = bodyGrad; ctx.fill();

        // Kukuleta (üst yarı dairesel kapüşon)
        ctx.beginPath(); ctx.arc(0, -r * 0.15, r * 0.85, Math.PI, 0, false);
        ctx.quadraticCurveTo(r * 0.9, -r * 0.5, 0, -r * 1.15);
        ctx.quadraticCurveTo(-r * 0.9, -r * 0.5, -r * 0.85, -r * 0.15);
        ctx.fillStyle = '#2a0505'; ctx.fill();

        // Parlayan gözler
        const eyeY = -r * 0.15, eyeSpacing = r * 0.3, eyeR = 2.5;
        ctx.shadowColor = '#ff3300'; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(-eyeSpacing, eyeY, eyeR, 0, Math.PI * 2);
        ctx.fillStyle = '#ff4400'; ctx.fill();
        ctx.beginPath(); ctx.arc(eyeSpacing, eyeY, eyeR, 0, Math.PI * 2);
        ctx.fillStyle = '#ff4400'; ctx.fill();

        // Dış aura/glow
        ctx.shadowColor = '#8b0000'; ctx.shadowBlur = 15;
        ctx.beginPath(); ctx.arc(0, 0, r + 3, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(139, 0, 0, 0.25)'; ctx.lineWidth = 2; ctx.stroke();

        ctx.restore();
    }
    update(player) {
        const dx = player.x - this.x, dy = player.y - this.y, a = Math.atan2(dy, dx);
        this.x += Math.cos(a) * this.speed; this.y += Math.sin(a) * this.speed;
        this.draw();
    }
}

// --- PROJECTILE (EZREAL Q) ---
class Projectile {
    constructor(x, y, velocity) {
        this.x = x; this.y = y; this.hitboxRadius = 8;
        this.velocity = velocity; this.angle = Math.atan2(velocity.y, velocity.x);
    }
    draw() {
        const img = assets.ezrealQ, s = SP_EZ_Q;
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle);
        ctx.shadowColor = '#00d2ff'; ctx.shadowBlur = 15;
        if (imgReady(img)) {
            ctx.drawImage(img, s.cx, s.cy, s.cw, s.ch, -s.rw / 2, -s.rh / 2, s.rw, s.rh);
        } else {
            ctx.beginPath(); ctx.ellipse(0, 0, 24, 8, 0, 0, Math.PI * 2);
            const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 24);
            g.addColorStop(0, 'white'); g.addColorStop(0.3, '#00d2ff'); g.addColorStop(1, 'rgba(0,210,255,0)');
            ctx.fillStyle = g; ctx.fill();
        }
        ctx.restore();
    }
    update() { this.x += this.velocity.x; this.y += this.velocity.y; this.draw(); }
}

// --- DANGER PROJECTILE (BRAND Q) ---
class DangerProjectile {
    constructor(x, y, velocity) {
        this.x = x; this.y = y;
        this.hitboxRadius = 13; this.velocity = velocity;
        this.angle = Math.atan2(velocity.y, velocity.x);
    }
    draw() {
        const img = assets.brandQ, s = SP_BRAND_Q;
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle);
        ctx.shadowColor = '#ff4500'; ctx.shadowBlur = 12;
        if (imgReady(img)) {
            ctx.drawImage(img, s.cx, s.cy, s.cw, s.ch, -s.rw / 2, -s.rh / 2, s.rw, s.rh);
        } else {
            ctx.beginPath(); ctx.arc(0, 0, this.hitboxRadius, 0, Math.PI * 2);
            const g = ctx.createRadialGradient(0, 0, 2, 0, 0, this.hitboxRadius);
            g.addColorStop(0, '#ffff00'); g.addColorStop(0.6, '#ff8c00'); g.addColorStop(1, '#ff4500');
            ctx.fillStyle = g; ctx.fill();
        }
        ctx.restore();
    }
    update() {
        this.x += this.velocity.x; this.y += this.velocity.y;
        this.draw();
    }
}

// --- EZREAL INSTANCE ---
const ezreal = new Player(canvas.width / 2, canvas.height / 2);

// --- INPUT ---
window.addEventListener('mousedown', (e) => {
    if (gameState !== 'PLAYING') return;
    if (e.button === 2) { isRightMouseDown = true; ezreal.targetX = e.clientX; ezreal.targetY = e.clientY; }
});
window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX; mouse.y = e.clientY;
    if (isRightMouseDown && gameState === 'PLAYING') { ezreal.targetX = e.clientX; ezreal.targetY = e.clientY; }
});
window.addEventListener('mouseup', (e) => { if (e.button === 2) isRightMouseDown = false; });

window.addEventListener('keydown', (e) => {
    if (gameState !== 'PLAYING') return;
    const key = e.key.toLowerCase();
    if (key === 's') { ezreal.targetX = ezreal.x; ezreal.targetY = ezreal.y; isRightMouseDown = false; }
    if (key === 'q') {
        const now = Date.now();
        if (now - lastQTime < qCooldown || ezreal.isCasting) return;
        lastQTime = now; ezreal.isCasting = true;
        const a = Math.atan2(mouse.y - ezreal.y, mouse.x - ezreal.x);
        projectiles.push(new Projectile(ezreal.x, ezreal.y, { x: Math.cos(a) * 10, y: Math.sin(a) * 10 }));
        setTimeout(() => { ezreal.isCasting = false; }, 100);
    }
    if (key === 'e') {
        const now = Date.now();
        if (now - lastETime < eCooldown) return;
        lastETime = now;
        const dx = mouse.x - ezreal.x, dy = mouse.y - ezreal.y;
        const dist = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
        let dashDist = Math.min(dist, eRange);
        // Find valid dash endpoint within corridor
        let dashX = ezreal.x + Math.cos(a) * dashDist;
        let dashY = ezreal.y + Math.sin(a) * dashDist;
        if (!isInCorridor(dashX, dashY)) {
            for (let d = dashDist; d > 0; d -= 5) {
                const tx = ezreal.x + Math.cos(a) * d, ty = ezreal.y + Math.sin(a) * d;
                if (isInCorridor(tx, ty)) { dashX = tx; dashY = ty; break; }
            }
        }
        // Dash particles at OLD position (before teleport)
        spawnParticles(ezreal.x, ezreal.y, ['#00dfff', '#007bff', '#ffffff', '#88eeff'], 12);
        ezreal.x = dashX; ezreal.y = dashY;
        ezreal.targetX = ezreal.x; ezreal.targetY = ezreal.y; isRightMouseDown = false;
    }
});

// --- SPAWN FUNCTIONS ---
function getSpeedMultiplier() { return 1 + (difficultyLevel - 1) * 0.1; }
function getEnemySpawnRate() { return Math.max(500, 1000 - (difficultyLevel - 1) * 80); }
function getDangerSpawnRate() { return Math.max(350, 800 - (difficultyLevel - 1) * 70); }

function startSurvivalScore() {
    clearInterval(scoreIntervalId);
    scoreIntervalId = setInterval(() => { score += 5; scoreElement.innerHTML = score; }, 1000);
}

function spawnEnemies() {
    clearInterval(spawnEnemiesId);
    spawnEnemiesId = setInterval(() => {
        const r = 20; let x, y;
        if (Math.random() < 0.5) { x = Math.random() < 0.5 ? -r : canvas.width + r; y = Math.random() * canvas.height; }
        else { x = Math.random() * canvas.width; y = Math.random() < 0.5 ? -r : canvas.height + r; }
        // Minion hızı ayarlandı (0.85 - 1.65 arası + difficulty multiplier)
        const speed = (Math.random() * 0.8 + 0.85) * getSpeedMultiplier();
        enemies.push(new Enemy(x, y, speed));
    }, getEnemySpawnRate());
}

function spawnDangers() {
    clearInterval(spawnDangersId);
    spawnDangersId = setInterval(() => {
        let x, y;
        const r = 25;
        if (Math.random() < 0.5) { x = Math.random() < 0.5 ? -r : canvas.width + r; y = Math.random() * canvas.height; }
        else { x = Math.random() * canvas.width; y = Math.random() < 0.5 ? -r : canvas.height + r; }

        let angle;
        if (Math.random() < 0.7) {
            angle = Math.atan2(ezreal.y - y, ezreal.x - x);
        } else {
            const tx = Math.random() * canvas.width, ty = Math.random() * canvas.height;
            angle = Math.atan2(ty - y, tx - x);
        }
        const speed = (Math.random() * 2 + 2.5) * getSpeedMultiplier();
        dangers.push(new DangerProjectile(x, y, { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed }));
    }, getDangerSpawnRate());
}

// --- DIFFICULTY ---
function startDifficulty() {
    clearInterval(difficultyIntervalId);
    difficultyIntervalId = setInterval(() => {
        difficultyLevel++;
        difficultyElement.innerText = difficultyLevel;
        spawnEnemies();
        spawnDangers();
    }, 30000);
}

// --- GAME LOOP ---
function animate() {
    animationId = requestAnimationFrame(animate);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawCorridorOverlay();

    if (gameState !== 'PLAYING') {
        ezreal.draw(); 
        return;
    }

    // Trails
    for (let i = trails.length - 1; i >= 0; i--) {
        const t = trails[i]; t.alpha -= 0.012;
        if (t.alpha <= 0) { trails.splice(i, 1); continue; }
        ctx.save(); ctx.globalAlpha = t.alpha;
        ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
        ctx.fillStyle = '#00dfff'; ctx.fill(); ctx.restore();
    }

    ezreal.update();

    // Projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i]; p.update();
        if (p.x < -50 || p.x > canvas.width + 50 || p.y < -50 || p.y > canvas.height + 50) {
            projectiles.splice(i, 1); combo = 1;
        }
    }

    // Dangers
    for (let i = dangers.length - 1; i >= 0; i--) {
        const d = dangers[i]; d.update();
        const dist = Math.hypot(ezreal.x - d.x, ezreal.y - d.y);
        if (dist - d.hitboxRadius - ezreal.hitboxRadius < 1) {
            gameOver(); continue;
        }
        if (d.x < -100 || d.x > canvas.width + 100 || d.y < -100 || d.y > canvas.height + 100) dangers.splice(i, 1);
    }

    // Enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i]; e.update(ezreal);
        const dist = Math.hypot(ezreal.x - e.x, ezreal.y - e.y);
        if (dist - e.hitboxRadius - ezreal.hitboxRadius < 1) {
            gameOver(); continue;
        }
        for (let j = projectiles.length - 1; j >= 0; j--) {
            const p = projectiles[j];
            if (Math.hypot(p.x - e.x, p.y - e.y) - e.hitboxRadius - p.hitboxRadius < 1) {
                spawnParticles(e.x, e.y, ['#ff4444', '#ff8800', '#ffcc00'], 10);
                const pts = 10 * combo; score += pts; combo++;
                floatingTexts.push(new FloatingText(e.x, e.y - 20, `+${pts}`, combo > 2 ? '#ffcc00' : '#ffffff'));
                if (combo > 2) scoreElement.innerHTML = `${score} <span style="color:#c8aa6e;font-size:18px">(x${combo - 1} Kombo)</span>`;
                else scoreElement.innerHTML = score;
                enemies.splice(i, 1); projectiles.splice(j, 1); break;
            }
        }
    }

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update(); particles[i].draw();
        if (particles[i].alpha <= 0) particles.splice(i, 1);
    }

    // Floating texts
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        floatingTexts[i].update(); floatingTexts[i].draw();
        if (floatingTexts[i].alpha <= 0) floatingTexts.splice(i, 1);
    }

    // Cooldowns
    const now = Date.now();
    const qLeft = qCooldown - (now - lastQTime);
    if (qLeft > 0) { cdQElement.innerText = (qLeft / 1000).toFixed(1); skillQBox.classList.add('on-cooldown'); }
    else { cdQElement.innerText = ''; skillQBox.classList.remove('on-cooldown'); }
    const eLeft = eCooldown - (now - lastETime);
    if (eLeft > 0) { cdEElement.innerText = (eLeft / 1000).toFixed(1); skillEBox.classList.add('on-cooldown'); }
    else { cdEElement.innerText = ''; skillEBox.classList.remove('on-cooldown'); }
}

// --- MENU & START LOGIC ---
function initMainMenu() {
    gameState = 'MENU';
    startMenuContainer.style.display = 'flex';
    gameOverContainer.style.display = 'none';
    mainHighScoreEl.innerText = highScore;
}

function startGame() {
    gameState = 'PLAYING';
    startMenuContainer.style.display = 'none';
    gameOverContainer.style.display = 'none';
    score = 0; combo = 1; difficultyLevel = 1;
    scoreElement.innerHTML = score; difficultyElement.innerText = '1';
    enemies.length = 0; projectiles.length = 0; dangers.length = 0;
    particles.length = 0; floatingTexts.length = 0; trails.length = 0;
    ezreal.x = canvas.width / 2; ezreal.y = canvas.height / 2;
    ezreal.targetX = ezreal.x; ezreal.targetY = ezreal.y; ezreal.isCasting = false;
    lastQTime = 0; lastETime = 0;

    startSurvivalScore();
    spawnEnemies();
    spawnDangers();
    startDifficulty();
}

startBtn.addEventListener('click', startGame);

// --- GAME OVER & RESTART ---
function gameOver() {
    gameState = 'GAME_OVER';
    isRightMouseDown = false;
    clearInterval(spawnEnemiesId); clearInterval(spawnDangersId);
    clearInterval(scoreIntervalId); clearInterval(difficultyIntervalId);

    // High Score check
    let newRecord = false;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('lolDodgeHighScore', highScore);
        newRecord = true;
    }

    finalScoreElement.innerText = score;
    endHighScoreEl.innerText = highScore;
    highScoreRecordEl.style.display = newRecord ? 'block' : 'none';
    finalDifficultyEl.innerText = `Ulaşılan Seviye: ${difficultyLevel}`;
    gameOverContainer.style.display = 'block';
}

restartBtn.addEventListener('click', startGame);

// --- WINDOW RESIZE ---
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
});

// --- INITIALIZE ---
initMainMenu();
animate();
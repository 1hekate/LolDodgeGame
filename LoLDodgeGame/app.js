const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Game Over Elementlerini Seçme
const gameOverContainer = document.getElementById('game-over-container');
const finalScoreElement = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');

// Zamanlayıcıları ve Animasyonu Durdurabilmek İçin Anahtarlar
let animationId;
let spawnEnemiesId;
let spawnDangersId;
let scoreIntervalId;
// Arayüz Elementlerini Seçme
const cdQElement = document.getElementById('cd-q');
const cdEElement = document.getElementById('cd-e');
const skillQBox = document.getElementById('skill-q');
const skillEBox = document.getElementById('skill-e');
// Skor Elementini Seçme ve Başlangıç Skoru
// Skor ve Kombo Elementlerini Seçme
const scoreElement = document.getElementById('score');
let score = 0;
let combo = 1; // Çarpanımız başlangıçta 1

// Hayatta kalma puanı: Her saniye 5 puan ekler
setInterval(() => {
    score += 5;
    scoreElement.innerHTML = score;
}, 1000);

// Sağ tıklayınca açılan varsayılan tarayıcı menüsünü kapatalım (LoL'deki gibi rahat tıklamak için)
window.addEventListener('contextmenu', (e) => e.preventDefault());

// --- 1. OYUNCU (EZREAL) SINIFI (SAF KOD) ---
class Player {
    constructor(x, y, radius, color) {
        this.x = x;
        this.y = y;
        this.radius = 25; // İdeal boyut
        this.speed = 4; 
        
        this.targetX = x;
        this.targetY = y;
        this.isCasting = false; 
    }

    draw() {
        ctx.save();
        ctx.beginPath();
        
        // Ana daireyi çiz
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        
        // Arcane Enerjisi Renk Geçişi
        const gradient = ctx.createRadialGradient(this.x, this.y, this.radius * 0.2, this.x, this.y, this.radius);
        gradient.addColorStop(0, '#ffffff');   // Merkez bembeyaz
        gradient.addColorStop(0.5, '#00dfff'); // Orta açık mavi
        gradient.addColorStop(1, '#007bff');   // Dış koyu mavi
        
        ctx.fillStyle = gradient;
        
        // Dış Parlama (Glow)
        ctx.shadowColor = '#00dfff';
        ctx.shadowBlur = 15;
        
        ctx.fill();
        ctx.restore();
    }

    update() {
        if (this.isCasting) {
            this.draw();
            return; 
        }

        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const distance = Math.hypot(dx, dy);

        if (distance > this.speed) {
            const angle = Math.atan2(dy, dx);
            this.x += Math.cos(angle) * this.speed;
            this.y += Math.sin(angle) * this.speed;
        } else {
            this.x = this.targetX;
            this.y = this.targetY;
        }

        this.draw(); 
    }
}

// --- 2. DÜŞMAN (MİNYON) SINIFI (SAF KOD) ---
class Enemy {
    constructor(x, y, radius, color, speed) {
        this.x = x;
        this.y = y;
        this.radius = 25; // Minyon boyutu
        this.color = color;
        this.speed = speed;
    }

    draw() {
        ctx.save();
        
        // Ana Kırmızı Gövde
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#cc0000'; // Klasik minyon kırmızısı
        ctx.fill();
        
        // Üzerindeki Koyu Gölge/Kukuleta Detayı
        ctx.beginPath();
        ctx.arc(this.x, this.y - this.radius * 0.2, this.radius * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = '#660000';
        ctx.fill();
        
        ctx.restore();
    }

    update(player) {
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        this.x += Math.cos(angle) * this.speed;
        this.y += Math.sin(angle) * this.speed;
        this.draw();
    }
}

// --- 3. Q YETENEĞİ (EZREAL MERMİSİ - DÖNEN IŞIN) ---
class Projectile {
    constructor(x, y, radius, color, velocity) {
        this.x = x;
        this.y = y;
        this.radius = 8; // Işın kalınlığı
        this.color = color;
        this.velocity = velocity;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Merminin gidiş yönüne göre döndür
        const angle = Math.atan2(this.velocity.y, this.velocity.x);
        ctx.rotate(angle);

        ctx.beginPath();
        ctx.ellipse(0, 0, this.radius * 3, this.radius, 0, 0, Math.PI * 2);

        // Lazer Efekti
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius * 3);
        gradient.addColorStop(0, 'white');       
        gradient.addColorStop(0.3, '#00d2ff');   
        gradient.addColorStop(1, 'rgba(0, 210, 255, 0)'); 

        ctx.fillStyle = gradient;
        ctx.shadowColor = '#00d2ff';
        ctx.shadowBlur = 15;

        ctx.fill();
        ctx.restore();
    }

    update() {
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.draw();
    }
}

// --- 4. DÜŞMAN YETENEĞİ (BRAND Q) SINIFI (SAF KOD) ---
class DangerProjectile {
    constructor(x, y, radius, color, velocity) {
        this.x = x;
        this.y = y;
        this.radius = 18; // Alev topu boyutu
        this.color = color;   
        this.velocity = velocity; 
    }

    draw() {
        ctx.save();
        
        // Ateş Parlaması
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ff4500'; 
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        
        // Ateş Renk Geçişi
        const gradient = ctx.createRadialGradient(this.x, this.y, this.radius * 0.1, this.x, this.y, this.radius);
        gradient.addColorStop(0, '#ffff00');   // Sarı Merkez
        gradient.addColorStop(0.6, '#ff8c00'); // Turuncu
        gradient.addColorStop(1, '#ff4500');   // Kırmızımsı Dış
        
        ctx.fillStyle = gradient;
        ctx.fill();
        
        ctx.restore();
    }

    update() {
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.draw();
    }
}
// Sahnede uçuşan tüm düşman yeteneklerini tutacağımız dizi
const dangers = [];

// Sahnede uçuşan tüm Q yeteneklerini tutacağımız dizi
const projectiles = [];

const enemies = []; // Sahnedeki tüm minyonları burada tutacağız
// --- ZAMANLAYICILARI BAŞLATAN FONKSİYONLAR ---

function startSurvivalScore() {
    // ESKİSİNİ YOK ET
    clearInterval(scoreIntervalId); 
    
    scoreIntervalId = setInterval(() => {
        score += 5;
        scoreElement.innerHTML = score;
    }, 1000);
}

function spawnEnemies() {
    // ESKİSİNİ YOK ET
    clearInterval(spawnEnemiesId); 
    
    spawnEnemiesId = setInterval(() => {
        const radius = 20; // Minyon boyutu (Büyüttük)
        let x, y;

        if (Math.random() < 0.5) {
            x = Math.random() < 0.5 ? 0 - radius : canvas.width + radius;
            y = Math.random() * canvas.height;
        } else {
            x = Math.random() * canvas.width;
            y = Math.random() < 0.5 ? 0 - radius : canvas.height + radius;
        }

        const color = 'red';
        const speed = Math.random() * 1.1 + 1.2; 

        enemies.push(new Enemy(x, y, radius, color, speed));
    }, 1000); // 1 saniyede bir gelsin
}

function spawnDangers() {
    // ESKİSİNİ YOK ET
    clearInterval(spawnDangersId); 
    
    spawnDangersId = setInterval(() => {
        const radius = 25; // Brand Q boyutu
        let x, y;

        if (Math.random() < 0.5) {
            x = Math.random() < 0.5 ? 0 - radius : canvas.width + radius;
            y = Math.random() * canvas.height;
        } else {
            x = Math.random() * canvas.width;
            y = Math.random() < 0.5 ? 0 - radius : canvas.height + radius;
        }

        const targetX = Math.random() * canvas.width;
        const targetY = Math.random() * canvas.height;
        const angle = Math.atan2(targetY - y, targetX - x);

        const speed = Math.random() * 2 * 2.5; 
        
        const velocity = {
            x: Math.cos(angle) * speed,
            y: Math.sin(angle) * speed
        };

        dangers.push(new DangerProjectile(x, y, radius, 'orange', velocity));
    }, 800); // .8 saniyede bir gelsin
}

// Ezreal'ı tam ortaya oluşturuyoruz
const ezreal = new Player(canvas.width / 2, canvas.height / 2, 20, 'blue');

// Sağ tık basılı tutuluyor mu kontrol etmek için bir anahtar (state)
let isRightMouseDown = false;

// Fare tuşuna basıldığında
window.addEventListener('mousedown', (e) => {
    if (e.button === 2) { // Sağ tık ise
        isRightMouseDown = true; // Anahtarı aç
        ezreal.targetX = e.clientX; // Hedefi güncelle
        ezreal.targetY = e.clientY;
    }
});

// Farenin anlık konumunu tutacağımız obje
const mouse = {
    x: canvas.width / 2,
    y: canvas.height / 2
};

let lastQTime = 0; // Son Q atma zamanımızı tutacak
const qCooldown = 500; // 0.5 saniye (500 milisaniye) bekleme süresi
let lastETime = 0; // Son E atma zamanımızı tutacak
const eCooldown = 3000; // 3 saniye (3000 milisaniye) bekleme süresi
const eRange = 250; // Karakterin maksimum sıçrama menzili (piksel cinsinden)

// Fare ekranda her hareket ettiğinde bu koordinatları güncelliyoruz
window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    
    // Sağ tık basılıysa karakteri de yürütmeye devam et (Önceki kodumuz)
    if (isRightMouseDown) { 
        ezreal.targetX = e.clientX;
        ezreal.targetY = e.clientY;
    }
});

// Fare tuşu bırakıldığında
window.addEventListener('mouseup', (e) => {
    if (e.button === 2) { // Sağ tık bırakıldıysa
        isRightMouseDown = false; // Anahtarı kapat (Karakter son tıkladığın yere gidip duracak)
    }
});

// Klavyeden bir tuşa basıldığında
window.addEventListener('keydown', (e) => {
    
    // S Tuşu - Olduğu yerde durdur
    if (e.key === 's' || e.key === 'S') {
        ezreal.targetX = ezreal.x;
        ezreal.targetY = ezreal.y;
        isRightMouseDown = false; 
    }

    // Q Tuşu - Yetenek fırlatma
    if (e.key === 'q' || e.key === 'Q') {
        const currentTime = Date.now(); // Şu anki milisaniye cinsi zaman
        
        // YENİ: Eğer son Q atışından bu yana 500ms geçmediyse VEYA karakter halihazırda animasyondaysa atış yapma
        if (currentTime - lastQTime < qCooldown || ezreal.isCasting) {
            return;
        }
        
        // Q başarıyla atıldı, son atış zamanını güncelle
        lastQTime = currentTime;

        // Karakteri 0.1 saniyeliğine durdur (Cast animasyonu hissi)
        ezreal.isCasting = true;

        const angle = Math.atan2(mouse.y - ezreal.y, mouse.x - ezreal.x);
        const velocity = {
            x: Math.cos(angle) * 10,
            y: Math.sin(angle) * 10
        };
        projectiles.push(new Projectile(ezreal.x, ezreal.y, 8, 'yellow', velocity));

        // 100 milisaniye (0.1 sn) sonra karakterin kilitlenmesini kaldır
        setTimeout(() => {
            ezreal.isCasting = false;
        }, 100); 
    }
    // E Tuşu - Sıçra / Işınlanma (Dash)
    if (e.key === 'e' || e.key === 'E') {
        const currentTime = Date.now();
        
        // Eğer bekleme süresi (3 saniye) dolmadıysa hiçbir şey yapma
        if (currentTime - lastETime < eCooldown) {
            return;
        }

        // Bekleme süresi dolmuş, yeteneği kullanıyoruz
        lastETime = currentTime;

        // Karakter ile fare arasındaki mesafeyi ve açıyı hesapla
        const dx = mouse.x - ezreal.x;
        const dy = mouse.y - ezreal.y;
        const distance = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);

        // Işınlanma mesafesini belirle: 
        // Fare çok yakındaysa farenin olduğu yere (distance), çok uzaktaysa maksimum menzile (eRange) ışınlan.
        const dashDistance = Math.min(distance, eRange);

        // Karakterin X ve Y koordinatlarını anında yeni yerine taşı
        ezreal.x += Math.cos(angle) * dashDistance;
        ezreal.y += Math.sin(angle) * dashDistance;

        // Işınlandıktan sonra eski hedefine geri koşmaması için hedefi sıfırla
        ezreal.targetX = ezreal.x;
        ezreal.targetY = ezreal.y;
        isRightMouseDown = false; 
    }
});

// Oyun Döngüsü (Game Loop) - Saniyede 60 kere çalışır
function animate() {
    // 1. DEĞİŞİKLİK: Animasyona bir ID verdik ki vurulunca durdurabilelim
    animationId = requestAnimationFrame(animate); 
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ezreal.update();

    // Bizim Q mermilerimiz
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const projectile = projectiles[i];
        projectile.update();

        if (projectile.x + projectile.radius < 0 || projectile.x - projectile.radius > canvas.width || projectile.y + projectile.radius < 0 || projectile.y - projectile.radius > canvas.height) {
            projectiles.splice(i, 1);
            combo = 1; 
        }
    }

    // Brand Q'ları (Turuncu)
    for (let i = dangers.length - 1; i >= 0; i--) {
        const danger = dangers[i];
        danger.update();

        // 2. DEĞİŞİKLİK: Brand Q Bize Değdi Mi? (GAME OVER KONTROLÜ)
        const distToPlayer = Math.hypot(ezreal.x - danger.x, ezreal.y - danger.y);
        if (distToPlayer - danger.radius - ezreal.radius < 1) {
            cancelAnimationFrame(animationId); // Oyunu dondur!
            gameOver(); // Game Over ekranını aç
        }

        if (danger.x + danger.radius < -50 || danger.x - danger.radius > canvas.width + 50 || danger.y + danger.radius < -50 || danger.y - danger.radius > canvas.height + 50) {
            dangers.splice(i, 1);
        }
    }

    // Minyonlar ve Çarpışmalar
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        enemy.update(ezreal);

        // 3. DEĞİŞİKLİK: Kırmızı Minyon Bize Değdi Mi? (GAME OVER KONTROLÜ)
        const distToPlayer = Math.hypot(ezreal.x - enemy.x, ezreal.y - enemy.y);
        if (distToPlayer - enemy.radius - ezreal.radius < 1) {
            cancelAnimationFrame(animationId); // Oyunu dondur!
            gameOver(); // Game Over ekranını aç
            continue; // Bu minyon öldüğü için alttaki kodları atla
        }

        // Bizim Q Minyona Değdi Mi?
        for (let j = projectiles.length - 1; j >= 0; j--) {
            const projectile = projectiles[j];
            const distToProjectile = Math.hypot(projectile.x - enemy.x, projectile.y - enemy.y);

            if (distToProjectile - enemy.radius - projectile.radius < 1) {
                enemies.splice(i, 1);
                projectiles.splice(j, 1);
                
                const kazanilanPuan = 10 * combo; 
                score += kazanilanPuan;
                combo++; 
                
                if (combo > 2) {
                    scoreElement.innerHTML = `${score} <span style="color: #a38d26; font-size: 20px;">(x${combo-1} Kombo)</span>`;
                } else {
                    scoreElement.innerHTML = score;
                }
                break; 
            }
        }
    }

    // --- HUD: YETENEK BEKLEME SÜRELERİ ---
    const currentTime = Date.now();
    const qTimeLeft = qCooldown - (currentTime - lastQTime);
    if (qTimeLeft > 0) {
        cdQElement.innerText = (qTimeLeft / 1000).toFixed(1);
        skillQBox.classList.add('on-cooldown');
    } else {
        cdQElement.innerText = '';
        skillQBox.classList.remove('on-cooldown');
    }

    const eTimeLeft = eCooldown - (currentTime - lastETime);
    if (eTimeLeft > 0) {
        cdEElement.innerText = (eTimeLeft / 1000).toFixed(1); 
        skillEBox.classList.add('on-cooldown');
    } else {
        cdEElement.innerText = '';
        skillEBox.classList.remove('on-cooldown');
    }
}
// --- OYUN BİTİŞ VE YENİDEN BAŞLATMA SİSTEMİ ---

function gameOver() {
    isRightMouseDown = false; // Basılı kalan sağ tıkı iptal et

    // Arkada sürekli minyon ve puan üreten saatleri durdur
    clearInterval(spawnEnemiesId);
    clearInterval(spawnDangersId);
    clearInterval(scoreIntervalId);

    // Ekranda menüyü göster ve final skorunu ortadaki yazıya aktar
    finalScoreElement.innerText = score;
    gameOverContainer.style.display = 'block';
}

function restartGame() {
    // 1. Menüyü gizle
    gameOverContainer.style.display = 'none';

    // 2. Skorları sıfırla
    score = 0;
    combo = 1;
    scoreElement.innerHTML = score;
    
    // 3. Sahnedeki eski mermileri ve düşmanları temizle
    enemies.length = 0; 
    projectiles.length = 0;
    dangers.length = 0;

    // 4. Ezreal'i ekranın ortasına al ve durdur
    ezreal.x = canvas.width / 2;
    ezreal.y = canvas.height / 2;
    ezreal.targetX = ezreal.x;
    ezreal.targetY = ezreal.y;
    ezreal.isCasting = false;

    // 5. Oyunu tekrar başlat!
    startSurvivalScore();
    spawnEnemies();
    spawnDangers();
    animate();
}

// "Yeniden Başla" butonunu dinle
restartBtn.addEventListener('click', restartGame);

// SAYFA İLK AÇILDIĞINDA OYUNU BAŞLATAN KODLAR
startSurvivalScore();
spawnEnemies();
spawnDangers();
animate();
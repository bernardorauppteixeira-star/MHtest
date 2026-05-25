const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const gameWidth = Math.min(800, window.innerWidth - 20);
const gameHeight = 600;
canvas.width = gameWidth;
canvas.height = gameHeight;

// ===== CLASSES DO JOGO =====
class Projectile {
    constructor(x, y, targetX, targetY, damage, color, speed, owner = 'player') {
        this.x = x;
        this.y = y;
        this.size = 8;
        const dx = targetX - x;
        const dy = targetY - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        this.vx = (dx / dist) * speed;
        this.vy = (dy / dist) * speed;
        this.damage = damage;
        this.color = color;
        this.owner = owner;
        this.maxDistance = 800;
        this.traveled = 0;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.traveled += Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }

    isAlive() {
        return this.traveled < this.maxDistance && this.x > 0 && this.x < gameWidth && this.y > 0 && this.y < gameHeight;
    }
}

class Player {
    constructor() {
        this.x = gameWidth / 2;
        this.y = gameHeight - 150;
        this.width = 15;
        this.height = 20;
        this.speed = 5;
        this.health = 100;
        this.maxHealth = 100;
        this.attackCooldown = 0;
        this.attacking = false;
        this.attackRange = 80;
        this.baseDamage = 3.5;
        this.totalUpgrades = 0;
        this.weapon = null;
    }

    update(keys) {
        if (keys['w'] || keys['arrowup']) this.y -= this.speed;
        if (keys['s'] || keys['arrowdown']) this.y += this.speed;
        if (keys['a'] || keys['arrowleft']) this.x -= this.speed;
        if (keys['d'] || keys['arrowright']) this.x += this.speed;

        this.x = Math.max(0, Math.min(this.x, gameWidth - this.width));
        this.y = Math.max(0, Math.min(this.y, gameHeight - this.height));

        if (this.attackCooldown > 0) this.attackCooldown--;
    }

    draw() {
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.strokeStyle = '#00aa00';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);

        if (this.attacking) {
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.attackRange, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    attack() {
        if (this.attackCooldown === 0) {
            this.attacking = true;
            this.attackCooldown = 20;
            setTimeout(() => { this.attacking = false; }, 100);
            return true;
        }
        return false;
    }
}

class Monster {
    constructor(phase, type = null) {
        this.phase = phase;
        this.type = type || this.chooseType();
        this.width = 80 + phase * 20;
        this.height = 100 + phase * 20;
        this.x = Math.random() * (gameWidth - this.width);
        this.y = 50 + Math.random() * 100;
        this.attackRange = 120;
        this.attackCooldown = 0;
        this.shootCooldown = 0;
        this.dashCooldown = 0;
        this.dashTimer = 0;
        this.direction = Math.random() > 0.5 ? 1 : -1;

        if (this.type === 'shooter') {
            this.health = 35 + phase * 15;
            this.speed = 1 + phase * 0.15;
            this.maxHealth = this.health;
            this.desiredDistance = 250;
            this.projectileSpeed = 6 + phase * 0.5;
        } else if (this.type === 'tank') {
            this.health = 90 + phase * 40;
            this.speed = 0.8 + phase * 0.2;
            this.maxHealth = this.health;
            this.dashCooldown = 100;
            this.dashTimer = 0;
            this.dashSpeed = 5 + phase * 0.8;
        } else {
            this.health = 50 + phase * 30;
            this.speed = 1 + phase * 0.5;
            this.maxHealth = this.health;
        }
    }

    chooseType() {
        const roll = Math.random();
        if (roll < 0.35) return 'shooter';
        if (roll < 0.65) return 'tank';
        return 'basic';
    }

    update(playerX, playerY) {
        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (this.type === 'shooter') {
            if (dist < this.desiredDistance * 0.8) {
                const awayX = (this.x - playerX) / dist;
                const awayY = (this.y - playerY) / dist;
                this.x += awayX * this.speed;
                this.y += awayY * this.speed;
            } else if (dist > this.desiredDistance + 40) {
                this.x += (dx / dist) * this.speed * 0.6;
                this.y += (dy / dist) * this.speed * 0.6;
            } else {
                this.x += this.speed * (Math.random() > 0.5 ? 1 : -1);
            }

            if (this.shootCooldown <= 0) {
                this.shootProjectile(playerX, playerY);
                this.shootCooldown = Math.max(50, 90 - this.phase * 10);
            } else {
                this.shootCooldown--;
            }
        } else if (this.type === 'tank') {
            if (this.dashTimer > 0) {
                this.x += (dx / dist) * this.dashSpeed;
                this.y += (dy / dist) * this.dashSpeed;
                this.dashTimer--;
            } else {
                if (dist > this.attackRange) {
                    this.x += (dx / dist) * this.speed;
                    this.y += (dy / dist) * this.speed;
                }

                if (this.dashCooldown <= 0) {
                    this.dashTimer = 18;
                    this.dashCooldown = 140 - this.phase * 10;
                } else {
                    this.dashCooldown--;
                }
            }
        } else {
            if (dist > this.attackRange) {
                if (dx > 0) this.x += this.speed;
                else this.x -= this.speed;
                if (dy > 0) this.y += this.speed;
                else this.y -= this.speed;
            }
        }

        this.x = Math.max(0, Math.min(this.x, gameWidth - this.width));
        this.y = Math.max(0, Math.min(this.y, gameHeight - this.height / 2));

        if (this.attackCooldown > 0) this.attackCooldown--;
    }

    shootProjectile(playerX, playerY) {
        const shots = Math.floor(Math.random() * 4) + 2;
        const baseAngle = Math.atan2(playerY - (this.y + this.height / 2), playerX - (this.x + this.width / 2));

        for (let i = 0; i < shots; i++) {
            const spread = (Math.random() - 0.5) * 0.4;
            const angle = baseAngle + spread;
            const targetX = this.x + this.width / 2 + Math.cos(angle) * 100;
            const targetY = this.y + this.height / 2 + Math.sin(angle) * 100;

            projectiles.push(new Projectile(
                this.x + this.width / 2,
                this.y + this.height / 2,
                targetX,
                targetY,
                this.getAttackDamage(),
                '#00ccff',
                this.projectileSpeed,
                'monster'
            ));
        }
    }

    draw() {
        if (this.type === 'shooter') {
            ctx.fillStyle = '#0055cc';
            ctx.strokeStyle = '#33ccff';
        } else if (this.type === 'tank') {
            ctx.fillStyle = '#770000';
            ctx.strokeStyle = '#ff5555';
        } else {
            ctx.fillStyle = '#cc0000';
            ctx.strokeStyle = '#ff0000';
        }

        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.lineWidth = 3;
        ctx.strokeRect(this.x, this.y, this.width, this.height);

        if (this.type === 'tank') {
            ctx.fillStyle = '#000000';
            ctx.fillRect(this.x + 8, this.y + 12, this.width - 16, 10);
        }

        ctx.fillStyle = '#ffff00';
        ctx.fillRect(this.x + 15, this.y + 20, 12, 12);
        ctx.fillRect(this.x + this.width - 27, this.y + 20, 12, 12);

        if (this.type === 'shooter') {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + this.height - 18, 8, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    getAttackDamage() {
        if (this.type === 'shooter') return 8 + this.phase * 2;
        if (this.type === 'tank') return 12 + this.phase * 4;
        return 5 + this.phase * 3;
    }
}

// ===== VARIÁVEIS GLOBAIS =====
let player = new Player();
let currentMonster = new Monster(1);
let phase = 1;
let monstersDefeated = 0;
let defeatedTotal = 0;
let keys = {};
let gameOver = false;
let isUpgrading = false;
let selectedUpgradeIndex = 0;
let gameStarted = false;
let isSelectingWeapon = false;
let selectedWeaponIndex = 0;
let projectiles = [];

const weapons = [
    { name: 'Espada ⚔️', type: 'sword', color: '#ffaa00', cooldown: 20, range: 80, damage: 14 },
    { name: 'Arco 🏹', type: 'bow', color: '#00ff00', cooldown: 30, range: 300, damage: 12, speed: 5 },
    { name: 'Varinha 🔮', type: 'staff', color: '#ff00ff', cooldown: 35, range: 200, damage: 15, speed: 6 },
    { name: 'Revolver 🔫', type: 'gun', color: '#ffff00', cooldown: 12, range: 400, damage: 4, speed: 10 }
];

// Itens especiais por tipo de arma (4 para cada)
const weaponSpecials = {
    sword: [
        { name: 'Fúria Crítica', special: true, effect: 'critChance', value: 12, desc: 'Aumenta chance de acerto crítico em 12%.' },
        { name: 'Sangramento', special: true, effect: 'bleed', value: 3, desc: 'Causa 3 de dano por tick por 5 ticks.' },
        { name: 'Giro Cortante', special: true, effect: 'spin', value: 1, desc: 'Ataque corpo-a-corpo em área reduzida.' },
        { name: 'Roubo de Vida', special: true, effect: 'lifeSteal', value: 6, desc: 'Restaura 6% do dano causado.' }
    ],
    bow: [
        { name: 'Tiro Múltiplo', special: true, effect: 'multishot', value: 3, desc: 'Dispara 3 flechas por tiro.' },
        { name: 'Flechas Perfurantes', special: true, effect: 'piercing', value: 1, desc: 'Projéteis perfuram inimigos.' },
        { name: 'Ponta Leve', special: true, effect: 'fastArrow', value: 3, desc: 'Aumenta velocidade das flechas.' },
        { name: 'Flecha Explosiva', special: true, effect: 'explosive', value: 1, desc: 'Projétil explode causando dano em área.' }
    ],
    staff: [
        { name: 'Corrente Elétrica', special: true, effect: 'chain', value: 2, desc: 'Projétil salta entre 2 inimigos.' },
        { name: 'Rajada Congelante', special: true, effect: 'slow', value: 20, desc: 'Ralentiza inimigos por 20% por alguns segundos.' },
        { name: 'Estouro Mágico', special: true, effect: 'aoe', value: 1, desc: 'Projétil causa dano em área ao atingir.' },
        { name: 'Penetração Mágica', special: true, effect: 'magicPen', value: 6, desc: 'Aumenta dano mágico em 6.' }
    ],
    gun: [
        { name: 'Tiro Automático', special: true, effect: 'auto', value: -4, desc: 'Reduz cooldown em 4 (torna semi-automático).' },
        { name: 'Projéteis Perfurantes', special: true, effect: 'piercing', value: 1, desc: 'Balas perfuram inimigos.' },
        { name: 'Maior Alcance', special: true, effect: 'range', value: 80, desc: 'Aumenta alcance da arma.' },
        { name: 'Munição Veloz', special: true, effect: 'bulletSpeed', value: 4, desc: 'Aumenta velocidade das balas.' }
    ]
};

const upgradeOptions = [
    { name: 'Vida Máxima +20', effect: 'maxHealth', value: 20 },
    { name: 'Dano +5', effect: 'baseDamage', value: 5 },
    { name: 'Velocidade +1', effect: 'speed', value: 1 },
    { name: 'Alcance +15', effect: 'attackRange', value: 45 }
];

// ===== EVENT LISTENERS =====
document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    
    if (isSelectingWeapon) {
        if (e.key === 'ArrowLeft' || e.key === 'a') {
            selectedWeaponIndex = (selectedWeaponIndex - 1 + weapons.length) % weapons.length;
        }
        if (e.key === 'ArrowRight' || e.key === 'd') {
            selectedWeaponIndex = (selectedWeaponIndex + 1) % weapons.length;
        }
        if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            selectWeapon(selectedWeaponIndex);
        }
    } else if (isUpgrading) {
        const combined = getCombinedUpgrades();
        if (e.key === 'ArrowLeft' || e.key === 'a') {
            selectedUpgradeIndex = (selectedUpgradeIndex - 1 + combined.length) % combined.length;
        }
        if (e.key === 'ArrowRight' || e.key === 'd') {
            selectedUpgradeIndex = (selectedUpgradeIndex + 1) % combined.length;
        }
        if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            applyUpgrade(selectedUpgradeIndex);
        }
    } else {
        if (e.key === ' ') {
            e.preventDefault();
            attemptAttack();
        }
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener('click', (e) => {
    if (isSelectingWeapon) {
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        
        const buttonWidth = 160;
        const buttonHeight = 60;
        const spacing = 15;
        const totalWidth = weapons.length * (buttonWidth + spacing);
        const startX = (gameWidth - totalWidth) / 2;
        const startY = gameHeight / 2 - 40;
        
        for (let i = 0; i < weapons.length; i++) {
            const bx = startX + i * (buttonWidth + spacing);
            const by = startY;
            if (clickX >= bx && clickX <= bx + buttonWidth && clickY >= by && clickY <= by + buttonHeight) {
                selectWeapon(i);
                break;
            }
        }
    } else if (isUpgrading) {
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        
        const combined = getCombinedUpgrades();
        const buttonWidth = 180;
        const buttonHeight = 60;
        const spacing = 20;
        const totalWidth = combined.length * (buttonWidth + spacing);
        const startX = (gameWidth - totalWidth) / 2;
        const startY = gameHeight / 2 - 40;
        
        for (let i = 0; i < combined.length; i++) {
            const bx = startX + i * (buttonWidth + spacing);
            const by = startY;
            if (clickX >= bx && clickX <= bx + buttonWidth && clickY >= by && clickY <= by + buttonHeight) {
                applyUpgrade(i);
                break;
            }
        }
    } else {
        attemptAttack();
    }
});

// ===== FUNÇÕES DE JOGO =====
function selectWeapon(index) {
    player.weapon = weapons[index];
    isSelectingWeapon = false;
    gameStarted = true;
}

function attemptAttack() {
    if (!player.weapon) return;
    
    if (player.attackCooldown === 0) {
        const weapon = player.weapon;
        const targetX = currentMonster.x + currentMonster.width / 2;
        const targetY = currentMonster.y + currentMonster.height / 2;
        
        if (weapon.type === 'sword') {
            // Ataque melee
            const dx = targetX - (player.x + player.width / 2);
            const dy = targetY - (player.y + player.height / 2);
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < weapon.range) {
                currentMonster.health -= weapon.damage;
                checkMonsterDeath();
            }
            player.attackCooldown = weapon.cooldown;
        } else {
            // Ataque à distância (projétil)
            const proj = new Projectile(
                player.x + player.width / 2,
                player.y + player.height / 2,
                targetX,
                targetY,
                weapon.damage,
                weapon.color,
                weapon.speed
            );
            projectiles.push(proj);
            player.attackCooldown = weapon.cooldown;
        }
    }
}

function updateProjectiles() {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        projectiles[i].update();
        
        if (!projectiles[i].isAlive()) {
            projectiles.splice(i, 1);
            continue;
        }
        
        const p = projectiles[i];

        if (p.owner === 'player') {
            const isHit = 
                p.x < currentMonster.x + currentMonster.width &&
                p.x > currentMonster.x &&
                p.y < currentMonster.y + currentMonster.height &&
                p.y > currentMonster.y;
            
            if (isHit) {
                currentMonster.health -= p.damage;
                projectiles.splice(i, 1);
                checkMonsterDeath();
            }
        } else {
            const isHit = 
                p.x < player.x + player.width &&
                p.x > player.x &&
                p.y < player.y + player.height &&
                p.y > player.y;
            
            if (isHit) {
                player.health -= p.damage;
                projectiles.splice(i, 1);
            }
        }
    }
}

function drawProjectiles() {
    for (let proj of projectiles) {
        proj.draw();
    }
}

function drawWeaponSelection() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(0, 0, gameWidth, gameHeight);
    
    ctx.fillStyle = '#00ff00';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Escolha sua Arma', gameWidth / 2, 80);
    
    const buttonWidth = 160;
    const buttonHeight = 60;
    const spacing = 15;
    const totalWidth = weapons.length * (buttonWidth + spacing);
    const startX = (gameWidth - totalWidth) / 2;
    const startY = gameHeight / 2 - 40;
    
    for (let i = 0; i < weapons.length; i++) {
        const bx = startX + i * (buttonWidth + spacing);
        const by = startY;
        const isSelected = i === selectedWeaponIndex;
        
        ctx.fillStyle = isSelected ? '#00ff00' : '#003300';
        ctx.fillRect(bx, by, buttonWidth, buttonHeight);
        
        ctx.strokeStyle = isSelected ? '#00ff00' : '#00aa00';
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.strokeRect(bx, by, buttonWidth, buttonHeight);
        
        ctx.fillStyle = '#000000';
        ctx.font = isSelected ? 'bold 13px Arial' : '13px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(weapons[i].name, bx + buttonWidth / 2, by + buttonHeight / 2 + 5);
    }
    
    ctx.fillStyle = '#00d4ff';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Use as Setas ou Clique para Selecionar', gameWidth / 2, gameHeight - 60);
    ctx.fillText('Pressione Espaço ou Enter para Confirmar', gameWidth / 2, gameHeight - 30);
}

function updateHealthBars() {
    const playerBar = document.getElementById('playerHealth');
    const monsterBar = document.getElementById('monsterHealth');
    
    playerBar.style.width = (player.health / player.maxHealth) * 100 + '%';
    monsterBar.style.width = (currentMonster.health / currentMonster.maxHealth) * 100 + '%';
}

function updateUI() {
    document.getElementById('phaseDisplay').textContent = `Fase: ${phase}`;
    const weaponName = player.weapon ? player.weapon.name : 'Nenhuma';
    document.getElementById('statsDisplay').innerHTML = 
        `Arma: ${weaponName} | Monstros: ${monstersDefeated} | Vida: ${Math.max(0, Math.round(player.health))}/${player.maxHealth} | Upgrades: ${player.totalUpgrades}`;
}

function spawnNewMonster() {
    monstersDefeated++;
    defeatedTotal++;
    // A cada 3 monstros derrotados, avançar de fase, sem resetar o contador
    if (monstersDefeated % 3 === 0) {
        phase++;
    }
    projectiles = [];
    currentMonster = new Monster(phase);
    isUpgrading = true;
    selectedUpgradeIndex = 0;
}

function checkMonsterDeath() {
    if (currentMonster.health <= 0 && !isUpgrading && !gameOver) {
        spawnNewMonster();
    }
}

function getCombinedUpgrades() {
    const combined = [...upgradeOptions];
    if (player.weapon && weaponSpecials[player.weapon.type]) {
        const specials = weaponSpecials[player.weapon.type];
        const guaranteed = defeatedTotal > 0 && defeatedTotal % 10 === 0;
        const rareChance = 0.12; // 12% chance to show a special normally

        if (guaranteed) {
            const s = specials[Math.floor(Math.random() * specials.length)];
            combined.push(s);
        } else if (Math.random() < rareChance) {
            const s = specials[Math.floor(Math.random() * specials.length)];
            combined.push(s);
        }
    }
    return combined;
}

function applySpecial(special) {
    if (!player.weapon) return;
    const w = player.weapon;
    switch (special.effect) {
        case 'critChance':
            w.critChance = (w.critChance || 0) + special.value;
            break;
        case 'bleed':
            w.bleed = { damagePerTick: special.value, ticks: 5 };
            break;
        case 'spin':
            w.spin = true;
            w.range = (w.range || 80) + 20;
            break;
        case 'lifeSteal':
            w.lifeSteal = (w.lifeSteal || 0) + special.value;
            break;
        case 'multishot':
            w.multishot = Math.max(w.multishot || 1, special.value);
            break;
        case 'piercing':
            w.piercing = true;
            break;
        case 'fastArrow':
            w.speed = (w.speed || 5) + special.value;
            break;
        case 'explosive':
            w.explosive = true;
            break;
        case 'chain':
            w.chain = { count: special.value };
            break;
        case 'slow':
            w.slow = special.value;
            break;
        case 'aoe':
            w.aoe = true;
            break;
        case 'magicPen':
            w.damage += special.value;
            break;
        case 'auto':
            w.cooldown = Math.max(1, (w.cooldown || 12) + special.value);
            break;
        case 'range':
            w.range = (w.range || 200) + special.value;
            break;
        case 'bulletSpeed':
            w.speed = (w.speed || 10) + special.value;
            break;
    }
}

function applyUpgrade(index) {
    const combined = getCombinedUpgrades();
    const pick = combined[index];
    if (!pick) return;

    if (pick.special) {
        applySpecial(pick);
    } else {
        player[pick.effect] += pick.value;
        if (pick.effect === 'maxHealth') player.health += pick.value;
    }

    player.totalUpgrades++;
    isUpgrading = false;
}

function drawUpgradeMenu() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, gameWidth, gameHeight);
    
    ctx.fillStyle = '#00ff00';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Escolha um Upgrade', gameWidth / 2, 80);
    
    const combined = getCombinedUpgrades();
    const buttonWidth = 180;
    const buttonHeight = 60;
    const spacing = 20;
    const totalWidth = combined.length * (buttonWidth + spacing);
    const startX = (gameWidth - totalWidth) / 2;
    const startY = gameHeight / 2 - 40;
    
    for (let i = 0; i < combined.length; i++) {
        const bx = startX + i * (buttonWidth + spacing);
        const by = startY;
        const isSelected = i === selectedUpgradeIndex;
        
        ctx.fillStyle = isSelected ? '#00ff00' : '#003300';
        ctx.fillRect(bx, by, buttonWidth, buttonHeight);
        
        ctx.strokeStyle = isSelected ? '#00ff00' : '#00aa00';
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.strokeRect(bx, by, buttonWidth, buttonHeight);
        
        ctx.fillStyle = '#000000';
        ctx.font = isSelected ? 'bold 14px Arial' : '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(combined[i].name, bx + buttonWidth / 2, by + buttonHeight / 2 + 5);
    }

    // Descrever o item selecionado
    if (combined[selectedUpgradeIndex]) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        const desc = combined[selectedUpgradeIndex].desc || '';
        ctx.fillText(desc, gameWidth / 2, startY + buttonHeight + 40);
    }

    ctx.fillStyle = '#00d4ff';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Use as Setas ou Clique para Selecionar', gameWidth / 2, gameHeight - 60);
    ctx.fillText('Pressione Espaço ou Enter para Confirmar', gameWidth / 2, gameHeight - 30);
}

function gameLoop() {
    // Limpar canvas
    ctx.fillStyle = '#0f1419';
    ctx.fillRect(0, 0, gameWidth, gameHeight);

    if (isSelectingWeapon) {
        drawWeaponSelection();
    } else if (isUpgrading) {
        // Desenhar o jogo ao fundo
        player.draw();
        currentMonster.draw();
        drawProjectiles();
        updateHealthBars();
        updateUI();
        
        // Desenhar menu de upgrade
        drawUpgradeMenu();
    } else if (!gameOver) {
        // Atualizar
        player.update(keys);
        currentMonster.update(player.x + player.width / 2, player.y + player.height / 2);
        updateProjectiles();

        // Verificar colisão de contato com o monstro (AABB - Axis-Aligned Bounding Box)
        const isColliding = 
            player.x < currentMonster.x + currentMonster.width &&
            player.x + player.width > currentMonster.x &&
            player.y < currentMonster.y + currentMonster.height &&
            player.y + player.height > currentMonster.y;

        if (isColliding && currentMonster.attackCooldown === 0) {
            player.health -= currentMonster.getAttackDamage();
            currentMonster.attackCooldown = 60;
        }

        // Verificar morte do monstro
        checkMonsterDeath();

        // Verificar morte do jogador
        if (player.health <= 0) {
            gameOver = true;
        }

        // Desenhar
        player.draw();
        currentMonster.draw();
        drawProjectiles();
        updateHealthBars();
        updateUI();
    }

    // Game Over
    if (gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, gameWidth, gameHeight);
        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('DERROTA!', gameWidth / 2, gameHeight / 2);
        ctx.font = '20px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('Recarregue a página para tentar novamente', gameWidth / 2, gameHeight / 2 + 50);
    }

    

    requestAnimationFrame(gameLoop);
}

// Iniciar com seleção de arma
isSelectingWeapon = true;
gameLoop();
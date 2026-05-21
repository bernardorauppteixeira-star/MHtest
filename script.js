const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const gameWidth = Math.min(800, window.innerWidth - 20);
const gameHeight = 600;
canvas.width = gameWidth;
canvas.height = gameHeight;

// ===== CLASSES DO JOGO =====
class Projectile {
    constructor(x, y, targetX, targetY, damage, color, speed) {
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
        this.y = gameHeight - 100;
        this.width = 30;
        this.height = 40;
        this.speed = 5;
        this.health = 100;
        this.maxHealth = 100;
        this.attackCooldown = 0;
        this.attacking = false;
        this.attackRange = 80;
        this.baseDamage = 5;
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
    constructor(phase) {
        this.phase = phase;
        this.width = 80 + phase * 20;
        this.height = 100 + phase * 20;
        this.x = Math.random() * (gameWidth - this.width);
        this.y = 50 + Math.random() * 100;
        this.health = 50 + phase * 30;
        this.maxHealth = this.health;
        this.speed = 1 + phase * 0.5;
        this.attackRange = 120;
        this.attackCooldown = 0;
        this.direction = Math.random() > 0.5 ? 1 : -1;
    }

    update(playerX, playerY) {
        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > this.attackRange) {
            if (dx > 0) this.x += this.speed;
            else this.x -= this.speed;
            if (dy > 0) this.y += this.speed;
            else this.y -= this.speed;
        }

        this.x = Math.max(0, Math.min(this.x, gameWidth - this.width));
        this.y = Math.max(0, Math.min(this.y, gameHeight - this.height / 2));

        if (this.attackCooldown > 0) this.attackCooldown--;
    }

    draw() {
        ctx.fillStyle = '#cc0000';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 3;
        ctx.strokeRect(this.x, this.y, this.width, this.height);

        // Olhos
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(this.x + 15, this.y + 20, 12, 12);
        ctx.fillRect(this.x + this.width - 27, this.y + 20, 12, 12);
    }

    getAttackDamage() {
        return 5 + this.phase * 3;
    }
}

// ===== VARIÁVEIS GLOBAIS =====
let player = new Player();
let currentMonster = new Monster(1);
let phase = 1;
let monstersDefeated = 0;
let keys = {};
let gameOver = false;
let victory = false;
let isUpgrading = false;
let selectedUpgradeIndex = 0;
let gameStarted = false;
let isSelectingWeapon = false;
let selectedWeaponIndex = 0;
let projectiles = [];

const weapons = [
    { name: 'Espada ⚔️', type: 'sword', color: '#ffaa00', cooldown: 20, range: 80, damage: 15 },
    { name: 'Arco 🏹', type: 'bow', color: '#00ff00', cooldown: 30, range: 600, damage: 12, speed: 5 },
    { name: 'Varinha 🔮', type: 'staff', color: '#ff00ff', cooldown: 25, range: 600, damage: 14, speed: 6 },
    { name: 'Revolver 🔫', type: 'gun', color: '#ffff00', cooldown: 15, range: 600, damage: 18, speed: 8 }
];

const upgradeOptions = [
    { name: 'Vida Máxima +20', effect: 'maxHealth', value: 20 },
    { name: 'Dano +5', effect: 'baseDamage', value: 5 },
    { name: 'Velocidade +1', effect: 'speed', value: 1 },
    { name: 'Alcance +15', effect: 'attackRange', value: 15 }
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
        if (e.key === 'ArrowLeft' || e.key === 'a') {
            selectedUpgradeIndex = (selectedUpgradeIndex - 1 + upgradeOptions.length) % upgradeOptions.length;
        }
        if (e.key === 'ArrowRight' || e.key === 'd') {
            selectedUpgradeIndex = (selectedUpgradeIndex + 1) % upgradeOptions.length;
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
        
        const buttonWidth = 180;
        const buttonHeight = 60;
        const spacing = 20;
        const totalWidth = upgradeOptions.length * (buttonWidth + spacing);
        const startX = (gameWidth - totalWidth) / 2;
        const startY = gameHeight / 2 - 40;
        
        for (let i = 0; i < upgradeOptions.length; i++) {
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
        const isHit = 
            p.x < currentMonster.x + currentMonster.width &&
            p.x > currentMonster.x &&
            p.y < currentMonster.y + currentMonster.height &&
            p.y > currentMonster.y;
        
        if (isHit) {
            currentMonster.health -= p.damage;
            projectiles.splice(i, 1);
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
    if (monstersDefeated >= 3) {
        phase++;
        monstersDefeated = 0;
        if (phase > 5) {
            victory = true;
            return;
        }
    }
    currentMonster = new Monster(phase);
    isUpgrading = true;
    selectedUpgradeIndex = 0;
}

function applyUpgrade(index) {
    const upgrade = upgradeOptions[index];
    player[upgrade.effect] += upgrade.value;
    
    if (upgrade.effect === 'maxHealth') {
        player.health += upgrade.value;
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
    
    const buttonWidth = 180;
    const buttonHeight = 60;
    const spacing = 20;
    const totalWidth = upgradeOptions.length * (buttonWidth + spacing);
    const startX = (gameWidth - totalWidth) / 2;
    const startY = gameHeight / 2 - 40;
    
    for (let i = 0; i < upgradeOptions.length; i++) {
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
        ctx.fillText(upgradeOptions[i].name, bx + buttonWidth / 2, by + buttonHeight / 2 + 5);
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
    } else if (!gameOver && !victory) {
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
        if (currentMonster.health <= 0) {
            spawnNewMonster();
        }

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

    // Victory
    if (victory) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, gameWidth, gameHeight);
        ctx.fillStyle = '#00ff00';
        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('VITÓRIA!', gameWidth / 2, gameHeight / 2);
        ctx.font = '20px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('Você derrotou todos os monstros!', gameWidth / 2, gameHeight / 2 + 50);
    }

    requestAnimationFrame(gameLoop);
}

// Iniciar com seleção de arma
isSelectingWeapon = true;
gameLoop();
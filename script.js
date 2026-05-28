const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const gameWidth = Math.min(1000, window.innerWidth - 24);
const gameHeight = Math.min(620, window.innerHeight - 24);
const worldWidth = 1600;
const worldHeight = 1100;
canvas.width = gameWidth;
canvas.height = gameHeight;

const camera = {
    x: 0,
    y: 0,
    width: gameWidth,
    height: gameHeight,
    update(targetX, targetY) {
        this.x = targetX - this.width / 2;
        this.y = targetY - this.height / 2;
        this.x = Math.max(0, Math.min(this.x, worldWidth - this.width));
        this.y = Math.max(0, Math.min(this.y, worldHeight - this.height));
    }
};

const keys = {};
let gameOver = false;
let kills = 0;
const mouseWorld = { x: 0, y: 0 };
const projectiles = [];

const weapons = [
    {
        id: 'sword',
        name: 'Espada',
        type: 'melee',
        cooldown: 32,
        damage: 32,
        range: 130,
        angle: Math.PI / 3,
        color: 'rgba(255, 220, 80, 0.18)'
    },
    {
        id: 'staff',
        name: 'Cajado',
        type: 'staff',
        cooldown: 60,
        minDamage: 5,
        maxDamage: 45,
        chargeTime: 45,
        range: 130,
        angle: (2 * Math.PI) / 3,
        color: 'rgba(160, 120, 255, 0.22)'
    },
    {
        id: 'revolver',
        name: 'Revolver',
        type: 'revolver',
        cooldown: 14,
        damage: 12,
        speed: 12,
        radius: 6,
        color: 'rgba(220, 220, 220, 0.9)'
    },
    {
        id: 'bomb',
        name: 'Bomba',
        type: 'bomb',
        cooldown: 90,
        damage: 85,
        radius: 75,
        speed: 10,
        color: 'rgba(255, 90, 90, 0.22)'
    }
];

const player = {
    x: worldWidth / 2,
    y: worldHeight - 180,
    width: 24,
    height: 32,
    speed: 4,
    health: 100,
    maxHealth: 100,
    attacking: false,
    attackTimer: 0,
    cooldown: 0,
    charge: 0,
    charging: false,
    attackRange: 130,
    attackAngle: Math.PI / 3,
    direction: { x: 0, y: -1 },
    aimDirection: { x: 0, y: -1 },
    weapon: weapons[0],
    hitApplied: false
};

const enemyTypes = [
    {
        id: 'shooter',
        name: 'Atirador',
        color: '#64dfff',
        width: 50,
        height: 60,
        speed: 1.4,
        maxHealth: 140,
        attackCooldown: 50,
        bulletDamage: 10,
        bulletSpeed: 10,
        bulletRadius: 5,
        coneAngle: Math.PI / 3,
        coneRange: 260
    },
    {
        id: 'tank',
        name: 'Tancudo',
        color: '#ffb142',
        width: 76,
        height: 86,
        speed: 1.0,
        maxHealth: 320,
        attackCooldown: 90,
        coneDamage: 18,
        coneAngle: Math.PI / 2,
        coneRange: 160
    },
    {
        id: 'mage',
        name: 'Mago',
        color: '#b07cff',
        width: 56,
        height: 70,
        speed: 1.1,
        maxHealth: 180,
        attackCooldown: 100,
        boltDamage: 18,
        boltSpeed: 11,
        boltRadius: 6,
        explosionDamage: 32,
        explosionRadius: 72,
        bombSpeed: 8
    }
];

let enemy = {};

const upgrades = [
    {
        id: 'health',
        name: 'Mais Vida',
        description: '+20 de vida máxima',
        apply() {
            player.maxHealth += 20;
            player.health = Math.min(player.health + 20, player.maxHealth);
        }
    },
    {
        id: 'speed',
        name: 'Velocidade',
        description: '+0.3 de velocidade',
        apply() {
            player.speed += 0.3;
        }
    },
    {
        id: 'damage',
        name: 'Mais Dano',
        description: '+3 de dano em todas as armas',
        apply() {
            weapons.forEach((weapon) => {
                if (weapon.damage) weapon.damage += 3;
                if (weapon.minDamage) weapon.minDamage += 3;
                if (weapon.maxDamage) weapon.maxDamage += 3;
            });
        }
    },
    {
        id: 'attackSpeed',
        name: 'Vel. de Ataque',
        description: '-4 frames de cooldown',
        apply() {
            weapons.forEach((weapon) => {
                if (weapon.cooldown) weapon.cooldown = Math.max(6, weapon.cooldown - 4);
            });
        }
    },
    {
        id: 'bulletSize',
        name: 'Projéteis Maiores',
        description: '+2 ao tamanho do projétil',
        apply() {
            weapons.forEach((weapon) => {
                if (weapon.radius) weapon.radius += 2;
            });
        }
    },
    {
        id: 'explosionArea',
        name: 'Explosão Maior',
        description: '+12 de área de explosão',
        apply() {
            weapons.forEach((weapon) => {
                if (weapon.id === 'bomb') weapon.radius += 12;
            });
        }
    },
    {
        id: 'range',
        name: 'Alcance',
        description: '+14 de alcance',
        apply() {
            weapons.forEach((weapon) => {
                if (weapon.range) weapon.range += 14;
            });
        }
    }
];

const upgradeMenu = {
    active: false,
    options: []
};

const playerHealthBar = document.getElementById('playerHealth');
const monsterHealthBar = document.getElementById('monsterHealth');
const weaponDisplayText = document.getElementById('weaponDisplay');
const killCountText = document.getElementById('killCount');

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function restartGame() {
    player.x = worldWidth / 2;
    player.y = worldHeight - 180;
    player.health = player.maxHealth;
    player.attacking = false;
    player.attackTimer = 0;
    player.cooldown = 0;
    player.charge = 0;
    player.charging = false;
    player.hitApplied = false;
    player.direction = { x: 0, y: -1 };
    kills = 0;
    gameOver = false;
    spawnEnemy();
    updateUI();
}

function spawnEnemy() {
    const template = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
    enemy = {
        ...template,
        type: template.id,
        x: Math.random() * (worldWidth - template.width),
        y: Math.random() * 120 + 40,
        health: template.maxHealth,
        attackCooldown: 0,
        attackCooldownBase: template.attackCooldown,
        attackTimer: 0,
        attackPattern: '',
        burstRemaining: 0
    };
}

function presentUpgradeMenu() {
    const pool = [...upgrades];
    const options = [];
    while (options.length < 3 && pool.length > 0) {
        const index = Math.floor(Math.random() * pool.length);
        options.push(pool.splice(index, 1)[0]);
    }
    upgradeMenu.active = true;
    upgradeMenu.options = options;
}

function handleEnemyDeath() {
    enemy.health = 0;
    kills += 1;
    if (Math.random() < 0.65) {
        presentUpgradeMenu();
    } else {
        spawnEnemy();
    }
}

function startAttack() {
    if (gameOver || player.cooldown > 0 || player.attacking) return;
    const weapon = player.weapon;
    if (weapon.type === 'staff') {
        player.charging = true;
        player.charge = 0;
        player.hitApplied = false;
        return;
    }

    if (weapon.type === 'revolver') {
        fireBullet();
        player.cooldown = weapon.cooldown;
        return;
    }

    if (weapon.type === 'bomb') {
        throwBomb();
        player.cooldown = weapon.cooldown;
        return;
    }

    player.attacking = true;
    player.attackTimer = 18;
    player.hitApplied = false;
    player.cooldown = weapon.cooldown;
}

function releaseAttack() {
    if (!player.charging || gameOver) return;
    const weapon = player.weapon;
    if (weapon.type === 'staff') {
        const chargePercent = Math.min(player.charge / weapon.chargeTime, 1);
        const damage = Math.round(weapon.minDamage + (weapon.maxDamage - weapon.minDamage) * chargePercent);
        player.attacking = true;
        player.attackTimer = 18;
        player.hitApplied = false;
        player.cooldown = weapon.cooldown;
        player.staffDamage = damage;
    }
    player.charging = false;
    player.charge = 0;
}

function updatePlayer() {
    let moveX = 0;
    let moveY = 0;
    if (keys['w'] || keys['arrowup']) moveY -= 1;
    if (keys['s'] || keys['arrowdown']) moveY += 1;
    if (keys['a'] || keys['arrowleft']) moveX -= 1;
    if (keys['d'] || keys['arrowright']) moveX += 1;
    if (moveX !== 0 || moveY !== 0) {
        const length = Math.sqrt(moveX * moveX + moveY * moveY);
        player.direction.x = moveX / length;
        player.direction.y = moveY / length;
        player.x += player.direction.x * player.speed;
        player.y += player.direction.y * player.speed;
    }
    player.x = clamp(player.x, 0, worldWidth - player.width);
    player.y = clamp(player.y, 0, worldHeight - player.height);

    if (player.cooldown > 0) {
        player.cooldown -= 1;
    }

    if (player.charging) {
        player.charge = Math.min(player.charge + 1, player.weapon.chargeTime);
    }

    if (player.attacking) {
        player.attackTimer -= 1;
        if (player.attackTimer === 8 && !player.hitApplied) {
            const weapon = player.weapon;
            if (weapon.type === 'staff') {
                applyWeaponHit(player.staffDamage, weapon.range, weapon.angle);
            } else {
                applyWeaponHit(weapon.damage, weapon.range, weapon.angle);
            }
            player.hitApplied = true;
        }
        if (player.attackTimer <= 0) {
            player.attacking = false;
        }
    }
}

function updateAimDirection() {
    const originX = player.x + player.width / 2;
    const originY = player.y + player.height / 2;
    const dx = mouseWorld.x - originX;
    const dy = mouseWorld.y - originY;
    const length = Math.sqrt(dx * dx + dy * dy) || 1;
    player.aimDirection.x = dx / length;
    player.aimDirection.y = dy / length;
}

function updateEnemy() {
    if (enemy.health <= 0) return;
    const originX = enemy.x + enemy.width / 2;
    const originY = enemy.y + enemy.height / 2;
    const targetX = player.x + player.width / 2;
    const targetY = player.y + player.height / 2;
    const dx = targetX - originX;
    const dy = targetY - originY;
    const distance = Math.sqrt(dx * dx + dy * dy) || 1;
    const dirX = dx / distance;
    const dirY = dy / distance;

    if (enemy.type === 'shooter') {
        if (distance > 260) {
            enemy.x += dirX * enemy.speed;
            enemy.y += dirY * enemy.speed;
        } else if (distance < 150) {
            enemy.x -= dirX * enemy.speed;
            enemy.y -= dirY * enemy.speed;
        }
    } else if (enemy.type === 'tank' || enemy.type === 'mage') {
        if (distance > 120) {
            enemy.x += dirX * enemy.speed;
            enemy.y += dirY * enemy.speed;
        }
    }

    enemy.x = clamp(enemy.x, 0, worldWidth - enemy.width);
    enemy.y = clamp(enemy.y, 0, worldHeight - enemy.height);

    if (enemy.attackTimer > 0) {
        enemy.attackTimer -= 1;
        if (enemy.type === 'shooter' && enemy.attackPattern === 'burst' && enemy.attackTimer === 0 && enemy.burstRemaining > 0) {
            fireEnemyBullet();
            enemy.burstRemaining -= 1;
            if (enemy.burstRemaining > 0) enemy.attackTimer = 4;
        }
    }

    if (enemy.attackCooldown > 0) {
        enemy.attackCooldown -= 1;
    }

    if (enemy.attackCooldown <= 0 && enemy.attackTimer === 0) {
        if (enemy.type === 'shooter') {
            enemy.attackPattern = Math.random() < 0.5 ? 'cone' : 'burst';
            const shots = Math.floor(Math.random() * 11) + 2;
            if (enemy.attackPattern === 'cone') {
                fireEnemySpread(shots);
                enemy.attackCooldown = enemy.attackCooldownBase;
            } else {
                enemy.attackPattern = 'burst';
                enemy.burstRemaining = shots;
                enemy.attackTimer = 1;
                enemy.attackCooldown = enemy.attackCooldownBase + 20;
            }
        } else if (enemy.type === 'tank') {
            applyEnemyConeHit(enemy.coneDamage, enemy.coneRange, enemy.coneAngle);
            enemy.attackCooldown = enemy.attackCooldownBase;
        } else if (enemy.type === 'mage') {
            if (Math.random() < 0.5) {
                fireEnemyBullet();
                enemy.attackCooldown = enemy.attackCooldownBase;
            } else {
                throwEnemyBomb();
                enemy.attackCooldown = enemy.attackCooldownBase + 20;
            }
        }
    }
}

function applyWeaponHit(damage, range, angle) {
    if (enemy.health <= 0) return;
    const originX = player.x + player.width / 2;
    const originY = player.y + player.height / 2;
    const targetX = enemy.x + enemy.width / 2;
    const targetY = enemy.y + enemy.height / 2;
    const dx = targetX - originX;
    const dy = targetY - originY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const directionLength = Math.sqrt(player.aimDirection.x * player.aimDirection.x + player.aimDirection.y * player.aimDirection.y) || 1;
    const forwardX = player.aimDirection.x / directionLength;
    const forwardY = player.aimDirection.y / directionLength;
    const normalizedX = dx / (distance || 1);
    const normalizedY = dy / (distance || 1);
    const dot = forwardX * normalizedX + forwardY * normalizedY;
    if (distance <= range && dot >= Math.cos(angle / 2)) {
        enemy.health -= damage;
        if (enemy.health <= 0) {
            enemy.health = 0;
            handleEnemyDeath();
        }
    }
}

class BulletProjectile {
    constructor(x, y, dirX, dirY, damage, speed, radius, owner = 'player') {
        this.x = x;
        this.y = y;
        this.vx = dirX * speed;
        this.vy = dirY * speed;
        this.damage = damage;
        this.radius = radius;
        this.owner = owner;
        this.lifespan = 120;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.lifespan -= 1;
        const target = this.owner === 'player' ? enemy : player;
        if (target.health <= 0) return;
        const centerX = target.x + target.width / 2;
        const centerY = target.y + target.height / 2;
        const dx = centerX - this.x;
        const dy = centerY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= this.radius + Math.max(target.width, target.height) / 2) {
            target.health -= this.damage;
            this.lifespan = 0;
            if (target.health <= 0) {
                target.health = 0;
                if (this.owner === 'player') {
                    handleEnemyDeath();
                } else {
                    gameOver = true;
                }
            }
        }
    }

    isAlive() {
        return this.lifespan > 0 && this.x >= 0 && this.x <= worldWidth && this.y >= 0 && this.y <= worldHeight;
    }

    draw() {
        ctx.fillStyle = this.owner === 'player' ? 'rgba(220, 220, 220, 0.9)' : 'rgba(255, 160, 80, 0.9)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

class BombProjectile {
    constructor(x, y, targetX, targetY, damage, radius, speed, owner = 'player') {
        this.x = x;
        this.y = y;
        this.targetX = targetX;
        this.targetY = targetY;
        const dx = targetX - x;
        const dy = targetY - y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        this.vx = (dx / dist) * speed;
        this.vy = (dy / dist) * speed;
        this.damage = damage;
        this.radius = radius;
        this.speed = speed;
        this.owner = owner;
        this.exploded = false;
        this.explosionTimer = 0;
    }

    update() {
        if (this.exploded) {
            this.explosionTimer -= 1;
            return;
        }
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= this.speed) {
            this.x = this.targetX;
            this.y = this.targetY;
            this.explode();
            return;
        }
        this.x += this.vx;
        this.y += this.vy;
    }

    explode() {
        this.exploded = true;
        this.explosionTimer = 20;
        const target = this.owner === 'player' ? enemy : player;
        if (target.health <= 0) return;
        const dx = target.x + target.width / 2 - this.x;
        const dy = target.y + target.height / 2 - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= this.radius + Math.max(target.width, target.height) / 2) {
            target.health -= this.damage;
            if (target.health <= 0) {
                target.health = 0;
                if (this.owner === 'player') {
                    handleEnemyDeath();
                } else {
                    gameOver = true;
                }
            }
        }
    }

    isAlive() {
        return !this.exploded || this.explosionTimer > 0;
    }

    draw() {
        if (this.exploded) {
            ctx.fillStyle = this.owner === 'player' ? 'rgba(120, 200, 255, 0.22)' : 'rgba(255, 120, 60, 0.25)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = this.owner === 'player' ? 'rgba(120, 200, 255, 0.5)' : 'rgba(255, 120, 60, 0.5)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.stroke();
        } else {
            ctx.fillStyle = this.owner === 'player' ? 'rgba(255, 90, 90, 0.9)' : 'rgba(255, 180, 180, 0.9)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, 10, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
}

function fireBullet() {
    const originX = player.x + player.width / 2;
    const originY = player.y + player.height / 2;
    const dirX = player.aimDirection.x;
    const dirY = player.aimDirection.y;
    const weapon = player.weapon;
    const bullet = new BulletProjectile(originX, originY, dirX, dirY, weapon.damage, weapon.speed, weapon.radius, 'player');
    projectiles.push(bullet);
}

function throwBomb() {
    const originX = player.x + player.width / 2;
    const originY = player.y + player.height / 2;
    const weapon = player.weapon;
    const bomb = new BombProjectile(originX, originY, mouseWorld.x, mouseWorld.y, weapon.damage, weapon.radius, weapon.speed, 'player');
    projectiles.push(bomb);
}

function fireEnemyBullet() {
    const originX = enemy.x + enemy.width / 2;
    const originY = enemy.y + enemy.height / 2;
    const targetX = player.x + player.width / 2;
    const targetY = player.y + player.height / 2;
    const dx = targetX - originX;
    const dy = targetY - originY;
    const length = Math.sqrt(dx * dx + dy * dy) || 1;
    const damage = enemy.type === 'mage' ? enemy.boltDamage : enemy.bulletDamage;
    const speed = enemy.type === 'mage' ? enemy.boltSpeed : enemy.bulletSpeed;
    const radius = enemy.type === 'mage' ? enemy.boltRadius : enemy.bulletRadius;
    const bullet = new BulletProjectile(originX, originY, dx / length, dy / length, damage, speed, radius, 'enemy');
    projectiles.push(bullet);
}

function fireEnemySpread(count) {
    const originX = enemy.x + enemy.width / 2;
    const originY = enemy.y + enemy.height / 2;
    const targetX = player.x + player.width / 2;
    const targetY = player.y + player.height / 2;
    const baseAngle = Math.atan2(targetY - originY, targetX - originX);
    const spread = enemy.coneAngle || Math.PI / 3;
    for (let i = 0; i < count; i += 1) {
        const angle = count === 1 ? baseAngle : baseAngle - spread / 2 + (spread * i) / (count - 1);
        const dirX = Math.cos(angle);
        const dirY = Math.sin(angle);
        const damage = enemy.bulletDamage;
        const bullet = new BulletProjectile(originX, originY, dirX, dirY, damage, enemy.bulletSpeed, enemy.bulletRadius, 'enemy');
        projectiles.push(bullet);
    }
}

function throwEnemyBomb() {
    const originX = enemy.x + enemy.width / 2;
    const originY = enemy.y + enemy.height / 2;
    const targetX = player.x + player.width / 2;
    const targetY = player.y + player.height / 2;
    const bomb = new BombProjectile(originX, originY, targetX, targetY, enemy.explosionDamage, enemy.explosionRadius, enemy.bombSpeed, 'enemy');
    projectiles.push(bomb);
}

function applyEnemyConeHit(damage, range, angle) {
    const originX = enemy.x + enemy.width / 2;
    const originY = enemy.y + enemy.height / 2;
    const targetX = player.x + player.width / 2;
    const targetY = player.y + player.height / 2;
    const dx = targetX - originX;
    const dy = targetY - originY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const forwardX = dx / (distance || 1);
    const forwardY = dy / (distance || 1);
    const playerDirX = forwardX;
    const playerDirY = forwardY;
    const normalizedX = dx / (distance || 1);
    const normalizedY = dy / (distance || 1);
    const dot = playerDirX * normalizedX + playerDirY * normalizedY;
    if (distance <= range && dot >= Math.cos(angle / 2)) {
        player.health -= damage;
        if (player.health <= 0) {
            player.health = 0;
            gameOver = true;
        }
    }
}

function updateUI() {
    playerHealthBar.style.width = `${(player.health / player.maxHealth) * 100}%`;
    monsterHealthBar.style.width = `${(enemy.health / enemy.maxHealth) * 100}%`;
    weaponDisplayText.textContent = `Arma: ${player.weapon.name}`;
    if (player.charging && player.weapon.type === 'staff') {
        weaponDisplayText.textContent += ` (Cargando: ${Math.round((player.charge / player.weapon.chargeTime) * 100)}%)`;
    }
    killCountText.textContent = `Derrotas: ${kills}`;
}

function drawUpgradeMenu() {
    const panelWidth = 420;
    const panelHeight = 240;
    const x = gameWidth / 2 - panelWidth / 2;
    const y = gameHeight / 2 - panelHeight / 2;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(x, y, panelWidth, panelHeight);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, panelWidth, panelHeight);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Upgrade disponível', x + panelWidth / 2, y + 38);
    ctx.font = '16px Arial';
    ctx.fillText('Escolha uma opção (1-3)', x + panelWidth / 2, y + 64);
    upgradeMenu.options.forEach((option, index) => {
        const itemY = y + 100 + index * 44;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.font = '18px Arial';
        ctx.fillText(`${index + 1}. ${option.name}`, x + 24, itemY);
        ctx.font = '14px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillText(option.description, x + 26, itemY + 20);
    });
    ctx.restore();
}

function applyUpgrade(upgrade) {
    upgrade.apply();
    upgradeMenu.active = false;
    upgradeMenu.options = [];
    spawnEnemy();
}

function chooseUpgrade(index) {
    const option = upgradeMenu.options[index];
    if (option) {
        applyUpgrade(option);
    }
}

function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, worldHeight);
    gradient.addColorStop(0, '#081222');
    gradient.addColorStop(1, '#06101a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, worldWidth, worldHeight);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= worldWidth; x += 160) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, worldHeight);
        ctx.stroke();
    }
    for (let y = 0; y <= worldHeight; y += 160) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(worldWidth, y);
        ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.18)';
    ctx.lineWidth = 2;
    ctx.strokeRect(12, 12, worldWidth - 24, worldHeight - 24);
}

function drawPlayer() {
    ctx.fillStyle = '#3dfc51';
    ctx.fillRect(player.x, player.y, player.width, player.height);
    ctx.strokeStyle = '#12b944';
    ctx.lineWidth = 2;
    ctx.strokeRect(player.x, player.y, player.width, player.height);
    if (player.attacking && player.weapon.type !== 'bomb') {
        const centerX = player.x + player.width / 2;
        const centerY = player.y + player.height / 2;
        ctx.fillStyle = player.weapon.color;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        const startAngle = Math.atan2(player.aimDirection.y, player.aimDirection.x) - player.weapon.angle / 2;
        const endAngle = startAngle + player.weapon.angle;
        ctx.arc(centerX, centerY, player.weapon.range, startAngle, endAngle);
        ctx.closePath();
        ctx.fill();
    }
    if (player.charging) {
        const barWidth = 80;
        const barHeight = 8;
        const x = player.x + player.width / 2 - barWidth / 2;
        const y = player.y - 20;
        const fillWidth = (player.charge / player.weapon.chargeTime) * barWidth;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(x, y, barWidth, barHeight);
        ctx.fillStyle = 'rgba(150, 120, 255, 0.8)';
        ctx.fillRect(x, y, fillWidth, barHeight);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.strokeRect(x, y, barWidth, barHeight);
    }
}

function drawEnemy() {
    if (enemy.health <= 0) return;
    ctx.fillStyle = enemy.color;
    ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(enemy.x, enemy.y, enemy.width, enemy.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(enemy.name, enemy.x + enemy.width / 2, enemy.y - 8);
}

function updateProjectiles() {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        projectiles[i].update();
        if (!projectiles[i].isAlive()) {
            projectiles.splice(i, 1);
        }
    }
}

function drawProjectiles() {
    projectiles.forEach((projectile) => projectile.draw());
}

function drawScene() {
    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    drawBackground();
    drawPlayer();
    drawEnemy();
    drawProjectiles();
    ctx.restore();
}

function drawGameOver() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, gameWidth, gameHeight);
    ctx.fillStyle = '#ff5858';
    ctx.font = 'bold 42px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', gameWidth / 2, gameHeight / 2 - 10);
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px Arial';
    ctx.fillText('Pressione R para reiniciar', gameWidth / 2, gameHeight / 2 + 32);
}

function gameLoop() {
    ctx.clearRect(0, 0, gameWidth, gameHeight);
    updatePlayer();
    if (!gameOver && !upgradeMenu.active) {
        updateEnemy();
        updateProjectiles();
    }
    camera.update(player.x + player.width / 2, player.y + player.height / 2);
    drawScene();
    if (upgradeMenu.active) drawUpgradeMenu();
    updateUI();
    if (gameOver) drawGameOver();
    requestAnimationFrame(gameLoop);
}

document.addEventListener('keydown', (event) => {
    if (upgradeMenu.active) {
        if (['1', '2', '3'].includes(event.key)) {
            chooseUpgrade(Number(event.key) - 1);
        }
        return;
    }

    keys[event.key.toLowerCase()] = true;
    if (event.key.toLowerCase() === 'r') {
        restartGame();
    }
    if (['1', '2', '3', '4'].includes(event.key)) {
        const index = Number(event.key) - 1;
        if (weapons[index]) {
            player.weapon = weapons[index];
            player.charging = false;
            player.charge = 0;
        }
    }
});

document.addEventListener('keyup', (event) => {
    keys[event.key.toLowerCase()] = false;
});

canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouseWorld.x = event.clientX - rect.left + camera.x;
    mouseWorld.y = event.clientY - rect.top + camera.y;
    updateAimDirection();
});

canvas.addEventListener('mousedown', (event) => {
    if (event.button === 0) {
        startAttack();
    }
});

canvas.addEventListener('mouseup', (event) => {
    if (event.button === 0) {
        releaseAttack();
    }
});

restartGame();
gameLoop();

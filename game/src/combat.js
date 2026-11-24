// Palmera Bay — shooting, bullets, damage and street pickups.
// The player shoots with the mouse; police shoot back; pickups restock ammo,
// health and cash.

import { TUNE } from './config.js';
import { buildingAt, randomSidewalkPoint } from './city.js';

export class Combat {
  constructor(game) {
    this.game = game;
    this.bullets = [];
    this.pickups = [];
    this.particles = [];
    this.skids = [];
    this.gunfire = null;
    this.gunfireTime = 0;
    this.pickupTimer = 6;
  }

  playerShoot(fromX, fromY, angle) {
    const game = this.game;
    const p = game.player;
    if (p.ammo <= 0 || p.fireDelay > 0) return false;
    p.ammo--;
    p.fireDelay = TUNE.pistolFireDelay;
    this.fire(fromX, fromY, angle, 'player', TUNE.pistolDamage);
    return true;
  }

  enemyShoot(fromX, fromY, angle, who) {
    this.fire(fromX, fromY, angle, who, 9);
  }

  fire(x, y, angle, from, damage) {
    this.bullets.push({
      x: x + Math.cos(angle) * 20,
      y: y + Math.sin(angle) * 20,
      vx: Math.cos(angle) * TUNE.bulletSpeed,
      vy: Math.sin(angle) * TUNE.bulletSpeed,
      life: TUNE.bulletRange / TUNE.bulletSpeed,
      from,
      damage,
    });
    this.gunfire = { x, y };
    this.gunfireTime = 1.2;
    this.game.sound.shot();
    this.game.shake(0.08);
  }

  spawnPickups(rng, n) {
    for (let i = 0; i < n; i++) {
      const p = randomSidewalkPoint(rng);
      const kind = rng.pick(['ammo', 'ammo', 'health', 'cash']);
      this.pickups.push({ x: p.x, y: p.y, kind, amount: kind === 'ammo' ? 12 : kind === 'health' ? 40 : 50, bob: rng.range(0, 6) });
    }
  }

  burst(x, y, color, n, speed) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.8);
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5 + Math.random() * 0.5, max: 1, color, size: 2 + Math.random() * 3 });
    }
  }

  explode(x, y) {
    this.burst(x, y, '#ff7a2e', 26, 260);
    this.burst(x, y, '#3a3a3a', 18, 160);
    this.burst(x, y, '#ffc93c', 12, 320);
    this.game.sound.crash();
    this.game.shake(0.5);
  }

  // Point-in-rotated-rect test for bullets vs cars.
  _hitCar(b, car) {
    const dx = b.x - car.x;
    const dy = b.y - car.y;
    const c = Math.cos(-car.angle);
    const s = Math.sin(-car.angle);
    const lx = dx * c - dy * s;
    const ly = dx * s + dy * c;
    return Math.abs(lx) < 27 && Math.abs(ly) < 14;
  }

  update(dt) {
    const game = this.game;
    if (this.gunfireTime > 0) this.gunfireTime -= dt;
    else this.gunfire = null;

    for (const b of this.bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
    }
    // Resolve hits.
    for (const b of this.bullets) {
      if (b.life <= 0) continue;
      if (buildingAt(b.x, b.y, game.city)) {
        b.life = 0;
        this.burst(b.x, b.y, '#c9c9c9', 4, 90);
        continue;
      }
      if (b.from === 'player') {
        for (const ped of [...game.peds, ...game.policeFoot]) {
          if (ped.dead) continue;
          if (Math.hypot(b.x - ped.x, b.y - ped.y) < 13) {
            b.life = 0;
            ped.dead = true;
            this.burst(ped.x, ped.y, '#c23b2e', 10, 140);
            game.wanted.addHeat(ped.police ? 45 : 26, game);
            break;
          }
        }
        if (b.life <= 0) continue;
        for (const car of [...game.cars, ...game.policeCars]) {
          if (car.dead || car === game.player.inCar) continue;
          if (this._hitCar(b, car)) {
            b.life = 0;
            car.health -= b.damage;
            this.burst(b.x, b.y, '#ffc93c', 6, 120);
            game.wanted.addHeat(8, game);
            if (car.health <= 0 && !car.dead) {
              car.dead = true;
              this.explode(car.x, car.y);
            }
            break;
          }
        }
      } else {
        // Enemy bullets only hurt the player on foot.
        const p = game.player;
        if (!p.inCar && Math.hypot(b.x - p.x, b.y - p.y) < 14) {
          b.life = 0;
          p.health -= b.damage;
          p.hurtFlash = 0.4;
          this.burst(p.x, p.y, '#c23b2e', 6, 120);
        }
      }
    }
    this.bullets = this.bullets.filter((b) => b.life > 0);

    // Pickups.
    const p = game.playerPos();
    for (const pk of this.pickups) {
      pk.bob += dt;
      if (Math.hypot(p.x - pk.x, p.y - pk.y) < 26) {
        pk.taken = true;
        if (pk.kind === 'ammo') game.player.ammo += pk.amount;
        if (pk.kind === 'health') game.player.health = Math.min(TUNE.playerHealth, game.player.health + pk.amount);
        if (pk.kind === 'cash') game.player.cash += pk.amount;
        game.sound.pickup();
      }
    }
    this.pickups = this.pickups.filter((pk) => !pk.taken);
    this.pickupTimer -= dt;
    if (this.pickupTimer <= 0) {
      this.pickupTimer = 14;
      this.spawnPickups(game.rng, 2);
    }

    // Particles and skid marks age out.
    for (const pt of this.particles) {
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= 0.96;
      pt.vy *= 0.96;
      pt.life -= dt;
    }
    this.particles = this.particles.filter((pt) => pt.life > 0);
    if (this.skids.length > 400) this.skids.splice(0, this.skids.length - 400);
  }
}

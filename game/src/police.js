// Palmera Bay — the wanted system and the police who answer it.
// Crimes add heat; heat sets the star level; stars decide how many police
// hunt the player, and the heat cools off when the player stays out of sight.

import { TUNE, PALETTE } from './config.js';
import { randomRoadPoint } from './city.js';
import { makeCar, makePed, driveCar } from './entities.js';

const HEAT_PER_STAR = [0, 40, 100, 190, 300, 430];

export class Wanted {
  constructor() {
    this.heat = 0;
    this.level = 0;
    this.quietTime = 0;
  }

  addHeat(n, game) {
    const before = this.level;
    this.heat = Math.min(560, this.heat + n);
    this.level = 0;
    for (let s = 5; s >= 1; s--) {
      if (this.heat >= HEAT_PER_STAR[s]) {
        this.level = s;
        break;
      }
    }
    this.quietTime = 0;
    if (this.level > before && game && game.sound) game.sound.wantedUp();
  }

  clear() {
    this.heat = 0;
    this.level = 0;
    this.quietTime = 0;
  }

  update(dt, player, policeNear) {
    if (this.level === 0) return;
    if (policeNear) {
      this.quietTime = 0;
    } else {
      this.quietTime += dt;
      if (this.quietTime > TUNE.wantedDecaySeconds) {
        this.heat = Math.max(0, this.heat - 60);
        this.level = 0;
        for (let s = 5; s >= 1; s--) {
          if (this.heat >= HEAT_PER_STAR[s]) {
            this.level = s;
            break;
          }
        }
        this.quietTime = 0;
      }
    }
  }
}

// Spawn a police car on a road near the player, just out of view.
export function spawnPoliceCar(game, rng) {
  const p = game.playerPos();
  let spot = randomRoadPoint(rng);
  let tries = 0;
  while (Math.hypot(spot.x - p.x, spot.y - p.y) < 420 && tries++ < 12) {
    spot = randomRoadPoint(rng);
  }
  const angle = Math.atan2(p.y - spot.y, p.x - spot.x);
  const car = makeCar(spot.x, spot.y, angle, PALETTE.policeCar, { police: true });
  car.speed = 260;
  game.policeCars.push(car);
  return car;
}

export function spawnPoliceFoot(game, rng) {
  const p = game.playerPos();
  const angle = rng.range(0, Math.PI * 2);
  const ped = makePed(p.x + Math.cos(angle) * 320, p.y + Math.sin(angle) * 320, rng);
  ped.police = true;
  ped.shirt = '#1c2733';
  ped.health = TUNE.copHealth;
  game.policeFoot.push(ped);
  return ped;
}

export function policeTargets(game) {
  const level = game.wanted.level;
  const wantCars = Math.min(TUNE.maxPoliceCars, level >= 4 ? 5 : level >= 3 ? 4 : level >= 2 ? 3 : level >= 1 ? 2 : 0);
  const wantFoot = Math.min(TUNE.maxPoliceFoot, level >= 3 ? 4 : level >= 2 ? 2 : level >= 1 ? 1 : 0);
  return { wantCars, wantFoot };
}

// Police cars chase the player's position, ramming when close.
export function updatePoliceCar(car, dt, game) {
  if (car.dead) return;
  const p = game.playerPos();
  const dx = p.x - car.x;
  const dy = p.y - car.y;
  const dist = Math.hypot(dx, dy);
  const wantAngle = Math.atan2(dy, dx);
  let diff = wantAngle - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const steer = Math.max(-1, Math.min(1, diff * 2.2));
  const throttle = dist > 90 ? 1 : 0.4;
  driveCar(car, throttle, steer, false, dt);
  car.sirenPhase += dt;
  // Ram damage when the police car touches the player's car.
  const pc = game.player.inCar;
  if (pc && dist < 44 && Math.abs(car.speed) > 120) {
    pc.health -= 14 * dt;
    game.shake(0.25);
  }
}

// An officer on foot runs at the player and shoots when in range.
export function updatePoliceFoot(ped, dt, game) {
  if (ped.dead) return;
  const p = game.playerPos();
  const dx = p.x - ped.x;
  const dy = p.y - ped.y;
  const dist = Math.hypot(dx, dy);
  ped.angle = Math.atan2(dy, dx);
  if (dist > 240) {
    ped.speed = 205;
  } else if (dist > 150) {
    ped.speed = 120;
  } else {
    ped.speed = 0;
  }
  ped.walkPhase += dt * 7;
  ped.x += Math.cos(ped.angle) * ped.speed * dt;
  ped.y += Math.sin(ped.angle) * ped.speed * dt;
  // Shoot at the player on foot, with shaky aim.
  if (!game.player.inCar && dist < 300 && dist > 40) {
    ped.fireDelay = (ped.fireDelay || 0) - dt;
    if (ped.fireDelay <= 0) {
      ped.fireDelay = 0.9 + Math.random() * 0.7;
      const spread = (Math.random() - 0.5) * 0.35;
      game.combat.enemyShoot(ped.x, ped.y, ped.angle + spread, 'cop');
    }
  }
}

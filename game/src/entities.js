// Palmera Bay — the things that move: the player, cars and pedestrians,
// plus the arcade car physics and the circle collision helpers.

import { TUNE, PALETTE } from './config.js';
import { resolveCircle, buildingAt } from './city.js';

let nextId = 1;

export function makePlayer(x, y) {
  return {
    id: nextId++,
    kind: 'player',
    x,
    y,
    angle: -Math.PI / 2,
    speed: 0,
    health: TUNE.playerHealth,
    ammo: TUNE.pistolAmmoStart,
    cash: 0,
    inCar: null,
    fireDelay: 0,
    moving: false,
    running: false,
    hurtFlash: 0,
  };
}

export function makeCar(x, y, angle, color, opts = {}) {
  return {
    id: nextId++,
    kind: opts.police ? 'policeCar' : 'car',
    x,
    y,
    angle,
    speed: 0,
    steer: 0,
    color: opts.police ? PALETTE.policeCar : color,
    police: !!opts.police,
    traffic: !!opts.traffic,
    parked: !!opts.parked,
    driver: opts.driver || null,
    health: TUNE.carHealth,
    smoke: 0,
    dead: false,
    // Traffic cars follow a road: axis 'v' or 'h', direction +1/-1, target speed.
    axis: opts.axis || 'v',
    dir: opts.dir || 1,
    cruise: opts.cruise || 120,
    target: null,
    sirenPhase: Math.random() * 6,
  };
}

export function makePed(x, y, rng) {
  return {
    id: nextId++,
    kind: 'ped',
    x,
    y,
    angle: rng.range(0, Math.PI * 2),
    speed: 0,
    shirt: rng.pick(['#e06a4f', '#4f8fe0', '#e0c34f', '#7ac74f', '#c74f9e', '#e8e8e8']),
    skin: rng.pick(['#e8b98a', '#c98d5f', '#8a5f3d', '#f0cba0']),
    target: null,
    wait: rng.range(0, 2),
    fleeing: false,
    dead: false,
    walkPhase: rng.range(0, 6),
  };
}

// Arcade car physics: accelerate along the heading, steer more at speed,
// grip pulls velocity back toward the heading so the car drifts a little.
export function driveCar(car, throttle, steer, handbrake, dt) {
  const maxSpeed = car.police ? TUNE.carMaxSpeed * 1.08 : TUNE.carMaxSpeed;
  if (throttle > 0) car.speed += TUNE.carAccel * throttle * dt;
  else if (throttle < 0) {
    if (car.speed > 8) car.speed -= TUNE.carBrake * dt;
    else car.speed += TUNE.carAccel * 0.55 * throttle * dt;
  } else {
    car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 260 * dt);
  }
  if (handbrake) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 520 * dt);
  car.speed = Math.max(-TUNE.carReverseMax, Math.min(maxSpeed, car.speed));
  const steerAuthority = Math.min(1, Math.abs(car.speed) / 120);
  car.angle += steer * TUNE.carTurn * steerAuthority * Math.sign(car.speed || 1) * dt * (handbrake ? 1.6 : 1);
  const grip = handbrake ? 1.2 : TUNE.carGrip;
  const vx = Math.cos(car.angle) * car.speed;
  const vy = Math.sin(car.angle) * car.speed;
  car.vx = vx;
  car.vy = vy;
  car.x += vx * dt;
  car.y += vy * dt;
  // Skid marks when the handbrake is down at speed.
  car.skidding = handbrake && Math.abs(car.speed) > 180;
}

// Circle-vs-circle and circle-vs-building resolution for moving things.
export function collideCars(cars, city) {
  for (const c of cars) {
    if (c.dead) continue;
    resolveCircle(c, TUNE.carRadius, city);
  }
  for (let i = 0; i < cars.length; i++) {
    for (let j = i + 1; j < cars.length; j++) {
      const a = cars[i];
      const b = cars[j];
      if (a.dead || b.dead) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      const min = TUNE.carRadius * 2 - 4;
      if (d > 0.01 && d < min) {
        const push = (min - d) / 2;
        const nx = dx / d;
        const ny = dy / d;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
        a.speed *= 0.82;
        b.speed *= 0.82;
        if (Math.abs(a.speed) > 200 || Math.abs(b.speed) > 200) {
          a.health -= 4;
          b.health -= 4;
        }
      }
    }
  }
}

export function movePed(ped, dt, city) {
  ped.x += Math.cos(ped.angle) * ped.speed * dt;
  ped.y += Math.sin(ped.angle) * ped.speed * dt;
  resolveCircle(ped, 11, city);
}

export function movePlayerOnFoot(p, vx, vy, dt, city) {
  p.x += vx * dt;
  p.y += vy * dt;
  resolveCircle(p, TUNE.playerRadius, city);
}

export function carHitBuilding(car) {
  return buildingAt(car.x, car.y, { buildings: [] }) !== null;
}

// Palmera Bay — traffic and pedestrians. Cars cruise the road grid and turn
// at intersections; pedestrians stroll the sidewalks and scatter at gunfire.

import { ROAD, BEACH_Y, TUNE, PALETTE } from './config.js';
import { ROAD_CENTERS, randomRoadPoint, randomSidewalkPoint, randomParkedSpot } from './city.js';
import { makeCar, makePed, driveCar, movePed } from './entities.js';

export function spawnTraffic(city, rng, count) {
  const cars = [];
  for (let i = 0; i < count; i++) {
    const p = randomRoadPoint(rng);
    const vertical = rng.chance(0.5);
    const axis = vertical ? 'v' : 'h';
    const dir = rng.chance(0.5) ? 1 : -1;
    const angle = axis === 'v' ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : dir > 0 ? 0 : Math.PI;
    // Lane offset: right-hand traffic.
    const lane = ROAD.lane;
    const x = axis === 'v' ? p.x + (dir > 0 ? lane : -lane) : p.x;
    const y = axis === 'h' ? p.y + (dir > 0 ? lane : -lane) : p.y;
    const car = makeCar(x, y, angle, rng.pick(PALETTE.carColors), {
      traffic: true,
      axis,
      dir,
      cruise: rng.range(95, 150),
    });
    car.speed = car.cruise;
    cars.push(car);
  }
  return cars;
}

export function spawnParked(city, rng, count) {
  const cars = [];
  for (let i = 0; i < count; i++) {
    const s = randomParkedSpot(rng);
    cars.push(makeCar(s.x, s.y, s.angle, rng.pick(PALETTE.carColors), { parked: true }));
  }
  return cars;
}

export function spawnPeds(city, rng, count) {
  const peds = [];
  for (let i = 0; i < count; i++) {
    const p = randomSidewalkPoint(rng);
    peds.push(makePed(p.x, p.y, rng));
  }
  return peds;
}

function nearestCenter(v) {
  let best = ROAD_CENTERS[0];
  let bd = Infinity;
  for (const c of ROAD_CENTERS) {
    const d = Math.abs(v - c);
    if (d < bd) {
      bd = d;
      best = c;
    }
  }
  return best;
}

// A traffic car drives along its road and, at an intersection, sometimes turns.
export function updateTraffic(car, dt, city, rng) {
  if (car.dead) return;
  const atJunction =
    Math.abs(car.x - nearestCenter(car.x)) < 26 && Math.abs(car.y - nearestCenter(car.y)) < 26;
  if (atJunction && rng.chance(dt * 0.35)) {
    if (car.axis === 'v') {
      car.axis = 'h';
      car.dir = rng.chance(0.5) ? 1 : -1;
      car.angle = car.dir > 0 ? 0 : Math.PI;
    } else {
      car.axis = 'v';
      car.dir = rng.chance(0.5) ? 1 : -1;
      car.angle = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    }
  }
  // Stay in lane: ease back toward the lane line.
  const lane = ROAD.lane;
  if (car.axis === 'v') {
    const targetX = nearestCenter(car.x) + (car.dir > 0 ? lane : -lane);
    car.x += (targetX - car.x) * Math.min(1, dt * 1.5);
    car.angle = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    car.speed += (car.cruise - car.speed) * Math.min(1, dt * 0.8);
  } else {
    const targetY = nearestCenter(car.y) + (car.dir > 0 ? lane : -lane);
    car.y += (targetY - car.y) * Math.min(1, dt * 1.5);
    car.angle = car.dir > 0 ? 0 : Math.PI;
    car.speed += (car.cruise - car.speed) * Math.min(1, dt * 0.8);
  }
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  // Wrap around the map edges so traffic never runs out.
  if (car.x < 40) car.x = 2520;
  if (car.x > 2520) car.x = 40;
  if (car.y < 40) car.y = BEACH_Y - 60;
  if (car.y > BEACH_Y - 40) car.y = 40;
}

export function updatePed(ped, dt, city, rng, gunfire) {
  if (ped.dead) return;
  ped.walkPhase += dt * 6;
  if (gunfire && Math.hypot(gunfire.x - ped.x, gunfire.y - ped.y) < 420) {
    ped.fleeing = true;
  }
  if (ped.fleeing) {
    const dx = ped.x - (gunfire ? gunfire.x : ped.x);
    const dy = ped.y - (gunfire ? gunfire.y : ped.y);
    const d = Math.hypot(dx, dy) || 1;
    ped.angle = Math.atan2(dy / d, dx / d);
    ped.speed = 210;
    if (!gunfire || Math.hypot(gunfire.x - ped.x, gunfire.y - ped.y) > 560) ped.fleeing = false;
  } else if (ped.wait > 0) {
    ped.wait -= dt;
    ped.speed = 0;
  } else {
    if (!ped.target) {
      ped.target = randomSidewalkPoint(rng);
    }
    const dx = ped.target.x - ped.x;
    const dy = ped.target.y - ped.y;
    const d = Math.hypot(dx, dy);
    if (d < 14) {
      ped.target = null;
      ped.wait = rng.range(0.5, 4);
      ped.speed = 0;
    } else {
      ped.angle = Math.atan2(dy, dx);
      ped.speed = 62;
    }
  }
  movePed(ped, dt, city);
}

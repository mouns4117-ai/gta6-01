// Palmera Bay — the city itself: a road grid, blocks of buildings, a park,
// a beachfront, a pier and a marina. Everything is generated from one seed,
// so the same city shows up every run.

import { WORLD, ROAD, BEACH_Y, PALETTE } from './config.js';

export const ROAD_CENTERS = [160, 480, 800, 1120, 1440, 1760, 2080, 2400];

export function buildCity(rng) {
  const buildings = [];
  const palms = [];
  const lamps = [];

  const block = (col, row) => ({
    x0: ROAD_CENTERS[col] + ROAD.width / 2,
    x1: ROAD_CENTERS[col + 1] - ROAD.width / 2,
    y0: ROAD_CENTERS[row] + ROAD.width / 2,
    y1: ROAD_CENTERS[row + 1] - ROAD.width / 2,
  });

  const addBuilding = (x, y, w, h, roof) => {
    buildings.push({ x, y, w, h, roof, height: rng.range(6, 26) });
  };

  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 7; col++) {
      const b = block(col, row);
      const cx = (b.x0 + b.x1) / 2;
      const cy = (b.y0 + b.y1) / 2;
      const bw = b.x1 - b.x0;
      const bh = b.y1 - b.y0;
      // The park block stays green: trees and a pond, no buildings.
      if (col === 2 && row === 4) {
        for (let i = 0; i < 14; i++) {
          palms.push({ x: rng.range(b.x0 + 20, b.x1 - 20), y: rng.range(b.y0 + 20, b.y1 - 20), park: true });
        }
        continue;
      }
      // Beachfront row: low motels and palms on sand.
      if (row === 6) {
        if (rng.chance(0.7)) {
          addBuilding(cx - 70, cy - 40, 140, 80, rng.pick(PALETTE.buildingRoofs));
        }
        for (let i = 0; i < 6; i++) {
          palms.push({ x: rng.range(b.x0 + 14, b.x1 - 14), y: rng.range(b.y0 + 14, b.y1 - 14), park: false });
        }
        continue;
      }
      // A downtown block holds a tower; other blocks hold one to three shops.
      const downtown = col >= 2 && col <= 4 && row >= 1 && row <= 3;
      if (downtown && rng.chance(0.55)) {
        addBuilding(cx - 62, cy - 62, 124, 124, rng.pick(PALETTE.buildingRoofs));
      } else {
        const count = rng.int(1, 3);
        for (let i = 0; i < count; i++) {
          const w = rng.range(70, 110);
          const h = rng.range(60, 100);
          const x = rng.range(b.x0 + 12, b.x1 - 12 - w);
          const y = rng.range(b.y0 + 12, b.y1 - 12 - h);
          addBuilding(x, y, w, h, rng.pick(PALETTE.buildingRoofs));
        }
      }
      if (rng.chance(0.6)) {
        palms.push({ x: rng.range(b.x0 + 10, b.x1 - 10), y: rng.range(b.y0 + 10, b.y1 - 10), park: false });
      }
    }
  }

  // Street lamps at every intersection corner.
  for (const cx of ROAD_CENTERS) {
    for (const cy of ROAD_CENTERS) {
      if (cy >= BEACH_Y) continue;
      lamps.push({ x: cx + ROAD.width / 2 + 6, y: cy + ROAD.width / 2 + 6 });
    }
  }

  // Named places the missions and the HUD point at.
  const broker = { x: 1120, y: 800, label: 'Broker office' };
  const garage = { x: 1760, y: 480, label: 'Garage' };
  const clinic = { x: 480, y: 1760, label: 'Clinic' };
  const marina = { x: 2080, y: 2240, label: 'Marina' };
  const pier = { x: 1150, y: BEACH_Y, w: 60, h: 190, label: 'Pier' };

  return {
    buildings,
    palms,
    lamps,
    broker,
    garage,
    clinic,
    marina,
    pier,
    park: block(2, 4),
    playerSpawn: { x: 1120, y: 960 },
    beach: { y0: BEACH_Y, y1: 2450 },
    water: { y0: 2450, y1: WORLD.h },
  };
}

export function isRoadPoint(x, y) {
  for (const c of ROAD_CENTERS) {
    if (Math.abs(x - c) <= ROAD.width / 2 && y < BEACH_Y) return true;
    if (Math.abs(y - c) <= ROAD.width / 2 && y < BEACH_Y) return true;
  }
  return false;
}

export function buildingAt(x, y, city, pad = 0) {
  for (const b of city.buildings) {
    if (x >= b.x - pad && x <= b.x + b.w + pad && y >= b.y - pad && y <= b.y + b.h + pad) return b;
  }
  return null;
}

// Push a circle out of buildings, out of the deep water, and inside the map.
export function resolveCircle(pos, r, city) {
  for (const b of city.buildings) {
    const nx = Math.max(b.x, Math.min(pos.x, b.x + b.w));
    const ny = Math.max(b.y, Math.min(pos.y, b.y + b.h));
    const dx = pos.x - nx;
    const dy = pos.y - ny;
    const d2 = dx * dx + dy * dy;
    if (d2 < r * r) {
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        pos.x = nx + (dx / d) * r;
        pos.y = ny + (dy / d) * r;
      } else {
        pos.y = b.y - r;
      }
    }
  }
  const onPier = pos.x >= city.pier.x && pos.x <= city.pier.x + city.pier.w && pos.y >= city.pier.y;
  const maxY = onPier ? city.pier.y + city.pier.h - 8 : 2444;
  if (pos.y > maxY) pos.y = maxY;
  if (pos.y < r) pos.y = r;
  if (pos.x < r) pos.x = r;
  if (pos.x > WORLD.w - r) pos.x = WORLD.w - r;
}

export function randomRoadPoint(rng) {
  if (rng.chance(0.5)) {
    const c = rng.pick(ROAD_CENTERS);
    return { x: c + rng.range(-ROAD.lane, ROAD.lane), y: rng.range(80, BEACH_Y - 80) };
  }
  const c = rng.pick(ROAD_CENTERS.filter((v) => v < BEACH_Y));
  return { x: rng.range(80, WORLD.w - 80), y: c + rng.range(-ROAD.lane, ROAD.lane) };
}

// A parked car spot: on a road edge, facing along the road.
export function randomParkedSpot(rng) {
  const vertical = rng.chance(0.5);
  if (vertical) {
    const c = rng.pick(ROAD_CENTERS);
    const side = rng.chance(0.5) ? 1 : -1;
    return {
      x: c + side * (ROAD.width / 2 - 12),
      y: rng.range(120, BEACH_Y - 120),
      angle: side > 0 ? Math.PI / 2 : -Math.PI / 2,
    };
  }
  const c = rng.pick(ROAD_CENTERS.filter((v) => v < BEACH_Y));
  const side = rng.chance(0.5) ? 1 : -1;
  return {
    x: rng.range(120, WORLD.w - 120),
    y: c + side * (ROAD.width / 2 - 12),
    angle: side > 0 ? 0 : Math.PI,
  };
}

export function randomSidewalkPoint(rng) {
  const c = rng.pick(ROAD_CENTERS);
  if (rng.chance(0.5)) {
    return { x: c + (rng.chance(0.5) ? 1 : -1) * (ROAD.width / 2 + 12), y: rng.range(80, BEACH_Y - 80) };
  }
  return { x: rng.range(80, WORLD.w - 80), y: c + (rng.chance(0.5) ? 1 : -1) * (ROAD.width / 2 + 12) };
}

// Palmera Bay — the renderer. One canvas, top-down, sun-soaked: roads and
// sidewalks, towers with shadows, palms, the beach and the pier, cars, peds,
// police lights, skid marks and smoke. Everything culls to the camera view.

import { WORLD, ROAD, BEACH_Y, PALETTE } from './config.js';
import { ROAD_CENTERS } from './city.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function render(ctx, game, view) {
  const { cam, city, time } = game;
  const w = view.w;
  const h = view.h;
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cam.x + game.shakeX, -cam.y + game.shakeY);

  const vx0 = cam.x - w / 2 / cam.zoom - 80;
  const vy0 = cam.y - h / 2 / cam.zoom - 80;
  const vx1 = cam.x + w / 2 / cam.zoom + 80;
  const vy1 = cam.y + h / 2 / cam.zoom + 80;
  const visible = (x, y, m = 60) => x > vx0 - m && x < vx1 + m && y > vy0 - m && y < vy1 + m;

  // Ground: grass, then the park, the sand and the water.
  ctx.fillStyle = PALETTE.grass;
  ctx.fillRect(0, 0, WORLD.w, WORLD.h);
  ctx.fillStyle = PALETTE.park;
  ctx.fillRect(city.park.x0, city.park.y0, city.park.x1 - city.park.x0, city.park.y1 - city.park.y0);
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(0, BEACH_Y, WORLD.w, WORLD.h - BEACH_Y);
  ctx.fillStyle = PALETTE.water;
  ctx.fillRect(0, 2450, WORLD.w, WORLD.h - 2450);
  // Animated wave lines where the water meets the sand.
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    const yy = 2452 + i * 16 + Math.sin(time * 1.4 + i * 2) * 3;
    for (let x = 0; x <= WORLD.w; x += 64) {
      const y = yy + Math.sin(x * 0.012 + time * 2 + i) * 4;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Roads: asphalt, sidewalk shoulders, centre dashes, crosswalks.
  for (const c of ROAD_CENTERS) {
    if (c >= BEACH_Y) continue;
    ctx.fillStyle = PALETTE.sidewalk;
    ctx.fillRect(c - ROAD.width / 2 - 8, 0, ROAD.width + 16, BEACH_Y);
    ctx.fillStyle = PALETTE.road;
    ctx.fillRect(c - ROAD.width / 2, 0, ROAD.width, BEACH_Y);
    ctx.fillRect(0, c - ROAD.width / 2, WORLD.w, ROAD.width);
  }
  ctx.fillStyle = PALETTE.roadLine;
  for (const c of ROAD_CENTERS) {
    if (c >= BEACH_Y) continue;
    for (let y = 40; y < BEACH_Y; y += 56) ctx.fillRect(c - 2, y, 4, 28);
    for (let x = 40; x < WORLD.w; x += 56) ctx.fillRect(x, c - 2, 28, 4);
  }
  ctx.fillStyle = PALETTE.crosswalk;
  for (const cx of ROAD_CENTERS) {
    for (const cy of ROAD_CENTERS) {
      if (cy >= BEACH_Y) continue;
      for (let i = -2; i <= 2; i++) {
        ctx.fillRect(cx + i * 12 - 4, cy - ROAD.width / 2 + 4, 8, 12);
        ctx.fillRect(cx + i * 12 - 4, cy + ROAD.width / 2 - 16, 8, 12);
        ctx.fillRect(cx - ROAD.width / 2 + 4, cy + i * 12 - 4, 12, 8);
        ctx.fillRect(cx + ROAD.width / 2 - 16, cy + i * 12 - 4, 12, 8);
      }
    }
  }

  // The pier: planks out into the water.
  ctx.fillStyle = PALETTE.pier;
  ctx.fillRect(city.pier.x, city.pier.y, city.pier.w, city.pier.h);
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 2;
  for (let y = city.pier.y + 14; y < city.pier.y + city.pier.h; y += 16) {
    ctx.beginPath();
    ctx.moveTo(city.pier.x, y);
    ctx.lineTo(city.pier.x + city.pier.w, y);
    ctx.stroke();
  }

  // Buildings: drop shadow, roof, windows.
  for (const b of city.buildings) {
    if (!visible(b.x + b.w / 2, b.y + b.h / 2, 120)) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(b.x + 8, b.y + 10, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = PALETTE.buildingEdge;
    ctx.fillRect(b.x, b.y + b.h - 8, b.w, 8);
    ctx.fillRect(b.x + b.w - 8, b.y, 8, b.h);
    ctx.fillStyle = PALETTE.window;
    const cols = Math.max(2, Math.floor(b.w / 26));
    const rows = Math.max(2, Math.floor(b.h / 26));
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        if ((i * 7 + j * 13 + b.w) % 5 === 0) continue;
        ctx.fillRect(b.x + 10 + i * ((b.w - 20) / cols), b.y + 10 + j * ((b.h - 20) / rows), 9, 11);
      }
    }
  }

  // Palms and lamps.
  for (const p of city.palms) {
    if (!visible(p.x, p.y)) continue;
    ctx.strokeStyle = PALETTE.palmTrunk;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + 3, p.y - 12);
    ctx.stroke();
    ctx.fillStyle = PALETTE.palmLeaf;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + p.x * 0.01;
      ctx.beginPath();
      ctx.arc(p.x + 3 + Math.cos(a) * 9, p.y - 14 + Math.sin(a) * 7, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.fillStyle = '#3a3a3a';
  for (const l of city.lamps) {
    if (visible(l.x, l.y)) ctx.fillRect(l.x - 2, l.y - 2, 4, 4);
  }

  // Mission marker: a pulsing ring and a light pillar on the target.
  const target = game.missions.targetPoint();
  if (target && game.state === 'playing') {
    const pulse = 1 + Math.sin(time * 4) * 0.12;
    ctx.strokeStyle = PALETTE.marker;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(target.x, target.y, 26 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,201,60,0.16)';
    ctx.fillRect(target.x - 3, target.y - 260, 6, 260);
    ctx.fillStyle = PALETTE.marker;
    ctx.beginPath();
    ctx.arc(target.x, target.y, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Pickups.
  for (const pk of game.combat.pickups) {
    if (!visible(pk.x, pk.y)) continue;
    const bob = Math.sin(pk.bob * 3) * 3;
    ctx.save();
    ctx.translate(pk.x, pk.y + bob);
    if (pk.kind === 'ammo') {
      ctx.fillStyle = '#ffc93c';
      roundRect(ctx, -9, -6, 18, 12, 3);
      ctx.fill();
      ctx.fillStyle = '#222';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('AMMO', 0, 0);
    } else if (pk.kind === 'health') {
      ctx.fillStyle = '#e8e8e8';
      roundRect(ctx, -9, -9, 18, 18, 4);
      ctx.fill();
      ctx.fillStyle = '#c23b2e';
      ctx.fillRect(-2, -6, 4, 12);
      ctx.fillRect(-6, -2, 12, 4);
    } else {
      ctx.fillStyle = '#3aa655';
      roundRect(ctx, -10, -6, 20, 12, 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', 0, 0);
    }
    ctx.restore();
  }

  // Skid marks.
  ctx.strokeStyle = 'rgba(20,20,20,0.4)';
  ctx.lineWidth = 5;
  for (const s of game.combat.skids) {
    if (!visible(s.x, s.y)) continue;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x + s.dx, s.y + s.dy);
    ctx.stroke();
  }

  // Cars: body, roof, windshield, wheels, police light bar.
  const drawCar = (car) => {
    if (!visible(car.x, car.y, 80) || car.dead) return;
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    roundRect(ctx, -26 + 4, -12 + 5, 52, 24, 8);
    ctx.fill();
    ctx.fillStyle = car.color;
    roundRect(ctx, -26, -12, 52, 24, 8);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    roundRect(ctx, -8, -10, 16, 20, 4);
    ctx.fill();
    ctx.fillStyle = '#1c2733';
    ctx.fillRect(12, -10, 5, 20);
    ctx.fillStyle = '#111';
    ctx.fillRect(-22, -14, 10, 5);
    ctx.fillRect(-22, 9, 10, 5);
    ctx.fillRect(14, -14, 10, 5);
    ctx.fillRect(14, 9, 10, 5);
    if (car.police) {
      const flash = Math.sin(time * 12 + car.sirenPhase) > 0;
      ctx.fillStyle = flash ? PALETTE.policeLightRed : PALETTE.policeLightBlue;
      ctx.fillRect(-4, -11, 8, 5);
      ctx.fillStyle = flash ? PALETTE.policeLightBlue : PALETTE.policeLightRed;
      ctx.fillRect(-4, 6, 8, 5);
    }
    if (car.health < 55) {
      ctx.fillStyle = 'rgba(60,60,60,0.5)';
      ctx.beginPath();
      ctx.arc(-14, 0, 6 + Math.sin(time * 9) * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };
  for (const car of game.cars) drawCar(car);
  for (const car of game.policeCars) drawCar(car);

  // Pedestrians and police on foot.
  const drawPed = (ped) => {
    if (!visible(ped.x, ped.y) || ped.dead) return;
    const bob = Math.sin(ped.walkPhase) * 2;
    ctx.fillStyle = ped.skin;
    ctx.beginPath();
    ctx.arc(ped.x, ped.y - 4 + bob * 0.3, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ped.shirt;
    roundRect(ctx, ped.x - 6, ped.y - 2, 12, 13, 4);
    ctx.fill();
    if (ped.police) {
      ctx.fillStyle = '#0e1620';
      ctx.fillRect(ped.x - 6, ped.y - 2, 12, 4);
    }
  };
  for (const ped of game.peds) drawPed(ped);
  for (const ped of game.policeFoot) drawPed(ped);

  // The player: red jacket, always drawn on top.
  const p = game.player;
  if (!p.inCar) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(3, 4, 12, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.playerJacket;
    roundRect(ctx, -11, -9, 22, 18, 7);
    ctx.fill();
    ctx.fillStyle = PALETTE.playerSkin;
    ctx.beginPath();
    ctx.arc(6, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.fillRect(8, -2, 12, 3);
    ctx.restore();
  }

  // Bullets: short tracers. Particles: fading sparks and smoke.
  ctx.strokeStyle = '#ffe9a8';
  ctx.lineWidth = 2;
  for (const b of game.combat.bullets) {
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
    ctx.stroke();
  }
  for (const pt of game.combat.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.max);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Hurt flash at the screen edges.
  if (p.hurtFlash > 0 && !p.inCar) {
    ctx.fillStyle = `rgba(200,30,30,${Math.min(0.35, p.hurtFlash)})`;
    ctx.fillRect(vx0, vy0, vx1 - vx0, vy1 - vy0);
  }

  ctx.restore();
}

// Palmera Bay — the HUD, the minimap and the menus: health, cash, wanted
// stars, the mission objective, speed, the title screen, pause and game over.
// All of it is drawn on the same canvas, so the screenshots show it all.

import { WORLD, ROAD, BEACH_Y, PALETTE, TUNE } from './config.js';
import { ROAD_CENTERS } from './city.js';

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = PALETTE.hudPanel;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
}

function star(ctx, x, y, filled, size = 15) {
  ctx.fillStyle = filled ? PALETTE.hudAccent : 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 4 * Math.PI) / 5;
    const px = x + Math.cos(a) * size;
    const py = y + Math.sin(a) * size;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

export function drawMinimap(ctx, game, x, y, size) {
  const s = size / WORLD.w;
  panel(ctx, x - 6, y - 6, size + 12, size + 12);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, size, size);
  ctx.clip();
  ctx.fillStyle = PALETTE.grass;
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(x, y + BEACH_Y * s, size, size - BEACH_Y * s);
  ctx.fillStyle = PALETTE.water;
  ctx.fillRect(x, y + 2450 * s, size, size - 2450 * s);
  ctx.strokeStyle = '#55555e';
  ctx.lineWidth = 2;
  for (const c of ROAD_CENTERS) {
    if (c >= BEACH_Y) continue;
    ctx.beginPath();
    ctx.moveTo(x + c * s, y);
    ctx.lineTo(x + c * s, y + BEACH_Y * s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y + c * s);
    ctx.lineTo(x + size, y + c * s);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  for (const b of game.city.buildings) {
    ctx.fillRect(x + b.x * s, y + b.y * s, Math.max(2, b.w * s), Math.max(2, b.h * s));
  }
  const target = game.missions.targetPoint();
  if (target) {
    const pulse = 3 + Math.sin(game.time * 4) * 1.5;
    ctx.fillStyle = PALETTE.marker;
    ctx.beginPath();
    ctx.arc(x + target.x * s, y + target.y * s, pulse + 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ff4d4d';
  for (const car of game.policeCars) {
    ctx.beginPath();
    ctx.arc(x + car.x * s, y + car.y * s, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  const p = game.playerPos();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x + p.x * s, y + p.y * s, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x + p.x * s, y + p.y * s, 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('PALMERA BAY', x - 6, y + size + 22);
}

export function drawHud(ctx, game, view) {
  const p = game.player;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // Top-left: health, cash, ammo.
  panel(ctx, 12, 12, 208, 86);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText(`$${p.cash.toLocaleString('en-US')}`, 24, 34);
  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#9fb3c8';
  ctx.fillText(p.inCar ? 'DRIVING' : 'ON FOOT', 24, 52);
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fillRect(24, 62, 184, 10);
  ctx.fillStyle = p.health > 35 ? '#3aa655' : '#c23b2e';
  ctx.fillRect(24, 62, 184 * Math.max(0, p.health / TUNE.playerHealth), 10);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '11px sans-serif';
  ctx.fillText(`HP ${Math.ceil(p.health)}   AMMO ${p.ammo}`, 24, 88);

  // Top-centre: wanted stars and the mission objective.
  const starsW = 5 * 34 + 10;
  panel(ctx, view.w / 2 - starsW / 2, 12, starsW, 40);
  for (let i = 0; i < 5; i++) {
    star(ctx, view.w / 2 - starsW / 2 + 24 + i * 34, 32, i < game.wanted.level, 13);
  }
  const obj = game.missions.objectiveText;
  ctx.font = '13px sans-serif';
  const tw = ctx.measureText(obj).width;
  panel(ctx, view.w / 2 - tw / 2 - 14, 58, tw + 28, 26);
  ctx.fillStyle = PALETTE.hudAccent;
  ctx.textAlign = 'center';
  ctx.fillText(obj, view.w / 2, 76);
  ctx.textAlign = 'left';

  // Minimap, top-right.
  drawMinimap(ctx, game, view.w - 192, 12, 180);

  // Bottom-right: speed while driving.
  if (p.inCar) {
    const kmh = Math.round(Math.abs(p.inCar.speed) * 0.32);
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${kmh}`, view.w - 24, view.h - 44);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#9fb3c8';
    ctx.fillText('km/h', view.w - 24, view.h - 24);
    ctx.textAlign = 'left';
  }

  // Bottom-left: controls hint.
  ctx.fillStyle = 'rgba(12,16,22,0.55)';
  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#d8d2c2';
  ctx.fillText('WASD move/drive   E enter car   Click shoot   Space handbrake   P pause   M mute', 14, view.h - 14);

  // Mission banner.
  if (game.missions.bannerTime > 0 && game.missions.banner) {
    const b = game.missions.banner;
    const alpha = Math.min(1, game.missions.bannerTime);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(12,16,22,0.8)';
    const bw = 520;
    ctx.beginPath();
    ctx.roundRect(view.w / 2 - bw / 2, 110, bw, 74, 10);
    ctx.fill();
    ctx.fillStyle = PALETTE.hudAccent;
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(b.title, view.w / 2, 140);
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = '14px sans-serif';
    wrapText(ctx, b.text, view.w / 2, 162, bw - 40, 17);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }

  // Crosshair on foot.
  if (!p.inCar && game.state === 'playing') {
    const m = game.input.mouse;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(m.x, m.y, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(m.x - 14, m.y);
    ctx.lineTo(m.x - 5, m.y);
    ctx.moveTo(m.x + 5, m.y);
    ctx.lineTo(m.x + 14, m.y);
    ctx.moveTo(m.x, m.y - 14);
    ctx.lineTo(m.x, m.y - 5);
    ctx.moveTo(m.x, m.y + 5);
    ctx.lineTo(m.x, m.y + 14);
    ctx.stroke();
  }
}

function wrapText(ctx, text, cx, y, maxW, lh) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, cx, yy);
      line = word;
      yy += lh;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, cx, yy);
}

export function drawButton(ctx, x, y, w, h, label, hover) {
  ctx.fillStyle = hover ? '#ffc93c' : 'rgba(255,201,60,0.9)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.fillStyle = '#14181f';
  ctx.font = 'bold 17px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2 + 1);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
}

export function drawTitle(ctx, game, view, buttons) {
  // A translucent sunset wash over the living city behind the title.
  const grad = ctx.createLinearGradient(0, 0, 0, view.h);
  grad.addColorStop(0, 'rgba(247,120,51,0.62)');
  grad.addColorStop(1, 'rgba(38,32,64,0.82)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, view.w, view.h);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 64px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PALMERA BAY', view.w / 2, view.h / 2 - 110);
  ctx.font = '20px sans-serif';
  ctx.fillStyle = '#ffe9a8';
  ctx.fillText('An open-world crime game — drive, steal, run, and pay the debt.', view.w / 2, view.h / 2 - 70);
  ctx.font = '15px sans-serif';
  ctx.fillStyle = '#e8e2d4';
  ctx.fillText('Leo Marin owes the Broker. Work the jobs. Lose the heat. Keep the cash.', view.w / 2, view.h / 2 - 40);
  for (const b of buttons) {
    drawButton(ctx, b.x, b.y, b.w, b.h, b.label, b.hover);
  }
  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#d8d2c2';
  ctx.fillText('WASD move / drive  ·  E enter car  ·  Mouse aim, Click shoot  ·  Space handbrake  ·  P pause  ·  M mute', view.w / 2, view.h - 36);
  ctx.textAlign = 'left';
}

export function drawPause(ctx, view, buttons) {
  ctx.fillStyle = 'rgba(10,12,18,0.72)';
  ctx.fillRect(0, 0, view.w, view.h);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PAUSED', view.w / 2, view.h / 2 - 90);
  for (const b of buttons) drawButton(ctx, b.x, b.y, b.w, b.h, b.label, b.hover);
  ctx.textAlign = 'left';
}

export function drawGameOver(ctx, view, buttons, cashLost) {
  ctx.fillStyle = 'rgba(20,4,4,0.82)';
  ctx.fillRect(0, 0, view.w, view.h);
  ctx.fillStyle = '#ff5d5d';
  ctx.font = 'bold 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('BUSTED — FLATLINED', view.w / 2, view.h / 2 - 90);
  ctx.fillStyle = '#e8e2d4';
  ctx.font = '17px sans-serif';
  ctx.fillText(`The clinic patched you up. You lost $${cashLost} of your cash.`, view.w / 2, view.h / 2 - 52);
  for (const b of buttons) drawButton(ctx, b.x, b.y, b.w, b.h, b.label, b.hover);
  ctx.textAlign = 'left';
}

export function drawDebtPaid(ctx, view) {
  ctx.fillStyle = 'rgba(12,16,22,0.55)';
  const w = 560;
  ctx.beginPath();
  ctx.roundRect(view.w / 2 - w / 2, view.h - 120, w, 64, 10);
  ctx.fill();
  ctx.fillStyle = PALETTE.hudAccent;
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('DEBT PAID — Palmera Bay is yours, Leo.', view.w / 2, view.h - 94);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '13px sans-serif';
  ctx.fillText('Keep playing: the city, the cars and the heat are still here.', view.w / 2, view.h - 70);
  ctx.textAlign = 'left';
}

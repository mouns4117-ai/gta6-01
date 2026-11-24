// Palmera Bay — the core: boot, the game loop, the player on foot and in a
// car, the camera, police upkeep, menus and saving. Everything else plugs
// into the game object built here.

import { TUNE, SAVE_KEY } from './config.js';
import { makeRng } from './random.js';
import { buildCity, resolveCircle } from './city.js';
import { Input } from './input.js';
import { Sound } from './audio.js';
import { makePlayer, makeCar, driveCar, movePlayerOnFoot, collideCars } from './entities.js';
import { spawnTraffic, spawnParked, spawnPeds, updateTraffic, updatePed } from './traffic.js';
import { Wanted, spawnPoliceCar, spawnPoliceFoot, policeTargets, updatePoliceCar, updatePoliceFoot } from './police.js';
import { MissionManager } from './missions.js';
import { Combat } from './combat.js';
import { render } from './render.js';
import { drawHud, drawTitle, drawPause, drawGameOver, drawDebtPaid } from './hud.js';
import { loadSave, saveGame, clearSave } from './save.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') || 1337);
const rng = makeRng(seed);
const city = buildCity(rng);

const game = {
  state: 'title',
  time: 0,
  rng,
  city,
  seed,
  input: new Input(canvas),
  sound: new Sound(),
  wanted: new Wanted(),
  cars: [],
  policeCars: [],
  policeFoot: [],
  peds: [],
  cam: { x: 1280, y: 1150, zoom: 0.62 },
  shakeTime: 0,
  shakeMag: 0,
  shakeX: 0,
  shakeY: 0,
  shotMode: false,
  bestWanted: 0,
  cashLost: 0,
  policeTimer: 0,
  saveTimer: 0,
  crashCooldown: 0,
  touchCooldown: 0,
  view: { w: window.innerWidth, h: window.innerHeight },
};

game.player = makePlayer(city.playerSpawn.x, city.playerSpawn.y);
game.cars = [...spawnTraffic(city, rng, TUNE.trafficCount), ...spawnParked(city, rng, 14)];
game.peds = spawnPeds(city, rng, TUNE.pedCount);
game.missions = new MissionManager(game);
game.combat = new Combat(game);
game.combat.spawnPickups(rng, 8);

game.playerPos = function () {
  const p = game.player;
  return p.inCar ? { x: p.inCar.x, y: p.inCar.y } : { x: p.x, y: p.y };
};

game.shake = function (mag) {
  game.shakeTime = Math.max(game.shakeTime, 0.3);
  game.shakeMag = Math.max(game.shakeMag, mag);
};

game.saveProgress = function () {
  saveGame({ cash: game.player.cash, missionIndex: game.missions.index, bestWanted: game.bestWanted });
};

game.spawnComet = function () {
  const car = makeCar(800, 2260, 0, '#e02020', { parked: true });
  car.isComet = true;
  game.cars.push(car);
  return car;
};

game.spawnPoliceCarNear = function (x, y) {
  const p = game.playerPos();
  const car = makeCar(x, y, Math.atan2(p.y - y, p.x - x), '#1c2733', { police: true });
  car.speed = 380;
  game.policeCars.push(car);
  return car;
};

game.enterCar = function (car, silent) {
  const p = game.player;
  if (p.inCar || car.dead) return;
  if (!silent) {
    if (car.traffic) game.wanted.addHeat(30, game);
    else if (car.parked) game.wanted.addHeat(15, game);
    game.sound.pickup();
  }
  car.traffic = false;
  car.parked = false;
  p.inCar = car;
  p.x = car.x;
  p.y = car.y;
};

game.exitCar = function () {
  const p = game.player;
  const car = p.inCar;
  if (!car) return;
  car.parked = true;
  car.speed = 0;
  const side = car.angle + Math.PI / 2;
  p.x = car.x + Math.cos(side) * 34;
  p.y = car.y + Math.sin(side) * 34;
  resolveCircle(p, 13, city);
  p.inCar = null;
  p.angle = car.angle;
};

game.settleStep = function (dt) {
  for (const car of game.cars) if (car.traffic) updateTraffic(car, dt, city, rng);
  for (const ped of game.peds) updatePed(ped, dt, city, rng, null);
};

function resize() {
  const dpr = Math.min(1.5, window.devicePixelRatio || 1);
  game.view.w = window.innerWidth;
  game.view.h = window.innerHeight;
  canvas.width = Math.floor(game.view.w * dpr);
  canvas.height = Math.floor(game.view.h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

game.input.onFirstGesture = () => game.sound.init();

function mouseWorld() {
  const m = game.input.mouse;
  return {
    x: game.cam.x + (m.x - game.view.w / 2) / game.cam.zoom,
    y: game.cam.y + (m.y - game.view.h / 2) / game.cam.zoom,
  };
}

function layoutButtons(kind, view) {
  const cx = view.w / 2;
  const bw = 300;
  const bh = 52;
  if (kind === 'title') {
    const list = [{ id: 'new', label: 'START NEW GAME', x: cx - bw / 2, y: view.h / 2 + 10, w: bw, h: bh }];
    if (loadSave()) list.push({ id: 'continue', label: 'CONTINUE', x: cx - bw / 2, y: view.h / 2 + 74, w: bw, h: bh });
    return list;
  }
  if (kind === 'pause') {
    return [
      { id: 'resume', label: 'RESUME', x: cx - bw / 2, y: view.h / 2 - 40, w: bw, h: bh },
      { id: 'restart', label: 'RESTART', x: cx - bw / 2, y: view.h / 2 + 24, w: bw, h: bh },
      { id: 'title', label: 'QUIT TO TITLE', x: cx - bw / 2, y: view.h / 2 + 88, w: bw, h: bh },
    ];
  }
  return [{ id: 'retry', label: 'TRY AGAIN', x: cx - bw / 2, y: view.h / 2 + 10, w: bw, h: bh }];
}

function buttonAt(buttons, x, y) {
  return buttons.find((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) || null;
}

function startNewGame() {
  clearSave();
  game.player.cash = 0;
  game.missions.index = 0;
  game.missions.done = false;
  game.state = 'playing';
  game.missions.startMission(0);
  statusEl.textContent = 'Playing Palmera Bay. First job: pick up the package at the marina.';
}

function continueGame() {
  const s = loadSave();
  game.state = 'playing';
  if (s) {
    game.player.cash = s.cash;
    game.bestWanted = s.bestWanted;
    game.missions.index = Math.min(s.missionIndex, 3);
    game.missions.nextStart = 0.6;
  } else {
    game.missions.startMission(0);
  }
}

function respawn() {
  const p = game.player;
  p.health = TUNE.playerHealth;
  p.inCar = null;
  p.x = city.clinic.x;
  p.y = city.clinic.y + 60;
  game.wanted.clear();
  game.policeCars = [];
  game.policeFoot = [];
  game.state = 'playing';
  game.saveProgress();
}

function update(dt) {
  const p = game.player;
  const input = game.input;

  if (input.pressed('m')) game.sound.setMuted(!game.sound.muted);

  if (game.state === 'title') {
    // Slow pan over downtown behind the title.
    game.cam.x = 1280 + Math.sin(game.time * 0.05) * 320;
    game.cam.y = 1150 + Math.cos(game.time * 0.04) * 200;
    game.cam.zoom = 0.62;
    game.settleStep(dt);
    if (input.consumeClick()) {
      const b = buttonAt(layoutButtons('title', game.view), input.mouse.x, input.mouse.y);
      if (b && b.id === 'new') startNewGame();
      else if (b && b.id === 'continue') continueGame();
    }
    if (input.pressed('enter')) startNewGame();
    return;
  }

  if (game.state === 'gameover') {
    if (input.consumeClick()) {
      const b = buttonAt(layoutButtons('gameover', game.view), input.mouse.x, input.mouse.y);
      if (b && b.id === 'retry') respawn();
    }
    if (input.pressed('enter')) respawn();
    return;
  }

  if (input.pressed('p') || input.pressed('escape')) {
    game.state = game.state === 'paused' ? 'playing' : 'paused';
  }
  if (game.state === 'paused') {
    if (input.consumeClick()) {
      const b = buttonAt(layoutButtons('pause', game.view), input.mouse.x, input.mouse.y);
      if (b && b.id === 'resume') game.state = 'playing';
      else if (b && b.id === 'restart') {
        clearSave();
        window.location.reload();
      } else if (b && b.id === 'title') game.state = 'title';
    }
    return;
  }

  // --- playing ---
  p.fireDelay = Math.max(0, p.fireDelay - dt);
  p.hurtFlash = Math.max(0, p.hurtFlash - dt);
  game.crashCooldown = Math.max(0, game.crashCooldown - dt);
  game.touchCooldown = Math.max(0, game.touchCooldown - dt);

  if (p.inCar) {
    const car = p.inCar;
    // In screenshot mode the car drives itself so the shot catches it moving.
    const throttle = game.shotMode
      ? 1
      : input.held('w', 'arrowup')
        ? 1
        : input.held('s', 'arrowdown')
          ? -1
          : 0;
    const steer = game.shotMode ? 0 : input.held('a', 'arrowleft') ? -1 : input.held('d', 'arrowright') ? 1 : 0;
    const handbrake = game.shotMode ? false : input.held(' ');
    driveCar(car, throttle, steer, handbrake, dt);
    resolveCircle(car, 20, city);
    p.x = car.x;
    p.y = car.y;
    p.angle = car.angle;
    if (car.skidding) {
      const bx = car.x - Math.cos(car.angle) * 18;
      const by = car.y - Math.sin(car.angle) * 18;
      game.combat.skids.push({ x: bx, y: by, dx: -Math.cos(car.angle) * 6, dy: -Math.sin(car.angle) * 6 });
    }
    if (car.health <= 0 && !car.dead) {
      car.dead = true;
      game.combat.explode(car.x, car.y);
      p.health -= 30;
      p.hurtFlash = 0.6;
      p.inCar = null;
      p.x = car.x + 40;
      p.y = car.y + 40;
      resolveCircle(p, 13, city);
    }
    if (input.pressed('e')) game.exitCar();
  } else {
    const mv = input.moveVector();
    const running = input.held('shift');
    const speed = running ? TUNE.playerRun : TUNE.playerWalk;
    p.moving = mv.x !== 0 || mv.y !== 0;
    p.running = running && p.moving;
    movePlayerOnFoot(p, mv.x * speed, mv.y * speed, dt, city);
    const mw = mouseWorld();
    p.angle = Math.atan2(mw.y - p.y, mw.x - p.x);
    if (input.mouse.down) game.combat.playerShoot(p.x, p.y, p.angle);
    if (input.pressed('e')) {
      let best = null;
      let bd = 52;
      for (const car of [...game.cars, ...game.policeCars]) {
        if (car.dead) continue;
        const d = Math.hypot(car.x - p.x, car.y - p.y);
        if (d < bd) {
          bd = d;
          best = car;
        }
      }
      if (best) game.enterCar(best, false);
    }
  }

  // Traffic and pedestrians keep the city alive.
  for (const car of game.cars) {
    if (car.traffic) updateTraffic(car, dt, city, rng);
  }
  for (const ped of game.peds) updatePed(ped, dt, city, rng, game.combat.gunfire);

  // Cars bumping into each other and into the player on foot.
  collideCars([...game.cars, ...game.policeCars], city);
  if (!p.inCar) {
    for (const car of [...game.cars, ...game.policeCars]) {
      if (car.dead || Math.abs(car.speed) < 40) continue;
      if (Math.hypot(car.x - p.x, car.y - p.y) < 30 && game.touchCooldown <= 0) {
        p.health -= 14;
        p.hurtFlash = 0.5;
        game.touchCooldown = 0.6;
        game.shake(0.3);
        const a = Math.atan2(p.y - car.y, p.x - car.x);
        p.x += Math.cos(a) * 30;
        p.y += Math.sin(a) * 30;
        resolveCircle(p, 13, city);
      }
    }
  }
  if (game.crashCooldown <= 0) {
    for (const car of game.cars) {
      if (car.health < 100 && Math.abs(car.speed) > 240) {
        game.sound.crash();
        game.crashCooldown = 1.2;
        break;
      }
    }
  }

  // Police: keep the right numbers hunting, and let the heat cool off.
  const targets = policeTargets(game);
  game.policeTimer -= dt;
  if (game.policeTimer <= 0) {
    game.policeTimer = 1.1;
    if (game.policeCars.length < targets.wantCars) spawnPoliceCar(game, rng);
    if (game.policeFoot.length < targets.wantFoot && !p.inCar) spawnPoliceFoot(game, rng);
    if (game.wanted.level === 0) {
      game.policeCars = [];
      game.policeFoot = [];
    }
  }
  for (const car of game.policeCars) updatePoliceCar(car, dt, game);
  for (const ped of game.policeFoot) updatePoliceFoot(ped, dt, game);
  game.policeCars = game.policeCars.filter((c) => !c.dead);
  game.policeFoot = game.policeFoot.filter((f) => !f.dead);
  const policeNear = [...game.policeCars, ...game.policeFoot].some(
    (u) => Math.hypot(u.x - p.x, u.y - p.y) < 420,
  );
  game.wanted.update(dt, p, policeNear);
  game.bestWanted = Math.max(game.bestWanted, game.wanted.level);

  game.missions.update(dt);
  game.combat.update(dt);

  // Camera follows the player, pulling back a little at speed.
  const pp = game.playerPos();
  const speedRatio = p.inCar ? Math.min(1, Math.abs(p.inCar.speed) / TUNE.carMaxSpeed) : 0;
  const targetZoom = p.inCar ? 0.86 - speedRatio * 0.14 : 1.0;
  game.cam.zoom += (targetZoom - game.cam.zoom) * Math.min(1, dt * 2);
  game.cam.x += (pp.x - game.cam.x) * Math.min(1, dt * 5);
  game.cam.y += (pp.y - game.cam.y) * Math.min(1, dt * 5);

  // Sound follows the drive and the heat.
  game.sound.engine(p.inCar ? speedRatio : 0, !!p.inCar);
  game.sound.siren(game.wanted.level > 0, game.time);
  game.sound.music(dt);

  // Autosave.
  game.saveTimer -= dt;
  if (game.saveTimer <= 0) {
    game.saveTimer = 15;
    game.saveProgress();
  }

  // Death.
  if (p.health <= 0) {
    game.cashLost = Math.floor(p.cash * 0.1);
    p.cash -= game.cashLost;
    game.state = 'gameover';
    game.saveProgress();
  }
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - (frame.last || now)) / 1000 || 0.016);
  frame.last = now;
  game.time += dt;
  if (game.shakeTime > 0) {
    game.shakeTime -= dt;
    game.shakeX = (Math.random() - 0.5) * game.shakeMag * 14;
    game.shakeY = (Math.random() - 0.5) * game.shakeMag * 14;
    if (game.shakeTime <= 0) {
      game.shakeX = 0;
      game.shakeY = 0;
      game.shakeMag = 0;
    }
  }
  update(dt);
  ctx.clearRect(0, 0, game.view.w, game.view.h);
  render(ctx, game, game.view);
  if (game.state === 'playing' || game.state === 'paused') {
    drawHud(ctx, game, game.view);
    if (game.missions.done) drawDebtPaid(ctx, game.view);
  }
  if (game.state === 'title') {
    const buttons = layoutButtons('title', game.view).map((b) => ({
      ...b,
      hover: buttonAt([b], game.input.mouse.x, game.input.mouse.y) !== null,
    }));
    drawTitle(ctx, game, game.view, buttons);
  }
  if (game.state === 'paused') {
    const buttons = layoutButtons('pause', game.view).map((b) => ({
      ...b,
      hover: buttonAt([b], game.input.mouse.x, game.input.mouse.y) !== null,
    }));
    drawPause(ctx, game.view, buttons);
  }
  if (game.state === 'gameover') {
    const buttons = layoutButtons('gameover', game.view).map((b) => ({
      ...b,
      hover: buttonAt([b], game.input.mouse.x, game.input.mouse.y) !== null,
    }));
    drawGameOver(ctx, game.view, buttons, game.cashLost);
  }
  if (!window.__ready) window.__ready = true;
}

// Boot: a screenshot query stages a scene; otherwise the title screen waits.
const shot = params.get('shot');
if (shot) {
  applyShot(game, shot);
} else {
  const s = loadSave();
  if (s && s.cash > 0) game.player.cash = 0; // fresh run starts at $0; Continue restores it
}
window.__game = game;
requestAnimationFrame(frame);

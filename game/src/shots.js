// Palmera Bay — screenshot staging. A ?shot= query picks a scene the game
// sets up by itself, so its maker can capture the city, a drive, a police
// chase and a mission in progress with no hand on the keyboard.

export function applyShot(game, name) {
  game.shotMode = true;
  const p = game.player;
  if (name === 'start') {
    game.state = 'title';
    game.cam.x = 1280;
    game.cam.y = 1150;
    game.cam.zoom = 0.62;
    return;
  }
  game.state = 'playing';
  if (name === 'drive') {
    // Leo in a blue sedan, cruising north through downtown.
    const car = game.cars.find((c) => c.parked) || game.cars[0];
    game.enterCar(car, true);
    car.x = 1120;
    car.y = 2200;
    car.angle = -Math.PI / 2;
    car.speed = 320;
    game.cam.x = car.x;
    game.cam.y = car.y;
    game.cam.zoom = 0.85;
    game.missions.startMission(0);
  } else if (name === 'chase') {
    // Three stars, three patrol cars closing in on a fast getaway.
    const car = game.cars.find((c) => c.parked) || game.cars[0];
    game.enterCar(car, true);
    car.x = 800;
    car.y = 1800;
    car.angle = -Math.PI / 2;
    car.speed = 460;
    game.cam.x = car.x;
    game.cam.y = car.y;
    game.cam.zoom = 0.8;
    // Mission three: three stars and every patrol car in the city on your tail.
    game.missions.startMission(2);
    for (let i = 0; i < 3; i++) {
      const pc = game.spawnPoliceCarNear(car.x + (i - 1) * 130, car.y + 280 + i * 90);
      pc.speed = 420;
    }
  } else if (name === 'mission') {
    // Mission two: Leo on foot, closing in on the red Comet GT.
    game.missions.startMission(1);
    p.x = 760;
    p.y = 2200;
    p.angle = 0.2;
    game.cam.x = 900;
    game.cam.y = 2180;
    game.cam.zoom = 0.85;
  }
  // Let traffic settle into the roads before the first paint.
  for (let i = 0; i < 240; i++) game.settleStep(1 / 60);
}

export function shotNames() {
  return ['start', 'drive', 'chase', 'mission'];
}

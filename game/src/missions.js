// Palmera Bay — the Broker's jobs. Four missions in a chain: a pickup and
// a delivery, a stolen car, a police escape, and one last run. Each mission
// is a list of stages; the manager walks the player through them.

export const MISSION_DEFS = [
  {
    name: 'First Job for the Broker',
    intro: 'The Broker needs a package moved. Pick it up at the marina, then drop it downtown.',
    reward: 250,
    stages: [
      { kind: 'goto', x: 2080, y: 2240, label: 'Pick up the package at the marina', radius: 46 },
      { kind: 'goto', x: 1120, y: 800, label: 'Deliver the package to the Broker office', radius: 46 },
    ],
  },
  {
    name: 'Hot Wheels',
    intro: 'A red Comet GT is parked on the beachfront. Take it — quietly — and bring it to the garage.',
    reward: 400,
    stages: [
      { kind: 'stealCar', label: 'Steal the red Comet GT on the beachfront', radius: 60 },
      { kind: 'deliverCar', x: 1760, y: 480, label: 'Deliver the Comet GT to the garage', radius: 70 },
    ],
  },
  {
    name: 'Heat Wave',
    intro: 'The job went loud. Three stars and every patrol car in Palmera Bay is coming. Lose them.',
    reward: 500,
    stages: [{ kind: 'loseCops', label: 'Lose the police — get your wanted level to zero', radius: 0 }],
  },
  {
    name: "The Broker's Cut",
    intro: 'One last run and the debt is paid. Pick up the cut at the clinic, deliver it downtown — with the heat already on.',
    reward: 1000,
    stages: [
      { kind: 'goto', x: 480, y: 1760, label: 'Pick up the cut at the clinic', radius: 46 },
      { kind: 'goto', x: 1120, y: 800, label: 'Deliver the cut to the Broker office', radius: 46 },
    ],
  },
];

export class MissionManager {
  constructor(game) {
    this.game = game;
    this.index = 0;
    this.stage = 0;
    this.active = false;
    this.done = false;
    this.banner = null;
    this.bannerTime = 0;
    this.nextStart = 0;
    this.cometCar = null;
  }

  get def() {
    return MISSION_DEFS[this.index] || null;
  }

  get currentStage() {
    const d = this.def;
    return d && this.active ? d.stages[this.stage] : null;
  }

  get objectiveText() {
    const s = this.currentStage;
    if (!s) return this.done ? 'Debt paid. Palmera Bay is yours.' : 'Drive to the yellow marker to start the next job.';
    return s.label;
  }

  startMission(i) {
    const game = this.game;
    this.index = i;
    this.stage = 0;
    this.active = true;
    const d = this.def;
    this.showBanner(d.name, d.intro);
    if (i === 1) {
      // The Comet GT waits on the beachfront.
      this.cometCar = game.spawnComet();
    }
    if (i === 2) {
      game.wanted.addHeat(200, game);
    }
    if (i === 3) {
      game.wanted.addHeat(110, game);
    }
    if (game.sound) game.sound.missionDone();
  }

  showBanner(title, text) {
    this.banner = { title, text };
    this.bannerTime = 4.5;
  }

  completeMission() {
    const game = this.game;
    const d = this.def;
    game.player.cash += d.reward;
    this.showBanner('Job done', `+$${d.reward} — ${d.name} complete.`);
    if (game.sound) game.sound.missionDone();
    this.active = false;
    this.index++;
    if (this.index >= MISSION_DEFS.length) {
      this.done = true;
      this.showBanner('Debt paid', 'The Broker is square. Palmera Bay is yours, Leo.');
    } else {
      this.nextStart = 3;
    }
    game.saveProgress();
  }

  update(dt) {
    if (this.bannerTime > 0) this.bannerTime -= dt;
    if (!this.active && !this.done && this.nextStart > 0) {
      this.nextStart -= dt;
      if (this.nextStart <= 0) this.startMission(this.index);
    }
    if (!this.active) return;
    const game = this.game;
    const p = game.playerPos();
    const s = this.currentStage;
    if (!s) return;
    if (s.kind === 'goto') {
      if (Math.hypot(p.x - s.x, p.y - s.y) < s.radius) this.advance();
    } else if (s.kind === 'stealCar') {
      if (game.player.inCar === this.cometCar) this.advance();
    } else if (s.kind === 'deliverCar') {
      const car = game.player.inCar;
      if (car === this.cometCar && Math.hypot(car.x - s.x, car.y - s.y) < s.radius) this.advance();
    } else if (s.kind === 'loseCops') {
      if (game.wanted.level === 0) this.advance();
    }
  }

  advance() {
    const game = this.game;
    if (game.sound) game.sound.pickup();
    this.stage++;
    if (this.stage >= this.def.stages.length) {
      this.completeMission();
    } else {
      this.showBanner(this.def.name, this.currentStage.label);
    }
  }

  // Where the minimap and the world marker should point.
  targetPoint() {
    const s = this.currentStage;
    if (!s) return null;
    if (s.kind === 'stealCar' && this.cometCar) return { x: this.cometCar.x, y: this.cometCar.y };
    if (s.kind === 'loseCops') return null;
    return { x: s.x, y: s.y };
  }
}

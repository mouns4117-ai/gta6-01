// Palmera Bay — the entry program (Node 22, standard library only).
//
// It hands the game in: it copies game/ (the playable static files) and
// screenshots/ (the game's own screenshots) from beside this file into the
// output directory, then writes /output/dossier.json with the vendored
// make.fun dossier library. The grader runs it twice and both runs must
// write the same bytes, so nothing here depends on the clock or on luck.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyTree(from, to) {
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
}

function countFiles(dir) {
  let n = 0;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    n += statSync(full).isDirectory() ? countFiles(full) : 1;
  }
  return n;
}

function fail(message) {
  console.error(`Palmera Bay: ${message}`);
  process.exit(1);
}

// The game itself.
const gameDir = join(here, 'game');
if (!existsSync(join(gameDir, 'index.html'))) fail('game/index.html is missing');
copyTree(gameDir, join(out, 'game'));

// The screenshots: the gate wants 3 or 4, each a real render of the game.
const shotsDir = join(here, 'screenshots');
if (!existsSync(shotsDir)) fail('screenshots/ is missing');
const shots = readdirSync(shotsDir).filter((n) => !n.startsWith('.'));
if (shots.length < 3 || shots.length > 4) fail(`expected 3 or 4 screenshots, found ${shots.length}`);
copyTree(shotsDir, join(out, 'screenshots'));

// The dossier: the judge's view of the entry, built from the copied files.
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(out, 'dossier.json'), dossier);

console.log(`Palmera Bay: ${countFiles(join(out, 'game'))} game files, ${shots.length} screenshots, dossier ${dossier.length} bytes -> ${out}`);

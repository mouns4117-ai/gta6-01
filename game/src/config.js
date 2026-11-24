// Palmera Bay — tuning numbers and the sun-soaked palette.
// Every balance value the game uses lives in this one file.

export const WORLD = { w: 2560, h: 2560 };
export const ROAD = { spacing: 320, width: 64, lane: 15 };
export const BEACH_Y = 2336; // sand and water start below this line

export const TUNE = {
  playerWalk: 175,
  playerRun: 268,
  playerRadius: 13,
  carAccel: 430,
  carBrake: 700,
  carReverseMax: 230,
  carMaxSpeed: 560,
  carTurn: 2.9,
  carGrip: 3.4,
  carRadius: 20,
  bulletSpeed: 920,
  bulletRange: 620,
  pistolDamage: 34,
  pistolAmmoStart: 24,
  pistolFireDelay: 0.22,
  playerHealth: 100,
  copHealth: 60,
  carHealth: 100,
  wantedDecaySeconds: 26,
  trafficCount: 34,
  pedCount: 30,
  maxPoliceCars: 6,
  maxPoliceFoot: 5,
  missionMarkerRadius: 26,
};

export const PALETTE = {
  grass: '#79a854',
  grassDark: '#6b9a48',
  sand: '#e6c98d',
  sandDark: '#d9b878',
  water: '#2f86a3',
  waterDeep: '#256d86',
  road: '#3b3b42',
  roadLine: '#e8d44d',
  sidewalk: '#b7b0a0',
  crosswalk: '#d8d2c2',
  park: '#5f9c46',
  pier: '#8a6b4a',
  buildingRoofs: ['#c96f4a', '#d9a05b', '#7d8aa0', '#a85f6e', '#5f8a7a', '#b08a4f', '#8a6f9e', '#6f7f5a'],
  buildingEdge: 'rgba(0,0,0,0.28)',
  window: '#e8f0f2',
  palmTrunk: '#7a5a38',
  palmLeaf: '#3f8f3a',
  carColors: ['#c23b2e', '#2e6fc2', '#e0b13c', '#3aa655', '#7a4fa3', '#d8d8d8', '#2b2b2b', '#c26a1e', '#4fa3a3'],
  playerJacket: '#d8382c',
  playerSkin: '#e8b98a',
  policeCar: '#1c2733',
  policeLightRed: '#ff2e2e',
  policeLightBlue: '#2e7bff',
  hudPanel: 'rgba(12,16,22,0.72)',
  hudText: '#f2f0e6',
  hudAccent: '#ffc93c',
  marker: '#ffc93c',
  markerDanger: '#ff4d4d',
};

export const SAVE_KEY = 'palmera-bay-save-v1';

// config.js — every tunable number for the Midnight Gallery heist, in one place.
// The game is a top-down stealth heist: cross each room, dodge vision cones,
// grab the loot target and reach the exit before the alarm hits 100.

export const TILE = 40;
export const MAP_COLS = 26;
export const MAP_ROWS = 16;
export const PLAY_X = 40; // playfield origin on the canvas
export const PLAY_Y = 92;
export const CANVAS_W = 1280;
export const CANVAS_H = 800;

export const COLORS = {
  floor: '#232838',
  floorAlt: '#272d40',
  wall: '#4a3f5e',
  wallTop: '#6b5a8c',
  crate: '#7a5c38',
  crateTop: '#9c7648',
  vent: '#1a2b2e',
  ventEdge: '#3fa7a0',
  exit: '#2fae5f',
  exitGlow: '#7dffb0',
  lootSmall: '#ffd34d',
  lootMain: '#ff9d2e',
  thief: '#e8e6f0',
  thiefCoat: '#2b2f4a',
  guard: '#c94f4f',
  guardDark: '#7e2f2f',
  camera: '#b8c4d8',
  cone: 'rgba(255, 214, 90, 0.20)',
  coneHot: 'rgba(255, 80, 60, 0.30)',
  coneCam: 'rgba(120, 200, 255, 0.18)',
  hud: '#141824',
  hudText: '#e8e6f0',
  alarmLow: '#3fae5f',
  alarmMid: '#e8a13a',
  alarmHigh: '#e5484d',
  panel: '#1b2033',
  panelEdge: '#39415e',
};

export const PLAYER = {
  radius: 13,
  speed: 165, // px per second on open floor
  ventSpeed: 95, // slower, but invisible inside vents
  grabRange: 34,
};

export const GUARD = {
  radius: 13,
  patrolSpeed: 62,
  chaseSpeed: 138,
  visionRange: 215,
  visionHalfAngle: (38 * Math.PI) / 180,
  suspicionPerSecond: 1.6, // full suspicion in ~0.6s of being seen
  suspicionDecay: 0.55,
  chaseGiveUpSeconds: 4, // lose sight this long and the guard returns to patrol
  spotGraceSeconds: 0.8, // "!" warning before the chase actually starts
};

export const CAMERA = {
  range: 230,
  halfAngle: (32 * Math.PI) / 180,
  sweepSpeed: 0.55, // radians per second
  alarmPerSecond: 34,
};

export const ALARM = {
  guardSeenPerSecond: 26,
  decayPerSecond: 2.2,
  lockdownAt: 100,
  startLevel3: 25, // the rooftop job starts hot
};

export const TOOLS = {
  smoke: { key: '1', name: 'Smoke Bomb', cost: 30, radius: 130, duration: 4.5 },
  emp: { key: '2', name: 'EMP Pulse', cost: 40, duration: 8 },
  coin: { key: '3', name: 'Coin Toss', cost: 10, radius: 170 },
};

export const LOOT = {
  smallValue: 25,
  mainValue: 150,
  bonusValue: 60,
};

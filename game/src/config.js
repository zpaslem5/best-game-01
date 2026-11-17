// Every tuning number and colour for NOVA DRIFT in one place. The playfield is a
// fixed 1280x720 logical area; the renderer scales it to the window, so no rule
// below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const PALETTE = {
  background: '#070b1a',
  nebulaA: '#1b2a5e',
  nebulaB: '#3d1a5e',
  nebulaC: '#0e3a4a',
  ship: '#7df9ff',
  shipCore: '#e8feff',
  bullet: '#ffe066',
  rock: '#b8a6c9',
  rockDark: '#6e5a86',
  chaser: '#ff5d8f',
  shard: '#ffd166',
  shardCore: '#fff3c4',
  shield: '#5df2ff',
  rapid: '#ff9f1c',
  magnet: '#c77dff',
  text: '#e8f6ff',
  textDim: '#8fa8c8',
  danger: '#ff4d6d',
  good: '#7dffa8',
};

export const SHIP = {
  radius: 16,
  thrust: 900,
  maxSpeed: 420,
  drag: 0.92,
  fireInterval: 0.16,
  rapidFireInterval: 0.07,
  bulletSpeed: 720,
  invulnerable: 2.0,
};

export const LIVES = 3;

export const ROCK = {
  largeRadius: 46,
  mediumRadius: 28,
  smallRadius: 15,
  largeSpeed: 70,
  mediumSpeed: 120,
  smallSpeed: 180,
  largeScore: 20,
  mediumScore: 50,
  smallScore: 100,
  splitShards: { large: 3, medium: 2, small: 1 },
};

export const CHASER = {
  radius: 14,
  speed: 170,
  score: 150,
  turnRate: 2.6,
};

export const SHARD = {
  radius: 7,
  value: 25,
  magnetRadius: 320,
  collectRadius: 26,
  life: 9,
};

export const COMBO = {
  window: 3.0,
  step: 0.25,
  max: 4.0,
};

export const PICKUP = {
  radius: 13,
  dropChance: 0.12,
  duration: 8,
};

export const WAVE = {
  baseRocks: 4,
  rocksPerWave: 2,
  chasersFromWave: 2,
  chaserEveryWave: 2,
  clearBonus: 250,
  spawnInterval: 0.9,
};

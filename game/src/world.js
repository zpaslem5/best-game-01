// The whole game state of NOVA DRIFT and the rules that move it: the ship, its
// bullets, the rocks that split when shot, the chasers that hunt the ship, the
// star shards they drop, the pickups, the waves, the combo and the score. The
// simulation runs on a fixed step, so the same seed and the same inputs always
// give the same game — the screenshot scenes rely on that.

import {
  CHASER,
  COMBO,
  FIELD,
  LIVES,
  PICKUP,
  ROCK,
  SHARD,
  SHIP,
  WAVE,
} from './config.js';
import { angle, makeRandom, pick, range, rangeInt } from './random.js';
import {
  ACTION_DOWN,
  ACTION_FIRE,
  ACTION_LEFT,
  ACTION_PAUSE,
  ACTION_RESTART,
  ACTION_RIGHT,
  ACTION_START,
  ACTION_UP,
  isHeld,
  wasPressed,
} from './input.js';
import {
  playExplosion,
  playGameOver,
  playHit,
  playPickup,
  playShard,
  playShoot,
  playWave,
} from './audio.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'playing';
export const SCREEN_PAUSE = 'paused';
export const SCREEN_OVER = 'over';

const PICKUP_KINDS = ['shield', 'rapid', 'magnet'];

/** A fresh world: title screen, ship parked in the middle, a few rocks drifting behind it. */
export function createWorld(seed) {
  const random = makeRandom(seed);
  const world = {
    random,
    seed,
    screen: SCREEN_TITLE,
    time: 0,
    score: 0,
    best: loadBest(),
    combo: 1,
    comboCount: 0,
    comboTimer: 0,
    lives: LIVES,
    wave: 0,
    wavePhase: 'banner',
    bannerTimer: 0,
    spawnQueue: [],
    spawnTimer: 0,
    shake: 0,
    flash: 0,
    ship: freshShip(),
    bullets: [],
    rocks: [],
    chasers: [],
    shards: [],
    pickups: [],
    particles: [],
    popups: [],
    stars: [],
    rapidTimer: 0,
    magnetTimer: 0,
  };
  for (let index = 0; index < 110; index += 1) {
    world.stars.push({
      x: random() * FIELD.width,
      y: random() * FIELD.height,
      size: range(random, 0.6, 2.2),
      speed: range(random, 4, 22),
      twinkle: random() * Math.PI * 2,
    });
  }
  for (let index = 0; index < 5; index += 1) {
    world.rocks.push(makeRock(world, 'large', random() * FIELD.width, range(random, 0, 200)));
  }
  return world;
}

function freshShip() {
  return {
    x: FIELD.width / 2,
    y: FIELD.height / 2,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    fireCooldown: 0,
    invulnerable: 0,
    shield: false,
    thrusting: false,
  };
}

function loadBest() {
  try {
    if (typeof localStorage === 'undefined') return 0;
    return Number(localStorage.getItem('novadrift-best') ?? 0) || 0;
  } catch {
    return 0;
  }
}

function saveBest(world) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem('novadrift-best', String(world.best));
  } catch {
    // Storage may be unavailable; the best score is a nice-to-have.
  }
}

/** A rock of `size` at (x, y) with a random drift and a jagged outline. */
function makeRock(world, size, x, y) {
  const random = world.random;
  const radius =
    size === 'large' ? ROCK.largeRadius : size === 'medium' ? ROCK.mediumRadius : ROCK.smallRadius;
  const speed =
    size === 'large' ? ROCK.largeSpeed : size === 'medium' ? ROCK.mediumSpeed : ROCK.smallSpeed;
  const direction = angle(random);
  const vertices = [];
  const count = rangeInt(random, 8, 11);
  for (let index = 0; index < count; index += 1) {
    vertices.push(range(random, 0.72, 1.08));
  }
  return {
    x,
    y,
    vx: Math.cos(direction) * range(random, speed * 0.6, speed * 1.3),
    vy: Math.sin(direction) * range(random, speed * 0.6, speed * 1.3),
    radius,
    size,
    angle: angle(random),
    spin: range(random, -1.2, 1.2),
    vertices,
  };
}

function makeChaser(world, x, y) {
  const random = world.random;
  const direction = angle(random);
  return {
    x,
    y,
    vx: Math.cos(direction) * CHASER.speed * 0.5,
    vy: Math.sin(direction) * CHASER.speed * 0.5,
    angle: direction,
    radius: CHASER.radius,
  };
}

function makeShard(world, x, y) {
  const random = world.random;
  const direction = angle(random);
  const speed = range(random, 40, 130);
  return {
    x,
    y,
    vx: Math.cos(direction) * speed,
    vy: Math.sin(direction) * speed,
    life: SHARD.life,
    value: SHARD.value,
  };
}

function makePickup(world, x, y) {
  return { x, y, kind: pick(world.random, PICKUP_KINDS), life: 10 };
}

function burst(world, x, y, color, count, speed) {
  for (let index = 0; index < count; index += 1) {
    const direction = angle(world.random);
    const velocity = range(world.random, speed * 0.3, speed);
    world.particles.push({
      x,
      y,
      vx: Math.cos(direction) * velocity,
      vy: Math.sin(direction) * velocity,
      life: range(world.random, 0.35, 0.8),
      maxLife: 0.8,
      size: range(world.random, 1.5, 3.5),
      color,
    });
  }
}

function popup(world, x, y, text, color) {
  world.popups.push({ x, y, text, life: 1, color });
}

function edgeSpawn(world) {
  const random = world.random;
  const side = rangeInt(random, 0, 3);
  if (side === 0) return { x: range(random, 0, FIELD.width), y: -50 };
  if (side === 1) return { x: FIELD.width + 50, y: range(random, 0, FIELD.height) };
  if (side === 2) return { x: range(random, 0, FIELD.width), y: FIELD.height + 50 };
  return { x: -50, y: range(random, 0, FIELD.height) };
}

/** Fill the spawn queue for `wave` and start the banner. */
function beginWave(world, wave, audio) {
  world.wave = wave;
  world.wavePhase = 'banner';
  world.bannerTimer = 2.2;
  world.spawnQueue = [];
  const rocks = WAVE.baseRocks + WAVE.rocksPerWave * (wave - 1);
  for (let index = 0; index < rocks; index += 1) world.spawnQueue.push('rock');
  if (wave >= WAVE.chasersFromWave) {
    const chasers = Math.min(2 + wave, 8);
    for (let index = 0; index < chasers; index += 1) world.spawnQueue.push('chaser');
  }
  world.spawnTimer = 0.5;
  if (audio !== null) playWave(audio);
}

function spawnNext(world) {
  const kind = world.spawnQueue.shift();
  if (kind === undefined) return;
  const point = edgeSpawn(world);
  if (kind === 'rock') world.rocks.push(makeRock(world, 'large', point.x, point.y));
  else world.chasers.push(makeChaser(world, point.x, point.y));
}

function dropLoot(world, rock) {
  const shards = ROCK.splitShards[rock.size];
  for (let index = 0; index < shards; index += 1) {
    world.shards.push(makeShard(world, rock.x, rock.y));
  }
  if (world.random() < PICKUP.dropChance) {
    world.pickups.push(makePickup(world, rock.x, rock.y));
  }
}

function destroyRock(world, index, audio) {
  const rock = world.rocks[index];
  world.rocks.splice(index, 1);
  const score =
    rock.size === 'large' ? ROCK.largeScore : rock.size === 'medium' ? ROCK.mediumScore : ROCK.smallScore;
  world.score += Math.round(score * world.combo);
  popup(world, rock.x, rock.y, `+${Math.round(score * world.combo)}`, '#e8f6ff');
  burst(world, rock.x, rock.y, '#b8a6c9', rock.size === 'large' ? 26 : 16, 260);
  if (audio !== null) playExplosion(audio, rock.size === 'large');
  if (rock.size !== 'small') {
    const child = rock.size === 'large' ? 'medium' : 'small';
    for (let count = 0; count < 2; count += 1) {
      const piece = makeRock(world, child, rock.x, rock.y);
      piece.vx = range(world.random, -1, 1) * ROCK.mediumSpeed;
      piece.vy = range(world.random, -1, 1) * ROCK.mediumSpeed;
      world.rocks.push(piece);
    }
  }
  dropLoot(world, rock);
}

function hitShip(world, audio) {
  const ship = world.ship;
  if (ship.invulnerable > 0) return;
  if (ship.shield) {
    ship.shield = false;
    ship.invulnerable = 1.5;
    burst(world, ship.x, ship.y, '#5df2ff', 24, 300);
    if (audio !== null) playHit(audio);
    return;
  }
  world.lives -= 1;
  world.combo = 1;
  world.comboCount = 0;
  world.comboTimer = 0;
  world.shake = 14;
  world.flash = 0.35;
  burst(world, ship.x, ship.y, '#ff4d6d', 34, 340);
  burst(world, ship.x, ship.y, '#7df9ff', 18, 240);
  if (audio !== null) playHit(audio);
  if (world.lives <= 0) {
    world.screen = SCREEN_OVER;
    if (world.score > world.best) {
      world.best = world.score;
      saveBest(world);
    }
    if (audio !== null) playGameOver(audio);
  } else {
    ship.invulnerable = SHIP.invulnerable;
    ship.x = FIELD.width / 2;
    ship.y = FIELD.height / 2;
    ship.vx = 0;
    ship.vy = 0;
  }
}

function collectShard(world, index, audio) {
  const shard = world.shards[index];
  world.shards.splice(index, 1);
  world.comboCount += 1;
  world.combo = Math.min(COMBO.max, 1 + world.comboCount * COMBO.step);
  world.comboTimer = COMBO.window;
  const gained = Math.round(shard.value * world.combo);
  world.score += gained;
  popup(world, shard.x, shard.y, `+${gained}`, '#ffd166');
  burst(world, shard.x, shard.y, '#ffd166', 8, 160);
  if (audio !== null) playShard(audio, world.comboCount);
}

function applyPickup(world, index, audio) {
  const pickup = world.pickups[index];
  world.pickups.splice(index, 1);
  if (pickup.kind === 'shield') world.ship.shield = true;
  if (pickup.kind === 'rapid') world.rapidTimer = PICKUP.duration;
  if (pickup.kind === 'magnet') world.magnetTimer = PICKUP.duration;
  popup(world, pickup.x, pickup.y, pickup.kind.toUpperCase(), '#7dffa8');
  burst(world, pickup.x, pickup.y, '#7dffa8', 14, 200);
  if (audio !== null) playPickup(audio);
}

function distanceSquared(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function wrap(position, radius) {
  if (position.x < -radius) position.x = FIELD.width + radius;
  else if (position.x > FIELD.width + radius) position.x = -radius;
  if (position.y < -radius) position.y = FIELD.height + radius;
  else if (position.y > FIELD.height + radius) position.y = -radius;
}

/** Start a fresh run from the title screen. */
export function startGame(world, audio) {
  const seed = world.seed;
  const best = world.best;
  const fresh = createWorld(seed);
  fresh.best = best;
  Object.assign(world, fresh);
  world.screen = SCREEN_PLAY;
  beginWave(world, 1, audio);
}

/** One fixed step of the game. `audio` may be null (screenshot mode: silent). */
export function step(world, input, dt, audio) {
  world.time += dt;
  for (const star of world.stars) {
    star.y += star.speed * dt;
    star.twinkle += dt * 2;
    if (star.y > FIELD.height + 2) {
      star.y = -2;
      star.x = world.random() * FIELD.width;
    }
  }
  updateParticles(world, dt);
  updatePopups(world, dt);
  if (world.shake > 0) world.shake = Math.max(0, world.shake - dt * 30);
  if (world.flash > 0) world.flash = Math.max(0, world.flash - dt);

  if (world.screen === SCREEN_TITLE) {
    for (const rock of world.rocks) {
      rock.x += rock.vx * dt;
      rock.y += rock.vy * dt;
      rock.angle += rock.spin * dt;
      wrap(rock, rock.radius + 10);
    }
    if (wasPressed(input, ACTION_START) || input.mouseHeld) {
      startGame(world, audio);
    }
    return;
  }

  if (world.screen === SCREEN_PAUSE) {
    if (wasPressed(input, ACTION_PAUSE) || wasPressed(input, ACTION_START)) {
      world.screen = SCREEN_PLAY;
    }
    return;
  }

  if (world.screen === SCREEN_OVER) {
    if (wasPressed(input, ACTION_RESTART) || wasPressed(input, ACTION_START) || input.mouseHeld) {
      startGame(world, audio);
    }
    return;
  }

  // Playing.
  if (wasPressed(input, ACTION_PAUSE)) {
    world.screen = SCREEN_PAUSE;
    return;
  }
  if (world.comboTimer > 0) {
    world.comboTimer -= dt;
    if (world.comboTimer <= 0) {
      world.combo = 1;
      world.comboCount = 0;
    }
  }
  if (world.rapidTimer > 0) world.rapidTimer -= dt;
  if (world.magnetTimer > 0) world.magnetTimer -= dt;

  const ship = world.ship;
  if (ship.invulnerable > 0) ship.invulnerable -= dt;

  // Steering: thrust in the held direction, drag, then clamp the speed.
  let ax = 0;
  let ay = 0;
  if (isHeld(input, ACTION_LEFT)) ax -= 1;
  if (isHeld(input, ACTION_RIGHT)) ax += 1;
  if (isHeld(input, ACTION_UP)) ay -= 1;
  if (isHeld(input, ACTION_DOWN)) ay += 1;
  if (ax !== 0 || ay !== 0) {
    const length = Math.hypot(ax, ay);
    ship.vx += (ax / length) * SHIP.thrust * dt;
    ship.vy += (ay / length) * SHIP.thrust * dt;
    ship.thrusting = true;
    if (world.random() < 0.6) {
      world.particles.push({
        x: ship.x - Math.cos(ship.angle) * 14 + range(world.random, -3, 3),
        y: ship.y - Math.sin(ship.angle) * 14 + range(world.random, -3, 3),
        vx: -ship.vx * 0.1 + range(world.random, -20, 20),
        vy: -ship.vy * 0.1 + range(world.random, -20, 20),
        life: 0.35,
        maxLife: 0.35,
        size: range(world.random, 1.5, 3),
        color: '#ff9f1c',
      });
    }
  } else {
    ship.thrusting = false;
  }
  ship.vx *= Math.pow(SHIP.drag, dt * 60);
  ship.vy *= Math.pow(SHIP.drag, dt * 60);
  const speed = Math.hypot(ship.vx, ship.vy);
  if (speed > SHIP.maxSpeed) {
    ship.vx = (ship.vx / speed) * SHIP.maxSpeed;
    ship.vy = (ship.vy / speed) * SHIP.maxSpeed;
  }
  ship.x += ship.vx * dt;
  ship.y += ship.vy * dt;
  ship.x = Math.max(SHIP.radius, Math.min(FIELD.width - SHIP.radius, ship.x));
  ship.y = Math.max(SHIP.radius, Math.min(FIELD.height - SHIP.radius, ship.y));
  ship.angle = Math.atan2(input.mouseY - ship.y, input.mouseX - ship.x);

  // Firing: hold mouse or Space.
  ship.fireCooldown -= dt;
  const firing = input.mouseHeld || isHeld(input, ACTION_FIRE);
  if (firing && ship.fireCooldown <= 0) {
    ship.fireCooldown = world.rapidTimer > 0 ? SHIP.rapidFireInterval : SHIP.fireInterval;
    const muzzleX = ship.x + Math.cos(ship.angle) * 22;
    const muzzleY = ship.y + Math.sin(ship.angle) * 22;
    world.bullets.push({
      x: muzzleX,
      y: muzzleY,
      vx: Math.cos(ship.angle) * SHIP.bulletSpeed + ship.vx * 0.4,
      vy: Math.sin(ship.angle) * SHIP.bulletSpeed + ship.vy * 0.4,
      life: 0.9,
    });
    burst(world, muzzleX, muzzleY, '#ffe066', 2, 60);
    if (audio !== null) playShoot(audio);
  }

  // Waves: banner, then trickle the queue in, then wait for the field to clear.
  if (world.wavePhase === 'banner') {
    world.bannerTimer -= dt;
    if (world.bannerTimer <= 0) world.wavePhase = 'spawning';
  } else if (world.wavePhase === 'spawning') {
    world.spawnTimer -= dt;
    if (world.spawnTimer <= 0 && world.spawnQueue.length > 0) {
      spawnNext(world);
      world.spawnTimer = WAVE.spawnInterval;
    }
    if (world.spawnQueue.length === 0) world.wavePhase = 'fighting';
  } else if (world.wavePhase === 'fighting') {
    if (world.rocks.length === 0 && world.chasers.length === 0) {
      world.score += WAVE.clearBonus;
      popup(world, FIELD.width / 2, FIELD.height / 2 - 60, `WAVE CLEAR +${WAVE.clearBonus}`, '#7dffa8');
      beginWave(world, world.wave + 1, audio);
    }
  }

  updateBullets(world, dt, audio);
  updateRocks(world, dt);
  updateChasers(world, dt);
  updateShards(world, dt, audio);
  updatePickups(world, dt, audio);
  collideShip(world, audio);
}

function updateParticles(world, dt) {
  for (let index = world.particles.length - 1; index >= 0; index -= 1) {
    const particle = world.particles[index];
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= 0.98;
    particle.vy *= 0.98;
    particle.life -= dt;
    if (particle.life <= 0) world.particles.splice(index, 1);
  }
}

function updatePopups(world, dt) {
  for (let index = world.popups.length - 1; index >= 0; index -= 1) {
    const popupItem = world.popups[index];
    popupItem.y -= 34 * dt;
    popupItem.life -= dt;
    if (popupItem.life <= 0) world.popups.splice(index, 1);
  }
}

function updateBullets(world, dt, audio) {
  for (let index = world.bullets.length - 1; index >= 0; index -= 1) {
    const bullet = world.bullets[index];
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;
    let dead = bullet.life <= 0;
    dead = dead || bullet.x < -20 || bullet.x > FIELD.width + 20 || bullet.y < -20 || bullet.y > FIELD.height + 20;
    if (!dead) {
      for (let rockIndex = world.rocks.length - 1; rockIndex >= 0; rockIndex -= 1) {
        const rock = world.rocks[rockIndex];
        if (distanceSquared(bullet, rock) < rock.radius * rock.radius) {
          destroyRock(world, rockIndex, audio);
          dead = true;
          break;
        }
      }
    }
    if (!dead) {
      for (let chaserIndex = world.chasers.length - 1; chaserIndex >= 0; chaserIndex -= 1) {
        const chaser = world.chasers[chaserIndex];
        if (distanceSquared(bullet, chaser) < (chaser.radius + 4) * (chaser.radius + 4)) {
          world.chasers.splice(chaserIndex, 1);
          world.score += Math.round(CHASER.score * world.combo);
          popup(world, chaser.x, chaser.y, `+${Math.round(CHASER.score * world.combo)}`, '#ff5d8f');
          burst(world, chaser.x, chaser.y, '#ff5d8f', 20, 280);
          if (audio !== null) playExplosion(audio, false);
          dead = true;
          break;
        }
      }
    }
    if (dead) world.bullets.splice(index, 1);
  }
}

function updateRocks(world, dt) {
  for (const rock of world.rocks) {
    rock.x += rock.vx * dt;
    rock.y += rock.vy * dt;
    rock.angle += rock.spin * dt;
    wrap(rock, rock.radius + 10);
  }
}

function updateChasers(world, dt) {
  const ship = world.ship;
  for (const chaser of world.chasers) {
    const wanted = Math.atan2(ship.y - chaser.y, ship.x - chaser.x);
    let difference = wanted - chaser.angle;
    while (difference > Math.PI) difference -= Math.PI * 2;
    while (difference < -Math.PI) difference += Math.PI * 2;
    const turn = Math.max(-CHASER.turnRate * dt, Math.min(CHASER.turnRate * dt, difference));
    chaser.angle += turn;
    chaser.vx = Math.cos(chaser.angle) * CHASER.speed;
    chaser.vy = Math.sin(chaser.angle) * CHASER.speed;
    chaser.x += chaser.vx * dt;
    chaser.y += chaser.vy * dt;
  }
}

function updateShards(world, dt, audio) {
  const ship = world.ship;
  for (let index = world.shards.length - 1; index >= 0; index -= 1) {
    const shard = world.shards[index];
    shard.life -= dt;
    if (shard.life <= 0) {
      world.shards.splice(index, 1);
      continue;
    }
    if (world.magnetTimer > 0) {
      const dx = ship.x - shard.x;
      const dy = ship.y - shard.y;
      const distance = Math.hypot(dx, dy);
      if (distance < SHARD.magnetRadius && distance > 1) {
        shard.vx += (dx / distance) * 900 * dt;
        shard.vy += (dy / distance) * 900 * dt;
      }
    }
    shard.x += shard.vx * dt;
    shard.y += shard.vy * dt;
    shard.vx *= 0.995;
    shard.vy *= 0.995;
    wrap(shard, 20);
    if (distanceSquared(shard, ship) < SHARD.collectRadius * SHARD.collectRadius) {
      collectShard(world, index, audio);
    }
  }
}

function updatePickups(world, dt, audio) {
  const ship = world.ship;
  for (let index = world.pickups.length - 1; index >= 0; index -= 1) {
    const pickupItem = world.pickups[index];
    pickupItem.life -= dt;
    if (pickupItem.life <= 0) {
      world.pickups.splice(index, 1);
      continue;
    }
    if (distanceSquared(pickupItem, ship) < (PICKUP.radius + SHIP.radius) * (PICKUP.radius + SHIP.radius)) {
      applyPickup(world, index, audio);
    }
  }
}

function collideShip(world, audio) {
  const ship = world.ship;
  if (ship.invulnerable > 0) return;
  for (const rock of world.rocks) {
    if (distanceSquared(ship, rock) < (rock.radius + SHIP.radius - 6) * (rock.radius + SHIP.radius - 6)) {
      hitShip(world, audio);
      return;
    }
  }
  for (const chaser of world.chasers) {
    if (distanceSquared(ship, chaser) < (chaser.radius + SHIP.radius - 4) * (chaser.radius + SHIP.radius - 4)) {
      hitShip(world, audio);
      return;
    }
  }
}

// The screenshot scenes behind ?shot=start|play|intense|end. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, steered by a
// simple autopilot (aim at the nearest rock and fire, drift away from danger,
// chase the nearest shard), so the frame is what a short game really looks like
// and the same seed always gives the same frame.

import { FIELD, STEP } from './config.js';
import { makeInput, press, release } from './input.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, startGame, step } from './world.js';

const START_SECONDS = 4;
const PLAY_SECONDS = 18;
const INTENSE_SECONDS = 55;
const END_LIMIT_SECONDS = 150;
const DANGER_RADIUS = 150;
const SHARD_CHASE_RADIUS = 420;

/** The nearest rock or chaser to the ship, or null when the field is empty. */
function nearestThreat(world) {
  const ship = world.ship;
  let best = null;
  let bestDistance = Infinity;
  for (const rock of world.rocks) {
    const distance = Math.hypot(rock.x - ship.x, rock.y - ship.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = rock;
    }
  }
  for (const chaser of world.chasers) {
    const distance = Math.hypot(chaser.x - ship.x, chaser.y - ship.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = chaser;
    }
  }
  return { target: best, distance: bestDistance };
}

function nearestShard(world) {
  const ship = world.ship;
  let best = null;
  let bestDistance = Infinity;
  for (const shard of world.shards) {
    const distance = Math.hypot(shard.x - ship.x, shard.y - ship.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = shard;
    }
  }
  return { target: best, distance: bestDistance };
}

/**
 * Steer the ship for one step: `skill` 1 aims and fires and dodges, 0 wanders
 * without firing (the end scene's hurried player). The input object is reused.
 */
function autopilot(world, input, skill) {
  const ship = world.ship;
  const threat = nearestThreat(world);
  const shard = nearestShard(world);
  let moveX = 0;
  let moveY = 0;
  if (skill > 0) {
    if (threat.target !== null && threat.distance < DANGER_RADIUS) {
      moveX = ship.x - threat.target.x;
      moveY = ship.y - threat.target.y;
    } else if (shard.target !== null && shard.distance < SHARD_CHASE_RADIUS) {
      moveX = shard.target.x - ship.x;
      moveY = shard.target.y - ship.y;
    } else {
      moveX = FIELD.width / 2 - ship.x;
      moveY = FIELD.height / 2 - ship.y;
    }
    const length = Math.hypot(moveX, moveY) || 1;
    moveX /= length;
    moveY /= length;
    if (threat.target !== null) {
      // Lead the target: aim where it will be when the bullet gets there,
      // using its velocity and the bullet speed.
      const bulletSpeed = 720;
      const distance = Math.max(1, threat.distance);
      const flight = distance / bulletSpeed;
      const vx = threat.target.vx ?? 0;
      const vy = threat.target.vy ?? 0;
      input.mouseX = threat.target.x + vx * flight;
      input.mouseY = threat.target.y + vy * flight;
    }
    input.mouseHeld = threat.target !== null && threat.distance < 520;
  } else {
    // The hurried player: fires for a while to build a score, then stops
    // shooting and drifts straight into danger, as a panicked player does.
    const playTime = world.time - (world._endStart ?? (world._endStart = world.time));
    if (playTime < 25) {
      if (threat.target !== null) {
        input.mouseX = threat.target.x;
        input.mouseY = threat.target.y;
      }
      input.mouseHeld = threat.target !== null && threat.distance < 420;
      moveX = Math.sin(world.time * 0.7);
      moveY = Math.cos(world.time * 0.5);
    } else {
      input.mouseHeld = false;
      if (threat.target !== null) {
        moveX = threat.target.x - ship.x;
        moveY = threat.target.y - ship.y;
      } else {
        moveX = 0;
        moveY = 1;
      }
      const length = Math.hypot(moveX, moveY) || 1;
      moveX /= length;
      moveY /= length;
    }
  }
  const actions = ['left', 'right', 'up', 'down'];
  for (const action of actions) release(input, action);
  if (moveX < -0.3) press(input, 'left');
  if (moveX > 0.3) press(input, 'right');
  if (moveY < -0.3) press(input, 'up');
  if (moveY > 0.3) press(input, 'down');
}

/**
 * Set `world` to the named scene (start, play, intense or end; any other name is
 * start) and return the screen to draw over it.
 */
export function stageShot(name, world) {
  const input = makeInput();
  if (name !== 'play' && name !== 'intense' && name !== 'end') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) {
      step(world, input, STEP, null);
    }
    return { screen: SCREEN_TITLE };
  }
  startGame(world, null);
  const seconds = name === 'intense' ? INTENSE_SECONDS : name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  const skill = name === 'end' ? 0 : 1;
  for (let index = 0; index < seconds / STEP; index += 1) {
    autopilot(world, input, skill);
    step(world, input, STEP, null);
    if (world.screen === SCREEN_OVER) break;
  }
  const over = world.screen === SCREEN_OVER;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY };
}

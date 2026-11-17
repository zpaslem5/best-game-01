// Everything NOVA DRIFT draws on its canvas: the nebula and starfield, the ship,
// rocks, chasers, shards, pickups, bullets, particles and floating scores, the
// HUD, and the title, pause and game-over screens. The renderer only reads the
// world — it never changes it — so a screenshot is just a render of a staged world.

import { FIELD, PALETTE, PICKUP, SHARD, SHIP } from './config.js';
import { SCREEN_OVER, SCREEN_PAUSE, SCREEN_PLAY, SCREEN_TITLE } from './world.js';

/** Fit the 1280x720 field into the canvas, letterboxed, and return the scale. */
export function fitCanvas(canvas) {
  const scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
  const offsetX = (canvas.width - FIELD.width * scale) / 2;
  const offsetY = (canvas.height - FIELD.height * scale) / 2;
  return { scale, offsetX, offsetY };
}

function drawBackground(context, world) {
  const gradient = context.createRadialGradient(960, 180, 60, 640, 360, 900);
  gradient.addColorStop(0, PALETTE.nebulaA);
  gradient.addColorStop(0.5, PALETTE.nebulaB);
  gradient.addColorStop(1, PALETTE.background);
  context.fillStyle = gradient;
  context.fillRect(0, 0, FIELD.width, FIELD.height);
  context.fillStyle = PALETTE.nebulaC;
  context.globalAlpha = 0.25;
  context.beginPath();
  context.ellipse(240, 560, 320, 130, 0.4, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.ellipse(1060, 130, 280, 110, -0.3, 0, Math.PI * 2);
  context.fill();
  context.globalAlpha = 1;
  for (const star of world.stars) {
    const twinkle = 0.5 + 0.5 * Math.sin(star.twinkle);
    context.globalAlpha = 0.35 + 0.6 * twinkle;
    context.fillStyle = '#dfeaff';
    context.fillRect(star.x, star.y, star.size, star.size);
  }
  context.globalAlpha = 1;
}

function drawRock(context, rock) {
  context.save();
  context.translate(rock.x, rock.y);
  context.rotate(rock.angle);
  context.beginPath();
  for (let index = 0; index < rock.vertices.length; index += 1) {
    const angle = (index / rock.vertices.length) * Math.PI * 2;
    const radius = rock.radius * rock.vertices[index];
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.closePath();
  context.fillStyle = PALETTE.rockDark;
  context.fill();
  context.strokeStyle = PALETTE.rock;
  context.lineWidth = 2;
  context.stroke();
  context.beginPath();
  context.arc(0, 0, rock.radius * 0.45, 0, Math.PI * 2);
  context.fillStyle = 'rgba(255,255,255,0.08)';
  context.fill();
  context.restore();
}

function drawChaser(context, chaser) {
  context.save();
  context.translate(chaser.x, chaser.y);
  context.rotate(chaser.angle);
  context.beginPath();
  context.moveTo(18, 0);
  context.lineTo(-12, -11);
  context.lineTo(-6, 0);
  context.lineTo(-12, 11);
  context.closePath();
  context.fillStyle = PALETTE.chaser;
  context.fill();
  context.strokeStyle = '#ffb3c8';
  context.lineWidth = 1.5;
  context.stroke();
  context.restore();
}

function drawShard(context, shard, time) {
  const pulse = 1 + 0.18 * Math.sin(time * 6 + shard.x);
  context.save();
  context.translate(shard.x, shard.y);
  context.rotate(time * 1.5);
  context.scale(pulse, pulse);
  context.beginPath();
  context.moveTo(0, -SHARD.radius);
  context.lineTo(SHARD.radius * 0.7, 0);
  context.lineTo(0, SHARD.radius);
  context.lineTo(-SHARD.radius * 0.7, 0);
  context.closePath();
  context.fillStyle = PALETTE.shard;
  context.fill();
  context.fillStyle = PALETTE.shardCore;
  context.beginPath();
  context.moveTo(0, -SHARD.radius * 0.45);
  context.lineTo(SHARD.radius * 0.32, 0);
  context.lineTo(0, SHARD.radius * 0.45);
  context.lineTo(-SHARD.radius * 0.32, 0);
  context.closePath();
  context.fill();
  context.restore();
}

function drawPickup(context, pickup, time) {
  const bob = Math.sin(time * 3 + pickup.x) * 3;
  const colors = { shield: PALETTE.shield, rapid: PALETTE.rapid, magnet: PALETTE.magnet };
  const labels = { shield: 'S', rapid: 'R', magnet: 'M' };
  context.save();
  context.translate(pickup.x, pickup.y + bob);
  context.beginPath();
  context.arc(0, 0, PICKUP.radius, 0, Math.PI * 2);
  context.fillStyle = 'rgba(7,11,26,0.85)';
  context.fill();
  context.strokeStyle = colors[pickup.kind];
  context.lineWidth = 2.5;
  context.stroke();
  context.fillStyle = colors[pickup.kind];
  context.font = 'bold 15px system-ui, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(labels[pickup.kind], 0, 1);
  context.restore();
}

function drawShip(context, world) {
  const ship = world.ship;
  const blink = ship.invulnerable > 0 && Math.floor(world.time * 12) % 2 === 0;
  if (blink) return;
  context.save();
  context.translate(ship.x, ship.y);
  context.rotate(ship.angle);
  if (ship.thrusting) {
    const flame = 16 + Math.random() * 10;
    context.beginPath();
    context.moveTo(-12, -6);
    context.lineTo(-12 - flame, 0);
    context.lineTo(-12, 6);
    context.closePath();
    context.fillStyle = '#ff9f1c';
    context.fill();
  }
  context.beginPath();
  context.moveTo(22, 0);
  context.lineTo(-13, -12);
  context.lineTo(-7, 0);
  context.lineTo(-13, 12);
  context.closePath();
  context.fillStyle = PALETTE.ship;
  context.fill();
  context.strokeStyle = PALETTE.shipCore;
  context.lineWidth = 2;
  context.stroke();
  context.beginPath();
  context.arc(4, 0, 4, 0, Math.PI * 2);
  context.fillStyle = PALETTE.shipCore;
  context.fill();
  context.restore();
  if (ship.shield) {
    context.save();
    context.beginPath();
    context.arc(ship.x, ship.y, SHIP.radius + 10, 0, Math.PI * 2);
    context.strokeStyle = 'rgba(93,242,255,0.7)';
    context.lineWidth = 2;
    context.stroke();
    context.restore();
  }
}

function drawHud(context, world) {
  context.save();
  context.fillStyle = PALETTE.text;
  context.textBaseline = 'top';
  context.textAlign = 'left';
  context.font = 'bold 26px system-ui, sans-serif';
  context.fillText(`SCORE ${world.score}`, 24, 18);
  context.font = '16px system-ui, sans-serif';
  context.fillStyle = PALETTE.textDim;
  context.fillText(`BEST ${Math.max(world.best, world.score)}`, 24, 50);
  context.textAlign = 'center';
  context.font = 'bold 20px system-ui, sans-serif';
  context.fillStyle = PALETTE.text;
  context.fillText(`WAVE ${Math.max(world.wave, 1)}`, FIELD.width / 2, 18);
  if (world.combo > 1) {
    context.font = 'bold 22px system-ui, sans-serif';
    context.fillStyle = PALETTE.shard;
    context.fillText(`COMBO x${world.combo.toFixed(2)}`, FIELD.width / 2, 46);
  }
  context.textAlign = 'right';
  context.font = 'bold 22px system-ui, sans-serif';
  context.fillStyle = PALETTE.danger;
  let hearts = '';
  for (let index = 0; index < world.lives; index += 1) hearts += '♥ ';
  context.fillText(hearts.trim(), FIELD.width - 24, 18);
  context.font = '15px system-ui, sans-serif';
  context.fillStyle = PALETTE.textDim;
  const effects = [];
  if (world.ship.shield) effects.push('SHIELD');
  if (world.rapidTimer > 0) effects.push(`RAPID ${Math.ceil(world.rapidTimer)}s`);
  if (world.magnetTimer > 0) effects.push(`MAGNET ${Math.ceil(world.magnetTimer)}s`);
  if (effects.length > 0) {
    context.fillStyle = PALETTE.good;
    context.fillText(effects.join('   '), FIELD.width - 24, 50);
  }
  if (world.wavePhase === 'banner' && world.screen === SCREEN_PLAY) {
    context.textAlign = 'center';
    context.font = 'bold 44px system-ui, sans-serif';
    context.fillStyle = PALETTE.text;
    context.fillText(`WAVE ${world.wave}`, FIELD.width / 2, FIELD.height / 2 - 90);
  }
  context.restore();
}

function drawCentered(context, y, lines) {
  context.save();
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  for (const line of lines) {
    context.font = line.font;
    context.fillStyle = line.color;
    context.fillText(line.text, FIELD.width / 2, y + line.dy);
  }
  context.restore();
}

function drawTitle(context, world) {
  context.save();
  context.fillStyle = 'rgba(7,11,26,0.55)';
  context.fillRect(0, 0, FIELD.width, FIELD.height);
  drawCentered(context, 0, [
    { text: 'NOVA DRIFT', font: 'bold 84px system-ui, sans-serif', color: PALETTE.ship, dy: 200 },
    { text: 'Blast the rocks. Gather the shards. Ride the combo.', font: '24px system-ui, sans-serif', color: PALETTE.text, dy: 268 },
    { text: 'WASD / Arrows — fly     Mouse — aim     Hold click / Space — fire', font: '20px system-ui, sans-serif', color: PALETTE.textDim, dy: 330 },
    { text: 'P — pause     M — mute     R — restart', font: '20px system-ui, sans-serif', color: PALETTE.textDim, dy: 362 },
    { text: '▶  CLICK OR PRESS ENTER TO LAUNCH', font: 'bold 26px system-ui, sans-serif', color: PALETTE.good, dy: 440 },
    { text: `BEST ${world.best}`, font: '20px system-ui, sans-serif', color: PALETTE.textDim, dy: 490 },
  ]);
  context.restore();
}

function drawPause(context) {
  context.save();
  context.fillStyle = 'rgba(7,11,26,0.6)';
  context.fillRect(0, 0, FIELD.width, FIELD.height);
  drawCentered(context, 0, [
    { text: 'PAUSED', font: 'bold 64px system-ui, sans-serif', color: PALETTE.text, dy: 340 },
    { text: 'Press P or Enter to keep flying', font: '22px system-ui, sans-serif', color: PALETTE.textDim, dy: 400 },
  ]);
  context.restore();
}

function drawOver(context, world) {
  context.save();
  context.fillStyle = 'rgba(7,11,26,0.62)';
  context.fillRect(0, 0, FIELD.width, FIELD.height);
  const isBest = world.score >= world.best && world.score > 0;
  drawCentered(context, 0, [
    { text: 'MISSION OVER', font: 'bold 64px system-ui, sans-serif', color: PALETTE.danger, dy: 210 },
    { text: `SCORE  ${world.score}`, font: 'bold 40px system-ui, sans-serif', color: PALETTE.text, dy: 290 },
    { text: isBest ? '★ NEW BEST ★' : `BEST  ${world.best}`, font: '24px system-ui, sans-serif', color: PALETTE.shard, dy: 340 },
    { text: `WAVE ${world.wave}  ·  SHARDS BANKED`, font: '20px system-ui, sans-serif', color: PALETTE.textDim, dy: 380 },
    { text: '▶  PRESS R OR CLICK TO FLY AGAIN', font: 'bold 26px system-ui, sans-serif', color: PALETTE.good, dy: 450 },
  ]);
  context.restore();
}

/** Draw the whole world onto the canvas. */
export function render(canvas, world) {
  const context = canvas.getContext('2d');
  const { scale, offsetX, offsetY } = fitCanvas(canvas);
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.fillStyle = '#04060f';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.setTransform(scale, 0, 0, scale, offsetX, offsetY);
  const shakeX = world.shake > 0 ? (Math.random() * 2 - 1) * world.shake : 0;
  const shakeY = world.shake > 0 ? (Math.random() * 2 - 1) * world.shake : 0;
  context.save();
  context.translate(shakeX, shakeY);
  drawBackground(context, world);
  for (const shard of world.shards) drawShard(context, shard, world.time);
  for (const pickup of world.pickups) drawPickup(context, pickup, world.time);
  for (const rock of world.rocks) drawRock(context, rock);
  for (const chaser of world.chasers) drawChaser(context, chaser);
  for (const bullet of world.bullets) {
    context.fillStyle = PALETTE.bullet;
    context.beginPath();
    context.arc(bullet.x, bullet.y, 4, 0, Math.PI * 2);
    context.fill();
  }
  if (world.screen !== SCREEN_TITLE) drawShip(context, world);
  for (const particle of world.particles) {
    context.globalAlpha = Math.max(0, particle.life / particle.maxLife);
    context.fillStyle = particle.color;
    context.beginPath();
    context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    context.fill();
  }
  context.globalAlpha = 1;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  for (const popupItem of world.popups) {
    context.globalAlpha = Math.max(0, popupItem.life);
    context.font = 'bold 18px system-ui, sans-serif';
    context.fillStyle = popupItem.color;
    context.fillText(popupItem.text, popupItem.x, popupItem.y);
  }
  context.globalAlpha = 1;
  if (world.screen !== SCREEN_TITLE) drawHud(context, world);
  if (world.screen === SCREEN_TITLE) drawTitle(context, world);
  if (world.screen === SCREEN_PAUSE) drawPause(context);
  if (world.screen === SCREEN_OVER) drawOver(context, world);
  context.restore();
  if (world.flash > 0) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = `rgba(255,77,109,${world.flash * 0.5})`;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
}

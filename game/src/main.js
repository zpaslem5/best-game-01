// NOVA DRIFT's entry point: the game loop, the screens, and the screenshot mode.
// In normal play the loop runs on requestAnimationFrame with a fixed-step
// accumulator, so the rules tick at 60 Hz whatever the display's rate. With
// ?shot=start|play|intense|end in the URL the game instead stages one
// deterministic scene and draws it, for the screenshots.

import { FIELD, STEP } from './config.js';
import {
  ACTION_MUTE,
  attachInput,
  endFrame,
  makeInput,
  wasPressed,
} from './input.js';
import { makeAudio, toggleMute } from './audio.js';
import { createWorld, step } from './world.js';
import { render } from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') ?? 7) || 7;

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

const world = createWorld(seed);
const input = makeInput();
const audio = makeAudio();
attachInput(input, canvas, (clientX, clientY) => {
  const rect = canvas.getBoundingClientRect();
  const scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
  const offsetX = (canvas.width - FIELD.width * scale) / 2;
  const offsetY = (canvas.height - FIELD.height * scale) / 2;
  return {
    x: (clientX - rect.left - offsetX) / scale,
    y: (clientY - rect.top - offsetY) / scale,
  };
});

function describe(world) {
  if (world.screen === 'title') return 'NOVA DRIFT title screen. Press Enter or click to launch.';
  if (world.screen === 'paused') return 'NOVA DRIFT paused.';
  if (world.screen === 'over') return `Mission over. Score ${world.score}. Press R to fly again.`;
  return `Score ${world.score}, wave ${world.wave}, ${world.lives} lives.`;
}

if (shotName !== null) {
  // Screenshot mode: stage the scene once and draw it. Nothing here listens
  // for input or advances time, so the frame is the same every run.
  stageShot(shotName, world);
  render(canvas, world);
} else {
  let last = performance.now();
  let accumulator = 0;
  function frame(now) {
    const elapsed = Math.min(0.25, (now - last) / 1000);
    last = now;
    accumulator += elapsed;
    while (accumulator >= STEP) {
      if (wasPressed(input, ACTION_MUTE)) toggleMute(audio);
      step(world, input, STEP, audio);
      endFrame(input);
      accumulator -= STEP;
    }
    render(canvas, world);
    const text = describe(world);
    if (status.textContent !== text) status.textContent = text;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

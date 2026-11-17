// Keyboard and mouse state for NOVA DRIFT. The game reads this, never the DOM
// directly: the keys are a set of logical actions (up, down, left, right, fire,
// start, restart, pause, mute) plus the mouse position in logical field
// coordinates, so the world can be stepped without a browser for screenshots.

export const ACTION_UP = 'up';
export const ACTION_DOWN = 'down';
export const ACTION_LEFT = 'left';
export const ACTION_RIGHT = 'right';
export const ACTION_FIRE = 'fire';
export const ACTION_START = 'start';
export const ACTION_RESTART = 'restart';
export const ACTION_PAUSE = 'pause';
export const ACTION_MUTE = 'mute';

const KEY_TO_ACTION = {
  ArrowUp: ACTION_UP,
  KeyW: ACTION_UP,
  ArrowDown: ACTION_DOWN,
  KeyS: ACTION_DOWN,
  ArrowLeft: ACTION_LEFT,
  KeyA: ACTION_LEFT,
  ArrowRight: ACTION_RIGHT,
  KeyD: ACTION_RIGHT,
  Space: ACTION_FIRE,
  Enter: ACTION_START,
  KeyR: ACTION_RESTART,
  KeyP: ACTION_PAUSE,
  Escape: ACTION_PAUSE,
  KeyM: ACTION_MUTE,
};

export function makeInput() {
  return {
    held: new Set(),
    pressed: new Set(),
    mouseX: 640,
    mouseY: 300,
    mouseHeld: false,
  };
}

/** Mark an action as pressed this frame (held stays true until released). */
export function press(input, action) {
  if (!input.held.has(action)) input.pressed.add(action);
  input.held.add(action);
}

export function release(input, action) {
  input.held.delete(action);
}

export function isHeld(input, action) {
  return input.held.has(action);
}

/** True only on the frame the action went down; call after the world reads it. */
export function wasPressed(input, action) {
  return input.pressed.has(action);
}

export function endFrame(input) {
  input.pressed.clear();
}

/** Wire a canvas and the window up to an input object. */
export function attachInput(input, canvas, toLogical) {
  window.addEventListener('keydown', (event) => {
    const action = KEY_TO_ACTION[event.code];
    if (action === undefined) return;
    event.preventDefault();
    press(input, action);
  });
  window.addEventListener('keyup', (event) => {
    const action = KEY_TO_ACTION[event.code];
    if (action !== undefined) release(input, action);
  });
  window.addEventListener('blur', () => {
    input.held.clear();
    input.mouseHeld = false;
  });
  canvas.addEventListener('pointermove', (event) => {
    const point = toLogical(event.clientX, event.clientY);
    input.mouseX = point.x;
    input.mouseY = point.y;
  });
  canvas.addEventListener('pointerdown', (event) => {
    const point = toLogical(event.clientX, event.clientY);
    input.mouseX = point.x;
    input.mouseY = point.y;
    input.mouseHeld = true;
    event.preventDefault();
  });
  window.addEventListener('pointerup', () => {
    input.mouseHeld = false;
  });
}

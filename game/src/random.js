// A small seeded random number generator (mulberry32) so the game can be played
// the same way twice: the screenshot scenes and the real game both draw from it,
// and a seed in the URL reproduces a frame exactly.

export function makeRandom(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** A float in [min, max). */
export function range(random, min, max) {
  return min + random() * (max - min);
}

/** An integer in [min, max]. */
export function rangeInt(random, min, max) {
  return min + Math.floor(random() * (max - min + 1));
}

/** One element of `items`, picked at random. */
export function pick(random, items) {
  return items[Math.floor(random() * items.length)];
}

/** An angle in radians, uniform over the full circle. */
export function angle(random) {
  return random() * Math.PI * 2;
}

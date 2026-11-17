// Synthesised sound effects for NOVA DRIFT, made with the Web Audio API only:
// no audio files, nothing loaded over the network. Every sound is a short
// oscillator or noise burst shaped by a gain envelope. The context is created
// lazily on the first user gesture (browsers block audio before one), and the
// mute flag survives across games.

export function makeAudio() {
  return { context: null, muted: false, master: null };
}

function ensure(audio) {
  if (audio.context !== null) {
    if (audio.context.state === 'suspended') audio.context.resume();
    return audio.context;
  }
  const Context = window.AudioContext ?? window.webkitAudioContext;
  if (Context === undefined) return null;
  audio.context = new Context();
  audio.master = audio.context.createGain();
  audio.master.gain.value = 0.5;
  audio.master.connect(audio.context.destination);
  return audio.context;
}

/** A tone that slides from `fromHz` to `toHz` over `seconds`. */
function tone(audio, fromHz, toHz, seconds, type, volume) {
  const context = ensure(audio);
  if (context === null || audio.muted) return;
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(fromHz, now);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, toHz), now + seconds);
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + seconds);
  oscillator.connect(gain);
  gain.connect(audio.master);
  oscillator.start(now);
  oscillator.stop(now + seconds + 0.02);
}

/** A burst of filtered noise, for explosions and hits. */
function noise(audio, seconds, volume, lowHz) {
  const context = ensure(audio);
  if (context === null || audio.muted) return;
  const now = context.currentTime;
  const length = Math.floor(context.sampleRate * seconds);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < length; index += 1) {
    data[index] = (Math.random() * 2 - 1) * (1 - index / length);
  }
  const source = context.createBufferSource();
  source.buffer = buffer;
  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = lowHz;
  const gain = context.createGain();
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + seconds);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(audio.master);
  source.start(now);
}

export function playShoot(audio) {
  tone(audio, 880, 320, 0.08, 'square', 0.12);
}

export function playExplosion(audio, big) {
  noise(audio, big ? 0.5 : 0.25, big ? 0.5 : 0.3, big ? 900 : 1400);
  tone(audio, big ? 160 : 220, 40, big ? 0.45 : 0.25, 'sawtooth', 0.25);
}

export function playShard(audio, combo) {
  const base = 660 * (1 + Math.min(combo, 8) * 0.06);
  tone(audio, base, base * 1.5, 0.12, 'sine', 0.2);
}

export function playPickup(audio) {
  tone(audio, 523, 523, 0.09, 'sine', 0.2);
  window.setTimeout(() => tone(audio, 784, 784, 0.12, 'sine', 0.2), 70);
}

export function playHit(audio) {
  noise(audio, 0.3, 0.4, 700);
  tone(audio, 140, 50, 0.3, 'sawtooth', 0.3);
}

export function playWave(audio) {
  tone(audio, 220, 440, 0.25, 'triangle', 0.25);
  window.setTimeout(() => tone(audio, 330, 660, 0.25, 'triangle', 0.25), 120);
}

export function playGameOver(audio) {
  tone(audio, 392, 392, 0.2, 'triangle', 0.25);
  window.setTimeout(() => tone(audio, 311, 311, 0.2, 'triangle', 0.25), 180);
  window.setTimeout(() => tone(audio, 233, 180, 0.4, 'triangle', 0.25), 360);
}

export function toggleMute(audio) {
  audio.muted = !audio.muted;
  return audio.muted;
}

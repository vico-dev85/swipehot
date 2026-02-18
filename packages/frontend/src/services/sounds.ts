/**
 * UI Sound Effects — Web Audio API (no files needed)
 * Subtle feedback sounds to make the app feel alive.
 * All sounds are very quiet and short.
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return null;
    }
  }
  // Resume if suspended (browser autoplay policy)
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

/** Soft whoosh — swipe/next */
export function playSwipe(): void {
  const c = getCtx();
  if (!c) return;
  const duration = 0.15;
  const now = c.currentTime;

  // Filtered noise sweep
  const bufferSize = c.sampleRate * duration;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize); // fade out
  }

  const source = c.createBufferSource();
  source.buffer = buffer;

  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(2000, now);
  filter.frequency.exponentialRampToValueAtTime(400, now + duration);
  filter.Q.value = 1;

  const gain = c.createGain();
  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  source.connect(filter).connect(gain).connect(c.destination);
  source.start(now);
  source.stop(now + duration);
}

/** Satisfying pop — like/heart */
export function playLike(): void {
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;

  const osc = c.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(880, now);
  osc.frequency.exponentialRampToValueAtTime(1320, now + 0.06);
  osc.frequency.exponentialRampToValueAtTime(1100, now + 0.12);

  const gain = c.createGain();
  gain.gain.setValueAtTime(0.1, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

  osc.connect(gain).connect(c.destination);
  osc.start(now);
  osc.stop(now + 0.2);
}

/** Soft click — button press */
export function playClick(): void {
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;

  const osc = c.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(600, now);
  osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);

  const gain = c.createGain();
  gain.gain.setValueAtTime(0.06, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

  osc.connect(gain).connect(c.destination);
  osc.start(now);
  osc.stop(now + 0.06);
}

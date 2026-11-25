// Every sound is made here with WebAudio, nothing loaded: knife thunks, pot splashes, the
// grill's sizzle bed, the done ding, the order-up bell, burn alarms, the rush fanfare and a
// soft pentatonic night-market tune.

const PENTATONIC = [0, 2, 4, 7, 9];
const TUNE = [0, 2, 4, 2, 7, 4, 2, 0, 9, 7, 4, 2, 4, 7, 4, -1];

export function createAudio() {
  return { context: null, master: null, music: null, sizzle: null, muted: false, beat: 0, nextBeat: 0, rush: false };
}

/** Start the audio graph on the first key or click (browsers require a gesture). */
export function unlockAudio(audio) {
  if (audio.context) {
    if (audio.context.state === 'suspended') audio.context.resume();
    return;
  }
  const Context = window.AudioContext || window.webkitAudioContext;
  if (!Context) return;
  const context = new Context();
  audio.context = context;
  audio.master = context.createGain();
  audio.master.gain.value = audio.muted ? 0 : 0.6;
  audio.master.connect(context.destination);
  audio.music = context.createGain();
  audio.music.gain.value = 0.12;
  audio.music.connect(audio.master);
  audio.sizzle = startSizzleBed(audio);
  audio.nextBeat = context.currentTime + 0.2;
}

function noiseBuffer(context, seconds) {
  const buffer = context.createBuffer(1, Math.floor(context.sampleRate * seconds), context.sampleRate);
  const data = buffer.getChannelData(0);
  let seed = 12345;
  for (let i = 0; i < data.length; i += 1) {
    seed = (seed * 16807) % 2147483647;
    data[i] = (seed / 2147483647) * 2 - 1;
  }
  return buffer;
}

/** A looping band of filtered noise whose level follows how much is on the grill. */
function startSizzleBed(audio) {
  const context = audio.context;
  const source = context.createBufferSource();
  source.buffer = noiseBuffer(context, 2);
  source.loop = true;
  const filter = context.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 3200;
  const gain = context.createGain();
  gain.gain.value = 0;
  source.connect(filter).connect(gain).connect(audio.master);
  source.start();
  return gain;
}

/** Set the grill sizzle (0 = nothing cooking) and whether the rush tempo is on. */
export function setKitchenSound(audio, grillCount, rush) {
  audio.rush = rush;
  if (!audio.sizzle) return;
  audio.sizzle.gain.setTargetAtTime(Math.min(0.12, grillCount * 0.04), audio.context.currentTime, 0.2);
}

export function toggleMute(audio) {
  audio.muted = !audio.muted;
  if (audio.master) audio.master.gain.setTargetAtTime(audio.muted ? 0 : 0.6, audio.context.currentTime, 0.05);
  return audio.muted;
}

function tone(audio, frequency, start, length, type = 'sine', volume = 0.3, target = audio.master, slideTo = 0) {
  const context = audio.context;
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + length);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
  osc.connect(gain).connect(target);
  osc.start(start);
  osc.stop(start + length + 0.05);
}

function noise(audio, start, length, frequency, volume, type = 'bandpass') {
  const context = audio.context;
  const source = context.createBufferSource();
  source.buffer = audio.shortNoise ?? (audio.shortNoise = noiseBuffer(context, 0.5));
  const filter = context.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = frequency;
  const gain = context.createGain();
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
  source.connect(filter).connect(gain).connect(audio.master);
  source.start(start);
  source.stop(start + length + 0.05);
}

/** The sound for one kitchen event, if it has one. */
export function playEvent(audio, event) {
  if (!audio.context || audio.muted) return;
  const now = audio.context.currentTime;
  switch (event.type) {
    case 'chop':
      noise(audio, now, 0.06, 2400, 0.5);
      tone(audio, 180, now, 0.08, 'triangle', 0.3);
      break;
    case 'chopDone':
      noise(audio, now, 0.06, 2600, 0.5);
      tone(audio, 660, now + 0.05, 0.12, 'triangle', 0.15);
      tone(audio, 880, now + 0.12, 0.16, 'triangle', 0.15);
      break;
    case 'splash':
      noise(audio, now, 0.35, 900, 0.4, 'lowpass');
      break;
    case 'sizzle':
      noise(audio, now, 0.5, 4500, 0.35, 'highpass');
      break;
    case 'pick':
    case 'ladle':
    case 'scoop':
      tone(audio, 520, now, 0.07, 'sine', 0.15, audio.master, 700);
      break;
    case 'drop':
      tone(audio, 420, now, 0.08, 'sine', 0.15, audio.master, 300);
      break;
    case 'plate':
      tone(audio, event.ready ? 784 : 587, now, 0.12, 'triangle', 0.2);
      if (event.ready) tone(audio, 1175, now + 0.08, 0.2, 'triangle', 0.18);
      break;
    case 'done':
      tone(audio, 1318, now, 0.5, 'sine', 0.25);
      tone(audio, 1975, now, 0.35, 'sine', 0.08);
      break;
    case 'warn':
      tone(audio, 880, now, 0.1, 'square', 0.08);
      tone(audio, 880, now + 0.16, 0.1, 'square', 0.08);
      break;
    case 'burn':
      noise(audio, now, 0.6, 600, 0.4, 'lowpass');
      tone(audio, 220, now, 0.4, 'sawtooth', 0.12, audio.master, 110);
      break;
    case 'refuse':
      tone(audio, 160, now, 0.14, 'square', 0.08);
      break;
    case 'serve':
      tone(audio, 1568, now, 0.9, 'sine', 0.3);
      tone(audio, 2349, now, 0.6, 'sine', 0.1);
      [0, 4, 7, 12].forEach((step, i) => tone(audio, 523 * 2 ** ((step + Math.min(event.combo, 6)) / 12), now + 0.08 + i * 0.06, 0.18, 'triangle', 0.14));
      break;
    case 'missed':
      tone(audio, 330, now, 0.25, 'triangle', 0.18, audio.master, 196);
      break;
    case 'trash':
      noise(audio, now, 0.2, 400, 0.4, 'lowpass');
      break;
    case 'ticket':
      tone(audio, event.critic ? 988 : 740, now, 0.08, 'square', 0.06);
      tone(audio, event.critic ? 1318 : 988, now + 0.07, 0.1, 'square', 0.06);
      break;
    case 'tick':
      tone(audio, event.seconds <= 5 ? 1046 : 784, now, 0.06, 'square', 0.07);
      break;
    case 'rushStart':
      [0, 4, 7, 12, 16].forEach((step, i) => tone(audio, 392 * 2 ** (step / 12), now + i * 0.09, 0.3, 'sawtooth', 0.09));
      noise(audio, now, 0.5, 3000, 0.2);
      break;
    case 'tutorialDone':
    case 'shiftOver':
      [0, 7, 12].forEach((step, i) => tone(audio, 523 * 2 ** (step / 12), now + i * 0.12, 0.5, 'triangle', 0.15));
      break;
    default:
      break;
  }
}

/** Schedule the next notes of the stall's tune; quicker and brighter during a rush. */
export function stepMusic(audio, playing) {
  if (!audio.context || !playing) return;
  const context = audio.context;
  const beat = audio.rush ? 0.2 : 0.3;
  while (audio.nextBeat < context.currentTime + 0.25) {
    const note = TUNE[audio.beat % TUNE.length];
    if (note >= 0) {
      const octave = audio.rush && audio.beat % 2 ? 12 : 0;
      tone(audio, 392 * 2 ** ((note + octave) / 12), audio.nextBeat, beat * 1.6, 'triangle', 0.5, audio.music);
    }
    if (audio.beat % 4 === 0) tone(audio, 98 * 2 ** (PENTATONIC[(audio.beat / 4) % 5] / 12), audio.nextBeat, beat * 3, 'sine', 0.6, audio.music);
    audio.beat += 1;
    audio.nextBeat += beat;
  }
}

/** Keep the music clock from piling up notes after a pause. */
export function resyncMusic(audio) {
  if (audio.context) audio.nextBeat = audio.context.currentTime + 0.1;
}

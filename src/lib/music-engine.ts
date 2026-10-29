export type GenreId = "lofi" | "ambiente" | "cinema" | "eletronico" | "piano";

export type MusicSettings = {
  genre: GenreId;
  bpm: number;
  seconds: number;
  root: "C" | "D" | "E" | "F" | "G" | "A";
  energy: number;
  brightness: number;
  seed: number;
};

const ROOTS: Record<MusicSettings["root"], number> = {
  C: 60,
  D: 62,
  E: 64,
  F: 65,
  G: 67,
  A: 69,
};

const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
};

const GENRES: Record<
  GenreId,
  {
    scale: keyof typeof SCALES;
    prog: number[];
    drums: "none" | "soft" | "four" | "hits";
    lead: OscillatorType;
    pad: OscillatorType;
    swing: boolean;
  }
> = {
  lofi: { scale: "minor", prog: [0, 5, 3, 6], drums: "soft", lead: "triangle", pad: "sine", swing: true },
  ambiente: { scale: "major", prog: [0, 4, 5, 3], drums: "none", lead: "sine", pad: "sine", swing: false },
  cinema: { scale: "minor", prog: [0, 5, 3, 4], drums: "hits", lead: "triangle", pad: "sawtooth", swing: false },
  eletronico: { scale: "minor", prog: [0, 5, 6, 4], drums: "four", lead: "square", pad: "square", swing: false },
  piano: { scale: "major", prog: [0, 5, 3, 4], drums: "none", lead: "triangle", pad: "triangle", swing: false },
};

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function midiToFreq(midi: number) {
  return 440 * 2 ** ((midi - 69) / 12);
}

function degree(root: number, scale: number[], step: number) {
  const oct = Math.floor(step / scale.length);
  const index = ((step % scale.length) + scale.length) % scale.length;
  return root + scale[index] + oct * 12;
}

function tone(
  ctx: OfflineAudioContext,
  dest: AudioNode,
  send: AudioNode,
  time: number,
  duration: number,
  freq: number,
  gain: number,
  type: OscillatorType,
  brightness: number,
) {
  if (duration <= 0.03 || time < 0) return;
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(Math.max(40, freq), time);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(420 + brightness * 48, time);
  filter.Q.value = 0.7;
  amp.gain.setValueAtTime(0.0001, time);
  amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), time + Math.min(0.05, duration * 0.25));
  amp.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  osc.connect(filter);
  filter.connect(amp);
  amp.connect(dest);
  amp.connect(send);
  osc.start(time);
  osc.stop(time + duration + 0.03);
}

function noiseBuffer(ctx: BaseAudioContext, seconds: number) {
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function drum(
  ctx: OfflineAudioContext,
  dest: AudioNode,
  time: number,
  kind: "kick" | "snare" | "hat",
  gain: number,
) {
  if (kind === "kick") {
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(46, time + 0.12);
    amp.gain.setValueAtTime(gain, time);
    amp.gain.exponentialRampToValueAtTime(0.001, time + 0.22);
    osc.connect(amp);
    amp.connect(dest);
    osc.start(time);
    osc.stop(time + 0.24);
    return;
  }
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, kind === "hat" ? 0.05 : 0.18);
  const filter = ctx.createBiquadFilter();
  filter.type = kind === "hat" ? "highpass" : "bandpass";
  filter.frequency.value = kind === "hat" ? 7000 : 1800;
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(gain, time);
  amp.gain.exponentialRampToValueAtTime(0.001, time + (kind === "hat" ? 0.04 : 0.16));
  src.connect(filter);
  filter.connect(amp);
  amp.connect(dest);
  src.start(time);
  src.stop(time + 0.2);
}

export async function renderTrack(settings: MusicSettings): Promise<AudioBuffer> {
  const genre = GENRES[settings.genre];
  const seconds = Math.min(60, Math.max(8, settings.seconds));
  const bpm = Math.min(150, Math.max(60, settings.bpm));
  const sampleRate = 44100;
  const ctx = new OfflineAudioContext(2, Math.floor(sampleRate * seconds), sampleRate);
  const master = ctx.createGain();
  master.gain.value = 0.85;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -12;
  comp.knee.value = 16;
  comp.ratio.value = 3.2;
  comp.attack.value = 0.008;
  comp.release.value = 0.22;
  const delay = ctx.createDelay();
  delay.delayTime.value = genre.drums === "four" ? 0.16 : 0.26;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.2;
  const wet = ctx.createGain();
  wet.gain.value = 0.16;
  delay.connect(feedback);
  feedback.connect(delay);
  delay.connect(wet);
  wet.connect(master);
  master.connect(comp);
  comp.connect(ctx.destination);

  const rand = mulberry32(settings.seed || 1);
  const scale = SCALES[genre.scale];
  const root = ROOTS[settings.root];
  const beat = 60 / bpm;
  const bar = beat * 4;
  const bars = Math.floor(seconds / bar);
  const energy = Math.min(100, Math.max(0, settings.energy)) / 100;
  const brightness = Math.min(100, Math.max(0, settings.brightness));
  let walk = 7;

  for (let barIndex = 0; barIndex < bars; barIndex += 1) {
    const start = barIndex * bar;
    const chordDegree = genre.prog[barIndex % genre.prog.length];
    const chord = [0, 2, 4].map((offset) => degree(root, scale, chordDegree + offset));
    const padGain = 0.035 + energy * 0.04;
    for (const note of chord) {
      tone(ctx, master, delay, start, bar * 0.96, midiToFreq(note), padGain, genre.pad, brightness);
      if (settings.genre === "piano" || settings.genre === "ambiente") {
        tone(
          ctx,
          master,
          delay,
          start + 0.012,
          bar * 0.9,
          midiToFreq(note),
          padGain * 0.45,
          "sine",
          brightness,
        );
      }
    }
    if (genre.drums !== "none" || settings.genre === "cinema") {
      tone(ctx, master, delay, start, beat * 1.6, midiToFreq(chord[0] - 24), 0.09 + energy * 0.05, "sine", 20);
    }

    for (let step = 0; step < 8; step += 1) {
      let when = start + step * (bar / 8);
      if (genre.swing && step % 2 === 1) when += bar / 8 * 0.18;
      const beatIndex = Math.floor(step / 2);
      if (genre.drums === "four") {
        if (step % 2 === 0) drum(ctx, master, when, "kick", 0.55);
        if (beatIndex === 1 || beatIndex === 3) {
          if (step % 2 === 0) drum(ctx, master, when, "snare", 0.28);
        }
        drum(ctx, master, when, "hat", 0.08 + energy * 0.05);
      } else if (genre.drums === "soft") {
        if (step === 0 || step === 4) drum(ctx, master, when, "kick", 0.32);
        if (step === 2 || step === 6) drum(ctx, master, when, "snare", 0.12);
        if (step % 2 === 0) drum(ctx, master, when, "hat", 0.05);
      } else if (genre.drums === "hits" && step === 0 && barIndex % 2 === 0) {
        drum(ctx, master, when, "kick", 0.7);
        drum(ctx, master, when, "snare", 0.2);
      }

      const rest = 0.62 - energy * 0.35;
      if (rand() < rest) continue;
      walk += rand() > 0.5 ? 1 : -1;
      if (rand() > 0.82) walk += rand() > 0.5 ? 2 : -2;
      walk = Math.min(12, Math.max(3, walk));
      const note = degree(root, scale, walk);
      const leap = settings.genre === "eletronico" ? 12 : 0;
      tone(
        ctx,
        master,
        delay,
        when,
        (bar / 8) * (0.7 + rand() * 0.5),
        midiToFreq(note + leap),
        0.05 + energy * 0.06,
        genre.lead,
        brightness,
      );
    }
  }

  return ctx.startRendering();
}

export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const channels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const samples = buffer.length;
  const block = channels * 2;
  const dataSize = samples * block;
  const array = new ArrayBuffer(44 + dataSize);
  const view = new DataView(array);
  const write = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * block, true);
  view.setUint16(32, block, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, dataSize, true);
  const data = Array.from({ length: channels }, (_, index) => buffer.getChannelData(index));
  let offset = 44;
  for (let i = 0; i < samples; i += 1) {
    for (let channel = 0; channel < channels; channel += 1) {
      const sample = Math.max(-1, Math.min(1, data[channel][i] ?? 0));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([array], { type: "audio/wav" });
}

export async function audioBufferToMp3(buffer: AudioBuffer): Promise<Blob> {
  const mod = await import("@breezystack/lamejs");
  const encoder = new mod.Mp3Encoder(buffer.numberOfChannels, buffer.sampleRate, 128);
  const left = to16(buffer.getChannelData(0));
  const right = buffer.numberOfChannels > 1 ? to16(buffer.getChannelData(1)) : left;
  const chunks: Uint8Array[] = [];
  const block = 1152;
  for (let i = 0; i < left.length; i += block) {
    const mp3 = encoder.encodeBuffer(left.subarray(i, i + block), right.subarray(i, i + block));
    if (mp3.length) chunks.push(Uint8Array.from(mp3));
    if (i % (block * 24) === 0) await new Promise((resolve) => setTimeout(resolve, 0));
  }
  const end = encoder.flush();
  if (end.length) chunks.push(Uint8Array.from(end));
  return new Blob(chunks as BlobPart[], { type: "audio/mpeg" });
}

function to16(channel: Float32Array) {
  const out = new Int16Array(channel.length);
  for (let i = 0; i < channel.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, channel[i] ?? 0));
    out[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return out;
}

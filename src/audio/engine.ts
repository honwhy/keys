import { sfxUrl, type AssetManifest } from "../assets";
import type { Settings, Timbre } from "../types";

interface Voice {
  gain: GainNode;
  oscillators: OscillatorNode[];
  startedAt: number;
}

function noteFrequency(note: string): number {
  const match = /^([A-G])(#?)(\d)$/.exec(note);
  if (!match) {
    return 440;
  }
  const semitones: Record<string, number> = {
    C: 0,
    "C#": 1,
    D: 2,
    "D#": 3,
    E: 4,
    F: 5,
    "F#": 6,
    G: 7,
    "G#": 8,
    A: 9,
    "A#": 10,
    B: 11,
  };
  const midi = (Number(match[3]) + 1) * 12 + semitones[`${match[1]}${match[2]}`];
  return 440 * 2 ** ((midi - 69) / 12);
}

function perceptualVolume(value: number): number {
  const normalized = Math.min(100, Math.max(0, value)) / 100;
  return normalized ** 1.7;
}

function createImpulse(context: AudioContext, seconds: number, decay: number): AudioBuffer {
  const length = Math.max(1, Math.floor(context.sampleRate * seconds));
  const buffer = context.createBuffer(2, length, context.sampleRate);
  for (let channel = 0; channel < 2; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let index = 0; index < length; index += 1) {
      data[index] = (Math.random() * 2 - 1) * (1 - index / length) ** decay;
    }
  }
  return buffer;
}

export class AudioEngine {
  private readonly manifest: AssetManifest;
  private settings: Settings;
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private effectGain: GainNode | null = null;
  private convolver: ConvolverNode | null = null;
  private wetGain: GainNode | null = null;
  private readonly voices = new Map<string, Voice>();
  private readonly sfxBuffers = new Map<string, AudioBuffer>();
  private readonly sfxLoading = new Map<string, Promise<AudioBuffer | null>>();

  constructor(manifest: AssetManifest, settings: Settings) {
    this.manifest = manifest;
    this.settings = { ...settings };
  }

  frequencyOf(note: string): number {
    return noteFrequency(note);
  }

  updateSettings(settings: Settings): void {
    this.settings = { ...settings };
    this.applyVolumes();
    this.applyReverb();
  }

  private ensureContext(): AudioContext | null {
    if (this.context) {
      if (this.context.state === "suspended") {
        void this.context.resume();
      }
      return this.context;
    }
    const AudioContextCtor = window.AudioContext;
    if (!AudioContextCtor) {
      return null;
    }
    const context = new AudioContextCtor();
    this.context = context;
    this.masterGain = context.createGain();
    this.musicGain = context.createGain();
    this.effectGain = context.createGain();
    this.convolver = context.createConvolver();
    this.wetGain = context.createGain();
    this.convolver.buffer = createImpulse(context, 1.6, 2.8);
    this.musicGain.connect(this.masterGain);
    this.musicGain.connect(this.convolver);
    this.convolver.connect(this.wetGain);
    this.wetGain.connect(this.masterGain);
    this.effectGain.connect(this.masterGain);
    this.masterGain.connect(context.destination);
    this.applyVolumes();
    this.applyReverb();
    return context;
  }

  private applyVolumes(): void {
    if (!this.context || !this.masterGain || !this.musicGain || !this.effectGain) {
      return;
    }
    const now = this.context.currentTime;
    this.masterGain.gain.setTargetAtTime(perceptualVolume(this.settings.masterVolume), now, 0.02);
    this.musicGain.gain.setTargetAtTime(perceptualVolume(this.settings.musicVolume), now, 0.02);
    this.effectGain.gain.setTargetAtTime(perceptualVolume(this.settings.effectVolume), now, 0.02);
  }

  private applyReverb(): void {
    if (!this.context || !this.wetGain) {
      return;
    }
    const level = this.settings.reverb === "mid" ? 0.26 : this.settings.reverb === "low" ? 0.12 : 0;
    this.wetGain.gain.setTargetAtTime(level, this.context.currentTime, 0.02);
  }

  playNote(note: string, options?: { timbre?: Timbre; velocity?: number }): void {
    const context = this.ensureContext();
    if (!context || !this.musicGain) {
      return;
    }
    this.releaseNote(note, 0.01);
    const timbre = options?.timbre ?? this.settings.timbre;
    const velocity = options?.velocity ?? 0.8;
    const frequency = noteFrequency(note);
    const now = context.currentTime;
    const gain = context.createGain();
    const peak = 0.14 * Math.min(1, Math.max(0.1, velocity));
    const duration = timbre === "bell" ? 2.4 : timbre === "synth" ? 0.9 : 1.5;

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    gain.connect(this.musicGain);

    const oscillators: OscillatorNode[] = [];
    const addOscillator = (type: OscillatorType, frequencyValue: number, level: number): void => {
      const osc = context.createOscillator();
      const oscGain = context.createGain();
      osc.type = type;
      osc.frequency.value = frequencyValue;
      osc.frequency.setValueAtTime(frequencyValue, now);
      oscGain.gain.setValueAtTime(level, now);
      osc.connect(oscGain);
      oscGain.connect(gain);
      osc.start(now);
      osc.stop(now + duration + 0.1);
      oscillators.push(osc);
    };

    if (timbre === "bell") {
      addOscillator("sine", frequency, 0.9);
      addOscillator("sine", frequency * 2.01, 0.35);
      addOscillator("sine", frequency * 3.01, 0.12);
    } else if (timbre === "synth") {
      addOscillator("sawtooth", frequency, 0.5);
      addOscillator("triangle", frequency * 0.5, 0.35);
    } else {
      addOscillator("triangle", frequency, 0.85);
      addOscillator("sine", frequency * 2, 0.2);
    }

    this.voices.set(note, { gain, oscillators, startedAt: now });
  }

  releaseNote(note: string, fade = 0.09): void {
    const voice = this.voices.get(note);
    if (!voice || !this.context) {
      return;
    }
    const now = this.context.currentTime;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setTargetAtTime(0.0001, now, Math.max(0.005, fade / 4));
    voice.oscillators.forEach((oscillator) => {
      try {
        oscillator.stop(now + fade + 0.05);
      } catch {
        // Already stopped.
      }
    });
    this.voices.delete(note);
  }

  stopAll(): void {
    for (const note of [...this.voices.keys()]) {
      this.releaseNote(note, 0.03);
    }
  }

  async playSfx(key: string, volume = 1): Promise<void> {
    const context = this.ensureContext();
    if (!context || !this.effectGain) {
      return;
    }
    const path = sfxUrl(this.manifest, key);
    if (!path) {
      return;
    }
    let buffer = this.sfxBuffers.get(path);
    if (!buffer) {
      let loading = this.sfxLoading.get(path);
      if (!loading) {
        loading = fetch(path)
          .then((response) => {
            if (!response.ok) {
              throw new Error(`SFX HTTP ${response.status}`);
            }
            return response.arrayBuffer();
          })
          .then((data) => context.decodeAudioData(data))
          .then((decoded) => {
            this.sfxBuffers.set(path, decoded);
            return decoded;
          })
          .catch((error) => {
            console.warn("SFX load failed", path, error);
            return null;
          })
          .finally(() => {
            this.sfxLoading.delete(path);
          });
        this.sfxLoading.set(path, loading);
      }
      buffer = (await loading) ?? undefined;
      if (!buffer) {
        return;
      }
    }
    const source = context.createBufferSource();
    const gain = context.createGain();
    gain.gain.value = Math.min(1, Math.max(0, volume));
    source.buffer = buffer;
    source.connect(gain);
    gain.connect(this.effectGain);
    source.start();
  }

  destroy(): void {
    this.stopAll();
    if (this.context) {
      void this.context.close();
      this.context = null;
    }
  }
}

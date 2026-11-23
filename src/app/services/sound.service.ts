import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SoundService {
  readonly muted = signal(false);
  private context: AudioContext | null = null;
  private chargeOscillators: OscillatorNode[] = [];
  private chargeGain: GainNode | null = null;
  private chargeFilter: BiquadFilterNode | null = null;
  private craneOscillator: OscillatorNode | null = null;
  private craneGain: GainNode | null = null;

  toggleMute(): void {
    this.muted.update((muted) => !muted);
    this.updateCharge(0);
  }

  startCharge(): void {
    const context = this.audioContext();
    if (!context) return;
    this.stopCharge();

    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, context.currentTime);
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    filter.connect(gain);
    gain.connect(context.destination);

    this.chargeFilter = filter;
    this.chargeGain = gain;
    this.chargeOscillators = [72, 144].map((frequency, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = index === 0 ? 'sawtooth' : 'triangle';
      oscillator.frequency.setValueAtTime(frequency, context.currentTime);
      oscillator.connect(filter);
      oscillator.start();
      return oscillator;
    });
  }

  updateCharge(progress: number): void {
    const context = this.context;
    const gain = this.chargeGain;
    const filter = this.chargeFilter;
    if (!context || !gain || !filter) return;

    const amount = Math.max(0, Math.min(1, progress));
    const now = context.currentTime;
    const volume = this.muted() ? 0.0001 : 0.012 + amount * amount * 0.19;
    gain.gain.setTargetAtTime(volume, now, 0.045);
    filter.frequency.setTargetAtTime(900 + amount * 3700, now, 0.06);
    this.chargeOscillators.forEach((oscillator, index) => {
      const base = index === 0 ? 72 : 144;
      oscillator.frequency.setTargetAtTime(base + amount * (index === 0 ? 150 : 300), now, 0.06);
    });
  }

  stopCharge(): void {
    const context = this.context;
    const gain = this.chargeGain;
    if (!context || !gain) return;
    const now = context.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setTargetAtTime(0.0001, now, 0.035);
    this.chargeOscillators.forEach((oscillator) => oscillator.stop(now + 0.18));
    this.chargeOscillators = [];
    this.chargeGain = null;
    this.chargeFilter = null;
  }

  tick(intensity = 0.5): void {
    this.tone(620 + intensity * 280, 0.035, 0.025, 'sine');
  }

  victory(epic = false): void {
    const now = this.audioContext()?.currentTime;
    if (now === undefined) return;
    const notes = epic ? [523, 659, 784, 1047] : [587, 784, 988];
    notes.forEach((frequency, index) => {
      this.tone(frequency, epic ? 0.22 : 0.16, epic ? 0.08 : 0.055, 'triangle', index * 0.085);
    });
  }

  packTear(): void {
    this.noise(0.42, 0.19, 1700, 6800);
    this.tone(115, 0.2, 0.12, 'sawtooth');
  }

  cardSwipe(): void {
    this.noise(0.16, 0.055, 900, 5200);
  }

  holoReveal(): void {
    const notes = [740, 988, 1175, 1480, 1760];
    notes.forEach((frequency, index) => {
      this.tone(frequency, 0.42, 0.065, 'sine', index * 0.07);
      this.tone(frequency * 1.5, 0.24, 0.025, 'triangle', index * 0.07 + 0.025);
    });
  }

  startCraneMotor(): void {
    this.stopCraneMotor();
    const context = this.audioContext();
    if (!context || this.muted()) return;

    const oscillator = context.createOscillator();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(58, context.currentTime);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(240, context.currentTime);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.035, context.currentTime + 0.12);
    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    this.craneOscillator = oscillator;
    this.craneGain = gain;
  }

  stopCraneMotor(): void {
    if (!this.craneOscillator || !this.craneGain || !this.context) return;
    const now = this.context.currentTime;
    this.craneGain.gain.cancelScheduledValues(now);
    this.craneGain.gain.setTargetAtTime(0.0001, now, 0.035);
    this.craneOscillator.stop(now + 0.18);
    this.craneOscillator = null;
    this.craneGain = null;
  }

  clawSnap(): void {
    this.tone(1380, 0.055, 0.09, 'square');
    this.tone(240, 0.11, 0.07, 'triangle', 0.018);
  }

  capsulePop(): void {
    this.noise(0.11, 0.11, 750, 7200);
    this.tone(420, 0.14, 0.1, 'sine');
    [659, 784, 1047].forEach((frequency, index) => {
      this.tone(frequency, 0.25, 0.055, 'triangle', 0.07 + index * 0.085);
    });
  }

  private tone(
    frequency: number,
    duration: number,
    volume: number,
    wave: OscillatorType,
    delay = 0,
  ): void {
    if (this.muted()) return;
    const context = this.audioContext();
    if (!context) return;

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime + delay;
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.01);
  }

  private noise(duration: number, volume: number, lowCut: number, highCut: number): void {
    if (this.muted()) return;
    const context = this.audioContext();
    if (!context) return;

    const frameCount = Math.ceil(context.sampleRate * duration);
    const buffer = context.createBuffer(1, frameCount, context.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < frameCount; index++) {
      channel[index] = Math.random() * 2 - 1;
    }

    const source = context.createBufferSource();
    const highPass = context.createBiquadFilter();
    const lowPass = context.createBiquadFilter();
    const gain = context.createGain();
    const start = context.currentTime;
    source.buffer = buffer;
    highPass.type = 'highpass';
    highPass.frequency.setValueAtTime(lowCut, start);
    lowPass.type = 'lowpass';
    lowPass.frequency.setValueAtTime(highCut, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(highPass);
    highPass.connect(lowPass);
    lowPass.connect(gain);
    gain.connect(context.destination);
    source.start(start);
    source.stop(start + duration + 0.01);
  }

  private audioContext(): AudioContext | null {
    if (typeof window === 'undefined' || typeof window.AudioContext === 'undefined') return null;
    this.context ??= new window.AudioContext();
    if (this.context.state === 'suspended') void this.context.resume();
    return this.context;
  }
}

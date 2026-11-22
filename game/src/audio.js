// audio.js — tiny synthesised sound effects with the Web Audio API. No audio
// files: every blip is an oscillator, so the game stays fully offline.

export class SoundFX {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this._onGesture = () => this.ensure();
    window.addEventListener('keydown', this._onGesture, { once: true });
    window.addEventListener('click', this._onGesture, { once: true });
  }

  ensure() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch {
        this.ctx = null;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  blip(freq, duration, type = 'sine', volume = 0.08, slideTo = null) {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + duration);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  pickup() {
    this.blip(880, 0.12, 'sine', 0.09, 1320);
  }

  target() {
    this.blip(523, 0.14, 'triangle', 0.1);
    setTimeout(() => this.blip(784, 0.2, 'triangle', 0.1), 120);
  }

  spotted() {
    this.blip(220, 0.25, 'square', 0.06, 440);
  }

  caught() {
    this.blip(330, 0.5, 'sawtooth', 0.08, 110);
  }

  alarmTick() {
    this.blip(1046, 0.08, 'square', 0.04);
  }

  escape() {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.blip(f, 0.18, 'triangle', 0.1), i * 110));
  }
}

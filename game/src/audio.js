// Synthesised sound: every effect is built live with WebAudio oscillators
// and filtered noise. No audio files, no network, nothing to download.

export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this._roomNodes = null;
  }

  ensure() {
    if (!this.ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();
      } catch (err) {
        this.ctx = null;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted) this.stopRoomTone();
    else this.startRoomTone();
    return this.muted;
  }

  _tone(freq, dur, type, gain, slideTo) {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
    g.gain.setValueAtTime(gain || 0.12, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }

  _noise(dur, gain, filterFreq) {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq || 800;
    const g = ctx.createGain();
    g.gain.value = gain || 0.1;
    src.connect(filter);
    filter.connect(g);
    g.connect(ctx.destination);
    src.start();
  }

  footstep(loud) {
    this._noise(0.07, loud ? 0.16 : 0.05, loud ? 500 : 300);
  }

  coinThrow() { this._tone(1400, 0.08, 'triangle', 0.08); }
  coinLand() { this._tone(2200, 0.12, 'triangle', 0.14, 1800); this._tone(2600, 0.1, 'sine', 0.08); }
  smoke() { this._noise(0.5, 0.12, 1200); }
  pickup() { this._tone(880, 0.12, 'sine', 0.12); this._tone(1320, 0.16, 'sine', 0.1); }
  keycard() { this._tone(660, 0.1, 'square', 0.07); this._tone(990, 0.14, 'square', 0.07); }
  sting() { this._tone(220, 0.5, 'sawtooth', 0.12, 110); }
  alarm() {
    this._tone(520, 0.35, 'square', 0.1, 780);
    setTimeout(() => this._tone(780, 0.35, 'square', 0.1, 520), 380);
  }
  caught() { this._tone(180, 0.7, 'sawtooth', 0.14, 60); }
  clear() {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this._tone(f, 0.18, 'sine', 0.12), i * 110));
  }
  ghost() {
    // A soft high chime for a floor cleared without ever being seen.
    [1046, 1318, 1568].forEach((f, i) => setTimeout(() => this._tone(f, 0.3, 'sine', 0.09), i * 140));
  }
  win() {
    [523, 659, 784, 1046, 1318].forEach((f, i) => setTimeout(() => this._tone(f, 0.25, 'sine', 0.12), i * 130));
  }

  startRoomTone() {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx || this._roomNodes) return;
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * 0.25;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 160;
    const g = ctx.createGain();
    g.gain.value = 0.03;
    src.connect(filter);
    filter.connect(g);
    g.connect(ctx.destination);
    src.start();
    this._roomNodes = { src, g };
  }

  stopRoomTone() {
    if (this._roomNodes) {
      try { this._roomNodes.src.stop(); } catch (err) { /* already stopped */ }
      this._roomNodes = null;
    }
  }
}

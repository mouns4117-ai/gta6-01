// Palmera Bay — every sound is synthesized live with WebAudio: engine hum,
// sirens, gunshots, pickups and a bassline. No audio files, no network.

export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.musicTimer = 0;
    this.musicStep = 0;
    this.musicOn = false;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    // Engine: a low sawtooth whose pitch follows speed.
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 55;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;
    const engineFilter = this.ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 420;
    this.engineOsc.connect(engineFilter);
    engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);
    this.engineOsc.start();
    // Siren: a triangle wave wobbling between two tones.
    this.sirenOsc = this.ctx.createOscillator();
    this.sirenOsc.type = 'triangle';
    this.sirenOsc.frequency.value = 720;
    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.value = 0;
    this.sirenOsc.connect(this.sirenGain);
    this.sirenGain.connect(this.ctx.destination);
    this.sirenOsc.start();
  }

  setMuted(m) {
    this.muted = m;
    if (this.ctx) this.ctx.destination.gain.value = m ? 0 : 1;
  }

  engine(speedRatio, driving) {
    if (!this.ctx || !this.engineGain) return;
    const target = driving ? 0.035 + speedRatio * 0.05 : 0;
    this.engineGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.08);
    this.engineOsc.frequency.setTargetAtTime(52 + speedRatio * 130, this.ctx.currentTime, 0.1);
  }

  siren(on, t) {
    if (!this.ctx || !this.sirenGain) return;
    this.sirenGain.gain.setTargetAtTime(on ? 0.028 : 0, this.ctx.currentTime, 0.15);
    if (on) this.sirenOsc.frequency.setTargetAtTime(Math.sin(t * 4.4) > 0 ? 740 : 560, this.ctx.currentTime, 0.05);
  }

  _blip(freq, dur, type = 'sine', vol = 0.12) {
    if (!this.ctx || this.muted) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    o.connect(g);
    g.connect(this.ctx.destination);
    o.start();
    o.stop(this.ctx.currentTime + dur);
  }

  _noise(dur, vol = 0.2, freq = 1200) {
    if (!this.ctx || this.muted) return;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(filter);
    filter.connect(g);
    g.connect(this.ctx.destination);
    src.start();
  }

  shot() {
    this._noise(0.12, 0.3, 2600);
  }

  crash() {
    this._noise(0.25, 0.28, 700);
  }

  pickup() {
    this._blip(880, 0.12);
    setTimeout(() => this._blip(1320, 0.14), 70);
  }

  missionDone() {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this._blip(f, 0.22, 'triangle', 0.14), i * 110));
  }

  wantedUp() {
    this._blip(196, 0.25, 'square', 0.08);
    setTimeout(() => this._blip(147, 0.3, 'square', 0.08), 140);
  }

  // A lazy funk bassline, one note every eighth note at 96 BPM.
  music(dt) {
    if (!this.ctx || this.muted) return;
    this.musicTimer -= dt;
    if (this.musicTimer > 0) return;
    this.musicTimer = 60 / 96 / 2;
    const bass = [55, 0, 65.4, 0, 49, 0, 58.3, 73.4, 55, 0, 65.4, 0, 82.4, 73.4, 65.4, 49];
    const f = bass[this.musicStep % bass.length];
    this.musicStep++;
    if (f > 0) this._blip(f, 0.24, 'triangle', 0.06);
  }
}

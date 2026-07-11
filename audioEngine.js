// Web Audio engine for Kirk Radio DJ.
// Two decks (A/B) -> 3-band EQ -> channel gain -> crossfader gain -> master -> destination.
// Same-origin audio files, so full processing works.

class Deck {
  constructor(ctx, master) {
    this.ctx = ctx;
    this.audio = new Audio();
    this.audio.crossOrigin = 'anonymous';
    this.audio.preload = 'auto';
    this.source = ctx.createMediaElementSource(this.audio);

    this.low = ctx.createBiquadFilter();
    this.low.type = 'lowshelf';
    this.low.frequency.value = 320;

    this.mid = ctx.createBiquadFilter();
    this.mid.type = 'peaking';
    this.mid.frequency.value = 1000;
    this.mid.Q.value = 0.8;

    this.high = ctx.createBiquadFilter();
    this.high.type = 'highshelf';
    this.high.frequency.value = 3200;

    this.channelGain = ctx.createGain();
    this.channelGain.gain.value = 0.8;

    this.xfadeGain = ctx.createGain();
    this.xfadeGain.gain.value = 1;

    this.source.connect(this.low);
    this.low.connect(this.mid);
    this.mid.connect(this.high);
    this.high.connect(this.channelGain);
    this.channelGain.connect(this.xfadeGain);
    this.xfadeGain.connect(master);
  }

  load(src) {
    this.audio.src = src;
    this.audio.load();
  }

  setEQ(band, db) {
    // db range approx -26..+6
    if (band === 'low') this.low.gain.value = db;
    if (band === 'mid') this.mid.gain.value = db;
    if (band === 'high') this.high.gain.value = db;
  }

  setVolume(v) { this.channelGain.gain.value = v; }
  setXfade(v) { this.xfadeGain.gain.value = v; }
}

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.decks = {};
    this.analyser = null;
  }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 1;
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.master.connect(this.analyser);
    this.master.connect(this.ctx.destination);
    this.decks.A = new Deck(this.ctx, this.master);
    this.decks.B = new Deck(this.ctx, this.master);
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  getDeck(id) {
    this.init();
    return this.decks[id];
  }
}

const engine = new AudioEngine();
if (typeof window !== 'undefined') window.__djEngine = engine;
export default engine;

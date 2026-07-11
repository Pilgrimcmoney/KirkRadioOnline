// Real live broadcasting: taps the master mix, encodes to MP3, streams via WebSocket.
import { Mp3Encoder } from '@breezystack/lamejs';
import engine from './audioEngine';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function floatToInt16(input) {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    let s = Math.max(-1, Math.min(1, input[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

class BroadcastClient {
  constructor() {
    this.ws = null;
    this.node = null;
    this.encoder = null;
    this.silentGain = null;
    this.onState = null;
    this.active = false;
  }

  get streamUrl() {
    return `${BACKEND_URL}/api/broadcast/stream`;
  }

  start(title = 'Kirk Radio Live') {
    engine.init();
    engine.resume();
    const ctx = engine.ctx;
    const sampleRate = ctx.sampleRate;
    const kbps = 128;

    this.encoder = new Mp3Encoder(2, sampleRate, kbps);

    const wsBase = BACKEND_URL.replace(/^http/, 'ws');
    this.ws = new WebSocket(`${wsBase}/api/broadcast/ws?title=${encodeURIComponent(title)}`);
    this.ws.binaryType = 'arraybuffer';

    this.ws.onopen = () => {
      this.active = true;
      this._attachTap(ctx);
      this.onState && this.onState('live');
    };
    this.ws.onerror = () => { this.onState && this.onState('error'); };
    this.ws.onclose = () => { this.active = false; this.onState && this.onState('offline'); };
  }

  _attachTap(ctx) {
    const bufSize = 4096;
    this.node = ctx.createScriptProcessor(bufSize, 2, 2);
    this.node.onaudioprocess = (e) => {
      if (!this.active || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
      const l = floatToInt16(e.inputBuffer.getChannelData(0));
      const r = e.inputBuffer.numberOfChannels > 1
        ? floatToInt16(e.inputBuffer.getChannelData(1))
        : l;
      const mp3 = this.encoder.encodeBuffer(l, r);
      if (mp3.length > 0) {
        try { this.ws.send(mp3); } catch (_) {}
      }
    };
    // silent sink so the processor runs without duplicating audio output
    this.silentGain = ctx.createGain();
    this.silentGain.gain.value = 0;
    engine.master.connect(this.node);
    this.node.connect(this.silentGain);
    this.silentGain.connect(ctx.destination);
  }

  stop() {
    this.active = false;
    try {
      if (this.node) {
        engine.master.disconnect(this.node);
        this.node.disconnect();
        this.node.onaudioprocess = null;
      }
      if (this.silentGain) this.silentGain.disconnect();
      if (this.encoder) {
        const end = this.encoder.flush();
        if (end.length > 0 && this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(end);
      }
    } catch (_) {}
    if (this.ws) { try { this.ws.close(); } catch (_) {} }
    this.ws = null; this.node = null; this.encoder = null; this.silentGain = null;
  }

  async fetchStatus() {
    try {
      const res = await fetch(`${BACKEND_URL}/api/broadcast/status`);
      return await res.json();
    } catch (_) {
      return { live: false, listeners: 0, uptime: 0 };
    }
  }
}

const broadcastClient = new BroadcastClient();
export default broadcastClient;

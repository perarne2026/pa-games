// === S-DETEKTOR ===
// Lyssnar på mikrofonen och klassar varje frame:
//   tyst | röst (vokaler) | svag (för lite luft) | sch (för lågt, sidoläsp) | mjuk (platt/luftigt, läsp) | s (vasst!)
//
// Nyckeln är "kontrast": energi per Hz i S-bandet (4,5–11 kHz) jämfört med mellanbandet (1,5–4 kHz).
//   vasst [s]     → +8 dB eller mer (topp högt upp, tyst under)
//   läsp [θ]/[f]  → ca 0–5 dB (platt brus)
//   sch / sidoläsp → under −5 dB (energin ligger för lågt)

const STRICT_TH = [3.5, 6, 9]; // kontrastgräns för "s" per noggrannhetsnivå
const SCH_TH = -5;             // under detta = energin ligger för lågt (sch/sidoläsp)

const A = {
  ctx: null, an: null, stream: null, spec: null, sr: 48000, binHz: 23,
  floor: { tot: -200, hi: -200 },
  ready: false, last: null, strict: 1, listeners: new Set(),

  get sTh() { return STRICT_TH[this.strict]; },

  async start() {
    if (this.ready) return;
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    await this.ctx.resume();
    const src = this.ctx.createMediaStreamSource(this.stream);
    this.an = this.ctx.createAnalyser();
    this.an.fftSize = 2048;
    this.an.smoothingTimeConstant = 0.25;
    src.connect(this.an);
    this.spec = new Float32Array(this.an.frequencyBinCount);
    this.sr = this.ctx.sampleRate;
    this.binHz = this.sr / this.an.fftSize;
    this.ready = true;
    this.calibrated = 0;
    const loop = () => { this.analyze(); requestAnimationFrame(loop); };
    loop();
  },

  band(lo, hi) {
    const a = Math.max(1, Math.round(lo / this.binHz));
    const b = Math.min(this.spec.length - 1, Math.round(hi / this.binHz));
    let p = 0;
    for (let i = a; i <= b; i++) p += Math.pow(10, this.spec[i] / 10);
    return { p, perHz: p / ((b - a + 1) * this.binHz) };
  },

  analyze() {
    this.an.getFloatFrequencyData(this.spec);
    if (!isFinite(this.spec[10])) return; // inget ljud än
    const low = this.band(150, 1200);
    const mid = this.band(1500, 4000);
    const hi = this.band(4500, Math.min(11000, this.sr / 2 - 500));
    const eps = 1e-20;
    const totDb = 10 * Math.log10(low.p + mid.p + hi.p + eps);
    const hiDb = 10 * Math.log10(hi.p + eps);
    const contrast = 10 * Math.log10((hi.perHz + eps) / (mid.perHz + eps));
    const voice = 10 * Math.log10((low.perHz + eps) / (hi.perHz + eps));

    // Brusgolv: första ~0,7 s kalibrerar, sedan följer golvet tystnad (snabbt nedåt, långsamt uppåt)
    const f = this.floor;
    if (this.calibrated < 40) {
      f.tot = this.calibrated ? Math.min(f.tot, totDb) * 0.5 + totDb * 0.5 : totDb;
      f.hi = this.calibrated ? Math.min(f.hi, hiDb) * 0.5 + hiDb * 0.5 : hiDb;
      this.calibrated++;
    } else {
      if (totDb < f.tot) f.tot = f.tot * 0.8 + totDb * 0.2;
      else if (totDb - f.tot < 4) f.tot += 0.02;
      if (hiDb < f.hi) f.hi = f.hi * 0.8 + hiDb * 0.2;
      else if (hiDb - f.hi < 4) f.hi += 0.02;
    }
    const above = totDb - f.tot;
    const hiAbove = hiDb - f.hi;

    let kind;
    if (hiAbove < 6 && above < 8) kind = 'tyst';
    else if (voice > 22) kind = 'röst';
    else if (hiAbove < 10) kind = 'svag';
    else if (contrast < SCH_TH) kind = 'sch';
    else if (contrast < this.sTh) kind = 'mjuk';
    else kind = 's';

    const clamp = (x) => Math.max(0, Math.min(1, x));
    const sharp = (kind === 'tyst' || kind === 'röst') ? 0
      : clamp((contrast - SCH_TH) / (this.sTh - SCH_TH + 4)) * clamp((hiAbove - 4) / 14);

    this.last = { t: performance.now(), kind, contrast, hiAbove, above, voice, sharp };
    for (const fn of this.listeners) fn(this.last);
  },

  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); },

  // Samlar frames under en period och hittar "fräs-sjok" (S-kandidater)
  collect() {
    const frames = [];
    const off = this.on((fr) => frames.push(fr));
    return {
      frames,
      stop: () => { off(); return A.runs(frames); },
    };
  },

  runs(frames) {
    const FR = ['s', 'mjuk', 'sch'];
    const out = [];
    let cur = null;
    let gap = 0;
    for (const fr of frames) {
      if (FR.includes(fr.kind)) {
        if (!cur) cur = { start: fr.t, end: fr.t, cs: [] };
        cur.end = fr.t; cur.cs.push(fr.contrast); gap = 0;
      } else if (cur) {
        if (++gap > 2) { out.push(cur); cur = null; gap = 0; }
      }
    }
    if (cur) out.push(cur);
    return out
      .filter((r) => r.end - r.start >= 70)
      .map((r) => {
        const s = [...r.cs].sort((a, b) => a - b);
        const c = s[Math.floor(s.length / 2)];
        const kind = c < SCH_TH ? 'sch' : c < this.sTh ? 'mjuk' : 's';
        return { ms: r.end - r.start, contrast: c, kind };
      });
  },
};

window.A = A;

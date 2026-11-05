// === ORMEN SIGGE — S-träning för barn ===
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const rnd = (a, b) => a + Math.random() * (b - a);
const shuffle = (arr) => arr.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);

// ---------- Sparat ----------
const KEY = 'ormen-sigge-v1';
const S = Object.assign(
  { stars: 0, streak: 0, lastDay: null, strict: 1, balLevel: 0, raceLevel: 0, raceUnlocked: 0, raceBest: {}, catBest: {}, learnDay: null },
  (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } })()
);
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };
A.strict = S.strict;

const today = () => new Date().toISOString().slice(0, 10);
function addStars(n) {
  if (n <= 0) return;
  const t = today();
  if (S.lastDay !== t) {
    const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    S.streak = S.lastDay === y ? S.streak + 1 : 1;
    S.lastDay = t;
  }
  S.stars += n;
  save();
  updatePills();
  toast(`+${n} ⭐  Sigge växer!`);
}
function updatePills() {
  $('#starsPill').textContent = `⭐ ${S.stars}`;
  $('#streakPill').textContent = `🔥 ${S.streak} ${S.streak === 1 ? 'dag' : 'dagar'}`;
}

// ---------- Feedback ----------
const FEED = {
  s: ['Vasst! 🐍', 'Sssuper!', 'Perfekt ormljud!', 'Ssssnyggt!', 'Klockrent S!'],
  mjuk: 'Lite luftigt – är tungan bakom tänderna? Bit ihop och le!',
  sch: 'Låter lite som sch – le brett och skjut tungspetsen fram bakom framtänderna.',
  svag: 'Lite mer luft! Blås ut som en orm.',
  ingen: 'Jag hörde inget S – prova igen, lite närmare.',
};
const pick = (x) => (Array.isArray(x) ? x[Math.floor(Math.random() * x.length)] : x);
const LABEL = { s: '🐍 Vasst S!', mjuk: '💨 Luftigt', sch: '🌊 Sch-igt', svag: '🤏 För svagt', röst: '🗣️ …', tyst: '' };

// ---------- Mätaren ----------
function makeMeter(el) {
  el.innerHTML = `<div class="bar"><div class="z z1">sch</div><div class="z z2">luftigt</div><div class="z z3">vasst</div><div class="needle"></div></div><div class="label"></div>`;
  const needle = el.querySelector('.needle');
  const label = el.querySelector('.label');
  let shown = 0, hold = 0;
  return (fr) => {
    if (!fr) return;
    const th = A.sTh;
    let p;
    if (fr.contrast < SCH_TH) p = clamp((fr.contrast - SCH_TH + 10) / 10) * (2 / 9);
    else if (fr.contrast < th) p = 2 / 9 + ((fr.contrast - SCH_TH) / (th - SCH_TH)) * (3 / 9);
    else p = 5 / 9 + clamp((fr.contrast - th) / 10) * (4 / 9);
    const active = !['tyst', 'röst'].includes(fr.kind);
    if (active) { shown = shown * 0.6 + p * 0.4; hold = 12; }
    else if (hold > 0) hold--;
    needle.style.left = `${shown * 100}%`;
    needle.style.opacity = hold > 0 ? 1 : 0.25;
    if (active) label.textContent = LABEL[fr.kind];
    else if (hold === 0) label.textContent = '';
  };
}

// ---------- Ljud ----------
let sfxCtx;
function tone(freq, dur = 0.15, type = 'sine', vol = 0.2, when = 0) {
  sfxCtx = sfxCtx || A.ctx || new (window.AudioContext || window.webkitAudioContext)();
  const o = sfxCtx.createOscillator(), g = sfxCtx.createGain();
  const t = sfxCtx.currentTime + when;
  o.type = type; o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(sfxCtx.destination); o.start(t); o.stop(t + dur);
}
const sfx = {
  win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.25, 'triangle', 0.2, i * 0.09)),
  good: () => { tone(880, 0.12, 'triangle'); tone(1320, 0.18, 'triangle', 0.15, 0.08); },
  meh: () => tone(330, 0.2, 'triangle', 0.15),
  pop: () => {
    sfxCtx = sfxCtx || A.ctx || new (window.AudioContext || window.webkitAudioContext)();
    const n = sfxCtx.sampleRate * 0.15, b = sfxCtx.createBuffer(1, n, sfxCtx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
    const s = sfxCtx.createBufferSource(); s.buffer = b; s.connect(sfxCtx.destination); s.start();
  },
};

// ---------- Konfetti & toast ----------
const cf = $('#confetti'), cx = cf.getContext('2d');
let parts = [];
function confetti() {
  cf.width = innerWidth; cf.height = innerHeight;
  const cols = ['#ff6b6b', '#ffc94a', '#49c189', '#4a8cff', '#9b6bff'];
  for (let i = 0; i < 140; i++) parts.push({ x: innerWidth / 2, y: innerHeight * 0.45, vx: rnd(-9, 9), vy: rnd(-15, -4), r: rnd(4, 9), c: cols[i % 5], a: rnd(0, 6), life: 1 });
  if (parts.length === 140) requestAnimationFrame(cfLoop);
}
function cfLoop() {
  cx.clearRect(0, 0, cf.width, cf.height);
  parts.forEach((p) => { p.x += p.vx; p.y += p.vy; p.vy += 0.4; p.a += 0.2; p.life -= 0.008;
    cx.save(); cx.globalAlpha = clamp(p.life); cx.translate(p.x, p.y); cx.rotate(p.a); cx.fillStyle = p.c; cx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); cx.restore(); });
  parts = parts.filter((p) => p.life > 0 && p.y < cf.height + 20);
  if (parts.length) requestAnimationFrame(cfLoop); else cx.clearRect(0, 0, cf.width, cf.height);
}
let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 1800); }

// ---------- Mikrofon-grind ----------
function needMic() {
  if (A.ready) return Promise.resolve(true);
  return new Promise((res) => {
    const gate = $('#micGate');
    gate.classList.remove('hidden');
    $('#micErr').textContent = '';
    $('#micAllow').onclick = async () => {
      try { await A.start(); gate.classList.add('hidden'); res(true); }
      catch (e) { $('#micErr').textContent = 'Fick inte använda mikrofonen. Tillåt mikrofon för sidan i webbläsarens inställningar och försök igen.'; }
    };
  });
}

// ---------- Navigering ----------
const leaveHooks = {};
let current = 'home';
function go(id) {
  leaveHooks[current]?.();
  $$('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
  current = id;
  enterHooks[id]?.();
  scrollTo(0, 0);
}
document.addEventListener('click', (e) => { const b = e.target.closest('[data-go]'); if (b) go(b.dataset.go); });

// ---------- HEM: Sigge ----------
const hc = $('#snakeHome'), hx = hc.getContext('2d');
function drawSnake(ctx, W, H, n, t, opts = {}) {
  const len = Math.min(W - 80, 60 + n * 14);
  const segs = Math.max(6, Math.round(len / 12));
  const x0 = (W - len) / 2;
  const pts = [];
  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    pts.push([x0 + u * len, H / 2 + Math.sin(t * 3 - u * 7) * (H * 0.16) * (0.4 + u * 0.6)]);
  }
  for (let i = 0; i <= segs; i++) {
    const u = i / segs, r = 6 + u * 14;
    ctx.fillStyle = i % 3 === 0 ? '#ffc94a' : '#49c189';
    ctx.beginPath(); ctx.arc(pts[i][0], pts[i][1], r, 0, Math.PI * 2); ctx.fill();
  }
  const [hxp, hyp] = pts[segs];
  ctx.fillStyle = '#2f9e6a'; ctx.beginPath(); ctx.ellipse(hxp + 6, hyp, 26, 21, 0, 0, Math.PI * 2); ctx.fill();
  // tunga
  if ((t * 1.3) % 2 < 0.35 || opts.tongue) {
    ctx.strokeStyle = '#ef5b5b'; ctx.lineWidth = 3; ctx.beginPath();
    ctx.moveTo(hxp + 30, hyp + 4); ctx.lineTo(hxp + 46, hyp + 4); ctx.lineTo(hxp + 52, hyp - 2);
    ctx.moveTo(hxp + 46, hyp + 4); ctx.lineTo(hxp + 52, hyp + 10); ctx.stroke();
  }
  // ögon
  for (const dy of [-8, 8]) {
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(hxp + 12, hyp + dy - 6, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#24324a'; ctx.beginPath(); ctx.arc(hxp + 14, hyp + dy - 6, 3.5, 0, Math.PI * 2); ctx.fill();
  }
  // le
  ctx.strokeStyle = '#1f6e49'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(hxp + 16, hyp + 4, 10, 0.2, 1.3); ctx.stroke();
}
let homeRaf;
function homeLoop(ts) {
  hx.clearRect(0, 0, hc.width, hc.height);
  drawSnake(hx, hc.width, hc.height, S.stars, ts / 1000);
  homeRaf = requestAnimationFrame(homeLoop);
}
const enterHooks = {
  home() {
    updatePills();
    const cm = 20 + S.stars * 2;
    $('#homeMsg').textContent = S.stars ? `Sigge är ${cm} cm lång! Samla fler stjärnor så växer han.` : 'Sigge växer för varje stjärna du samlar!';
    cancelAnimationFrame(homeRaf); homeRaf = requestAnimationFrame(homeLoop);
  },
};
leaveHooks.home = () => cancelAnimationFrame(homeRaf);

// ---------- TUNGSKOLAN ----------
function mouthSVG(type) {
  const tongue = type === 'no' ? '<ellipse cx="100" cy="62" rx="26" ry="11" fill="#ff8fa3" stroke="#e86a82" stroke-width="2"/>' : '';
  const air = type === 'side'
    ? '<g stroke="#4a8cff" stroke-width="4" fill="none" stroke-linecap="round"><path d="M22 56 q-8 -6 -16 0"/><path d="M24 66 q-10 4 -18 -2"/><path d="M178 56 q8 -6 16 0"/><path d="M176 66 q10 4 18 -2"/></g>'
    : type === 'ok'
      ? '<g stroke="#4a8cff" stroke-width="4" fill="none" stroke-linecap="round"><path d="M100 92 q-6 8 0 14 q6 6 0 12"/></g>'
      : '<g stroke="#9aa6c0" stroke-width="4" fill="none" stroke-linecap="round" opacity=".8"><path d="M80 92 q-6 8 -2 14"/><path d="M100 94 q-6 8 0 14"/><path d="M120 92 q6 8 2 14"/></g>';
  return `<svg viewBox="0 0 200 125"><path d="M18 50 Q100 8 182 50 Q100 112 18 50Z" fill="#e8737b"/>
    <path d="M36 52 Q100 28 164 52 Q100 92 36 52Z" fill="#5a2330"/>
    <path d="M44 50 Q100 32 156 50 L154 57 Q100 49 46 57Z" fill="#fff"/>
    <path d="M50 64 Q100 57 150 64 L146 70 Q100 82 54 70Z" fill="#fff"/>${tongue}${air}</svg>`;
}
const STEPS = [
  { h: 'Ormens ljud', html: `<div class="big">🐍</div><p>S låter som en orm som väser: <b>sssss</b>. Det finns ett <b>vasst</b> ormljud och ett <b>luftigt</b>. Vi ska träna det vassa!</p>` },
  { h: 'Bit ihop och le', html: `<div class="mouths"><div class="mouth ok">${mouthSVG('ok')}<span>Så här!</span></div></div><p>Bit <b>försiktigt</b> ihop så tänderna nästan nuddar varandra. Le brett – som en glad orm!</p>` },
  { h: 'Tungan bakom gallret', html: `<div class="mouths"><div class="mouth ok">${mouthSVG('ok')}<span>✅ Tungan gömd</span></div><div class="mouth no">${mouthSVG('no')}<span>❌ Tungan tittar ut</span></div></div><p>Tänderna är ett <b>galler</b>. Tungspetsen gömmer sig bakom de övre framtänderna – ormen får aldrig smita ut! Kolla i spegeln.</p><button class="btn ghost mirrorBtn">🪞 Spegel</button><div class="mirrorBox"></div>` },
  { h: 'Smal luft i mitten', html: `<div class="mouths"><div class="mouth ok">${mouthSVG('ok')}<span>✅ Mitt fram</span></div><div class="mouth no">${mouthSVG('side')}<span>❌ Ut på sidorna</span></div></div><p>Luften ska komma ut som en <b>smal, kall stråle</b> mitt fram. Håll ett finger framför munnen och säg sss – känns det kallt i mitten?</p>` },
  { h: 'T-tricket', html: `<div class="big">🚂</div><p>Säg <b>t-t-t-t</b> snabbt som ett tåg. Låt tungan ligga kvar precis där – och låt luften pysa ut: <b>t‑sssss</b>!</p><div class="meter stepMeter"></div><button class="btn ghost micBtn">🎤 Starta mätaren</button>` },
  { h: 'Hör skillnaden', html: `<p>1. Gör ett <b>läspigt</b> S med tungan mellan tänderna – titta på mätaren.<br>2. Gör nu ett <b>vasst</b> S med tungan bakom tänderna.<br>Ser du skillnaden?</p><div class="meter stepMeter"></div><button class="btn ghost micBtn">🎤 Starta mätaren</button><button class="btn ghost mirrorBtn">🪞 Spegel</button><div class="mirrorBox"></div>` },
];
let step = 0, stepOffs = [], camStream = null;
function stopCam() { camStream?.getTracks().forEach((t) => t.stop()); camStream = null; $$('.mirrorBox').forEach((b) => (b.innerHTML = '')); }
function renderStep() {
  stepOffs.forEach((f) => f()); stepOffs = []; stopCam();
  $$('.step').forEach((el, i) => el.classList.toggle('on', i === step));
  $('#stepDots').innerHTML = STEPS.map((_, i) => `<i class="${i === step ? 'on' : ''}"></i>`).join('');
  $('#stepPrev').style.visibility = step ? 'visible' : 'hidden';
  $('#stepNext').textContent = step === STEPS.length - 1 ? 'Klar! ⭐' : 'Nästa →';
  const el = $$('.step')[step];
  const m = el.querySelector('.stepMeter');
  if (m) {
    const btn = el.querySelector('.micBtn');
    const attach = () => { btn.classList.add('hidden'); const up = makeMeter(m); stepOffs.push(A.on(up)); };
    if (A.ready) attach(); else { btn.classList.remove('hidden'); m.innerHTML = ''; btn.onclick = async () => { await needMic(); attach(); }; }
  }
  const mb = el.querySelector('.mirrorBtn');
  if (mb) mb.onclick = async () => {
    if (camStream) return stopCam();
    try {
      camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      const v = document.createElement('video'); v.className = 'mirror'; v.playsInline = true; v.muted = true; v.autoplay = true; v.srcObject = camStream;
      el.querySelector('.mirrorBox').appendChild(v);
    } catch { toast('Kameran gick inte att starta'); }
  };
}
$('#steps').innerHTML = STEPS.map((s) => `<div class="step"><h3>${s.h}</h3>${s.html}</div>`).join('');
$('#stepPrev').onclick = () => { step = Math.max(0, step - 1); renderStep(); };
$('#stepNext').onclick = () => {
  if (step < STEPS.length - 1) { step++; renderStep(); return; }
  if (S.learnDay !== today()) { S.learnDay = today(); addStars(2); confetti(); sfx.win(); }
  go('home');
};
enterHooks.learn = () => { step = 0; renderStep(); };
leaveHooks.learn = () => { stepOffs.forEach((f) => f()); stepOffs = []; stopCam(); };

// ---------- BALLONGEN ----------
const BAL_T = [1.5, 2.5, 3.5, 5, 6.5, 8, 10];
const BAL_COL = ['#ff6b6b', '#4a8cff', '#ffc94a', '#9b6bff', '#49c189', '#ff8fd1', '#ff9b45'];
const bal = { run: false, f: 0, off: null, lastT: 0, lastGood: 0, streakStart: 0, bestHold: 0, meter: null };
function balRender() {
  const lv = Math.min(S.balLevel, BAL_T.length - 1);
  $('#balLevel').textContent = `Nivå ${S.balLevel + 1}`;
  $('#balGoal').innerHTML = `Blås upp ballongen med ett vasst <b>sssss</b> i ${String(BAL_T[lv]).replace('.', ',')} sekunder!`;
  $('#balBody').setAttribute('fill', BAL_COL[S.balLevel % BAL_COL.length]);
  $('#balG').style.transform = `scale(${0.3 + bal.f * 0.85})`;
}
function balStop() { bal.run = false; bal.off?.(); bal.off = null; $('#balStart').classList.remove('listening'); }
$('#balStart').onclick = async () => {
  if (bal.run) { balStop(); $('#balStart').textContent = '🎤 Fortsätt'; return; }
  await needMic();
  bal.run = true; bal.lastT = 0; bal.lastGood = 0;
  $('#balStart').textContent = '⏸ Paus'; $('#balStart').classList.add('listening');
  $('#balHint').textContent = 'Ssssss…';
  const target = BAL_T[Math.min(S.balLevel, BAL_T.length - 1)];
  bal.off = A.on((fr) => {
    bal.meter(fr);
    const dt = bal.lastT ? Math.min(0.1, (fr.t - bal.lastT) / 1000) : 0;
    bal.lastT = fr.t;
    let leak = false;
    if (fr.kind === 's') {
      if (!bal.streakStart || fr.t - bal.lastGood > 300) bal.streakStart = fr.t;
      bal.f += dt / target; bal.lastGood = fr.t;
      bal.bestHold = Math.max(bal.bestHold, (fr.t - bal.streakStart) / 1000);
      $('#balHint').textContent = pick(FEED.s);
    } else if (fr.kind === 'mjuk' || fr.kind === 'sch') {
      bal.f -= dt * 0.2; leak = true; $('#balHint').textContent = FEED[fr.kind];
    } else if (fr.kind === 'svag') {
      $('#balHint').textContent = FEED.svag;
    } else if (fr.t - bal.lastGood > 400) {
      bal.f -= dt * 0.3;
    }
    bal.f = clamp(bal.f);
    $('#balLeak').style.opacity = leak ? 1 : 0;
    balRender();
    if (bal.f >= 1) {
      balStop(); sfx.pop(); confetti(); setTimeout(sfx.win, 200);
      $('#balG').style.transform = 'scale(0)';
      $('#balHint').textContent = `PANG! 🎉 Längsta S: ${bal.bestHold.toFixed(1).replace('.', ',')} s`;
      addStars(1 + (S.balLevel >= 3 ? 1 : 0));
      S.balLevel++; save(); bal.f = 0; bal.bestHold = 0;
      $('#balStart').textContent = '🎈 Nästa ballong';
      setTimeout(balRender, 1400);
    }
  });
};
enterHooks.balloon = () => { bal.f = 0; bal.meter = makeMeter($('#balMeter')); balRender(); $('#balStart').textContent = '🎤 Börja'; $('#balHint').textContent = 'Tryck på knappen och säg ssssss'; };
leaveHooks.balloon = balStop;

// ---------- BOMULLSRACET ----------
const RACE = [
  { name: 'Köksbordet', speed: 1 / 8, green: [3, 5], red: [1.5, 2.5] },
  { name: 'Långbordet', speed: 1 / 11, green: [2, 4], red: [1.5, 2.5] },
  { name: 'Mästarbanan', speed: 1 / 13, green: [1.5, 3], red: [1, 2.5] },
];
const rc = $('#raceCanvas'), rx = rc.getContext('2d');
const race = { run: false, p: 0, light: 'green', lightEnd: 0, t0: 0, now: 0, pen: 0, penThis: false, flash: 0, wind: 0, rot: 0, off: null, raf: 0, count: 0, meter: null, lastT: 0 };
function raceDraw() {
  const W = rc.width, H = rc.height, lv = RACE[S.raceLevel];
  rx.clearRect(0, 0, W, H);
  // bord
  rx.fillStyle = '#f3e3c3'; rx.fillRect(0, 210, W, 110);
  rx.fillStyle = '#e2cca2'; for (let x = 0; x < W; x += 90) rx.fillRect(x, 210, 3, 110);
  rx.fillStyle = '#c9a877'; rx.fillRect(0, 206, W, 6);
  // mål
  const gx = 720;
  rx.fillStyle = '#24324a'; rx.fillRect(gx, 110, 5, 100);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { rx.fillStyle = (i + j) % 2 ? '#fff' : '#24324a'; rx.fillRect(gx + 5 + i * 12, 110 + j * 12, 12, 12); }
  rx.fillStyle = '#9aa6c0'; rx.font = '700 18px "Baloo 2"'; rx.fillText(lv.name, 20, 300);
  // trafikljus
  rx.fillStyle = '#24324a'; rx.beginPath(); rx.roundRect(360, 12, 80, 150, 18); rx.fill();
  [['red', '#ef5b5b', 42], ['yellow', '#ffc94a', 87], ['green', '#49c189', 132]].forEach(([k, c, y]) => {
    rx.fillStyle = race.light === k ? c : '#3b4862'; rx.beginPath(); rx.arc(400, y, 18, 0, Math.PI * 2); rx.fill();
  });
  // tuss
  const bx = 60 + race.p * (gx - 90), by = 185;
  if (race.wind > 0.05) {
    rx.strokeStyle = `rgba(74,140,255,${race.wind})`; rx.lineWidth = 3; rx.lineCap = 'round';
    for (let i = 0; i < 4; i++) { const yy = by - 18 + i * 12, l = 30 + ((race.now * 0.3 + i * 37) % 40); rx.beginPath(); rx.moveTo(bx - 34 - l, yy); rx.lineTo(bx - 34, yy); rx.stroke(); }
  }
  rx.save(); rx.translate(bx, by); rx.rotate(race.rot);
  rx.fillStyle = '#fff'; rx.strokeStyle = '#dde3ee'; rx.lineWidth = 2;
  [[0, 0, 20], [-12, -6, 13], [12, -6, 13], [-9, 9, 12], [10, 8, 12]].forEach(([x, y, r]) => { rx.beginPath(); rx.arc(x, y, r, 0, Math.PI * 2); rx.fill(); rx.stroke(); });
  rx.restore();
  // texter
  rx.textAlign = 'center';
  if (race.count > 0) { rx.fillStyle = '#24324a'; rx.font = '800 90px "Baloo 2"'; rx.fillText(Math.ceil(race.count), W / 2 - 200, 140); }
  if (race.flash > 0) { rx.fillStyle = `rgba(239,91,91,${race.flash})`; rx.font = '800 60px "Baloo 2"'; rx.fillText('STOPP!', 180, 120); }
  rx.textAlign = 'left';
}
function nextLight(now) {
  const lv = RACE[S.raceLevel];
  if (race.light === 'green') { race.light = 'yellow'; race.lightEnd = now + 800; }
  else if (race.light === 'yellow') { race.light = 'red'; race.lightEnd = now + rnd(...lv.red) * 1000; race.penThis = false; }
  else { race.light = 'green'; race.lightEnd = now + rnd(...lv.green) * 1000; }
}
function raceStop() { race.run = false; race.off?.(); race.off = null; cancelAnimationFrame(race.raf); $('#raceStart').textContent = '🏁 Starta'; }
function raceTick(ts) {
  race.now = ts;
  if (race.count > 0) {
    race.count = 3 - (ts - race.t0) / 1000;
    if (race.count <= 0) { race.count = 0; race.t0 = ts; race.light = 'green'; race.lightEnd = ts + rnd(...RACE[S.raceLevel].green) * 1000; }
  } else if (race.run) {
    if (ts > race.lightEnd) nextLight(ts);
    $('#raceTime').textContent = `${((ts - race.t0) / 1000).toFixed(1)} s`;
  }
  race.flash = Math.max(0, race.flash - 0.02);
  race.wind *= 0.9;
  raceDraw();
  if (race.run) race.raf = requestAnimationFrame(raceTick);
}
function raceFinish() {
  const secs = (race.now - race.t0) / 1000;
  raceStop();
  const stars = race.pen === 0 ? 3 : race.pen <= 2 ? 2 : 1;
  const best = S.raceBest[S.raceLevel];
  const rec = !best || secs < best;
  if (rec) S.raceBest[S.raceLevel] = +secs.toFixed(1);
  S.raceUnlocked = Math.max(S.raceUnlocked, Math.min(RACE.length - 1, S.raceLevel + 1));
  save(); confetti(); sfx.win(); addStars(stars);
  toast(`${'⭐'.repeat(stars)}  ${secs.toFixed(1).replace('.', ',')} s${rec ? ' – nytt rekord!' : ''}`);
  if (S.raceLevel < S.raceUnlocked) { S.raceLevel++; save(); }
  raceInfo();
  $('#raceStart').textContent = '🏁 Nästa bana';
}
function raceInfo() {
  $('#raceLevel').textContent = `Bana ${S.raceLevel + 1}`;
  const b = S.raceBest[S.raceLevel];
  $('#raceBest').textContent = `Rekord: ${b ? String(b).replace('.', ',') + ' s' : '–'}`;
}
$('#raceLevel').onclick = () => { if (race.run) return; S.raceLevel = (S.raceLevel + 1) % (S.raceUnlocked + 1); save(); race.p = 0; raceInfo(); raceDraw(); };
$('#raceStart').onclick = async () => {
  if (race.run) { raceStop(); return; }
  await needMic();
  Object.assign(race, { run: true, p: 0, pen: 0, light: 'red', count: 3, t0: performance.now(), lastT: 0, flash: 0 });
  $('#raceStart').textContent = '⏹ Avbryt';
  race.off = A.on((fr) => {
    race.meter(fr);
    const dt = race.lastT ? Math.min(0.1, (fr.t - race.lastT) / 1000) : 0;
    race.lastT = fr.t;
    if (race.count > 0) return;
    const blowing = ['s', 'mjuk', 'sch'].includes(fr.kind);
    const sp = RACE[S.raceLevel].speed;
    if (race.light === 'red' && blowing) {
      race.p = Math.max(0, race.p - dt * 0.12);
      race.flash = 1;
      if (!race.penThis) { race.pen++; race.penThis = true; sfx.meh(); }
    } else if (fr.kind === 's') {
      const v = sp * (0.55 + 0.45 * fr.sharp);
      race.p += v * dt; race.rot += v * dt * 30; race.wind = 0.9;
    } else if (blowing) {
      race.p += sp * 0.12 * dt; race.wind = 0.3;
    }
    if (race.p >= 1) { race.p = 1; raceFinish(); }
  });
  race.raf = requestAnimationFrame(raceTick);
};
enterHooks.race = () => { race.p = 0; race.light = 'red'; race.meter = makeMeter($('#raceMeter')); raceInfo(); raceDraw(); };
leaveHooks.race = raceStop;

// ---------- ORDJAKTEN ----------
const CATS = [
  { id: 'start', name: 'S i början', icon: '☀️', items: [['sol', '☀️'], ['säl', '🦭'], ['sax', '✂️'], ['socka', '🧦'], ['salt', '🧂'], ['sallad', '🥗'], ['cykel', '🚲'], ['citron', '🍋'], ['sand', '🏖️'], ['soppa', '🍲'], ['säng', '🛏️'], ['surfa', '🏄'], ['soffa', '🛋️'], ['sill', '🐟']] },
  { id: 'end', name: 'S i slutet', icon: '🚌', items: [['buss', '🚌'], ['glass', '🍦'], ['mus', '🐭'], ['hus', '🏠'], ['is', '🧊'], ['ris', '🍚'], ['tass', '🐾'], ['kaktus', '🌵'], ['ananas', '🍍'], ['kex', '🍪'], ['cirkus', '🎪'], ['kompass', '🧭'], ['potatis', '🥔'], ['plus', '➕']] },
  { id: 'mid', name: 'S i mitten', icon: '🧩', items: [['pussel', '🧩'], ['kasse', '🛍️'], ['kossa', '🐄'], ['glasögon', '👓'], ['dinosaurie', '🦕'], ['gräshoppa', '🦗'], ['muskel', '💪'], ['bastu', '🧖'], ['apelsin', '🍊'], ['mössa', '🧢'], ['basun', '🎺'], ['kasta', '🤾']] },
  { id: 'clus', name: 'S + bokstav', icon: '🐌', items: [['sten', '🪨'], ['stol', '🪑'], ['snigel', '🐌'], ['spindel', '🕷️'], ['smör', '🧈'], ['slott', '🏰'], ['svamp', '🍄'], ['snögubbe', '⛄'], ['spöke', '👻'], ['stövel', '👢'], ['häst', '🐴'], ['fisk', '🐟'], ['ost', '🧀'], ['svan', '🦢']] },
  { id: 'sent', name: 'Meningar', icon: '💬', sentence: true, items: [['Jag ser en sol', '👀☀️'], ['Sälen simmar snabbt', '🦭💨'], ['Musen äter ost', '🐭🧀'], ['Bussen står still', '🚌🛑'], ['Sigge sover i sängen', '🐍🛏️'], ['Sara sitter i solen', '👧☀️'], ['Glassen smälter', '🍦🥵'], ['Sex små sniglar', '6️⃣🐌']] },
  { id: 'twist', name: 'Tungvrickare', icon: '🌀', sentence: true, items: [['Sex laxar i en laxask', '🐟📦'], ['Sigge Snok slingrar sig sakta', '🐍🌀'], ['Sura sillar simmar söderut', '🐟🧭'], ['Sotiga sälar sover sött på stenar', '🦭💤'], ['Sex sega sniglar seglar sakta', '🐌⛵'], ['Sätt sockret i soppan, Sam!', '🍲🥄']] },
];
const highlight = (w) => w.replace(/(s|x|z|c(?=[eiyäö]))/gi, '<em>$1</em>');
const W = { cat: null, list: [], idx: 0, res: [], rec: null, chunks: [], url: null, coll: null, meter: null, meterOff: null, listening: false, timer: 0 };
function renderCats() {
  $('#catList').classList.remove('hidden'); $('#round').classList.add('hidden');
  $('#catList').innerHTML = CATS.map((c) => {
    const b = S.catBest[c.id];
    return `<button class="card c4" data-cat="${c.id}"><b>${c.icon} ${c.name}</b><small>${c.items.slice(0, 3).map((i) => i[0]).join(', ')}…</small>${b ? `<span class="stars">Bäst: ${b} ⭐</span>` : ''}</button>`;
  }).join('');
}
$('#catList').addEventListener('click', (e) => { const b = e.target.closest('[data-cat]'); if (b) startRound(b.dataset.cat); });
async function startRound(id) {
  await needMic();
  W.cat = CATS.find((c) => c.id === id);
  W.list = shuffle(W.cat.items).slice(0, W.cat.sentence ? 5 : 6);
  W.idx = 0; W.res = [];
  $('#catList').classList.add('hidden'); $('#round').classList.remove('hidden');
  W.meter = makeMeter($('#wordMeter'));
  W.meterOff = A.on((fr) => W.meter(fr));
  showWord();
}
function showWord() {
  const [w, e] = W.list[W.idx];
  $('.wordcard').classList.toggle('sentence', !!W.cat.sentence);
  $('#wEmoji').textContent = e; $('#wText').innerHTML = highlight(w);
  $('#roundBar').style.width = `${(W.idx / W.list.length) * 100}%`;
  $('#wResult').innerHTML = `<p style="color:var(--muted)">${W.cat.sentence ? 'Läs meningen högt' : 'Säg ordet högt'} – tänk på tungan bakom gallret! 🐍</p>`;
  $('#wButtons').classList.remove('hidden'); $('#wAfter').classList.add('hidden');
  $('#wSay').textContent = '🎤 Säg det!'; $('#wSay').classList.remove('listening');
}
function startListen() {
  W.listening = true;
  $('#wSay').textContent = '⏹ Klar'; $('#wSay').classList.add('listening');
  $('#wResult').innerHTML = '<p>Jag lyssnar… 👂</p>';
  W.coll = A.collect();
  W.chunks = [];
  try {
    W.rec = new MediaRecorder(A.stream);
    W.rec.ondataavailable = (e) => e.data.size && W.chunks.push(e.data);
    W.rec.start();
  } catch { W.rec = null; }
  const t0 = performance.now(), max = W.cat.sentence ? 8000 : 4000;
  let heard = 0, lastSound = t0;
  const check = () => {
    if (!W.listening) return;
    const now = performance.now(), fr = A.last;
    if (fr && fr.kind !== 'tyst') { lastSound = now; heard++; }
    if (now - t0 > max || (heard > 10 && now - lastSound > (W.cat.sentence ? 1100 : 800))) return stopListen();
    W.timer = requestAnimationFrame(check);
  };
  W.timer = requestAnimationFrame(check);
}
function stopListen() {
  if (!W.listening) return;
  W.listening = false; cancelAnimationFrame(W.timer);
  const runs = W.coll.stop();
  if (W.rec && W.rec.state !== 'inactive') {
    W.rec.onstop = () => { if (W.url) URL.revokeObjectURL(W.url); W.url = W.chunks.length ? URL.createObjectURL(new Blob(W.chunks, { type: W.rec.mimeType })) : null; };
    W.rec.stop();
  }
  judge(runs);
}
function judge(runs) {
  let stars, kind;
  if (!runs.length) { stars = 0; kind = 'ingen'; }
  else if (!W.cat.sentence) {
    const best = runs.reduce((a, b) => (b.contrast > a.contrast ? b : a));
    kind = best.kind;
    stars = kind === 's' ? 3 : kind === 'mjuk' && best.contrast >= A.sTh - 2.5 ? 2 : 1;
  } else {
    const good = runs.filter((r) => r.kind === 's').length, frac = good / runs.length;
    stars = frac >= 0.75 ? 3 : frac >= 0.5 ? 2 : 1;
    const bad = runs.filter((r) => r.kind !== 's');
    kind = stars === 3 ? 's' : bad.filter((r) => r.kind === 'sch').length > bad.length / 2 ? 'sch' : 'mjuk';
  }
  W.res[W.idx] = Math.max(W.res[W.idx] || 0, stars);
  const msg = kind === 's' ? pick(FEED.s) : FEED[kind];
  $('#wResult').innerHTML = `<div class="st">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</div><p>${msg}</p>`;
  stars === 3 ? sfx.good() : sfx.meh();
  $('#wButtons').classList.add('hidden'); $('#wAfter').classList.remove('hidden');
  $('#wListen').classList.toggle('hidden', !window.MediaRecorder);
}
$('#wSay').onclick = () => (W.listening ? stopListen() : startListen());
$('#wAgain').onclick = () => { showWord(); startListen(); };
$('#wListen').onclick = () => { if (W.url) new Audio(W.url).play(); else toast('Ingen inspelning än'); };
$('#wOk').onclick = () => { W.res[W.idx] = 3; $('#wResult').innerHTML = `<div class="st">⭐⭐⭐</div><p>Den vuxna säger: snyggt! 👍</p>`; sfx.good(); };
$('#wNext').onclick = () => {
  W.idx++;
  if (W.idx < W.list.length) return showWord();
  const total = W.res.reduce((a, b) => a + (b || 0), 0), max = W.list.length * 3;
  $('#roundBar').style.width = '100%';
  S.catBest[W.cat.id] = Math.max(S.catBest[W.cat.id] || 0, total); save();
  const earned = Math.round(total / 3);
  $('.wordcard').classList.remove('sentence');
  $('#wEmoji').textContent = total >= max * 0.8 ? '🏆' : total >= max * 0.5 ? '🎉' : '💪';
  $('#wText').textContent = `${total} av ${max} ⭐`;
  $('#wResult').innerHTML = `<p>${total >= max * 0.8 ? 'Wow, vilka vassa S!' : total >= max * 0.5 ? 'Bra kämpat – det låter bättre och bättre!' : 'Bra tränat! Varje försök gör tungan starkare.'}</p>`;
  $('#wAfter').classList.add('hidden'); $('#wButtons').classList.remove('hidden');
  $('#wSay').textContent = '← Fler ord'; $('#wSay').onclick = () => { $('#wSay').onclick = () => (W.listening ? stopListen() : startListen()); renderCats(); };
  confetti(); sfx.win(); addStars(earned);
};
enterHooks.words = renderCats;
leaveHooks.words = () => { if (W.listening) { W.listening = false; W.coll?.stop(); try { W.rec?.stop(); } catch {} } W.meterOff?.(); W.meterOff = null; };

// ---------- INSTÄLLNINGAR ----------
let setOff = null;
function setStrictUI() { $$('#strictSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.v === S.strict)); }
$('#strictSeg').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; S.strict = A.strict = +b.dataset.v; save(); setStrictUI(); };
function setAttach() {
  $('#setMic').classList.add('hidden');
  const up = makeMeter($('#setMeter'));
  setOff = A.on((fr) => {
    up(fr);
    $('#setDebug').textContent = `typ=${fr.kind}  kontrast=${fr.contrast.toFixed(1)} dB (gräns ${A.sTh})  S-band över brus=${fr.hiAbove.toFixed(0)} dB  röst=${fr.voice.toFixed(0)}`;
  });
}
$('#setMic').onclick = async () => { await needMic(); setAttach(); };
$('#resetBtn').onclick = () => { if (confirm('Nollställa alla stjärnor och nivåer?')) { localStorage.removeItem(KEY); location.reload(); } };
enterHooks.settings = () => { setStrictUI(); if (A.ready) setAttach(); };
leaveHooks.settings = () => { setOff?.(); setOff = null; };

// ---------- Start ----------
go('home');
window.__sigge = { S, A, W, race, bal, go };

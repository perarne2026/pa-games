// Kräver playwright (finns i ~/projects/evernote-export) och en server: python3 -m http.server 8791 i ormen-sigge/
const { chromium } = require(process.env.PLAYWRIGHT || '/Users/pa/projects/evernote-export/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream',`--use-file-for-fake-audio-capture=${__dirname}/test.wav`,'--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 820, height: 1000 } });
  const errs=[]; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type()==='error' && errs.push(m.text()));
  await p.goto('http://localhost:8791/');
  await p.evaluate(async () => { await window.__sigge.A.start(); window.log=[]; window.__sigge.A.on(f=>window.log.push([Math.round(performance.now()), f.kind, +f.contrast.toFixed(1), +f.hiAbove.toFixed(0), +f.voice.toFixed(0)])); });
  await p.waitForTimeout(14000);
  const log = await p.evaluate(() => window.log);
  // summera per 250ms
  const t0=log[0][0]; const bins={};
  for (const [t,k,c,h,v] of log){ const i=Math.floor((t-t0)/500); (bins[i]=bins[i]||[]).push(k+':'+c+':'+h+':'+v); }
  for (const i in bins){ const ks={}; bins[i].forEach(x=>{const k=x.split(':')[0]; ks[k]=(ks[k]||0)+1}); console.log((i*0.5).toFixed(1), JSON.stringify(ks), bins[i][Math.floor(bins[i].length/2)]); }
  console.log('ERR', errs);
  await b.close();
})();

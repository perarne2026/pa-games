// Kräver playwright (finns i ~/projects/evernote-export) och en server: python3 -m http.server 8791 i ormen-sigge/
const { chromium } = require(process.env.PLAYWRIGHT || '/Users/pa/projects/evernote-export/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream',`--use-file-for-fake-audio-capture=${__dirname}/test.wav`,'--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 430, height: 900 }, deviceScaleFactor: 1 });
  const errs=[]; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type()==='error' && errs.push(m.text()));
  await p.goto('http://localhost:8791/');
  await p.evaluate(()=>{window.__sigge.S.stars=14;}); await p.evaluate(()=>window.__sigge.go('home'));
  await p.waitForTimeout(500); await p.screenshot({path:'01home.png'});
  await p.click('[data-go=learn]'); await p.click('#stepNext'); await p.click('#stepNext'); await p.waitForTimeout(200); await p.screenshot({path:'02learn3.png'});
  await p.click('#stepNext'); await p.click('#stepNext'); await p.click('.step.on .micBtn'); await p.click('#micAllow'); await p.waitForTimeout(1600); await p.screenshot({path:'03learn5.png'});
  await p.evaluate(()=>window.__sigge.go('home'));
  await p.click('[data-go=balloon]'); await p.click('#balStart'); await p.waitForTimeout(1500); await p.screenshot({path:'04balloon.png'});
  await p.waitForTimeout(2500); await p.screenshot({path:'05balloon2.png'});
  console.log('bal', await p.evaluate(()=>({f:window.__sigge.bal.f, lvl:window.__sigge.S.balLevel})));
  await p.evaluate(()=>window.__sigge.go('home'));
  await p.click('[data-go=race]'); await p.click('#raceStart'); await p.waitForTimeout(6000); await p.screenshot({path:'06race.png'});
  console.log('race', await p.evaluate(()=>({p:window.__sigge.race.p, pen:window.__sigge.race.pen, light:window.__sigge.race.light})));
  await p.evaluate(()=>window.__sigge.go('home'));
  await p.click('[data-go=words]'); await p.screenshot({path:'07cats.png'});
  await p.click('[data-cat=start]'); await p.click('#wSay'); await p.waitForTimeout(4500); await p.screenshot({path:'08word.png'});
  console.log('word', await p.evaluate(()=>window.__sigge.W.res));
  await p.evaluate(()=>window.__sigge.go('settings')); await p.waitForTimeout(500); await p.screenshot({path:'09set.png', fullPage:true});
  console.log('ERR', errs);
  await b.close();
})();

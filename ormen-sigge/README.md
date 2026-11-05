# Ormen Sigge 🐍

S-träning mot läsp för barn (~9 år). Spelet lyssnar på mikrofonen och visar live om S:et är **vasst**, **luftigt** (läsp, tungan mellan tänderna) eller **sch-igt** (sidoläsp). Inspirerat av [Speech Blubs 7 S-aktiviteter](https://speechblubs.com/sv/blog/7-roliga-logopediaktiviteter-for-s-ljudet-for-ditt-barn).

**Live:** https://ormen-sigge.vercel.app (byggt 2026-11-03)

## Stack
Vanilla HTML/CSS/JS + Web Audio. Ingen Kaplay, inga build-steg. Mikrofon kräver HTTPS (Vercel) och användargest (iOS).

| Fil | Innehåll |
|---|---|
| `audio.js` | S-detektorn (`A`) — FFT, brusgolv, klassning per frame, `collect()`/`runs()` för ord |
| `app.js` | Skärmar, mätare, spel, progress (localStorage `ormen-sigge-v1`) |
| `index.html`, `style.css` | UI |
| `test/` | Syntetiska testljud + Playwright-tester |

## Detektorn
Per frame (~60 fps, FFT 2048) räknas **kontrast** = energi/Hz i 4,5–11 kHz minus energi/Hz i 1,5–4 kHz (dB).

| Klass | Villkor | Betyder |
|---|---|---|
| `tyst` | S-band < 6 dB och totalt < 8 dB över brusgolv | — |
| `röst` | lågband (150–1200 Hz) > 22 dB över S-band | vokaler |
| `svag` | S-band < 10 dB över brus | för lite luft |
| `sch` | kontrast < `SCH_TH` (−5) | sch / sidoläsp |
| `mjuk` | kontrast < `STRICT_TH[strict]` | luftigt / läsp |
| `s` | annars | vasst S ✅ |

`STRICT_TH = [3.5, 6, 9]` (Snäll/Lagom/Sträng, väljs under ⚙️). Brusgolvet kalibreras första ~0,7 s och följer sedan tystnad.

getUserMedia körs med `echoCancellation/noiseSuppression/autoGainControl: false`, annars filtreras S-energin bort.

**Ord:** `runs()` hittar fräs-sjok ≥ 70 ms. För ord räknas det bästa sjoket (f i "soffa" straffas inte). För meningar räknas andelen sjok som är `s`: ≥75 % ger 3 ⭐ och ≥50 % ger 2 ⭐.

## Spelen
- **Tungskolan:** 6 steg (ormljud, bit ihop och le, tungan bakom gallret, smal luft, T-tricket, hör skillnaden), SVG-munnar, spegel via framkamera, live-mätare. Ger 2 ⭐ en gång per dag.
- **Ballongen:** `s` fyller, `mjuk/sch` läcker och uppehåll > 0,4 s tömmer. Mål per nivå: 1,5 → 10 s.
- **Bomullsracet:** S på grönt, tyst på rött (straff + bakåt). 3 banor med kortare gröntid. Stjärnor efter antal straff.
- **Ordjakten:** början/slutet/mitten/S+bokstav/meningar/tungvrickare. MediaRecorder gör att barnet kan lyssna på sig själv, och 👍 låter en vuxen överstyra.

**Ordlistor:** undvik sj-ljud. Det betyder sk + e/i/y/ä/ö (sked), sj/stj/skj, och **rs** (blir retroflext i rikssvenska: kurs, Lars).

## Testa
```bash
cd ~/projects/games/ormen-sigge && python3 -m http.server 8791 &
python3 test/gen-testljud.py          # → test/test.wav: tyst, s, läsp-brus, sch, vokal
node test/detektor-test.js            # klass per 0,5 s — förväntat: s → mjuk → sch → röst
node test/speltest.js                 # klickar igenom alla vyer, skärmbilder i cwd
```
Chromium matar in wav-filen som mikrofon (`--use-file-for-fake-audio-capture`).

## Deploy
```bash
export VERCEL_TOKEN=$(grep -i '^VERCEL_TOKEN=' ~/pa/secrets/.env | cut -d= -f2-)
vercel deploy --prod --yes --scope edjackens-projects --token "$VERCEL_TOKEN"
```

## Känd skuld / nästa steg
- **Trösklarna är inte validerade mot ett riktigt barn**, bara mot syntetiskt brus. Justera med mikrofontestet under ⚙️, som visar kontrast live.
- Inte testat i iPad Safari, där MediaRecorder-mimetype och mikrofonens högfrekvensrespons kan avvika.
- Inget sätt att följa framsteg över tid (t.ex. andel vassa S per dag).

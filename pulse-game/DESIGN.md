# Pulse — Speldesign

## Koncept
Biofeedback-spel där spelaren måste kontrollera sin puls för att klara levels. Mäter puls via telefonens kamera (finger över bakre kamera + blixt).

## Mekanik — Checkpoint-modellen
1. **Uppdrag** — spelet visar mål: "Höj till 100 BPM!"
2. **Fri fas** — spelaren springer, hoppar, gör armhävningar (timer tickar)
3. **Mät-fas** — "Lägg fingret på kameran!" (~10 sek mätning)
4. **Resultat** — klarade du målet?

Fingret måste vara på kameran under mätning, så live + rörelse funkar inte. Checkpoint-modellen gör spelet fysiskt aktivt.

## Level-typer
- **Höj pulsen** — "Nå 100 BPM på 30 sekunder" (spring, hoppa)
- **Sänk pulsen** — "Sänk till 70 BPM på 45 sekunder" (andas lugnt — svårare!)
- **Precision** — "Håll 80-85 BPM i 20 sekunder"

## Visuellt
- En figur/raket/ballong som stiger när pulsen höjs, sjunker när den sänks
- Målzon visas som ett fält figuren ska nå
- Pulsgrafen i bakgrunden

## Tech
- Ren HTML/JS, ingen build
- Kamera-PPG via `getUserMedia` + torch
- Deploy via Vercel
- Kaplay.js för spelgrafik (valfritt)

## Status
- [x] Pulsmätare-prototyp klar
- [x] Deployad: https://pulse-game-ashen.vercel.app
- [x] Checkpoint-flöde (uppdrag → fri fas → mät-fas → resultat)
- [x] Raket-visualisering med flame + trail (canvas)
- [x] 6 levels (höj, sänk, precision)
- [x] Stjärnsystem (1-3 stjärnor beroende på prestation)
- [x] Level-select med progress-sparning (localStorage)
- [x] Målzon-visualisering på canvas
- [ ] Deploya ny version
- [ ] Testa med barnen

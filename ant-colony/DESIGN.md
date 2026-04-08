# Myrkolonin — Speldesign

## Koncept
Bygg en myrkoloni under jorden. Utforska okänd mark, samla resurser, försvara mot hot.
Top-down 2D, mobilfokus, svenska.

## Plattform
- **Mobil först** (touch-kontroller primärt)
- Desktop fungerar men prioriteras inte

## Kontroller
- **Tap** på mörk/jordiga ruta = lägg grävplan (kortaste vägen ritas ut automatiskt)
- **Tap** på grönt ägg = kläck det direkt (belönar aktiva spelare)
- **Drag/swipe** = panorera kartan
- **Pinch** = zooma in/ut (+ knappar i hörnet)
- **Hem-knapp** = centrera på drottningen

## Kärnan: Grävplan-systemet
Spelaren tappar på en ruta → systemet beräknar kortaste grävvägen dit från närmaste tunnel → rutor markeras med gul ram → lediga myror tilldelas automatiskt och gräver parallellt.

**Max grävdistans = antal myror × 3.** Fler myror = längre räckvidd = snabbare expansion.

## Drottningen
- Sitter i en 3×3 kammare i mitten
- Lägger **ett ägg** var 15:e sekund
- Äggen syns som små vita/beige cirklar i kammaren
- Ägget **växer** visuellt under 3 sekunder (kan inte kläckas)
- Efter 3 sek → **grönt pulsande** = kan kläckas med tap
- Efter 15 sek → **auto-kläcks** om man inte tryckt
- Aktiva spelare belönas med snabbare tillväxt tidigt i spelet
- *Framtida: auto-hatch-uppgradering, resurskostnad för ägg*

## Myrtyper (implementeras stegvis)

### Fas 1 (nu)
- **Arbetare** — gräver tunnlar, vandrar runt

### Fas 2 (resurser)
- Arbetare samlar resurser och bär till kammaren
- **Spejare** — snabb, avslöjar 3 rutor radie, bär inte mat
- Drottningen behöver mat+protein för att lägga ägg

### Fas 3 (hot)
- **Soldat** — strider mot spindlar/hot, kostar mer protein
- Spelaren väljer myrtyp genom att tappa på drottningen

## Resurser (Fas 2)
Dolda i ~15% av rutor. Avslöjas vid grävning.

| Resurs | Frekvens | Effekt |
|--------|----------|--------|
| Smulor | 40% | Bas-mat |
| Vattendroppe | 20% | Koloni-överlevnad |
| Fruktbit | 15% | Bra mat |
| Död insekt | 12% | Protein → ägg |
| Honungsdagg (bladlöss) | 8% | Passiv inkomst +1 mat/10sek |
| Sockerbit | 5% | Stor poängboost, sällsynt |

## Hot (Fas 3)
Dolda i ~5% av rutor. Utforskning = risk/reward.

| Hot | Effekt |
|-----|--------|
| Giftsvamp | Dödar arbetare/spejare som passerar |
| Spindelnäste | Spawnar spindlar som rör sig mot drottningen |
| Rivalkoloni | Expanderar mot spelaren, krig eller omväg |

## Strid (Fas 3)
- Spindlar pathfindar mot drottningkammaren
- Soldat vs spindel: 2 sek strid → spindel dör, soldat -1 HP
- 3 spindlar når drottningen → game over
- Soldater patrullerar automatiskt, engagerar hot inom 3 rutor

## Metriker
- **Kolonins ålder** (tid)
- **Kolonins storlek** = myror + tunnlar
- **Score** = myror × 10 + tunnlar × 2 + ålder_sek
- Visas i HUD och på game over

## Kartan
- 40×40 grid, 32px per ruta
- **Fog of war** — allt startar svart, avslöjas vid grävning
- **Sten** (~8%) — kan inte grävas igenom
- Start: 3×3 kammare + 4 korta tunnlar ut + 3 arbetare

## Zoom
- Pinch-to-zoom på mobil
- Scroll-zoom på desktop
- Zoom-knappar (+/−) i nedre högra hörnet
- Range: 0.5× till 2.0×

## Nivåer (Fas 4)
1. "Första tunneln" — Gräv 20 tunnlar
2. "Matsamlaren" — Samla 50 mat
3. "Väx kolonin" — Nå 30 myror
4. "Sockerjakt" — Hitta 3 sockerbitar
5. "Spindelkriget" — Besegra 10 spindlar
6. "Rivalerna" — Besegra rivalkolonin
7. "Imperiet" — Nå 200 myror

Plus **Fritt spel** (highscore).

## Framtidsvision
- **Flera simultana kolonier** — testa strategier parallellt
- **Auto-hatch uppgradering** — köps med resurser, drottningen kläcker ägg själv
- **Större kartor** vid fler myror
- Potentiellt: App Store / Google Play (inga upphovsrättsproblem här!)

## Designprinciper
1. **Gradvis uppfaltning** — börja enkelt, nya mekaniker en i taget
2. **Allt ur myrans perspektiv** — sockerbitar, inte ädelstenar
3. **Belöna aktivt spelande** — manuell kläckning snabbare
4. **Självförklarande** — varje moment ska vara tydligt utan instruktioner
5. **Mobil först** — touch-kontroller, porträttläge stöds

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

## Kartlayout — vertikal
Kartan är vertikal (30 bred × 50 djup). Ytan är överst.

```
Rad 0:    ~~~ himmel/markyta ~~~
Rad 1:    ingångshål (öppning till ytan)
Rad 2-4:  grunt (kammare, tunnlar)
Rad 5+:   djupt (utforskning, bättre resurser)
```

Drottningkammaren börjar grunt (rad 3-5). Djupare = bättre resurser men längre transport.

## Kärnan: Sandkorn-grävning
Varje dirt-ruta har **sandkorn** (2-5 beroende på djup). Myror bär bort ett korn i taget **upp till ytan** och dumpar det. Rutan blir tunnel först när alla korn är borta.

- **Nära ytan (rad 1-5):** 2 korn
- **Medium (rad 6-15):** 3 korn
- **Djupt (rad 16+):** 4-5 korn

Detta ger:
- **Myrstigar** — flera myror springer med sand längs samma tunnlar
- **Djup = kostnad** — längre till ytan = långsammare
- **Lagarbete** — en plan sysselsätter alla lediga myror, inte bara en
- **Visuell progress** — halvgrävda rutor syns (ljusare färg, färre prickar)

## Grävplan-systemet
Spelaren dubbelklickar → systemet beräknar väg → markeras gult. **Alla lediga myror** jobbar på samma plan. Max antal aktiva planer begränsas av myrantal (inte rutor), t.ex. 1 plan per 5 myror.

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

## Drottning-uppgradering (framtida)
Drottningen kan flyttas djupare för uppgraderingar. Kräver att tunnlar är grävda dit + resurskostnad.

| Nivå | Djup | Kammare | Kostnad | Fördel |
|------|------|---------|---------|--------|
| 1 | Rad 4 (start) | 3×3 (8 platser) | — | Ägg var 15 sek |
| 2 | Rad 15+ | 4×4 (15 platser) | 20S + 10P | Ägg var 10 sek |
| 3 | Rad 40+ | 5×5 (24 platser) | 50S + 30P | Ägg var 7 sek + soldater |
| 4 | Rad 45+ | 5×5 | 80S + 50P | Ägg var 5 sek + spejare |

Kammaren växer vid uppgradering → mer plats för ägg + bladlöss.
Bladlöss och ägg delar på kammar-platser (konkurrens).
Flytten: drottningen bärs genom tunnlar (pathfinding, långsam). Inga ägg under flytt.

## Framtidsvision
- **Flera simultana kolonier** — testa strategier parallellt
- **Större kartor** vid fler myror
- Potentiellt: App Store / Google Play (inga upphovsrättsproblem här!)

## Designprinciper
1. **Gradvis uppfaltning** — börja enkelt, nya mekaniker en i taget
2. **Allt ur myrans perspektiv** — sockerbitar, inte ädelstenar
3. **Belöna aktivt spelande** — manuell kläckning snabbare
4. **Självförklarande** — varje moment ska vara tydligt utan instruktioner
5. **Mobil först** — touch-kontroller, porträttläge stöds

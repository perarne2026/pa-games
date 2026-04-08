# Myrvägen — Speldesign

## Koncept
Bygg en myrkoloni under jorden. Utforska okänd mark, samla resurser, försvara mot hot.
Top-down 2D, mobilfokus, svenska.

## Plattform
- **Mobil först** (touch-kontroller primärt)
- Desktop fungerar men prioriteras inte

## Kontroller
- **Dubbeltap** på dirt/fog = lägg grävplan (kortaste vägen ritas ut)
- **Singeltap fog** = skicka spejare dit (om spejare finns, annars dubbeltap-grävplan)
- **Singeltap ägg** (grönt) = kläck direkt
- **Singeltap drottning** = uppgradera (om möjligt)
- **Singeltap kammare-tile** (nivå 2+) = cykla äggtyp (arbetare/spejare)
- **Singeltap tom kammare** (farm unlockad) = välj farm-typ, dubbeltap = bygg
- **Dubbeltap kammare** = pausa/starta ägg
- **Drag/swipe** = panorera kartan
- **Pinch / scrollhjul** = zooma in/ut (+ knappar i hörnet)
- **Hem-knapp** = centrera på drottningen

## Kartlayout — vertikal
Kartan är vertikal (30 bred × 50 djup). Ytan är överst.

```
Rad 0:    ~~~ markyta ~~~
Rad 1:    ingångshål
Rad 2-4:  grunt (startkammare)
Rad 5-12: medium (smulor, vatten, frukt)
Rad 8+:   svampsporer spawnar
Rad 12+:  djupt (insekter, bladlöss, socker)
Rad 15+:  lerkällor spawnar
```

## Sandkorn-grävning
Varje dirt-ruta har **sandkorn** (2-5 beroende på djup). Myror bär bort ett korn i taget **upp till ytan** och dumpar det i sandhögar. Rutan blir tunnel när alla korn borta.

- **Nära ytan (rad 1-5):** 2 korn
- **Medium (rad 6-15):** 3 korn
- **Djupt (rad 16+):** 4-5 korn

## Myrtyper

### Arbetare
- Gräver tunnlar, bär sand till ytan, samlar resurser
- Kostnad: 3 socker + 1 protein
- Doftsinne: dirt-tiles intill tunnlar visar resurs-färg (visuell hint)

### Spejare (kräver nivå 2)
- Rör sig i tunnlar/yta med 1.5× hastighet
- **Doftsinne:** avslöjar fog i radie 4 (cirkulärt) medan den rör sig
- Auto-skapar grävplaner mot resurser den luktar sig till
- Kan inte gräva eller bära resurser
- Spelaren dirigerar genom att tappa på fog
- Kostnad: 4 socker + 1 protein
- Visuellt: blå, pulserande ring vid scouting

### Soldat (framtida — Fas 3)
- Strider mot hot
- Kostnad: 3 socker + 3 protein

## Resurser
Dolda i ~15% av rutor. Avslöjas vid grävning eller spejardoft.

| Resurs | Typ | Effekt |
|--------|-----|--------|
| Smulor | Vanlig | +1 socker |
| Vatten | Vanlig | +2 vatten |
| Frukt | Medium | +2 socker, +1 protein |
| Insekt | Medium | +2 protein |
| Sockerbit | Sällsynt | +4 socker |
| Bladlöss | Sällsynt | Skapar bladlöss-farm |
| Svampsporer | Blueprint (djup 8+) | Unlock: svampodling |
| Lerkälla | Blueprint (djup 15+) | Unlock: vattenkälla |

**Resursbrist-balans:** Spawning viktas mot det kolonin saknar — vatten < 5 ger 3× chans för vattenresurser, protein < 5 ger 2.5×, rent socker minskas vid överskott (>50).

## Farmar — passiv resursproduktion

| Farm | Kostnad | Producerar | Intervall | Placering |
|------|---------|-----------|-----------|-----------|
| Bladlöss | Gratis (hittas) | +1 socker | 10s | Kammare |
| Svampodling | 8S + 4V | +1 protein | 12s | Tom kammare-tile |
| Vattenkälla | 6S + 4P | +1 vatten | 15s | Tom kammare-tile |

- Blueprint-resurser unlocks respektive farm-typ
- Byggs genom att tappa tom kammare-tile → cykla val → dubbeltap bekräfta
- Alla farmar flyttar med drottningen vid nivåuppgradering
- HUD visar farm-antal: "Protein: 12 (+2)"

## Drottning & Nivåer

| Nivå | Djup | Kammare | Kostnad | Ägg-intervall | Unlocks |
|------|------|---------|---------|---------------|---------|
| 1 | Rad 4 (start) | 3×3 | — | 15 sek | Arbetare |
| 2 | Rad 15+ | 5×5 | 20S + 10P | 10 sek | Spejare, äggtyp-val |
| 3 | Rad 40+ | 5×5 | 50S + 30P | 7 sek | — |
| 4 | Rad 45+ | 5×5 | 80S + 50P | 5 sek | — |

Flytt: drottningen bärs genom tunnlar (pathfinding, 18 px/s). Inga ägg under flytt. Ingen auto-save under flytt.

## Vatten
- Kolonin förbrukar 1 vatten var 30:e sekund
- Vatten = 0 → uttorkning: alla myror rör sig 50% långsammare
- Vattenkälla-farmar motverkar detta

## Fog of War
- Allt startar svart (fog), avslöjas vid grävning (radie 1)
- Spejare avslöjar radie 4 via doftsinne
- Arbetare visar resurs-hint på intilliggande dirt (pulserande färgcirkel)

## Metriker & HUD
- **Score** = myror × 10 + tunnlar × 2
- **HUD:** Score, myror (spejarantal), tid, socker (+farms), protein (+farms), vatten (+farms), nivå, äggtyp
- Meny: två knappar — "Fortsätt" / "Nytt spel"

## Hot (Fas 3 — ej implementerat)
- Giftsvamp, spindelnäste, rivalkoloni
- Soldater patrullerar och engagerar hot

## Designprinciper
1. **Gradvis uppfaltning** — nya mekaniker en i taget
2. **Allt ur myrans perspektiv** — sockerbitar, inte ädelstenar
3. **Belöna aktivt spelande** — manuell kläckning snabbare
4. **Självförklarande** — varje moment tydligt utan instruktioner
5. **Mobil först** — touch-kontroller, porträttläge
6. **Realistisk inspiration** — bladlöss, svampodling, doftsinne baserat på riktig myrbiologi

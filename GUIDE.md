# Spel med Claude Code

## Snabbstart
1. Kopiera template: `cp -r template/ mitt-nya-spel/`
2. Beskriv spelidén för Claude
3. Deploya: `cd mitt-nya-spel && ./deploy.sh spelets-namn`

## Spelmotor: Kaplay.js
- Docs: https://kaplayjs.com/
- Enkel syntax, touch-stöd, physics ur lådan
- Allt i en HTML + JS-fil, inga build-steg

## Assets & grafik
- **PixelLab** (pixellab.ai) — AI pixel art sprites, tilesets, animationer
- **SEELE AI** (seeles.ai) — AI spritesheets med transparent bakgrund
- **jsfxr** (sfxr.me) — retro-ljudeffekter direkt i webbläsaren

## Deploy
- **Vercel**: `vercel --yes` (snabbast)
- **itch.io**: zippa och ladda upp (bäst för att dela)
- **Netlify Drop**: dra mappen till netlify.com/drop
- **GitHub Pages**: pusha till repo med Pages aktiverat

## Tips
- Kaplay har `touchToMouse: true` — touch funkar automatiskt
- `stretch: true, letterbox: true` — skalar till alla skärmar
- Spara highscore med `localStorage`
- Lägg sprites i `sprites/`, ljud i `sounds/`

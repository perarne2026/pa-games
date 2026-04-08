#!/bin/bash
# Deploya spelet till Vercel (eller ändra till annan tjänst)
# Användning: ./deploy.sh [projektnamn]

NAME=${1:-"mitt-spel"}

if command -v vercel &> /dev/null; then
  vercel --yes --name "$NAME"
elif command -v netlify &> /dev/null; then
  netlify deploy --prod --dir .
else
  echo "Installera vercel: npm i -g vercel"
  echo "Eller netlify: npm i -g netlify-cli"
  echo ""
  echo "Alternativt: ladda upp som ZIP till itch.io"
fi

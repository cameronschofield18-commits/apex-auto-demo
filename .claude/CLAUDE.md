# Apex Auto Group — Dealership Demo Site

## What this is
A portfolio showpiece: a fictional used-car dealership website with an AI lead-capture + auto-follow-up layer. Built to demo to prospects (web clients and potential employers), not for a real business.

Scope doc: `C:\Users\estrix\html-artifacts\2026-06-11-dealership-demo-scope.html`

## Goals
- Look like a premium, modern dealership site (deliberately the opposite of cluttered 2012 dealer sites)
- Phase 1: static shell (home, inventory grid, vehicle detail) — THIS PHASE
- Phase 2: AI chat assistant (Claude API) that answers inventory questions and captures leads
- Phase 3: instant auto-follow-up shown in a mock inbox UI (no real email/SMS sending)
- Phase 4: lead dashboard + 3-minute demo video

## Design direction
- Near-black base (#0E1116), elevated surfaces (#1A1F27), warm metallic gold accent (#C8A24A), off-white type (#E7E3DA), cool blue (#2A6B8A) reserved for the AI assistant
- Fonts: Newsreader (display serif) + Geist (body/UI)
- Photography-forward, generous space, restrained motion

## Tech decisions
- Plain HTML/CSS/JS, no framework (speed over reusability — this is a showpiece)
- Inventory is fake data in `public/data/inventory.json` (10 vehicles)
- Vehicle detail page is one template driven by `?id=` query param
- Serve locally with `node serve.mjs` at http://localhost:3000 (serves public/ and mounts /api/chat)
- Screenshots: `node screenshot.mjs http://localhost:3000/ [label]` (puppeteer installed in this project)
- Deploy: Vercel (auto-deploy on push to main), serverless function at api/chat.js, ANTHROPIC_API_KEY in Vercel env vars + local .env only

## Conventions
- No emojis, no em dashes (user's writing style applies to site copy too)
- All vehicle photos from images.unsplash.com (free, no real dealer branding)
- Business is fictional: Apex Auto Group, used + certified pre-owned, suburban

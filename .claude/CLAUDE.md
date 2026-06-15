# Apex Auto Group — Dealership Demo Site

## What this is
A portfolio showpiece: a fictional new + pre-owned exotic/performance dealership website with an AI lead-capture + auto-follow-up layer. Built to demo to prospects (web clients and potential employers), not for a real business.

Scope doc: `C:\Users\estrix\html-artifacts\2026-06-11-dealership-demo-scope.html`
Live site: https://apex-auto-demo.vercel.app (canonical; GitHub Pages retired)

## Goals
- Look like a premium, modern dealership site (deliberately the opposite of cluttered 2012 dealer sites)
- Phase 1: static shell (home, inventory grid, vehicle detail) — DONE
- Phase 1.5: dash-hero redesign + Signal palette — DONE (see specs/plans 2026-06-11)
- Phase 2: AI chat assistant (Claude API) answering inventory Q&A + capturing leads — DONE (specs/plans 2026-06-12)
- Phase 3: instant auto-follow-up (AI SMS+email+drip) in a mock phone + dash expansion — DONE (specs/plans 2026-06-15)
- New + Pre-Owned expansion (condition field, dash category buttons, inventory tabs) — DONE (specs/plans 2026-06-15)
- Phase 4: lead dashboard (reads localStorage["apex-leads"]) + 3-minute demo video

## Design direction (Signal palette, applied site-wide)
- Warm near-black base (#0D0D0E), surfaces (#18181A), bone text (#ECE7DC), single caliper-red accent (#D64545; #C73E3E on solid buttons for AA contrast)
- Red is reserved for: CTAs, gauge needle, prices that dropped, hot/lead signals. Never small body text.
- Fonts: Newsreader (display serif) + Geist (body/UI) + Geist Mono (labels)
- Home hero is a functional digital dash: live gauge (stock count), scrollable featured screen, cycling comms feed (AI lead rows land here)
- Photography-forward, generous space, restrained motion

## Tech decisions
- Plain HTML/CSS/JS, no framework (speed over reusability — this is a showpiece)
- Inventory is fake data in `public/data/inventory.json` (14 vehicles: 4 new, 10 used; each has a `condition` field)
- Vehicle detail page is one template driven by `?id=` query param
- Serve locally with `node serve.mjs` at http://localhost:3000 (serves public/ and mounts /api/chat)
- Screenshots: `node screenshot.mjs http://localhost:3000/ [label]` (puppeteer installed in this project)
- Deploy: Vercel (auto-deploy on push to main), serverless function at api/chat.js, ANTHROPIC_API_KEY in Vercel env vars + local .env only

## Conventions
- No emojis, no em dashes (user's writing style applies to site copy too)
- All vehicle photos from images.unsplash.com (free, no real dealer branding)
- Business is fictional: Apex Auto Group, used + certified pre-owned, suburban

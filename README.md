# NextRouter

A modern AI workspace built with Next.js. The model catalog refreshes live from its configured model sources.

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set `LITEROUTER_API_KEY` for the complete live catalog. The UI intentionally presents a unified model experience rather than exposing upstream provider branding.

## Deploy

Designed for Vercel with zero custom server configuration.

# AIWorkoutNow SEO Setup

This repo includes `robots.txt`, `sitemap.xml`, and per-route SEO tags via `frontend/src/components/SEO.tsx`.

## Google Search Console (GSC)
- Verify domain: `aiworkoutnow.com` (DNS TXT record)
- Submit sitemap: `https://aiworkoutnow.com/sitemap.xml`
- After deploys, use **URL Inspection** for:
  - `/`
  - `/ai-workout-generator`
  - `/workout-plans`
  - `/faq`

## Bing Webmaster Tools
- Add site: `https://aiworkoutnow.com`
- Submit sitemap: `https://aiworkoutnow.com/sitemap.xml`

## Analytics (optional, performance-safe)
Frontend supports optional analytics via environment variables (see `frontend/src/components/OptionalAnalytics.tsx`):
- `VITE_GA4_ID`
- `VITE_GTM_ID`
- `VITE_CLARITY_ID`

Only set these if you want analytics enabled.

## Notes
- This is a SPA on Amplify. Ensure all routes rewrite to `/index.html` so `/faq`, `/ai-workout-generator`, `/platform`, etc. load correctly. In Amplify Console → Hosting → Rewrites and redirects, use a 200 rewrite: source `/<*>`, target `/index.html`. Optionally exclude static assets with a condition.
- Avoid “fake” review/rating schema. If you add Product schema later, only include fields you can truthfully support.


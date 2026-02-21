# SEO Audit & Implementation Plan — aiworkoutnow.com

## STEP 0 — Audit (completed)

### 1) Build system
- **Vite 5** (`vite.config.ts`), React 18, TypeScript
- Build: `npm run build` → `tsc && vite build` → output `dist/`

### 2) Router
- **react-router-dom v6**
- Routes: `/`, `/ai-workout-generator`, `/workout-plans`, `/faq`, `/about`, `/privacy`, `/disclaimer`, `/contact`, `/platform`, `/admin/*`, `/payment-success`, `/payment-cancel`
- No `/pricing` route (pricing lives on `/workout-plans`); will add `/pricing` as alias or dedicated page

### 3) Head handling
- **react-helmet-async** (v2.0.4); app wrapped in `HelmetProvider` in `main.tsx`
- **SEO.tsx** already sets: title, description, robots, canonical, og:*, twitter:*, optional jsonLd
- Default OG image: `https://aiworkoutnow.com/images/og-image.png`

### 4) Existing pages & content
- Pages: Home, About, Privacy, Disclaimer, Contact, Faq, AIWorkoutGenerator, WorkoutPlans, Platform, Admin/*, Payment*
- **No blog** or `/content/blog`; no programmatic SEO pages yet

---

## Chosen approach

| Item | Choice |
|------|--------|
| **SSG / Prerender** | Post-build prerender script (Node + Puppeteer) that loads each SEO route and writes static HTML to `dist/<path>/index.html`. No Vite plugin to avoid breaking SPA. Run after `vite build` via `npm run prerender`. |
| **Affected routes** | `/`, `/pricing`, `/faq`, `/about`, `/ai-workout-generator`, `/workout-plan-generator`, `/workout-generator/*`, programmatic pages, `/blog`, `/blog/:slug` |
| **New files** | `src/seo/schema/*`, `scripts/generate-sitemap.ts`, `scripts/prerender.mjs`, `content/blog/*.md`, `src/seo/programmaticPages.json`, `src/seo/LandingPageTemplate.tsx`, blog index builder, Breadcrumbs, FAQ schema component, `public/llms.txt`, Lighthouse CI config |

---

## Implementation order

1. **Phase 1a** — Schema helpers, SEOHead enhancement (noIndex, canonical strict), build-time sitemap generator, robots.txt, OG default asset path
2. **Phase 1b** — Prerender script, Amplify `_redirects` / rewrites so prerendered HTML can be served
3. **Phase 2** — Homepage H1/H2/subtitle/FAQ/trust bar; reusable FAQ component with FAQPage schema; breadcrumbs UI + BreadcrumbList; internal linking
4. **Phase 3** — Landing page template; routes for `/pricing`, `/workout-plan-generator`, `/workout-generator/{hiit,home,strength,...}`; programmatic pages from JSON; blog (markdown → JSON index, `/blog`, `/blog/:slug`)
5. **Phase 4** — Analytics env placeholders (VITE_GA_ID, VITE_CLARITY_ID, VITE_GSC_TOKEN), route-change pageview, custom events; Lighthouse CI config and scripts; README section
6. **Phase 5** — About/Contact trust content, `llms.txt`; final report

---

## Notes

- **Canonical**: All canonicals `https://aiworkoutnow.com/<path>` with no trailing slash; router and sitemap use same paths (lowercase, hyphenated).
- **Generator tool**: Prerendered pages that include the generator will have marketing content in static HTML; the form hydrates on client. No `window`/`document` during SSR/prerender in components that run at build time.

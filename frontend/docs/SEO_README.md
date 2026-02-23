# SEO System — AIWorkoutNow

## How to add new programmatic pages

1. Edit **`src/seo/programmaticPages.json`** and add a new entry with:
   - `slug` — URL path (e.g. `"/workouts/kettlebell"`)
   - `primaryKeyword`, `title`, `description`, `h1`, `intro`
   - `bullets` — array of "How it works" steps
   - `faqItems` — `[{ "question": "...", "answer": "..." }]`
   - `relatedSlugs` — array of paths for internal links (e.g. `["/workout-generator/strength", "/pricing"]`)

2. Routes are created automatically from this JSON via **`src/seo/programmaticPagesData.ts`** and **`App.tsx`** (which maps each slug to `<ProgrammaticPage />`).

3. Re-run **build** so the sitemap and prerender include the new URL:
   - `npm run build`
   - Optional: `npm run prerender` (requires Puppeteer) to generate static HTML for the new page.

---

## How to regenerate the sitemap

- **Automatic:** The sitemap is generated at the end of every **`npm run build`** and written to **`dist/sitemap.xml`** (and is deployed with the app).

- **Standalone:** To regenerate only the sitemap (e.g. after editing programmatic or blog content without a full build):
  - First build once so `dist/` exists: `npm run build`
  - Then: `npm run sitemap`
  - This overwrites `dist/sitemap.xml`.

- **Source:** **`scripts/generate-sitemap.mjs`** — it merges static routes, **`src/seo/programmaticPages.json`** slugs, and **`src/seo/blogIndex.json`** post slugs.

---

## How to verify prerender output

1. **Build and prerender:**
   ```bash
   npm run build
   npm run prerender   # requires: npm install -D puppeteer
   ```
   The prerender script starts `vite preview`, visits each SEO route with Puppeteer, and writes **`dist/<path>/index.html`** (e.g. `dist/about/index.html`).

2. **Inspect HTML:**
   - Serve the build: `npm run preview`
   - Open e.g. `http://localhost:4173/about`
   - View page source (Ctrl+U / Cmd+Option+U) and confirm the **H1 and main text are in the HTML** (not only after JS runs).

3. **Amplify:** For production, ensure **`public/_redirects`** includes a rewrite for each prerendered path (e.g. `/about` → `/about/index.html` with 200) so that visiting `/about` serves the static HTML when present.

---

## How to run Lighthouse

- **Prereqs:** Build the app and install Lighthouse CI (already in devDependencies):
  ```bash
  npm run build
  npx lhci autorun   # collect + assert in one go
  ```
  Or step by step:
  ```bash
  npm run build
  npm run lhci:collect   # starts preview server, runs Lighthouse on configured URLs
  npm run lhci:assert    # asserts performance ≥ 90, SEO ≥ 95, accessibility ≥ 90
  ```

- **Config:** **`lighthouserc.js`** in the frontend root sets:
  - URLs: `/`, `/about`, `/faq`, `/pricing`
  - Assertions: performance (warn ≥ 0.9), SEO (error ≥ 0.95), accessibility (error ≥ 0.9)

- **Expected output:** `lhci assert` prints pass/fail for each assertion. No “before/after” claims unless you run and record baseline yourself.

---

## How to verify Choose Your Goal i18n

The "Choose Your Goal" section on the home page uses `pages.home.goalTiles` in i18n. Every locale must have all badge, tile title/description, and CTA keys.

**Run the verification script:**
```bash
npm run i18n:check-goal-tiles
```

This fails (exit 1) if any locale in `src/i18n/locales/*/translation.json` is missing required keys. Add the missing keys before merging.

**Required keys:** `workoutTypesSectionTitle`, `goalTiles.cta`, `goalTiles.badges.*`, and `goalTiles.{main,women,men,beginners,hiit,home,strength,weight-loss,endurance}.title` / `.description`.

---

## Env placeholders (analytics)

Use these in `.env` (or Amplify env vars); do **not** commit real tokens.

- **`VITE_GA_ID`** or **`VITE_GA4_ID`** — Google Analytics 4 measurement ID
- **`VITE_CLARITY_ID`** — Microsoft Clarity project ID
- **`VITE_GSC_TOKEN`** — Google Search Console verification meta tag content

SPA route-change pageviews and custom events (`workout_generated`, `cta_clicked`, `faq_opened`, `blog_scroll_50`, `blog_scroll_100`) are wired in **`OptionalAnalytics.tsx`** and can be sent via **`trackEvent(name, params)`**.

# Phase 0 — Audit & Plan: Workout Plan Library SEO Upgrade

## 1) Workout-type pages (routes + components)

- **Route:** `App.tsx`: `<Route path="/workout-generator/:type" element={<WorkoutTypePage />} />`
- **Page component:** `src/pages/WorkoutTypePage.tsx` — reads `type` from `useParams()`, loads config via `getWorkoutTypeConfig(type)` and `getGeneratorDefaults(type)` from `src/config/workoutTypeDefaults.ts`
- **Slugs:** `hiit`, `home`, `strength`, `weight-loss`, `beginners`, `women`, `men` (from `WORKOUT_TYPE_SLUGS`). Invalid type → `<Navigate to="/workout-plan-generator" replace />`

## 2) Generator entry point and initial values

- **Component:** `src/components/WorkoutGenerator.tsx`
- **Prop:** `initialDefaults?: WorkoutGeneratorInitialDefaults` (fitnessLevel, workoutType, duration, equipment, injuries, goals)
- **Behavior:** State is `useState(initialDefaults ?? DEFAULT_*)` — applied once on first render; user changes are preserved (no override after edit)

## 3) Head / meta management

- **Current:** `src/components/SEO.tsx` using `react-helmet-async` (Helmet)
- **Sets:** title, description, canonical, robots, OG tags, Twitter tags, jsonLd (array of schemas)
- **App:** `main.tsx` already wraps app with `HelmetProvider` — no change needed

## 4) "Choose Your Workout Generator" grid

- **Location:** `src/components/home/WorkoutTypesSection.tsx`
- **Data:** Hardcoded `WORKOUT_GENERATOR_LINKS` (path + i18n titleKey). Links: `/`, `/workout-plan-generator`, `/workout-generator/{hiit,home,strength,weight-loss,beginners,women,men}`

---

## Plan summary

| Item | Action |
|------|--------|
| **Single source of truth** | Create `src/seo/workoutPlanLibrary.ts` with full page definitions (title, metaDescription, h1, introParagraphs, keyBenefits, sampleWorkout, tips, faq, relatedSlugs, defaultGeneratorConfig, affiliateProducts). |
| **Generator defaults** | Keep existing `initialDefaults` flow; ensure WorkoutTypePage passes library’s `defaultGeneratorConfig` (same shape as current `GeneratorDefaults`). |
| **Page template** | Keep Breadcrumbs, SampleWorkout, RelatedWorkoutTypes; add Tips section and EquipmentRecommendations; keep existing styling (About.css, content-card). |
| **Meta / schema** | Continue using existing SEO component and existing `buildBreadcrumbListSchema` / `buildFAQPageSchema`. |
| **Sitemap** | Extend sitemap generator to include all workout plan routes from library (or shared export). |
| **robots.txt** | Ensure `Sitemap: https://aiworkoutnow.com/sitemap.xml` present. |
| **Hub** | Add WorkoutPlansHub (or replace WorkoutPlans) at `/workout-plans` listing all library pages with search/filters. |
| **Grid** | Drive WorkoutTypesSection links from workoutPlanLibrary (or shared route list from library). |

## Files to create

- `src/seo/workoutPlanLibrary.ts` — page definitions
- `src/components/EquipmentRecommendations.tsx` — affiliate product cards + disclosure
- `src/pages/WorkoutPlansHub.tsx` — index of all plan pages (optional hub)

## Files to modify

- `src/pages/WorkoutTypePage.tsx` — use library, add tips + EquipmentRecommendations
- `src/components/home/WorkoutTypesSection.tsx` — use library for links
- `src/config/workoutTypeDefaults.ts` — derive from library or keep in sync (prefer: derive from library to avoid duplication)
- `scripts/generate-sitemap.mjs` — include workout plan routes from library
- `public/robots.txt` — confirm Sitemap URL

## Pages detected (workout-generator/:type)

- `/workout-generator/hiit`
- `/workout-generator/home`
- `/workout-generator/strength`
- `/workout-generator/weight-loss`
- `/workout-generator/beginners`
- `/workout-generator/women`
- `/workout-generator/men`

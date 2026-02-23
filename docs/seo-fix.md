# Fixing Google Search Console 404s for SPA Routes (Amplify)

This doc covers **hosting-level** fixes so that SPA routes (e.g. `/workout-plans`, `/workout-plan-generator`, `/platform`) return **200** with `index.html` instead of 404, and how to verify with `seo:check` and `curl`.

---

## 1. Amplify rewrite/redirect rule ordering

Rules are applied **top to bottom**. Order matters.

### Recommended order

1. **301 redirect: www → apex** (first)  
   - So `https://www.aiworkoutnow.com/workout-plans` → `https://aiworkoutnow.com/workout-plans` (301).  
   - Keeps one canonical host for indexing.

2. **Optional: trailing slash normalization**  
   - If you enforce “no trailing slash”, add a 301 redirect: paths ending with `/` (except `/`) → same path without trailing slash.  
   - Ensures `/workout-plans/` and `/workout-plans` don’t behave differently.

3. **SPA rewrite rule last** (status **200**, target `/index.html`)  
   - Matches all non-file routes and serves `index.html` with status **200** (not 302/301).  
   - So `/workout-plans`, `/pricing`, etc. return 200 + HTML; crawlers don’t see 404.

### Example Amplify rules (Console → Rewrites and redirects)

```json
[
  {
    "source": "https://www.aiworkoutnow.com/<*>",
    "status": "301",
    "target": "https://aiworkoutnow.com/<*>"
  },
  {
    "source": "</^[^.]+$|\\.(?!(css|gif|ico|jpg|jpeg|png|svg|js|mjs|map|json|txt|xml|webmanifest|woff|woff2|ttf|eot|mp4|webm|ogg|webp)$)([^.]+$)/>",
    "status": "200",
    "target": "/index.html"
  }
]
```

- First rule: www → apex (301).  
- Second rule: SPA fallback (200 → `/index.html`) for paths that don’t look like static file extensions.

Static files (`/robots.txt`, `/sitemap.xml`, `/images/*.mp4`, etc.) are **not** matched by the regex (extension in the “do not rewrite” list), so they are served as real files (200 with correct content-type).

---

## 2. Likely root causes of 404 in Search Console

| Cause | What to check |
|-------|----------------|
| **www not mapped or no 301 to apex** | `https://www.aiworkoutnow.com/workout-plans` returns 404 or wrong host. Fix: add 301 www → apex **first** in rules. |
| **Wrong branch/domain mapping** | Custom domain points at a branch that doesn’t have the latest deploy or rewrites. Fix: Amplify → Domain management → confirm domain points to correct branch (e.g. `main`). |
| **Rule order** | SPA rewrite must be **last** (after any redirects). If a catch-all 404 runs before the 200 rewrite, you get 404. Fix: put “200 → /index.html” rule at the bottom. |
| **Redeploy not done** | Rewrite/redirect changes need a new deploy. Fix: trigger a redeploy after saving rules and confirm the build completes. |

---

## 3. Verification checklist

Use this to confirm hosting is correct (no app code changes required).

### 3.1 Amplify Console

- [ ] **Custom domains**  
  Amplify → App → **Hosting** → **Custom domains**:  
  - `aiworkoutnow.com` (apex) and optionally `www.aiworkoutnow.com` point to the **same** Amplify app and **correct branch** (e.g. `main`).
- [ ] **Rewrites and redirects**  
  Amplify → App → **Hosting** → **Rewrites and redirects**:  
  - 301 www → apex is **first** (if using www).  
  - SPA rule (200 → `/index.html`) is **last**.  
  - No rule before the SPA rule that returns 404 for SPA paths.
- [ ] **Redeploy**  
  After any change to rewrites/redirects, **redeploy** the app and wait for the deploy to succeed.

### 3.2 Expected `curl -I` results

From a terminal (replace with your domain if different):

```bash
# SPA routes: 200 and content-type text/html
curl -I https://aiworkoutnow.com/workout-plans
curl -I https://aiworkoutnow.com/workout-plan-generator
curl -I https://aiworkoutnow.com/platform
curl -I https://aiworkoutnow.com/pricing
curl -I https://aiworkoutnow.com/faq
```

**Expected:** `HTTP/2 200` and `content-type: text/html` (or similar). No 404.

```bash
# Static SEO assets: 200 and correct content-type
curl -I https://aiworkoutnow.com/robots.txt   # text/plain
curl -I https://aiworkoutnow.com/sitemap.xml  # application/xml or text/xml
```

**Expected:** `HTTP/2 200` with the appropriate content-type.

**www:** If you use www, either:

- `curl -I https://www.aiworkoutnow.com/workout-plans` → **301** to `https://aiworkoutnow.com/workout-plans`, then 200 for the apex URL, or  
- www is not in use and only apex is in Search Console.

### 3.3 Local SEO check script

From the repo (frontend dir):

```bash
cd frontend && npm run seo:check
```

This runs `scripts/check-seo-status.mjs`: HEAD requests for key URLs on both **apex** and **www**, and prints status code, final URL after redirects, and content-type. Use it to quickly see if any SPA route returns 404 or wrong content-type.

---

## 4. Summary

- **Order:** 301 www → apex first, then SPA 200 → `/index.html` last.  
- **Redeploy** after changing rewrites/redirects.  
- **Verify:** Custom domains → correct branch; `curl -I` and `npm run seo:check` show 200 + text/html for SPA routes and 200 for `/robots.txt` and `/sitemap.xml`.

For the exact SPA rewrite regex and static file list, see `frontend/AMPLIFY_REWRITES_REFERENCE.md`.

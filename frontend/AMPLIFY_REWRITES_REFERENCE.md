# Amplify rewrites reference (for Console)

Use this in **Amplify Console → App settings → Rewrites and redirects** so that:

- **SPA routes** (no file extension, or unknown extension) → rewrite to `/index.html` (200) for client-side routing and Google indexing.
- **Static assets** (including **mp4**, **webm**, **ogg**, **webp**) → served as files (no rewrite). Without `mp4` in the list, `/images/hipmachine.mp4` was being rewritten to HTML and the video failed in production.

## Corrected rule (includes video/media extensions)

Paste this in the Amplify redirects/rewrites editor:

```json
[
  {
    "source": "</^[^.]+$|\\.(?!(css|gif|ico|jpg|jpeg|png|svg|js|mjs|map|json|txt|xml|webmanifest|woff|woff2|ttf|eot|mp4|webm|ogg|webp)$)([^.]+$)/>",
    "status": "200",
    "target": "/index.html"
  }
]
```

**Added extensions:** `mp4`, `webm`, `ogg`, `webp` so that:

- `https://aiworkoutnow.com/images/hipmachine.mp4` → serves the actual video file (200).
- Other static assets (images, fonts, etc.) continue to be served as files.
- All other paths (e.g. `/about`, `/pricing`) → rewrite to `/index.html` for the SPA.

After saving, redeploy or wait for the next deploy so the change takes effect.

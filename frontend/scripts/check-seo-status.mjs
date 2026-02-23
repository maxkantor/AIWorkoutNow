#!/usr/bin/env node
/**
 * SEO status check: HEAD request for key URLs on apex and www.
 * Use to verify Amplify rewrites/redirects so Google doesn't see 404 for SPA routes.
 * Run: npm run seo:check
 */

const APEX = 'https://aiworkoutnow.com';
const WWW = 'https://www.aiworkoutnow.com';

const PATHS = [
  '/workout-plans',
  '/workout-plan-generator',
  '/ai-workout-generator',
  '/platform',
  '/pricing',
  '/faq',
  '/robots.txt',
  '/sitemap.xml',
];

async function headCheck(url) {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
    });
    const finalUrl = res.url;
    const contentType = res.headers.get('content-type') || '';
    return { status: res.status, finalUrl, contentType };
  } catch (e) {
    return { status: null, finalUrl: url, contentType: '', error: e.message };
  }
}

async function run() {
  console.log('SEO status check (HEAD) — apex and www\n');

  for (const base of [APEX, WWW]) {
    const label = base === APEX ? 'Apex (aiworkoutnow.com)' : 'WWW (www.aiworkoutnow.com)';
    console.log(`\n--- ${label} ---\n`);

    for (const path of PATHS) {
      const url = base + path;
      const { status, finalUrl, contentType } = await headCheck(url);
      const type = contentType.split(';')[0].trim() || '-';
      const redirectNote = finalUrl !== url ? ` → ${finalUrl}` : '';
      console.log(`${String(status ?? 'ERR').padEnd(4)} ${type.padEnd(22)} ${url}${redirectNote}`);
    }
  }

  console.log('\n--- Summary ---');
  console.log('SPA routes should return 200 with content-type text/html (or redirect www→apex then 200).');
  console.log('robots.txt / sitemap.xml should return 200 with text/plain or application/xml.');
  console.log('If any SPA path returns 404, see docs/seo-fix.md for Amplify rule ordering and checklist.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

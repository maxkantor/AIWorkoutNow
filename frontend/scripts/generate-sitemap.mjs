#!/usr/bin/env node
/**
 * Build-time sitemap generator.
 * Writes sitemap.xml to dist/ (run after vite build).
 * Usage: node scripts/generate-sitemap.mjs
 * Or: node scripts/generate-sitemap.mjs --out public/sitemap.xml  (to overwrite public copy)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');
const publicDir = path.join(root, 'public');

const SITE_URL = 'https://aiworkoutnow.com';
const lastmod = new Date().toISOString().slice(0, 10);

const STATIC_ROUTES = [
  { path: '/', changefreq: 'daily', priority: 1.0 },
  { path: '/about', changefreq: 'monthly', priority: 0.8 },
  { path: '/ai-workout-generator', changefreq: 'weekly', priority: 0.9 },
  { path: '/workout-plan-generator', changefreq: 'weekly', priority: 0.9 },
  { path: '/workout-plans', changefreq: 'monthly', priority: 0.7 },
  { path: '/pricing', changefreq: 'monthly', priority: 0.8 },
  { path: '/faq', changefreq: 'monthly', priority: 0.8 },
  { path: '/contact', changefreq: 'monthly', priority: 0.7 },
  { path: '/privacy', changefreq: 'yearly', priority: 0.5 },
  { path: '/disclaimer', changefreq: 'yearly', priority: 0.5 },
  { path: '/blog', changefreq: 'weekly', priority: 0.8 },
  // Workout plan library (keep in sync with src/seo/workoutPlanLibrary.ts WORKOUT_PLAN_SLUGS)
  { path: '/workout-generator/hiit', changefreq: 'monthly', priority: 0.7 },
  { path: '/workout-generator/home', changefreq: 'monthly', priority: 0.7 },
  { path: '/workout-generator/strength', changefreq: 'monthly', priority: 0.7 },
  { path: '/workout-generator/weight-loss', changefreq: 'monthly', priority: 0.7 },
  { path: '/workout-generator/beginners', changefreq: 'monthly', priority: 0.7 },
  { path: '/workout-generator/women', changefreq: 'monthly', priority: 0.7 },
  { path: '/workout-generator/men', changefreq: 'monthly', priority: 0.7 },
];

function readProgrammaticSlugs() {
  try {
    const p = path.join(root, 'src', 'seo', 'programmaticPages.json');
    const raw = fs.readFileSync(p, 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data.map((e) => e.slug) : (data.pages || []).map((e) => e.slug);
  } catch {
    return [];
  }
}

function readBlogSlugs() {
  try {
    const p = path.join(root, 'src', 'seo', 'blogIndex.json');
    const raw = fs.readFileSync(p, 'utf8');
    const data = JSON.parse(raw);
    return (data.posts || []).map((p) => p.slug);
  } catch {
    return [];
  }
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function urlNode(route) {
  const loc = route.path.startsWith('http') ? route.path : `${SITE_URL}${route.path}`;
  return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${route.lastmod || lastmod}</lastmod>
    <changefreq>${route.changefreq || 'monthly'}</changefreq>
    <priority>${route.priority ?? 0.5}</priority>
  </url>`;
}

function main() {
  const outArg = process.argv.find((a) => a.startsWith('--out='));
  const outPath = outArg
    ? path.resolve(root, outArg.slice('--out='.length))
    : path.join(distDir, 'sitemap.xml');

  const urls = [
    ...STATIC_ROUTES.map((r) => ({ ...r, lastmod })),
    ...readProgrammaticSlugs().map((slug) => ({
      path: slug.startsWith('/') ? slug : `/${slug}`,
      lastmod,
      changefreq: 'monthly',
      priority: 0.6,
    })),
    ...readBlogSlugs().map((slug) => ({
      path: `/blog/${slug}`,
      lastmod,
      changefreq: 'monthly',
      priority: 0.6,
    })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urls.map(urlNode).join('\n')}
</urlset>
`;

  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(outPath, xml, 'utf8');
  console.log(`[generate-sitemap] Wrote ${urls.length} URLs to ${outPath}`);
}

main();

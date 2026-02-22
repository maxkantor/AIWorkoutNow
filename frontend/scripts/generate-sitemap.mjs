#!/usr/bin/env node
/**
 * Build-time sitemap + robots generator.
 * Single source of truth: src/seo/seoRoutes.json (+ programmatic + blog).
 * Writes public/sitemap.xml and public/robots.txt so they are copied to dist and served at /sitemap.xml, /robots.txt.
 * Run before vite build (e.g. in build script).
 * Usage: node scripts/generate-sitemap.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const publicDir = path.join(root, 'public');

const lastmod = new Date().toISOString().slice(0, 10);

function loadSeoRoutes() {
  const p = path.join(root, 'src', 'seo', 'seoRoutes.json');
  const raw = fs.readFileSync(p, 'utf8');
  const data = JSON.parse(raw);
  const siteUrl = data.siteUrl || 'https://aiworkoutnow.com';
  const routes = (data.routes || []).map((r) => ({
    path: normalizePath(r.path),
    changefreq: r.changefreq || 'monthly',
    priority: r.priority ?? 0.5,
  }));
  return { siteUrl, routes };
}

function normalizePath(p) {
  const s = String(p).trim().replace(/\/+/g, '/');
  return s === '' || s === '/' ? '/' : s.replace(/\/$/, '');
}

function readProgrammaticSlugs() {
  try {
    const p = path.join(root, 'src', 'seo', 'programmaticPages.json');
    const raw = fs.readFileSync(p, 'utf8');
    const data = JSON.parse(raw);
    const slugs = Array.isArray(data) ? data.map((e) => e.slug) : (data.pages || []).map((e) => e.slug);
    return slugs.map((s) => (s.startsWith('/') ? s : `/${s}`)).map(normalizePath);
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

function urlNode(siteUrl, route) {
  const loc = route.path.startsWith('http') ? route.path : `${siteUrl}${route.path}`;
  return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${route.lastmod || lastmod}</lastmod>
    <changefreq>${route.changefreq || 'monthly'}</changefreq>
    <priority>${(route.priority ?? 0.5).toFixed(1)}</priority>
  </url>`;
}

function main() {
  const { siteUrl, routes: seoRoutes } = loadSeoRoutes();

  const programmaticPaths = readProgrammaticSlugs().map((slug) => ({
    path: slug,
    lastmod,
    changefreq: 'monthly',
    priority: 0.6,
  }));

  const blogPaths = readBlogSlugs().map((slug) => ({
    path: `/blog/${slug}`,
    lastmod,
    changefreq: 'monthly',
    priority: 0.6,
  }));

  const urls = [
    ...seoRoutes.map((r) => ({ ...r, lastmod })),
    ...programmaticPaths,
    ...blogPaths,
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urls.map((r) => urlNode(siteUrl, r)).join('\n')}
</urlset>
`;

  const robotsTxt = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin/
Disallow: /payment-success
Disallow: /payment-cancel

Sitemap: ${siteUrl}/sitemap.xml
`;

  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const sitemapPath = path.join(publicDir, 'sitemap.xml');
  const robotsPath = path.join(publicDir, 'robots.txt');

  fs.writeFileSync(sitemapPath, xml, 'utf8');
  fs.writeFileSync(robotsPath, robotsTxt, 'utf8');

  console.log(`[generate-sitemap] Wrote ${urls.length} URLs to ${sitemapPath}`);
  console.log(`[generate-sitemap] Wrote ${robotsPath}`);
}

main();

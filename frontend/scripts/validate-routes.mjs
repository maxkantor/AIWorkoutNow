#!/usr/bin/env node
/**
 * Validates that sitemap routes resolve to HTTP 200 when fetched.
 * Usage:
 *   node scripts/validate-routes.mjs
 *     → prints all routes from seoRoutes + programmatic + blog; suggests setting BASE_URL.
 *   BASE_URL=http://localhost:5173 node scripts/validate-routes.mjs
 *     → fetches each URL and reports any non-200 (run with dev server up).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function loadSeoRoutes() {
  const p = path.join(root, 'src', 'seo', 'seoRoutes.json');
  const raw = fs.readFileSync(p, 'utf8');
  const data = JSON.parse(raw);
  const routes = (data.routes || []).map((r) => (r.path.startsWith('/') ? r.path : `/${r.path}`));
  return routes;
}

function readProgrammaticSlugs() {
  try {
    const p = path.join(root, 'src', 'seo', 'programmaticPages.json');
    const raw = fs.readFileSync(p, 'utf8');
    const data = JSON.parse(raw);
    const slugs = Array.isArray(data) ? data.map((e) => e.slug) : (data.pages || []).map((e) => e.slug);
    return slugs.map((s) => (s.startsWith('/') ? s : `/${s}`));
  } catch {
    return [];
  }
}

function readBlogSlugs() {
  try {
    const p = path.join(root, 'src', 'seo', 'blogIndex.json');
    const raw = fs.readFileSync(p, 'utf8');
    const data = JSON.parse(raw);
    return (data.posts || []).map((p) => `/blog/${p.slug}`);
  } catch {
    return [];
  }
}

function collectAllPaths() {
  const a = loadSeoRoutes();
  const b = readProgrammaticSlugs();
  const c = readBlogSlugs();
  const seen = new Set();
  const out = [];
  for (const p of [...a, ...b, ...c]) {
    const norm = p === '' || p === '/' ? '/' : p.replace(/\/+$/, '');
    if (seen.has(norm)) continue;
    seen.add(norm);
    out.push(norm);
  }
  return out.sort((x, y) => (x === '/' ? -1 : y === '/' ? 1 : x.localeCompare(y)));
}

async function fetchStatus(baseUrl, path) {
  const url = path === '/' ? baseUrl.replace(/\/$/, '') + '/' : baseUrl.replace(/\/$/, '') + path;
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'manual' });
    return res.status;
  } catch (e) {
    return { error: e.message };
  }
}

async function main() {
  const paths = collectAllPaths();
  const baseUrl = process.env.BASE_URL;

  if (!baseUrl) {
    console.log('Sitemap routes (from seoRoutes + programmatic + blog):');
    paths.forEach((p) => console.log('  ', p === '' ? '/' : p));
    console.log('\nTo validate HTTP status, run with dev server up:');
    console.log('  BASE_URL=http://localhost:5173 node scripts/validate-routes.mjs');
    return;
  }

  console.log(`Validating ${paths.length} URLs against ${baseUrl}\n`);
  let failed = 0;
  for (const p of paths) {
    const pathStr = p === '' ? '/' : p;
    const status = await fetchStatus(baseUrl, pathStr);
    if (typeof status === 'object') {
      console.log(`FAIL ${pathStr}  (error: ${status.error})`);
      failed++;
    } else if (status !== 200) {
      console.log(`FAIL ${pathStr}  HTTP ${status}`);
      failed++;
    } else {
      console.log(`  OK ${pathStr}`);
    }
  }
  console.log(failed ? `\n${failed} route(s) returned non-200.` : '\nAll routes returned 200.');
  process.exit(failed ? 1 : 0);
}

main();

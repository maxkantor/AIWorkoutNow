#!/usr/bin/env node
/**
 * Post-build prerender: serve dist, visit each SEO route with Puppeteer, save static HTML.
 * Run after: npm run build
 * Usage: node scripts/prerender.mjs
 * Requires: npm install puppeteer (devDep)
 *
 * Output: dist/<path>/index.html for each path (e.g. dist/about/index.html).
 * Root / is already dist/index.html from Vite; we optionally overwrite it with prerendered content.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');

const STATIC_ROUTES = [
  '/',
  '/about',
  '/ai-workout-generator',
  '/workout-plan-generator',
  '/workout-plans',
  '/pricing',
  '/faq',
  '/contact',
  '/privacy',
  '/disclaimer',
  '/blog',
  '/workout-generator/hiit',
  '/workout-generator/home',
  '/workout-generator/strength',
  '/workout-generator/weight-loss',
  '/workout-generator/beginners',
  '/workout-generator/women',
  '/workout-generator/men',
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

async function startServer(port = 4173) {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['vite', 'preview', '--port', String(port)], {
      cwd: root,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    });
    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error('Preview server timeout'));
        child.kill();
      }
    }, 60000);
    const onReady = (data) => {
      if (resolved) return;
      const out = data.toString();
      if (out.includes('localhost') || out.includes('127.0.0.1') || out.includes(port)) {
        resolved = true;
        clearTimeout(timeout);
        resolve(child);
      }
    };
    child.stdout.on('data', onReady);
    child.stderr.on('data', onReady);
    child.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        reject(err);
      }
    });
  });
}

async function main() {
  if (!fs.existsSync(distDir)) {
    console.error('[prerender] dist/ not found. Run npm run build first.');
    process.exit(1);
  }

  let puppeteer;
  try {
    puppeteer = await import('puppeteer');
  } catch {
    console.error('[prerender] puppeteer not found. Install with: npm install -D puppeteer');
    process.exit(1);
  }

  const programmatic = readProgrammaticSlugs().map((s) => (s.startsWith('/') ? s : `/${s}`));
  const blog = readBlogSlugs().map((s) => `/blog/${s}`);
  const allRoutes = [...STATIC_ROUTES, ...programmatic, ...blog];

  let server;
  try {
    server = await startServer(4173);
  } catch (e) {
    console.error('[prerender] Failed to start vite preview:', e.message);
    process.exit(1);
  }

  const baseUrl = 'http://localhost:4173';
  const browser = await puppeteer.default.launch({ headless: 'new', args: ['--no-sandbox'] });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    for (const route of allRoutes) {
      const url = route === '/' ? baseUrl : `${baseUrl}${route}`;
      try {
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 });
        await page.evaluate(() => {
          // Ensure content is rendered (e.g. React hydrated)
          const root = document.getElementById('root');
          if (root && root.innerHTML.trim().length < 100) {
            return; // might still be loading
          }
        });
        const html = await page.content();
        const outPath = route === '/' ? path.join(distDir, 'index.html') : path.join(distDir, route, 'index.html');
        const dir = path.dirname(outPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(outPath, html, 'utf8');
        console.log('[prerender]', route || '/', '->', outPath);
      } catch (err) {
        console.warn('[prerender]', route, err.message);
      }
    }
  } finally {
    await browser.close();
    if (server && server.kill) server.kill();
  }
  console.log('[prerender] Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

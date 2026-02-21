#!/usr/bin/env node
/**
 * Reads content/blog/*.md, extracts frontmatter + body, writes src/seo/blogIndex.json.
 * Run before build so the app can import the index.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const contentDir = path.join(root, 'content', 'blog');
const outPath = path.join(root, 'src', 'seo', 'blogIndex.json');

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: content.trim() };
  const frontmatterRaw = match[1];
  const body = match[2].trim();
  const frontmatter = {};
  for (const line of frontmatterRaw.split(/\r?\n/)) {
    const m = line.match(/^(\w+):\s*["']?([^"'\n]*)["']?$/);
    if (m) frontmatter[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
  }
  return { frontmatter, body };
}

function main() {
  if (!fs.existsSync(contentDir)) {
    fs.writeFileSync(outPath, JSON.stringify({ posts: [] }, null, 2), 'utf8');
    console.log('[build-blog-index] No content/blog folder, wrote empty index');
    return;
  }
  const files = fs.readdirSync(contentDir).filter((f) => f.endsWith('.md'));
  const posts = [];
  for (const file of files) {
    const raw = fs.readFileSync(path.join(contentDir, file), 'utf8');
    const { frontmatter, body } = parseFrontmatter(raw);
    const slug = frontmatter.slug || path.basename(file, '.md');
    posts.push({
      slug,
      title: frontmatter.title || slug,
      date: frontmatter.date || '',
      description: frontmatter.description || '',
      author: frontmatter.author || 'AIWorkoutNow',
      tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : (frontmatter.tags || '').split(',').map((t) => t.trim()).filter(Boolean),
      coverImage: frontmatter.coverImage || '',
      body,
    });
  }
  posts.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify({ posts }, null, 2), 'utf8');
  console.log('[build-blog-index] Wrote', posts.length, 'posts to', outPath);
}

main();

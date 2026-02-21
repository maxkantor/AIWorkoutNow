/**
 * Central list of static routes for sitemap and prerender.
 * Programmatic and blog URLs are added at build time by generate-sitemap.
 */

export const SITE_URL = 'https://aiworkoutnow.com';

export interface SitemapEntry {
  path: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  priority?: number;
}

export const STATIC_SITEMAP_ROUTES: SitemapEntry[] = [
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
  // Landing / workout-generator/*
  { path: '/workout-generator/hiit', changefreq: 'monthly', priority: 0.7 },
  { path: '/workout-generator/home', changefreq: 'monthly', priority: 0.7 },
  { path: '/workout-generator/strength', changefreq: 'monthly', priority: 0.7 },
  { path: '/workout-generator/weight-loss', changefreq: 'monthly', priority: 0.7 },
  { path: '/workout-generator/beginners', changefreq: 'monthly', priority: 0.7 },
  { path: '/workout-generator/women', changefreq: 'monthly', priority: 0.7 },
  { path: '/workout-generator/men', changefreq: 'monthly', priority: 0.7 },
];

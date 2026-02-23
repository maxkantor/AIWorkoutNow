#!/usr/bin/env node
/**
 * Verification: ensures every locale has all required goalTiles keys.
 * Run: node scripts/check-goal-tiles-i18n.mjs
 * Exits 1 if any locale is missing keys.
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = join(__dirname, '../src/i18n/locales');

const REQUIRED_KEYS = [
  'pages.home.workoutTypesSectionTitle',
  'pages.home.goalTiles.cta',
  'pages.home.goalTiles.badges.popular',
  'pages.home.goalTiles.badges.women',
  'pages.home.goalTiles.badges.men',
  'pages.home.goalTiles.badges.beginner',
  'pages.home.goalTiles.badges.fatLoss',
  'pages.home.goalTiles.badges.noEquipment',
  'pages.home.goalTiles.badges.strength',
  'pages.home.goalTiles.badges.weightLoss',
  'pages.home.goalTiles.badges.endurance',
  'pages.home.goalTiles.main.title',
  'pages.home.goalTiles.main.description',
  'pages.home.goalTiles.women.title',
  'pages.home.goalTiles.women.description',
  'pages.home.goalTiles.men.title',
  'pages.home.goalTiles.men.description',
  'pages.home.goalTiles.beginners.title',
  'pages.home.goalTiles.beginners.description',
  'pages.home.goalTiles.hiit.title',
  'pages.home.goalTiles.hiit.description',
  'pages.home.goalTiles.home.title',
  'pages.home.goalTiles.home.description',
  'pages.home.goalTiles.strength.title',
  'pages.home.goalTiles.strength.description',
  'pages.home.goalTiles.weight-loss.title',
  'pages.home.goalTiles.weight-loss.description',
  'pages.home.goalTiles.endurance.title',
  'pages.home.goalTiles.endurance.description',
];

function get(obj, path) {
  return path.split('.').reduce((o, k) => (o && o[k] != null ? o[k] : null), obj);
}

const locales = readdirSync(LOCALES_DIR).filter((d) =>
  readdirSync(join(LOCALES_DIR, d)).some((f) => f.endsWith('.json'))
);

let failed = false;
for (const locale of locales) {
  const file = join(LOCALES_DIR, locale, 'translation.json');
  const raw = readFileSync(file, 'utf8');
  const data = JSON.parse(raw);

  const missing = REQUIRED_KEYS.filter((key) => {
    const v = get(data, key);
    return v == null || (typeof v === 'string' && v.trim() === '');
  });

  if (missing.length > 0) {
    console.error(`❌ ${locale}: missing keys: ${missing.join(', ')}`);
    failed = true;
  } else {
    console.log(`✅ ${locale}: all goalTiles keys present`);
  }
}

if (failed) {
  process.exit(1);
}
console.log('\n✅ All locales have required goalTiles keys.');

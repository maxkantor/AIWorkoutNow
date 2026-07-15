/**
 * Resolve demonstration images for exercise names.
 * Primary: free-exercise-db (open-source form photos + local name index).
 * Fallback: curated Unsplash fitness photos by keyword.
 */

import exerciseDbIndex from '../data/exerciseDbIndex.json';

const FREE_EXERCISE_CDN =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises';

export interface ExerciseImage {
  url: string;
  alt: string;
}

type ExerciseDbEntry = {
  id: string;
  name: string;
  images: string[];
};

const DB = exerciseDbIndex as ExerciseDbEntry[];

/** Unsplash fallbacks by keyword (w=640&h=420 crop) */
const UNSPLASH_FALLBACKS: Record<string, string[]> = {
  squat: [
    'https://images.unsplash.com/photo-1574680178050-55c3c0ffbd7a?w=640&h=420&fit=crop',
    'https://images.unsplash.com/photo-1434608519344-49d77a699f1d?w=640&h=420&fit=crop',
    'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=640&h=420&fit=crop',
  ],
  pushup: [
    'https://images.unsplash.com/photo-1598971639058-fab3c3109ad0?w=640&h=420&fit=crop',
    'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=640&h=420&fit=crop',
    'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=640&h=420&fit=crop',
  ],
  lunge: [
    'https://images.unsplash.com/photo-1434689770146-b08ef70ab3ba?w=640&h=420&fit=crop',
    'https://images.unsplash.com/photo-1518310383802-640c2de311b2?w=640&h=420&fit=crop',
    'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=640&h=420&fit=crop',
  ],
  plank: [
    'https://images.unsplash.com/photo-1566241142559-40e1dab266c6?w=640&h=420&fit=crop',
    'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=640&h=420&fit=crop',
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=640&h=420&fit=crop',
  ],
  deadlift: [
    'https://images.unsplash.com/photo-1517963879433-6ad2b056d904?w=640&h=420&fit=crop',
    'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?w=640&h=420&fit=crop',
    'https://images.unsplash.com/photo-1581009146145-b5ef57577acd?w=640&h=420&fit=crop',
  ],
  row: [
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=640&h=420&fit=crop',
    'https://images.unsplash.com/photo-1583454110551-21c2be3449f1?w=640&h=420&fit=crop',
    'https://images.unsplash.com/photo-1576678927484-cc907957088c?w=640&h=420&fit=crop',
  ],
  press: [
    'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=640&h=420&fit=crop',
    'https://images.unsplash.com/photo-1581009146145-b5ef57577acd?w=640&h=420&fit=crop',
    'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=640&h=420&fit=crop',
  ],
  cardio: [
    'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=640&h=420&fit=crop',
    'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=640&h=420&fit=crop',
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=640&h=420&fit=crop',
  ],
  stretch: [
    'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=640&h=420&fit=crop',
    'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=640&h=420&fit=crop',
    'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=640&h=420&fit=crop',
  ],
  default: [
    'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=640&h=420&fit=crop',
    'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=640&h=420&fit=crop',
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=640&h=420&fit=crop',
  ],
};

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[_/\\-]+/g, ' ')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreMatch(query: string, candidate: string): number {
  if (query === candidate) return 100;
  if (query.includes(candidate) || candidate.includes(query)) return 85;

  const qWords = query.split(' ').filter(Boolean);
  const cWords = candidate.split(' ').filter(Boolean);
  if (qWords.length === 0 || cWords.length === 0) return 0;

  let hits = 0;
  for (const w of qWords) {
    if (cWords.some((cw) => cw === w || cw.includes(w) || w.includes(cw))) hits += 1;
  }
  return (hits / Math.max(qWords.length, cWords.length)) * 70;
}

function findDbEntry(exerciseName: string): ExerciseDbEntry | null {
  const q = normalize(exerciseName);
  if (!q) return null;

  let best: ExerciseDbEntry | null = null;
  let bestScore = 0;

  for (const entry of DB) {
    const nameScore = scoreMatch(q, normalize(entry.name));
    const idScore = scoreMatch(q, normalize(entry.id));
    const s = Math.max(nameScore, idScore);
    if (s > bestScore) {
      bestScore = s;
      best = entry;
    }
  }

  return bestScore >= 45 ? best : null;
}

function pickUnsplashFallback(exerciseName: string): string[] {
  const n = normalize(exerciseName);
  if (/(squat|goblet|wall sit)/.test(n)) return UNSPLASH_FALLBACKS.squat;
  if (/(push.?up|press.?up|pushup)/.test(n)) return UNSPLASH_FALLBACKS.pushup;
  if (/(lunge|split squat|step.?up)/.test(n)) return UNSPLASH_FALLBACKS.lunge;
  if (/(plank|hollow|dead bug)/.test(n)) return UNSPLASH_FALLBACKS.plank;
  if (/(deadlift|rdl|hinge)/.test(n)) return UNSPLASH_FALLBACKS.deadlift;
  if (/(row|pulldown|pull.?up|chin)/.test(n)) return UNSPLASH_FALLBACKS.row;
  if (/(press|bench|overhead|shoulder)/.test(n)) return UNSPLASH_FALLBACKS.press;
  if (/(run|jog|bike|cardio|burpee|jump|climber|hiit)/.test(n)) return UNSPLASH_FALLBACKS.cardio;
  if (/(stretch|yoga|mobility|cool)/.test(n)) return UNSPLASH_FALLBACKS.stretch;
  return UNSPLASH_FALLBACKS.default;
}

/**
 * Return up to 3 demonstration images for an exercise name.
 */
export function getExerciseImages(exerciseName: string, count = 3): ExerciseImage[] {
  const name = (exerciseName || 'exercise').trim() || 'exercise';
  const entry = findDbEntry(name);
  const images: ExerciseImage[] = [];

  if (entry?.images?.length) {
    for (const rel of entry.images.slice(0, count)) {
      images.push({
        url: `${FREE_EXERCISE_CDN}/${rel}`,
        alt: `${name} — demonstration`,
      });
    }
  }

  if (images.length < count) {
    for (const url of pickUnsplashFallback(name)) {
      if (images.length >= count) break;
      if (images.some((img) => img.url === url)) continue;
      images.push({
        url,
        alt: `${name} — form reference ${images.length + 1}`,
      });
    }
  }

  return images.slice(0, count);
}

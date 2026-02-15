/**
 * Deterministic recommendation engine for post-workout affiliate products.
 * Chooses up to 3 products based on workout form inputs.
 */

import { buildAmazonSearchUrl } from '../../utils/amazonAffiliate';

export interface AffiliateProduct {
  title: string;
  description: string;
  why: string;
  searchQuery: string;
  category: string;
  affiliateUrl: string;
}

export interface WorkoutInputs {
  fitnessLevel: string;
  workoutType: string;
  duration: number;
  equipment: string;
  injuries: string[];
  goals: string[];
}

// Product catalog with search queries and metadata
const PRODUCT_CATALOG: Record<string, Omit<AffiliateProduct, 'affiliateUrl'>> = {
  'resistance-bands': {
    title: 'Resistance Bands Set',
    description: 'Versatile bands for strength training, physical therapy, and rehab. Add resistance to bodyweight exercises or use for stretching.',
    why: 'Perfect for minimal equipment workouts and scalable resistance.',
    searchQuery: 'Resistance Bands Set',
    category: 'equipment',
  },
  'yoga-mat': {
    title: 'Non-Slip Yoga Mat',
    description: 'Thick, cushioned mat with excellent grip for yoga, floor exercises, and stretching. Eco-friendly materials, easy to clean.',
    why: 'Essential for floor work, stretching, and injury prevention.',
    searchQuery: 'Non-Slip Yoga Mat',
    category: 'equipment',
  },
  'foam-roller': {
    title: 'Foam Roller',
    description: 'Self-myofascial release tool for recovery, flexibility, and muscle soreness. Durable construction, multiple densities available.',
    why: 'Speeds recovery and reduces muscle tension after workouts.',
    searchQuery: 'Foam Roller',
    category: 'recovery',
  },
  'adjustable-dumbbells': {
    title: 'Adjustable Dumbbells Set',
    description: 'Space-saving set that replaces multiple pairs. Adjust weight quickly for different exercises and fitness levels.',
    why: 'Maximizes home gym versatility with minimal footprint.',
    searchQuery: 'Adjustable Dumbbells Set',
    category: 'equipment',
  },
  'lifting-gloves': {
    title: 'Lifting Gloves & Grips',
    description: 'Protect hands from calluses and improve grip during heavy lifts. Breathable, padded palms for comfort.',
    why: 'Better grip and hand protection for dumbbell and barbell work.',
    searchQuery: 'Lifting Gloves Grips',
    category: 'equipment',
  },
  'protein-shaker': {
    title: 'Protein Shaker Bottle',
    description: 'BPA-free shaker with mixing ball for smooth protein drinks. Leak-proof, dishwasher safe, ideal for post-workout nutrition.',
    why: 'Convenient post-workout nutrition on the go.',
    searchQuery: 'Protein Shaker Bottle',
    category: 'nutrition',
  },
  'electrolyte-powder': {
    title: 'Electrolyte Powder',
    description: 'Replenish sodium, potassium, and magnesium lost during sweat. Low-sugar formulas for cardio and endurance workouts.',
    why: 'Hydration and electrolyte balance for longer or intense sessions.',
    searchQuery: 'Electrolyte Powder',
    category: 'nutrition',
  },
  'running-shoes': {
    title: 'Running Shoes',
    description: 'Lightweight, cushioned shoes for running and cardio. Supportive fit for various foot types and surfaces.',
    why: 'Proper footwear reduces injury risk and improves performance.',
    searchQuery: 'Running Shoes',
    category: 'equipment',
  },
  'whey-protein': {
    title: 'Whey Protein Powder',
    description: 'High-quality protein to support muscle repair and growth. Mixes easily, available in various flavors.',
    why: 'Supports muscle recovery and growth after strength training.',
    searchQuery: 'Whey Protein Powder',
    category: 'nutrition',
  },
  'knee-sleeves': {
    title: 'Knee Sleeves',
    description: 'Compression sleeves for knee support and warmth. Help reduce pain and improve stability during squats and lower-body work.',
    why: 'Extra support and stability for knee-sensitive movements.',
    searchQuery: 'Knee Sleeves',
    category: 'equipment',
  },
};

function normalizeForMatch(str: string): string {
  return str.toLowerCase().trim();
}

function goalsInclude(goals: string[], term: string): boolean {
  const normalized = normalizeForMatch(term);
  return goals.some((g) => normalizeForMatch(g).includes(normalized) || normalized.includes(normalizeForMatch(g)));
}

function injuriesInclude(injuries: string[], term: string): boolean {
  const normalized = normalizeForMatch(term);
  return injuries.some((i) => normalizeForMatch(i).includes(normalized) || normalized.includes(normalizeForMatch(i)));
}

/**
 * Returns up to 3 recommended products based on workout inputs.
 * Deduplicated, deterministic order.
 */
export function getAffiliateRecommendations(inputs: WorkoutInputs): AffiliateProduct[] {
  const { equipment, workoutType, duration, goals, injuries } = inputs;
  const eq = normalizeForMatch(equipment);
  const wt = normalizeForMatch(workoutType);
  const added = new Set<string>();
  const result: AffiliateProduct[] = [];

  const add = (key: string) => {
    if (added.has(key) || result.length >= 3) return;
    const p = PRODUCT_CATALOG[key];
    if (p) {
      added.add(key);
      result.push({
        ...p,
        affiliateUrl: buildAmazonSearchUrl(p.searchQuery),
      });
    }
  };

  // If equipment includes Minimal/Bodyweight or resistance-bands
  if (eq.includes('minimal') || eq.includes('bodyweight') || eq.includes('resistance')) {
    add('resistance-bands');
    add('yoga-mat');
    add('foam-roller');
  }

  // If equipment includes Dumbbells or Full Gym
  if (eq.includes('dumbbell') || eq.includes('full-gym')) {
    add('adjustable-dumbbells');
    add('lifting-gloves');
    add('protein-shaker');
  }

  // If workout type includes Cardio or duration >= 40
  if (wt.includes('cardio') || duration >= 40) {
    add('electrolyte-powder');
    add('running-shoes');
    add('foam-roller');
  }

  // If goals include muscle gain
  if (goalsInclude(goals, 'muscle gain') || goalsInclude(goals, 'muscle')) {
    add('whey-protein');
  }

  // If injuries include knee
  if (injuriesInclude(injuries, 'knee')) {
    add('knee-sleeves');
  }

  // Fallback: ensure we always have exactly 3 products
  const fallbacks = ['foam-roller', 'yoga-mat', 'resistance-bands'] as const;
  for (const f of fallbacks) {
    if (result.length >= 3) break;
    add(f);
  }

  return result.slice(0, 3);
}

/**
 * Single source of truth for workout plan library pages.
 * Used for: WorkoutTypePage, WorkoutTypesSection grid, sitemap, WorkoutPlansHub.
 * Product links only — do not add company/support pages here.
 */

export interface DefaultGeneratorConfig {
  fitnessLevel?: string;
  workoutType?: string;
  duration?: string;
  equipment?: string;
  injuries?: string;
  goals?: string;
}

export interface SampleWorkoutItem {
  name: string;
  sets?: number;
  reps?: number;
  duration?: string;
  notes?: string;
}

export interface SampleWorkoutData {
  warmUp: string[];
  mainCircuit: SampleWorkoutItem[];
  cooldown: string[];
  estimatedMinutes: number;
}

export interface AffiliateProduct {
  name: string;
  description: string;
  amazonUrlPlaceholder: string;
  badge?: string;
  category?: string;
}

export interface PlanPageDefinition {
  slug: string;
  routePath: string;
  title: string;
  metaDescription: string;
  h1: string;
  introParagraphs: string[];
  keyBenefits: string[];
  sampleWorkout: SampleWorkoutData;
  tips: string[];
  faq: { question: string; answer: string }[];
  relatedSlugs: string[];
  defaultGeneratorConfig: DefaultGeneratorConfig;
  affiliateProducts: AffiliateProduct[];
  /** Short label for related links / grid (e.g. "Women", "HIIT") */
  shortLabel: string;
  /** Optional tag for grid card (e.g. "No equipment", "Popular") */
  tag?: string;
}

export const WORKOUT_PLAN_SLUGS = [
  'women',
  'men',
  'beginners',
  'hiit',
  'home',
  'strength',
  'weight-loss',
] as const;

export type WorkoutPlanSlug = (typeof WORKOUT_PLAN_SLUGS)[number];

export const WORKOUT_PLAN_LIBRARY: Record<string, PlanPageDefinition> = {
  women: {
    slug: 'women',
    routePath: '/workout-generator/women',
    shortLabel: 'Workouts for Women',
    title: 'Workout Generator for Women — Free AI Plans, No Signup | AIWorkoutNow',
    metaDescription:
      'Generate a workout for women in seconds. Free AI workout generator for women. No signup. Home or gym, strength, toning, and fat loss.',
    h1: 'Free AI Workout Generator for Women — No Signup',
    introParagraphs: [
      'Our AI workout generator creates plans tailored to common goals like strength, toning, and fat loss. Whether you prefer home or gym, short or long sessions, you get a personalized plan in seconds.',
      'No signup is required. Try three free workouts, then unlock more with a one-time payment if you like the results. The generator adapts to your fitness level and available equipment.',
    ],
    keyBenefits: [
      'Strength and toning focus',
      'Home or gym',
      'Flexible duration',
      'No signup required',
    ],
    sampleWorkout: {
      warmUp: ['2 min march', 'Hip circles', 'Arm circles'],
      mainCircuit: [
        { name: 'Squats', sets: 3, reps: 12 },
        { name: 'Push-ups (or modified)', sets: 2, reps: 8 },
        { name: 'Glute bridges', sets: 3, reps: 12 },
        { name: 'Plank', duration: '30 sec' },
        { name: 'Lunges', sets: 2, reps: 10 },
      ],
      cooldown: ['2 min walk', 'Hip stretch', 'Chest stretch'],
      estimatedMinutes: 30,
    },
    tips: [
      'Choose your real fitness level so the plan matches your ability.',
      'Start with 20–30 minutes if you are new to strength work.',
      'Use "Minimal" equipment for bodyweight-only options.',
      'Add "toning" or "strength" in goals for focused plans.',
      'Allow at least one rest day between full-body sessions.',
    ],
    faq: [
      { question: 'Is the workout generator for women free?', answer: 'Yes. You get 3 free workouts with no signup. After that you can unlock more with a one-time payment.' },
      { question: 'Can I use it at home?', answer: 'Yes. Select your equipment (e.g. minimal or dumbbells) and get home-friendly plans.' },
      { question: 'What goals can I pick?', answer: 'You can focus on strength, toning, fat loss, or general fitness. The generator adapts to your choices.' },
    ],
    relatedSlugs: ['beginners', 'weight-loss', 'home', 'strength', 'hiit'],
    defaultGeneratorConfig: {
      workoutType: 'full-body',
      duration: '30',
      equipment: 'minimal',
      fitnessLevel: 'beginner',
      goals: 'strength, toning',
    },
    affiliateProducts: [
      {
        name: 'Resistance Bands Set',
        description: 'Versatile for glutes, arms, and legs. Easy to store and travel.',
        amazonUrlPlaceholder: '__AMAZON_LINK_RESISTANCE_BANDS__',
        category: 'Equipment',
      },
      {
        name: 'Yoga Mat',
        description: 'Non-slip surface for floor work and stretching.',
        amazonUrlPlaceholder: '__AMAZON_LINK_YOGA_MAT__',
        category: 'Equipment',
      },
    ],
  },

  men: {
    slug: 'men',
    routePath: '/workout-generator/men',
    shortLabel: 'Workouts for Men',
    title: 'Workout Generator for Men — Free AI Plans, No Signup | AIWorkoutNow',
    metaDescription:
      'Generate a workout for men in seconds. Free AI workout generator for men. No signup. Strength, muscle, HIIT, and more.',
    h1: 'Free AI Workout Generator for Men — No Signup',
    introParagraphs: [
      'Get a personalized workout in seconds. Our AI creates plans for strength, muscle building, and conditioning—for home or gym. No signup required; try three free workouts first.',
      'Plans scale to your level and equipment. Choose from bodyweight, dumbbells, or full gym and get a structured session with warm-up, main work, and cooldown.',
    ],
    keyBenefits: [
      'Strength and muscle focus',
      'Scalable intensity',
      'Home or gym',
      'No signup required',
    ],
    sampleWorkout: {
      warmUp: ['3 min light cardio', 'Dynamic stretch', 'Activation'],
      mainCircuit: [
        { name: 'Squats (or goblet squats)', sets: 4, reps: 10 },
        { name: 'Push-ups', sets: 3, reps: 12 },
        { name: 'Rows (band or dumbbell)', sets: 3, reps: 10 },
        { name: 'Lunges', sets: 2, reps: 10 },
        { name: 'Plank', duration: '45 sec' },
      ],
      cooldown: ['3 min walk', 'Full-body stretch'],
      estimatedMinutes: 45,
    },
    tips: [
      'Select "Strength" or "HIIT" in the generator for focused plans.',
      'Use 45–60 minutes if you have time for full sessions.',
      'Progressive overload: aim to add reps or weight over time.',
      'Rest 48–72 hours between heavy strength days for the same muscles.',
      'Add "muscle gain" in goals for hypertrophy-oriented sets and reps.',
    ],
    faq: [
      { question: 'Is the workout generator for men free?', answer: 'Yes. 3 free workouts with no signup. Unlock more with a one-time payment.' },
      { question: 'Can I build muscle with this?', answer: 'Yes. Choose strength-focused plans and your equipment for muscle-building workouts with sets and reps.' },
    ],
    relatedSlugs: ['strength', 'hiit', 'weight-loss', 'home', 'beginners'],
    defaultGeneratorConfig: {
      workoutType: 'strength',
      duration: '45',
      equipment: 'minimal',
      fitnessLevel: 'intermediate',
      goals: 'strength, muscle gain',
    },
    affiliateProducts: [
      {
        name: 'Adjustable Dumbbells',
        description: 'Space-saving weights for strength and muscle at home.',
        amazonUrlPlaceholder: '__AMAZON_LINK_ADJUSTABLE_DUMBBELLS__',
        category: 'Equipment',
      },
      {
        name: 'Pull-Up Bar',
        description: 'For back and grip strength. Doorway or wall mount.',
        amazonUrlPlaceholder: '__AMAZON_LINK_PULL_UP_BAR__',
        category: 'Equipment',
      },
    ],
  },

  beginners: {
    slug: 'beginners',
    routePath: '/workout-generator/beginners',
    shortLabel: 'Beginner Workouts',
    title: 'Workout Generator for Beginners — Free AI Plans, No Signup | AIWorkoutNow',
    metaDescription:
      'Generate a beginner-friendly workout in seconds. Free AI workout generator for beginners. No signup. Safe, clear, and effective.',
    h1: 'Beginner Workouts — No Signup',
    introParagraphs: [
      'New to fitness? Our AI creates safe, clear workouts that build habit without overwhelm. You choose your level, time, and equipment—we give you a step-by-step plan.',
      'No signup required. Try three free beginner workouts. Each plan includes warm-up, main exercises with simple progressions, and cooldown. Perfect for building consistency.',
    ],
    keyBenefits: [
      'Safe progressions',
      'Clear instructions',
      'Short sessions',
      'No experience needed',
    ],
    sampleWorkout: {
      warmUp: ['2 min walk in place', 'Arm circles', 'Ankle circles'],
      mainCircuit: [
        { name: 'Wall push-ups', sets: 2, reps: 8 },
        { name: 'Chair squats', sets: 2, reps: 10 },
        { name: 'Standing leg raises', sets: 2, reps: 8 },
        { name: 'Seated march', duration: '1 min' },
        { name: 'Stretch break', duration: '30 sec' },
        { name: 'Repeat once', duration: undefined, notes: undefined },
      ],
      cooldown: ['2 min walk', 'Gentle stretch'],
      estimatedMinutes: 20,
    },
    tips: [
      'Start with 15–20 minute sessions to build the habit.',
      'Always choose "Beginner" in the generator for appropriate intensity.',
      'Use "Minimal" equipment for bodyweight-only, low-barrier plans.',
      'Rest at least one day between full-body workouts.',
      'Focus on form over speed; the AI plans are designed to be approachable.',
    ],
    faq: [
      { question: 'Is the beginner workout generator free?', answer: 'Yes. 3 free beginner workouts with no signup.' },
      { question: 'I have never worked out—is this for me?', answer: 'Yes. Choose "Beginner" and get safe, approachable plans with clear instructions.' },
      { question: 'How long are beginner workouts?', answer: 'We default to 20 minutes. You can pick 15–60 minutes in the generator.' },
    ],
    relatedSlugs: ['home', 'weight-loss', 'women', 'strength', 'hiit'],
    defaultGeneratorConfig: {
      workoutType: 'full-body',
      duration: '20',
      equipment: 'minimal',
      fitnessLevel: 'beginner',
      goals: 'general fitness, build habit',
    },
    affiliateProducts: [
      {
        name: 'Exercise Mat',
        description: 'Comfortable surface for floor exercises and stretching.',
        amazonUrlPlaceholder: '__AMAZON_LINK_EXERCISE_MAT__',
        category: 'Equipment',
      },
    ],
  },

  hiit: {
    slug: 'hiit',
    routePath: '/workout-generator/hiit',
    shortLabel: 'Quick Fat-Burn Workouts (20–30 min)',
    title: 'Quick Fat-Burn Workouts (20–30 min) — Free AI Plans, No Signup | AIWorkoutNow',
    metaDescription:
      'Generate a quick fat-burn workout in seconds. High-intensity sessions (20–30 min). No signup. Home or gym.',
    h1: 'Quick Fat-Burn Workouts (20–30 min) — No Signup',
    introParagraphs: [
      'High-intensity interval training burns calories and builds conditioning in short sessions. Our AI creates HIIT plans tailored to your level and equipment—often 15–25 minutes including warm-up and cooldown.',
      'No signup required. Try three free HIIT workouts. You can do them at home with minimal or no equipment, or in a gym.',
    ],
    keyBenefits: [
      'Burn calories fast',
      'Short intense sessions',
      'No equipment required',
      'Ideal for busy schedules',
    ],
    sampleWorkout: {
      warmUp: ['2 min light jog or march in place', '1 min arm circles', '1 min leg swings'],
      mainCircuit: [
        { name: 'Jump squats', duration: '30 sec', notes: 'Work' },
        { name: 'Rest', duration: '30 sec', notes: 'Recover' },
        { name: 'Burpees', duration: '30 sec', notes: 'Work' },
        { name: 'Rest', duration: '30 sec', notes: 'Recover' },
        { name: 'Mountain climbers', duration: '30 sec', notes: 'Work' },
        { name: 'Rest', duration: '30 sec', notes: 'Recover' },
        { name: 'Repeat circuit 3–4 times', duration: undefined, notes: undefined },
      ],
      cooldown: ['2 min walk in place', '1 min hamstring stretch', '1 min chest stretch'],
      estimatedMinutes: 20,
    },
    tips: [
      'Start with 20 sec work / 40 sec rest if you are new to HIIT.',
      'Do HIIT 2–3 times per week; allow a rest day between sessions.',
      'Use "Minimal" equipment for bodyweight-only HIIT.',
      'Stay hydrated and listen to your body; scale intensity as needed.',
      'Warm up and cool down are included in every generated plan.',
    ],
    faq: [
      { question: 'Is HIIT safe for beginners?', answer: 'Yes. Start with shorter work intervals and longer rest. The generator lets you choose your fitness level.' },
      { question: 'How often should I do HIIT?', answer: '2–3 times per week is enough. Allow at least one rest day between HIIT sessions.' },
      { question: 'Can I do HIIT without equipment?', answer: 'Yes. Bodyweight HIIT (burpees, jump squats, mountain climbers) is very effective. Select "Minimal" in the generator.' },
      { question: 'Is the HIIT generator free?', answer: 'Yes. You get 3 free HIIT workouts with no signup. After that you can unlock more with a one-time payment.' },
    ],
    relatedSlugs: ['strength', 'weight-loss', 'home', 'beginners', 'women'],
    defaultGeneratorConfig: {
      workoutType: 'hiit',
      duration: '30',
      equipment: 'minimal',
      fitnessLevel: 'beginner',
      goals: 'conditioning, fat loss',
    },
    affiliateProducts: [
      {
        name: 'Interval Timer',
        description: 'Simple timer for work/rest intervals.',
        amazonUrlPlaceholder: '__AMAZON_LINK_INTERVAL_TIMER__',
        category: 'Accessories',
      },
      {
        name: 'Jump Rope',
        description: 'Portable cardio for warm-up or HIIT rounds.',
        amazonUrlPlaceholder: '__AMAZON_LINK_JUMP_ROPE__',
        category: 'Equipment',
      },
    ],
  },

  home: {
    slug: 'home',
    routePath: '/workout-generator/home',
    shortLabel: 'Home Workouts (No Equipment)',
    title: 'Home Workouts (No Equipment) — Free AI Plans, No Signup | AIWorkoutNow',
    metaDescription:
      'Generate a home workout in seconds. Free AI home workout generator. No signup. Works with bodyweight or minimal equipment.',
    h1: 'Home Workouts (No Equipment) — No Signup',
    introParagraphs: [
      'Effective workouts with minimal or no equipment. Our AI builds plans for your space—bodyweight, dumbbells, or resistance bands. No gym required.',
      'No signup required. Try three free home workouts. Each plan includes warm-up, main exercises, and cooldown. You choose duration and equipment.',
    ],
    keyBenefits: [
      'No gym required',
      'Bodyweight or minimal equipment',
      'Fits any schedule',
      'Privacy of your own space',
    ],
    sampleWorkout: {
      warmUp: ['2 min march in place', '1 min arm circles', '1 min hip circles'],
      mainCircuit: [
        { name: 'Push-ups', sets: 3, reps: 10 },
        { name: 'Bodyweight squats', sets: 3, reps: 12 },
        { name: 'Glute bridges', sets: 3, reps: 12 },
        { name: 'Plank', duration: '30–45 sec' },
        { name: 'Lunges (each leg)', sets: 2, reps: 10 },
      ],
      cooldown: ['2 min walk', 'Quad stretch', 'Shoulder stretch'],
      estimatedMinutes: 30,
    },
    tips: [
      'Select "Minimal" for bodyweight-only; add dumbbells or bands if you have them.',
      'Pick a duration that fits your day (15–60 minutes).',
      'Use a mat for floor work and comfort.',
      'Keep a water bottle nearby.',
      'Consistency matters more than length—short regular sessions work.',
    ],
    faq: [
      { question: 'Do I need equipment for home workouts?', answer: 'No. You can choose "Minimal" (bodyweight) and get effective home workouts with no equipment.' },
      { question: 'Is the home workout generator free?', answer: 'Yes. 3 free home workouts with no signup. Unlock more with a one-time payment if you like it.' },
      { question: 'How long are home workouts?', answer: 'You pick 15, 30, 45, or 60 minutes. We default to 30 minutes for a solid session.' },
    ],
    relatedSlugs: ['hiit', 'strength', 'beginners', 'weight-loss', 'women'],
    tag: 'No equipment',
    defaultGeneratorConfig: {
      workoutType: 'full-body',
      duration: '30',
      equipment: 'minimal',
      fitnessLevel: 'beginner',
      goals: 'general fitness',
    },
    affiliateProducts: [
      {
        name: 'Resistance Bands Set',
        description: 'For strength and mobility at home. No gym needed.',
        amazonUrlPlaceholder: '__AMAZON_LINK_RESISTANCE_BANDS__',
        badge: 'No equipment',
        category: 'Equipment',
      },
      {
        name: 'Yoga Mat',
        description: 'Stable, non-slip surface for floor exercises.',
        amazonUrlPlaceholder: '__AMAZON_LINK_YOGA_MAT__',
        category: 'Equipment',
      },
    ],
  },

  strength: {
    slug: 'strength',
    routePath: '/workout-generator/strength',
    shortLabel: 'Strength Building Workouts',
    title: 'Strength Building Workouts — Free AI Plans, No Signup | AIWorkoutNow',
    metaDescription:
      'Generate a strength training workout in seconds. Free AI strength workout generator for muscle and power. No signup.',
    h1: 'Strength Building Workouts — No Signup',
    introParagraphs: [
      'Build muscle and strength with structured sets and reps. Our AI creates strength plans for bodyweight, dumbbells, or full gym—tailored to your level and goals.',
      'No signup required. Try three free strength workouts. Plans include warm-up, main exercises with sets and reps, and cooldown. Progressive overload is built into the structure.',
    ],
    keyBenefits: [
      'Structured sets and reps',
      'Progressive overload focus',
      'Bodyweight or weights',
      'Clear rest periods',
    ],
    sampleWorkout: {
      warmUp: ['5 min light cardio', 'Dynamic stretches', 'Activation (band or bodyweight)'],
      mainCircuit: [
        { name: 'Goblet squats', sets: 4, reps: 8 },
        { name: 'Push-ups (or variation)', sets: 3, reps: 10 },
        { name: 'Romanian deadlifts', sets: 3, reps: 10 },
        { name: 'Rows (dumbbell or band)', sets: 3, reps: 10 },
        { name: 'Plank', duration: '45 sec' },
      ],
      cooldown: ['3 min walk', 'Hip flexor stretch', 'Chest stretch'],
      estimatedMinutes: 45,
    },
    tips: [
      'Use 45–60 minutes for full strength sessions.',
      'Rest 48–72 hours between working the same muscle groups.',
      'Add "strength" or "muscle gain" in goals for focused plans.',
      'Choose equipment that matches what you have (minimal, dumbbells, full gym).',
      'Form and control matter more than speed.',
    ],
    faq: [
      { question: 'Is the strength generator free?', answer: 'Yes. 3 free strength workouts with no signup. Then one-time payment to unlock more.' },
      { question: 'Can I build muscle with bodyweight only?', answer: 'Yes. The generator can create bodyweight strength plans with progressions.' },
      { question: 'How many sets and reps for strength?', answer: 'Our AI typically uses 3–5 sets and 4–12 reps depending on exercise and your level.' },
      { question: 'How often should I do strength workouts?', answer: '2–4 times per week. Allow 48 hours between working the same muscle groups.' },
    ],
    relatedSlugs: ['hiit', 'weight-loss', 'home', 'men', 'women'],
    defaultGeneratorConfig: {
      workoutType: 'strength',
      duration: '45',
      equipment: 'minimal',
      fitnessLevel: 'intermediate',
      goals: 'strength, muscle gain',
    },
    affiliateProducts: [
      {
        name: 'Dumbbell Set',
        description: 'Versatile weights for strength at home or gym.',
        amazonUrlPlaceholder: '__AMAZON_LINK_DUMBBELL_SET__',
        category: 'Equipment',
      },
      {
        name: 'Resistance Bands',
        description: 'For activation, rows, and leg work.',
        amazonUrlPlaceholder: '__AMAZON_LINK_RESISTANCE_BANDS_STRENGTH__',
        category: 'Equipment',
      },
    ],
  },

  'weight-loss': {
    slug: 'weight-loss',
    routePath: '/workout-generator/weight-loss',
    shortLabel: 'Lose Weight',
    title: 'Lose Weight — Free AI Workout Plans, No Signup | AIWorkoutNow',
    metaDescription:
      'Generate a weight loss workout in seconds. Free AI weight loss workout generator. No signup. Cardio and strength combined.',
    h1: 'Lose Weight — No Signup',
    introParagraphs: [
      'Workouts designed to burn fat and support metabolism. Our AI combines cardio and strength so you get effective, time-efficient sessions. No signup—try three free weight loss workouts.',
      'Plans adapt to your level and equipment. You can do them at home with minimal gear or in a gym. Consistency and a healthy diet will improve results over time.',
    ],
    keyBenefits: [
      'Fat-burning focus',
      'Cardio + strength mix',
      'Manageable duration',
      'Home or gym',
    ],
    sampleWorkout: {
      warmUp: ['3 min brisk walk or march', 'Arm swings', 'Leg swings'],
      mainCircuit: [
        { name: 'March or jog in place', duration: '2 min' },
        { name: 'Squats', sets: 2, reps: 15 },
        { name: 'Jumping jacks', duration: '1 min' },
        { name: 'Lunges', sets: 2, reps: 10 },
        { name: 'High knees', duration: '1 min' },
        { name: 'Rest or walk', duration: '1 min' },
        { name: 'Repeat 2–3 times', duration: undefined, notes: undefined },
      ],
      cooldown: ['3 min walk', 'Full-body stretch'],
      estimatedMinutes: 30,
    },
    tips: [
      'Aim for 3–5 sessions per week combined with a healthy diet.',
      'Mix cardio and strength; the generator can create both.',
      'Start with 30 minutes if you are new; increase as you adapt.',
      'Use "fat loss" or "weight loss" in goals for targeted plans.',
      'Rest and recovery are part of long-term success.',
    ],
    faq: [
      { question: 'Is the weight loss workout generator free?', answer: 'Yes. 3 free weight loss workouts with no signup.' },
      { question: 'Do I need a gym?', answer: 'No. You can do weight loss workouts at home with bodyweight or minimal equipment.' },
      { question: 'How often for weight loss?', answer: '3–5 sessions per week combined with a healthy diet. Our generator can create a mix of cardio and strength.' },
    ],
    relatedSlugs: ['hiit', 'strength', 'beginners', 'home', 'women'],
    defaultGeneratorConfig: {
      workoutType: 'cardio',
      duration: '30',
      equipment: 'minimal',
      fitnessLevel: 'beginner',
      goals: 'fat loss, weight loss',
    },
    affiliateProducts: [
      {
        name: 'Fitness Tracker',
        description: 'Track heart rate and activity to support your goals.',
        amazonUrlPlaceholder: '__AMAZON_LINK_FITNESS_TRACKER__',
        category: 'Accessories',
      },
    ],
  },
};

export function getPlanPage(slug: string): PlanPageDefinition | undefined {
  return WORKOUT_PLAN_LIBRARY[slug];
}

export function getAllPlanPages(): PlanPageDefinition[] {
  return WORKOUT_PLAN_SLUGS.map((s) => WORKOUT_PLAN_LIBRARY[s]).filter(Boolean);
}

export function getPlanRoutesForSitemap(): { path: string; changefreq: string; priority: number }[] {
  return WORKOUT_PLAN_SLUGS.map((slug) => ({
    path: WORKOUT_PLAN_LIBRARY[slug].routePath,
    changefreq: 'monthly',
    priority: 0.7,
  }));
}

export function getDefaultGeneratorConfigFromLibrary(slug: string): DefaultGeneratorConfig | undefined {
  const page = getPlanPage(slug);
  if (!page) return undefined;
  const d = { ...page.defaultGeneratorConfig };
  const validDurations = ['15', '30', '45', '60'];
  if (d.duration && !validDurations.includes(d.duration)) {
    d.duration = d.duration === '20' ? '30' : '30';
  }
  return d;
}

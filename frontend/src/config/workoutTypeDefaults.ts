/**
 * Route-based defaults for workout-type landing pages.
 * Maps slug to generator defaults, hero content, sample workout, and FAQ.
 * Defaults are applied only on first render; user changes are preserved.
 */

export interface GeneratorDefaults {
  fitnessLevel?: string;
  workoutType?: string;
  duration?: string; // '15' | '30' | '45' | '60'
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

export interface WorkoutTypeConfig {
  label: string;
  description: string;
  /** Applied to generator on first load only */
  defaults: GeneratorDefaults;
  /** Hero benefits bullets */
  benefits: string[];
  ctaLabel: string;
  /** Intro paragraph below hero */
  intro: string;
  sampleWorkout: SampleWorkoutData;
  faq: { question: string; answer: string }[];
  relatedSlugs: { path: string; label: string }[];
  /** SEO */
  seoTitle: string;
  seoDescription: string;
}

export const WORKOUT_TYPE_SLUGS = ['hiit', 'home', 'strength', 'weight-loss', 'beginners', 'women', 'men'] as const;
export type WorkoutTypeSlug = (typeof WORKOUT_TYPE_SLUGS)[number];

export const WORKOUT_TYPE_DEFAULTS: Record<string, WorkoutTypeConfig> = {
  hiit: {
    label: 'HIIT',
    description: 'High-intensity interval training to burn calories fast. Short sessions, big results.',
    defaults: {
      workoutType: 'hiit',
      duration: '20',
      equipment: 'minimal',
      fitnessLevel: 'beginner',
      goals: 'conditioning, fat loss',
    },
    benefits: [
      'Burn calories fast',
      'Short intense sessions',
      'No equipment required',
      'Ideal for busy schedules',
    ],
    ctaLabel: 'Generate HIIT Workout',
    intro: 'Get a personalized HIIT workout in seconds. Our AI creates high-intensity interval plans tailored to your level and equipment. No signup—try free, then unlock more with a one-time payment.',
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
    faq: [
      { question: 'Is HIIT safe for beginners?', answer: 'Yes. Start with shorter work intervals (e.g. 20 sec) and longer rest. Our generator lets you choose your fitness level so the plan matches your ability.' },
      { question: 'How often should I do HIIT?', answer: '2–3 times per week is enough. Allow at least one rest day between HIIT sessions so your body can recover.' },
      { question: 'Can I do HIIT without equipment?', answer: 'Yes. Bodyweight HIIT (burpees, jump squats, mountain climbers) is very effective. Select "Minimal" equipment in the generator.' },
      { question: 'How long is a typical HIIT workout?', answer: '15–25 minutes including warm-up and cooldown. We default to 20 minutes; you can change duration in the generator.' },
      { question: 'Is the HIIT generator free?', answer: 'Yes. You get 3 free HIIT workouts with no signup. After that you can unlock more with a one-time payment.' },
    ],
    relatedSlugs: [
      { path: '/workout-generator/strength', label: 'Strength' },
      { path: '/workout-generator/weight-loss', label: 'Weight Loss' },
      { path: '/workout-generator/home', label: 'Home Workouts' },
      { path: '/workout-generator/beginners', label: 'Beginners' },
      { path: '/pricing', label: 'Pricing' },
      { path: '/faq', label: 'FAQ' },
    ],
    seoTitle: 'Free AI HIIT Workout Generator — No Signup | AIWorkoutNow',
    seoDescription: 'Generate a HIIT workout in seconds. Free AI HIIT workout generator for home or gym. No signup required.',
  },

  home: {
    label: 'Home Workout',
    description: 'Effective workouts with minimal or no equipment. Do it anywhere.',
    defaults: {
      workoutType: 'full-body',
      duration: '30',
      equipment: 'minimal',
      fitnessLevel: 'beginner',
      goals: 'general fitness',
    },
    benefits: [
      'No gym required',
      'Bodyweight or minimal equipment',
      'Fits any schedule',
      'Privacy of your own space',
    ],
    ctaLabel: 'Generate Home Workout',
    intro: 'Get a personalized home workout in seconds. Our AI builds plans for your space and equipment—bodyweight, dumbbells, or resistance bands. No signup. Try 3 free home workouts, then unlock more.',
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
    faq: [
      { question: 'Do I need equipment for home workouts?', answer: 'No. You can choose "Minimal" (bodyweight) and get effective home workouts with no equipment.' },
      { question: 'Is the home workout generator free?', answer: 'Yes. 3 free home workouts with no signup. Unlock more with a one-time payment if you like it.' },
      { question: 'How long are home workouts?', answer: 'You pick 15, 30, 45, or 60 minutes. We default to 30 minutes for a solid session.' },
      { question: 'Can I do these in a small space?', answer: 'Yes. Home workouts are designed for limited space. Avoid exercises that need a lot of room if you select that in goals.' },
    ],
    relatedSlugs: [
      { path: '/workout-generator/hiit', label: 'HIIT' },
      { path: '/workout-generator/strength', label: 'Strength' },
      { path: '/workout-generator/beginners', label: 'Beginners' },
      { path: '/workout-generator/weight-loss', label: 'Weight Loss' },
      { path: '/pricing', label: 'Pricing' },
      { path: '/faq', label: 'FAQ' },
    ],
    seoTitle: 'Home Workout Generator — Free AI Home Workouts, No Signup',
    seoDescription: 'Generate a home workout in seconds. Free AI home workout generator. No signup. Works with bodyweight or minimal equipment.',
  },

  strength: {
    label: 'Strength Training',
    description: 'Build muscle and strength with structured sets and reps.',
    defaults: {
      workoutType: 'strength',
      duration: '45',
      equipment: 'minimal',
      fitnessLevel: 'intermediate',
      goals: 'strength, muscle gain',
    },
    benefits: [
      'Structured sets and reps',
      'Progressive overload focus',
      'Bodyweight or weights',
      'Clear rest periods',
    ],
    ctaLabel: 'Generate Strength Workout',
    intro: 'Get a personalized strength workout in seconds. Our AI creates plans for building muscle and strength—whether you use bodyweight, dumbbells, or a full gym. No signup. Try 3 free strength workouts.',
    sampleWorkout: {
      warmUp: ['5 min light cardio', 'Dynamic stretches', 'Activation (band or bodyweight)'],
      mainCircuit: [
        { name: 'Goblet squats', sets: 4, reps: 8 },
        { name: 'Push-ups (or push-up variation)', sets: 3, reps: 10 },
        { name: 'Romanian deadlifts', sets: 3, reps: 10 },
        { name: 'Rows (dumbbell or band)', sets: 3, reps: 10 },
        { name: 'Plank', duration: '45 sec' },
      ],
      cooldown: ['3 min walk', 'Hip flexor stretch', 'Chest stretch'],
      estimatedMinutes: 45,
    },
    faq: [
      { question: 'Is the strength generator free?', answer: 'Yes. 3 free strength workouts with no signup. Then one-time payment to unlock more.' },
      { question: 'Can I build muscle with bodyweight only?', answer: 'Yes. The generator can create bodyweight strength plans that build muscle with progressions.' },
      { question: 'How many sets and reps for strength?', answer: 'Our AI typically uses 3–5 sets and 4–12 reps depending on the exercise and your level. You can add "strength" or "muscle gain" in goals.' },
      { question: 'How often should I do strength workouts?', answer: '2–4 times per week. Allow 48 hours between working the same muscle groups.' },
    ],
    relatedSlugs: [
      { path: '/workout-generator/hiit', label: 'HIIT' },
      { path: '/workout-generator/weight-loss', label: 'Weight Loss' },
      { path: '/workout-generator/home', label: 'Home' },
      { path: '/workout-generator/men', label: 'Men' },
      { path: '/pricing', label: 'Pricing' },
      { path: '/faq', label: 'FAQ' },
    ],
    seoTitle: 'Strength Workout Generator — Free AI Strength Plans, No Signup',
    seoDescription: 'Generate a strength training workout in seconds. Free AI strength workout generator for muscle and power. No signup.',
  },

  'weight-loss': {
    label: 'Weight Loss',
    description: 'Workouts designed to burn fat and boost metabolism.',
    defaults: {
      workoutType: 'cardio',
      duration: '30',
      equipment: 'minimal',
      fitnessLevel: 'beginner',
      goals: 'fat loss, weight loss',
    },
    benefits: [
      'Fat-burning focus',
      'Cardio + strength mix',
      'Manageable duration',
      'Home or gym',
    ],
    ctaLabel: 'Generate Weight Loss Workout',
    intro: 'Get a personalized weight loss workout in seconds. Our AI combines cardio and strength for fat loss. No signup—try 3 free workouts, then unlock more. Choose your level and equipment.',
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
    faq: [
      { question: 'Is the weight loss workout generator free?', answer: 'Yes. 3 free weight loss workouts with no signup.' },
      { question: 'Do I need a gym?', answer: 'No. You can do weight loss workouts at home with bodyweight or minimal equipment.' },
      { question: 'How often for weight loss?', answer: '3–5 sessions per week combined with a healthy diet. Our generator can create a mix of cardio and strength.' },
    ],
    relatedSlugs: [
      { path: '/workout-generator/hiit', label: 'HIIT' },
      { path: '/workout-generator/strength', label: 'Strength' },
      { path: '/workout-generator/beginners', label: 'Beginners' },
      { path: '/workout-generator/home', label: 'Home' },
      { path: '/pricing', label: 'Pricing' },
      { path: '/faq', label: 'FAQ' },
    ],
    seoTitle: 'Weight Loss Workout Generator — Free AI Plans, No Signup',
    seoDescription: 'Generate a weight loss workout in seconds. Free AI weight loss workout generator. No signup. Cardio and strength combined.',
  },

  beginners: {
    label: 'Beginners',
    description: 'Safe, clear workouts for people new to fitness.',
    defaults: {
      workoutType: 'full-body',
      duration: '20',
      equipment: 'minimal',
      fitnessLevel: 'beginner',
      goals: 'general fitness, build habit',
    },
    benefits: [
      'Safe progressions',
      'Clear instructions',
      'Short sessions',
      'No experience needed',
    ],
    ctaLabel: 'Generate Beginner Workout',
    intro: 'Get a beginner-friendly workout in seconds. Our AI creates safe, clear plans that build fitness without overwhelm. No signup. Try 3 free beginner workouts.',
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
    faq: [
      { question: 'Is the beginner workout generator free?', answer: 'Yes. 3 free beginner workouts with no signup.' },
      { question: 'I have never worked out—is this for me?', answer: 'Yes. Choose "Beginner" and the plans are designed to be safe and approachable with clear instructions.' },
      { question: 'How long are beginner workouts?', answer: 'We default to 20 minutes. You can pick 15–60 minutes in the generator.' },
    ],
    relatedSlugs: [
      { path: '/workout-generator/home', label: 'Home' },
      { path: '/workout-generator/weight-loss', label: 'Weight Loss' },
      { path: '/workout-generator/women', label: 'Women' },
      { path: '/workout-generator/strength', label: 'Strength' },
      { path: '/pricing', label: 'Pricing' },
      { path: '/faq', label: 'FAQ' },
    ],
    seoTitle: 'Workout Generator for Beginners — Free AI Plans, No Signup',
    seoDescription: 'Generate a beginner-friendly workout in seconds. Free AI workout generator for beginners. No signup. Safe, clear, and effective.',
  },

  women: {
    label: 'Women',
    description: 'Workouts tailored to common goals: strength, fat loss, toning.',
    defaults: {
      workoutType: 'full-body',
      duration: '30',
      equipment: 'minimal',
      fitnessLevel: 'beginner',
      goals: 'strength, toning',
    },
    benefits: [
      'Strength and toning focus',
      'Home or gym',
      'Flexible duration',
      'No signup required',
    ],
    ctaLabel: 'Generate Workout for Women',
    intro: 'Get a personalized workout in seconds. Our AI creates plans for strength, fat loss, and fitness—tailored to your level and equipment. No signup. Try 3 free workouts.',
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
    faq: [
      { question: 'Is the workout generator for women free?', answer: 'Yes. 3 free workouts with no signup.' },
      { question: 'Can I use it at home?', answer: 'Yes. Select your equipment and get home-friendly plans.' },
    ],
    relatedSlugs: [
      { path: '/workout-generator/beginners', label: 'Beginners' },
      { path: '/workout-generator/weight-loss', label: 'Weight Loss' },
      { path: '/workout-generator/home', label: 'Home' },
      { path: '/workout-generator/strength', label: 'Strength' },
      { path: '/pricing', label: 'Pricing' },
      { path: '/faq', label: 'FAQ' },
    ],
    seoTitle: 'Workout Generator for Women — Free AI Plans, No Signup',
    seoDescription: 'Generate a workout for women in seconds. Free AI workout generator for women. No signup. Home or gym, any goal.',
  },

  men: {
    label: 'Men',
    description: 'Workouts for strength, muscle, and conditioning.',
    defaults: {
      workoutType: 'strength',
      duration: '45',
      equipment: 'minimal',
      fitnessLevel: 'intermediate',
      goals: 'strength, muscle gain',
    },
    benefits: [
      'Strength and muscle focus',
      'Scalable intensity',
      'Home or gym',
      'No signup required',
    ],
    ctaLabel: 'Generate Workout for Men',
    intro: 'Get a personalized workout in seconds. Our AI creates plans for strength, muscle, and fitness—for home or gym. No signup. Try 3 free workouts.',
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
    faq: [
      { question: 'Is the workout generator for men free?', answer: 'Yes. 3 free workouts with no signup.' },
      { question: 'Can I build muscle with this?', answer: 'Yes. Choose strength-focused plans and your equipment for muscle-building workouts.' },
    ],
    relatedSlugs: [
      { path: '/workout-generator/strength', label: 'Strength' },
      { path: '/workout-generator/hiit', label: 'HIIT' },
      { path: '/workout-generator/weight-loss', label: 'Weight Loss' },
      { path: '/workout-generator/home', label: 'Home' },
      { path: '/pricing', label: 'Pricing' },
      { path: '/faq', label: 'FAQ' },
    ],
    seoTitle: 'Workout Generator for Men — Free AI Plans, No Signup',
    seoDescription: 'Generate a workout for men in seconds. Free AI workout generator for men. No signup. Strength, HIIT, and more.',
  },
};

/** Duration in generator is 15|30|45|60; HIIT uses 20 in our default but component only has 15/30/45/60. Normalize to valid value. */
export function getGeneratorDefaults(slug: string): GeneratorDefaults | undefined {
  const config = WORKOUT_TYPE_DEFAULTS[slug];
  if (!config) return undefined;
  const d = { ...config.defaults };
  const validDurations = ['15', '30', '45', '60'];
  if (d.duration && !validDurations.includes(d.duration)) {
    d.duration = d.duration === '20' ? '15' : '30';
  }
  return d;
}

export function getWorkoutTypeConfig(slug: string): WorkoutTypeConfig | undefined {
  return WORKOUT_TYPE_DEFAULTS[slug];
}

/**
 * Content for SEO landing pages. Each entry is used by LandingPageTemplate.
 */
export interface LandingPageContent {
  slug: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  howItWorks: string[];
  relatedSlugs: { path: string; label: string }[];
  faqItems: { question: string; answer: string }[];
}

export const LANDING_PAGES: Record<string, LandingPageContent> = {
  'workout-plan-generator': {
    slug: '/workout-plan-generator',
    title: 'Workout Plan Generator — Free AI Plans, No Signup | AIWorkoutNow',
    description: 'Generate a custom workout plan in seconds with our free AI workout plan generator. No signup. Try 3 free plans, then unlock more with a one-time payment.',
    h1: 'Free Workout Plan Generator — No Signup',
    intro: 'Get a personalized workout plan in seconds. Our AI workout plan generator builds custom plans for your level, goals, and equipment. No account needed—try three free plans, then unlock more with a one-time payment. Perfect for home or gym, beginners to advanced.',
    howItWorks: [
      'Choose your fitness level, duration, and equipment.',
      'Add goals (e.g. strength, weight loss) and any limitations.',
      'Get a full plan with warm-up, exercises, sets/reps, and cooldown.',
      'Regenerate anytime for variety—no subscription.',
    ],
    relatedSlugs: [
      { path: '/ai-workout-generator', label: 'AI Workout Builder' },
      { path: '/workout-generator/hiit', label: 'Quick Fat-Burn Workouts (20–30 min)' },
      { path: '/workout-generator/strength', label: 'Strength Building Workouts' },
      { path: '/workout-generator/weight-loss', label: 'Lose Weight' },
      { path: '/pricing', label: 'Pricing' },
      { path: '/faq', label: 'FAQ' },
    ],
    faqItems: [
      { question: 'Is the workout plan generator free?', answer: 'Yes. You get 3 free workout plans with no signup. After that you can buy more with a one-time payment.' },
      { question: 'Do I need to create an account?', answer: 'No. You can generate plans immediately with no account or login.' },
      { question: 'Can I use it for home or gym?', answer: 'Yes. Select your equipment and the plan adapts for home or gym.' },
    ],
  },
  hiit: {
    slug: '/workout-generator/hiit',
    title: 'Quick Fat-Burn Workouts (20–30 min) — Free AI Plans, No Signup',
    description: 'Generate a quick fat-burn workout in seconds. High-intensity sessions (20–30 min). No signup. Home or gym.',
    h1: 'Quick Fat-Burn Workouts (20–30 min)',
    intro: 'Get a personalized fat-burn workout in seconds. Our AI creates high-intensity plans tailored to your level and equipment—often 20–30 minutes. No signup—try free, then unlock more with a one-time payment. Built for home or gym.',
    howItWorks: [
      'Select your level and how long you have (15–60 minutes).',
      'Choose equipment: bodyweight, dumbbells, or full gym.',
      'Get a plan with work/rest intervals and exercises.',
      'Regenerate for new routines anytime.',
    ],
    relatedSlugs: [
      { path: '/workout-generator/strength', label: 'Strength Building Workouts' },
      { path: '/workout-generator/weight-loss', label: 'Lose Weight' },
      { path: '/workout-generator/home', label: 'Home Workouts (No Equipment)' },
      { path: '/pricing', label: 'Pricing' },
      { path: '/faq', label: 'FAQ' },
    ],
    faqItems: [
      { question: 'Is the quick fat-burn workout free?', answer: 'Yes. You get 3 free workouts with no signup.' },
      { question: 'Can I do these at home?', answer: 'Yes. Choose bodyweight or minimal equipment and the plan adapts.' },
    ],
  },
  home: {
    slug: '/workout-generator/home',
    title: 'Home Workouts (No Equipment) — Free AI Plans, No Signup',
    description: 'Generate a home workout in seconds. No equipment needed. No signup. Bodyweight or minimal equipment.',
    h1: 'Home Workouts (No Equipment)',
    intro: 'Get a personalized home workout in seconds. Our AI builds plans for your space and equipment—bodyweight, dumbbells, or resistance bands. No signup. Try 3 free home workouts, then unlock more with a one-time payment.',
    howItWorks: [
      'Pick your level and duration.',
      'Select equipment you have at home.',
      'Get a full home workout with clear instructions.',
      'No gym required—do it anywhere.',
    ],
    relatedSlugs: [
      { path: '/workout-generator/hiit', label: 'Quick Fat-Burn Workouts (20–30 min)' },
      { path: '/workout-generator/strength', label: 'Strength Building Workouts' },
      { path: '/workout-generator/beginners', label: 'Beginner Workouts' },
      { path: '/pricing', label: 'Pricing' },
      { path: '/faq', label: 'FAQ' },
    ],
    faqItems: [
      { question: 'Do I need equipment for home workouts?', answer: 'No. You can choose bodyweight-only and get effective home workouts.' },
      { question: 'Is the home workout generator free?', answer: 'Yes. 3 free home workouts with no signup.' },
    ],
  },
  strength: {
    slug: '/workout-generator/strength',
    title: 'Strength Building Workouts — Free AI Plans, No Signup',
    description: 'Generate a strength workout in seconds. Build muscle and power. No signup. Bodyweight or gym.',
    h1: 'Strength Building Workouts',
    intro: 'Get a personalized strength workout in seconds. Our AI creates plans for building muscle and strength—whether you use bodyweight, dumbbells, or a full gym. No signup. Try 3 free strength workouts, then unlock more.',
    howItWorks: [
      'Choose your level and time (15–60 min).',
      'Select equipment: bodyweight to full gym.',
      'Get a strength plan with sets, reps, and rest.',
      'Regenerate for variety.',
    ],
    relatedSlugs: [
      { path: '/workout-generator/hiit', label: 'Quick Fat-Burn Workouts (20–30 min)' },
      { path: '/workout-generator/weight-loss', label: 'Lose Weight' },
      { path: '/workout-generator/men', label: 'Workouts for Men' },
      { path: '/pricing', label: 'Pricing' },
      { path: '/faq', label: 'FAQ' },
    ],
    faqItems: [
      { question: 'Is the strength generator free?', answer: 'Yes. 3 free strength workouts with no signup.' },
      { question: 'Can I build muscle with bodyweight only?', answer: 'Yes. The generator can create bodyweight strength plans that build muscle.' },
    ],
  },
  'weight-loss': {
    slug: '/workout-generator/weight-loss',
    title: 'Lose Weight — Free AI Workout Plans, No Signup',
    description: 'Generate a fat-loss workout in seconds. Cardio and strength combined. No signup.',
    h1: 'Lose Weight',
    intro: 'Get a personalized fat-loss workout in seconds. Our AI combines cardio and strength for fat loss. No signup—try 3 free workouts, then unlock more. Choose your level and equipment; we do the rest.',
    howItWorks: [
      'Select your level and duration.',
      'Choose equipment (home or gym).',
      'Get a fat-loss focused plan with cardio and strength.',
      'Regenerate for new routines.',
    ],
    relatedSlugs: [
      { path: '/workout-generator/hiit', label: 'Quick Fat-Burn Workouts (20–30 min)' },
      { path: '/workout-generator/strength', label: 'Strength Building Workouts' },
      { path: '/workout-generator/beginners', label: 'Beginner Workouts' },
      { path: '/pricing', label: 'Pricing' },
      { path: '/faq', label: 'FAQ' },
    ],
    faqItems: [
      { question: 'Is the weight loss workout generator free?', answer: 'Yes. 3 free weight loss workouts with no signup.' },
      { question: 'Do I need a gym?', answer: 'No. You can do weight loss workouts at home with bodyweight or minimal equipment.' },
    ],
  },
  beginners: {
    slug: '/workout-generator/beginners',
    title: 'Beginner Workouts — Free AI Plans, No Signup',
    description: 'Generate a beginner-friendly workout in seconds. Safe, clear, effective. No signup.',
    h1: 'Beginner Workouts',
    intro: 'Get a beginner-friendly workout in seconds. Our AI creates safe, clear plans that build fitness without overwhelm. No signup. Try 3 free beginner workouts, then unlock more with a one-time payment.',
    howItWorks: [
      'Select "Beginner" and your available time.',
      'Choose equipment (or none).',
      'Get a plan with clear instructions and progressions.',
      'Regenerate when you want something new.',
    ],
    relatedSlugs: [
      { path: '/workout-generator/home', label: 'Home Workouts (No Equipment)' },
      { path: '/workout-generator/weight-loss', label: 'Lose Weight' },
      { path: '/workout-generator/women', label: 'Workouts for Women' },
      { path: '/pricing', label: 'Pricing' },
      { path: '/faq', label: 'FAQ' },
    ],
    faqItems: [
      { question: 'Is the beginner workout generator free?', answer: 'Yes. 3 free beginner workouts with no signup.' },
      { question: 'I have never worked out—is this for me?', answer: 'Yes. Choose Beginner and the plans are designed to be safe and approachable.' },
    ],
  },
  women: {
    slug: '/workout-generator/women',
    title: 'Workout Generator for Women — Free AI Plans, No Signup',
    description: 'Generate a workout for women in seconds. Free AI workout generator for women. No signup. Home or gym, any goal.',
    h1: 'Free Workout Generator for Women',
    intro: 'Get a personalized workout in seconds. Our AI workout generator for women creates plans for strength, fat loss, and fitness—tailored to your level and equipment. No signup. Try 3 free workouts, then unlock more with a one-time payment.',
    howItWorks: [
      'Choose your level and duration.',
      'Select equipment (home or gym).',
      'Get a plan suited to your goals.',
      'Regenerate for variety.',
    ],
    relatedSlugs: [
      { path: '/workout-generator/beginners', label: 'Beginner Workouts' },
      { path: '/workout-generator/weight-loss', label: 'Lose Weight' },
      { path: '/workout-generator/home', label: 'Home Workouts (No Equipment)' },
      { path: '/pricing', label: 'Pricing' },
      { path: '/faq', label: 'FAQ' },
    ],
    faqItems: [
      { question: 'Is the workout generator for women free?', answer: 'Yes. 3 free workouts with no signup.' },
      { question: 'Can I use it at home?', answer: 'Yes. Select your equipment and get home-friendly plans.' },
    ],
  },
  men: {
    slug: '/workout-generator/men',
    title: 'Workout Generator for Men — Free AI Plans, No Signup',
    description: 'Generate a workout for men in seconds. Free AI workout generator for men. No signup. Strength, fat-burn, and more.',
    h1: 'Free Workout Generator for Men',
    intro: 'Get a personalized workout in seconds. Our AI workout generator for men creates plans for strength, muscle, and fitness—for home or gym. No signup. Try 3 free workouts, then unlock more with a one-time payment.',
    howItWorks: [
      'Choose your level and duration.',
      'Select equipment (bodyweight to full gym).',
      'Get a plan for your goals.',
      'Regenerate for new routines.',
    ],
    relatedSlugs: [
      { path: '/workout-generator/strength', label: 'Strength Building Workouts' },
      { path: '/workout-generator/hiit', label: 'Quick Fat-Burn Workouts (20–30 min)' },
      { path: '/workout-generator/weight-loss', label: 'Lose Weight' },
      { path: '/pricing', label: 'Pricing' },
      { path: '/faq', label: 'FAQ' },
    ],
    faqItems: [
      { question: 'Is the workout generator for men free?', answer: 'Yes. 3 free workouts with no signup.' },
      { question: 'Can I build muscle with this?', answer: 'Yes. Choose strength-focused plans and your equipment for muscle-building workouts.' },
    ],
  },
};

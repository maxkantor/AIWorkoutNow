/**
 * Single source of truth for site-wide FAQ.
 * Home shows first 6 items; /faq shows all. Same text in both places.
 */
export type FaqItem = { id: string; question: string; answer: string };

export const FAQ: FaqItem[] = [
  {
    id: 'reallyFree',
    question: 'Is AIWorkoutNow really free?',
    answer:
      'Yes. You get 3 free workouts with no signup. After that you can buy more with a one-time payment.',
  },
  {
    id: 'howWorks',
    question: 'How does the AI workout generator work?',
    answer:
      'You pick your fitness level, duration, equipment, and goals. Our AI creates a personalized plan in seconds.',
  },
  {
    id: 'noAccount',
    question: 'Can I use this without creating an account?',
    answer: 'Yes. You can generate workouts immediately with no account or login.',
  },
  {
    id: 'types',
    question: 'What types of workouts can I generate?',
    answer:
      'Full body, upper/lower body, cardio, strength, quick fat-burn, yoga. Home or gym, any equipment level.',
  },
  {
    id: 'betterThanTrainer',
    question: 'Is this better than hiring a personal trainer?',
    answer:
      'For quick at-home plans and variety, our free AI workout generator is hard to beat. For in-person coaching, a trainer is still valuable.',
  },
  {
    id: 'chatgpt',
    question: 'Why not just use ChatGPT?',
    answer:
      "ChatGPT is great for many things — AIWorkoutNow is built specifically to generate workouts fast and consistently. No prompts needed: pick level, goal, time, equipment. Consistent workout structure (warm-up → main → cooldown). Equipment-aware plans (home vs gym). One-click variations (regenerate instantly). Credits are simple (no subscription). We love ChatGPT — this is just a focused workout generator for speed and simplicity.",
  },
  {
    id: 'signup',
    question: 'Do I need to sign up?',
    answer: 'No. You can generate workouts immediately—no account or login required.',
  },
  {
    id: 'restore',
    question: 'How do I restore workouts on another device?',
    answer:
      'Use "Restore Workouts" and enter the email used at checkout. We\'ll send a verification code.',
  },
  {
    id: 'counts',
    question: 'What counts as a workout generation?',
    answer:
      "Each time you create a new workout plan, it uses 1 workout credit (unless you're using free trial credits).",
  },
];

/** First 6 items for homepage. */
export const FAQ_HOME_COUNT = 6;

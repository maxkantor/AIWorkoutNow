import SEO from '../components/SEO';
import './About.css';

const FAQ = [
  {
    q: 'How does an AI workout generator work?',
    a: 'You choose your fitness level, time, workout type, equipment, and any limitations. AIWorkoutNow generates an AI-powered workout plan in seconds based on your inputs.',
  },
  {
    q: 'Do I need to sign up?',
    a: 'No. You can generate workouts without creating an account.',
  },
  {
    q: 'Is it good for beginners?',
    a: 'Yes. Choose “Beginner” and your available equipment. The workout is tailored to your level so it’s approachable and safe.',
  },
  {
    q: 'Can I use it for home workouts or gym workouts?',
    a: 'Both. Select your equipment (or “No equipment”) and AIWorkoutNow adapts the plan for home or gym.',
  },
  {
    q: 'How do credits work?',
    a: 'You can try a few workouts for free. After that, you can purchase workout credits with a one-time payment (no subscription).',
  },
  {
    q: 'Can I restore workouts on another device?',
    a: 'Yes. Use “Restore Workouts” and verify the email you used at checkout.',
  },
  {
    q: 'How fast is generation?',
    a: 'Most workouts generate in seconds. If it’s busy, it can take a little longer.',
  },
  {
    q: 'Is this medical advice?',
    a: 'No. Workouts are informational. If you have injuries or medical concerns, consult a professional before starting a new program.',
  },
] as const;

function Faq() {
  return (
    <>
      <SEO
        title="FAQ | AIWorkoutNow — AI Workout Generator (No Signup)"
        description="Answers about AIWorkoutNow: how the AI workout generator works, no-signup access, credits, home vs gym workouts, and safety."
        canonicalUrl="https://aiworkoutnow.com/faq"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: FAQ.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
          })),
        }}
      />

      <div className="about-page">
        <div className="container">
          <div className="content-card">
            <h1>FAQ</h1>

            {FAQ.map((item) => (
              <section key={item.q}>
                <h2>{item.q}</h2>
                <p>{item.a}</p>
              </section>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export default Faq;


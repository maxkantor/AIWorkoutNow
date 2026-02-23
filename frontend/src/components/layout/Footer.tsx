import { Link } from 'react-router-dom';
import './Footer.css';

const AI_GENERATORS = [
  { label: 'AI Workout Generator', to: '/ai-workout-generator' },
  { label: 'Workout Plan Generator', to: '/workout-plan-generator' },
  { label: 'Home Workout Generator', to: '/workout-generator/home' },
  { label: 'Weight Loss Generator', to: '/workout-generator/weight-loss' },
  { label: 'Strength Training Generator', to: '/workout-generator/strength' },
  { label: 'Beginner Workout Generator', to: '/workout-generator/beginners' },
  { label: 'Workout Generator for Women', to: '/workout-generator/women' },
  { label: 'Workout Generator for Men', to: '/workout-generator/men' },
];

const POPULAR_WORKOUTS = [
  { label: 'Full Body Workouts', to: '/workouts/full-body' },
  { label: 'Upper Body Workouts', to: '/workouts/upper-body' },
  { label: 'Lower Body Workouts', to: '/workouts/lower-body' },
  { label: 'Cardio Workouts', to: '/workouts/cardio' },
  { label: 'Quick Workouts', to: '/workouts/quick' },
  { label: 'Bodyweight Workouts', to: '/workouts/bodyweight' },
  { label: 'Dumbbell Workouts', to: '/workouts/dumbbell' },
  { label: 'Kettlebell Workouts', to: '/workouts/kettlebell' },
  { label: 'Resistance Band Workouts', to: '/workouts/resistance-bands' },
  { label: 'No Equipment Workouts', to: '/workouts/no-equipment' },
];

const WORKOUT_GOALS = [
  { label: 'Weight Loss', to: '/workout-generator/weight-loss' },
  { label: 'Muscle Gain', to: '/workout-generator/strength' },
  { label: 'Abs Workouts', to: '/workouts/abs' },
  { label: 'Back Workouts', to: '/workouts/back' },
  { label: 'Glute Workouts', to: '/workouts/glutes' },
  { label: 'Arm Workouts', to: '/workouts/arms' },
  { label: 'Chest Workouts', to: '/workouts/chest' },
  { label: 'Leg Workouts', to: '/workouts/legs' },
  { label: 'Endurance Training', to: '/workouts/endurance' },
  { label: 'Morning Workouts', to: '/workouts/morning' },
  { label: 'Workouts for Seniors', to: '/workouts/seniors' },
  { label: 'Yoga Workouts', to: '/workouts/yoga' },
];

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer" role="contentinfo">
      <div className="footer__container">
        <div className="footer__grid" role="navigation" aria-label="Footer navigation">
          <section className="footer__brand" aria-labelledby="footer-brand-heading">
            <h2 id="footer-brand-heading" className="footer__brand-name">
              AIWorkoutNow
            </h2>
            <p className="footer__brand-desc">
              AI-powered workout generator that creates personalized fitness plans in seconds — no signup required.
            </p>
            <ul className="footer__trust" aria-label="Trust points">
              <li>No subscription</li>
              <li>One-time payment</li>
              <li>Instant access</li>
            </ul>
            <Link to="/ai-workout-generator" className="footer__cta">
              Generate Your AI Workout →
            </Link>
            <Link to="/pricing" className="footer__cta-secondary">
              View Pricing
            </Link>
          </section>

          <nav className="footer__col" aria-labelledby="footer-generators-heading">
            <h3 id="footer-generators-heading" className="footer__heading">
              AI Generators
            </h3>
            <ul className="footer__list" role="list">
              {AI_GENERATORS.map(({ label, to }) => (
                <li key={to}><Link to={to}>{label}</Link></li>
              ))}
            </ul>
          </nav>

          <nav className="footer__col" aria-labelledby="footer-popular-heading">
            <h3 id="footer-popular-heading" className="footer__heading">
              Popular Workouts
            </h3>
            <ul className="footer__list" role="list">
              {POPULAR_WORKOUTS.map(({ label, to }) => (
                <li key={to}><Link to={to}>{label}</Link></li>
              ))}
            </ul>
          </nav>

          <nav className="footer__col" aria-labelledby="footer-goals-heading">
            <h3 id="footer-goals-heading" className="footer__heading">
              Workout Goals
            </h3>
            <ul className="footer__list" role="list">
              {WORKOUT_GOALS.map(({ label, to }) => (
                <li key={to}><Link to={to}>{label}</Link></li>
              ))}
            </ul>
          </nav>

          <section className="footer__col footer__support" aria-labelledby="footer-support-heading">
            <h3 id="footer-support-heading" className="footer__heading">
              Support & Company
            </h3>
            <ul className="footer__list" role="list">
              <li><Link to="/faq">FAQ</Link></li>
              <li><Link to="/contact">Contact Us</Link></li>
              <li><Link to="/platform">Restore Purchases</Link></li>
              <li><Link to="/about">About</Link></li>
              <li><Link to="/blog">Blog</Link></li>
            </ul>
            <h3 className="footer__heading footer__heading--sub">Legal</h3>
            <ul className="footer__list" role="list">
              <li><Link to="/privacy">Privacy Policy</Link></li>
              <li><Link to="/disclaimer">Disclaimer</Link></li>
            </ul>
          </section>
        </div>

        <div className="footer__bar">
          <span className="footer__bar-left">© {currentYear} AIWorkoutNow. All rights reserved.</span>
          <span className="footer__bar-center">No signup • One-time payment • Instant access</span>
          <span className="footer__bar-right">Engineered by MK AI & Performance Systems</span>
        </div>
      </div>
    </footer>
  );
}

export default Footer;

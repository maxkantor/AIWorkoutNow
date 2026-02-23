import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import Breadcrumbs from '../components/Breadcrumbs';
import { buildBreadcrumbListSchema } from '../seo/schema';
import { programmaticPagesList } from '../seo/programmaticPagesData';
import './Sitemap.css';

const AI_GENERATORS = [
  { label: 'AI Workout Generator', to: '/ai-workout-generator' },
  { label: 'Workout Plan Generator', to: '/workout-plan-generator' },
  { label: 'Home Workout Generator', to: '/workout-generator/home' },
  { label: 'Weight Loss Generator', to: '/workout-generator/weight-loss' },
  { label: 'Strength Training Generator', to: '/workout-generator/strength' },
  { label: 'Beginner Workout Generator', to: '/workout-generator/beginners' },
  { label: 'Workout Generator for Women', to: '/workout-generator/women' },
  { label: 'Workout Generator for Men', to: '/workout-generator/men' },
  { label: 'HIIT / Quick Fat-Burn', to: '/workout-generator/hiit' },
];

const WORKOUT_GOALS = [
  { label: 'Weight Loss', to: '/workout-generator/weight-loss' },
  { label: 'Muscle Gain / Strength', to: '/workout-generator/strength' },
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

const OTHER_PAGES = [
  { label: 'Home', to: '/' },
  { label: 'About', to: '/about' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'FAQ', to: '/faq' },
  { label: 'Contact', to: '/contact' },
  { label: 'Blog', to: '/blog' },
  { label: 'Platform / Restore Purchases', to: '/platform' },
  { label: 'Privacy Policy', to: '/privacy' },
  { label: 'Disclaimer', to: '/disclaimer' },
];

function Sitemap() {
  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Sitemap', path: '/sitemap' },
  ];

  return (
    <>
      <SEO
        title="Sitemap — Browse Workouts & Generators | AIWorkoutNow"
        description="Directory of AI workout generators, popular workouts by type, and workout goals. Find the right plan for your fitness level and equipment."
        canonicalPath="/sitemap"
        jsonLd={[buildBreadcrumbListSchema(breadcrumbs)]}
      />
      <main className="sitemap-page">
        <div className="sitemap-container">
          <Breadcrumbs items={breadcrumbs} className="sitemap-breadcrumbs" />
          <div className="sitemap-card">
            <h1>Sitemap</h1>
            <p className="sitemap-intro">
              Browse our AI workout generators and workout pages by type or goal. Each link leads to a dedicated page with a free generator and tips.
            </p>
            <section className="sitemap-section" aria-labelledby="sitemap-generators">
              <h2 id="sitemap-generators">AI Generators</h2>
              <ul>
                {AI_GENERATORS.map(({ label, to }) => (
                  <li key={to}><Link to={to}>{label}</Link></li>
                ))}
              </ul>
            </section>
            <section className="sitemap-section" aria-labelledby="sitemap-popular">
              <h2 id="sitemap-popular">Popular Workouts</h2>
              <ul>
                {programmaticPagesList.map((p) => (
                  <li key={p.slug}><Link to={p.slug}>{p.h1}</Link></li>
                ))}
              </ul>
            </section>
            <section className="sitemap-section" aria-labelledby="sitemap-goals">
              <h2 id="sitemap-goals">Workout Goals</h2>
              <ul>
                {WORKOUT_GOALS.map(({ label, to }) => (
                  <li key={to}><Link to={to}>{label}</Link></li>
                ))}
              </ul>
            </section>
            <section className="sitemap-section" aria-labelledby="sitemap-other">
              <h2 id="sitemap-other">Other Pages</h2>
              <ul>
                {OTHER_PAGES.map(({ label, to }) => (
                  <li key={to}><Link to={to}>{label}</Link></li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}

export default Sitemap;

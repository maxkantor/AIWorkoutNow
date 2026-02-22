import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import Breadcrumbs from '../components/Breadcrumbs';
import { getAllPlanPages } from '../seo/workoutPlanLibrary';
import { buildBreadcrumbListSchema } from '../seo/schema';
import './About.css';

const EQUIPMENT_FILTERS = ['All', 'No equipment'] as const;
const GOAL_FILTERS = ['All', 'Strength Building', 'Quick Fat-Burn', 'Lose Weight', 'General'] as const;

function slugToGoal(slug: string): string {
  if (slug === 'strength' || slug === 'men') return 'Strength Building';
  if (slug === 'hiit') return 'Quick Fat-Burn';
  if (slug === 'weight-loss') return 'Lose Weight';
  return 'General';
}

function pageMatchesNoEquipment(slug: string, tag?: string): boolean {
  return tag === 'No equipment' || slug === 'home' || slug === 'beginners' || slug === 'hiit';
}

export default function WorkoutPlansHub() {
  const [search, setSearch] = useState('');
  const [equipment, setEquipment] = useState<(typeof EQUIPMENT_FILTERS)[number]>('All');
  const [goal, setGoal] = useState<(typeof GOAL_FILTERS)[number]>('All');

  const allPages = useMemo(() => getAllPlanPages(), []);

  const filteredPages = useMemo(() => {
    return allPages.filter((page) => {
      const matchSearch =
        !search.trim() ||
        page.shortLabel.toLowerCase().includes(search.toLowerCase()) ||
        page.h1.toLowerCase().includes(search.toLowerCase());
      const matchEquipment =
        equipment === 'All' || (equipment === 'No equipment' && pageMatchesNoEquipment(page.slug, page.tag));
      const matchGoal = goal === 'All' || slugToGoal(page.slug) === goal;
      return matchSearch && matchEquipment && matchGoal;
    });
  }, [allPages, search, equipment, goal]);

  const breadcrumbItems = [
    { name: 'Home', path: '/' },
    { name: 'Workout Plans', path: '/workout-plans' },
  ];

  return (
    <>
      <SEO
        title="Workout Plans — AI Workout Generator by Type | AIWorkoutNow"
        description="Browse workout plan types: women, men, beginner workouts, quick fat-burn, home, strength building, lose weight. Each page has a free AI workout generator and sample plans."
        canonicalPath="/workout-plans"
        jsonLd={[buildBreadcrumbListSchema(breadcrumbItems)]}
      />
      <div className="about-page">
        <div className="container">
          <Breadcrumbs items={breadcrumbItems} className="mb-4" />
          <div className="content-card">
            <h1>Workout plan library</h1>
            <p>
              Choose a workout type below. Each page includes a free AI workout generator, sample workout, tips, and equipment ideas. No signup required.
            </p>

            <div className="workout-plans-hub-filters">
              <label htmlFor="hub-search" className="visually-hidden">
                Search plans
              </label>
              <input
                id="hub-search"
                type="search"
                placeholder="Search plans..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="workout-plans-hub-search"
                aria-label="Search plans"
              />
              <div className="workout-plans-hub-filter-group">
                <span className="workout-plans-hub-filter-label">Equipment:</span>
                {EQUIPMENT_FILTERS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setEquipment(opt)}
                    className={`workout-plans-hub-chip ${equipment === opt ? 'active' : ''}`}
                    aria-pressed={equipment === opt}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <div className="workout-plans-hub-filter-group">
                <span className="workout-plans-hub-filter-label">Goal:</span>
                {GOAL_FILTERS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setGoal(opt)}
                    className={`workout-plans-hub-chip ${goal === opt ? 'active' : ''}`}
                    aria-pressed={goal === opt}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <section aria-labelledby="hub-results-heading">
              <h2 id="hub-results-heading" className="workout-type-section-title">
                Plans ({filteredPages.length})
              </h2>
              <ul className="workout-plans-hub-list">
                {filteredPages.map((page) => (
                  <li key={page.slug}>
                    <Link to={page.routePath} className="workout-plans-hub-link">
                      <span className="workout-plans-hub-link-title">{page.shortLabel}</span>
                      <span className="workout-plans-hub-link-desc">{page.metaDescription.slice(0, 100)}…</span>
                    </Link>
                  </li>
                ))}
              </ul>
              {filteredPages.length === 0 && (
                <p className="workout-plans-hub-empty">No plans match your filters. Try changing search or filters.</p>
              )}
            </section>
          </div>
        </div>
      </div>
    </>
  );
}

import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import './About.css';

const PLAN_INTENTS = [
  { label: 'Fat loss', qp: 'fat-loss' },
  { label: 'Strength', qp: 'strength' },
  { label: 'Muscle gain', qp: 'muscle-gain' },
  { label: 'Endurance', qp: 'endurance' },
  { label: 'HIIT', qp: 'hiit' },
  { label: 'Bodyweight-only', qp: 'bodyweight' },
] as const;

function WorkoutPlans() {
  return (
    <>
      <SEO
        title="Workout Plans | AIWorkoutNow — AI Workout Generator"
        description="Explore workout plan goals (fat loss, strength, muscle gain, HIIT, and more). Generate an instant AI workout plan with no signup."
        canonicalUrl="https://aiworkoutnow.com/workout-plans"
      />

      <div className="about-page">
        <div className="container">
          <div className="content-card">
            <h1>Workout Plans</h1>
            <p>
              Pick a goal, then generate an instant AI workout plan. These are “plan intents” to help you
              get started quickly—AIWorkoutNow personalizes each workout to your level, time, and equipment.
            </p>

            <section>
              <h2>Popular plan goals</h2>
              <ul>
                {PLAN_INTENTS.map((p) => (
                  <li key={p.qp}>
                    <Link to={`/ai-workout-generator?goal=${encodeURIComponent(p.qp)}`}>{p.label}</Link>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2>Generate now</h2>
              <p>
                Ready to go? Head to the <Link to="/ai-workout-generator">AI Workout Generator</Link> and build a workout in seconds.
              </p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}

export default WorkoutPlans;


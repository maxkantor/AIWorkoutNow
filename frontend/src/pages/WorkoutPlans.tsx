import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { useTranslation } from 'react-i18next';
import './About.css';

const PLAN_INTENTS = [
  { qp: 'fat-loss' },
  { qp: 'strength' },
  { qp: 'muscle-gain' },
  { qp: 'endurance' },
  { qp: 'hiit' },
  { qp: 'bodyweight' },
] as const;

function WorkoutPlans() {
  const { t } = useTranslation();

  return (
    <>
      <SEO
        title={t('pages.workoutPlans.seo.title')}
        description={t('pages.workoutPlans.seo.description')}
        canonicalUrl="https://aiworkoutnow.com/workout-plans"
      />

      <div className="about-page">
        <div className="container">
          <div className="content-card">
            <h1>{t('pages.workoutPlans.title')}</h1>
            <p>
              {t('pages.workoutPlans.intro')}
            </p>

            <section>
              <h2>{t('pages.workoutPlans.popularGoals')}</h2>
              <ul>
                {PLAN_INTENTS.map((p) => (
                  <li key={p.qp}>
                    <Link to={`/ai-workout-generator?goal=${encodeURIComponent(p.qp)}`}>
                      {t(`pages.workoutPlans.intents.${p.qp}`)}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2>{t('pages.workoutPlans.generateNow')}</h2>
              <p>
                {t('pages.workoutPlans.generateNowPrefix')}{' '}
                <Link to="/ai-workout-generator">{t('pages.workoutPlans.linkToGenerator')}</Link>{' '}
                {t('pages.workoutPlans.generateNowSuffix')}
              </p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}

export default WorkoutPlans;


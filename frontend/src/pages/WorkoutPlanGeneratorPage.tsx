import LandingPageTemplate from '../seo/LandingPageTemplate';
import { LANDING_PAGES } from '../seo/landingPagesConfig';

const content = LANDING_PAGES['workout-plan-generator'];
const breadcrumbItems = [
  { name: 'Home', path: '/' },
  { name: 'Workout Plan Generator', path: '/workout-plan-generator' },
];

export default function WorkoutPlanGeneratorPage() {
  return <LandingPageTemplate content={content} breadcrumbItems={breadcrumbItems} />;
}

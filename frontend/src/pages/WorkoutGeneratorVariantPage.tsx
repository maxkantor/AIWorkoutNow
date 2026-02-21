import { useParams, Navigate } from 'react-router-dom';
import LandingPageTemplate from '../seo/LandingPageTemplate';
import { LANDING_PAGES } from '../seo/landingPagesConfig';

const VALID_TYPES = ['hiit', 'home', 'strength', 'weight-loss', 'beginners', 'women', 'men'];

export default function WorkoutGeneratorVariantPage() {
  const { type } = useParams<{ type: string }>();
  if (!type || !VALID_TYPES.includes(type)) {
    return <Navigate to="/" replace />;
  }
  const content = LANDING_PAGES[type];
  if (!content) return <Navigate to="/" replace />;

  const breadcrumbItems = [
    { name: 'Home', path: '/' },
    { name: content.h1, path: content.slug },
  ];

  return <LandingPageTemplate content={content} breadcrumbItems={breadcrumbItems} />;
}

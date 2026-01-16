import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

type JsonLd = Record<string, any>;

const SITE_URL = 'https://aiworkoutnow.com';
const DEFAULT_TITLE = 'AIWorkoutNow.com — AI Workout Generator (No Signup)';
const DEFAULT_DESCRIPTION =
  'Generate a personalized AI workout plan in seconds. No signup. Pay once. Instant access.';
const DEFAULT_OG_IMAGE = `${SITE_URL}/images/og-image.png`;

export interface SEOProps {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  robots?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  twitterCard?: 'summary' | 'summary_large_image';
  jsonLd?: JsonLd | JsonLd[];
}

export default function SEO({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  canonicalUrl,
  robots = 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1',
  ogImage = DEFAULT_OG_IMAGE,
  ogType = 'website',
  twitterCard = 'summary_large_image',
  jsonLd,
}: SEOProps) {
  const location = useLocation();
  const canonical =
    canonicalUrl ??
    `${SITE_URL}${location.pathname === '/' ? '/' : location.pathname.replace(/\/+$/, '')}`;

  const schemas: JsonLd[] = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : [];

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={robots} />
      <link rel="canonical" href={canonical} />

      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:type" content={ogType} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content="AIWorkoutNow" />

      {/* Twitter */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {schemas.map((schema, idx) => (
        <script key={idx} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
}


import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

type JsonLd = Record<string, any>;

const SITE_URL = 'https://aiworkoutnow.com';
const DEFAULT_TITLE = 'AIWorkoutNow.com — AI Workout Generator (No Signup)';
const DEFAULT_DESCRIPTION =
  'Generate a personalized AI workout plan in seconds. No signup. Pay once. Instant access.';
const DEFAULT_OG_IMAGE = `${SITE_URL}/images/og-image.png`;

export interface SEOProps {
  title?: string;
  description?: string;
  canonicalPath?: string;
  canonicalUrl?: string;
  robots?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  twitterCard?: 'summary' | 'summary_large_image';
  noIndex?: boolean;
  jsonLd?: JsonLd | JsonLd[];
}

function normalizeCanonicalPath(path: string): string {
  const p = path.trim().toLowerCase().replace(/\/+/g, '/');
  return p === '' || p === '/' ? '/' : p.replace(/\/$/, '');
}

export default function SEO({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  canonicalPath,
  canonicalUrl,
  robots,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = 'website',
  twitterCard = 'summary_large_image',
  noIndex = false,
  jsonLd,
}: SEOProps) {
  const location = useLocation();
  const { i18n } = useTranslation();
  const path = canonicalPath ?? (location.pathname === '/' ? '/' : location.pathname);
  const normalizedPath = normalizeCanonicalPath(path);
  const canonical = canonicalUrl ?? `${SITE_URL}${normalizedPath === '/' ? '' : normalizedPath}`;
  const robotsContent =
    robots ??
    (noIndex ? 'noindex, nofollow' : 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1');

  const schemas: JsonLd[] = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : [];

  return (
    <Helmet htmlAttributes={{ lang: i18n.resolvedLanguage || i18n.language || 'en' }}>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={robotsContent} />
      <link rel="canonical" href={canonical} />

      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:type" content={ogType} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:url" content={ogImage} />
      <meta property="og:image:secure_url" content={ogImage} />
      <meta property="og:image:type" content="image/png" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={title} />
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


/**
 * JSON-LD Article schema for blog posts (from frontmatter)
 */
export interface ArticleSchema {
  '@context': 'https://schema.org';
  '@type': 'Article';
  headline: string;
  description?: string;
  image?: string | string[];
  datePublished: string;
  dateModified?: string;
  author?: { '@type': 'Person'; name: string };
  publisher?: { '@type': 'Organization'; name: string; logo?: { '@type': 'ImageObject'; url: string } };
  mainEntityOfPage?: { '@type': 'WebPage'; '@id': string };
}

const SITE_URL = 'https://aiworkoutnow.com';

export function buildArticleSchema(params: {
  headline: string;
  description?: string;
  image?: string | string[];
  datePublished: string;
  dateModified?: string;
  author?: string;
  slug: string;
}): ArticleSchema {
  const schema: ArticleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: params.headline,
    description: params.description,
    image: params.image,
    datePublished: params.datePublished,
    dateModified: params.dateModified ?? params.datePublished,
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}/blog/${params.slug}` },
    publisher: {
      '@type': 'Organization',
      name: 'AIWorkoutNow',
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/images/og-image.png` },
    },
  };
  if (params.author) {
    schema.author = { '@type': 'Person', name: params.author };
  }
  return schema;
}

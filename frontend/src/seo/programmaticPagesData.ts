/**
 * Programmatic SEO pages: slugs and content for routes and sitemap.
 */
import programmaticPagesJson from './programmaticPages.json';

export interface ProgrammaticPageEntry {
  slug: string;
  primaryKeyword: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  bullets: string[];
  faqItems: { question: string; answer: string }[];
  relatedSlugs: string[];
}

export const programmaticPagesList: ProgrammaticPageEntry[] = programmaticPagesJson as ProgrammaticPageEntry[];

export const programmaticSlugs: string[] = programmaticPagesList.map((p) => p.slug);

export function getProgrammaticPageBySlug(slug: string): ProgrammaticPageEntry | undefined {
  return programmaticPagesList.find((p) => p.slug === slug);
}

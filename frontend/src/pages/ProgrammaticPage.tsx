import { useLocation, Navigate } from 'react-router-dom';
import LandingPageTemplate from '../seo/LandingPageTemplate';
import type { LandingPageContent } from '../seo/landingPagesConfig';
import { getProgrammaticPageBySlug } from '../seo/programmaticPagesData';

function slugToLabel(path: string): string {
  const part = path.split('/').filter(Boolean).pop() || path;
  return part.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ProgrammaticPage() {
  const { pathname } = useLocation();
  const entry = getProgrammaticPageBySlug(pathname);
  if (!entry) return <Navigate to="/" replace />;

  const content: LandingPageContent = {
    slug: entry.slug,
    title: entry.title,
    description: entry.description,
    h1: entry.h1,
    intro: entry.intro,
    howItWorks: entry.bullets,
    relatedSlugs: entry.relatedSlugs.map((path) => ({ path, label: slugToLabel(path) })),
    faqItems: entry.faqItems,
  };

  const breadcrumbItems = [
    { name: 'Home', path: '/' },
    { name: entry.h1, path: entry.slug },
  ];

  return <LandingPageTemplate content={content} breadcrumbItems={breadcrumbItems} />;
}

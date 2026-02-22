import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { buildBreadcrumbListSchema, buildFAQPageSchema } from '../seo/schema';
import Breadcrumbs from '../components/Breadcrumbs';
import FAQAccordion from '../components/FAQAccordion';
import type { LandingPageContent } from './landingPagesConfig';
import '../pages/About.css';

interface LandingPageTemplateProps {
  content: LandingPageContent;
  breadcrumbItems: { name: string; path: string }[];
}

export default function LandingPageTemplate({ content, breadcrumbItems }: LandingPageTemplateProps) {
  return (
    <>
      <SEO
        title={content.title}
        description={content.description}
        canonicalPath={content.slug}
        jsonLd={[
          buildBreadcrumbListSchema(breadcrumbItems),
          buildFAQPageSchema(content.faqItems),
        ]}
      />
      <div className="about-page">
        <div className="container">
          <Breadcrumbs items={breadcrumbItems} className="mb-4" />
          <div className="content-card">
            <h1>{content.h1}</h1>
            <p className="intro-text mb-6">{content.intro}</p>

            <h2 className="text-xl font-bold text-slate-900 mb-3">How it works</h2>
            <ul className="list-disc pl-5 text-slate-700 space-y-2 mb-8">
              {content.howItWorks.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ul>

            <div className="mb-8">
              <button
                type="button"
                onClick={() => document.getElementById('related-workouts')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="inline-block px-6 py-3 bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-600"
                aria-label="Choose your goal below"
              >
                Choose your goal
              </button>
            </div>

            <h2 id="related-workouts" className="text-xl font-bold text-slate-900 mb-3">Related workouts</h2>
            <ul className="flex flex-wrap gap-3 text-slate-700 mb-8">
              {content.relatedSlugs.map(({ path, label }) => (
                <li key={path}>
                  <Link to={path} className="hover:text-slate-900 underline">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>

            <FAQAccordion title="Frequently asked questions" items={content.faqItems} />
          </div>
        </div>
      </div>
    </>
  );
}

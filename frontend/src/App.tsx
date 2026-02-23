import { Suspense, lazy, useEffect } from 'react';
import { initAffiliateTag } from './utils/amazonAffiliate';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import i18n, { SUPPORTED_LANGS } from './i18n';
import { isAdminRoute } from './i18n/isAdminRoute';
import { programmaticSlugs } from './seo/programmaticPagesData';

const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Disclaimer = lazy(() => import('./pages/Disclaimer'));
const Contact = lazy(() => import('./pages/Contact'));
const Faq = lazy(() => import('./pages/Faq'));
const AIWorkoutGenerator = lazy(() => import('./pages/AIWorkoutGenerator'));
const WorkoutPlansHub = lazy(() => import('./pages/WorkoutPlansHub'));
const WorkoutPlanGeneratorPage = lazy(() => import('./pages/WorkoutPlanGeneratorPage'));
const WorkoutTypePage = lazy(() => import('./pages/WorkoutTypePage'));
const Pricing = lazy(() => import('./pages/Pricing'));

const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminCustomers = lazy(() => import('./pages/AdminCustomers'));
const AdminCustomerDetail = lazy(() => import('./pages/AdminCustomerDetail'));
const AdminContacts = lazy(() => import('./pages/AdminContacts'));
const AdminContactDetail = lazy(() => import('./pages/AdminContactDetail'));
const AdminPurchases = lazy(() => import('./pages/AdminPurchases'));
const AdminActivities = lazy(() => import('./pages/AdminActivities'));
const AdminAnalytics = lazy(() => import('./pages/AdminAnalytics'));
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'));
const PaymentCancel = lazy(() => import('./pages/PaymentCancel'));
const Platform = lazy(() => import('./pages/Platform'));
const Blog = lazy(() => import('./pages/Blog'));
const BlogPost = lazy(() => import('./pages/BlogPost'));
const Sitemap = lazy(() => import('./pages/Sitemap'));
const ProgrammaticPage = lazy(() => import('./pages/ProgrammaticPage'));
import Layout from './components/Layout';
import OptionalAnalytics from './components/OptionalAnalytics';

const LANG_STORAGE_KEY = 'aiworkoutnow_lang';
const SUPPORTED_LANG_SET = new Set<string>(SUPPORTED_LANGS as unknown as string[]);

function normalizeLang(input: string | undefined | null): string | null {
  if (!input) return null;
  const raw = input.toLowerCase().trim();
  if (!raw) return null;
  const base = raw.split(/[-_]/)[0];
  if (base === 'zh') return 'zh';
  return base;
}

function getStoredLang(): string | null {
  try {
    const v = window.localStorage.getItem(LANG_STORAGE_KEY);
    const norm = normalizeLang(v);
    return norm && SUPPORTED_LANG_SET.has(norm) ? norm : null;
  } catch {
    return null;
  }
}

function getNavigatorLang(): string | null {
  if (typeof navigator === 'undefined') return null;
  const candidates = Array.isArray(navigator.languages) && navigator.languages.length
    ? navigator.languages
    : [navigator.language];

  for (const c of candidates) {
    const norm = normalizeLang(c);
    if (norm && SUPPORTED_LANG_SET.has(norm)) return norm;
  }
  return null;
}

function getPreferredPublicLang(): string {
  return getStoredLang() ?? getNavigatorLang() ?? 'en';
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function I18nRouteSync() {
  const location = useLocation();

  useEffect(() => {
    const pathname = location.pathname || '/';
    if (isAdminRoute(pathname)) {
      // Admin CRM must be English-only and MUST NOT overwrite stored preference.
      if ((i18n.resolvedLanguage || i18n.language) !== 'en') {
        i18n.changeLanguage('en');
      }
      return;
    }

    const preferred = getPreferredPublicLang();
    if ((i18n.resolvedLanguage || i18n.language) !== preferred) {
      i18n.changeLanguage(preferred);
    }
  }, [location.pathname]);

  return null;
}

function TrailingSlashRedirect({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  if (pathname !== '/' && pathname.endsWith('/')) {
    const target = pathname.replace(/\/+$/, '') || '/';
    return <Navigate to={target} replace />;
  }
  return <>{children}</>;
}

function App() {
  useEffect(() => {
    initAffiliateTag();
  }, []);

  return (
    <Layout>
      <ScrollToTop />
      <I18nRouteSync />
      <OptionalAnalytics />
      <Suspense fallback={null}>
        <TrailingSlashRedirect>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/ai-workout-generator" element={<AIWorkoutGenerator />} />
          <Route path="/workout-plan-generator" element={<WorkoutPlanGeneratorPage />} />
          <Route path="/workout-generator/:type" element={<WorkoutTypePage />} />
          <Route path="/workout-plans" element={<WorkoutPlansHub />} />
          <Route path="/workout-plans/endurance" element={<WorkoutTypePage />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/faq" element={<Faq />} />
          <Route path="/about" element={<About />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/disclaimer" element={<Disclaimer />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/platform" element={<Platform />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/sitemap" element={<Sitemap />} />

          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/customers" element={<AdminCustomers />} />
          <Route path="/admin/customers/:deviceId" element={<AdminCustomerDetail />} />
          <Route path="/admin/contacts" element={<AdminContacts />} />
          <Route path="/admin/contacts/:messageId" element={<AdminContactDetail />} />
          <Route path="/admin/purchases" element={<AdminPurchases />} />
          <Route path="/admin/activities" element={<AdminActivities />} />
          <Route path="/admin/analytics" element={<AdminAnalytics />} />

          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/payment-cancel" element={<PaymentCancel />} />
          {programmaticSlugs.map((slug) => (
            <Route key={slug} path={slug} element={<ProgrammaticPage />} />
          ))}
        </Routes>
        </TrailingSlashRedirect>
      </Suspense>
    </Layout>
  );
}

export default App;



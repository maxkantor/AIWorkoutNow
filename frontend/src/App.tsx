import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import i18n, { SUPPORTED_LANGS } from './i18n';
import { isAdminRoute } from './i18n/isAdminRoute';

const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Disclaimer = lazy(() => import('./pages/Disclaimer'));
const Contact = lazy(() => import('./pages/Contact'));
const Faq = lazy(() => import('./pages/Faq'));
const AIWorkoutGenerator = lazy(() => import('./pages/AIWorkoutGenerator'));
const WorkoutPlans = lazy(() => import('./pages/WorkoutPlans'));

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

function App() {
  return (
    <Layout>
      <I18nRouteSync />
      <OptionalAnalytics />
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/ai-workout-generator" element={<AIWorkoutGenerator />} />
          <Route path="/workout-plans" element={<WorkoutPlans />} />
          <Route path="/faq" element={<Faq />} />
          <Route path="/about" element={<About />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/disclaimer" element={<Disclaimer />} />
          <Route path="/contact" element={<Contact />} />

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
        </Routes>
      </Suspense>
    </Layout>
  );
}

export default App;



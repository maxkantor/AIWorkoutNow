import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';

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

function App() {
  return (
    <Layout>
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



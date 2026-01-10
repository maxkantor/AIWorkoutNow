import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import './Privacy.css';

function Privacy() {
  const navigate = useNavigate();
  
  return (
    <>
      <Helmet>
        <title>Privacy Policy - AIWorkoutNow | Data Protection & Privacy</title>
        <meta name="description" content="Read AIWorkoutNow's privacy policy to understand how we collect, use, and protect your data. We respect your privacy and keep your information secure." />
        <meta name="keywords" content="privacy policy, data protection, AIWorkoutNow privacy, fitness app privacy, user data security" />
        <meta property="og:title" content="Privacy Policy - AIWorkoutNow" />
        <meta property="og:description" content="Read AIWorkoutNow's privacy policy to understand how we collect, use, and protect your data." />
        <meta property="og:url" content="https://aiworkoutnow.com/privacy" />
        <link rel="canonical" href="https://aiworkoutnow.com/privacy" />
        <meta name="robots" content="noindex, follow" />
      </Helmet>
      
      <div className="privacy-page">
        <div className="container">
          <button onClick={() => navigate('/')} className="back-button">
            ← Back to Home
          </button>
          <div className="content-card">
            <h1>Privacy Policy</h1>
            <p className="last-updated">Last Updated: {new Date().toLocaleDateString()}</p>
            
            <section>
              <h2>Introduction</h2>
              <p>
                At AIWorkoutNow, we respect your privacy and are committed to protecting your 
                personal data. This privacy policy explains how we collect, use, and safeguard 
                your information when you use our service.
              </p>
            </section>

            <section>
              <h2>Information We Collect</h2>
              <h3>Device Information</h3>
              <p>
                We generate a unique device identifier stored locally on your device to track 
                workout usage and token balances. This identifier is not linked to your personal 
                identity.
              </p>
              
              <h3>Workout Preferences</h3>
              <p>
                When you generate a workout, we collect your fitness preferences (level, type, 
                duration, equipment, etc.) to create personalized workout plans. This data is 
                stored locally on your device and may be stored on our servers for service 
                improvement purposes.
              </p>
            </section>

            <section>
              <h2>How We Use Your Information</h2>
              <ul>
                <li>To generate personalized workout plans</li>
                <li>To track your token balance and usage</li>
                <li>To improve our AI algorithms and service quality</li>
                <li>To provide customer support when requested</li>
              </ul>
            </section>

            <section>
              <h2>Data Storage</h2>
              <p>
                Workout data and preferences are stored locally on your device using browser 
                localStorage. We also store anonymized usage data on our servers to improve 
                our service. We do not store personally identifiable information unless you 
                explicitly provide it (e.g., through our contact form).
              </p>
            </section>

            <section>
              <h2>Third-Party Services</h2>
              <p>
                We use Amazon Associates links for product recommendations. When you click 
                these links, Amazon may collect information according to their privacy policy. 
                We are not responsible for Amazon's data practices.
              </p>
            </section>

            <section>
              <h2>Your Rights</h2>
              <p>
                You can clear your local data at any time by clearing your browser's localStorage. 
                To request deletion of server-side data, please contact us through our contact form.
              </p>
            </section>

            <section>
              <h2>Contact</h2>
              <p>
                If you have questions about this privacy policy, please 
                <a href="/contact"> contact us</a>.
              </p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}

export default Privacy;



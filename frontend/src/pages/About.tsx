import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import './About.css';

function About() {
  const navigate = useNavigate();
  
  return (
    <>
      <Helmet>
        <title>About Us - AIWorkoutNow | AI-Powered Fitness Companion</title>
        <meta name="description" content="Learn about AIWorkoutNow - your AI-powered fitness companion providing personalized workouts instantly. No signup required. Get started with 3 free workouts today." />
        <meta name="keywords" content="about AIWorkoutNow, AI fitness app, workout generator, personalized fitness, fitness technology" />
        <meta property="og:title" content="About Us - AIWorkoutNow" />
        <meta property="og:description" content="Learn about AIWorkoutNow - your AI-powered fitness companion providing personalized workouts instantly." />
        <meta property="og:url" content="https://aiworkoutnow.com/about" />
        <link rel="canonical" href="https://aiworkoutnow.com/about" />
      </Helmet>
      
      <div className="about-page">
        <div className="container">
          <button onClick={() => navigate('/')} className="back-button">
            ← Back to Home
          </button>
          <div className="content-card">
            <h1>About AIWorkoutNow</h1>
            
            <section>
              <h2>Our Mission</h2>
              <p>
                AIWorkoutNow was created to make personalized fitness accessible to everyone. 
                We believe that everyone deserves access to high-quality, customized workout plans 
                without the barriers of expensive gym memberships or personal trainers.
              </p>
            </section>

            <section>
              <h2>How It Works</h2>
              <p>
                Our AI-powered platform uses advanced algorithms to generate personalized workout 
                plans based on your fitness level, goals, available equipment, and any injuries 
                or limitations. Simply input your preferences, and get a complete workout plan 
                in seconds - no signup required for your first workout.
              </p>
            </section>

            <section>
              <h2>Why Choose AIWorkoutNow?</h2>
              <ul>
                <li><strong>No Signup Required:</strong> Try our free workout generator instantly</li>
                <li><strong>Personalized Plans:</strong> Every workout is tailored to your needs</li>
                <li><strong>Flexible Pricing:</strong> Pay for what you use with token packs</li>
                <li><strong>Offline Access:</strong> Save workouts and access them anytime</li>
                <li><strong>Privacy First:</strong> We respect your data and privacy</li>
              </ul>
            </section>

            <section>
              <h2>Contact Us</h2>
              <p>
                Have questions or feedback? We'd love to hear from you. 
                <a href="/contact"> Visit our contact page</a> to get in touch.
              </p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}

export default About;



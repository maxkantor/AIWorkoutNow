import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import './Disclaimer.css';

function Disclaimer() {
  const navigate = useNavigate();
  
  return (
    <>
      <Helmet>
        <title>Disclaimer - AIWorkoutNow | Fitness Advice & Safety</title>
        <meta name="description" content="Read AIWorkoutNow's disclaimer regarding fitness advice and workout recommendations. Important safety information for users." />
        <meta name="keywords" content="fitness disclaimer, workout safety, exercise disclaimer, fitness advice disclaimer" />
        <meta property="og:title" content="Disclaimer - AIWorkoutNow" />
        <meta property="og:description" content="Read AIWorkoutNow's disclaimer regarding fitness advice and workout recommendations." />
        <meta property="og:url" content="https://aiworkoutnow.com/disclaimer" />
        <link rel="canonical" href="https://aiworkoutnow.com/disclaimer" />
        <meta name="robots" content="noindex, follow" />
      </Helmet>
      
      <div className="disclaimer-page">
        <div className="container">
          <button onClick={() => navigate('/')} className="back-button">
            ← Back to Home
          </button>
          <div className="content-card">
            <h1>Disclaimer</h1>
            
            <section>
              <h2>Medical Disclaimer</h2>
              <p>
                <strong>AIWorkoutNow is not a medical service.</strong> The workouts generated 
                by our AI are for informational and educational purposes only. Before beginning 
                any exercise program, consult with a healthcare provider, especially if you have 
                any pre-existing medical conditions, injuries, or concerns about your health.
              </p>
            </section>

            <section>
              <h2>Fitness Disclaimer</h2>
              <p>
                While we strive to provide safe and effective workout recommendations, individual 
                fitness levels, health conditions, and capabilities vary. You are responsible for:
              </p>
              <ul>
                <li>Assessing your own fitness level and capabilities</li>
                <li>Modifying exercises to suit your needs and limitations</li>
                <li>Stopping any exercise that causes pain or discomfort</li>
                <li>Ensuring proper form and technique</li>
                <li>Using appropriate safety equipment when necessary</li>
              </ul>
            </section>

            <section>
              <h2>No Warranty</h2>
              <p>
                AIWorkoutNow provides workouts "as is" without warranties of any kind, express 
                or implied. We do not guarantee that our workouts will produce specific results 
                or that they are suitable for your individual circumstances.
              </p>
            </section>

            <section>
              <h2>Limitation of Liability</h2>
              <p>
                AIWorkoutNow, its operators, and affiliates shall not be liable for any injuries, 
                damages, or losses resulting from the use of our service or following our workout 
                recommendations. You assume all risks associated with physical exercise.
              </p>
            </section>

            <section>
              <h2>Professional Advice</h2>
              <p>
                For personalized fitness guidance, nutrition advice, or medical clearance, please 
                consult with qualified professionals such as certified personal trainers, 
                registered dietitians, or licensed healthcare providers.
              </p>
            </section>

            <section>
              <h2>Assumption of Risk</h2>
              <p>
                By using AIWorkoutNow, you acknowledge that physical exercise involves inherent 
                risks and that you voluntarily assume all risks associated with participating 
                in any workout program.
              </p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}

export default Disclaimer;



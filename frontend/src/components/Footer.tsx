import { Link } from 'react-router-dom';
import './Footer.css';

function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="footer" role="contentinfo">
      <div className="container">
        <div className="footer-content">
          <section className="footer-section">
            <h3>AIWorkoutNow</h3>
            <p>Your AI-powered fitness companion. Get personalized workouts instantly.</p>
          </section>
          <nav className="footer-section" aria-label="Legal links">
            <h4>Legal</h4>
            <ul role="list">
              <li><Link to="/privacy">Privacy Policy</Link></li>
              <li><Link to="/disclaimer">Disclaimer</Link></li>
              <li><Link to="/about">About Us</Link></li>
            </ul>
          </nav>
          <nav className="footer-section" aria-label="Support links">
            <h4>Support</h4>
            <ul role="list">
              <li><Link to="/contact">Contact Us</Link></li>
              <li><Link to="/faq">FAQ</Link></li>
            </ul>
          </nav>
        </div>
        <div className="footer-bottom">
          <p>&copy; {currentYear} AIWorkoutNow. All rights reserved.</p>
          <p className="affiliate-disclosure">
            As an Amazon Associate, we earn from qualifying purchases.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;



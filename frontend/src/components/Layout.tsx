import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import Footer from './Footer';
import './Layout.css';

interface LayoutProps {
  children: ReactNode;
}

function Layout({ children }: LayoutProps) {
  const scrollToGenerator = () => {
    const generator = document.querySelector('.workout-generator');
    if (generator) {
      generator.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="layout">
      <header className="header" role="banner">
        <div className="container">
          <div className="header-content">
            <Link to="/" className="logo" aria-label="AIWorkoutNow Home">
              <h1>AIWorkoutNow</h1>
            </Link>
            <button 
              className="header-cta" 
              onClick={scrollToGenerator}
              aria-label="Scroll to workout generator"
            >
              Get Free Workouts
            </button>
          </div>
        </div>
      </header>
      {children}
      <Footer />
    </div>
  );
}

export default Layout;


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
      <header className="header">
        <div className="container">
          <div className="header-content">
            <Link to="/" className="logo">
              <h1>AIWorkoutNow</h1>
            </Link>
            <button className="header-cta" onClick={scrollToGenerator}>
              Get Free Workouts
            </button>
          </div>
        </div>
      </header>
      <main className="main">{children}</main>
      <Footer />
    </div>
  );
}

export default Layout;


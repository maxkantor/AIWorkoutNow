import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import Footer from './Footer';
import './Layout.css';

interface LayoutProps {
  children: ReactNode;
}

function Layout({ children }: LayoutProps) {
  return (
    <div className="layout">
      <header className="header">
        <div className="container">
          <div className="header-content">
            <Link to="/" className="logo">
              <h1>AIWorkoutNow</h1>
            </Link>
            <nav className="nav">
              <Link to="/about">About</Link>
              <Link to="/contact">Contact</Link>
            </nav>
          </div>
        </div>
      </header>
      <main className="main">{children}</main>
      <Footer />
    </div>
  );
}

export default Layout;


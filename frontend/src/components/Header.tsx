import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './Header.css';

function Header() {
  const { t } = useTranslation();
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith('/admin');

  // Don't show header on admin pages
  if (isAdminPage) {
    return null;
  }

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <header className="site-header" role="banner">
      <div className="header-container">
        <Link to="/" className="header-logo" aria-label="AIWorkoutNow Home">
          <span className="header-logo-text">AIWorkoutNow</span>
        </Link>
        
        <nav className="header-nav" aria-label="Main navigation">
          <ul className="header-nav-list">
            <li>
              <Link 
                to="/" 
                className={`header-nav-link ${isActive('/') ? 'active' : ''}`}
              >
                {t('header.home')}
              </Link>
            </li>
            <li>
              <Link 
                to="/ai-workout-generator" 
                className={`header-nav-link ${isActive('/ai-workout-generator') ? 'active' : ''}`}
              >
                {t('header.generator')}
              </Link>
            </li>
            <li>
              <Link 
                to="/workout-plans" 
                className={`header-nav-link ${isActive('/workout-plans') ? 'active' : ''}`}
              >
                {t('header.plans')}
              </Link>
            </li>
            <li>
              <Link 
                to="/about" 
                className={`header-nav-link ${isActive('/about') ? 'active' : ''}`}
              >
                {t('header.about')}
              </Link>
            </li>
            <li>
              <Link 
                to="/faq" 
                className={`header-nav-link ${isActive('/faq') ? 'active' : ''}`}
              >
                {t('header.faq')}
              </Link>
            </li>
            <li>
              <Link 
                to="/contact" 
                className={`header-nav-link ${isActive('/contact') ? 'active' : ''}`}
              >
                {t('header.contact')}
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}

export default Header;

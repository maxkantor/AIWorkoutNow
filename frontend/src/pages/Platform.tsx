import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import './Platform.css';

const CENTRAL_PLATFORM_URL = 'https://mk-ai-global-page.s3.us-east-1.amazonaws.com/platform/index.html';
const LOAD_TIMEOUT_MS = 8000;

function Platform() {
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const handleLoad = useCallback(() => {
    setLoaded(true);
    setLoadFailed(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!loaded) {
        setLoadFailed(true);
      }
    }, LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [loaded]);

  return (
    <>
      <SEO
        title="Platform | MK AI & Performance Systems"
        description="MK AI & Performance Systems — Central platform for AI-powered tools and resources."
        canonicalUrl="https://aiworkoutnow.com/platform"
      />

      <div className="platform-page">
        <header className="platform-header">
          <nav className="platform-nav" aria-label="Platform navigation">
            <button
              onClick={() => navigate('/')}
              className="platform-back-button"
              aria-label="Back to Home"
            >
              <span className="platform-back-arrow" aria-hidden="true">←</span>
              Home
            </button>
            <span className="platform-breadcrumb" aria-hidden="true">/</span>
            <span className="platform-breadcrumb-current">Platform</span>
          </nav>
        </header>

        <div className="platform-iframe-container">
          {!loaded && !loadFailed && (
            <div className="platform-loading" role="status" aria-live="polite">
              <span className="platform-loading-spinner" aria-hidden="true" />
              <p className="platform-loading-text">Loading platform…</p>
              <p className="platform-loading-hint">This may take a moment</p>
            </div>
          )}
          {loadFailed && (
            <div className="platform-fallback">
              <p className="platform-fallback-title">Unable to load platform</p>
              <p className="platform-fallback-desc">Try opening in a new tab or return home.</p>
              <div className="platform-fallback-actions">
                <button onClick={() => window.location.reload()} className="platform-fallback-retry">
                  Try again
                </button>
                <a
                  href={CENTRAL_PLATFORM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="platform-fallback-link"
                >
                  Open in new tab
                </a>
                <button onClick={() => navigate('/')} className="platform-fallback-home">
                  Back to Home
                </button>
              </div>
            </div>
          )}
          <iframe
            src={CENTRAL_PLATFORM_URL}
            title="MK AI & Performance Systems"
            referrerPolicy="no-referrer-when-downgrade"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            allow="clipboard-read; clipboard-write"
            className={`platform-iframe ${loaded && !loadFailed ? 'platform-iframe-visible' : ''}`}
            onLoad={handleLoad}
          />
        </div>
      </div>
    </>
  );
}

export default Platform;

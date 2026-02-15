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
          <button
            onClick={() => navigate('/')}
            className="platform-back-button"
            aria-label="Back to Home"
          >
            ← Back to Home
          </button>
          <div className="platform-header-text">
            <h1 className="platform-title">Platform</h1>
            <p className="platform-subtitle">MK AI & Performance Systems</p>
          </div>
        </header>

        <div className="platform-iframe-container">
          {!loaded && !loadFailed && (
            <div className="platform-loading" role="status" aria-live="polite">
              <span className="platform-loading-spinner" aria-hidden="true" />
              <p>Loading platform...</p>
            </div>
          )}
          {loadFailed && (
            <div className="platform-fallback">
              <p>Unable to load platform page. Open in a new tab.</p>
              <a
                href={CENTRAL_PLATFORM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="platform-fallback-link"
              >
                Open MK AI Platform
              </a>
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

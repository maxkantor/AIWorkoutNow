import { useRef, useState, useCallback } from 'react';

const VIDEO_SRC = '/images/hipmachine.mp4';
const POSTER_SRC = '/images/side-bg.png';
const FALLBACK_IMAGE_SRC = '/images/og-image.png';

const IS_DEV = import.meta.env.DEV;

type DisplayMode = 'video' | 'poster' | 'fallback';

export default function PromoMedia() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('video');
  const [isPlaying, setIsPlaying] = useState(false);

  const handleVideoError = useCallback(() => {
    if (IS_DEV) {
      console.warn('[PromoMedia] Video failed to load, falling back to poster image:', VIDEO_SRC);
    }
    setDisplayMode('poster');
  }, []);

  const handlePosterError = useCallback(() => {
    if (IS_DEV) {
      console.warn('[PromoMedia] Poster image failed to load, falling back to default image:', POSTER_SRC);
    }
    setDisplayMode('fallback');
  }, []);

  const handlePlayClick = useCallback(() => {
    videoRef.current?.play().then(() => setIsPlaying(true)).catch(() => {});
  }, []);

  const showPlayOverlay = displayMode === 'video' && !isPlaying;

  return (
    <div className="promoMediaRoot" aria-label="Workout promo video">
      <div className="promoMediaFrame">
        <div className="promoMediaViewport">
          {displayMode === 'video' && (
            <>
              <video
                ref={videoRef}
                className="promoMedia promoMediaVideo"
                src={VIDEO_SRC}
                poster={POSTER_SRC}
                muted
                playsInline
                loop
                preload="metadata"
                onError={handleVideoError}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                aria-label="Workout promo video"
              />
              {showPlayOverlay && (
                <button
                  type="button"
                  className="promoMediaPlayOverlay"
                  onClick={handlePlayClick}
                  aria-label="Play video"
                >
                  <span className="promoMediaPlayIcon" aria-hidden>▶</span>
                </button>
              )}
            </>
          )}
          {displayMode === 'poster' && (
            <img
              src={POSTER_SRC}
              alt=""
              className="promoMedia promoMediaImg"
              onError={handlePosterError}
            />
          )}
          {displayMode === 'fallback' && (
            <img
              src={FALLBACK_IMAGE_SRC}
              alt=""
              className="promoMedia promoMediaImg"
            />
          )}
        </div>
      </div>
    </div>
  );
}

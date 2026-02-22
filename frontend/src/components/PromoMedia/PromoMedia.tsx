import { useRef, useState, useCallback, useEffect } from 'react';
import './PromoMedia.css';

const VIDEO_SRC = '/images/hipmachine.mp4';
const POSTER_SRC = '/images/side-bg.png';
const FALLBACK_IMAGE_SRC = '/images/og-image.png';

const IS_DEV = import.meta.env.DEV;

type DisplayMode = 'video' | 'poster' | 'fallback';

export default function PromoMedia() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('video');
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  const handleVideoError = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    if (IS_DEV) {
      const el = e.currentTarget;
      const err = el.error;
      const msg = err ? `${err.code} ${err.message}` : 'unknown';
      console.warn('[PromoMedia] Video failed to load, falling back to poster:', VIDEO_SRC, msg);
    }
    setDisplayMode('poster');
  }, []);

  const handlePosterError = useCallback(() => {
    if (IS_DEV) {
      console.warn('[PromoMedia] Poster image failed to load, falling back to default image:', POSTER_SRC);
    }
    setDisplayMode('fallback');
  }, []);

  const handleCanPlay = useCallback(() => {
    setVideoReady(true);
  }, []);

  const handlePlayClick = useCallback(() => {
    videoRef.current?.play().then(() => setIsPlaying(true)).catch(() => {});
  }, []);

  // Try muted autoplay when video is ready (allowed on most browsers); if blocked, play overlay stays
  useEffect(() => {
    if (displayMode !== 'video' || !videoReady || !videoRef.current) return;
    const v = videoRef.current;
    const p = v.play();
    if (p && typeof p.then === 'function') {
      p.then(() => setIsPlaying(true)).catch(() => {});
    }
  }, [displayMode, videoReady]);

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
                poster={POSTER_SRC}
                muted
                playsInline
                loop
                preload="auto"
                onError={handleVideoError}
                onCanPlay={handleCanPlay}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                aria-label="Workout promo video"
              >
                <source src={VIDEO_SRC} type="video/mp4" />
              </video>
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

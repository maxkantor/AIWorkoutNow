import { useMemo, useState } from 'react';
import './PromoWorkoutVideo.css';

interface PromoWorkoutVideoProps {
  src?: string;
  caption?: string;
  ariaLabel?: string;
  poster?: string;
}

export default function PromoWorkoutVideo({
  src = '/images/hipmachine.mp4',
  caption = 'Real gym vibes • Instant AI workouts',
  ariaLabel = 'Workout promo video',
  poster = '/images/hero-bg.png',
}: PromoWorkoutVideoProps) {
  const [failed, setFailed] = useState(false);

  const fallbackText = useMemo(() => 'Workout promo video unavailable', []);

  return (
    <div className="promoMediaRoot" aria-label={ariaLabel}>
      <div className="promoMediaFrame">
        <div className="promoMediaViewport">
          <div className="promoMediaLabel" aria-hidden="true">Preview</div>
          {!failed ? (
            <video
              className="promoMedia"
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              controls={false}
              poster={poster}
              onError={() => setFailed(true)}
              aria-label={ariaLabel}
            >
              <source src={src} type="video/mp4" />
            </video>
          ) : (
            <div className="promoMediaFallback" role="img" aria-label={fallbackText}>
              {fallbackText}
            </div>
          )}
        </div>
      </div>
      <div className="promoMediaCaption">{caption}</div>
    </div>
  );
}


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

  const fallbackText = useMemo(() => {
    return 'Workout promo video unavailable';
  }, []);

  return (
    <div className="promoVideoCard" aria-label={ariaLabel}>
      <div className="promoVideoFrame">
        {!failed ? (
          <video
            className="promoVideo"
            src={src}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            controls={false}
            poster={poster}
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="promoVideoFallback" role="img" aria-label={fallbackText}>
            {fallbackText}
          </div>
        )}
      </div>
      <div className="promoVideoCaption">{caption}</div>
    </div>
  );
}


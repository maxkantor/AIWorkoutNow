import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './PromoWorkoutVideo.css';

interface PromoWorkoutVideoProps {
  src?: string;
  ariaLabel?: string;
  poster?: string;
}

export default function PromoWorkoutVideo({
  src = '/images/hipmachine.mp4',
  ariaLabel,
  poster = '/images/hero-bg.png',
}: PromoWorkoutVideoProps) {
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);

  const resolvedAriaLabel = ariaLabel ?? t('promo.videoAria');
  const fallbackText = useMemo(() => t('promo.videoUnavailable'), [t]);

  return (
    <div className="promoMediaRoot" aria-label={resolvedAriaLabel}>
      <div className="promoMediaFrame">
        <div className="promoMediaViewport">
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
              aria-label={resolvedAriaLabel}
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
    </div>
  );
}


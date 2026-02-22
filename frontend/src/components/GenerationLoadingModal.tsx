import { useEffect, useState } from 'react';
import './GenerationLoadingModal.css';

const ROTATING_SUBTEXTS = [
  'Analyzing your fitness level…',
  'Designing your routine…',
  'Balancing intensity and recovery…',
  'Finalizing your plan…',
];

const ROTATION_INTERVAL_MS = 1500;

interface GenerationLoadingModalProps {
  /** When true, the modal is visible and blocks interaction. */
  visible: boolean;
}

/**
 * Professional loading modal shown while a workout is being generated.
 * Centered card, rotating subtext, progress bar, no emojis.
 * Locks body scroll and blocks clicks when visible.
 */
export default function GenerationLoadingModal({ visible }: GenerationLoadingModalProps) {
  const [subtextIndex, setSubtextIndex] = useState(0);

  useEffect(() => {
    if (!visible) return;
    setSubtextIndex(0);
    const id = setInterval(() => {
      setSubtextIndex((i) => (i + 1) % ROTATING_SUBTEXTS.length);
    }, ROTATION_INTERVAL_MS);
    return () => clearInterval(id);
  }, [visible]);

  useEffect(() => {
    if (visible) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className="generation-loading-modal"
      role="status"
      aria-live="polite"
      aria-label="Creating your personalized workout"
    >
      <div className="generation-loading-modal__backdrop" aria-hidden="true" />
      <div className="generation-loading-modal__card">
        <h2 className="generation-loading-modal__title">Creating your personalized workout</h2>
        <p className="generation-loading-modal__subtext">{ROTATING_SUBTEXTS[subtextIndex]}</p>
        <div className="generation-loading-modal__progress-wrap">
          <div className="generation-loading-modal__progress-bar" />
        </div>
        <p className="generation-loading-modal__reassurance">This usually takes under 10 seconds.</p>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';

interface WorkoutProgressEmojiProps {
  isLoading: boolean;
  className?: string;
}

export default function WorkoutProgressEmoji({ isLoading, className }: WorkoutProgressEmojiProps) {
  const frames = useMemo(() => ['💪🔥', '🏋️‍♀️🔥', '🤸🔥', '💦💪'], []);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      setIdx(0);
      return;
    }

    const t = setInterval(() => {
      setIdx((i) => (i + 1) % frames.length);
    }, 350);

    return () => clearInterval(t);
  }, [isLoading, frames.length]);

  if (!isLoading) return null;

  return (
    <span
      className={className}
      aria-hidden="true"
      style={{ display: 'inline-block', minWidth: '3.5ch', textAlign: 'center' }}
    >
      {frames[idx]}
    </span>
  );
}


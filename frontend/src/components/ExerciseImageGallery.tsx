import { useState } from 'react';
import { getExerciseImages, type ExerciseImage } from '../utils/exerciseImages';
import './ExerciseImageGallery.css';

interface ExerciseImageGalleryProps {
  exerciseName: string;
}

/**
 * Horizontal demo-image row (ChatGPT-style). Hides broken images gracefully.
 */
export default function ExerciseImageGallery({ exerciseName }: ExerciseImageGalleryProps) {
  const initial = getExerciseImages(exerciseName, 3);
  const [images, setImages] = useState<ExerciseImage[]>(initial);

  if (images.length === 0) return null;

  const handleError = (failedUrl: string) => {
    setImages((prev) => prev.filter((img) => img.url !== failedUrl));
  };

  return (
    <div className="exercise-image-gallery" role="group" aria-label={`${exerciseName} demonstration images`}>
      {images.map((img) => (
        <figure key={img.url} className="exercise-image-gallery__figure">
          <img
            src={img.url}
            alt={img.alt}
            loading="lazy"
            decoding="async"
            className="exercise-image-gallery__img"
            onError={() => handleError(img.url)}
          />
        </figure>
      ))}
    </div>
  );
}

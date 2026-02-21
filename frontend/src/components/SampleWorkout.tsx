import type { SampleWorkoutData } from '../seo/workoutPlanLibrary';
import './SampleWorkout.css';

interface SampleWorkoutProps {
  data: SampleWorkoutData;
  title?: string;
}

export default function SampleWorkout({ data, title = 'Sample workout' }: SampleWorkoutProps) {
  return (
    <section className="sample-workout" aria-labelledby="sample-workout-heading">
      <h2 id="sample-workout-heading" className="sample-workout__title">{title}</h2>
      <div className="sample-workout__section">
        <h3 className="sample-workout__heading">Warm-up</h3>
        <ul className="sample-workout__list">
          {data.warmUp.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </div>
      <div className="sample-workout__section">
        <h3 className="sample-workout__heading">Main circuit</h3>
        <ul className="sample-workout__list sample-workout__list--circuit">
          {data.mainCircuit.map((item, i) => (
            <li key={i} className="sample-workout__item">
              <span className="sample-workout__name">{item.name}</span>
              {item.sets != null && item.reps != null && (
                <span className="sample-workout__meta">{item.sets} sets × {item.reps} reps</span>
              )}
              {item.duration && (
                <span className="sample-workout__meta">{item.duration}</span>
              )}
              {item.notes && (
                <span className="sample-workout__notes">{item.notes}</span>
              )}
            </li>
          ))}
        </ul>
      </div>
      <div className="sample-workout__section">
        <h3 className="sample-workout__heading">Cooldown</h3>
        <ul className="sample-workout__list">
          {data.cooldown.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </div>
      <p className="sample-workout__duration">
        Estimated duration: <strong>{data.estimatedMinutes} minutes</strong>
      </p>
    </section>
  );
}

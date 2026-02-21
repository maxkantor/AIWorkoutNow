import { Link } from 'react-router-dom';
import './RelatedWorkoutTypes.css';

interface RelatedLink {
  path: string;
  label: string;
}

interface RelatedWorkoutTypesProps {
  links: RelatedLink[];
  title?: string;
}

export default function RelatedWorkoutTypes({ links, title = 'Explore other workout types' }: RelatedWorkoutTypesProps) {
  return (
    <section className="related-workout-types" aria-labelledby="related-workout-types-heading">
      <h2 id="related-workout-types-heading" className="related-workout-types__title">{title}</h2>
      <ul className="related-workout-types__list">
        {links.map(({ path, label }) => (
          <li key={path}>
            <Link to={path} className="related-workout-types__link">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

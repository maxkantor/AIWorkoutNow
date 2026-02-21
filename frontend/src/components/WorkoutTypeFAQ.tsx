import { useCallback, useState } from 'react';
import './WorkoutTypeFAQ.css';

interface FAQItem {
  question: string;
  answer: string;
}

interface WorkoutTypeFAQProps {
  items: FAQItem[];
  title?: string;
}

export default function WorkoutTypeFAQ({ items, title = 'Frequently asked questions' }: WorkoutTypeFAQProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = useCallback((index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  }, []);

  return (
    <section className="workout-type-faq" aria-labelledby="workout-type-faq-heading">
      <h2 id="workout-type-faq-heading" className="workout-type-faq__title">{title}</h2>
      <div className="workout-type-faq__list">
        {items.map((item, i) => (
          <div key={i} className="workout-type-faq__item">
            <button
              type="button"
              className="workout-type-faq__question"
              onClick={() => toggle(i)}
              aria-expanded={openIndex === i}
              aria-controls={`workout-faq-answer-${i}`}
              id={`workout-faq-question-${i}`}
            >
              <span>{item.question}</span>
              <span className="workout-type-faq__icon" aria-hidden="true">
                {openIndex === i ? '−' : '+'}
              </span>
            </button>
            <div
              id={`workout-faq-answer-${i}`}
              role="region"
              aria-labelledby={`workout-faq-question-${i}`}
              className="workout-type-faq__answer"
              data-open={openIndex === i}
            >
              <p>{item.answer}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

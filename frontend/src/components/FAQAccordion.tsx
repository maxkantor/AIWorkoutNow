import { useCallback } from 'react';

export interface FAQAccordionItem {
  question: string;
  answer: string;
}

interface FAQAccordionProps {
  items: FAQAccordionItem[];
  title?: string;
  id?: string;
  /** Callback when an FAQ is opened (e.g. for analytics faq_opened) */
  onOpen?: (question: string) => void;
  className?: string;
}

export default function FAQAccordion({ items, title, id = 'faq-heading', onOpen, className = '' }: FAQAccordionProps) {
  const handleToggle = useCallback(
    (question: string) => {
      if (typeof onOpen === 'function') onOpen(question);
    },
    [onOpen]
  );

  return (
    <section className={className} aria-labelledby={title ? id : undefined}>
      {title && (
        <h2 id={id} className="text-2xl font-extrabold text-slate-900 mb-3">
          {title}
        </h2>
      )}
      <div className="space-y-2">
        {items.map((item, idx) => (
          <details
            key={idx}
            className="bg-white/80 rounded-xl p-4 border border-slate-200"
            onToggle={(e) => {
              const el = e.currentTarget;
              if (el.open) handleToggle(item.question);
            }}
          >
            <summary className="font-semibold text-slate-900 cursor-pointer">{item.question}</summary>
            <div className="text-slate-700 mt-2">
              {typeof item.answer === 'string' ? (
                <p>{item.answer}</p>
              ) : (
                <div>{item.answer}</div>
              )}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

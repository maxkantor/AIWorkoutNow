import { useCallback, useEffect, useState } from 'react';
import type { WorkoutGeneratorHandle } from '../components/WorkoutGenerator';

const FORM_VISIBLE_THRESHOLD = 0.4;

export interface UseGeneratorCtaBehaviorArgs {
  generatorFormRef: React.RefObject<WorkoutGeneratorHandle | null>;
  sectionRef: React.RefObject<HTMLElement | null>;
  generatorType: string;
  pagePath: string;
  trackHeroCta: (page: string, generatorType: string) => void;
  trackHeroCtaGenerated?: (page: string, generatorType: string) => void;
}

export interface UseGeneratorCtaBehaviorReturn {
  /** One-click: always triggers generate with current form values (no scroll-first). */
  handleHeroCtaClick: () => void;
  isFormVisible: boolean;
}

export function useGeneratorCtaBehavior({
  generatorFormRef,
  sectionRef,
  generatorType,
  pagePath,
  trackHeroCta,
  trackHeroCtaGenerated,
}: UseGeneratorCtaBehaviorArgs): UseGeneratorCtaBehaviorReturn {
  const [isFormVisible, setIsFormVisible] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry) return;
        const visible = entry.isIntersecting && entry.intersectionRatio >= FORM_VISIBLE_THRESHOLD;
        setIsFormVisible(visible);
      },
      { threshold: [0, FORM_VISIBLE_THRESHOLD, 0.5, 1], rootMargin: '0px' }
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, [sectionRef]);

  const handleHeroCtaClick = useCallback(() => {
    trackHeroCta(pagePath, generatorType);
    if (generatorFormRef.current) {
      generatorFormRef.current.submit();
      trackHeroCtaGenerated?.(pagePath, generatorType);
    }
  }, [generatorFormRef, generatorType, pagePath, trackHeroCta, trackHeroCtaGenerated]);

  return { handleHeroCtaClick, isFormVisible };
}

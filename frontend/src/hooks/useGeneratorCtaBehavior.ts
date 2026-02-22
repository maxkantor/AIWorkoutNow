import { useCallback, useEffect, useRef, useState } from 'react';
import type { WorkoutGeneratorHandle } from '../components/WorkoutGenerator';

const GENERATOR_SECTION_ID = 'workout-generator';
const HIGHLIGHT_CLASS = 'generator-section--highlight';
const HIGHLIGHT_DURATION_MS = 1200;
const FORM_VISIBLE_THRESHOLD = 0.4;
const FOCUS_ANNOUNCE_TEXT = 'Generator form focused';

export interface UseGeneratorCtaBehaviorArgs {
  generatorFormRef: React.RefObject<WorkoutGeneratorHandle | null>;
  sectionRef: React.RefObject<HTMLElement | null>;
  firstFocusableId: string;
  generatorType: string;
  pagePath: string;
  trackHeroCta: (page: string, generatorType: string) => void;
  trackHeroCtaScrolled?: (page: string, generatorType: string) => void;
  trackHeroCtaGenerated?: (page: string, generatorType: string) => void;
  /** Ref for aria-live region that will announce "Generator form focused" */
  liveRegionRef?: React.RefObject<HTMLDivElement | null>;
}

export interface UseGeneratorCtaBehaviorReturn {
  handleHeroCtaClick: () => void;
  isFormVisible: boolean;
}

export function useGeneratorCtaBehavior({
  generatorFormRef,
  sectionRef,
  firstFocusableId,
  generatorType,
  pagePath,
  trackHeroCta,
  trackHeroCtaScrolled,
  trackHeroCtaGenerated,
  liveRegionRef,
}: UseGeneratorCtaBehaviorArgs): UseGeneratorCtaBehaviorReturn {
  const [isFormVisible, setIsFormVisible] = useState(false);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    if (isFormVisible && generatorFormRef.current) {
      generatorFormRef.current.submit();
      trackHeroCtaGenerated?.(pagePath, generatorType);
      return;
    }

    trackHeroCtaScrolled?.(pagePath, generatorType);
    const sectionEl = document.getElementById(GENERATOR_SECTION_ID) ?? sectionRef.current;
    if (sectionEl) {
      sectionEl.scrollIntoView({ behavior: 'smooth', block: 'start' });

      const afterScroll = () => {
        const firstInput = document.getElementById(firstFocusableId) as HTMLSelectElement | null;
        if (firstInput && typeof firstInput.focus === 'function') {
          firstInput.focus({ preventScroll: true });
        }
        if (liveRegionRef?.current) {
          liveRegionRef.current.textContent = FOCUS_ANNOUNCE_TEXT;
          liveRegionRef.current.setAttribute('aria-live', 'polite');
        }
        sectionEl.classList.add(HIGHLIGHT_CLASS);
        if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
        highlightTimeoutRef.current = setTimeout(() => {
          sectionEl.classList.remove(HIGHLIGHT_CLASS);
          highlightTimeoutRef.current = null;
        }, HIGHLIGHT_DURATION_MS);
      };

      const raf =
        requestAnimationFrame ||
        ((cb: () => void) => setTimeout(cb, 100));
      raf(afterScroll);
      setTimeout(afterScroll, 400);
    }
  }, [
    isFormVisible,
    generatorFormRef,
    sectionRef,
    firstFocusableId,
    generatorType,
    pagePath,
    trackHeroCta,
    trackHeroCtaScrolled,
    trackHeroCtaGenerated,
    liveRegionRef,
  ]);

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    };
  }, []);

  return { handleHeroCtaClick, isFormVisible };
}

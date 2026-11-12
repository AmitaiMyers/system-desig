import { useEffect, useRef, useState } from 'react';

export const DESKTOP_QUERY = '(min-width: 900px)';
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** Start every new screen at the top, like a page navigation would. */
export function useScrollTopOn(value: string): void {
  // Braces matter: newer browsers return a Promise from scrollTo, and an effect must not return one.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [value]);
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const list = window.matchMedia(query);
    const onChange = () => setMatches(list.matches);
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

const COUNT_MS = 180;

/** Eases a displayed number towards its target so value changes are visible, not abrupt. */
export function useAnimatedNumber(target: number): number {
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const [shown, setShown] = useState(target);
  const shownRef = useRef(target);

  useEffect(() => {
    const from = shownRef.current;
    if (reducedMotion || from === target) {
      shownRef.current = target;
      setShown(target);
      return;
    }
    const start = performance.now();
    let frame = requestAnimationFrame(function step(now) {
      const progress = Math.min(1, (now - start) / COUNT_MS);
      shownRef.current = from + (target - from) * progress;
      setShown(shownRef.current);
      if (progress < 1) frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [target, reducedMotion]);

  return shown;
}

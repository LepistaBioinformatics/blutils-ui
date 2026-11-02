import { useRef, useEffect, useState } from "react";

export function useElementInView(options?: IntersectionObserverInit) {
  const [inView, setInView] = useState(false);
  const ref = useRef(null);

  // Depend on the option values, not on the object identity, so callers can
  // pass an inline literal without recreating the observer on every render.
  const root = options?.root;
  const rootMargin = options?.rootMargin;
  const thresholdKey = JSON.stringify(options?.threshold ?? null);

  useEffect(() => {
    const threshold = JSON.parse(thresholdKey) ?? undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
      },
      { root, rootMargin, threshold }
    );

    // React clears ref.current before this cleanup runs on unmount, so keep
    // the observed element to unobserve it.
    const element = ref.current;
    if (element) {
      observer.observe(element);
    }

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [root, rootMargin, thresholdKey]);

  return { ref, inView };
}

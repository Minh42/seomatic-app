import { useState, useEffect } from 'react';

interface UseCountAnimationOptions {
  targetCount: number;
  duration?: number;
  enabled?: boolean;
}

export function useCountAnimation({
  targetCount,
  duration = 1000,
  enabled = true,
}: UseCountAnimationOptions) {
  const [displayCount, setDisplayCount] = useState<number>(0);

  useEffect(() => {
    if (!enabled || targetCount === 0) {
      setDisplayCount(targetCount);
      return;
    }

    // let start = 0; // TODO: Use if needed for animation start value
    const startTime = Date.now();

    const animateCount = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentCount = Math.floor(easeOutQuart * targetCount);

      setDisplayCount(currentCount);

      if (progress < 1) {
        requestAnimationFrame(animateCount);
      } else {
        setDisplayCount(targetCount);
      }
    };

    animateCount();
  }, [targetCount, duration, enabled]);

  return displayCount;
}

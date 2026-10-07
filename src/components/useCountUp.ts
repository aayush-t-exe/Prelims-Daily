import { useEffect, useState } from 'react';

/**
 * Counts from `from` to `to` with an ease-out curve. Updating one Text a frame is cheap,
 * and doing it in React keeps the number accessible and works the same on web.
 */
export function useCountUp(to: number, { from = 0, duration = 900, delay = 0 } = {}) {
  const [value, setValue] = useState(from);
  useEffect(() => {
    let raf = 0;
    let start = 0;
    const timer = setTimeout(() => {
      const step = (t: number) => {
        if (!start) start = t;
        const k = Math.min(1, (t - start) / duration);
        const eased = 1 - (1 - k) ** 3;
        setValue(Math.round(from + (to - from) * eased));
        if (k < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [to, from, duration, delay]);
  return value;
}

import { useEffect, useState } from "react";

/**
 * Tracks window.innerWidth reactively, unless `controlledWidth` is given (then
 * the window is never touched). Uncontrolled renders start at width 0 — always
 * the base layout — then switch after mount, avoiding an SSR hydration
 * mismatch at the cost of one layout swap on first paint.
 */
export function useViewportWidth(controlledWidth: number | undefined): number {
  const [trackedWidth, setTrackedWidth] = useState(0);

  useEffect(() => {
    if (controlledWidth !== undefined) {
      return;
    }

    const updateWidth = () => setTrackedWidth(window.innerWidth);
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, [controlledWidth]);

  return controlledWidth ?? trackedWidth;
}

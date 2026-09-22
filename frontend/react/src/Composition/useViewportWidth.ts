import { useEffect, useState } from "react";

/**
 * Tracks window.innerWidth reactively. When `controlledWidth` is provided,
 * it's used as-is and the window is never touched — useful for SSR
 * determinism, tests, or a fixed-size embed. Otherwise, the initial render
 * (server, and the client's first paint before hydration) uses 0, which
 * always resolves to a composition's required base layout, then switches
 * to the real viewport width after mount — avoiding a hydration mismatch
 * at the cost of one layout swap immediately after first paint.
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

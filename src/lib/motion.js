import { useEffect, useState } from "react";

/**
 * Lightweight press spring for any clickable element.
 * Uses CSS classes already defined in index.css (.btn etc.) and
 * adds a data-pressed attribute for extra spring feedback.
 */
export function usePressSpring() {
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    if (!pressed) return undefined;
    const id = window.setTimeout(() => setPressed(false), 180);
    return () => window.clearTimeout(id);
  }, [pressed]);

  return {
    pressed,
    pressProps: {
      onPointerDown: () => setPressed(true),
      onPointerUp: () => setPressed(false),
      onPointerLeave: () => setPressed(false),
      "data-pressed": pressed ? "true" : "false",
    },
  };
}

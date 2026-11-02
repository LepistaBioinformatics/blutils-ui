import { PointerEvent, ReactNode, useCallback, useRef, useState } from "react";

interface TooltipState {
  x: number;
  y: number;
  content: ReactNode;
}

/**
 * One tooltip per chart: `bind(content)` returns the pointer/focus handlers
 * for a mark; `node` is rendered inside the chart's `relative` container.
 */
export function useChartTooltip() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<TooltipState | null>(null);

  const place = useCallback((clientX: number, clientY: number, content: ReactNode) => {
    const box = containerRef.current?.getBoundingClientRect();
    // Synthetic pointer events (e.g. from a click) may carry no coordinates.
    if (!box || !Number.isFinite(clientX) || !Number.isFinite(clientY)) return;
    setState({ x: clientX - box.left, y: clientY - box.top, content });
  }, []);

  const bind = (content: ReactNode) => ({
    onPointerMove: (event: PointerEvent) => place(event.clientX, event.clientY, content),
    onPointerLeave: () => setState(null),
    onFocus: (event: { currentTarget: Element }) => {
      const rect = event.currentTarget.getBoundingClientRect();
      place(rect.left + rect.width / 2, rect.top, content);
    },
    onBlur: () => setState(null),
  });

  const node = state ? (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-30 max-w-xs -translate-x-1/2 -translate-y-full rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs text-white shadow-lg dark:bg-gray-100 dark:text-gray-900"
      style={{ left: state.x, top: state.y - 10 }}
    >
      {state.content}
    </div>
  ) : null;

  return { containerRef, bind, node };
}

export const SERIES = (index: number) => `var(--series-${(index % 8) + 1})`;
export const SERIES_OTHER = "var(--series-other)";

export function formatValue(value: number, weighting: "records" | "reads") {
  return `${value.toLocaleString()} ${weighting === "reads" ? "reads" : value === 1 ? "record" : "records"}`;
}

export const percent = (share: number) => `${(share * 100).toFixed(share < 0.1 ? 1 : 0)}%`;

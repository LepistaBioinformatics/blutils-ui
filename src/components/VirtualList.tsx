import { ReactNode, Ref, useEffect, useImperativeHandle, useRef, useState } from "react";
import { isNavigationKey } from "@/functions/navigation-keys";
import { useVirtualizer } from "@tanstack/react-virtual";

export interface VirtualListHandle {
  scrollToIndex: (index: number) => void;
  scrollToTop: () => void;
}

interface Props {
  count: number;
  estimateSize: number;
  /** `active` is the item highlighted by keyboard navigation. */
  renderItem: (index: number, active: boolean) => ReactNode;
  /**
   * ArrowUp/ArrowDown (on the document) move a highlighted item and keep it in
   * view; Enter calls `onActivate` with it. Only one list should enable this.
   */
  keyboardNavigation?: { onActivate: (index: number) => void };
  getItemKey?: (index: number) => string | number;
  listRef?: Ref<VirtualListHandle>;
  className?: string;
  "aria-label"?: string;
}

/**
 * Vertical list that only mounts the visible items. Items may have any height:
 * each one is measured after render. The list scrolls inside its own box, so
 * the parent must give it a bounded height (e.g. `flex-1 min-h-0`).
 */
export function VirtualList({
  count,
  estimateSize,
  renderItem,
  getItemKey,
  listRef,
  className,
  keyboardNavigation,
  "aria-label": ariaLabel,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimateSize,
    getItemKey,
    overscan: 8,
  });

  const [activeIndex, setActiveIndex] = useState(-1);
  // A new list (filter, sort, group) starts without a highlighted item.
  useEffect(() => setActiveIndex(-1), [count]);

  const onActivate = keyboardNavigation?.onActivate;
  const navigable = keyboardNavigation !== undefined;
  useEffect(() => {
    if (!navigable) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isNavigationKey(event) || count === 0) return;
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((index) => {
          const next =
            event.key === "ArrowDown" ? Math.min(count - 1, index + 1) : Math.max(0, index - 1);
          virtualizer.scrollToIndex(next, { align: "auto" });
          return next;
        });
      } else if (event.key === "Enter" && activeIndex >= 0) {
        event.preventDefault();
        onActivate?.(activeIndex);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [navigable, count, activeIndex, onActivate, virtualizer]);

  useImperativeHandle(
    listRef,
    () => ({
      scrollToIndex: (index: number) =>
        virtualizer.scrollToIndex(index, { align: "auto" }),
      scrollToTop: () => virtualizer.scrollToOffset(0),
    }),
    [virtualizer]
  );

  return (
    <div
      ref={scrollRef}
      aria-label={ariaLabel}
      className={`min-h-0 overflow-auto ${className ?? ""}`}
    >
      <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((item) => (
          <div
            key={item.key}
            data-index={item.index}
            ref={virtualizer.measureElement}
            className="absolute left-0 top-0 w-full"
            style={{ transform: `translateY(${item.start}px)` }}
          >
            {renderItem(item.index, item.index === activeIndex)}
          </div>
        ))}
      </div>
    </div>
  );
}

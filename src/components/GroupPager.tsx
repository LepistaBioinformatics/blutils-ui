import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { FaAngleLeft, FaAngleRight } from "react-icons/fa";
import { VirtualList, VirtualListHandle } from "./VirtualList";
import { isNavigationKey } from "@/functions/navigation-keys";

export interface PagerGroup {
  name: string;
  label: ReactNode;
  count: number;
}

interface Props {
  groups: PagerGroup[];
  current: number;
  onNavigate: (index: number) => void;
  /** Controls shown above the table of contents (above the content below `md`). */
  sidebarHeader?: ReactNode;
  children: ReactNode;
}

const SIDEBAR_ENTRY_HEIGHT = 44;

// mdbook `.nav-chapters`: full-height bars on both sides of the content
// (from `xl`, where the record grid still fits between them).
const WIDE_NAV =
  "absolute inset-y-0 z-10 hidden w-[90px] items-center justify-center text-[2.5em] text-gray-400 transition-colors duration-500 hover:bg-gray-100 hover:text-gray-700 hover:duration-150 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-200 xl:flex";

// mdbook `.mobile-nav-chapters`: rounded buttons below the content.
const MOBILE_NAV =
  "flex w-[90px] items-center justify-center rounded-md bg-gray-100 py-1 text-[2.5em] text-gray-500 hover:text-gray-800 dark:bg-gray-800 dark:text-gray-400 dark:hover:text-gray-100";

/**
 * Shows one group at a time with mdbook-style navigation: a table of contents
 * on the left, previous/next chevrons on the sides (below the content on
 * narrow screens) and the ArrowLeft/ArrowRight keys.
 */
export function GroupPager({ groups, current, onNavigate, sidebarHeader, children }: Props) {
  const hasPrevious = current > 0;
  const hasNext = current < groups.length - 1;

  // Every navigation pulses the matching chevron; `n` restarts the animation.
  const [pulse, setPulse] = useState<{ dir: "prev" | "next"; n: number }>({ dir: "next", n: 0 });
  const go = useCallback(
    (dir: "prev" | "next") => {
      setPulse((p) => ({ dir, n: p.n + 1 }));
      onNavigate(dir === "prev" ? current - 1 : current + 1);
    },
    [current, onNavigate]
  );
  const chevron = (dir: "prev" | "next") => {
    const Icon = dir === "prev" ? FaAngleLeft : FaAngleRight;
    const pulsing = pulse.n > 0 && pulse.dir === dir;
    return (
      <span
        key={pulsing ? pulse.n : "idle"}
        data-pulse={pulsing ? "true" : undefined}
        className={`inline-flex rounded-full p-1.5 ${
          pulsing ? "animate-nav-pulse motion-reduce:animate-none" : ""
        }`}
      >
        <Icon />
      </span>
    );
  };
  const listRef = useRef<VirtualListHandle>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isNavigationKey(event)) return;

      if (event.key === "ArrowLeft" && hasPrevious) {
        event.preventDefault();
        go("prev");
      } else if (event.key === "ArrowRight" && hasNext) {
        event.preventDefault();
        go("next");
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [hasPrevious, hasNext, go]);

  useEffect(() => {
    listRef.current?.scrollToIndex(current);
  }, [current]);

  return (
    <div className="flex min-h-0 flex-1 pb-6">
      <nav
        aria-label="Groups"
        className="hidden w-72 shrink-0 flex-col py-3 text-gray-900 dark:text-gray-100 md:flex"
      >
        {sidebarHeader && <div className="mb-2 pb-1">{sidebarHeader}</div>}
        <div className="px-4 pb-2 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {groups.length} groups
        </div>
        <VirtualList
          className="flex-1"
          listRef={listRef}
          count={groups.length}
          estimateSize={SIDEBAR_ENTRY_HEIGHT}
          getItemKey={(index) => groups[index].name}
          renderItem={(index) => {
            const group = groups[index];
            const active = index === current;
            return (
              <button
                type="button"
                title={group.name}
                aria-current={active ? "page" : undefined}
                onClick={() => onNavigate(index)}
                className={`mx-2 flex w-[calc(100%-1rem)] items-center justify-between gap-5 rounded-lg p-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800 ${
                  active
                    ? "bg-gray-100 font-semibold text-gray-900 dark:bg-gray-800 dark:text-white"
                    : ""
                }`}
              >
                <span className="truncate">{group.label}</span>
                <span className="shrink-0">
                  <span className="mr-2 text-sm text-gray-600 dark:text-gray-400">x</span>
                  {group.count}
                </span>
              </button>
            );
          }}
        />
      </nav>

      <div className="relative flex min-h-0 flex-1 flex-col">
        {hasPrevious && (
          <button
            type="button"
            aria-label="Previous group"
            title={groups[current - 1].name}
            className={`${WIDE_NAV} left-0`}
            onClick={() => go("prev")}
          >
            {chevron("prev")}
          </button>
        )}

        <div className="flex min-h-0 flex-1 flex-col xl:px-[90px]">
          {sidebarHeader && <div className="shrink-0 pt-2 md:hidden">{sidebarHeader}</div>}
          {children}
        </div>

        {hasNext && (
          <button
            type="button"
            aria-label="Next group"
            title={groups[current + 1].name}
            className={`${WIDE_NAV} right-0`}
            onClick={() => go("next")}
          >
            {chevron("next")}
          </button>
        )}

        <div className="flex shrink-0 items-center justify-between py-3 xl:hidden">
          {hasPrevious ? (
            <button
              type="button"
              aria-label="Previous group"
              className={MOBILE_NAV}
              onClick={() => go("prev")}
            >
              {chevron("prev")}
            </button>
          ) : (
            <span className="w-[90px]" />
          )}
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {current + 1} / {groups.length}
          </span>
          {hasNext ? (
            <button
              type="button"
              aria-label="Next group"
              className={MOBILE_NAV}
              onClick={() => go("next")}
            >
              {chevron("next")}
            </button>
          ) : (
            <span className="w-[90px]" />
          )}
        </div>
      </div>
    </div>
  );
}

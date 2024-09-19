"use client";

import { useElementInView } from "@/hooks/use-element-in-view";
import React, { useState } from "react";
import { kebabToScinameString } from "@/functions/kebab-to-scientific-name";

interface Props {
  name: string;
  rank: string;
  rowHeight: number;
  totalItems: number;
  items: React.ReactNode[];
  visibleItemsLength: number;
  containerHeight: number;
}

export default function SectionScroller({
  name,
  rank,
  rowHeight,
  totalItems,
  items,
  visibleItemsLength,
  containerHeight,
}: Props) {
  const { ref, inView } = useElementInView({
    threshold: 0,
    rootMargin: "15px",
  });

  //  Correction factor to adjust the height of the container when virtual
  //  scrolling is used.
  const correctionFactor = 129;

  // Calculate the total height of the container
  const totalHeight = rowHeight * totalItems;

  //   Current scroll position of the container
  const [scrollTop, setScrollTop] = useState(0);

  // Get the first element to be displayed
  const startNodeElem = Math.ceil(scrollTop / rowHeight);

  // Get the items to be displayed
  const visibleItems = items?.slice(
    startNodeElem,
    startNodeElem + visibleItemsLength + 1
  );

  //  Add padding to the empty space
  const offsetY = startNodeElem * rowHeight;

  const handleScroll = (e: any) => {
    // set scrollTop to the current scroll position of the container.
    setScrollTop(e?.currentTarget?.scrollTop);
  };

  return (
    <div
      id={name}
      ref={ref}
      className="m-auto xl:m-32"
      style={{
        minHeight: containerHeight + correctionFactor,
      }}
    >
      {inView && (
        <>
          <h3 className="text-gray-100 my-5">
            <div className="mt-16 mb-8">
              <div className="flex gap-8 items-baseline">
                <div className="text-3xl whitespace-nowrap">
                  {kebabToScinameString(name, rank)}
                </div>
                <div className="text-lg text-gray-500">x{items.length}</div>
              </div>
            </div>
          </h3>
          <div
            style={{
              height: containerHeight + 25,
              overflow: "auto",
            }}
            onScroll={handleScroll}
          >
            <div style={{ height: totalHeight }}>
              <div style={{ transform: `translateY(${offsetY}px)` }}>
                {visibleItems}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

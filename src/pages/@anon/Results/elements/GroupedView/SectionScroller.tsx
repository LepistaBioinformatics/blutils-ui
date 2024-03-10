"use client";

import React, { useState } from "react";

interface Props {
  sectionName: React.ReactNode;
  rowHeight: number;
  totalItems: number;
  items: React.ReactNode[];
  visibleItemsLength: number;
  containerHeight: string | number;
}

export default function SectionScroller({
  sectionName,
  rowHeight,
  totalItems,
  items,
  visibleItemsLength,
  containerHeight,
}: Props) {
  // Calculate the total height of the container
  const totalHeight = rowHeight * totalItems;
  //   Current scroll position of the container
  const [scrollTop, setScrollTop] = useState(0);
  // Get the first element to be displayed
  const startNodeElem = Math.ceil(scrollTop / rowHeight);
  // Get the items to be displayed
  const visibleItems = items?.slice(
    startNodeElem,
    startNodeElem + visibleItemsLength
  );

  //  Add padding to the empty space
  const offsetY = startNodeElem * rowHeight;

  const handleScroll = (e: any) => {
    // set scrollTop to the current scroll position of the container.
    setScrollTop(e?.currentTarget?.scrollTop);
  };

  return (
    <div className="max-w-6xl m-auto">
      <h3 className="text-gray-100 my-5">{sectionName}</h3>
      <div
        style={{
          height: containerHeight,
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
    </div>
  );
}

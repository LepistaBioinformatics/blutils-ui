import { useMemo, useState } from "react";
import { WeightedNode, Weighting } from "@/functions/chart-data";
import { formatValue, percent, SERIES, SERIES_OTHER, useChartTooltip } from "./ChartTooltip";

interface Props {
  tree: WeightedNode[];
  weighting: Weighting;
  onFilter: (path: string) => void;
}

const SIZE = 420;
const CENTER = SIZE / 2;
const RINGS = 4;
const INNER = 62;
const RING = (CENTER - INNER - 6) / RINGS;
const TOP_COLORS = 8;
const NEUTRAL = "var(--series-other)";

const capitalize = (value: string) => value.replace(/(^|\s)\S/g, (c) => c.toUpperCase());

function arcPath(a0: number, a1: number, r0: number, r1: number) {
  // Leave a hair of surface between neighbors (2px gap rule).
  const pad = Math.min(0.004, (a1 - a0) / 4);
  const s = a0 + pad;
  const e = Math.max(s, a1 - pad);
  const large = e - s > Math.PI ? 1 : 0;
  const p = (r: number, a: number) => `${CENTER + r * Math.sin(a)},${CENTER - r * Math.cos(a)}`;
  if (e - s >= 2 * Math.PI - 0.01) {
    // full ring: two halves
    return `M${p(r1, 0)} A${r1},${r1} 0 1 1 ${p(r1, Math.PI)} A${r1},${r1} 0 1 1 ${p(r1, 2 * Math.PI - 0.0001)} L${p(r0, 2 * Math.PI - 0.0001)} A${r0},${r0} 0 1 0 ${p(r0, Math.PI)} A${r0},${r0} 0 1 0 ${p(r0, 0)} Z`;
  }
  return `M${p(r1, s)} A${r1},${r1} 0 ${large} 1 ${p(r1, e)} L${p(r0, e)} A${r0},${r0} 0 ${large} 0 ${p(r0, s)} Z`;
}

interface Arc {
  node: WeightedNode;
  depth: number;
  a0: number;
  a1: number;
  color: string;
  opacity: number;
}

/**
 * Lineage rings from the zoomed node outwards (up to four levels), sized by the
 * weight. The first ring takes the categorical slots in weight order (the rest
 * gray); deeper rings keep their ancestor's hue, lighter with depth.
 */
export function LineageSunburst({ tree, weighting, onFilter }: Props) {
  const { containerRef, bind, node } = useChartTooltip();
  const [trail, setTrail] = useState<WeightedNode[]>([]);
  const focus = trail[trail.length - 1];
  const roots = focus ? focus.children : tree;
  const total = focus ? focus.value : tree.reduce((acc, n) => acc + n.value, 0);

  const arcs = useMemo(() => {
    const out: Arc[] = [];
    const walk = (
      nodes: WeightedNode[],
      depth: number,
      a0: number,
      span: number,
      parentValue: number,
      color?: string
    ) => {
      let angle = a0;
      // Colors start at the first level that branches: a single-child chain
      // (e.g. one kingdom) stays neutral instead of painting every ring one hue.
      const branching = color === undefined && nodes.length > 1;
      nodes.forEach((child, index) => {
        const a1 = angle + (child.value / parentValue) * span;
        const own = color ?? (branching ? (index < TOP_COLORS ? SERIES(index) : SERIES_OTHER) : undefined);
        out.push({
          node: child,
          depth,
          a0: angle,
          a1,
          color: own ?? NEUTRAL,
          opacity: own ? 1 - depth * 0.18 : 1,
        });
        if (depth + 1 < RINGS && child.children.length) walk(child.children, depth + 1, angle, a1 - angle, child.value, own);
        angle = a1;
      });
    };
    const sum = roots.reduce((acc, n) => acc + n.value, 0);
    if (sum > 0) walk(roots, 0, 0, 2 * Math.PI, sum);
    return out;
  }, [roots]);

  return (
    <div ref={containerRef} className="relative flex flex-col items-center gap-3">
      <nav aria-label="Sunburst zoom" className="flex flex-wrap items-center gap-1 text-sm">
        <button
          type="button"
          onClick={() => setTrail([])}
          className={`rounded px-1.5 py-0.5 hover:bg-gray-100 dark:hover:bg-gray-800 ${trail.length === 0 ? "font-semibold" : "text-gray-500"}`}
        >
          All
        </button>
        {trail.map((step, index) => (
          <span key={step.path} className="inline-flex items-center gap-1">
            <span aria-hidden className="text-gray-400">›</span>
            <button
              type="button"
              onClick={() => setTrail(trail.slice(0, index + 1))}
              className={`rounded px-1.5 py-0.5 hover:bg-gray-100 dark:hover:bg-gray-800 ${index === trail.length - 1 ? "font-semibold" : "text-gray-500"}`}
            >
              {capitalize(step.name)}
            </button>
          </span>
        ))}
        {focus && (
          <button
            type="button"
            onClick={() => onFilter(focus.path)}
            className="ml-2 rounded-full bg-gray-800 px-3 py-0.5 text-xs font-medium text-white hover:bg-gray-700 dark:bg-gray-200 dark:text-gray-900"
          >
            Filter by {capitalize(focus.name)}
          </button>
        )}
      </nav>

      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={`Lineage sunburst${focus ? ` of ${capitalize(focus.name)}` : ""}`} className="max-w-full">
        {arcs.map((arc) => {
          const r0 = INNER + arc.depth * RING;
          const label = `${capitalize(arc.node.name)}: ${formatValue(arc.node.value, weighting)}, ${percent(arc.node.value / (total || 1))}`;
          const zoomable = arc.node.children.length > 0;
          return (
            <path
              key={arc.node.path}
              data-testid="sunburst-arc"
              d={arcPath(arc.a0, arc.a1, r0, r0 + RING - 2)}
              fill={arc.color}
              fillOpacity={arc.opacity}
              role="button"
              tabIndex={0}
              aria-label={zoomable ? `${label}. Zoom in` : label}
              className="cursor-pointer outline-none hover:brightness-110 focus-visible:brightness-110"
              onClick={() => zoomable && setTrail([...trail, ...pathTo(roots, arc.node)])}
              onKeyDown={(event) => {
                if ((event.key === "Enter" || event.key === " ") && zoomable) {
                  event.preventDefault();
                  setTrail([...trail, ...pathTo(roots, arc.node)]);
                }
              }}
              {...bind(
                <>
                  <div className="font-semibold">{capitalize(arc.node.name)}</div>
                  <div>
                    {formatValue(arc.node.value, weighting)} · {percent(arc.node.value / (total || 1))}
                  </div>
                </>
              )}
            />
          );
        })}
        <text x={CENTER} y={CENTER - 4} textAnchor="middle" className="fill-gray-900 text-sm font-semibold dark:fill-gray-100">
          {focus ? capitalize(focus.name) : "All"}
        </text>
        <text x={CENTER} y={CENTER + 14} textAnchor="middle" className="fill-gray-500 text-xs dark:fill-gray-400">
          {formatValue(total, weighting)}
        </text>
      </svg>
      {node}
    </div>
  );
}

/** Nodes from one of `roots` down to `target` (inclusive). */
function pathTo(roots: WeightedNode[], target: WeightedNode): WeightedNode[] {
  for (const root of roots) {
    if (root === target) return [root];
    const below = pathTo(root.children, target);
    if (below.length) return [root, ...below];
  }
  return [];
}

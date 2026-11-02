import { useEffect, useRef, useState } from "react";
import { Modal } from "flowbite-react";
import { HiChevronRight } from "react-icons/hi";
import { TaxonomyTreeNode } from "@/functions/taxonomy-tree";
import { kebabToPlain } from "@/functions/kebab-to-plain";
import { translateRank } from "@/pages/@anon/Results/elements/TaxonomyCell";

interface Props {
  tree: TaxonomyTreeNode[];
  onPick: (path: string) => void;
  onClose: () => void;
}

/** Levels open when the tree is shown (root = depth 0). */
const DEFAULT_EXPANDED_DEPTH = 2;

const capitalize = (value: string) => value.replace(/(^|\s)\S/g, (c) => c.toUpperCase());

/** Browse the result's lineages; picking a node filters to the records under it. */
export function TaxonomyTreeModal({ tree, onPick, onClose }: Props) {
  return (
    <Modal show onClose={onClose} size="2xl" dismissible>
      <Modal.Header>Taxonomy tree</Modal.Header>
      <Modal.Body>
        <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
          Expand the lineages with the arrows; click a name to show only the records under it.
        </p>
        {tree.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No taxonomy in this result.</p>
        ) : (
          <ul role="tree" aria-label="Taxonomy tree" className="text-sm">
            {tree.map((node) => (
              <TreeItem key={node.path} node={node} depth={0} onPick={onPick} />
            ))}
          </ul>
        )}
      </Modal.Body>
    </Modal>
  );
}

function TreeItem({
  node,
  depth,
  onPick,
}: {
  node: TaxonomyTreeNode;
  depth: number;
  onPick: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth < DEFAULT_EXPANDED_DEPTH);
  // Children mount on first open and then stay mounted, so closing can animate too.
  const [mounted, setMounted] = useState(expanded);
  const hasChildren = node.children.length > 0;

  // React 18 does not pass `inert` through: set it on the DOM node, so a
  // collapsed (but still mounted) branch cannot be focused or clicked.
  const groupRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    groupRef.current?.toggleAttribute("inert", !expanded);
  }, [expanded, mounted]);

  const toggle = () => {
    if (!mounted) {
      // Mount collapsed first, then open on the next frame so the height animates.
      setMounted(true);
      requestAnimationFrame(() => setExpanded(true));
    } else {
      setExpanded((value) => !value);
    }
  };

  return (
    <li role="treeitem" aria-expanded={hasChildren ? expanded : undefined} aria-selected={false}>
      <div className="flex items-center gap-1.5 py-0.5" style={{ paddingLeft: depth * 20 }}>
        {hasChildren ? (
          <button
            type="button"
            aria-label={`${expanded ? "Collapse" : "Expand"} ${node.name}`}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 dark:hover:text-white"
            onClick={toggle}
          >
            <HiChevronRight
              aria-hidden
              className={`h-4 w-4 transition-transform duration-200 motion-reduce:transition-none ${
                expanded ? "rotate-90" : ""
              }`}
            />
          </button>
        ) : (
          <span className="w-6 shrink-0" />
        )}
        <button
          type="button"
          title={`Filter by ${node.path}`}
          className="rounded px-1 text-left text-gray-900 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-100 dark:hover:bg-gray-700 dark:hover:text-white"
          onClick={() => onPick(node.path)}
        >
          {capitalize(node.name)}
        </button>
        {node.rank && (
          <span className="text-xs uppercase text-gray-400">{kebabToPlain(translateRank(node.rank))}</span>
        )}
        <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">×{node.count}</span>
      </div>
      {hasChildren && mounted && (
        <div
          ref={groupRef}
          aria-hidden={!expanded}
          className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none ${
            expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <ul role="group" className="min-h-0 overflow-hidden">
            {node.children.map((child) => (
              <TreeItem key={child.path} node={child} depth={depth + 1} onPick={onPick} />
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}

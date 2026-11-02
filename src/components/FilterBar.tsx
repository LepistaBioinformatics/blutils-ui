import { KeyboardEvent, ReactNode, useId, useMemo, useRef, useState } from "react";
import { HiOutlineSearch, HiX } from "react-icons/hi";
import { PiTreeStructure } from "react-icons/pi";
import {
  FilterToken,
  parseFilter,
  serializeToken,
  tokenLabel,
} from "@/functions/record-filter";
import {
  activeValueToken,
  SuggestionIndex,
  suggestValues,
  ValueSuggestion,
} from "@/functions/filter-suggestions";
import { TaxonomyTreeNode } from "@/functions/taxonomy-tree";
import { TaxonomyTreeModal } from "./TaxonomyTreeModal";

interface Props {
  tokens: FilterToken[];
  onChange: (tokens: FilterToken[]) => void;
  tree: TaxonomyTreeNode[];
  /** Values offered after `q:`, `t:`, `rank:` and `rule:`. */
  suggestions?: SuggestionIndex;
  /** Rendered as the last row of the bar, below the filter buttons (e.g. the view selector). */
  footer?: ReactNode;
}

const PREFIXES: { label: string; prefix: string }[] = [
  { label: "Query", prefix: "q:" },
  { label: "Taxonomy", prefix: "t:" },
  { label: "Rank", prefix: "rank:" },
  { label: "Rule", prefix: "rule:" },
  { label: "Identity", prefix: "id>=" },
  { label: "Bit score", prefix: "bits>=" },
];

const BUTTON =
  "shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white";
const BUTTON_ACTIVE =
  "shrink-0 whitespace-nowrap rounded-full bg-gray-200 px-2.5 py-0.5 text-xs font-medium text-gray-900 dark:bg-gray-600 dark:text-white";

const sameToken = (a: FilterToken, b: FilterToken) => serializeToken(a) === serializeToken(b);

/**
 * One search box for every view: free text plus `key:value` tokens, shown as
 * removable chips. The buttons below insert tokens, typing a key suggests its
 * values, and the tree adds `t:` chips.
 */
export function FilterBar({ tokens, onChange, tree, suggestions, footer }: Props) {
  const [draft, setDraft] = useState("");
  const [treeOpen, setTreeOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [dismissed, setDismissed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  const active = activeValueToken(draft);
  const activeKey = active?.key;
  const activePartial = active?.partial ?? "";
  const options: ValueSuggestion[] = useMemo(
    () => (activeKey && suggestions ? suggestValues(suggestions, activeKey, activePartial) : []),
    [activeKey, activePartial, suggestions]
  );
  const open = focused && !dismissed && options.length > 0;

  const add = (added: FilterToken[]) => {
    const next = [...tokens];
    for (const token of added) {
      // `has:match` and `no:match` exclude each other.
      if (token.kind === "has") {
        const at = next.findIndex((t) => t.kind === "has");
        if (at !== -1) next.splice(at, 1);
      }
      if (!next.some((t) => sameToken(t, token))) next.push(token);
    }
    onChange(next);
  };

  const updateDraft = (value: string) => {
    setDraft(value);
    setHighlight(-1);
    setDismissed(false);
  };

  const commitDraft = () => {
    const parsed = parseFilter(draft);
    if (parsed.length > 0) add(parsed);
    updateDraft("");
  };

  const pick = (suggestion: ValueSuggestion) => {
    if (!active) return;
    // Commit everything typed before the active item, then the picked value.
    const before = parseFilter(draft.slice(0, active.start));
    add([...before, { kind: active.key, value: suggestion.value }]);
    updateDraft("");
    inputRef.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (open && event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((index) => (index + 1) % options.length);
    } else if (open && event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((index) => (index <= 0 ? options.length - 1 : index - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (open && highlight >= 0) pick(options[highlight]);
      else commitDraft();
    } else if (event.key === "Escape") {
      if (open) setDismissed(true);
      else updateDraft("");
    } else if (event.key === "Backspace" && draft === "" && tokens.length > 0) {
      onChange(tokens.slice(0, -1));
    }
  };

  const insertPrefix = (prefix: string) => {
    updateDraft(draft.trim() ? `${draft.trim()} ${prefix}` : prefix);
    inputRef.current?.focus();
  };

  const hasToken = (value: "match" | "no-match") =>
    tokens.some((t) => t.kind === "has" && t.value === value);

  const toggleHas = (value: "match" | "no-match") =>
    hasToken(value)
      ? onChange(tokens.filter((t) => !(t.kind === "has" && t.value === value)))
      : add([{ kind: "has", value }]);

  return (
    <div className="relative w-full min-w-0 rounded-2xl border border-gray-200 bg-white shadow-sm focus-within:border-gray-400 focus-within:shadow-none dark:border-gray-700 dark:bg-gray-800 dark:focus-within:border-gray-500">
      <div className="flex flex-wrap items-center gap-2 px-4 pb-1 pt-3">
        <HiOutlineSearch aria-hidden className="h-5 w-5 shrink-0 text-gray-400" />
        {tokens.map((token) => {
          const label = tokenLabel(token);
          return (
            <span
              key={serializeToken(token)}
              data-testid="filter-chip"
              className="inline-flex items-center gap-1 rounded-full bg-gray-100 py-0.5 pl-2.5 pr-1 text-sm text-gray-800 dark:bg-gray-700 dark:text-gray-100"
            >
              {label}
              <button
                type="button"
                aria-label={`Remove filter ${label}`}
                className="rounded-full p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600"
                onClick={() => onChange(tokens.filter((t) => !sameToken(t, token)))}
              >
                <HiX aria-hidden className="h-3 w-3" />
              </button>
            </span>
          );
        })}
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-label="Filter records"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={open && highlight >= 0 ? `${listboxId}-${highlight}` : undefined}
          value={draft}
          onChange={(event) => updateDraft(event.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={
            tokens.length > 0 ? "Add a filter…" : 'Filter records… e.g. q:SRR207 t:"bacillus" id>=97'
          }
          className="min-w-[10rem] flex-1 border-0 bg-transparent p-0.5 text-base outline-none text-gray-900 placeholder:text-gray-400 focus:ring-0 dark:text-gray-100"
        />
        {tokens.length > 0 && (
          <button
            type="button"
            className="shrink-0 whitespace-nowrap text-xs text-gray-500 hover:text-gray-900 hover:underline dark:text-gray-400"
            onClick={() => onChange([])}
          >
            Clear filters
          </button>
        )}
      </div>

      {open && active && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={`${PREFIXES.find((p) => p.prefix === `${active.key}:`)?.label ?? "Value"} suggestions`}
          className="absolute left-3 right-3 top-full z-20 mt-1 max-h-72 overflow-auto rounded-xl bg-white py-1 shadow-lg ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700"
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              id={`${listboxId}-${index}`}
              role="option"
              aria-selected={index === highlight}
              // Keep the input focused so the list does not close before the click.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => pick(option)}
              onMouseEnter={() => setHighlight(index)}
              className={`flex cursor-pointer items-center justify-between gap-4 px-3 py-1.5 text-sm text-gray-800 dark:text-gray-100 ${
                index === highlight ? "bg-gray-100 dark:bg-gray-700" : ""
              }`}
            >
              <span className="truncate">{option.value}</span>
              {option.count !== undefined && (
                <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">×{option.count}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-1 overflow-x-auto px-3 pb-2 md:flex-wrap md:overflow-visible">
        {PREFIXES.map(({ label, prefix }) => (
          <button
            key={prefix}
            type="button"
            className={BUTTON}
            title={`Insert ${prefix}`}
            onClick={() => insertPrefix(prefix)}
          >
            + {label}
          </button>
        ))}
        <span aria-hidden className="mx-1 text-gray-300 dark:text-gray-600">·</span>
        <button
          type="button"
          aria-pressed={hasToken("match")}
          className={hasToken("match") ? BUTTON_ACTIVE : BUTTON}
          onClick={() => toggleHas("match")}
        >
          Matched
        </button>
        <button
          type="button"
          aria-pressed={hasToken("no-match")}
          className={hasToken("no-match") ? BUTTON_ACTIVE : BUTTON}
          onClick={() => toggleHas("no-match")}
        >
          Unmatched
        </button>
        <button
          type="button"
          className={`${BUTTON} inline-flex items-center gap-1`}
          onClick={() => setTreeOpen(true)}
        >
          <PiTreeStructure aria-hidden /> Taxonomy tree
        </button>
      </div>

      {footer && <div className="px-3 pb-3 pt-1">{footer}</div>}

      {treeOpen && (
        <TaxonomyTreeModal
          tree={tree}
          onClose={() => setTreeOpen(false)}
          onPick={(path) => {
            add([{ kind: "t", value: path }]);
            setTreeOpen(false);
          }}
        />
      )}
    </div>
  );
}

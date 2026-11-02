import { Result } from "@/types/BlutilsResult";
import { BeanSelectionRules } from "@/types/BeanSelectionRules";
import { readableLineage } from "./record-filter";

export type SuggestKey = "q" | "t" | "rank" | "rule";

export interface ValueSuggestion {
  value: string;
  /** Records with this value (absent for queries, which are unique). */
  count?: number;
}

export type SuggestionIndex = Record<SuggestKey, ValueSuggestion[]>;

/** The `key:partial` item being typed at the end of the draft, if any. */
export interface ActiveValueToken {
  key: SuggestKey;
  partial: string;
  /** Index in the draft where the item starts (to replace it on pick). */
  start: number;
}

const ACTIVE_RE = /(^|\s)(q|t|rank|rule):("?)([^"]*)$/i;

export function activeValueToken(draft: string): ActiveValueToken | null {
  const match = draft.match(ACTIVE_RE);
  if (!match || match.index === undefined) return null;
  // An unquoted value ends at the first space: past it, nothing is being typed.
  if (!match[3] && /\s/.test(match[4])) return null;
  return {
    key: match[2].toLowerCase() as SuggestKey,
    partial: match[4],
    start: match.index + match[1].length,
  };
}

function counted(values: string[]): ValueSuggestion[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return Array.from(counts, ([value, count]) => ({ value, count })).sort(
    (a, b) => b.count - a.count || a.value.localeCompare(b.value)
  );
}

/** Candidate values per filter key, from the loaded result. */
export function buildSuggestionIndex(results: Result[]): SuggestionIndex {
  const lineageNames: string[] = [];
  for (const result of results) {
    const lineage = readableLineage(result.taxon?.taxonomy);
    if (lineage) lineageNames.push(...lineage.split(" > "));
  }

  return {
    q: Array.from(new Set(results.map((r) => r.query)))
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({ value })),
    t: counted(lineageNames),
    rank: counted(
      results.flatMap((r) => (r.taxon ? [r.taxon.reachedRank.replace(/-/g, " ")] : []))
    ),
    rule: counted(
      results.map((r) =>
        BeanSelectionRules.RULE_INFO[
          BeanSelectionRules.getRuleKind(r.taxon?.consensusBeans)
        ].label.toLowerCase()
      )
    ),
  };
}

/** Values of `key` containing `partial` (case-insensitive), most frequent first. */
export function suggestValues(
  index: SuggestionIndex,
  key: SuggestKey,
  partial: string,
  limit = 8
): ValueSuggestion[] {
  const term = partial.trim().toLowerCase();
  const values = index[key];
  if (!term) return values.slice(0, limit);

  const matches = values.filter((s) => s.value.toLowerCase().includes(term));
  // Values that start with the term come first; the frequency order is kept within each half.
  return [
    ...matches.filter((s) => s.value.toLowerCase().startsWith(term)),
    ...matches.filter((s) => !s.value.toLowerCase().startsWith(term)),
  ].slice(0, limit);
}

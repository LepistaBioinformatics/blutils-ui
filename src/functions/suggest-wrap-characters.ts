export interface WrapSuggestion {
  character: string;
  /** Groups the subject view would show with this character. */
  groups: number;
  /** Share of queries that contain the character (0–1). */
  coverage: number;
}

const MIN_COVERAGE = 0.5;

/**
 * The subject key of a query for a wrap character: the text before its first
 * occurrence, or the whole query when that text is empty (BUG-U09). Mirrors
 * the grouping in `Results`.
 */
export function wrapKey(query: string, character: string | undefined): string {
  if (!character) return query;
  return query.split(character).at(0) || query;
}

/**
 * Suggests wrap characters for grouping queries by subject. Every
 * non-alphanumeric character found in the queries is a candidate; it is kept
 * when most queries contain it and it actually groups them (more than one
 * group, fewer groups than queries). Best first: highest coverage, then the
 * fewest groups.
 */
export function suggestWrapCharacters(queries: string[], max = 3): WrapSuggestion[] {
  if (queries.length < 2) return [];

  const candidates = new Set<string>();
  for (const query of queries) {
    for (const char of query) {
      if (!/[A-Za-z0-9]/.test(char)) candidates.add(char);
    }
  }

  const suggestions: WrapSuggestion[] = [];
  candidates.forEach((character) => {
    let containing = 0;
    const keys = new Set<string>();
    for (const query of queries) {
      if (query.includes(character)) containing += 1;
      keys.add(wrapKey(query, character));
    }
    const coverage = containing / queries.length;
    if (coverage >= MIN_COVERAGE && keys.size > 1 && keys.size < queries.length) {
      suggestions.push({ character, groups: keys.size, coverage });
    }
  });

  return suggestions
    .sort((a, b) => b.coverage - a.coverage || a.groups - b.groups || a.character.localeCompare(b.character))
    .slice(0, max);
}

import { Result } from "@/types/BlutilsResult";
import { BeanSelectionRules } from "@/types/BeanSelectionRules";

export type TextKey = "q" | "t" | "rank" | "rule";
export type Metric = "id" | "bits";
export type Operator = ">=" | "<=" | ">" | "<";

export type FilterToken =
  | { kind: "text"; value: string }
  | { kind: TextKey; value: string }
  | { kind: Metric; op: Operator; value: number }
  | { kind: "has"; value: "match" | "no-match" };

const TEXT_KEYS: TextKey[] = ["q", "t", "rank", "rule"];
const METRIC_RE = /^(id|bits)(>=|<=|>|<)(-?\d+(?:\.\d+)?)$/i;

/** Splits on whitespace, keeping "quoted text" (and key:"quoted text") whole. */
function splitItems(text: string): string[] {
  const items: string[] = [];
  const re = /(?:[^\s"]+)?"[^"]*"?|[^\s"]+/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) items.push(match[0]);
  return items;
}

function unquote(value: string): string {
  return value.replace(/^"/, "").replace(/"$/, "");
}

function parseItem(item: string): FilterToken | null {
  const metric = item.match(METRIC_RE);
  if (metric) {
    return {
      kind: metric[1].toLowerCase() as Metric,
      op: metric[2] as Operator,
      value: Number(metric[3]),
    };
  }

  const colon = item.indexOf(":");
  if (colon > 0) {
    const key = item.slice(0, colon).toLowerCase();
    const value = unquote(item.slice(colon + 1)).trim();

    if ((key === "has" || key === "no") && value.toLowerCase() === "match") {
      return { kind: "has", value: key === "has" ? "match" : "no-match" };
    }
    if ((TEXT_KEYS as string[]).includes(key)) {
      return value ? { kind: key as TextKey, value } : null;
    }
  }

  const value = unquote(item).trim();
  return value ? { kind: "text", value } : null;
}

/** Parses the filter box syntax; unknown `key:` items become free text. */
export function parseFilter(text: string | null | undefined): FilterToken[] {
  if (!text) return [];
  return splitItems(text)
    .map(parseItem)
    .filter((token): token is FilterToken => token !== null);
}

function quoteIfNeeded(value: string): string {
  return /[\s"]/.test(value) ? `"${value.replace(/"/g, "")}"` : value;
}

export function serializeToken(token: FilterToken): string {
  switch (token.kind) {
    case "text":
      return quoteIfNeeded(token.value);
    case "id":
    case "bits":
      return `${token.kind}${token.op}${token.value}`;
    case "has":
      return token.value === "match" ? "has:match" : "no:match";
    default:
      return `${token.kind}:${quoteIfNeeded(token.value)}`;
  }
}

export function serializeFilter(tokens: FilterToken[]): string {
  return tokens.map(serializeToken).join(" ");
}

/** Short human label for a chip. */
export function tokenLabel(token: FilterToken): string {
  switch (token.kind) {
    case "text":
      return `"${token.value}"`;
    case "q":
      return `Query: ${token.value}`;
    case "t":
      return `Taxonomy: ${token.value}`;
    case "rank":
      return `Rank: ${token.value}`;
    case "rule":
      return `Rule: ${token.value}`;
    case "id":
      return `Identity ${token.op} ${token.value}%`;
    case "bits":
      return `Bit score ${token.op} ${token.value}`;
    case "has":
      return token.value === "match" ? "Matched only" : "Unmatched only";
  }
}

/**
 * `d__bacteria;p__bacillota;g__bacillus` → `bacteria > bacillota > bacillus`.
 * Lower case, hyphens as spaces: the form `t:` and the taxonomy tree use.
 */
export function readableLineage(taxonomy: string | null | undefined): string {
  if (!taxonomy) return "";
  return taxonomy
    .split(";")
    .map((bit) => {
      const name = bit.includes("__") ? bit.slice(bit.indexOf("__") + 2) : bit;
      return name.replace(/-/g, " ").trim().toLowerCase();
    })
    .filter(Boolean)
    .join(" > ");
}

const normalize = (value: string) => value.replace(/-/g, " ").toLowerCase();

function compare(actual: number, op: Operator, expected: number): boolean {
  switch (op) {
    case ">=":
      return actual >= expected;
    case "<=":
      return actual <= expected;
    case ">":
      return actual > expected;
    case "<":
      return actual < expected;
  }
}

function matchesToken(result: Result, token: FilterToken): boolean {
  const taxon = result.taxon;

  switch (token.kind) {
    case "q":
      return result.query.toLowerCase().includes(token.value.toLowerCase());
    case "t":
      return readableLineage(taxon?.taxonomy).includes(normalize(token.value));
    case "rank":
      return !!taxon && normalize(taxon.reachedRank) === normalize(token.value);
    case "rule":
      return (
        BeanSelectionRules.getRuleKind(taxon?.consensusBeans) ===
        token.value.toLowerCase()
      );
    case "id":
      return !!taxon && compare(taxon.percIdentity, token.op, token.value);
    case "bits":
      return !!taxon && compare(taxon.bitScore, token.op, token.value);
    case "has":
      return token.value === "match" ? !!taxon : !taxon;
    case "text": {
      const term = normalize(token.value);
      return (
        result.query.toLowerCase().includes(token.value.toLowerCase()) ||
        (!!taxon && normalize(taxon.identifier).includes(term)) ||
        readableLineage(taxon?.taxonomy).includes(term)
      );
    }
  }
}

/** Every token must match (AND). An empty filter matches everything. */
export function matchesFilter(result: Result, tokens: FilterToken[]): boolean {
  return tokens.every((token) => matchesToken(result, token));
}

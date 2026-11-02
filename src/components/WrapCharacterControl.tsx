import { FormEvent, useEffect, useId, useMemo, useState } from "react";
import { HiX } from "react-icons/hi";
import { suggestWrapCharacters, wrapKey } from "@/functions/suggest-wrap-characters";

interface Props {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  /** Queries to analyze for suggestions. */
  queries: string[];
}

const CHIP =
  "inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm transition-colors";
const CHIP_IDLE =
  "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600";
const CHIP_ACTIVE = "bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900";

const label = (character: string) => (character === " " ? "space" : character);

/**
 * Wrap character for the subject view: queries are grouped by the text before
 * it (e.g. "." groups SRR20752596.1_size_54 under SRR20752596). Offers the
 * separators that actually group the loaded queries, plus a free input, and
 * previews the effect on a real query.
 */
export function WrapCharacterControl({ value, onChange, queries }: Props) {
  // Rendered twice (sidebar on md+, above the content on phones): unique ids.
  const inputId = useId();
  const [draft, setDraft] = useState(value ?? "");
  useEffect(() => setDraft(value ?? ""), [value]);

  const suggestions = useMemo(() => suggestWrapCharacters(queries), [queries]);

  // Preview with the active character, or the best suggestion before one is chosen.
  const previewCharacter = value ?? suggestions[0]?.character;
  const sample = previewCharacter
    ? queries.find((query) => query.includes(previewCharacter))
    : undefined;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    onChange(draft === "" ? undefined : draft);
  };

  return (
    <div className="mx-2 rounded-xl bg-white p-3 dark:bg-gray-800">
      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Group by prefix</p>
      <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
        Split each query at a character and group the records by the part before it.
      </p>

      <form onSubmit={onSubmit} className="flex flex-col gap-1">
        <label htmlFor={inputId} className="text-xs font-medium text-gray-700 dark:text-gray-300">
          Wrap character
        </label>
        <div className="flex items-center gap-1.5">
          <input
            id={inputId}
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Type a character"
            title='Groups queries by the text before this character, e.g. "." groups SRR20752596.1_size_54 under SRR20752596 (press Enter)'
            className="w-full rounded-lg border-0 bg-gray-100 px-2.5 py-1.5 font-mono text-sm text-gray-900 placeholder:font-sans placeholder:text-gray-400 focus:ring-1 focus:ring-gray-400 dark:bg-gray-700 dark:text-gray-100"
          />
          {value !== undefined && (
            <button
              type="button"
              aria-label="Clear wrap character"
              className="shrink-0 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-white"
              onClick={() => onChange(undefined)}
            >
              <HiX aria-hidden className="h-4 w-4" />
            </button>
          )}
        </div>
        <span className="text-[11px] text-gray-400">Press Enter to apply</span>
      </form>

      {suggestions.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 text-xs font-medium text-gray-700 dark:text-gray-300">Suggested</p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((suggestion) => {
              const active = value === suggestion.character;
              return (
                <button
                  key={suggestion.character}
                  type="button"
                  aria-pressed={active}
                  aria-label={`Use "${suggestion.character}" as wrap character (${suggestion.groups} groups)`}
                  className={`${CHIP} ${active ? CHIP_ACTIVE : CHIP_IDLE}`}
                  onClick={() => onChange(active ? undefined : suggestion.character)}
                >
                  <span
                    className={`rounded px-1.5 font-mono font-semibold ${
                      active ? "bg-white/20" : "bg-white dark:bg-gray-800"
                    }`}
                  >
                    {label(suggestion.character)}
                  </span>
                  <span className="text-xs">{suggestion.groups} groups</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {previewCharacter && sample && (
        <dl
          data-testid="wrap-preview"
          className="mt-3 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[11px] text-gray-500 dark:text-gray-400"
        >
          <dt>Before</dt>
          <dd className="break-all font-mono">{sample}</dd>
          <dt>After</dt>
          <dd className="break-all font-mono font-semibold text-gray-800 dark:text-gray-200">
            {wrapKey(sample, previewCharacter)}
          </dd>
        </dl>
      )}
    </div>
  );
}

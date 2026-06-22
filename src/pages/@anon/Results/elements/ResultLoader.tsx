import { useForm, SubmitHandler } from "react-hook-form";
import { BlutilsResult } from "@/types/BlutilsResult";
import { Button, Spinner } from "flowbite-react";
import { HiOutlineUpload } from "react-icons/hi";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

const EXAMPLE_RAW_RESULT_URL = "https://raw.githubusercontent.com/LepistaBioinformatics/blutils/8c42f3e7bfe2d1e9de2038985e7c9a47625b6e78/test/mock/output/zymo-mock/blutils.consensus.json";

interface IFormInput {
  content: FileList;
}

interface Props {
  resultSetter: (result: BlutilsResult) => void;
}

export function ResultLoader({ resultSetter }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const { register, handleSubmit } = useForm<IFormInput>();
  const fileField = register("content");

  const urlIsValid = (urlString: string | null) => {
    try {
      if (!urlString) return false;
      return Boolean(new URL(urlString));
    } catch (_) {
      return false;
    }
  };

  const memoizedUrlState = useMemo(() => {
    if (searchParams.has("p")) {
      const p = searchParams.get("p");
      if (urlIsValid(p)) return p as string;
    }

    return null;
  }, [searchParams]);

  /**
   * Fetches a result file from a URL (used by the sample dataset).
   */
  const handleLoadFromPath = useCallback(
    (path: string) => {
      setIsLoading(true);
      setError(null);

      fetch(path)
        .then((response) => response.text())
        .then((text) => resultSetter(JSON.parse(text)))
        .then(() => setSearchParams({ p: path }))
        .catch(() =>
          setError("Couldn't load the sample dataset. Please try again.")
        )
        .finally(() => setIsLoading(false));
    },
    [resultSetter, setSearchParams]
  );

  useEffect(() => {
    memoizedUrlState && handleLoadFromPath(memoizedUrlState);
  }, [memoizedUrlState, handleLoadFromPath]);

  const onSubmit: SubmitHandler<IFormInput> = async ({ content }: IFormInput) => {
    const targetFile = content?.item(0);
    if (!targetFile) return;

    try {
      const fileContent = await targetFile.text();
      const parsed = JSON.parse(fileContent);
      setError(null);
      setSearchParams({ p: targetFile.name });
      resultSetter(parsed);
    } catch (e) {
      setError(
        "That file isn't a valid Blutils result. Make sure it's the blutils.consensus.json your run produced."
      );
    }
  };

  return (
    <div className="m-auto my-24 flex w-full max-w-lg flex-col gap-8 rounded-xl border border-gray-200 bg-surface p-8 shadow-sm dark:border-gray-700 dark:bg-surface-dark">
      <header className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-ink dark:text-gray-100">
          Open your results
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Load the <code className="text-[0.8em]">blutils.consensus.json</code>{" "}
          your Blutils run produced to explore the taxonomic consensus.
        </p>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="relative">
          <input
            id="file"
            type="file"
            accept=".json,application/json"
            className="peer sr-only"
            {...fileField}
            onChange={(e) => {
              fileField.onChange(e);
              setError(null);
              setFileName(e.target.files?.[0]?.name ?? null);
            }}
          />
          <label
            htmlFor="file"
            className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-8 text-center transition-colors hover:border-science-400 hover:bg-science-50 peer-focus-visible:border-science-400 peer-focus-visible:ring-2 peer-focus-visible:ring-science-300 dark:border-gray-600 dark:bg-gray-800/50 dark:hover:border-science-400 dark:hover:bg-science-900/20"
          >
            <HiOutlineUpload className="mb-1 h-7 w-7 text-gray-400 dark:text-gray-500" />
            <span className="text-sm font-medium text-ink dark:text-gray-100">
              {fileName ?? "Choose your result file"}
            </span>
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {fileName ? "Click to choose a different file" : "blutils.consensus.json from your run"}
            </span>
          </label>
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <Button type="submit" fullSized disabled={!fileName}>
          View results
        </Button>
      </form>

      <div className="border-t border-gray-200 pt-5 text-center dark:border-gray-700">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          New to Blutils?{" "}
          <button
            type="button"
            onClick={() => handleLoadFromPath(EXAMPLE_RAW_RESULT_URL)}
            disabled={isLoading}
            className="font-medium text-gray-700 underline decoration-dotted underline-offset-2 hover:text-brand-600 disabled:opacity-60 dark:text-gray-300 dark:hover:text-brand-400"
          >
            Load a sample dataset
          </button>
          {isLoading && <Spinner size="sm" className="ml-2 align-middle" />}
        </p>
      </div>
    </div>
  );
}

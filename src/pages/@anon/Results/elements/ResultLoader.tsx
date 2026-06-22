import { useForm, SubmitHandler } from "react-hook-form";
import { BlutilsResult } from "@/types/BlutilsResult";
import { FileInput, Button, Spinner } from "flowbite-react";
import { LandingPage } from "./LandingPage";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

const EXAMPLE_RAW_RESULT_URL = "https://raw.githubusercontent.com/LepistaBioinformatics/blutils/8c42f3e7bfe2d1e9de2038985e7c9a47625b6e78/test/mock/output/zymo-mock/blutils.consensus.json";

const EXAMPLE_DATA_URL = "https://github.com/LepistaBioinformatics/blutils/blob/8c42f3e7bfe2d1e9de2038985e7c9a47625b6e78/test/mock/output/zymo-mock/blutils.consensus.json";

const BLUTILS_GITHUB_URL = "https://github.com/LepistaBioinformatics/blutils";

interface IFormInput {
  content: FileList;
}

interface Props {
  resultSetter: (result: BlutilsResult) => void;
}

export function ResultLoader({ resultSetter }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const { register, handleSubmit } = useForm<IFormInput>();

  const urlIsValid = (urlString: string | null) => {
    try {
      if (!urlString) return false;
      return Boolean(new URL(urlString));
    } catch (_) {
      return false;
    }
  }

  const memoizedUrlState = useMemo(() => {
    if (searchParams.has("p")) {
      const p = searchParams.get("p");
      if (urlIsValid(p)) return p as string;
    }

    return null;
  }, [searchParams]);

  /**
   * Fetches the example data from the Blutils repository
   */
  const handleLoadFromPath = useCallback(
    (path: string) => {
      setIsLoading(true);

      fetch(path)
        .then((response) => response.text())
        .then((text) => resultSetter(JSON.parse(text)))
        .then(() => setSearchParams({ p: path }))
        .catch((e) => console.error(e))
        .finally(() => setIsLoading(false));
    },
    [resultSetter, setSearchParams]
  );

  useEffect(() => {
    memoizedUrlState && handleLoadFromPath(memoizedUrlState);
  }, [memoizedUrlState, handleLoadFromPath]);

  const onSubmit: SubmitHandler<IFormInput> = async ({
    content,
  }: IFormInput) => {
    let targetFile = content.item(0);
    if (!targetFile) return;

    try {
      let fileContent = await targetFile.text();
      setSearchParams({ p: targetFile.name });
      resultSetter(JSON.parse(fileContent));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
      <div className="m-auto my-32 flex max-w-lg flex-col gap-16 rounded-xl border border-gray-200 bg-surface p-8 shadow-sm dark:border-gray-700 dark:bg-surface-dark dark:text-gray-300">
        <div>
          <h1 className="text-3xl text-center font-bold mt-6 mb-12">
            Blutils Results Explorer
          </h1>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex justify-around gap-3 my-5 border-t border-gray-200 dark:border-gray-700 pt-5"
          >
            <FileInput
              id="file"
              className="w-full"
              {...register("content")}
              onChange={(e: any) => {
                const file = e.target.files[0];
                if (file) setSearchParams({ p: file.name });
              }}
            />
            <Button type="submit">Submit</Button>
          </form>
          <p className="max-w-lg">
            Load the JSON field generated after running the Blutils analysis
          </p>
          <LandingPage />
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 my-5 pt-5">
          <p className="my-3">
            Or load{" "}
            <a
              href={EXAMPLE_DATA_URL}
              className="text-brand-600 dark:text-brand-400 font-bold hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              example data
            </a>{" "}
            from the{" "}
            <a
              href={BLUTILS_GITHUB_URL}
              className="text-brand-600 dark:text-brand-400 font-bold hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              Blutils
            </a>{" "}
            repository
          </p>
          <Button fullSized onClick={() => handleLoadFromPath(EXAMPLE_RAW_RESULT_URL)}>
            {isLoading ? <Spinner /> : "Load example"}
          </Button>
        </div>
      </div>
    </>
  );
}

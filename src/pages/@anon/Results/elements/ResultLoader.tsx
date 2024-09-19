import { useForm, SubmitHandler, set } from "react-hook-form";
import { BlutilsResult } from "@/types/BlutilsResult";
import { FileInput, Button, Spinner } from "flowbite-react";
import { LandingPage } from "./LandingPage";
import { useEffect, useMemo, useState } from "react";
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
  const handleLoadFromPath = (path: string) => {
    setIsLoading(true);

    fetch(path)
      .then((response) => response.text())
      .then((text) => resultSetter(JSON.parse(text)))
      .then(() => setSearchParams({ p: path }))
      .catch((e) => console.error(e))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    memoizedUrlState && handleLoadFromPath(memoizedUrlState);
  }, [memoizedUrlState]);

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
      <div className="dark:text-gray-300 m-auto max-w-lg border p-5 my-32 rounded-xl flex flex-col gap-16">
        <div>
          <h1 className="text-3xl text-center font-bold mt-6 mb-12">
            Blutils Results Explorer
          </h1>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex justify-around gap-3 my-5 border-t-2 border-t-gray-500 pt-5"
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

        <div className="border-t-2 border-t-gray-500 my-5 pt-5">
          <p className="my-3">
            Or load{" "}
            <a
              href={EXAMPLE_DATA_URL}
              className="text-blue-500 font-bold hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              example data
            </a>{" "}
            from the{" "}
            <a
              href={BLUTILS_GITHUB_URL}
              className="text-blue-500 font-bold hover:underline"
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

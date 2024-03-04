import { useForm, SubmitHandler } from "react-hook-form";
import { BlutilsResult } from "../../../../types/BlutilsResult";
import { FileInput, Button } from "flowbite-react";

interface IFormInput {
  content: FileList;
}

interface Props {
  resultSetter: (result: BlutilsResult) => void;
}

export function ResultUpload({ resultSetter }: Props) {
  const { register, handleSubmit } = useForm<IFormInput>();

  const onSubmit: SubmitHandler<IFormInput> = async ({
    content,
  }: IFormInput) => {
    let targetFile = content.item(0);
    if (!targetFile) return;

    try {
      let fileContent = await targetFile.text();
      resultSetter(JSON.parse(fileContent));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="dark:text-gray-300 m-auto max-w-lg border p-5 my-32 rounded-xl">
      <h1 className="text-3xl text-center font-bold mt-6 mb-12">
        Results Explorer
      </h1>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex justify-around gap-3 my-5 border-t-2 border-t-gray-500 pt-5"
      >
        <FileInput id="file" {...register("content")} className="w-full" />
        <Button type="submit">Submit</Button>
      </form>
      <p className="max-w-sm">
        Use this field to load the JSON field containing the Blutils results
      </p>
    </div>
  );
}

import { useForm, SubmitHandler } from "react-hook-form";
import { BlutilsResult } from "../../../../types/BlutilsResult";
import { FileInput, Button, Label } from "flowbite-react";

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
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="mb-2 block">
        <Label htmlFor="file" value="Upload file" />
      </div>
      <FileInput
        id="file"
        helperText="The Blutils result file"
        {...register("content")}
      />
      <Button type="submit">Submit</Button>
    </form>
  );
}

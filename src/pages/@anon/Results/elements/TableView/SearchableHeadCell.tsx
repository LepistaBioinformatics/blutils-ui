import { Table, TextInput } from "flowbite-react";
import { useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { MdKeyboardArrowRight } from "react-icons/md";
import { FaFilter, FaTimesCircle } from "react-icons/fa";

interface Props {
  children: React.ReactNode;
  placeholder?: string;
  handleSearch: (term: string | undefined) => void;
}

interface Inputs {
  term: string;
}

export function SearchableHeadCell({
  children,
  placeholder,
  handleSearch,
}: Props): JSX.Element {
  const [showSearch, setShowSearch] = useState(false);

  const { register, handleSubmit, watch, setValue } = useForm<Inputs>();

  const handleInternalSearch = (term: string) => {
    handleSearch(term === "" ? undefined : term.trim());
  };

  const onSubmit: SubmitHandler<Inputs> = ({ term }) => {
    handleInternalSearch(term);
  };

  const watchTerm = watch("term");

  return (
    <Table.HeadCell className="whitespace-nowrap hover:border-2 hover:border-blue-500 p-0">
      <div
        className="flex gap-5 hover:cursor-pointer p-5"
        onClick={() => setShowSearch(true)}
        onBlur={() => setShowSearch(false)}
      >
        <div className="flex gap-3">
          <FaFilter className="text mt-[2px]" />
          <div className="flex justify-between">
            {showSearch ? (
              <form onSubmit={handleSubmit(onSubmit)} className="h-4 -mt-3">
                <TextInput
                  type="text-xl w-full"
                  placeholder={placeholder || "Search..."}
                  className="h-4"
                  sizing="md"
                  autoFocus
                  {...register("term")}
                  onChange={(e) => {
                    setValue("term", e.target.value);
                    handleSubmit((data) => handleInternalSearch(data.term))();
                  }}
                />
                <button type="submit" />
              </form>
            ) : (
              <div className="flex items-center">
                {children}
                {watchTerm && (
                  <div className="mx-1 text-blue-500">
                    <MdKeyboardArrowRight className="inline text-xl -mt-1 mr-1" />
                    {watchTerm}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        {watchTerm && (
          <FaTimesCircle
            className="h-4 w-5 hover:cursor-pointer text-yellow-500"
            onClick={() => {
              setValue("term", "", { shouldValidate: true });
              handleInternalSearch("");
            }}
          />
        )}
      </div>
    </Table.HeadCell>
  );
}

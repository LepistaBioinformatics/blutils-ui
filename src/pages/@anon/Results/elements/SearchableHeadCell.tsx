import { Table, TextInput } from "flowbite-react";
import { useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { MdKeyboardArrowRight } from "react-icons/md";
import { FaFilter, FaTimesCircle } from "react-icons/fa";

interface Props {
  children: React.ReactNode;
  placeholder?: string;
  handleSearch: (term: string) => void;
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
  const onSubmit: SubmitHandler<Inputs> = ({ term }) => handleSearch(term);

  const watchTerm = watch("term");

  return (
    <Table.HeadCell className="whitespace-nowrap hover:border-2 hover:border-blue-500">
      <div
        className="flex gap-5 hover:cursor-pointer"
        onClick={() => setShowSearch(true)}
        onBlur={() => setShowSearch(false)}
      >
        <div className="flex gap-3">
          <FaFilter className="text mt-[2px]" />
          <div className="flex justify-between">
            {showSearch ? (
              <form onSubmit={handleSubmit(onSubmit)} className="h-4">
                <TextInput
                  type="text-xl w-full"
                  placeholder={placeholder || "Search..."}
                  className="h-4"
                  sizing="lg"
                  autoFocus
                  {...register("term", { required: true })}
                />
                <button type="submit" />
              </form>
            ) : (
              <div className="flex items-center">
                {children}
                {watchTerm && (
                  <div className="mx-1">
                    <MdKeyboardArrowRight className="inline text-xl -mt-1" />{" "}
                    {watchTerm}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        {watchTerm && (
          <FaTimesCircle
            className="h-4 w-5 hover:cursor-pointer"
            onClick={() => setValue("term", "", { shouldValidate: true })}
          />
        )}
      </div>
    </Table.HeadCell>
  );
}

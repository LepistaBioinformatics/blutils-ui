import { useMemo, useState } from "react";
import { ResultLoader } from "./elements/ResultLoader";
import { Button, Select, TextInput } from "flowbite-react";
import { ViewType } from "@/types/ViewType";
import { BlutilsResult, Result } from "@/types/BlutilsResult";
import { ResultsGroupedByTaxonomy } from "@/types/GroupedResults";
import { TableView } from "./elements/TableView";
import { GroupedByTaxonomyView } from "./elements/GroupedByTaxonomyView";
import { useSearchParams } from "react-router-dom";
import { GroupedByQueryView } from "./elements/GroupedByQueryView";
import { SubmitHandler, useForm } from "react-hook-form";

interface IFormInput {
  character?: string;
}

export function Results() {
  const [pageSize, setPageSize] = useState(10);
  const [_, setSearchParams] = useSearchParams();
  const [wrapCharacter, setWrapCharacter] = useState<string | undefined>(undefined);

  const [viewType, setViewType] = useState<ViewType>(ViewType.Table);
  const [blutilsResult, setBlutilsResult] = useState<BlutilsResult | null>(
    null
  );

  const { register, handleSubmit } = useForm<IFormInput>();

  const onSubmit: SubmitHandler<IFormInput> = async ({
    character,
  }: IFormInput) => {
    console.log(character);
    if (character === undefined) return;
    setWrapCharacter(character);
  };

  const handleReset = () => {
    setBlutilsResult(null);
    setSearchParams({});
  }

  const groupedResults: ResultsGroupedByTaxonomy[] = useMemo(() => {
    if (!blutilsResult) return [];
    const unidentifiedKey = "Unidentified";

    const grouped = blutilsResult.results.reduce((acc, item) => {
      let key = undefined;

      if ([ViewType.Table, ViewType.GroupedBySubject].includes(viewType)) {
        if (wrapCharacter && viewType === ViewType.GroupedBySubject) {
          const splitted = item.query.split(wrapCharacter);
          key = splitted.at(0);
        } else {
          key = item.query;
        }

      } else if (viewType === ViewType.GroupedByTaxonomy) {
        if (!item.taxon) key = unidentifiedKey;
        key = item.taxon?.identifier;

      } else {
        throw new Error("Unknown grouping type");
      }

      if (!key) return acc;

      if (!acc[key]) {
        acc[key] = [];
      }

      acc[key].push(item);

      return acc;
    }, {} as Record<string, Result[]>);

    return Object.entries(grouped)
      .map(([name, chunk]) => ({
        name,
        rank: chunk[0].taxon?.reachedRank || "",
        taxonomy: chunk[0].taxon?.taxonomy || "",
        groupedBy: viewType,
        chunk,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [blutilsResult, viewType, wrapCharacter]);

  return (
    <div className="min-h-screen pb-32">
      <div>
        <div className="px-5 py-2 border-b-[0.5px] border-b-gray-200 dark:border-b-gray-700 flex gap-8 justify-between items-center">
          <div>
            <Button onClick={() => handleReset()}>Reset</Button>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
          >
            <TextInput
              id="wrapCharacter"
              type="text"
              placeholder="Wrap character"
              className="px-2 py-1 rounded-md"
              disabled={viewType === ViewType.Table}
              {...register("character")}
            />
          </form>

          <Select
            value={viewType}
            onChange={(e) => {
              setPageSize(10);
              setViewType(e.target.value as ViewType);
            }}
          >
            {[ViewType.Table, ViewType.GroupedByTaxonomy, ViewType.GroupedBySubject].map((type) => (
              <option key={type} value={type}>
                {type.valueOf().toUpperCase().replace(/-/g, " ")}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mx-5">
        {blutilsResult ? (
          <>
            {viewType === ViewType.Table && groupedResults && (
              <TableView
                records={groupedResults}
                pageSize={pageSize}
                handlePageSize={setPageSize}
              />
            )}

            {viewType === ViewType.GroupedByTaxonomy && groupedResults && (
              <GroupedByTaxonomyView results={groupedResults} pageSize={pageSize} />
            )}

            {viewType === ViewType.GroupedBySubject && groupedResults && (
              <GroupedByQueryView results={groupedResults} pageSize={pageSize} />
            )}
          </>
        ) : (
          <ResultLoader resultSetter={setBlutilsResult} />
        )}
      </div>
    </div>
  );
}

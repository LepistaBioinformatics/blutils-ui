import { SEQUENCIAL_COLORS } from "@/constants/sequencial-colors";
import { kebabToScinameString } from "@/functions/kebab-to-scientific-name";
import { Taxon } from "@/types/BlutilsResult";
import { Tooltip } from "flowbite-react";
import { FaPlus } from "react-icons/fa";

interface Props {
  taxon: Taxon;
  occurrences: number;
}

const CHUNK_SIZE = 5;
const OCCURRENCES_MAX_SIZE = 200;

export function MiniChart({ taxon, occurrences }: Props) {
  return (
    <div className="w-[200px] h-full flex whitespace-nowrap">
      {taxon.consensusBeans.slice(0, CHUNK_SIZE).map((item, index) => (
        <Tooltip
          key={index}
          content={`${kebabToScinameString(item.identifier, item.rank)} x${item.occurrences
            }`}
        >
          <div
            key={index}
            className="border border-gray-300 dark:border-gray-700 rounded-md h-5"
            style={{
              width:
                (item.occurrences / occurrences) * OCCURRENCES_MAX_SIZE + "px",
              backgroundColor: SEQUENCIAL_COLORS.at(index) as string,
            }}
          >
            &nbsp;
          </div>
        </Tooltip>
      ))}
      {taxon && taxon?.consensusBeans.length > CHUNK_SIZE && (
        <FaPlus className="ml-1" />
      )}
    </div>
  );
}

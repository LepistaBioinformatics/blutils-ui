import { Tooltip } from "flowbite-react";
import { kebabToPlain } from "../../../../functions/kebab-to-plain";

interface Props {
  taxonomy: string;
  className?: string;
}

export function TaxonomyCell({ taxonomy, className }: Props) {
  return (
    <div className={"flex " + className}>
      {taxonomy.split(";").map((bit, index) => {
        const splittted = bit.split("__");

        if (splittted.length === 2) {
          return (
            <div
              key={index}
              className="pl-2 my-0 py-0  text-gray-400 dark:text-gray-600"
            >
              <Tooltip
                content={translateRank(splittted.at(0) as string).toUpperCase()}
                placement="bottom"
              >
                <span className="mr-2">{">"}</span>
                {kebabToPlain(splittted.at(1) as string)}
              </Tooltip>
            </div>
          );
        }

        return <span key={index}>{bit}</span>;
      })}
    </div>
  );
}

function translateRank(rank: string) {
  switch (rank) {
    case "superkingdom":
      return "kingdom";
    case "d":
      return "domain";
    case "p":
      return "phylum";
    case "c":
      return "class";
    case "o":
      return "order";
    case "f":
      return "family";
    case "g":
      return "genus";
    case "s":
      return "species";
    default:
      return rank;
  }
}
